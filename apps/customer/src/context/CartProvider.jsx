import { useCallback, useEffect, useMemo, useState } from 'react'
import { CartContext } from './cartContext.js'
import { loadCart, saveCart } from '../lib/storage.js'
import { MAX_QTY_PER_ITEM } from '../lib/constants.js'

// Rebuild a trustworthy cart from whatever is in localStorage.
function restore() {
  const saved = loadCart()
  const items = {}
  if (saved && typeof saved.items === 'object' && saved.items) {
    for (const item of Object.values(saved.items)) {
      const qty = Math.min(MAX_QTY_PER_ITEM, Math.floor(Number(item?.qty)))
      if (item?.id && qty > 0) {
        items[item.id] = {
          id: String(item.id),
          name: String(item.name ?? ''),
          price: Number(item.price) || 0,
          qty,
        }
      }
    }
  }
  return { items, customerName: typeof saved?.customerName === 'string' ? saved.customerName : '' }
}

// The cart only stores a display snapshot (name/price). The server re-reads real
// prices and stock from Firestore at checkout and never trusts these values.
export default function CartProvider({ children }) {
  const [state, setState] = useState(restore)

  useEffect(() => {
    saveCart(state)
  }, [state])

  const setQty = useCallback((menuItem, qty) => {
    setState((prev) => {
      const items = { ...prev.items }
      const next = Math.max(0, Math.min(MAX_QTY_PER_ITEM, qty))
      if (next === 0) {
        delete items[menuItem.id]
      } else {
        items[menuItem.id] = {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          qty: next,
        }
      }
      return { ...prev, items }
    })
  }, [])

  const setCustomerName = useCallback((customerName) => {
    setState((prev) => ({ ...prev, customerName }))
  }, [])

  const clearCart = useCallback(() => {
    setState((prev) => ({ ...prev, items: {} }))
  }, [])

  const value = useMemo(() => {
    const lines = Object.values(state.items)
    return {
      lines,
      customerName: state.customerName,
      totalQty: lines.reduce((sum, l) => sum + l.qty, 0),
      totalPrice: lines.reduce((sum, l) => sum + l.qty * l.price, 0),
      qtyOf: (id) => state.items[id]?.qty ?? 0,
      setQty,
      setCustomerName,
      clearCart,
    }
  }, [state, setQty, setCustomerName, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
