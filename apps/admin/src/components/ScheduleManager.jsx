import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config.js'

export default function ScheduleManager() {
  const [days, setDays] = useState({
    monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false
  })
  const [openTime, setOpenTime] = useState('08:00')
  const [closeTime, setCloseTime] = useState('16:00')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSchedule = async () => {
      const docRef = doc(db, 'settings', 'schedule')
      const snapshot = await getDoc(docRef)
      if (snapshot.exists()) {
        const data = snapshot.data()
        setDays(data.days || days)
        setOpenTime(data.openTime || '08:00')
        setCloseTime(data.closeTime || '16:00')
      }
      setLoading(false)
    }
    fetchSchedule()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await setDoc(doc(db, 'settings', 'schedule'), {
        days,
        openTime,
        closeTime
      })
      alert('Schedule updated successfully!')
    } catch (err) {
      alert('Failed to save schedule: ' + err.message)
    }
  }

  const toggleDay = (day) => {
    setDays(prev => ({ ...prev, [day]: !prev[day] }))
  }

  if (loading) return <div>Loading...</div>

  return (
    <div style={{ maxWidth: '600px' }}>
      <h2>Store Schedule</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Configure the days and hours customers are allowed to pre-order.</p>
      
      <form onSubmit={handleSave} style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Active Workdays</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: days[day] ? 'var(--primary)' : 'var(--bg)',
                  color: days[day] ? '#fff' : 'var(--text)',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-schedule-times" style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Opening Time</label>
            <input 
              type="time" 
              value={openTime} 
              onChange={e => setOpenTime(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Closing Time</label>
            <input 
              type="time" 
              value={closeTime} 
              onChange={e => setCloseTime(e.target.value)} 
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
            />
          </div>
        </div>

        <button type="submit" style={{ width: '100%', padding: '1rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
          Save Schedule Settings
        </button>
      </form>
    </div>
  )
}
