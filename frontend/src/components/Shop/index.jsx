import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Header from '../Header'
import Footer from '../Footer'
import { useCart } from '../../context/CartContext'
import { useFavorites } from '../../context/FavoritesContext'
import { productData, ROOM_CATEGORIES, formatPrice } from '../../data/productData'
import ProductPreviewPopup from '../ProductPreviewPopup'
import LocationPopup from '../LocationPopup'
import toast from 'react-hot-toast'
import './index.css'

const SORT_OPTIONS = [
  { value: 'default',    label: 'Featured' },
  { value: 'price-asc',  label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest',     label: 'Newest' },
  { value: 'popular',    label: 'Most Popular' },
  { value: 'rating',     label: 'Best Rated' },
]

const MAX_PRICE = 130000

const cardVariants = {
  hidden:  { opacity: 0, y: 30 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.055, duration: 0.42, ease: [0.4, 0, 0.2, 1] } }),
}

const Shop = () => {
  const { addToCart, isInCart } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()
  const routeLocation = useLocation()

  // ── Read ?category= from URL ──────────────────────────────────
  const urlCategory = useMemo(() => {
    const params = new URLSearchParams(routeLocation.search)
    const cat = params.get('category')
    return cat && ROOM_CATEGORIES.includes(cat) ? cat : 'All'
  }, [routeLocation.search])

  const [selectedCategory, setSelectedCategory] = useState(urlCategory)
  const [sortBy, setSortBy]           = useState('default')
  const [searchTerm, setSearchTerm]   = useState('')
  const [priceRange, setPriceRange]   = useState([0, MAX_PRICE])
  const [minRating, setMinRating]     = useState(0)
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [loadedImages, setLoadedImages] = useState({})
  const [view, setView]               = useState('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showLocation, setShowLocation]       = useState(false)
  const [deliveryCity, setDeliveryCity]       = useState('')
  const fadeRefs = useRef([])
  const productSectionRef = useRef(null)

  // Sync URL category when navigating from Home
  useEffect(() => { setSelectedCategory(urlCategory) }, [urlCategory])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 }
    )
    fadeRefs.current.forEach(el => { if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])
  const addRef = el => { if (el && !fadeRefs.current.includes(el)) fadeRefs.current.push(el) }

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat)
    setTimeout(() => {
      productSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const filteredProducts = useMemo(() => {
    let list = [...productData]
    if (selectedCategory !== 'All') list = list.filter(p => p.category === selectedCategory)
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(t) || p.category.toLowerCase().includes(t) || p.subtype?.toLowerCase().includes(t))
    }
    list = list.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])
    if (minRating > 0)  list = list.filter(p => p.rating >= minRating)
    if (onlyInStock)    list = list.filter(p => p.inStock !== false)
    switch (sortBy) {
      case 'price-asc':  return list.sort((a, b) => a.price - b.price)
      case 'price-desc': return list.sort((a, b) => b.price - a.price)
      case 'newest':     return list.filter(p => p.isNew).concat(list.filter(p => !p.isNew))
      case 'popular':    return list.sort((a, b) => b.reviews - a.reviews)
      case 'rating':     return list.sort((a, b) => b.rating - a.rating)
      default:           return list
    }
  }, [selectedCategory, sortBy, searchTerm, priceRange, minRating, onlyInStock])

  const handleAddToCart = (item, e) => {
    e.stopPropagation()
    addToCart(item)
    toast.success(`${item.name} added to cart!`, { icon: '🛍', duration: 2500 })
  }
  const handleToggleFavorite = (item, e) => {
    e.stopPropagation()
    const wasFav = isFavorite(item.id)
    toggleFavorite(item)
    toast(wasFav ? 'Removed from favorites' : `${item.name} saved!`, { icon: wasFav ? '💔' : '❤️', duration: 2000 })
  }

  const resetFilters = () => {
    setSearchTerm(''); setSelectedCategory('All'); setSortBy('default')
    setPriceRange([0, MAX_PRICE]); setMinRating(0); setOnlyInStock(false)
  }

  return (
    <div className="shop-page">
      <Header
        showLocation
        deliveryCity={deliveryCity}
        onLocationClick={() => setShowLocation(true)}
      />

      {/* Product Popup */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductPreviewPopup product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        )}
      </AnimatePresence>

      {/* Location Popup */}
      <AnimatePresence>
        {showLocation && (
          <LocationPopup
            onClose={() => setShowLocation(false)}
            onLocationChange={(city) => setDeliveryCity(city)}
          />
        )}
      </AnimatePresence>

      <main className="page-wrapper">
        {/* ── Hero ── */}
        <section className="shop-hero">
          <div className="shop-hero-bg" aria-hidden="true" />
          <div className="container">
            <div className="shop-hero-text fade-up" ref={addRef}>
              <div className="badge badge-accent">Our Collection</div>
              <h1 className="section-title" style={{ marginTop: 12 }}>Shop All Products</h1>
              <p className="section-subtitle">
                {filteredProducts.length} premium piece{filteredProducts.length !== 1 ? 's' : ''} curated for your home
              </p>
            </div>
          </div>
        </section>

        {/* ── Controls Bar ── */}
        <div className="shop-controls">
          <div className="container shop-controls-inner">
            {/* Search */}
            <div className="search-wrapper">
              <svg className="search-icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                id="shop-search" type="text" className="shop-search"
                placeholder="Search products…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && <button className="search-clear" onClick={() => setSearchTerm('')} aria-label="Clear">✕</button>}
            </div>

            <div className="controls-right">
              {/* Sort */}
              <select id="shop-sort" className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>

              {/* Filter toggle */}
              <button className={`filter-toggle-btn ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(f => !f)}>
                ⚙ Filters
              </button>

              {/* Location */}
              <button className="loc-header-btn" onClick={() => setShowLocation(true)} title="Set delivery location">
                📍{deliveryCity ? <span className="loc-city-short"> {deliveryCity}</span> : ''}
              </button>

              {/* View toggle */}
              <div className="view-toggle">
                <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} aria-label="Grid view" title="Grid view">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                </button>
                <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} aria-label="List view" title="List view">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                className="adv-filters container"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1, transition: { duration: 0.3 } }}
                exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
              >
                <div className="adv-filters-inner">
                  {/* Price Range */}
                  <div className="filter-group">
                    <label className="filter-label">Price Range</label>
                    <div className="price-range-vals">
                      <span>{formatPrice(priceRange[0])}</span>
                      <span>{formatPrice(priceRange[1])}</span>
                    </div>
                    <div className="range-inputs">
                      <input type="range" min={0} max={MAX_PRICE} step={1000} value={priceRange[0]}
                        onChange={e => setPriceRange([+e.target.value, priceRange[1]])} className="range-slider" />
                      <input type="range" min={0} max={MAX_PRICE} step={1000} value={priceRange[1]}
                        onChange={e => setPriceRange([priceRange[0], +e.target.value])} className="range-slider" />
                    </div>
                  </div>

                  {/* Min Rating */}
                  <div className="filter-group">
                    <label className="filter-label">Min Rating</label>
                    <div className="rating-btns">
                      {[0, 4, 4.5, 4.7, 4.9].map(r => (
                        <button key={r} className={`rating-btn ${minRating === r ? 'active' : ''}`} onClick={() => setMinRating(r)}>
                          {r === 0 ? 'All' : `${r}+★`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="filter-group">
                    <label className="filter-label">Availability</label>
                    <label className="toggle-label">
                      <input type="checkbox" checked={onlyInStock} onChange={e => setOnlyInStock(e.target.checked)} />
                      <span className="toggle-track"><span className="toggle-thumb" /></span>
                      In Stock Only
                    </label>
                  </div>

                  <button className="btn btn-sm reset-btn" onClick={resetFilters}>Reset All</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category Pills */}
          <div className="container">
            <div className="category-filters" ref={productSectionRef}>
              {ROOM_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  className={`cat-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Product Grid ── */}
        <div className="container shop-main">
          <AnimatePresence mode="wait">
            {filteredProducts.length === 0 ? (
              <motion.div key="empty" className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="empty-state-icon">🔍</div>
                <h3 className="empty-state-title">No products found</h3>
                <p className="empty-state-text">Try adjusting your filters or search term</p>
                <button className="btn btn-accent" onClick={resetFilters}>Clear Filters</button>
              </motion.div>
            ) : (
              <motion.div
                key={`${view}-${selectedCategory}-${sortBy}`}
                className={`shop-grid ${view === 'list' ? 'shop-grid-list' : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
              >
                {filteredProducts.map((item, i) => (
                  <motion.div
                    key={item.id}
                    className={`shop-card card ${view === 'list' ? 'shop-card-list' : ''}`}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    layout
                    onClick={() => setSelectedProduct(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="shop-card-img-wrapper">
                      {!loadedImages[item.id] && <div className="skeleton img-skeleton" />}
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`shop-card-img${loadedImages[item.id] ? ' loaded' : ''}`}
                        onLoad={() => setLoadedImages(prev => ({ ...prev, [item.id]: true }))}
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=70' }}
                        loading="lazy"
                      />
                      {item.badge && (
                        <span className={`product-badge badge ${item.badge === 'New' ? 'badge-success' : item.badge === 'Premium' || item.badge === 'Luxury' ? 'badge-dark' : 'badge-accent'}`}>
                          {item.badge}
                        </span>
                      )}
                      {item.inStock === false && <div className="out-of-stock-overlay">Out of Stock</div>}
                      <button
                        className={`fav-overlay-btn${isFavorite(item.id) ? ' favorited' : ''}`}
                        onClick={(e) => handleToggleFavorite(item, e)}
                        aria-label="Toggle favorite"
                      >
                        {isFavorite(item.id) ? '❤️' : '🤍'}
                      </button>
                    </div>

                    <div className="shop-card-body">
                      <p className="card-category text-muted">{item.category}</p>
                      <h3 className="card-name">{item.name}</h3>
                      <p className="card-desc text-secondary">{item.description}</p>

                      <div className="card-rating">
                        <span className="stars" style={{ color: '#f59e0b', fontSize: 13 }}>
                          {'★'.repeat(Math.floor(item.rating))}{'☆'.repeat(5 - Math.floor(item.rating))}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {item.rating} ({item.reviews})
                        </span>
                      </div>

                      <div className="card-footer-row">
                        <div className="card-price-block">
                          <span className="card-price">₹{item.price.toLocaleString('en-IN')}</span>
                          {item.originalPrice && (
                            <span className="card-original">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                        <button
                          className={`btn btn-sm add-cart-btn${isInCart(item.id) ? ' added' : ''}`}
                          onClick={(e) => handleAddToCart(item, e)}
                          disabled={item.inStock === false}
                        >
                          {isInCart(item.id) ? <><span>✓</span> Added</> : <><span>+</span> Cart</>}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <div style={{ height: 60 }} />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Shop