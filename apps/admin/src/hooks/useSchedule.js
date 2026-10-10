import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { DEFAULT_SCHEDULE, normalizeSchedule } from '../lib/schedule.js'

// Owner's schedule from Firestore `settings/schedule`. Falls back to the default
// (Mon-Fri 08:00-16:00) when the doc is missing, malformed, or unreadable.
export default function useSchedule() {
  const [state, setState] = useState({
    schedule: DEFAULT_SCHEDULE,
    loading: true,
    usingDefault: true,
  })

  useEffect(() => {
    return onSnapshot(
      doc(db, 'settings', 'schedule'),
      (snapshot) => {
        setState({
          schedule: normalizeSchedule(snapshot.exists() ? snapshot.data() : null),
          loading: false,
          usingDefault: !snapshot.exists(),
        })
      },
      (err) => {
        console.warn('Could not read settings/schedule, using default schedule', err)
        setState({ schedule: DEFAULT_SCHEDULE, loading: false, usingDefault: true })
      },
    )
  }, [])

  return state
}
