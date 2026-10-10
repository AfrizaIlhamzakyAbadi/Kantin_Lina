// POST /api/checkout
// Turns a cart into a paid-for-in-3-minutes order:
//   1. Validate the request (never trust prices or stock sent by the client).
//   2. In ONE Firestore transaction: check stock, deduct it, and create the order
//      as "Pending" with a 3 minute `expiresAt`.
//   3. Only if stock was sufficient, ask Midtrans for a Dynamic QRIS.
//   4. If Midtrans fails, give the stock back and mark the order "Failed".
//
// Required env (Cloudflare Pages secrets / .dev.vars):
//   MIDTRANS_SERVER_KEY, MIDTRANS_IS_PRODUCTION,
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//
// Request body: { customerName: "Budi-492", pickupAt: ISO string, items: [{ id, qty }] }

import { assertFirebaseConfigured, runTransaction, updateDocument } from '../_lib/firestore.js'
import { MAX_QTY_PER_ITEM, ORDER_STATUS, PAYMENT_WINDOW_MS, releaseOrder } from '../_lib/orders.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })

const midtransBaseUrl = (env) =>
  env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com'

const MAX_DISTINCT_ITEMS = 20
const MAX_BOOKING_AHEAD_MS = 8 * 24 * 60 * 60 * 1000
const PICKUP_NAME_PATTERN = /^[^\r\n]{2,30}$/ // "Budi"

// Thrown for expected failures; carries the HTTP status to answer with.
class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

function parseRequest(payload) {
  const { customerName, pickupAt, items } = payload ?? {}

  if (typeof customerName !== 'string' || !PICKUP_NAME_PATTERN.test(customerName.trim())) {
    throw new HttpError(400, 'customerName must be a valid string (2-30 characters)')
  }

  const pickupDate = new Date(pickupAt)
  const now = Date.now()
  if (
    typeof pickupAt !== 'string' ||
    Number.isNaN(pickupDate.getTime()) ||
    pickupDate.getTime() <= now ||
    pickupDate.getTime() > now + MAX_BOOKING_AHEAD_MS
  ) {
    throw new HttpError(400, 'pickupAt must be a valid time in the next few days')
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_DISTINCT_ITEMS) {
    throw new HttpError(400, 'items must be a non-empty array')
  }

  // Merge duplicate ids so each menu item is read and decremented exactly once.
  const quantities = new Map()
  for (const item of items) {
    const id = typeof item?.id === 'string' ? item.id : ''
    const validId = /^[^/]{1,100}$/.test(id) && id !== '.' && id !== '..'
    if (!validId || !Number.isInteger(item.qty) || item.qty < 1) {
      throw new HttpError(400, 'Each item needs a valid id and a whole-number qty of at least 1')
    }
    const qty = (quantities.get(id) ?? 0) + item.qty
    if (qty > MAX_QTY_PER_ITEM) {
      throw new HttpError(400, `You can order at most ${MAX_QTY_PER_ITEM} of the same item`)
    }
    quantities.set(id, qty)
  }

  return {
    pickupName: customerName.trim(),
    pickupDate,
    items: [...quantities].map(([id, qty]) => ({ id, qty })),
  }
}

// Step 2: atomic stock check + deduction + order creation.
async function reserveStock(env, { orderId, pickupName, pickupDate, items }) {
  return runTransaction(env, async (tx) => {
    // We use a counter for today to assign queue numbers (-1, -2, etc)
    // Using Cloudflare Workers standard format YYYY-MM-DD in UTC or simple ISO
    const today = new Date().toISOString().split('T')[0]
    const counterPath = `counters/queue_${today}`
    
    const docs = await tx.getAll([counterPath, ...items.map((item) => `menu/${item.id}`)])

    const lines = []
    const unavailable = []
    for (const item of items) {
      const doc = docs.get(`menu/${item.id}`)
      const stock = Number(doc?.data?.stock)

      if (!doc || doc.data.available === false || !(stock >= item.qty)) {
        unavailable.push({ id: item.id, name: doc?.data?.name ?? item.id })
        continue
      }

      // The price always comes from Firestore, never from the request.
      const price = doc.data.price
      if (!Number.isInteger(price) || price <= 0) {
        console.error(`[checkout] menu/${item.id} has an invalid price:`, price)
        throw new HttpError(500, 'This item cannot be ordered right now')
      }

      lines.push({
        id: item.id,
        name: String(doc.data.name ?? item.id),
        price,
        qty: item.qty,
        remaining: stock - item.qty,
      })
    }

    // Throwing here rolls the whole transaction back: nothing is deducted.
    if (unavailable.length > 0) {
      const names = unavailable.map((u) => u.name).join(', ')
      throw new HttpError(
        409,
        `Sorry, ${names} just sold out or does not have enough left. Please update your cart.`,
        { unavailable: unavailable.map((u) => u.id) },
      )
    }

    // Queue logic
    const counterDoc = docs.get(counterPath)
    const queueNumber = (counterDoc?.data?.count || 0) + 1
    const finalPickupName = `${pickupName}-${queueNumber}`

    if (counterDoc) {
      tx.update(counterPath, { count: queueNumber })
    } else {
      tx.create(counterPath, { count: queueNumber })
    }

    const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0)
    const createdAt = new Date()
    const expiresAt = new Date(createdAt.getTime() + PAYMENT_WINDOW_MS)

    for (const line of lines) tx.update(`menu/${line.id}`, { stock: line.remaining })

    tx.create(`orders/${orderId}`, {
      status: ORDER_STATUS.PENDING,
      pickupName: finalPickupName,
      pickupAt: pickupDate,
      items: lines.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
      total,
      stockDeducted: true, // lets releaseOrder() return the stock exactly once
      createdAt,
      expiresAt,
    })

    return { lines, total, expiresAt, finalPickupName }
  })
}

