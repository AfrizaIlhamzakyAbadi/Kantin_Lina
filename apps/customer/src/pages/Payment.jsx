import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import useActiveOrder from '../hooks/useActiveOrder.js'
import useCountdown from '../hooks/useCountdown.js'
import { clearActiveOrder } from '../lib/storage.js'
import { formatCountdown, formatPickup, formatRupiah } from '../lib/format.js'

function DigitalCountdown({ remaining }) {
  const urgent = remaining <= 30_000
  return (
    <div
      className={`digital-countdown-box ${urgent ? 'urgent' : ''}`}
      role="timer"
      aria-label={`Time left to pay: ${formatCountdown(remaining)}`}
    >
      <span aria-hidden="true">{urgent ? '▲' : '■'}</span>
      <strong id="countdown-value">{formatCountdown(remaining)}</strong>
      <span>{urgent ? '! HURRY !' : 'REMAINING'}</span>
    </div>
  )
}

function PickupTicket({ orderTag, pickupName, pickupAt, notes, status }) {
  const displayTag = orderTag || pickupName || '—'
  return (
    <article className="pickup-ticket">
      <small style={{ fontFamily: 'var(--font-pixel)', fontSize: '0.62rem' }}>
        *** OFFICIAL CALL TICKET ***
      </small>
      <div style={{ margin: '8px 0' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontFamily: 'var(--font-pixel)' }}>
          ORDER TAG
        </span>
        <strong className="pickup-ticket-name" id="pickup-order-tag" style={{ fontSize: '1.8rem', display: 'block' }}>
          {displayTag}
        </strong>
      </div>
      {status && (
        <div style={{ margin: '6px 0', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          <strong>STATUS:</strong> <span style={{ textTransform: 'uppercase', color: 'var(--blue, #2563eb)', fontWeight: 'bold' }}>{status}</span>
        </div>
      )}
      {pickupAt && (
        <small style={{ fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>
          PICKUP TIME: {formatPickup(pickupAt)}
        </small>
      )}
      {notes && (
        <div className="pickup-ticket-note">
          <strong>KITCHEN NOTE:</strong> &ldquo;{notes}&rdquo;
        </div>
      )}
    </article>
  )
}

export default function Payment() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const activeOrder = useActiveOrder()
  const mine = activeOrder?.orderId === orderId ? activeOrder : null

  const [loaded, setLoaded] = useState({ id: null, data: undefined })
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const order = loaded.id === orderId ? loaded.data : undefined

  useEffect(() => {
    return onSnapshot(
      doc(db, 'orders', orderId),
      (snapshot) => setLoaded({ id: orderId, data: snapshot.exists() ? snapshot.data() : null }),
      (err) => {
        console.error('Failed to listen to order', err)
        setLoaded({ id: orderId, data: null })
      },
    )
  }, [orderId])

  const status = String(order?.status ?? 'pending').toLowerCase()
  const orderTag = order?.order_tag ?? mine?.order_tag ?? order?.pickupName ?? mine?.pickupName ?? ''
  const pickupName = order?.customerName ?? order?.pickupName ?? mine?.pickupName ?? ''
  const pickupAt = order?.pickup_timestamp ?? order?.pickupAt ?? mine?.pickup_timestamp ?? mine?.pickupAt ?? null
  const notes = order?.notes ?? mine?.notes ?? ''

  const expiresAt = order?.expiresAt?.toMillis?.() ?? mine?.expiresAt ?? null
  const remaining = useCountdown(expiresAt)
  const timedOut = status === 'pending' && remaining === 0

  function startNewOrder() {
    clearActiveOrder()
    navigate('/menu')
  }

  async function handleCancelOrder() {
    if (
      !window.confirm(
        'Cancel this order? The QR code will be invalidated and reserved items returned to stock.',
      )
    ) {
      return
    }
    setCancelling(true)
    setCancelError('')
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || `Failed to cancel order (HTTP ${res.status})`)
      }
      clearActiveOrder()
      setLoaded((prev) => ({
        ...prev,
        data: prev.data ? { ...prev.data, status: 'Cancelled' } : { status: 'Cancelled' },
      }))
    } catch (err) {
      console.error('Failed to cancel order:', err)
      setCancelError(err.message || 'Failed to cancel order. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  // Loading
  if (order === undefined && !mine) {
    return (
      <section className="notice-card page-narrow" aria-busy="true">
        <header className="page-headline">
          <h1>&gt; LOADING ORDER DATA...</h1>
        </header>
        <p>Connecting to database host...</p>
      </section>
    )
  }

  // Paid
  if (status === 'paid') {
    return (
      <section className="result-card page-narrow" aria-labelledby="paid-title">
        <span className="result-tag success">[ ✓ PAYMENT CONFIRMED ]</span>
        <h1 id="paid-title">PAYMENT RECEIVED</h1>
        <p>Your order is locked in. Show this order tag at the counter:</p>
        <PickupTicket orderTag={orderTag} pickupName={pickupName} pickupAt={pickupAt} notes={notes} status="Paid" />
        {typeof order?.total === 'number' && (
          <p><strong>TOTAL PAID: {formatRupiah(order.total)}</strong></p>
        )}
        <button type="button" className="btn btn-primary" id="payment-new-order" onClick={startNewOrder}>
          &lt;&lt; PLACE ANOTHER ORDER
        </button>
      </section>
    )
  }

  // Completed
  if (status === 'completed') {
    return (
      <section className="result-card page-narrow" aria-labelledby="completed-title">
        <span className="result-tag success">[ ★ ORDER FINISHED ]</span>
        <h1 id="completed-title">MEAL PICKED UP</h1>
        <p>Enjoy your meal! Thanks for ordering at Kantin Lina.</p>
        <button type="button" className="btn btn-primary" id="payment-new-order" onClick={startNewOrder}>
          &lt;&lt; ORDER AGAIN
        </button>
      </section>
    )
  }

  // Expired / Cancelled / Timed Out
  if (status === 'expired' || status === 'cancelled' || timedOut) {
    const isCancelled = status === 'cancelled'
    return (
      <section className="result-card page-narrow" aria-labelledby="closed-title">
        <span className="result-tag danger">
          {isCancelled ? '[ X CANCELLED ]' : '[ ! WINDOW EXPIRED ]'}
        </span>
        <h1 id="closed-title">
          {isCancelled ? 'ORDER CANCELLED' : 'PAYMENT WINDOW CLOSED'}
        </h1>
        <p>
          {isCancelled
            ? 'This order was cancelled. Reserved items have been returned to stock.'
            : 'Payment window was exceeded (1 minute). Please start a fresh order.'}
        </p>
        {notes && <p><em>Note: &ldquo;{notes}&rdquo;</em></p>}
        <button type="button" className="btn btn-primary" id="payment-new-order" onClick={startNewOrder}>
          &lt;&lt; START NEW ORDER
        </button>
      </section>
    )
  }

  // QR missing on this device
  if (!mine?.qrUrl) {
    return (
      <section className="result-card page-narrow" aria-labelledby="missing-title">
        <span className="result-tag">[ ? ]</span>
        <h1 id="missing-title">
          {order ? 'WAITING FOR PAYMENT' : 'ORDER NOT FOUND'}
        </h1>
        <p>
          {order
            ? 'The QR code was initialized on another browser/device.'
            : 'Could not find this order ticket on this device.'}
        </p>
        <Link to="/menu" className="btn btn-primary" id="payment-back-menu">
          &lt;&lt; BACK TO MENU
        </Link>
      </section>
    )
  }

  // Pending: show clear, scannable QRIS display and digital countdown
  return (
    <section className="payment-box page-narrow" aria-labelledby="pay-title">
      <header className="page-headline" style={{ width: '100%' }}>
        <h1 id="pay-title">&gt; SCAN QRIS TO PAY</h1>
        <p>Scan with GoPay, OVO, Dana, BCA, or any banking app.</p>
      </header>

      {remaining !== null && <DigitalCountdown remaining={remaining} />}

      {/* High-contrast, clean scannable QR container */}
      <figure className="qris-display-frame">
        <img
          src={mine.qrUrl}
          alt="Midtrans QRIS Payment Code"
          width="240"
          height="240"
          id="qris-image"
        />
      </figure>

      <PickupTicket pickupName={pickupName} pickupAt={pickupAt} notes={notes} />

      {cancelError && (
        <div className="notice notice-error" role="alert" style={{ width: '100%' }}>
          <strong>[ ERROR ]</strong> {cancelError}
        </div>
      )}

      <button
        type="button"
        className="btn btn-danger btn-block"
        id="payment-cancel-order"
        onClick={handleCancelOrder}
        disabled={cancelling}
      >
        {cancelling ? 'CANCELLING ORDER...' : '[cancel]'}
      </button>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        * This page updates automatically once settlement is confirmed. Keep this tab open.
      </p>
    </section>
  )
}
