import { useEffect, useState } from 'react'

// Milliseconds remaining until `expiresAt` (epoch ms). Returns null while there
// is no deadline yet, and stops ticking once it reaches 0.
export default function useCountdown(expiresAt) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return undefined
    const id = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= expiresAt) clearInterval(id)
    }, 250)
    return () => clearInterval(id)
  }, [expiresAt])

  return expiresAt ? Math.max(0, expiresAt - now) : null
}
