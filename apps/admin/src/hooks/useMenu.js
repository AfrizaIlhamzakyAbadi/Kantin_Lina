import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config.js'

// Live menu from Firestore `menu`. Expected fields per doc:
//   name, price, stock, [description], [imageUrl], [category], [available]
//
// The exact `stock` number is reduced to a `soldOut` flag right here, so it
// never reaches any component state or the UI.
function toMenuItem(id, data) {
  return {
    id,
    name: String(data.name ?? 'Untitled item'),
    price: Number(data.price) || 0,
    description: data.description ? String(data.description) : '',
    imageUrl: data.imageUrl ? String(data.imageUrl) : '',
    category: data.category ? String(data.category) : '',
    soldOut: !(Number(data.stock) > 0),
    available: data.available !== false,
  }
}

export default function useMenu() {
  const [state, setState] = useState({ items: [], loading: true, error: '' })

  useEffect(() => {
    // Fire-and-forget sweep for stale orders whenever someone loads the menu.
    // This allows returned stock to appear instantly for this user.
    fetch('/api/sweep').catch(console.error)

    return onSnapshot(
      collection(db, 'menu'),
      (snapshot) => {
        const items = snapshot.docs
          .map((d) => toMenuItem(d.id, d.data()))
          .filter((item) => item.available)
          .sort((a, b) => a.name.localeCompare(b.name))
        setState({ items, loading: false, error: '' })
      },
      (err) => {
        console.error('Failed to load menu', err)
        setState({ items: [], loading: false, error: 'We could not load the menu. Please try again.' })
      },
    )
  }, [])

  return state
}
