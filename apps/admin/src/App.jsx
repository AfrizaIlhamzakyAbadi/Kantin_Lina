import { useState, useEffect } from 'react'
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import app from './firebase/config.js'
import Dashboard from './Dashboard'
import './App.css'

const auth = getAuth(app)

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = () => {
    signOut(auth)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading Admin...</div>

  if (!user) {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', background: 'var(--surface)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <h2>Admin Login</h2>
        {error && <div style={{ color: 'var(--danger)', margin: '1rem 0' }}>{error}</div>}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)' }} />
          </div>
          <button type="submit" style={{ padding: '1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer', marginTop: '1rem' }}>
            Login
          </button>
        </form>
      </div>
    )
  }

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Kantin Lina Admin</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{user.email}</span>
          <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: 'var(--bg-accent)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <Dashboard />
      </main>
    </div>
  )
}
