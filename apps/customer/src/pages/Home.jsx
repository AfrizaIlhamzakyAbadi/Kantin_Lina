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

      <section aria-labelledby="terms" style={{ marginTop: '4rem', padding: '2rem', background: 'var(--surface)', borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <h2 id="terms" style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text)' }}>Terms & Conditions</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <strong>1. CONDITIONS OF USE</strong><br/>
            Kantin Lina is offered to you, the user, conditioned on your acceptance of the terms, conditions and notices contained or incorporated by reference herein and such additional terms and conditions, agreements, and notices that may apply to any page or section of the Site.
          </div>
          <div>
            <strong>2. OVERVIEW</strong><br/>
            Your use of this Site constitutes your agreement to all terms, conditions and notices. Please read them carefully. By using this Site, you agree to these Terms and Conditions, as well as any other terms, guidelines or rules that are applicable to any portion of this Site, without limitation or qualification. If you do not agree to these Terms and Conditions, you must exit the Site immediately and discontinue any use of information or products from this Site.
          </div>
          <div>
            <strong>3. MODIFICATION OF THE SITE AND THESE TERMS & CONDITIONS</strong><br/>
            Kantin Lina reserves the right to change, modify, alter, update or discontinue the terms, conditions, and notices under which this Site is offered and the links, content, information, prices and any other materials offered via this Site at any time and from time to time without notice or further obligation to you except as may be provided therein. We have the right to adjust prices from time to time. If for some reason there may have been a price mistake, Kantin Lina has the right to refuse the order. By your continued use of the Site following such modifications, alterations, or updates you agree to be bound by such modifications, alterations, or updates.
          </div>
          <div>
            <strong>4. COPYRIGHTS</strong><br/>
            This Site is owned and operated by Kantin Lina. Unless otherwise specified, all materials on this Site, trademarks, service marks, logos are the property of Kantin Lina and are protected by the copyright laws of Indonesia and, throughout the world by the applicable copyright laws. No materials published by Kantin Lina on this Site, in whole or in part, may be copied, reproduced, modified, republished, uploaded, posted, transmitted, or distributed in any form or by any means without prior written permission from Kantin Lina.
          </div>
          <div>
            <strong>5. ORDERING AND USER INFORMATION</strong><br/>
            You are not required to create an account to order from this Site, but you will be asked to provide an accurate identifier (such as an order name) to process your transaction. You will not misrepresent your identity, impersonate any person or entity, or misstate the origin of any Materials you are exposed to through this Site. You are solely responsible for ensuring your order name is appropriate and recognizable for pickup.
          </div>
          <div>
            <strong>6. ELECTRONIC COMMUNICATIONS</strong><br/>
            You agree that Kantin Lina may send electronic notifications or communications to your browser or device for the purpose of advising you of your order status, changes or additions to this Site, or about any of Kantin Lina's products or services.
          </div>
          <div>
            <strong>7. PRODUCT DESCRIPTIONS</strong><br/>
            We always try our best to display the information and colors of the products that appear on the Site as accurately as possible. However, we cannot guarantee that your monitor's or device's display of any color will be accurate as the actual colors you see depends on your monitor quality.
          </div>
          <div>
            <strong>8. RISK OF LOSS AND ORDER PICKUP</strong><br/>
            All items purchased from Kantin Lina are made pursuant to a local pickup agreement. This means that the risk of loss and title for such food items pass to you upon our physical hand-over of the items to you at the canteen counter. You are responsible for picking up your order at the designated time.
          </div>
          <div>
            <strong>9. CONDITIONS OF RETURNS AND REFUNDS</strong><br/>
            Due to the perishable nature of food and beverages, all sales are final once prepared.<br/>
            Orders cannot be returned or refunded once picked up.<br/>
            If you fail to pick up your order on the scheduled day, the items will be forfeited and no refund will be issued.<br/>
            Refunds or exchanges are only applicable if Kantin Lina is unable to fulfill your confirmed order due to stock unavailability.
          </div>
          <div>
            <strong>10. PRIVACY POLICY</strong><br/>
            Your information is safe with us. Kantin Lina understands that privacy concerns are extremely important to our customers. You can rest assured that any information you submit to us will not be misused, abused or sold to any other parties. We only use your provided information (such as your order name) to complete your order.
          </div>
          <div>
            <strong>11. INDEMNITY</strong><br/>
            You agree to indemnify, defend and hold Kantin Lina harmless from and against any and all third party claims, liabilities, damages, losses or expenses (including reasonable attorney's fees and costs) arising out of, based on or in connection with your access and/or use of this Site.
          </div>
          <div>
            <strong>12. DISCLAIMER</strong><br/>
            Kantin Lina assumes no responsibility for accuracy, correctness, timeliness, or content of the Materials provided on this Site. You should not assume that the Materials on this Site are continuously updated or otherwise contain current information. Kantin Lina is not responsible for supplying content or materials from the Site that have expired or have been removed.
          </div>
          <div>
            <strong>13. APPLICABLE LAWS</strong><br/>
            These Terms and Conditions are governed by the law in force in Indonesia.
          </div>
          <div>
            <strong>14. QUESTIONS AND FEEDBACK</strong><br/>
            We welcome your questions, comments, and concerns about privacy or any of the information collected from you or about you. Please send us any and all feedback pertaining to privacy, or any other issue.<br/><br/>
            <strong>Contact us:</strong> 081328347306
          </div>
        </div>
      </section>
    </div>
  )
}
