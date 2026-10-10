import { useSyncExternalStore } from 'react'
import { getActiveOrder, subscribeActiveOrder } from '../lib/storage.js'

// The order this browser is currently tracking (from localStorage), or null.
export default function useActiveOrder() {
  return useSyncExternalStore(subscribeActiveOrder, getActiveOrder)
}
