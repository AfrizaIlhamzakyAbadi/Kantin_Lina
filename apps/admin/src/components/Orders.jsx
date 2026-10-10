import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config.js'

export default function Orders() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      const statusPriority = {
        'Paid': 1,
        'Pending': 2,
        'Completed': 3,
        'Finished': 3, // Fallback just in case
        'Expired': 4
      }

      data.sort((a, b) => {
        const priorityA = statusPriority[a.status] || 99
        const priorityB = statusPriority[b.status] || 99
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }
        
        const getTime = (val) => {
          if (!val) return 0
          if (typeof val.toMillis === 'function') return val.toMillis()
          if (typeof val.toDate === 'function') return val.toDate().getTime()
          return new Date(val).getTime() || 0
        }
        
        return getTime(a.createdAt) - getTime(b.createdAt)
      })

      setOrders(data)
    })
    return () => unsubscribe()
  }, [])

  const markCompleted = async (id) => {
    try {
      await updateDoc(doc(db, 'orders', id), {
        status: 'Completed',
        completedAt: new Date().toISOString()
      })
    } catch (err) {
      alert('Failed to update order: ' + err.message)
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'var(--warn)'
      case 'Paid': return 'var(--success)'
      case 'Completed': return 'var(--text-muted)'
      case 'Expired': return 'var(--danger)'
      default: return 'var(--text)'
    }
  }

  const formatTime = (val) => {
    if (!val) return ''
    const d = typeof val.toDate === 'function' ? val.toDate() : new Date(val)
    return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <h2>Real-Time Orders</h2>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {orders.map(order => (
          <div key={order.id} className="admin-order-card" style={{ padding: '1.5rem', background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{order.pickupName}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>ID: {order.id}</p>
              
              {(order.status === 'Paid' || order.status === 'Completed') && order.pickupAt && (
                <p style={{ color: 'var(--primary-strong)', fontSize: '0.95rem', marginTop: '0.25rem', fontWeight: 'bold' }}>
                  Pickup at: {formatTime(order.pickupAt)}
                </p>
              )}

              <div style={{ marginTop: '0.5rem' }}>
                {Array.isArray(order.items) 
                  ? order.items.map((item, idx) => (
                      <span key={idx} style={{ display: 'inline-block', marginRight: '1rem', background: 'var(--bg-accent)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                        {item.name || item.id} x{item.qty}
                      </span>
                    ))
                  : Object.entries(order.items || {}).map(([id, qty]) => (
                      <span key={id} style={{ display: 'inline-block', marginRight: '1rem', background: 'var(--bg-accent)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                        {id} x{qty}
                      </span>
                    ))
                }
              </div>
              <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>Rp {order.total?.toLocaleString('id-ID')}</p>
              {order.paidAt && !order.completedAt && (
                <p style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Paid on: {formatTime(order.paidAt)}
                </p>
              )}
              {order.completedAt && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Finished on: {formatTime(order.completedAt)}
                </p>
              )}
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: getStatusColor(order.status), fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem' }}>
                {order.status}
              </div>
              {order.status === 'Paid' && (
                <button 
                  onClick={() => markCompleted(order.id)}
                  style={{ padding: '0.5rem 1rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 'bold' }}>
                  Mark Completed
                </button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p>No orders yet.</p>}
      </div>
    </div>
  )
}