// Step 3: Dynamic QRIS from Midtrans, valid for the same 3 minutes.
async function requestQris(env, { orderId, pickupName, lines, total }) {
  const res = await fetch(`${midtransBaseUrl(env)}/v2/charge`, {
    method: 'POST',
    headers: {
      ...JSON_HEADERS,
      Accept: 'application/json',
      Authorization: 'Basic ' + btoa(`${env.MIDTRANS_SERVER_KEY}:`),
    },
    body: JSON.stringify({
      payment_type: 'qris',
      transaction_details: { order_id: orderId, gross_amount: total },
      item_details: lines.map((l) => ({
        id: l.id.slice(0, 50),
        price: l.price,
        quantity: l.qty,
        name: l.name.slice(0, 50),
      })),
      customer_details: { first_name: pickupName },
      qris: { acquirer: 'gopay' },
      custom_expiry: { expiry_duration: PAYMENT_WINDOW_MS / 60000, unit: 'minute' },
    }),
  })

  const data = await res.json().catch(() => ({}))
  // Midtrans reports some errors with HTTP 200 and a non-2xx `status_code`.
  if (!res.ok || !['200', '201'].includes(String(data.status_code))) {
    throw new Error(`Midtrans rejected the charge: ${data.status_message ?? res.status}`)
  }
  return data
}

export async function onRequestPost({ request, env }) {
  if (!env.MIDTRANS_SERVER_KEY) {
    return json({ error: 'MIDTRANS_SERVER_KEY is not configured' }, 500)
  }

  let orderId = null
  let stockReserved = false

  try {
    assertFirebaseConfigured(env)

    let payload
    try {
      payload = await request.json()
    } catch {
      throw new HttpError(400, 'Invalid JSON body')
    }
    const { pickupName, pickupDate, items } = parseRequest(payload)

    // Midtrans order_id: max 50 chars, unique per charge.
    orderId = `KL-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`

    const reservation = await reserveStock(env, { orderId, pickupName, pickupDate, items })
    stockReserved = true

    const charge = await requestQris(env, { orderId, pickupName: reservation.finalPickupName, ...reservation })
    const qrAction = charge.actions?.find((a) => a.name === 'generate-qr-code')

    // Non-critical bookkeeping; the order is already valid without it.
    await updateDocument(env, `orders/${orderId}`, { transactionId: charge.transaction_id ?? null }).catch(
      (err) => console.error('[checkout] could not store transactionId', orderId, err),
    )

    return json({
      orderId,
      status: ORDER_STATUS.PENDING,
      pickupName: reservation.finalPickupName,
      total: reservation.total,
      expiresAt: reservation.expiresAt.toISOString(),
      transactionStatus: charge.transaction_status,
      qrString: charge.qr_string,
      qrUrl: qrAction?.url ?? null,
    })
  } catch (error) {
    // After a QR failure (or an unclear commit failure) give any deducted stock
    // back. releaseOrder is idempotent and does nothing if there is no such order.
    if (orderId && (stockReserved || !(error instanceof HttpError))) {
      await releaseOrder(env, orderId, ORDER_STATUS.FAILED, 'qris-request-failed').catch((err) =>
        console.error('[checkout] CRITICAL: could not restore stock for', orderId, err),
      )
    }

    if (error instanceof HttpError) {
      return json({ error: error.message, ...error.extra }, error.status)
    }
    console.error('[checkout] failed', orderId, error)
    return json({ error: 'We could not create your payment right now. Please try again.' }, stockReserved ? 502 : 500)
  }
}
