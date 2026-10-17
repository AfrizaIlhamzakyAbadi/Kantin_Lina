import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config.js'

const DAYS_LIST = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function ScheduleManager() {
  const [days, setDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  })
  const [openTime, setOpenTime] = useState('08:00')
  const [closeTime, setCloseTime] = useState('16:00')
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const docRef = doc(db, 'settings', 'schedule')
        const snapshot = await getDoc(docRef)
        if (snapshot.exists()) {
          const data = snapshot.data()
          setDays(data.days || days)
          setOpenTime(data.openTime || '08:00')
          setCloseTime(data.closeTime || '16:00')
        }
      } catch (err) {
        console.error('Failed to fetch schedule:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setStatusMessage('')
    try {
      await setDoc(doc(db, 'settings', 'schedule'), {
        days,
        openTime,
        closeTime,
      })
      setStatusMessage('Schedule settings successfully saved!')
    } catch (err) {
      alert('Failed to save schedule: ' + err.message)
    }
  }

  const toggleDay = (day) => {
    setDays((prev) => ({ ...prev, [day]: !prev[day] }))
  }

  if (loading) {
    return (
      <div className="notice notice-warn">
        <strong>[ ⏳ LOADING SCHEDULE SETTINGS... ]</strong>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Page Headline */}
      <section className="page-headline">
        <h1>&gt; STORE SCHEDULE // OPERATIONAL HOURS</h1>
        <p>Configure the days and operating hours customers are permitted to pre-order food online.</p>
      </section>

      {statusMessage && (
        <div className="notice notice-success" role="status">
          <strong>[ SUCCESS ]</strong> {statusMessage}
        </div>
      )}

      <form onSubmit={handleSave}>
        <fieldset className="brutalist-fieldset fieldset-schedule">
          <legend>[ // CANTEEN PRE-ORDER SCHEDULE ]</legend>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.72rem', display: 'block', marginBottom: '8px' }}>
                ACTIVE OPERATIONAL WORKDAYS:
              </span>
              <div className="day-toggle-group">
                {DAYS_LIST.map((day) => {
                  const isActive = !!days[day]
                  return (
                    <button
                      key={day}
                      type="button"
                      id={`day-toggle-${day}`}
                      onClick={() => toggleDay(day)}
                      className={`day-btn ${isActive ? 'active' : 'inactive'}`}
                      aria-pressed={isActive}
                    >
                      {isActive ? `[ ${day.slice(0, 3)} ✓ ]` : `[ ${day.slice(0, 3)} - ]`}
                    </button>
                  )
                })}
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '6px', display: 'block' }}>
                Click a day to toggle online pre-ordering availability.
              </small>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="open-time">Opening Time (WIB)</label>
                <input
                  id="open-time"
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="close-time">Closing Time (WIB)</label>
                <input
                  id="close-time"
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary btn-block btn-lg" id="btn-save-schedule">
                &gt;&gt; SAVE SCHEDULE SETTINGS
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
