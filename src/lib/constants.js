// Shared business constants for the pre-order flow.

// Customers have exactly this long to pay the QRIS before the order expires.
export const PAYMENT_WINDOW_MS = 3 * 60 * 1000

// The server waits this long past `expiresAt` before expiring an unpaid order and
// returning its stock, to absorb webhook delivery delay for last-second payments.
export const EXPIRY_GRACE_MS = 30 * 1000

// UI-side cap per menu item. Stock is intentionally hidden from customers, so
// the real stock check happens server-side at checkout.
export const MAX_QTY_PER_ITEM = 10

// Pickup-name rules (a random 3-digit suffix is appended automatically).
export const MIN_NAME_LENGTH = 2
export const MAX_NAME_LENGTH = 20
