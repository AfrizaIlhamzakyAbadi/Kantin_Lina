import { useState, useEffect } from 'react'
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import app from './firebase/config.js'
import Dashboard from './Dashboard'
import useBracketWrapping from './hooks/useBracketWrapping.js'
import './App.css'

const auth = getAuth(app)

export default function App() {
  useBracketWrapping()

  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('preview=true')) {
      return { email: 'admin@kantin-lina.com' }
    }
    return null
  })
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('preview=true')) {
      return false
    }
    return true
  })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('preview=true')) {
      return
    }
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

  if (loading) {
    return (
      <div className="admin-login-window" key="boot-window" style={{ marginTop: '80px' }}>
        <div className="window-title-bar">
          <span>[ ⏳ SYSTEM BOOT ]</span>
          <div className="window-controls">
            <span className="window-btn-box" />
            <span className="window-btn-box" />
          </div>
        </div>
        <div className="login-body" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p><strong>[ LOADING ADMIN CONSOLE... ]</strong></p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="admin-login-window" key="auth-window">
        <div className="window-title-bar">
          <span>[ 🔐 KANTIN LINA // ADMIN AUTHENTICATION ]</span>
          <div className="window-controls">
            <span className="window-btn-box" />
            <span className="window-btn-box" />
          </div>
        </div>

        <div className="login-body">
          <header style={{ marginBottom: '16px' }}>
            <h2>Admin Login</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Authorized canteen operator credentials required.
            </p>
          </header>

          {error && (
            <div className="notice notice-error" role="alert">
              <strong>[ ERROR ]</strong> {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="field">
              <label htmlFor="admin-email">Operator Email</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kantin-lina.com"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div style={{ marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary btn-block btn-lg" id="btn-admin-login">
                &gt;&gt; LOGIN TO DASHBOARD
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="site-wrapper">
      <header className="blog-header" role="banner">
        <div className="header-banner">
          <div className="brand-title">
            <span className="brand-pixel-icon" aria-hidden="true">🍱</span>
            <span className="brand-name">Kantin Lina Admin</span>
          </div>

          <span className="header-status-badge open" role="status">
            <span aria-hidden="true">●</span>
            <span>[ STATUS: ONLINE ]</span>
          </span>
        </div>

        <div className="header-subtitle-bar" aria-label="System status bar">
          <span>&gt; KANTIN LINA // ADMIN CONTROL PANEL - LIVE DISPATCH</span>
          <div className="user-session-info">
            <span>[ OP: {user.email} ]</span>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-ghost btn-sm"
              id="admin-logout-btn"
            >
              [ LOGOUT ]
            </button>
          </div>
        </div>
      </header>

      <main className="site-content" role="main">
        <Dashboard />
      </main>

      <footer className="blog-footer" role="contentinfo">
        <p><strong>KANTIN LINA // ADMIN CONTROL PANEL</strong></p>
        <p className="footer-meta">
          POWERED BY FIRESTORE &amp; CLOUDFLARE PAGES &bull; LIVE KITCHEN &amp; CATALOG DISPATCH
        </p>
        <p className="footer-meta">
          &copy; 2026 KANTIN LINA. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  )
}
