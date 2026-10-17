import { useState } from 'react'
import Orders from './components/Orders'
import MenuManager from './components/MenuManager'
import ScheduleManager from './components/ScheduleManager'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('orders')

  const tabs = [
    { id: 'orders', label: '[ 01. SMART QUEUE ]' },
    { id: 'menu', label: '[ 02. MENU & STOCK ]' },
    { id: 'schedule', label: '[ 03. SCHEDULE ]' },
  ]

  return (
    <div className="admin-dashboard-container">
      {/* Navigation Toolbar */}
      <nav className="blog-nav" aria-label="Admin Navigation" style={{ marginBottom: '16px' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Tab Panels */}
      <section className="admin-tab-panel" aria-live="polite">
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'schedule' && <ScheduleManager />}
      </section>
    </div>
  )
}
