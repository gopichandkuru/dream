import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../../context/CartContext'
import { useFavorites } from '../../context/FavoritesContext'
import { productData, formatPrice } from '../../data/productData'
import toast from 'react-hot-toast'
import './popup.css'

const ProductPreviewPopup = ({ product, onClose }) => {
  const { addToCart, isInCart } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [zoomed, setZoomed] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Reset state when product changes
  useEffect(() => { setActiveImg(0); setQty(1) }, [product?.id])

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])
  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (!product) return null

  const images = product.images?.length ? product.images : [product.image]
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const related = productData
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  const handleAddToCart = () => {
    addToCart({ ...product, quantity: qty })
    toast.success(`${product.name} added to cart!`, { icon: '🛍', duration: 2500 })
  }
  const handleBuyNow = () => {
    addToCart({ ...product, quantity: qty })
    window.location.href = '/checkout'
  }
  const handleFav = () => {
    const was = isFavorite(product.id)
    toggleFavorite(product)
    toast(was ? 'Removed from favorites' : `${product.name} saved!`, { icon: was ? '💔' : '❤️', duration: 2000 })
  }

  const stars = (r) => {
    const full = Math.floor(r)
    const half = r % 1 >= 0.5
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0))
  }

  // Slide from right on desktop, slide from bottom on mobile
  const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
  const panelVariants = isMobile
    ? { hidden: { y: '100%', opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 30, stiffness: 300 } }, exit: { y: '100%', opacity: 0, transition: { duration: 0.25 } } }
    : { hidden: { x: '100%', opacity: 0 }, visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 260 } }, exit: { x: '100%', opacity: 0, transition: { duration: 0.25 } } }

  return (
    <AnimatePresence>
      <motion.div
        className="popup-overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div
          className={`popup-panel ${isMobile ? 'popup-panel-bottom' : 'popup-panel-right'}`}
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={e => e.stopPropagation()}
        >
          {/* Close + Wishlist */}
          <div className="popup-topbar">
            <button className="popup-close" onClick={onClose} aria-label="Close">✕</button>
            <button
              className={`popup-fav-btn ${isFavorite(product.id) ? 'active' : ''}`}
              onClick={handleFav}
              aria-label="Wishlist"
            >
              {isFavorite(product.id) ? '❤️' : '🤍'}
            </button>
          </div>

          <div className="popup-body">
            {/* Image Gallery */}
            <div className="popup-gallery">
              <div
                className={`popup-main-img-wrap ${zoomed ? 'zoomed' : ''}`}
                onClick={() => setZoomed(z => !z)}
              >
                <motion.img
                  key={activeImg}
                  src={images[activeImg]}
                  alt={product.name}
                  className="popup-main-img"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80' }}
                />
                <span className="zoom-hint">🔍</span>
                {product.badge && (
                  <span className={`popup-badge badge ${product.badge === 'New' ? 'badge-success' : product.badge === 'Premium' || product.badge === 'Luxury' ? 'badge-dark' : 'badge-accent'}`}>
                    {product.badge}
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className="popup-thumbs">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      className={`popup-thumb ${i === activeImg ? 'active' : ''}`}
                      onClick={() => setActiveImg(i)}
                    >
                      <img src={img} alt={`View ${i + 1}`} onError={e => { e.target.src = product.image }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="popup-details">
              <p className="popup-category">{product.category} · {product.subtype}</p>
              <h2 className="popup-name">{product.name}</h2>

              {/* Rating */}
              <div className="popup-rating">
                <span className="popup-stars">{stars(product.rating)}</span>
                <span className="popup-rating-val">{product.rating}</span>
                <span className="popup-reviews">({product.reviews} reviews)</span>
              </div>

              {/* Price */}
              <div className="popup-price-row">
                <span className="popup-price">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <>
                    <span className="popup-original-price">{formatPrice(product.originalPrice)}</span>
                    <span className="popup-discount">{discount}% OFF</span>
                  </>
                )}
              </div>

              {/* Highlights */}
              <ul className="popup-highlights">
                <li>✓ Premium quality materials</li>
                <li>✓ Scratch resistant &amp; easy to clean</li>
                <li>✓ Modern luxury design</li>
                <li>✓ 1-year manufacturer warranty</li>
              </ul>

              {/* Stock & Delivery */}
              <div className="popup-meta">
                <div className={`popup-stock ${product.inStock !== false ? 'in-stock' : 'out-stock'}`}>
                  {product.inStock !== false ? '● In Stock' : '● Out of Stock'}
                </div>
                <div className="popup-delivery">
                  🚚 <strong>Delivery: 1–2 Days</strong>
                </div>
                <div className="popup-free-delivery">
                  🎁 Free Delivery on orders above ₹1,000
                </div>
              </div>

              {/* Quantity */}
              <div className="popup-qty-row">
                <span className="popup-qty-label">Quantity</span>
                <div className="popup-qty-ctrl">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
                  <span>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)}>+</button>
                </div>
              </div>

              {/* Actions */}
              <div className="popup-actions">
                <button
                  className={`btn btn-lg popup-cart-btn ${isInCart(product.id) ? 'added' : ''}`}
                  onClick={handleAddToCart}
                  disabled={product.inStock === false}
                >
                  {isInCart(product.id) ? '✓ Added to Cart' : 'Add to Cart'}
                </button>
                <button
                  className="btn btn-accent btn-lg popup-buy-btn"
                  onClick={handleBuyNow}
                  disabled={product.inStock === false}
                >
                  Buy Now
                </button>
              </div>

              {/* Description */}
              <div className="popup-desc-section">
                <h4 className="popup-desc-title">About this product</h4>
                <p className="popup-desc">{product.description}</p>
              </div>

              {/* Related Products */}
              {related.length > 0 && (
                <div className="popup-related">
                  <h4 className="popup-related-title">You may also like</h4>
                  <div className="popup-related-grid">
                    {related.map(p => (
                      <button key={p.id} className="popup-related-card" onClick={() => { /* parent handles */ }}>
                        <img src={p.image} alt={p.name} onError={e => { e.target.src = product.image }} />
                        <span className="prc-name">{p.name}</span>
                        <span className="prc-price">{formatPrice(p.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ProductPreviewPopup
