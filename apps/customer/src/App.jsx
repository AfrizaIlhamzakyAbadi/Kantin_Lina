import { Routes, Route } from 'react-router-dom'
import './App.css'
import Header from './components/Header.jsx'
import Home from './pages/Home.jsx'
import Menu from './pages/Menu.jsx'
import Cart from './pages/Cart.jsx'
import Payment from './pages/Payment.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <div className="site-wrapper">
      <Header />
      <main className="site-content" role="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/payment/:orderId" element={<Payment />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="blog-footer" role="contentinfo">
        <p><strong>KANTIN LINA // ONLINE ORDER PORTAL</strong></p>
        <p className="footer-meta">
          [SMA NEGERI 7 YOGYAKARTA] &bull; POWERED BY MIDTRANS QRIS &bull; BEST VIEWED AT ANY RESOLUTION
        </p>
        <p className="footer-meta">
          &copy; 2026 KANTIN LINA. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  )
}
