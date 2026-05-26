import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import toast from 'react-hot-toast'
import './ProductDetails.css'

const ProductDetails = () => {
  const { id } = useParams()
  const { addToCart, isInCart } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState('')
  const [similarProducts, setSimilarProducts] = useState([])

  // Zoom Effect State
  const [zoomStyle, setZoomStyle] = useState({ display: 'none' })
  const imageRef = useRef(null)

  // Reviews State
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [avgRating, setAvgRating] = useState(0.0)
  const [ratingDistribution, setRatingDistribution] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 })
  
  // Submit Review Form State
  const [ratingInput, setRatingInput] = useState(5)
  const [reviewMessage, setReviewMessage] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Fetch product data
  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true)
      try {
        const API_BASE = import.meta.env.VITE_API_URL || ''
        
        // 1. Get product details
        const productRes = await fetch(`${API_BASE}/api/products/${id}`)
        const productData = await productRes.json()
        if (productData.success && productData.product) {
          const prod = productData.product
          setProduct(prod)
          setActiveImage(prod.image)

          // 2. Get similar products
          const simRes = await fetch(`${API_BASE}/api/products?category=${prod.category}`)
          const simData = await simRes.json()
          if (simData.success) {
            setSimilarProducts(simData.products.filter(p => p.id !== prod.id).slice(0, 4))
          }
        } else {
          toast.error('Product not found.')
        }
      } catch (err) {
        toast.error('Error fetching product details.')
      } finally {
        setLoading(false)
      }
    }

    fetchProductDetails()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  // Fetch product reviews
  useEffect(() => {
    const fetchReviews = async () => {
      setReviewsLoading(true)
      try {
        const API_BASE = import.meta.env.VITE_API_URL || ''
        const res = await fetch(`${API_BASE}/api/reviews?productId=${id}`)
        const data = await res.json()
        if (data.success) {
          setReviews(data.reviews || [])
          setAvgRating(data.avgRating || 0.0)
          setRatingDistribution(data.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 })
        }
      } catch (err) {
        console.error('Failed to load reviews:', err)
      } finally {
        setReviewsLoading(false)
      }
    }

    if (product) {
      fetchReviews()
    }
  }, [id, product])

  // Image Zoom Handlers
  const handleMouseMove = (e) => {
    const { left, top, width, height } = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - left) / width) * 100
    const y = ((e.clientY - top) / height) * 100
    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${activeImage})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: '200%'
    })
  }

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' })
  }

  // Handle Review Submission
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!customerName || customerName.trim().length < 2) {
      toast.error('Please enter your name (at least 2 chars).')
      return
    }
    if (reviewMessage.trim().length < 10) {
      toast.error('Review message must be at least 10 characters.')
      return
    }

    setSubmittingReview(true)
    try {
      const API_BASE = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          customerName: customerName.trim(),
          rating: ratingInput,
          reviewMessage: reviewMessage.trim(),
          productNames: [product.name]
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Review submitted successfully!')
        setReviews(prev => [data.review, ...prev])
        setReviewMessage('')
        setCustomerName('')
        
        // Refresh stats
        const statsRes = await fetch(`${API_BASE}/api/reviews?productId=${id}`)
        const statsData = await statsRes.json()
        if (statsData.success) {
          setAvgRating(statsData.avgRating)
          setRatingDistribution(statsData.distribution)
        }
      } else {
        toast.error(data.error || 'Failed to submit review.')
      }
    } catch (err) {
      toast.error('Failed to submit review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="product-details-page">
        <Header />
        <main className="page-wrapper container" style={{ padding: '120px 20px 60px' }}>
          <div className="pd-grid-skeleton">
            <div className="skeleton pd-image-skeleton" />
            <div className="skeleton pd-info-skeleton" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="product-details-page">
        <Header />
        <main className="page-wrapper container" style={{ padding: '120px 20px 60px', textAlign: 'center' }}>
          <h2>Product Not Found</h2>
          <p>The product you are looking for does not exist or has been removed.</p>
          <Link to="/shop" className="btn btn-accent btn-lg" style={{ marginTop: 20 }}>Go to Shop</Link>
        </main>
        <Footer />
      </div>
    )
  }

  const alreadyInCart = isInCart(product.id)
  const isFav = isFavorite(product.id)

  return (
    <div className="product-details-page">
      <Header />
      <main className="page-wrapper container">
        <div className="pd-layout">
          {/* Back button */}
          <div className="pd-breadcrumb">
            <Link to="/shop">← Back to Shop</Link> &nbsp;/&nbsp; <span>{product.category}</span>
          </div>

          {/* Core Grid */}
          <div className="pd-grid">
            {/* Images Column */}
            <div className="pd-images-col">
              <div className="pd-thumbnails">
                {[product.image, ...(product.images || [])].map((img, idx) => (
                  <button 
                    key={idx} 
                    className={`thumb-btn ${activeImage === img ? 'active' : ''}`}
                    onClick={() => setActiveImage(img)}
                  >
                    <img src={img} alt="thumbnail" />
                  </button>
                ))}
              </div>

              <div 
                className="main-image-viewport"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                ref={imageRef}
              >
                <img src={activeImage} alt={product.name} className="pd-main-img" />
                <div className="zoom-overlay" style={zoomStyle} />
              </div>
            </div>

            {/* Product Details Info Column */}
            <motion.div 
              className="pd-info-col"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {product.badge && <span className="pd-badge">{product.badge}</span>}
              <h1 className="pd-name">{product.name}</h1>
              
              <div className="pd-rating-row">
                <span className="stars">{'★'.repeat(Math.round(avgRating || product.rating)) + '☆'.repeat(5 - Math.round(avgRating || product.rating))}</span>
                <span className="rating-value">{avgRating || product.rating} / 5</span>
                <span className="reviews-count">({reviews.length || product.reviews} reviews)</span>
              </div>

              <div className="pd-price-row">
                <span className="price">₹{product.price.toLocaleString('en-IN')}</span>
                {product.originalPrice > product.price && (
                  <>
                    <span className="original-price">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                    <span className="discount">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>

              <p className="pd-desc">{product.description}</p>

              <div className="pd-actions">
                <button 
                  className={`btn ${alreadyInCart ? 'btn-outline' : 'btn-accent'} btn-lg cart-action-btn shimmer-btn`}
                  onClick={() => {
                    if (!alreadyInCart) {
                      addToCart(product)
                      toast.success(`${product.name} added to cart!`)
                    }
                  }}
                  disabled={!product.inStock}
                >
                  {product.inStock ? (alreadyInCart ? '🛒 Already in Cart' : '🛍 Add to Cart') : 'Out of Stock'}
                </button>
                <button 
                  className={`btn btn-outline fav-action-btn ${isFav ? 'active' : ''}`}
                  onClick={() => toggleFavorite(product)}
                >
                  {isFav ? '❤️ Added to Wishlist' : '♡ Add to Wishlist'}
                </button>
              </div>

              <div className="pd-features-list">
                <div className="feature-item">
                  <span className="feature-icon">🚚</span>
                  <div className="feature-details">
                    <h4>Free shipping</h4>
                    <p>On orders above ₹1,000. Delivered in 2-3 days.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🛡</span>
                  <div className="feature-details">
                    <h4>1 Year Warranty</h4>
                    <p>Genuine solid wood quality craftsmanship guarantee.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="divider" style={{ margin: '60px 0' }} />

          {/* Reviews section */}
          <div className="pd-reviews-section">
            <h2 className="section-title">Customer Reviews</h2>

            <div className="pd-reviews-layout">
              {/* Stats Overview */}
              <div className="pd-reviews-overview card glass">
                <div className="pd-avg-rating-box">
                  <span className="big-rating">{avgRating}</span>
                  <span className="stars">{'★'.repeat(Math.round(avgRating)) + '☆'.repeat(5 - Math.round(avgRating))}</span>
                  <span className="total-ratings">{reviews.length} Customer Ratings</span>
                </div>

                <div className="rating-bars">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingDistribution[star] || 0
                    const total = reviews.length || 1
                    const pct = Math.round((count / total) * 100)
                    return (
                      <div key={star} className="rating-bar-row">
                        <span className="star-num">{star} ★</span>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="bar-pct">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Reviews List and Submit Form */}
              <div className="reviews-feed-container">
                {/* Submit review */}
                <div className="submit-review-card card glass">
                  <h3>Write a Review</h3>
                  <form onSubmit={handleSubmitReview} className="submit-review-form">
                    <div className="form-group-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Your Name</label>
                        <input 
                          type="text" 
                          placeholder="John Doe" 
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Rating</label>
                        <select 
                          value={ratingInput} 
                          onChange={e => setRatingInput(Number(e.target.value))}
                        >
                          <option value="5">5 Stars (Excellent)</option>
                          <option value="4">4 Stars (Good)</option>
                          <option value="3">3 Stars (Average)</option>
                          <option value="2">2 Stars (Poor)</option>
                          <option value="1">1 Star (Terrible)</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Review Description</label>
                      <textarea 
                        placeholder="What did you like or dislike about this product? Minimum 10 characters." 
                        rows={3}
                        value={reviewMessage}
                        onChange={e => setReviewMessage(e.target.value)}
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-accent shimmer-btn" 
                      disabled={submittingReview}
                    >
                      {submittingReview ? 'Submitting...' : 'Post Review'}
                    </button>
                  </form>
                </div>

                {/* Feed */}
                {reviewsLoading ? (
                  <div className="skeleton review-skeleton" />
                ) : reviews.length === 0 ? (
                  <div className="no-reviews card glass">
                    <p>There are no reviews for this product yet. Be the first to leave one!</p>
                  </div>
                ) : (
                  <div className="reviews-feed">
                    {reviews.map((review) => (
                      <div key={review._id || review.id} className="review-card card">
                        <div className="review-card-header">
                          <div className="review-avatar">
                            {review.initials || 'U'}
                          </div>
                          <div className="review-user-info">
                            <h4>{review.customerName}</h4>
                            <span className="review-stars">{'★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)}</span>
                          </div>
                          <span className="review-date">
                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-IN') : 'Recently'}
                          </span>
                        </div>
                        <p className="review-msg">{review.reviewMessage}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="divider" style={{ margin: '60px 0' }} />

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <div className="similar-products-section">
              <h2 className="section-title">Similar Products</h2>
              <div className="similar-products-grid">
                {similarProducts.map((prod) => (
                  <motion.div 
                    key={prod.id} 
                    className="similar-product-card card glass-card"
                    whileHover={{ y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Link to={`/product/${prod.id}`}>
                      <div className="sp-img-viewport">
                        <img src={prod.image} alt={prod.name} />
                      </div>
                      <div className="sp-details">
                        <h4>{prod.name}</h4>
                        <span className="sp-price">₹{prod.price.toLocaleString('en-IN')}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ProductDetails
