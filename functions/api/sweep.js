import { assertFirebaseConfigured } from '../_lib/firestore.js'
import { expireStaleOrders } from '../_lib/orders.js'

export async function onRequestGet({ env, waitUntil }) {
  try {
    assertFirebaseConfigured(env)
    
    // We use waitUntil so the response returns immediately without blocking
    // while the lazy sweep executes. The function itself has rate limiting
    // (minIntervalMs) built in so it won't spam Firestore.
    if (waitUntil) {
      waitUntil(expireStaleOrders(env).catch(err => console.error('[sweep] error:', err)))
    } else {
      // Fallback if waitUntil is not available (e.g. some dev environments)
      expireStaleOrders(env).catch(err => console.error('[sweep] error:', err))
    }
  } catch (error) {
    console.error('[sweep] configuration error:', error)
  }
  
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
