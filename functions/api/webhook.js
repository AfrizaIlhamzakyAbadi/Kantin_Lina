// POST /api/webhook
// Midtrans "Payment Notification" callback. Set this URL in
// Midtrans Dashboard > Settings > Configuration > Payment Notification URL:
//   https://<your-site>.pages.dev/api/webhook
//
// Required env: MIDTRANS_SERVER_KEY
// For the Firestore update: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

import { recordPayment, releaseOrder, ORDER_STATUS } from '../_lib/orders.js'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// Midtrans signature = SHA512(order_id + status_code + gross_amount + ServerKey)
async function computeSignature({ order_id, status_code, gross_amount }, serverKey) {
  const data = new TextEncoder().encode(`${order_id}${status_code}${gross_amount}${serverKey}`)
  const digest = await crypto.subtle.digest('SHA-512', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function onRequestPost({ request, env }) {
  if (!env.MIDTRANS_SERVER_KEY) {
    return json({ error: 'MIDTRANS_SERVER_KEY is not configured' }, 500)
  }

  let notification
  try {
    notification = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  // 1. Verify the notification really came from Midtrans.
  const expected = await computeSignature(notification, env.MIDTRANS_SERVER_KEY)
  if (expected !== notification.signature_key) {
    return json({ error: 'Invalid signature' }, 403)
  }

  const { order_id, transaction_status, fraud_status } = notification

  // 2. Decide the new order status.
  const isPaid =
    (transaction_status === 'settlement' || transaction_status === 'capture') &&
    (!fraud_status || fraud_status === 'accept')
  const isFailed = ['deny', 'cancel', 'expire', 'failure'].includes(transaction_status)

  // 3. Update Firestore `orders/{order_id}` server-side.
  console.log(`[webhook] order=${order_id} status=${transaction_status} paid=${isPaid} failed=${isFailed}`)

  try {
    if (isPaid) {
      await recordPayment(env, {
        orderId: order_id,
        grossAmount: Number(notification.gross_amount),
        transactionId: notification.transaction_id,
      })
    } else if (isFailed) {
      await releaseOrder(env, order_id, ORDER_STATUS.FAILED, `midtrans-${transaction_status}`)
    }
  } catch (error) {
    console.error(`[webhook] error processing order ${order_id}:`, error)
    // If it's a Firestore/transaction error, return 500 so Midtrans retries
    return json({ error: 'Internal Server Error' }, 500)
  }

  // Midtrans expects a 200 response to stop retrying.
  return json({ received: true })
}
