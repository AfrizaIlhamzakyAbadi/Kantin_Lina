// localStorage helpers. Customers don't log in, so the browser is the session:
//  - the cart survives refreshes
//  - the active order survives refreshes, so the QR / pickup name isn't lost

const CART_KEY = 'kantinlina.cart'
const ACTIVE_ORDER_KEY = 'kantinlina.activeOrder'
const ACTIVE_ORDER_EVENT = 'kantinlina:activeOrder'

function readRaw(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // storage blocked (private mode, etc.)
  }
}

function parse(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota / blocked storage: the app still works, it just won't persist.
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// ---- Cart ------------------------------------------------------------------
export const loadCart = () => parse(readRaw(CART_KEY))
export const saveCart = (cart) => write(CART_KEY, cart)

// ---- Active order ----------------------------------------------------------
// Shape: { orderId, pickupName, pickupAt (ISO), qrUrl, qrString, expiresAt (ms) }
// getActiveOrder() must return a *stable* reference while the stored value is
// unchanged, because React's useSyncExternalStore compares snapshots by identity.
let cachedRaw
let cachedValue = null

export function getActiveOrder() {
  const raw = readRaw(ACTIVE_ORDER_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedValue = parse(raw)
  }
  return cachedValue
}

export function setActiveOrder(order) {
  write(ACTIVE_ORDER_KEY, order)
  window.dispatchEvent(new Event(ACTIVE_ORDER_EVENT))
}

export function clearActiveOrder() {
  remove(ACTIVE_ORDER_KEY)
  window.dispatchEvent(new Event(ACTIVE_ORDER_EVENT))
}

export function subscribeActiveOrder(callback) {
  window.addEventListener(ACTIVE_ORDER_EVENT, callback) // same tab
  window.addEventListener('storage', callback) // other tabs
  return () => {
    window.removeEventListener(ACTIVE_ORDER_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}
