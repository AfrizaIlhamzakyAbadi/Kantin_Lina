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
    return { label: `${Math.abs(diffMinutes)}m OVERDUE`, urgent: true, color: 'var(--danger)' }
  }
  if (diffMinutes <= 0) {
    return { label: 'DUE NOW', urgent: true, color: 'var(--danger)' }
  }
  if (diffMinutes <= 15) {
    return { label: `IN ${diffMinutes} MINS`, urgent: true, color: 'var(--primary)' }
  }
  if (diffMinutes < 60) {
    return { label: `IN ${diffMinutes} MINS`, urgent: false, color: 'var(--text-muted)' }
  }
  const hours = Math.floor(diffMinutes / 60)
  return { label: `IN ${hours}h ${diffMinutes % 60}m`, urgent: false, color: 'var(--text-muted)' }
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
    // 1. Real-time dashboard listening to the orders collection
    const ordersCol = collection(db, 'orders')
    const unsubscribe = onSnapshot(ordersCol, (snapshot) => {
      const all = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))

      // 2. Priority Algorithm:
      // Filter orders where status is 'Paid'
      const paidOrders = all.filter((order) => order.status === 'Paid')

      // Sort by pickup_timestamp (ascending). Use created_at (ascending) as fallback tie-breaker.
      paidOrders.sort((a, b) => {
        const pickupA = getTimestampMs(a.pickup_timestamp || a.pickupAt)
        const pickupB = getTimestampMs(b.pickup_timestamp || b.pickupAt)

        if (pickupA !== pickupB) {
          if (pickupA === 0) return 1
          if (pickupB === 0) return -1
          return pickupA - pickupB // Earliest required order at the top
        }

        const createdA = getTimestampMs(a.created_at || a.createdAt)
        const createdB = getTimestampMs(b.created_at || b.createdAt)
        return createdA - createdB // Tie-breaker: earliest placed order first
      })

      const completed = all
        .filter((order) => order.status === 'Completed')
        .sort((a, b) => getTimestampMs(b.completedAt || b.created_at) - getTimestampMs(a.completedAt || a.created_at))

      // Late payments: orders flagged latePayment (received after 1-minute TTL, stock already returned)
      const late = all
        .filter((order) => order.latePayment === true || (String(order.status).toLowerCase() === 'expired' && order.latePayment === true))
        .sort((a, b) => getTimestampMs(b.latePaymentAt || b.closedAt) - getTimestampMs(a.latePaymentAt || a.closedAt))

      setActiveQueue(paidOrders)
      setCompletedOrders(completed)
      setLatePaymentOrders(late)
    })

    return () => unsubscribe()
  }, [])

  // 'Complete' button updates status to 'Completed', removing from active queue
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>⚡ Smart Queue</span>
            <span style={{
              fontSize: '0.9rem',
              padding: '0.2rem 0.75rem',
              background: activeQueue.length > 0 ? 'var(--primary)' : 'var(--success)',
              color: '#ffffff',
              borderRadius: '999px',
              fontWeight: 600,
            }}>
              {activeQueue.length} Active {activeQueue.length === 1 ? 'Order' : 'Orders'}
            </span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Real-time kitchen priority queue sorted by requested pickup time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          style={{
            padding: '0.5rem 1rem',
            background: showHistory ? 'var(--bg-accent)' : 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {showHistory ? 'Hide Completed History' : `View Completed History (${completedOrders.length})`}
        </button>
      </header>

      {/* Late Payment Alerts (Edge Case: Webhook received settlement after 1-minute TTL) */}
      {latePaymentOrders.length > 0 && (
        <aside
          role="alert"
          style={{
            background: 'var(--danger-soft, #fee2e2)',
            border: '2px solid var(--danger, #ef4444)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
            <h3 style={{ margin: 0, color: 'var(--danger, #dc2626)', fontSize: '1.15rem' }}>
              ACTION REQUIRED: Late Payment Received ({latePaymentOrders.length})
            </h3>
          </div>
          <p style={{ color: '#991b1b', fontSize: '0.9rem', marginBottom: '0.85rem' }}>
            Payment settlement arrived <strong>after the 1-minute TTL expired</strong>. These orders remain marked as <strong>Expired</strong> and reserved items have already been returned to menu stock. A manual refund or kitchen operational override is required.
          </p>

          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {latePaymentOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--danger-soft, #fca5a5)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <strong style={{ fontSize: '1rem', color: 'var(--danger)' }}>
                    {order.order_tag || order.pickupName || 'Expired Order'}
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    ID: {order.id}
                  </span>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Amount: <strong>{formatRupiah(order.latePaymentAmount || order.total)}</strong> &bull; Late Payment Confirmed: {order.latePaymentAt ? formatPickupTime(order.latePaymentAt) : 'Yes'}
                  </div>
                </div>

                <span style={{
                  padding: '0.35rem 0.75rem',
                  background: 'var(--danger)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}>
                  MANUAL REFUND OR OVERRIDE
                </span>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Active Smart Queue List */}
      <section aria-labelledby="active-queue-heading">
        <h3 id="active-queue-heading" style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Active Orders to Prepare ({activeQueue.length})
        </h3>

        {activeQueue.length === 0 ? (
          <div style={{
            padding: '3rem 2rem',
            background: 'var(--surface)',
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius)',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🎉</span>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text)', marginBottom: '0.5rem' }}>No Active Orders in Queue</h3>
            <p>All paid orders have been prepared and handed over to customers!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {activeQueue.map((order, index) => {
              const isFirst = index === 0
              const pickupMs = getTimestampMs(order.pickup_timestamp || order.pickupAt)
              const badge = getRelativeTimeBadge(pickupMs)
              const orderTag = order.order_tag || order.pickupName || 'Order'

              return (
                <article
                  key={order.id}
                  className={`smart-queue-card ${isFirst ? 'priority-first' : ''}`}
                  style={{
                    background: 'var(--surface)',
                    border: isFirst ? '2.5px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    boxShadow: isFirst ? 'var(--shadow)' : 'var(--shadow-sm)',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  {/* Top highlight bar for the earliest required order */}
                  {isFirst && (
                    <div style={{
                      background: 'var(--gradient)',
                      color: '#ffffff',
                      padding: '0.4rem 1.25rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span>🔥 PRIORITY #1 • NEXT UP FOR PICKUP</span>
                      <span>PREPARE FIRST</span>
                    </div>
                  )}

                  <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Prominently displayed order_tag for shouting out */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          background: isFirst ? 'var(--bg-accent)' : 'var(--surface-2)',
                          border: '2px solid var(--primary)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.5rem 1.25rem',
                        }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Order Tag (Shout Out):
                          </span>
                          <strong style={{ fontSize: '2rem', color: 'var(--primary)', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                            {orderTag}
                          </strong>
                        </div>

                        {/* Queue Position Pill */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.6rem',
                            background: isFirst ? 'var(--primary)' : 'var(--border)',
                            color: isFirst ? '#ffffff' : 'var(--text)',
                            borderRadius: '6px',
                            display: 'inline-block',
                            width: 'fit-content',
                          }}>
                            #{index + 1} in line
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ID: {order.id}
                          </span>
                        </div>
                      </div>

                      {/* Requested Pickup Time Display */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: 'var(--surface-2)',
                        padding: '0.6rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        width: 'fit-content',
                        flexWrap: 'wrap',
                      }}>
                        <span style={{ fontSize: '1.1rem' }}>⏰</span>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                            REQUESTED PICKUP TIME:
                          </span>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--text)' }}>
                            {formatPickupTime(order.pickup_timestamp || order.pickupAt)}
                          </strong>
                        </div>
                        {badge && (
                          <span style={{
                            marginLeft: '0.5rem',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: badge.urgent ? 'var(--danger-soft)' : 'var(--bg-accent)',
                            color: badge.color,
                          }}>
                            {badge.label}
                          </span>
                        )}
                      </div>

                      {/* Ordered Items List */}
                      <div style={{ marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                          Items to Prepare:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {Array.isArray(order.items)
                            ? order.items.map((item, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border)',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '6px',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                  }}
                                >
                                  <strong>{item.qty}x</strong> {item.name || item.id}
                                </span>
                              ))
                            : Object.entries(order.items || {}).map(([id, qty]) => (
                                <span
                                  key={id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border)',
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '6px',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                  }}
                                >
                                  <strong>{qty}x</strong> {id}
                                </span>
                              ))}
                        </div>
                      </div>

                      {/* Special Kitchen Notes */}
                      {order.notes && (
                        <div style={{
                          padding: '0.5rem 0.8rem',
                          background: '#fffbeb',
                          borderLeft: '4px solid var(--warn, #f59e0b)',
                          borderRadius: '4px',
                          fontSize: '0.88rem',
                          color: '#78350f',
                        }}>
                          <strong>Kitchen Note:</strong> &ldquo;{order.notes}&rdquo;
                        </div>
                      )}

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Total: <strong>{formatRupiah(order.total)}</strong> &bull; Paid: {order.paidAt ? formatPickupTime(order.paidAt) : 'Yes'}
                      </div>
                    </div>

                    {/* Complete Action Button */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => handleCompleteOrder(order.id)}
                        disabled={completingId === order.id}
                        style={{
                          padding: '0.85rem 1.75rem',
                          background: isFirst ? 'var(--success)' : 'var(--success)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          cursor: completingId === order.id ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          whiteSpace: 'nowrap',
                          transition: 'transform 0.15s, opacity 0.15s',
                        }}
                      >
                        {completingId === order.id ? (
                          'Updating...'
                        ) : (
                          <>
                            <span>✓</span>
                            <span>Complete</span>
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
        <section aria-labelledby="history-heading" style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '2px dashed var(--border)' }}>
          <h3 id="history-heading" style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            Completed Orders History ({completedOrders.length})
          </h3>

          {completedOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No completed orders recorded yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {completedOrders.slice(0, 20).map((order) => (
                <div
                  key={order.id}
                  style={{
                    padding: '1rem 1.25rem',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: 0.85,
                  }}
                >
                  <div>
                    <strong>{order.order_tag || order.pickupName || 'Order'}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.75rem' }}>
                      ID: {order.id}
                    </span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Completed at: {order.completedAt ? formatPickupTime(order.completedAt) : 'Recently'} &bull; Total: {formatRupiah(order.total)}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.6rem',
                    background: 'var(--success-soft)',
                    color: 'var(--success)',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}>
                    COMPLETED
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
