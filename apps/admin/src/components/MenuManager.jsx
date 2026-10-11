import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { formatRupiah } from '../lib/format.js'

export const CATEGORIES = ['Food', 'Drink', 'Other']

export function normalizeCategory(category) {
  if (!category) return 'Other'
  const trimmed = String(category).trim()
  if (CATEGORIES.includes(trimmed)) return trimmed
  const lower = trimmed.toLowerCase()
  if (lower.includes('food') || lower.includes('makan')) return 'Food'
  if (lower.includes('drink') || lower.includes('minum') || lower.includes('beverag')) return 'Drink'
  return 'Other'
}

export default function MenuManager() {
  const [menu, setMenu] = useState([])
  const [editingId, setEditingId] = useState(null)
  
  // Form state
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState(0)
  const [image, setImage] = useState('')
  const [category, setCategory] = useState('Food')

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          category: normalizeCategory(data.category),
          price: Number(data.price) || 0,
          stock: Number(data.stock) || 0,
        }
      })
      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setMenu(items)
    })
    return () => unsubscribe()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setPrice('')
    setStock(0)
    setImage('')
    setCategory('Food')
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setName(item.name || '')
    const p = Number(item.price) || 0
    // If >= 1000, denumerate by 10^3 so 10000 becomes 10
    setPrice(p >= 1000 ? p / 1000 : (p > 0 ? p : ''))
    setStock(item.stock ?? 0)
    setImage(item.imageUrl || item.image || '')
    setCategory(normalizeCategory(item.category))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const numPrice = Number(price) || 0
      // Owner types '10' to assign value of Rp 10000
      const fullPrice = Math.round(numPrice * 1000)
      const data = { 
        name, 
        price: fullPrice, 
        stock: Number(stock) || 0, 
        imageUrl: image, 
        category 
      }
      if (editingId) {
        await updateDoc(doc(db, 'menu', editingId), data)
      } else {
        const newId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
        await setDoc(doc(db, 'menu', newId), data)
      }
      resetForm()
    } catch (err) {
      alert('Failed to save item: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'menu', id))
      } catch (err) {
        alert('Failed to delete item: ' + err.message)
      }
    }
  }

  return (
    <div>
      <h2>Menu & Stock Management</h2>
      
      <form onSubmit={handleSave} className="admin-menu-form" style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem', display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <h3>{editingId ? 'Edit Item' : 'Add New Item'}</h3>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Name</label>
          <input required value={name} onChange={e=>setName(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Category</label>
          <select 
            required 
            value={category} 
            onChange={e=>setCategory(e.target.value)} 
            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Price (k)</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ padding: '0.5rem', background: 'var(--bg-accent)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: '4px 0 0 4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Rp</span>
            <input 
              required 
              type="number" 
              step="any" 
              min="0" 
              value={price} 
              onChange={e=>setPrice(e.target.value)} 
              placeholder="e.g. 10 for Rp 10.000" 
              style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRight: 'none', background: 'var(--surface)', color: 'var(--text)' }} 
            />
            <span style={{ padding: '0.5rem', background: 'var(--bg-accent)', border: '1px solid var(--border)', borderRadius: '0 4px 4px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>k</span>
          </div>
          <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
            {price !== '' && price !== undefined
              ? `Typing ${price} assigns Rp ${((Number(price) || 0) * 1000).toLocaleString('id-ID')} (${price}k)`
              : 'Type 10 to assign Rp 10.000 (10k)'}
          </small>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Stock Quantity</label>
          <input required type="number" min="0" value={stock} onChange={e=>setStock(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Image URL</label>
          <input required value={image} onChange={e=>setImage(e.target.value)} placeholder="https://example.com/image.jpg" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="submit" style={{ padding: '0.75rem 1.5rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 'bold' }}>
            {editingId ? 'Update Item' : 'Add Item'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {CATEGORIES.map(cat => {
        const catItems = menu.filter(item => item.category === cat)
        if (catItems.length === 0) return null
        return (
          <div key={cat} style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.3rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text)' }}>
              {cat}
            </h3>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {catItems.map(item => (
                <div key={item.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <img src={item.imageUrl || item.image} alt={item.name} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                  <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0 }}>{item.name}</h4>
                      <span style={{ fontSize: '0.85rem', background: 'var(--bg-accent)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{item.category}</span>
                    </div>
                    <p style={{ margin: '0.5rem 0', color: 'var(--primary)', fontWeight: 'bold' }}>{formatRupiah(item.price)}</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: item.stock > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      Stock: {item.stock}
                    </p>
                    <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleEdit(item)} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-accent)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDelete(item.id)} style={{ flex: 1, padding: '0.5rem', background: 'var(--danger-soft)', color: 'var(--danger)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {menu.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No menu items added yet.</p>}
    </div>
  )
}
