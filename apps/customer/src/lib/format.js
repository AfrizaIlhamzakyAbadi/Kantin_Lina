export const formatRupiah = (amount) => {
  const num = Number(amount) || 0
  if (num === 0) return 'Rp 0k'
  const inK = (num > 0 && num < 100) ? num : num / 1000
  const formatted = Number.isInteger(inK)
    ? inK.toString()
    : parseFloat(inK.toFixed(2)).toString()
  return `Rp ${formatted}k`
}

// 125000 ms -> "02:05"
export function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

// Accepts a Firestore Timestamp, ISO string, epoch ms or Date.
export function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatPickup(value) {
  const date = toDate(value)
  if (!date) return ''
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
