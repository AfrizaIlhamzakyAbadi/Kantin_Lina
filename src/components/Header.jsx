import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../context/cartContext.js'
import useActiveOrder from '../hooks/useActiveOrder.js'

export default function Header() {
  const { totalQty } = useCart()
  const activeOrder = useActiveOrder()

  const navClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" id="brand-link">
          <span className="brand-mark" aria-hidden="true">🍱</span>
          <span className="brand-name">Kantin Lina</span>
        </Link>

        <nav className="nav" aria-label="Main navigation">
          <NavLink to="/menu" className={navClass} id="nav-menu">Menu</NavLink>
          {activeOrder && (
            <NavLink to={`/payment/${activeOrder.orderId}`} className={navClass} id="nav-my-order">
              My order
            </NavLink>
          )}
          <NavLink to="/cart" className={navClass} id="nav-cart">
            Cart
            {totalQty > 0 && <span className="badge" aria-label={`${totalQty} items in cart`}>{totalQty}</span>}
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
