// POST /api/checkout
// Receives cart data from the frontend and requests a Dynamic QRIS from Midtrans.
//
// Required env (Cloudflare Pages secrets / .dev.vars):
//   MIDTRANS_SERVER_KEY, MIDTRANS_IS_PRODUCTION

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })

const midtransBaseUrl = (env) =>
  env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com'

export async function onRequestPost({ request, env }) {
  if (!env.MIDTRANS_SERVER_KEY) {
    return json({ error: 'MIDTRANS_SERVER_KEY is not configured' }, 500)
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  // Expected shape (adjust when the cart UI is built):
  // { customerName: string, items: [{ id: string, qty: number }] }
  const { customerName, items } = payload ?? {}
  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return json({ error: 'customerName and a non-empty items array are required' }, 400)
  }

  // TODO: NEVER trust prices from the client.
  //   1. Fetch each item's real price from Firestore `menu` collection by id.
  //   2. Compute grossAmount server-side from those prices * qty.
  //   3. Create an `orders/{orderId}` doc with status "pending" (server-side write).
  const orderId = `KL-${Date.now()}`
  const grossAmount = 0 // TODO: replace with server-computed total

  const midtransBody = {
    payment_type: 'qris',
    transaction_details: { order_id: orderId, gross_amount: grossAmount },
    item_details: [], // TODO: map verified menu items { id, price, quantity, name }
    customer_details: { first_name: customerName },
    qris: { acquirer: 'gopay' },
  }

  const authHeader = 'Basic ' + btoa(`${env.MIDTRANS_SERVER_KEY}:`)

  const res = await fetch(`${midtransBaseUrl(env)}/v2/charge`, {
    method: 'POST',
    headers: {
      ...JSON_HEADERS,
      Accept: 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(midtransBody),
  })

  const data = await res.json()
  if (!res.ok) {
    return json({ error: 'Midtrans request failed', details: data }, 502)
  }

  // Midtrans returns `qr_string` and an `actions` array containing the
  // "generate-qr-code" image URL. Send only what the frontend needs.
  const qrAction = data.actions?.find((a) => a.name === 'generate-qr-code')
  return json({
    orderId,
    transactionStatus: data.transaction_status,
    qrString: data.qr_string,
    qrUrl: qrAction?.url ?? null,
    expiryTime: data.expiry_time,
  })
}
