// Shared order lifecycle logic: checkout creates "Pending" orders, then exactly
// one of these moves each order forward:
//
//   Pending --recordPayment--> Paid --completeOrder--> Completed
//   Pending --releaseOrder---> Expired | Failed          (stock returned)
//
// Orders are never deleted, so financial records are preserved.

import { queryByField, runTransaction } from './firestore.js'
import { EXPIRY_GRACE_MS } from '../../apps/customer/src/lib/constants.js'

// The customer's payment window. Imported from the frontend constants so the
// countdown on screen and the server deadline can never drift apart.
export { PAYMENT_WINDOW_MS, MAX_QTY_PER_ITEM, EXPIRY_GRACE_MS } from '../../apps/customer/src/lib/constants.js'

export const ORDER_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  EXPIRED: 'Expired',
  COMPLETED: 'Completed',
  FAILED: 'Failed', // checkout could not obtain a QR from Midtrans
  CANCELLED: 'Cancelled',
}

const orderPath = (orderId) => `orders/${orderId}`

// Atomically gives the stock of an unpaid order back to the menu and moves the
// order out of "Pending" (to Failed / Expired). Idempotent: if the order is
// already closed or its stock was already returned, it does nothing, so stock can
// never be restored twice. With `onlyIfExpired`, it also refuses to touch an order
// whose payment window (plus grace) has not elapsed, re-checked inside the
// transaction so it cannot race with a payment that was just recorded.
export async function releaseOrder(env, orderId, newStatus, reason, { onlyIfExpired = false } = {}) {
  return runTransaction(env, async (tx) => {
    const path = orderPath(orderId)
    const order = (await tx.getAll([path])).get(path)

    if (!order) return { released: false, reason: 'not-found' }
    if (order.data.status !== ORDER_STATUS.PENDING || order.data.stockDeducted !== true) {
      return { released: false, reason: 'not-pending', status: order.data.status }
    }
    if (onlyIfExpired) {
      const expiresAt = order.data.expiresAt
      if (!(expiresAt instanceof Date) || Date.now() <= expiresAt.getTime() + EXPIRY_GRACE_MS) {
        return { released: false, reason: 'not-expired-yet' }
      }
    }

    const items = order.data.items ?? []
    const menu = await tx.getAll(items.map((item) => `menu/${item.id}`))
    for (const item of items) {
      const doc = menu.get(`menu/${item.id}`)
      if (!doc) continue // item was deleted from the menu in the meantime
      tx.update(doc.path, { stock: (Number(doc.data.stock) || 0) + item.qty })
    }

    tx.update(path, {
      status: newStatus,
      stockDeducted: false,
      closedAt: new Date(),
      closeReason: reason,
    })
    return { released: true }
  })
}

// Lazy expiry: Cloudflare Pages has no timers, so unpaid orders are expired
// whenever someone touches the system (checkout, menu load, pay screen timeout).
// Throttled per isolate so a burst of visitors causes one query, not hundreds.
let lastSweepAt = 0

export async function expireStaleOrders(env, { minIntervalMs = 5000, maxPerSweep = 50 } = {}) {
  const startedAt = Date.now()
  if (startedAt - lastSweepAt < minIntervalMs) return { skipped: true, expired: 0 }
  lastSweepAt = startedAt

  const pending = await queryByField(env, 'orders', 'status', ORDER_STATUS.PENDING, 200)
  const stale = pending
    .filter(({ data }) => data.expiresAt instanceof Date && Date.now() > data.expiresAt.getTime() + EXPIRY_GRACE_MS)
    .slice(0, maxPerSweep)

  let expired = 0
  for (const order of stale) {
    const orderId = order.path.split('/')[1]
    try {
      const result = await releaseOrder(env, orderId, ORDER_STATUS.EXPIRED, 'payment-window-elapsed', {
        onlyIfExpired: true,
      })
      if (result.released) expired++
    } catch (error) {
      console.error('[expire] could not expire order', orderId, error)
    }
  }
  return { skipped: false, expired }
}

