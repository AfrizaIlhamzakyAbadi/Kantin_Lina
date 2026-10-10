// Pickup schedule logic. The owner's schedule lives in Firestore at
// `settings/schedule`; this module validates it and turns it into the dates and
// time slots the customer can pick from. All times use the device's local time.
//
// Firestore doc shape (every field optional, defaults apply):
//   {
//     days: [1, 2, 3, 4, 5],        // 0 = Sunday ... 6 = Saturday
//     openTime: "08:00",
//     closeTime: "16:00",
//     closedDates: ["2026-12-25"]   // YYYY-MM-DD holidays
//   }

export const DEFAULT_SCHEDULE = {
  days: [1, 2, 3, 4, 5], // Mon-Fri
  openTime: '08:00',
  closeTime: '16:00',
  closedDates: [],
}

export const SLOT_MINUTES = 15 // granularity of the time picker
export const MIN_LEAD_MINUTES = 30 // earliest pickup = now + this (kitchen prep)
export const BOOKING_WINDOW_DAYS = 7 // how far ahead customers may pre-order

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0]
const HM_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/

const pad = (n) => String(n).padStart(2, '0')

function toMinutes(hm) {
  const match = HM_PATTERN.exec(String(hm ?? ''))
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

const minutesToHM = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

export const toDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Merge a raw Firestore doc over the defaults, ignoring anything malformed so a
// typo in the owner's document can never break the picker.
export function normalizeSchedule(raw) {
  const schedule = { ...DEFAULT_SCHEDULE }
  if (!raw || typeof raw !== 'object') return schedule

  if (Array.isArray(raw.days)) {
    const days = raw.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    schedule.days = [...new Set(days)] // an empty list means "closed every day"
  }

  const open = toMinutes(raw.openTime)
  const close = toMinutes(raw.closeTime)
  if (open !== null && close !== null && open < close) {
    schedule.openTime = minutesToHM(open)
    schedule.closeTime = minutesToHM(close)
  }

  if (Array.isArray(raw.closedDates)) {
    schedule.closedDates = raw.closedDates.filter((d) => typeof d === 'string')
  }

  return schedule
}

// Pickup slots ("08:00", "08:15", ...) available on a given YYYY-MM-DD.
export function getSlotsForDate(schedule, dateKey, now = new Date()) {
  const date = fromDateKey(dateKey)
  if (!schedule.days.includes(date.getDay()) || schedule.closedDates.includes(dateKey)) {
    return []
  }

  const open = toMinutes(schedule.openTime)
  const close = toMinutes(schedule.closeTime)
  const isToday = toDateKey(now) === dateKey
  const earliest = isToday ? now.getHours() * 60 + now.getMinutes() + MIN_LEAD_MINUTES : 0

  const slots = []
  for (let minutes = open; minutes <= close; minutes += SLOT_MINUTES) {
    if (minutes >= earliest) slots.push(minutesToHM(minutes))
  }
  return slots
}

function formatDayLabel(date, offset) {
  const base = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  if (offset === 0) return `Today, ${base}`
  if (offset === 1) return `Tomorrow, ${base}`
  return base
}

// Upcoming days that still have at least one bookable slot.
export function getPickupDays(schedule, now = new Date()) {
  const days = []
  for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    const key = toDateKey(date)
    if (getSlotsForDate(schedule, key, now).length > 0) {
      days.push({ key, label: formatDayLabel(date, offset) })
    }
  }
  return days
}

// ("2026-10-12", "08:30") -> Date in local time.
export function toPickupDate(dateKey, hm) {
  const date = fromDateKey(dateKey)
  const minutes = toMinutes(hm)
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return date
}

export function isOpenNow(schedule, now = new Date()) {
  const key = toDateKey(now)
  if (!schedule.days.includes(now.getDay()) || schedule.closedDates.includes(key)) return false
  const minutes = now.getHours() * 60 + now.getMinutes()
  return minutes >= toMinutes(schedule.openTime) && minutes <= toMinutes(schedule.closeTime)
}

// [1,2,3,4,5] -> "Mon-Fri", [1,3,5] -> "Mon, Wed, Fri"
export function formatScheduleDays(schedule) {
  const active = MONDAY_FIRST.filter((d) => schedule.days.includes(d))
  if (active.length === 0) return 'Closed'

  const runs = []
  let run = [active[0]]
  for (let i = 1; i < active.length; i++) {
    const consecutive = MONDAY_FIRST.indexOf(active[i]) === MONDAY_FIRST.indexOf(active[i - 1]) + 1
    if (consecutive) {
      run.push(active[i])
    } else {
      runs.push(run)
      run = [active[i]]
    }
  }
  runs.push(run)

  return runs
    .map((r) => (r.length >= 3 ? `${DAY_NAMES[r[0]]}-${DAY_NAMES[r[r.length - 1]]}` : r.map((d) => DAY_NAMES[d]).join(', ')))
    .join(', ')
}
