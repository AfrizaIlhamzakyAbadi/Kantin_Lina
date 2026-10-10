import { useState, useEffect } from 'react'
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase/config.js'

export default function MenuManager() {
  const [menu, setMenu] = useState([])
  const [editingId, setEditingId] = useState(null)
  
  // Form state
  const [name, setName] = useState('')
  const [price, setPrice] = useState(0)
  const [stock, setStock] = useState(0)
  const [image, setImage] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setMenu(items)
    })
    return () => unsubscribe()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setPrice(0)
    setStock(0)
    setImage('')
    setCategory('')
  }

  const handleEdit = (item) => {
    setEditingId(item.id)
    setName(item.name)
    setPrice(item.price)
    setStock(item.stock)
    setImage(item.image)
    setCategory(item.category || '')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const data = { name, price: Number(price), stock: Number(stock), image, category }
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
      
      <form onSubmit={handleSave} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem', display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <h3>{editingId ? 'Edit Item' : 'Add New Item'}</h3>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem' }}>Name</label>
          <input required value={name} onChange={e=>setName(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem' }}>Category</label>
          <input required value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. Food, Drink" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem' }}>Price (Rp)</label>
          <input required type="number" value={price} onChange={e=>setPrice(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem' }}>Stock Quantity</label>
          <input required type="number" value={stock} onChange={e=>setStock(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '0.9rem' }}>Image URL</label>
          <input required value={image} onChange={e=>setImage(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
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

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {menu.map(item => (
          <div key={item.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <img src={item.image} alt={item.name} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
            <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: 0 }}>{item.name}</h4>
                <span style={{ fontSize: '0.85rem', background: 'var(--bg-accent)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{item.category}</span>
              </div>
              <p style={{ margin: '0.5rem 0', color: 'var(--primary)', fontWeight: 'bold' }}>Rp {item.price.toLocaleString('id-ID')}</p>
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
}
