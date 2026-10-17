import { useState, useEffect } from 'react'
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { formatRupiah } from '../lib/format.js'

function getTimestampMs(val) {
  if (!val) return 0
  if (typeof val.toMillis === 'function') return val.toMillis()
  if (typeof val.toDate === 'function') return val.toDate().getTime()
  if (val instanceof Date) return val.getTime()
  const parsed = new Date(val).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatPickupTime(val) {
  if (!val) return 'No pickup time specified'
  const d = typeof val.toDate === 'function' ? val.toDate() : new Date(val)
  if (Number.isNaN(d.getTime())) return 'Invalid pickup time'
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getRelativeTimeBadge(timestampMs) {
  if (!timestampMs) return null
  const diffMinutes = Math.round((timestampMs - Date.now()) / 60000)
  if (diffMinutes < -15) {
    return { label: `${Math.abs(diffMinutes)}M OVERDUE`, urgent: true }
  }
  if (diffMinutes <= 0) {
    return { label: 'DUE NOW', urgent: true }
  }
  if (diffMinutes <= 15) {
    return { label: `IN ${diffMinutes} MINS`, urgent: true }
  }
  if (diffMinutes < 60) {
    return { label: `IN ${diffMinutes} MINS`, urgent: false }
  }
  const hours = Math.floor(diffMinutes / 60)
  return { label: `IN ${hours}H ${diffMinutes % 60}M`, urgent: false }
}

export default function Orders() {
  const [activeQueue, setActiveQueue] = useState([])
  const [completedOrders, setCompletedOrders] = useState([])
  const [latePaymentOrders, setLatePaymentOrders] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [completingId, setCompletingId] = useState(null)
  const [, setTick] = useState(0)

  // Live timer tick every 15s to re-calculate relative times
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const ordersCol = collection(db, 'orders')
    const unsubscribe = onSnapshot(ordersCol, (snapshot) => {
      const all = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))

      // Filter orders where status is 'Paid'
      const paidOrders = all.filter((order) => order.status === 'Paid')

      // Sort chronologically by pickup_timestamp (ascending), tie-breaker created_at
      paidOrders.sort((a, b) => {
        const pickupA = getTimestampMs(a.pickup_timestamp || a.pickupAt)
        const pickupB = getTimestampMs(b.pickup_timestamp || b.pickupAt)

        if (pickupA !== pickupB) {
          if (pickupA === 0) return 1
          if (pickupB === 0) return -1
          return pickupA - pickupB
        }

        const createdA = getTimestampMs(a.created_at || a.createdAt)
        const createdB = getTimestampMs(b.created_at || b.createdAt)
        return createdA - createdB
      })

      const completed = all
        .filter((order) => order.status === 'Completed')
        .sort((a, b) => getTimestampMs(b.completedAt || b.created_at) - getTimestampMs(a.completedAt || a.created_at))

      const late = all
        .filter((order) => order.latePayment === true || (String(order.status).toLowerCase() === 'expired' && order.latePayment === true))
        .sort((a, b) => getTimestampMs(b.latePaymentAt || b.closedAt) - getTimestampMs(a.latePaymentAt || a.closedAt))

      setActiveQueue(paidOrders)
      setCompletedOrders(completed)
      setLatePaymentOrders(late)
    })

    return () => unsubscribe()
  }, [])

  const handleCompleteOrder = async (orderId) => {
    setCompletingId(orderId)
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'Completed',
        completedAt: new Date().toISOString(),
      })
    } catch (err) {
      alert('Failed to update order to Completed: ' + err.message)
    } finally {
      setCompletingId(null)
    }
  }

  return (
    <div className="smart-queue-dashboard">
      {/* Page Headline & Controls */}
      <section className="page-headline">
        <div className="queue-header-bar">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>&gt; SMART QUEUE</span>
              <span className="bracket-token" style={{ fontSize: '0.78rem', background: '#ffe600', color: '#000000', border: '2px solid #000000', padding: '2px 8px' }}>
                [ {activeQueue.length} ACTIVE ]
              </span>
            </h1>
            <p style={{ margin: '4px 0 0' }}>
              Real-time kitchen priority queue sorted chronologically by requested pickup slot.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="btn btn-ghost btn-sm"
            id="toggle-history-btn"
          >
            {showHistory ? '[ HIDE HISTORY ]' : `[ VIEW HISTORY (${completedOrders.length}) ]`}
          </button>
        </div>
      </section>

      {/* Late Payment Alerts (Edge Case: Webhook received settlement after 1-minute TTL) */}
      {latePaymentOrders.length > 0 && (
        <aside className="late-payment-alert-box" role="alert">
          <div className="late-payment-title">
            <span aria-hidden="true">⚠️</span>
            <h3>[ ACTION REQUIRED: LATE PAYMENT RECEIVED ({latePaymentOrders.length}) ]</h3>
          </div>
          <p className="late-payment-desc">
            Payment settlement arrived <strong>after the 1-minute TTL expired</strong>. These orders remain marked as <strong>Expired</strong> and reserved items have already been returned to menu stock. Manual refund or kitchen operational override is required.
          </p>

          <div style={{ display: 'grid', gap: '8px' }}>
            {latePaymentOrders.map((order) => (
              <div key={order.id} className="late-order-row">
                <div>
                  <strong style={{ fontSize: '1rem', color: 'var(--danger)' }}>
                    [ {order.order_tag || order.pickupName || 'Expired Order'} ]
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    ID: {order.id}
                  </span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Amount: <strong>{formatRupiah(order.latePaymentAmount || order.total)}</strong> &bull; Confirmed: {order.latePaymentAt ? formatPickupTime(order.latePaymentAt) : 'Yes'}
                  </div>
                </div>

                <span className="action-pill-danger">
                  [ MANUAL REFUND OR OVERRIDE ]
                </span>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Active Smart Queue List */}
      <section aria-labelledby="active-queue-heading">
        <header className="menu-category-header cat-food" style={{ marginBottom: '12px' }}>
          <h2 id="active-queue-heading">// ACTIVE ORDERS TO PREPARE</h2>
          <span className="bracket-token">[{activeQueue.length} IN KITCHEN]</span>
        </header>

        {activeQueue.length === 0 ? (
          <div className="notice notice-success" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '6px' }}>🎉</span>
            <p><strong>[ ★ NO ACTIVE ORDERS IN QUEUE ★ ]</strong></p>
            <p style={{ marginTop: '4px', fontSize: '0.9rem' }}>
              All paid orders have been prepared and handed over to customers!
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {activeQueue.map((order, index) => {
              const isFirst = index === 0
              const pickupMs = getTimestampMs(order.pickup_timestamp || order.pickupAt)
              const badge = getRelativeTimeBadge(pickupMs)
              const orderTag = order.order_tag || order.pickupName || 'Order'

              return (
                <article
                  key={order.id}
                  className={`smart-queue-card ${isFirst ? 'priority-first' : ''}`}
                >
                  {/* Priority #1 top highlight banner */}
                  {isFirst && (
                    <div className="priority-banner">
                      <span>[ 🔥 PRIORITY #1 • NEXT UP FOR PICKUP ]</span>
                      <span>[ PREPARE FIRST ]</span>
                    </div>
                  )}

                  <div className="queue-card-content">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Order Tag & Queue Position */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div className="order-tag-container">
                          <span className="order-tag-label">ORDER TAG (SHOUT OUT):</span>
                          <span className="order-tag-big">{orderTag}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className={`queue-pill ${isFirst ? 'first' : ''}`}>
                            [ #{index + 1} IN LINE ]
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ID: {order.id}
                          </span>
                        </div>
                      </div>

                      {/* Requested Pickup Time Box */}
                      <div className="pickup-time-box">
                        <span style={{ fontSize: '1.2rem' }}>⏰</span>
                        <div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>
                            REQUESTED PICKUP TIME:
                          </span>
                          <strong style={{ fontSize: '1rem', color: '#000000' }}>
                            {formatPickupTime(order.pickup_timestamp || order.pickupAt)}
                          </strong>
                        </div>
                        {badge && (
                          <span className={`urgency-badge ${badge.urgent ? 'urgent' : 'normal'}`}>
                            [ {badge.label} ]
                          </span>
                        )}
                      </div>

                      {/* Ordered Items List */}
                      <div>
                        <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-pixel)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                          ITEMS TO PREPARE:
                        </span>
                        <div className="queue-items-list">
                          {Array.isArray(order.items)
                            ? order.items.map((item, idx) => (
                                <span key={idx} className="item-chip">
                                  <strong>{item.qty}x</strong> {item.name || item.id}
                                </span>
                              ))
                            : Object.entries(order.items || {}).map(([id, qty]) => (
                                <span key={id} className="item-chip">
                                  <strong>{qty}x</strong> {id}
                                </span>
                              ))}
                        </div>
                      </div>

                      {/* Special Kitchen Notes */}
                      {order.notes && (
                        <div className="notes-callout">
                          <strong>[ KITCHEN NOTE ]:</strong> &ldquo;{order.notes}&rdquo;
                        </div>
                      )}

                      <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                        Total: <strong>{formatRupiah(order.total)}</strong> &bull; Paid: {order.paidAt ? formatPickupTime(order.paidAt) : 'Yes'}
                      </div>
                    </div>

                    {/* Complete Action Button */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleCompleteOrder(order.id)}
                        disabled={completingId === order.id}
                        className="btn btn-success btn-complete"
                        id={`complete-btn-${order.id}`}
                      >
                        {completingId === order.id ? (
                          '[ UPDATING... ]'
                        ) : (
                          <>
                            <span>✓</span>
                            <span>[ COMPLETE ]</span>
                          </>
                        )}
                      </button>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        Removes from active queue
                      </small>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Collapsible Completed Orders History */}
      {showHistory && (
        <section aria-labelledby="history-heading" style={{ marginTop: '24px' }}>
          <header className="menu-category-header cat-other">
            <h3 id="history-heading">// COMPLETED ORDERS HISTORY</h3>
            <span className="bracket-token">[{completedOrders.length} ARCHIVED]</span>
          </header>

          {completedOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '12px' }}>No completed orders recorded yet.</p>
          ) : (
            <div>
              {completedOrders.slice(0, 20).map((order) => (
                <div key={order.id} className="history-row">
                  <div>
                    <strong>[ {order.order_tag || order.pickupName || 'Order'} ]</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '8px' }}>
                      ID: {order.id}
                    </span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Completed at: {order.completedAt ? formatPickupTime(order.completedAt) : 'Recently'} &bull; Total: {formatRupiah(order.total)}
                    </div>
                  </div>
                  <span className="bracket-token" style={{ background: '#dcfce7', color: '#14532d', border: '1.5px solid #000000', padding: '3px 8px', fontWeight: 700, fontSize: '0.72rem' }}>
                    [ COMPLETED ]
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
