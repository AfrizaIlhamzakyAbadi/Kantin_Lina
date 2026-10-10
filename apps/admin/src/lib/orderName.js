import { MAX_NAME_LENGTH } from './constants.js'

// Tidy whatever the customer typed: trim, collapse spaces, cap the length.
export function cleanName(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim()
}

// "Budi" -> "Budi-492". The suffix is random so the canteen staff can call out
// a unique pickup name without relying on customers to pick distinct names.
export function makePickupName(raw) {
  const suffix = 100 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900)
  return `${cleanName(raw)}-${suffix}`
}
