import { useState } from 'react'
import Orders from './components/Orders'
import MenuManager from './components/MenuManager'
import ScheduleManager from './components/ScheduleManager'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('orders')

  const tabs = [
    { id: 'orders', label: 'Smart Queue' },
    { id: 'menu', label: 'Menu & Stock' },
    { id: 'schedule', label: 'Schedule' }
  ]

  return (
    <div>
      <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'schedule' && <ScheduleManager />}
      </div>
    </div>
  )
}
