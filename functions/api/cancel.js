// POST /api/cancel
// Allows customer to cancel a pending order within the 3-minute payment window:
//   1. Validates orderId.
//   2. Atomically restores reserved item stocks to the menu.
//   3. Updates order status to "Cancelled" in Firestore.
//   4. Calls Midtrans cancel API (best effort) to invalidate the QRIS.

import { assertFirebaseConfigured } from '../_lib/firestore.js'
import { ORDER_STATUS, releaseOrder } from '../_lib/orders.js'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })

const midtransBaseUrl = (env) =>
  env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com'

export async function onRequestPost({ request, env }) {
  try {
    assertFirebaseConfigured(env)

    let payload
    try {
      payload = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const { orderId } = payload ?? {}
    if (typeof orderId !== 'string' || !orderId.trim()) {
      return json({ error: 'orderId is required' }, 400)
    }

    const cleanOrderId = orderId.trim()

    // Atomically release stock and move order from Pending to Cancelled
    const result = await releaseOrder(env, cleanOrderId, ORDER_STATUS.CANCELLED, 'customer-cancelled', {
      onlyIfExpired: false,
    })

    if (!result.released) {
      if (result.reason === 'not-found') {
        return json({ error: 'Order not found' }, 404)
      }
      if (result.reason === 'not-pending') {
        return json(
          {
            error: `Order cannot be cancelled because it is already ${result.status || 'closed'}`,
            status: result.status,
          },
          400,
        )
      }
      return json({ error: 'Order could not be cancelled' }, 400)
    }

    // Best-effort: tell Midtrans to cancel transaction so QRIS is immediately voided
    if (env.MIDTRANS_SERVER_KEY) {
      try {
        await fetch(`${midtransBaseUrl(env)}/v2/${cleanOrderId}/cancel`, {
          method: 'POST',
          headers: {
            ...JSON_HEADERS,
            Accept: 'application/json',
            Authorization: 'Basic ' + btoa(`${env.MIDTRANS_SERVER_KEY}:`),
          },
        })
      } catch (err) {
        console.error('[cancel] Midtrans cancel API failed for', cleanOrderId, err)
      }
    }

    return json({ ok: true, orderId: cleanOrderId, status: ORDER_STATUS.CANCELLED })
  } catch (error) {
    console.error('[cancel] error:', error)
    return json({ error: 'Failed to cancel order' }, 500)
  }
}
