import { Link } from 'react-router-dom'
import useMenu, { MENU_CATEGORIES } from '../hooks/useMenu.js'
import { useCart } from '../context/cartContext.js'
import { formatRupiah } from '../lib/format.js'
import { MAX_QTY_PER_ITEM } from '../lib/constants.js'

function MenuCard({ item }) {
  const { qtyOf, setQty } = useCart()
  const qty = qtyOf(item.id)

  return (
    <article className={item.soldOut ? 'card menu-card sold-out' : 'card menu-card'}>
      <div className="menu-media">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" />
        ) : (
          <span className="menu-initial" aria-hidden="true">{item.name.charAt(0).toUpperCase()}</span>
        )}
        {item.soldOut && <span className="sold-out-tag">Sold out</span>}
      </div>

      <div className="menu-body">
        {item.category && <span className="menu-category">{item.category}</span>}
        <h3>{item.name}</h3>
        {item.description && <p className="menu-desc">{item.description}</p>}

        <div className="menu-footer">
          <span className="price">{formatRupiah(item.price)}</span>

          {item.soldOut ? (
            <span className="muted">Unavailable</span>
          ) : qty === 0 ? (
            <button type="button" className="btn btn-primary btn-sm" id={`add-${item.id}`} onClick={() => setQty(item, 1)}>
              Add
            </button>
          ) : (
            <div className="stepper" role="group" aria-label={`Quantity of ${item.name}`}>
              <button type="button" id={`dec-${item.id}`} aria-label={`Remove one ${item.name}`} onClick={() => setQty(item, qty - 1)}>
                −
              </button>
              <output aria-live="polite">{qty}</output>
              <button
                type="button"
                id={`inc-${item.id}`}
                aria-label={`Add one ${item.name}`}
                disabled={qty >= MAX_QTY_PER_ITEM}
                onClick={() => setQty(item, qty + 1)}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function MenuSkeleton() {
  return (
    <div className="menu-grid" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="card menu-card skeleton">
          <div className="menu-media" />
          <div className="menu-body">
            <div className="sk-line w60" />
            <div className="sk-line w90" />
            <div className="sk-line w40" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Menu() {
  const { items, loading, error } = useMenu()
  const { totalQty, totalPrice } = useCart()

  const groupedItems = MENU_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }))

  return (
    <div className="container page has-cart-bar">
      <header className="page-head">
        <h1>Today&apos;s menu</h1>
        <p className="lead">Add your favourites, then review your cart to choose a pickup time.</p>
      </header>

      {loading && <MenuSkeleton />}

      {!loading && error && <div className="notice notice-error" role="alert">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="empty">
          <span aria-hidden="true">🍽️</span>
          <h2>The menu is empty right now</h2>
          <p>Please check back a little later.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="menu-sections">
          {groupedItems.map(({ category, items: catItems }) => {
            if (catItems.length === 0) return null
            return (
              <section key={category} className="menu-category-section" aria-labelledby={`cat-head-${category}`}>
                <h2 id={`cat-head-${category}`} className="menu-category-heading">{category}</h2>
                <div className="menu-grid">
                  {catItems.map((item) => (
                    <MenuCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {totalQty > 0 && (
        <Link to="/cart" className="cart-bar" id="menu-cart-bar">
          <span className="cart-bar-count">{totalQty} {totalQty === 1 ? 'item' : 'items'}</span>
          <span className="cart-bar-action">View cart · {formatRupiah(totalPrice)}</span>
        </Link>
      )}
    </div>
  )
}
