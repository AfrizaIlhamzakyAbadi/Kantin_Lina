import { Link } from 'react-router-dom'
import useSchedule from '../hooks/useSchedule.js'
import useActiveOrder from '../hooks/useActiveOrder.js'
import { formatScheduleDays, isOpenNow } from '../lib/schedule.js'

const STEPS = [
  { icon: '🍜', title: 'Pick your food', text: 'Browse the menu and add what you like to your cart.' },
  { icon: '📱', title: 'Pay with QRIS', text: 'Scan the QR code within 3 minutes to lock in your order.' },
  { icon: '🙋', title: 'Pick it up', text: 'Choose a pickup time, then show your pickup name at the counter.' },
]

export default function Home() {
  const { schedule } = useSchedule()
  const activeOrder = useActiveOrder()
  const open = isOpenNow(schedule)

  return (
    <div className="container page">
      <section className="hero">
        <span className={open ? 'status-pill open' : 'status-pill closed'}>
          <span className="dot" aria-hidden="true" />
          {open ? 'Open now' : 'Closed right now'}
        </span>
        <h1>Pre-order your lunch.<br />Skip the queue.</h1>
        <p className="lead">
          Order from Kantin Lina ahead of time, pay with QRIS, and pick up your food when it is ready.
        </p>
        <div className="hero-actions">
          <Link to="/menu" className="btn btn-primary btn-lg" id="home-browse-menu">Browse the menu</Link>
          {activeOrder && (
            <Link to={`/payment/${activeOrder.orderId}`} className="btn btn-ghost btn-lg" id="home-my-order">
              View my order
            </Link>
          )}
        </div>
        <p className="hero-hours">
          Pickup hours: <strong>{formatScheduleDays(schedule)}, {schedule.openTime}-{schedule.closeTime}</strong>
        </p>
      </section>

      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="section-title">How it works</h2>
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card step">
              <span className="step-icon" aria-hidden="true">{step.icon}</span>
              <span className="step-number">Step {index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
