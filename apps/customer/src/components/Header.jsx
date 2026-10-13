import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../context/cartContext.js'
import useActiveOrder from '../hooks/useActiveOrder.js'
import useSchedule from '../hooks/useSchedule.js'
import { isOpenNow } from '../lib/schedule.js'

export default function Header() {
  const { totalQty } = useCart()
  const activeOrder = useActiveOrder()
  const { schedule } = useSchedule()
  const open = isOpenNow(schedule)

  const navClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')

  return (
    <header className="blog-header" role="banner">
      <div className="header-banner">
        <Link to="/" className="brand-title" id="brand-link" aria-label="Kantin Lina Home">
          <span className="brand-pixel-icon" aria-hidden="true">🍱</span>
          <span className="brand-name">Kantin Lina</span>
        </Link>

        <span className={`header-status-badge ${open ? 'open' : 'closed'}`} role="status">
          <span aria-hidden="true">{open ? '●' : '■'}</span>
          <span>{open ? 'STATUS: OPEN' : 'STATUS: CLOSED'}</span>
        </span>
      </div>

      <div className="header-subtitle-bar" aria-label="System bulletin">
        <span>&gt; SMA NEGERI 7 YOGYAKARTA // PRE-ORDER</span>
        <span>VER. 1.0 (QRIS)</span>
      </div>

      <nav className="blog-nav" aria-label="Primary navigation">
        <NavLink to="/" className={navClass} id="nav-home">
          [ 01. HOME ]
        </NavLink>
        <NavLink to="/menu" className={navClass} id="nav-menu">
          [ 02. MENU ]
        </NavLink>
        <NavLink to="/cart" className={navClass} id="nav-cart">
          [ 03. CART ]
          {totalQty > 0 && (
            <span className="nav-badge" aria-label={`${totalQty} items`}>
              {totalQty}
            </span>
          )}
        </NavLink>
        {activeOrder && (
          <NavLink to={`/payment/${activeOrder.orderId}`} className={navClass} id="nav-my-order">
            [ 04. MY ORDER ]
          </NavLink>
        )}
      </nav>
    </header>
  )
}
