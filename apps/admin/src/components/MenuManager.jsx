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
      const items = snapshot.docs.map((doc) => {
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
    setPrice(p >= 1000 ? p / 1000 : p > 0 ? p : '')
    setStock(item.stock ?? 0)
    setImage(item.imageUrl || item.image || '')
    setCategory(normalizeCategory(item.category))
    // Scroll form into view
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const numPrice = Number(price) || 0
      const fullPrice = Math.round(numPrice * 1000)
      const data = {
        name,
        price: fullPrice,
        stock: Number(stock) || 0,
        imageUrl: image,
        category,
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
    if (confirm('Are you sure you want to delete this item from the canteen menu?')) {
      try {
        await deleteDoc(doc(db, 'menu', id))
      } catch (err) {
        alert('Failed to delete item: ' + err.message)
      }
    }
  }

  return (
    <div>
      {/* Page Headline */}
      <section className="page-headline">
        <h1>&gt; MENU &amp; STOCK MANAGEMENT</h1>
        <p>Configure canteen catalog items, prices in thousands (k), and real-time inventory quotas.</p>
      </section>

      {/* Add / Edit Form */}
      <form onSubmit={handleSave}>
        <fieldset className={`brutalist-fieldset ${editingId ? 'fieldset-edit' : ''}`}>
          <legend>{editingId ? '[ // EDIT MENU ITEM ]' : '[ // ADD NEW MENU ITEM ]'}</legend>

          <div className="admin-menu-form">
            <div className="field">
              <label htmlFor="item-name">Item Name</label>
              <input
                id="item-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nasi Goreng Spesial"
              />
            </div>

            <div className="field">
              <label htmlFor="item-category">Category</label>
              <select
                id="item-category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="item-price">Price (in thousands 'k')</label>
              <div className="price-input-group">
                <span className="price-input-addon addon-prefix">Rp</span>
                <input
                  id="item-price"
                  required
                  type="number"
                  step="any"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 12"
                />
                <span className="price-input-addon addon-suffix">k</span>
              </div>
              <small>
                {price !== '' && price !== undefined
                  ? `Typing ${price} assigns Rp ${((Number(price) || 0) * 1000).toLocaleString('id-ID')} (${price}k)`
                  : 'Type 10 to assign Rp 10.000 (10k)'}
              </small>
            </div>

            <div className="field">
              <label htmlFor="item-stock">Stock Quantity</label>
              <input
                id="item-stock"
                required
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
              />
              <small>Units available for pre-order today.</small>
            </div>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="item-image">1:1 Square Image URL</label>
              <input
                id="item-image"
                required
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://images.unsplash.com/photo-... or /img/..."
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary btn-lg" id="btn-save-menu">
                {editingId ? '[ ✓ UPDATE ITEM ]' : '[ + ADD ITEM ]'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn btn-ghost btn-lg" id="btn-cancel-edit">
                  [ CANCEL ]
                </button>
              )}
            </div>
          </div>
        </fieldset>
      </form>

      {/* Menu Categories and Cards */}
      <section aria-labelledby="catalog-list-heading" style={{ marginTop: '14px' }}>
        {CATEGORIES.map((cat) => {
          const catItems = menu.filter((item) => item.category === cat)
          if (catItems.length === 0) return null
          const catClass = `cat-${cat.toLowerCase()}`

          return (
            <div key={cat} style={{ marginBottom: '24px' }}>
              <header className={`menu-category-header ${catClass}`}>
                <h2>// CATEGORY: {cat.toUpperCase()}</h2>
                <span className="bracket-token">[{catItems.length} ITEMS]</span>
              </header>

              <div className="menu-grid">
                {catItems.map((item) => (
                  <article key={item.id} className={`menu-entry ${catClass}`}>
                    <figure className="menu-media-frame">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} loading="lazy" />
                      ) : (
                        <span className="menu-placeholder-glyph" aria-hidden="true">
                          {item.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </figure>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                        <h3 className="menu-entry-title" style={{ margin: 0 }}>
                          {item.name}
                        </h3>
                        <span className="bracket-token" style={{ fontSize: '0.65rem', background: '#ffffff', border: '1.5px solid #000000', padding: '2px 6px' }}>
                          [{item.category}]
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span className="price-tag">{formatRupiah(item.price)}</span>
                        <span className={`stock-tag ${item.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                          [ STOCK: {item.stock} ]
                        </span>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '2px dashed #000000', display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="btn btn-ghost btn-sm"
                          style={{ flex: 1 }}
                          id={`edit-item-${item.id}`}
                        >
                          [ EDIT ]
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="btn btn-danger btn-sm"
                          style={{ flex: 1 }}
                          id={`delete-item-${item.id}`}
                        >
                          [ DELETE ]
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )
        })}

        {menu.length === 0 && (
          <div className="notice notice-warn">
            <strong>[ NOTICE ]:</strong> No menu items currently added in the database. Use the form above to add your first menu item.
          </div>
        )}
      </section>
    </div>
  )
}
