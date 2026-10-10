import { PAYMENT_WINDOW_MS } from './constants.js'

// Deadline (epoch ms) for paying an order. Uses the server's `expiresAt` when the
// checkout response provides one, otherwise now + the 3 minute payment window.
export function resolveExpiry(serverExpiresAt) {
  const server = serverExpiresAt ? new Date(serverExpiresAt).getTime() : Number.NaN
  return Number.isNaN(server) ? Date.now() + PAYMENT_WINDOW_MS : server
}
