import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/cartContext.js'
import useMenu from '../hooks/useMenu.js'
import useSchedule from '../hooks/useSchedule.js'
import useActiveOrder from '../hooks/useActiveOrder.js'
import useCountdown from '../hooks/useCountdown.js'
import { setActiveOrder, clearActiveOrder } from '../lib/storage.js'
import { formatRupiah } from '../lib/format.js'
import { cleanName } from '../lib/orderName.js'
import { resolveExpiry } from '../lib/payment.js'
import { getPickupDays, getSlotsForDate, getHoursForDate, getMinutesForHour, toPickupDate, formatScheduleDays } from '../lib/schedule.js'
import { MAX_NAME_LENGTH, MAX_QTY_PER_ITEM, MIN_NAME_LENGTH } from '../lib/constants.js'

export default function Cart() {
  const navigate = useNavigate()
  const { lines, customerName, setCustomerName, orderNotes, setOrderNotes, setQty, clearCart } = useCart()
  const { items: menuItems, loading: menuLoading } = useMenu()
  const { schedule, usingDefault } = useSchedule()
  const activeOrder = useActiveOrder()

  const [pickupDay, setPickupDay] = useState('')
  const [pickupHour, setPickupHour] = useState('')
  const [pickupMinute, setPickupMinute] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancellingPending, setCancellingPending] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => new Date())

  // Refresh current system time periodically so lead time dynamically updates
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(timer)
  }, [])

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
  const days = useMemo(() => getPickupDays(schedule, now), [schedule, now])
  const dayKey = days.some((d) => d.key === pickupDay) ? pickupDay : (days[0]?.key ?? '')

  // Available hours for the selected date
  const hours = useMemo(() => (dayKey ? getHoursForDate(schedule, dayKey, now) : []), [schedule, dayKey, now])
  const selectedHour = hours.some((h) => h.value === pickupHour && !h.disabled)
    ? pickupHour
    : (hours.find((h) => !h.disabled)?.value ?? '')

  // Available 5-minute increments for the selected hour
  const minutes = useMemo(
    () => (dayKey && selectedHour ? getMinutesForHour(schedule, dayKey, selectedHour, now) : []),
    [schedule, dayKey, selectedHour, now],
  )
  const selectedMinute = minutes.some((m) => m.value === pickupMinute && !m.disabled)
    ? pickupMinute
    : (minutes.find((m) => !m.disabled)?.value ?? '')

  const timeValue = selectedHour && selectedMinute ? `${selectedHour}:${selectedMinute}` : ''

  // A QR that is still within its 1 minute window must be finished or cancelled first.
  const activeRemaining = useCountdown(activeOrder?.expiresAt ?? null)
  const paymentInProgress = activeRemaining !== null && activeRemaining > 0

  const nameOk = cleanName(customerName).length >= MIN_NAME_LENGTH
  const canSubmit =
    viewLines.length > 0 &&
    !hasUnavailable &&
    nameOk &&
    Boolean(dayKey) &&
    Boolean(timeValue) &&
    !paymentInProgress &&
    !submitting

  async function handleCheckout(event) {
    event.preventDefault()
    if (!canSubmit) return
    setError('')

    if (!getSlotsForDate(schedule, dayKey).includes(timeValue)) {
      setError('Selected pickup time is no longer available. Please select another slot.')
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
          notes: orderNotes?.trim() || '',
          items: viewLines.map(({ id, qty }) => ({ id, qty })),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.orderId) {
        throw new Error(data?.error || `Checkout failed (HTTP ${response.status}). Please try again.`)
      }

      setActiveOrder({
        orderId: data.orderId,
        pickupName: data.pickupName || pickupName,
        customerName: data.customerName || pickupName,
        order_tag: data.order_tag ?? null,
        pickup_timestamp: data.pickup_timestamp || pickupAt,
        created_at: data.created_at || new Date().toISOString(),
        pickupAt,
        notes: data.notes || orderNotes?.trim() || '',
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
      <section className="notice-card" aria-labelledby="empty-cart-title">
        <header className="page-headline">
          <h1 id="empty-cart-title">&gt; YOUR CART IS EMPTY</h1>
        </header>
        <p style={{ margin: '14px 0' }}>No items in your order tray yet.</p>
        <Link to="/menu" className="btn btn-primary" id="cart-go-menu">
          &lt;&lt; BROWSE MENU
        </Link>
      </section>
    )
  }

  return (
    <section aria-labelledby="cart-heading">
      <header className="page-headline">
        <h1 id="cart-heading">&gt; CART &amp; CHECKOUT</h1>
        <p>Review items, set pickup details, and initiate QRIS payment.</p>
      </header>

      <form className="cart-layout" onSubmit={handleCheckout} noValidate>
        {/* Left column: Cart Items List */}
        <section aria-labelledby="cart-items-heading">
          <header className="menu-category-header cat-cart">
            <h2 id="cart-items-heading">// SELECTED ITEMS</h2>
            <span className="bracket-token">[{viewLines.length} LINES]</span>
          </header>

          <ul className="cart-item-list">
            {viewLines.map((line) => (
              <li key={line.id} className="cart-item-row">
                <div className="cart-item-info">
                  <strong>{line.name}</strong>
                  <span className="cart-item-price">@{formatRupiah(line.price)}</span>
                  {line.unavailable && (
                    <p style={{ color: 'var(--red)', fontWeight: 'bold', fontSize: '0.8rem' }} className="bracket-token">
                      [ ITEM SOLD OUT - REMOVE TO CONTINUE ]
                    </p>
                  )}
                </div>

                <div className="cart-item-controls">
                  <div className="stepper-block" role="group" aria-label={`Quantity of ${line.name}`}>
                    <button
                      type="button"
                      id={`cart-dec-${line.id}`}
                      aria-label={`Remove one ${line.name}`}
                      onClick={() => setQty(line, line.qty - 1)}
                    >
                      -
                    </button>
                    <output aria-live="polite">{line.qty}</output>
                    <button
                      type="button"
                      id={`cart-inc-${line.id}`}
                      aria-label={`Add one ${line.name}`}
                      disabled={line.qty >= MAX_QTY_PER_ITEM}
                      onClick={() => setQty(line, line.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className="cart-item-total">{formatRupiah(line.qty * line.price)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Right column: Pickup Details & Checkout Sidebar */}
        <aside aria-labelledby="checkout-aside-heading">
          <header className="menu-category-header cat-cart">
            <h2 id="checkout-aside-heading">// PICKUP DETAILS</h2>
          </header>

          <fieldset className="brutalist-fieldset fieldset-identity">
            <legend>1. CUSTOMER IDENTITY</legend>
            <label className="field" htmlFor="customer-name">
              <span>CALL NAME (REQUIRED):</span>
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
                A daily queue number will be added <span className="bracket-token">(e.g. <strong>{cleanName(customerName) || 'Budi'}-1</strong>)</span>.
              </small>
            </label>

            <label className="field" htmlFor="order-notes">
              <span>NOTES FOR KITCHEN (OPTIONAL):</span>
              <textarea
                id="order-notes"
                rows="2"
                maxLength={200}
                placeholder="e.g. Sambal dipisah, tanpa es, tidak pedas..."
                value={orderNotes || ''}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
              <small>Special food preparation instructions (max 200 chars).</small>
            </label>
          </fieldset>

          <fieldset className="brutalist-fieldset fieldset-pickup">
            <legend>2. PICKUP SLOT</legend>
            {days.length === 0 ? (
              <div className="notice notice-warn" role="status">
                Pickup unavailable in next few days. Hours: {formatScheduleDays(schedule)},{' '}
                {schedule.openTime}-{schedule.closeTime}.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label className="field" htmlFor="pickup-day">
                  <span>DAY:</span>
                  <select id="pickup-day" value={dayKey} onChange={(e) => setPickupDay(e.target.value)}>
                    {days.map((d) => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </label>

                <div className="field-row">
                  <label className="field" htmlFor="pickup-hour">
                    <span>HOUR:</span>
                    <select
                      id="pickup-hour"
                      value={selectedHour}
                      onChange={(e) => {
                        setPickupHour(e.target.value)
                        setPickupMinute('')
                      }}
                    >
                      <option value="" disabled>Select hour</option>
                      {hours.map((h) => (
                        <option key={h.value} value={h.value} disabled={h.disabled}>
                          {h.label} {h.disabled ? '(unavailable)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field" htmlFor="pickup-minute">
                    <span>MINUTE (5-MIN BATCH):</span>
                    <select
                      id="pickup-minute"
                      value={selectedMinute}
                      disabled={!selectedHour}
                      onChange={(e) => setPickupMinute(e.target.value)}
                    >
                      <option value="" disabled>Select minute</option>
                      {minutes.map((m) => (
                        <option key={m.value} value={m.value} disabled={m.disabled}>
                          :{m.value} {m.disabled ? '(too soon - min 2m)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}
            <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)' }}>
              Operating hours: {formatScheduleDays(schedule)}, {schedule.openTime}-{schedule.closeTime}
              {usingDefault && <span className="bracket-token"> (default schedule)</span>}
            </small>
          </fieldset>

          <div className="order-summary-box">
            <div className="order-summary-row">
              <span>ITEMS SUBTOTAL:</span>
              <span>{formatRupiah(total)}</span>
            </div>
            <div className="order-summary-row total-row">
              <span>TOTAL DUE:</span>
              <span>{formatRupiah(total)}</span>
            </div>
          </div>

          {paymentInProgress && (
            <div className="notice notice-warn" role="status">
              <p><strong>[ ALERT ]</strong> You currently have an unpaid order pending.</p>
              <p style={{ marginTop: '6px' }}>
                <Link to={`/payment/${activeOrder.orderId}`}>&gt;&gt; Return to QR Code</Link>
              </p>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                style={{ marginTop: '8px' }}
                disabled={cancellingPending}
                onClick={async () => {
                  if (window.confirm('Cancel your pending order so you can checkout now? Reserved stock will be restored.')) {
                    setCancellingPending(true)
                    try {
                      await fetch('/api/cancel', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: activeOrder.orderId }),
                      })
                    } catch (e) {
                      console.error(e)
                    } finally {
                      clearActiveOrder()
                      setCancellingPending(false)
                    }
                  }
                }}
              >
                {cancellingPending ? 'CANCELLING...' : '[cancel]'}
              </button>
            </div>
          )}

          {hasUnavailable && (
            <div className="notice notice-error" role="status">
              Please remove sold-out items to proceed with checkout.
            </div>
          )}

          {error && (
            <div className="notice notice-error" role="alert">
              <strong>[ ERROR ]</strong> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            id="checkout-submit"
            disabled={!canSubmit}
          >
            {submitting ? 'GENERATING QRIS...' : '=== PAY WITH QRIS ==='}
          </button>
          <small style={{ display: 'block', textAlign: 'center', marginTop: '6px', color: 'var(--text-muted)' }}>
            * You will have exactly 1 minute to scan and pay.
          </small>
        </aside>
      </form>
    </section>
  )
}
