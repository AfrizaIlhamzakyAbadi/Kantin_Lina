import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/cartContext.js'
import useMenu from '../hooks/useMenu.js'
import useSchedule from '../hooks/useSchedule.js'
import useActiveOrder from '../hooks/useActiveOrder.js'
import useCountdown from '../hooks/useCountdown.js'
import { setActiveOrder } from '../lib/storage.js'
import { formatRupiah } from '../lib/format.js'
import { cleanName } from '../lib/orderName.js'
import { resolveExpiry } from '../lib/payment.js'
import { getPickupDays, getSlotsForDate, toPickupDate, formatScheduleDays } from '../lib/schedule.js'
import { MAX_NAME_LENGTH, MAX_QTY_PER_ITEM, MIN_NAME_LENGTH } from '../lib/constants.js'

export default function Cart() {
  const navigate = useNavigate()
  const { lines, customerName, setCustomerName, setQty, clearCart } = useCart()
  const { items: menuItems, loading: menuLoading } = useMenu()
  const { schedule, usingDefault } = useSchedule()
  const activeOrder = useActiveOrder()

  const [pickupDay, setPickupDay] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Show live menu prices, and flag lines whose item sold out or was removed.
  const menuById = useMemo(() => new Map(menuItems.map((m) => [m.id, m])), [menuItems])
  const viewLines = lines.map((line) => {
    const live = menuById.get(line.id)
    return {
      ...line,
      name: live?.name ?? line.name,
      price: live?.price ?? line.price,
      unavailable: !menuLoading && (!live || live.soldOut),
    }
  })
  const total = viewLines.reduce((sum, l) => sum + l.qty * l.price, 0)
  const hasUnavailable = viewLines.some((l) => l.unavailable)

  // Pickup picker: only days/times the owner's schedule allows.
  const days = useMemo(() => getPickupDays(schedule), [schedule])
  const dayKey = days.some((d) => d.key === pickupDay) ? pickupDay : (days[0]?.key ?? '')
  const slots = useMemo(() => (dayKey ? getSlotsForDate(schedule, dayKey) : []), [schedule, dayKey])
  const timeValue = slots.includes(pickupTime) ? pickupTime : ''

  // A QR that is still within its 3 minute window must be finished (or allowed
  // to expire) first, otherwise a second checkout would overwrite it.
  const activeRemaining = useCountdown(activeOrder?.expiresAt ?? null)
  const paymentInProgress = activeRemaining !== null && activeRemaining > 0

  const nameOk = cleanName(customerName).length >= MIN_NAME_LENGTH
  const canSubmit =
    viewLines.length > 0 && !hasUnavailable && nameOk && Boolean(dayKey) && Boolean(timeValue) &&
    !paymentInProgress && !submitting

  async function handleCheckout(event) {
    event.preventDefault()
    if (!canSubmit) return
    setError('')

    // Re-validate against the current time: the slot list may be minutes old.
    if (!getSlotsForDate(schedule, dayKey).includes(timeValue)) {
      setError('That pickup time is no longer available. Please choose another one.')
      return
    }

    const pickupName = cleanName(customerName)
    const pickupAt = toPickupDate(dayKey, timeValue).toISOString()

    setSubmitting(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: pickupName,
          pickupAt,
          items: viewLines.map(({ id, qty }) => ({ id, qty })),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.orderId) {
        throw new Error(data?.error || `Checkout failed (HTTP ${response.status}). Please try again.`)
      }

      // Prefer the server's deadline; fall back to now + 3 minutes.
      setActiveOrder({
        orderId: data.orderId,
        pickupName: data.pickupName || pickupName,
        pickupAt,
        qrUrl: data.qrUrl ?? null,
        qrString: data.qrString ?? null,
        expiresAt: resolveExpiry(data.expiresAt),
      })
      clearCart()
      navigate(`/payment/${data.orderId}`)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (lines.length === 0) {
    return (
      <div className="container page">
        <div className="empty">
          <span aria-hidden="true">🛒</span>
          <h1>Your cart is empty</h1>
          <p>Add something tasty from the menu to get started.</p>
          <Link to="/menu" className="btn btn-primary" id="cart-go-menu">Browse the menu</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Your cart</h1>
      </header>

      <form className="cart-layout" onSubmit={handleCheckout} noValidate>
        <section className="card panel" aria-labelledby="cart-items-title">
          <h2 id="cart-items-title">Items</h2>
          <ul className="cart-lines">
            {viewLines.map((line) => (
              <li key={line.id} className={line.unavailable ? 'cart-line unavailable' : 'cart-line'}>
                <div className="cart-line-info">
                  <strong>{line.name}</strong>
                  <span className="muted">{formatRupiah(line.price)}</span>
                  {line.unavailable && <span className="line-warning">No longer available. Please remove it.</span>}
                </div>
                <div className="stepper" role="group" aria-label={`Quantity of ${line.name}`}>
                  <button type="button" id={`cart-dec-${line.id}`} aria-label={`Remove one ${line.name}`} onClick={() => setQty(line, line.qty - 1)}>−</button>
                  <output>{line.qty}</output>
                  <button type="button" id={`cart-inc-${line.id}`} aria-label={`Add one ${line.name}`} disabled={line.qty >= MAX_QTY_PER_ITEM} onClick={() => setQty(line, line.qty + 1)}>+</button>
                </div>
                <span className="line-total">{formatRupiah(line.qty * line.price)}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="card panel checkout-panel" aria-labelledby="checkout-title">
          <h2 id="checkout-title">Pickup details</h2>

          <label className="field" htmlFor="customer-name">
            <span>Your name</span>
            <input
              id="customer-name"
              type="text"
              autoComplete="given-name"
              placeholder="e.g. Budi"
              maxLength={MAX_NAME_LENGTH}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <small>
              We add a daily queue number so staff can call a unique name
              {nameOk && <> (e.g. <strong>{cleanName(customerName)}-1</strong>)</>}.
            </small>
          </label>

          {days.length === 0 ? (
            <div className="notice notice-warn" role="status">
              Pickup is not available in the next few days. Hours: {formatScheduleDays(schedule)},{' '}
              {schedule.openTime}-{schedule.closeTime}.
            </div>
          ) : (
            <div className="field-row">
              <label className="field" htmlFor="pickup-day">
                <span>Pickup day</span>
                <select id="pickup-day" value={dayKey} onChange={(e) => setPickupDay(e.target.value)}>
                  {days.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="pickup-time">
                <span>Pickup time</span>
                <select id="pickup-time" value={timeValue} onChange={(e) => setPickupTime(e.target.value)}>
                  <option value="" disabled>Select time</option>
                  {slots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <p className="hint">
            Hours: {formatScheduleDays(schedule)}, {schedule.openTime}-{schedule.closeTime}
            {usingDefault && ' (default schedule)'}
          </p>

          <div className="summary">
            <div className="summary-row"><span>Total</span><strong className="summary-total">{formatRupiah(total)}</strong></div>
          </div>

          {paymentInProgress && (
            <div className="notice notice-warn" role="status">
              You have a payment in progress.{' '}
              <Link to={`/payment/${activeOrder.orderId}`}>Return to your QR code</Link>.
            </div>
          )}
          {hasUnavailable && (
            <div className="notice notice-warn" role="status">Remove unavailable items to continue.</div>
          )}
          {error && <div className="notice notice-error" role="alert">{error}</div>}

          <button type="submit" className="btn btn-primary btn-lg btn-block" id="checkout-submit" disabled={!canSubmit}>
            {submitting ? 'Creating your QR code…' : 'Pay with QRIS'}
          </button>
          <p className="hint center">You will have 3 minutes to scan and pay.</p>
        </aside>
      </form>
    </div>
  )
}
