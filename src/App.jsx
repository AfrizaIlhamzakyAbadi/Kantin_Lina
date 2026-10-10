import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Menu from './pages/Menu.jsx'
import Cart from './pages/Cart.jsx'
import Payment from './pages/Payment.jsx'
import NotFound from './pages/NotFound.jsx'

// Routing skeleton only. Real UI components come later.
export default function App() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link> | <Link to="/menu">Menu</Link> |{' '}
        <Link to="/cart">Cart</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/payment/:orderId" element={<Payment />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
