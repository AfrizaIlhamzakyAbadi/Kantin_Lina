import { MAX_NAME_LENGTH } from './constants.js'

// Tidy whatever the customer typed: trim, collapse spaces, cap the length.
export function cleanName(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim()
}

