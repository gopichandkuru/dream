import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '../Header'
import Footer from '../Footer'
import { useCart } from '../../context/CartContext'
import { useFavorites } from '../../context/FavoritesContext'
import toast from 'react-hot-toast'
import './index.css'

const Cart = () => {
  const {
    cartItems, removeFromCart, increaseQuantity, decreaseQuantity,
    clearCart, cartTotal, cartCount,
  } = useCart()
  const { addToFavorites } = useFavorites()

  // ─── Delivery Pricing: FREE above ₹1000, else ₹499 ─────────────────────
  const FREE_DELIVERY_THRESHOLD = 1000
  const deliveryFee = cartTotal >= FREE_DELIVERY_THRESHOLD ? 0 : (cartTotal > 0 ? 499 : 0)
  const tax = Math.round(cartTotal * 0.18)
  const grandTotal = cartTotal + deliveryFee + tax
  const amountForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - cartTotal)
  const progressPct = Math.min((cartTotal / FREE_DELIVERY_THRESHOLD) * 100, 100)

  const handleRemove = (item) => {
    removeFromCart(item.id)
    toast(`${item.name} removed`, { icon: '🗑', duration: 2000 })
  }
  const handleClearCart = () => {
    if (!cartItems.length) return
    clearCart()
    toast.success('Cart cleared!', { duration: 2000 })
  }
  const handleSaveForLater = (item) => {
    addToFavorites(item)
    removeFromCart(item.id)
    toast.success(`${item.name} saved to favorites!`, { icon: '❤️', duration: 2500 })
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <Header />
        <main className="page-wrapper">
          <div className="container">
            <motion.div
              className="empty-state"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="empty-state-icon">🛍</div>
              <h3 className="empty-state-title">Your cart is empty</h3>
              <p className="empty-state-text">Add some beautiful pieces to your cart and they will appear here.</p>
              <Link to="/shop" className="btn btn-accent btn-lg shimmer-btn">Continue Shopping</Link>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="cart-page">
      <Header />
      <main className="page-wrapper">
        <div className="container">
          {/* Header */}
          <motion.div
            className="cart-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div>
              <h1 className="section-title">Your Cart</h1>
              <p className="text-secondary" style={{ marginTop: 4 }}>
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm clear-cart-btn" onClick={handleClearCart}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
              Clear Cart
            </button>
          </motion.div>

          <div className="cart-layout">
            {/* Items */}
            <div className="cart-items-section">
              <AnimatePresence>
                {cartItems.map(item => (
                  <motion.div
                    key={item.id}
                    className="cart-item card"
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="cart-item-img-wrap">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="cart-item-img"
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=200&q=70' }}
                      />
                    </div>

                    <div className="cart-item-details">
                      <div className="cart-item-top">
                        <div>
                          <p className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.category}</p>
                          <h3 className="cart-item-name">{item.name}</h3>
                        </div>
                        <button className="remove-btn" onClick={() => handleRemove(item)} aria-label="Remove item">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>

                      <div className="cart-item-bottom">
                        <div className="qty-control">
                          <button className="qty-btn" onClick={() => decreaseQuantity(item.id)} aria-label="Decrease">−</button>
                          <span className="qty-value">{item.quantity}</span>
                          <button className="qty-btn" onClick={() => increaseQuantity(item.id)} aria-label="Increase">+</button>
                        </div>
                        <div className="cart-item-price">
                          <span className="item-unit-price text-muted">₹{item.price?.toLocaleString('en-IN')} × {item.quantity}</span>
                          <span className="item-total-price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <button className="save-later-btn" onClick={() => handleSaveForLater(item)}>
                        ❤ Save for Later
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary */}
            <motion.div
              className="cart-summary-section"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="cart-summary card">
                <h2 className="summary-title">Order Summary</h2>

                <div className="summary-lines">
                  <div className="summary-line">
                    <span>Subtotal ({cartCount} items)</span>
                    <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="summary-line">
                    <span>Delivery</span>
                    <span className={deliveryFee === 0 ? 'cart-delivery-free' : ''}>
                      {deliveryFee === 0 ? '🎁 FREE' : `₹${deliveryFee.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div className="summary-line">
                    <span>GST (18%)</span>
                    <span>₹{tax.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Delivery Progress */}
                  {amountForFree > 0 ? (
                    <div className="cart-delivery-progress">
                      <p className="cdp-msg">
                        🚚 Add <strong>₹{amountForFree.toLocaleString('en-IN')}</strong> more for <strong>FREE delivery</strong>
                      </p>
                      <div className="cdp-bar-track">
                        <div className="cdp-bar-fill" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="delivery-note free">🎉 You qualify for free delivery!</div>
                  )}
                </div>

                <div className="divider" />

                <div className="summary-line summary-total">
                  <span>Total</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>

                <Link to="/checkout" className="btn btn-accent btn-lg checkout-btn shimmer-btn">
                  Proceed to Checkout
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link to="/shop" className="btn btn-ghost continue-btn">← Continue Shopping</Link>

                <div className="trust-badges">
                  <div className="trust-badge">🔒 Secure Payment</div>
                  <div className="trust-badge">🔄 Easy Returns</div>
                  <div className="trust-badge">🚚 Fast Delivery</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Cart
