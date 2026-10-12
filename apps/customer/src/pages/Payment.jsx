import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import useActiveOrder from '../hooks/useActiveOrder.js'
import useCountdown from '../hooks/useCountdown.js'
import { clearActiveOrder } from '../lib/storage.js'
import { formatCountdown, formatPickup, formatRupiah } from '../lib/format.js'
import { PAYMENT_WINDOW_MS } from '../lib/constants.js'

const RING_RADIUS = 54
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

function CountdownRing({ remaining }) {
  const fraction = Math.min(1, remaining / PAYMENT_WINDOW_MS)
  const urgent = remaining <= 30_000
  return (
    <div className={urgent ? 'ring urgent' : 'ring'} role="timer" aria-label={`Time left to pay: ${formatCountdown(remaining)}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="ring-track" cx="60" cy="60" r={RING_RADIUS} />
        <circle
          className="ring-progress"
          cx="60"
          cy="60"
          r={RING_RADIUS}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - fraction)}
        />
      </svg>
      <div className="ring-label">
        <strong id="countdown-value">{formatCountdown(remaining)}</strong>
        <span>left to pay</span>
      </div>
    </div>
  )
}

function PickupCard({ pickupName, pickupAt, notes }) {
  return (
    <div className="pickup-card">
      <span className="muted">Your pickup name</span>
      <strong className="pickup-name" id="pickup-name">{pickupName || '—'}</strong>
      {pickupAt && <span className="muted">Pickup: {formatPickup(pickupAt)}</span>}
      {notes && (
        <span
          className="pickup-note"
          style={{
            fontSize: '0.88rem',
            color: 'var(--text)',
            background: 'var(--surface)',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            marginTop: '4px',
            maxWidth: '100%',
            wordBreak: 'break-word',
            textAlign: 'center',
          }}
        >
          📝 <strong>Note:</strong> {notes}
        </span>
      )}
    </div>
  )
}

export default function Payment() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const activeOrder = useActiveOrder()
  const mine = activeOrder?.orderId === orderId ? activeOrder : null

  // `order`: undefined = still loading, null = no such document (yet), object = the order.
  // The id is stored alongside so navigating to another order shows loading again.
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
  const pickupName = order?.pickupName ?? mine?.pickupName ?? ''
  const pickupAt = order?.pickupAt ?? mine?.pickupAt ?? null
  const notes = order?.notes ?? mine?.notes ?? ''

  // Deadline: the server's `expiresAt` once it exists, otherwise what was saved
  // locally at checkout. Absolute timestamps mean a refresh never resets the clock.
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
        'Are you sure you want to cancel this order? The QR code will be invalidated and reserved items will be returned to stock.',
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

  // ---- Loading -------------------------------------------------------------
  if (order === undefined && !mine) {
    return (
      <div className="container page narrow">
        <div className="card panel center" aria-busy="true">Loading your order…</div>
      </div>
    )
  }

  // ---- Paid ----------------------------------------------------------------
  if (status === 'paid') {
    return (
      <div className="container page narrow">
        <div className="card panel center result result-success">
          <span className="result-icon" aria-hidden="true">✅</span>
          <h1>Payment received</h1>
          <p className="lead">Your order is confirmed. Show this name at the counter.</p>
          <PickupCard pickupName={pickupName} pickupAt={pickupAt} notes={notes} />
          {typeof order?.total === 'number' && <p className="muted">Paid {formatRupiah(order.total)}</p>}
          <button type="button" className="btn btn-ghost" id="payment-new-order" onClick={startNewOrder}>Place another order</button>
        </div>
      </div>
    )
  }

  // ---- Completed -----------------------------------------------------------
  if (status === 'completed') {
    return (
      <div className="container page narrow">
        <div className="card panel center result">
          <span className="result-icon" aria-hidden="true">🎉</span>
          <h1>Order picked up</h1>
          <p className="lead">Enjoy your meal! Thanks for ordering at Kantin Lina.</p>
          <button type="button" className="btn btn-primary" id="payment-new-order" onClick={startNewOrder}>Order again</button>
        </div>
      </div>
    )
  }

  // ---- Expired / cancelled / timed out locally -----------------------------
  if (status === 'expired' || status === 'cancelled' || timedOut) {
    const isCancelled = status === 'cancelled'
    return (
      <div className="container page narrow">
        <div className="card panel center result result-danger">
          <span className="result-icon" aria-hidden="true">{isCancelled ? '🛑' : '⌛'}</span>
          <h1>{isCancelled ? 'Order cancelled' : 'Payment window closed'}</h1>
          <p className="lead">
            {isCancelled
              ? 'This order has been cancelled. Any reserved items have been returned to stock.'
              : 'This order was not paid within 3 minutes, so it has expired. Please place a new order.'}
          </p>
          {notes && <p className="muted" style={{ fontStyle: 'italic' }}>Note: &ldquo;{notes}&rdquo;</p>}
          <button type="button" className="btn btn-primary" id="payment-new-order" onClick={startNewOrder}>Start a new order</button>
        </div>
      </div>
    )
  }

  // ---- Pending, but this browser doesn't hold the QR ----------------------
  if (!mine?.qrUrl) {
    return (
      <div className="container page narrow">
        <div className="card panel center result">
          <span className="result-icon" aria-hidden="true">🔍</span>
          <h1>{order ? 'Waiting for payment' : 'Order not found'}</h1>
          <p className="lead">
            {order
              ? 'The QR code for this order is not available on this device.'
              : 'We could not find this order on this device.'}
          </p>
          <Link to="/menu" className="btn btn-primary" id="payment-back-menu">Back to menu</Link>
        </div>
      </div>
    )
  }

  // ---- Pending: show the QR and the strict 3 minute countdown --------------
  return (
    <div className="container page narrow">
      <div className="card panel center pay-card">
        <h1>Scan to pay</h1>
        <p className="lead">Open your e-wallet or banking app and scan this QRIS code.</p>

        {remaining !== null && <CountdownRing remaining={remaining} />}

        <div className="qr-frame">
          <img src={mine.qrUrl} alt="QRIS payment code" width="240" height="240" id="qris-image" />
        </div>

        <PickupCard pickupName={pickupName} pickupAt={pickupAt} notes={notes} />

        {cancelError && (
          <div className="notice notice-error" role="alert" style={{ width: '100%' }}>
            {cancelError}
          </div>
        )}

        <div className="pay-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '6px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: 'var(--danger)', borderColor: 'var(--border)' }}
            id="payment-cancel-order"
            onClick={handleCancelOrder}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling order…' : 'Cancel this order'}
          </button>
        </div>

        <p className="hint">
          This page updates automatically once your payment is confirmed. Keep it open or come back with the
          &ldquo;My order&rdquo; link.
        </p>
      </div>
    </div>
  )
}