// Applies a verified Midtrans "paid" notification.
//  - Pending  -> Paid. Stock is already deducted from checkout, so it is NOT
//                deducted again.
//  - Expired / Failed (stock already returned) -> the order is left as it is and
//    flagged `latePayment` so the owner can refund. Stock is NOT deducted again.
//  - Paid / Completed -> duplicate notification, nothing to do.
export async function recordPayment(env, { orderId, grossAmount, transactionId }) {
  return runTransaction(env, async (tx) => {
    const path = orderPath(orderId)
    const order = (await tx.getAll([path])).get(path)

    if (!order) return { result: 'unknown-order' }

    const { status, total, expiresAt } = order.data
    if (status === ORDER_STATUS.PAID || status === ORDER_STATUS.COMPLETED) {
      return { result: 'already-paid' }
    }

    // The amount that was actually paid must match what the server priced.
    if (grossAmount !== total) {
      return { result: 'amount-mismatch', status, expected: total, received: grossAmount }
    }

    // Check if the payment was received after the 1-minute TTL
    const orderCreatedAt = order.data.created_at || order.data.createdAt
    const createdTimeMs =
      orderCreatedAt instanceof Date
        ? orderCreatedAt.getTime()
        : expiresAt instanceof Date
          ? expiresAt.getTime() - PAYMENT_WINDOW_MS
          : 0

    const isExpiredTTL = createdTimeMs > 0 && Date.now() > createdTimeMs + PAYMENT_WINDOW_MS

    // If order was still Pending but payment arrived after the 1-minute TTL:
    // Mark as Expired, atomically add reserved stock back to menu, flag late payment
    if (status === ORDER_STATUS.PENDING && isExpiredTTL) {
      if (order.data.stockDeducted === true) {
        const items = order.data.items ?? []
        const menu = await tx.getAll(items.map((item) => `menu/${item.id}`))
        for (const item of items) {
          const doc = menu.get(`menu/${item.id}`)
          if (!doc) continue
          tx.update(doc.path, { stock: (Number(doc.data.stock) || 0) + item.qty })
        }
      }

      tx.update(path, {
        status: ORDER_STATUS.EXPIRED,
        stockDeducted: false,
        closedAt: new Date(),
        closeReason: 'payment-received-after-1m-ttl',
        latePayment: true,
        latePaymentAt: new Date(),
        latePaymentAmount: grossAmount,
        transactionId: transactionId ?? null,
      })
      return { result: 'late-payment', status: ORDER_STATUS.EXPIRED }
    }

    if (status === ORDER_STATUS.PENDING) {
      const now = new Date()
      // Kantin Lina runs on WIB (UTC+7)
      const wibOffsetMs = 7 * 60 * 60 * 1000
      const wibDate = new Date(now.getTime() + wibOffsetMs)
      const today = wibDate.toISOString().split('T')[0]
      const counterPath = `counters/payment_${today}`

      const counterDoc = (await tx.getAll([counterPath])).get(counterPath)
      const count = (counterDoc?.data?.count || 0) + 1

      if (counterDoc) {
        tx.update(counterPath, { count })
      } else {
        tx.create(counterPath, { count })
      }

      const rawName = order.data.customerName || order.data.pickupName || 'Customer'
      // Strip any previous "-<number>" to obtain clean base name
      const baseName = rawName.replace(/-\d+$/, '').trim() || rawName.trim()
      const order_tag = `${baseName}-${count}`

      tx.update(path, {
        status: ORDER_STATUS.PAID,
        paidAt: now,
        order_tag,
        pickupName: order_tag,
        transactionId: transactionId ?? null,
      })
      return {
        result: 'paid',
        order_tag,
        afterDeadline: false,
      }
    }

    // Expired or Failed: stock has already gone back to the menu.
    // Flag status as Expired, do NOT deduct stock a second time, record late payment to alert admin.
    tx.update(path, {
      status: ORDER_STATUS.EXPIRED,
      latePayment: true,
      latePaymentAt: new Date(),
      latePaymentAmount: grossAmount,
      transactionId: transactionId ?? null,
    })
    return { result: 'late-payment', status: ORDER_STATUS.EXPIRED }
  })
}

// Staff marks a paid order as picked up. Only Paid -> Completed is allowed.
export async function completeOrder(env, orderId) {
  return runTransaction(env, async (tx) => {
    const path = orderPath(orderId)
    const order = (await tx.getAll([path])).get(path)

    if (!order) return { result: 'not-found' }
    if (order.data.status === ORDER_STATUS.COMPLETED) return { result: 'already-completed' }
    if (order.data.status !== ORDER_STATUS.PAID) return { result: 'not-paid', status: order.data.status }

    tx.update(path, { status: ORDER_STATUS.COMPLETED, completedAt: new Date() })
    return { result: 'completed' }
  })
}
