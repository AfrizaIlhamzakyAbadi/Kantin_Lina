import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config.js'

export default function Orders() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
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

  return (
    <div>
      <h2>Real-Time Orders</h2>
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {orders.map(order => (
          <div key={order.id} style={{ padding: '1.5rem', background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{order.pickupName}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>ID: {order.id}</p>
              <div style={{ marginTop: '0.5rem' }}>
                {(order.items || []).map((item, idx) => (
                  <span key={idx} style={{ display: 'inline-block', marginRight: '1rem', background: 'var(--bg-accent)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    {item.name || item.id} x{item.qty}
                  </span>
                ))}
              </div>
              <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>Rp {order.total?.toLocaleString('id-ID')}</p>
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
