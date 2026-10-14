// Shared business constants for the pre-order flow.

// Customers have exactly 1 minute to pay the QRIS before the order expires.
export const PAYMENT_WINDOW_MS = 1 * 60 * 1000

// Strict TTL: 0 grace period so orders expire promptly after 1 minute
export const EXPIRY_GRACE_MS = 0

// UI-side cap per menu item. Stock is intentionally hidden from customers, so
// the real stock check happens server-side at checkout.
export const MAX_QTY_PER_ITEM = 10

// Pickup-name rules (a random 3-digit suffix is appended automatically).
export const MIN_NAME_LENGTH = 2
export const MAX_NAME_LENGTH = 20
