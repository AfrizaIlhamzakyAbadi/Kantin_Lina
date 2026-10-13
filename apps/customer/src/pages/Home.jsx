import { Link } from 'react-router-dom'
import useSchedule from '../hooks/useSchedule.js'
import useActiveOrder from '../hooks/useActiveOrder.js'
import { formatScheduleDays, isOpenNow } from '../lib/schedule.js'

const STEPS = [
  {
    num: '01',
    title: 'PICK YOUR FOOD',
    text: 'Browse the daily canteen menu and add items to your tray.',
  },
  {
    num: '02',
    title: 'PAY WITH QRIS',
    text: 'Scan the dynamic QR code within 3 minutes using any banking or e-wallet app.',
  },
  {
    num: '03',
    title: 'COLLECT MEAL',
    text: 'Arrive at the counter during your pickup slot and call out your ticket name.',
  },
]

export default function Home() {
  const { schedule } = useSchedule()
  const activeOrder = useActiveOrder()
  const open = isOpenNow(schedule)

  return (
    <article aria-labelledby="home-headline">
      {/* Bulletin Hero Section */}
      <section className="page-headline">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <span className={`header-status-badge ${open ? 'open' : 'closed'}`}>
            {open ? '[ ● CANTEEN IS OPEN ]' : '[ ■ CANTEEN IS CLOSED ]'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            HOURS: {schedule.openTime} - {schedule.closeTime} WIB
          </span>
        </div>

        <h1 id="home-headline">&gt; PRE-ORDER LUNCH. SKIP THE QUEUE.</h1>
        <p style={{ margin: '8px 0 16px' }}>
          Welcome to the official Kantin Lina online bulletin. Order your food before break time, lock it in with instant QRIS payment, and collect your hot meal without queuing at the cashier.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <Link to="/menu" className="btn btn-primary btn-lg" id="home-browse-menu">
            &gt;&gt; BROWSE MENU
          </Link>
          {activeOrder && (
            <Link to={`/payment/${activeOrder.orderId}`} className="btn btn-ghost btn-lg" id="home-my-order">
              [ VIEW MY ACTIVE TICKET ]
            </Link>
          )}
        </div>

        <small style={{ display: 'block', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          * Operational Days: {formatScheduleDays(schedule)} ({schedule.openTime}-{schedule.closeTime})
        </small>
      </section>

      {/* 3 Step System Protocol */}
      <section aria-labelledby="protocol-title" style={{ marginTop: '24px' }}>
        <header className="menu-category-header cat-protocol">
          <h2 id="protocol-title">// SYSTEM PROTOCOL (3 EASY STEPS)</h2>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {STEPS.map((step) => (
            <article key={step.num} className="menu-entry" style={{ padding: '14px' }}>
              <span className="step-badge">
                STEP {step.num}
              </span>
              <h3 style={{ marginBottom: '6px' }}>{step.title}</h3>
              <p style={{ fontSize: '0.95rem' }}>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Terms & Conditions Section */}
      <section aria-labelledby="terms-title" style={{ marginTop: '32px' }}>
        <header className="menu-category-header cat-terms">
          <h2 id="terms-title">// TERMS &amp; CONDITIONS</h2>
          <span>[14 ARTICLES]</span>
        </header>

        <fieldset className="brutalist-fieldset">
          <legend>KANTIN LINA CANTEEN POLICY</legend>
          <div style={{ display: 'grid', gap: '12px', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
            <div>
              <strong>1. CONDITIONS OF USE:</strong> Kantin Lina is offered to you conditioned on your acceptance of terms and notices herein.
            </div>
            <div>
              <strong>2. OVERVIEW:</strong> By using this site to order food, you agree to these Terms and Conditions without qualification.
            </div>
            <div>
              <strong>3. MODIFICATIONS:</strong> Kantin Lina reserves the right to adjust menu prices, operating schedules, or available quantities.
            </div>
            <div>
              <strong>4. COPYRIGHTS:</strong> All content, naming, and menu items belong to Kantin Lina.
            </div>
            <div>
              <strong>5. ORDER IDENTIFIER:</strong> No user account or registration is required. You provide a recognizable call name used for the counter queue.
            </div>
            <div>
              <strong>6. ELECTRONIC COMMUNICATIONS:</strong> Order confirmations and timer updates are delivered in-browser in real time.
            </div>
            <div>
              <strong>7. PRODUCT AVAILABILITY:</strong> Menu availability reflects actual canteen preparation. If an item runs out, it is marked sold out.
            </div>
            <div>
              <strong>8. ORDER PICKUP:</strong> Food risk passes to the student upon hand-over at the canteen counter during the scheduled slot.
            </div>
            <div>
              <strong>9. REFUNDS:</strong> All sales are final once prepared. Unclaimed orders are forfeited after the school day ends.
            </div>
            <div>
              <strong>10. PRIVACY:</strong> Your order name is used solely for counter calling and never sold or shared.
            </div>
            <div>
              <strong>11. INDEMNITY:</strong> Users agree to hold harmless Kantin Lina against unauthorized site misuse.
            </div>
            <div>
              <strong>12. DISCLAIMER:</strong> Kantin Lina operates during school hours only.
            </div>
            <div>
              <strong>13. APPLICABLE LAWS:</strong> Governed by the laws of the Republic of Indonesia.
            </div>
            <div>
              <strong>14. QUESTIONS &amp; CONTACT:</strong> For questions, contact Kantin Lina management at <strong>081328347306</strong>.
            </div>
          </div>
        </fieldset>
      </section>
    </article>
  )
}
