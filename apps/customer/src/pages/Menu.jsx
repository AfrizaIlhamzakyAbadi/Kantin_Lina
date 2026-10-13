import { Link } from 'react-router-dom'
import useMenu, { MENU_CATEGORIES } from '../hooks/useMenu.js'
import { useCart } from '../context/cartContext.js'
import { formatRupiah } from '../lib/format.js'
import { MAX_QTY_PER_ITEM } from '../lib/constants.js'

function MenuCard({ item, category }) {
  const { qtyOf, setQty } = useCart()
  const qty = qtyOf(item.id)
  const catClass = `cat-${(category || item.category || 'other').toLowerCase()}`

  return (
    <article className={`menu-entry ${catClass} ${item.soldOut ? 'sold-out' : ''}`}>
      <figure className="menu-media-frame">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" />
        ) : (
          <span className="menu-placeholder-glyph" aria-hidden="true">
            {item.name.charAt(0).toUpperCase()}
          </span>
        )}
        {item.soldOut && <span className="sold-out-badge">[ SOLD OUT ]</span>}
      </figure>

      <div className="menu-entry-body">
        <h3 className="menu-entry-title">{item.name}</h3>
        {item.description && <p className="menu-entry-desc">{item.description}</p>}

        <footer className="menu-entry-footer">
          <span className="price-tag">{formatRupiah(item.price)}</span>

          {item.soldOut ? (
            <span className="field small bracket-token" style={{ fontWeight: 'bold' }}>[ UNAVAILABLE ]</span>
          ) : qty === 0 ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              id={`add-${item.id}`}
              onClick={() => setQty(item, 1)}
            >
              + ADD
            </button>
          ) : (
            <div className="stepper-block" role="group" aria-label={`Quantity of ${item.name}`}>
              <button
                type="button"
                id={`dec-${item.id}`}
                aria-label={`Remove one ${item.name}`}
                onClick={() => setQty(item, qty - 1)}
              >
                -
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
        </footer>
      </div>
    </article>
  )
}

function MenuSkeleton() {
  return (
    <div className="menu-grid" aria-hidden="true">
      {[0, 1, 2, 3].map((n) => (
        <article key={n} className="menu-entry" style={{ opacity: 0.5 }}>
          <div className="menu-media-frame" style={{ background: '#d4d0c8' }} />
          <div className="menu-entry-body">
            <p><strong>[ LOADING ITEM... ]</strong></p>
          </div>
        </article>
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
    <section aria-labelledby="menu-main-title">
      <header className="page-headline">
        <h1 id="menu-main-title">&gt; TODAY&apos;S CANTEEN MENU</h1>
        <p>Select items to add to your cart, then proceed to pickup selection.</p>
      </header>

      {/* Cart Active Notification / Popup at the TOP of the Menu page (NOT on bottom) */}
      {totalQty > 0 && (
        <aside className="cart-top-bar" id="menu-cart-bar" aria-label="Active Cart Summary">
          <div className="cart-top-info">
            <span className="cart-top-title">🛒 CART: {totalQty} {totalQty === 1 ? 'ITEM' : 'ITEMS'}</span>
            <span className="cart-top-subtotal">SUBTOTAL: {formatRupiah(totalPrice)}</span>
          </div>
          <Link to="/cart" className="btn btn-cart-review btn-sm" id="menu-view-cart-btn">
            [ VIEW CART &rarr; ]
          </Link>
        </aside>
      )}

      {loading && <MenuSkeleton />}

      {!loading && error && (
        <div className="notice notice-error" role="alert">
          <strong>[ ERROR ]</strong> {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="notice notice-warn" role="status">
          <strong>[ BULLETIN ]</strong> Menu is currently empty. Please check back later!
        </div>
      )}

      {!loading && items.length > 0 && (
        <div>
          {groupedItems.map(({ category, items: catItems }) => {
            if (catItems.length === 0) return null
            return (
              <section key={category} className="menu-category-block" aria-labelledby={`cat-${category}`}>
                <header className={`menu-category-header cat-${category.toLowerCase()}`}>
                  <h2 id={`cat-${category}`}>// {category.toUpperCase()}</h2>
                  <span className="bracket-token">[{catItems.length} ITEMS]</span>
                </header>
                <div className="menu-grid">
                  {catItems.map((item) => (
                    <MenuCard key={item.id} item={item} category={category} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
