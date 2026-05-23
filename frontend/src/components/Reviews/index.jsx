import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StarRating } from '../FeedbackModal'
import './index.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const FEEDBACK_ENDPOINT = `${API_BASE}/api/feedback`

// ── Avatar colors ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['#c8a97e', '#fff'], ['#1a1a1a', '#c8a97e'], ['#3b82f6', '#fff'],
  ['#22c55e', '#fff'], ['#f59e0b', '#fff'], ['#8b5cf6', '#fff'],
  ['#ef4444', '#fff'], ['#06b6d4', '#fff'],
]
const getAvatarColor = (str = '') => AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length]

// ── Rating Bar ────────────────────────────────────────────────────────────────
const RatingBar = ({ star, count, total }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="rv-rating-bar">
      <span className="rv-bar-label">{star}★</span>
      <div className="rv-bar-track">
        <motion.div
          className="rv-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
      <span className="rv-bar-count">{count}</span>
    </div>
  )
}

// ── Three-Dots Menu ───────────────────────────────────────────────────────────
const ThreeDotsMenu = ({ reviewId }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) close() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  const actions = [
    { icon: '🚩', label: 'Report', color: '' },
    { icon: '🔗', label: 'Share', color: '' },
    { icon: '✏️', label: 'Edit', color: '' },
    { icon: '🗑️', label: 'Delete', color: 'danger' },
  ]

  return (
    <div className="rv-dots-wrap" ref={ref}>
      <button className="rv-dots-btn" onClick={() => setOpen(o => !o)} aria-label="Options">⋯</button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="rv-dots-menu"
            initial={{ opacity: 0, scale: 0.88, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.18 } }}
            exit={{ opacity: 0, scale: 0.88, y: -6, transition: { duration: 0.14 } }}
          >
            {actions.map(a => (
              <button
                key={a.label}
                className={`rv-dots-item${a.color ? ` rv-dots-${a.color}` : ''}`}
                onClick={() => { close() }}
              >
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Review Card ───────────────────────────────────────────────────────────────
const ReviewCard = ({ review, index }) => {
  const [bg, fg] = getAvatarColor(review.initials || review.customerName)
  const date = new Date(review.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <motion.div
      className="rv-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <ThreeDotsMenu reviewId={review.id} />

      <div className="rv-quote">"</div>

      <div className="rv-card-stars">
        {[1, 2, 3, 4, 5].map(s => (
          <span key={s} className={`rv-mini-star ${review.rating >= s ? 'filled' : ''}`}>★</span>
        ))}
      </div>

      <p className="rv-message">"{review.reviewMessage || review.message}"</p>

      {review.productNames?.length > 0 && (
        <div className="rv-bought-tags">
          {review.productNames.slice(0, 2).map((name, i) => (
            <span key={i} className="rv-bought-tag">🛋 {name}</span>
          ))}
        </div>
      )}

      <div className="rv-author">
        <div className="rv-avatar" style={{ background: bg, color: fg }}>
          {review.initials || review.customerName?.slice(0, 2).toUpperCase()}
        </div>
        <div className="rv-author-info">
          <span className="rv-author-name">{review.customerName}</span>
          <span className="rv-author-date">{date}</span>
        </div>
        <span className="rv-verified">✓ Verified</span>
      </div>
    </motion.div>
  )
}

// ── Testimonial Carousel ──────────────────────────────────────────────────────
const TestimonialCarousel = ({ reviews }) => {
  const [idx, setIdx] = useState(0)
  const [direction, setDirection] = useState(1)
  const timerRef = useRef(null)

  const top = reviews.filter(r => r.rating === 5).slice(0, 8)
  if (top.length === 0) return null

  const go = (dir) => {
    setDirection(dir)
    setIdx(prev => (prev + dir + top.length) % top.length)
  }

  useEffect(() => {
    timerRef.current = setInterval(() => go(1), 5000)
    return () => clearInterval(timerRef.current)
  }, [top.length])

  const current = top[idx]
  const [bg, fg] = getAvatarColor(current.initials || current.customerName)

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  }

  return (
    <div className="rv-carousel">
      <div className="rv-carousel-inner">
        <button className="rv-carousel-btn rv-prev" onClick={() => { clearInterval(timerRef.current); go(-1) }} aria-label="Previous review">‹</button>

        <div className="rv-carousel-content">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={idx}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="rv-featured-review"
            >
              <div className="rv-featured-stars">
                {'★★★★★'.split('').map((s, i) => (
                  <span key={i} style={{ color: '#f59e0b', fontSize: 24 }}>{s}</span>
                ))}
              </div>
              <blockquote className="rv-featured-quote">
                "{current.reviewMessage || current.message}"
              </blockquote>
              <div className="rv-featured-author">
                <div className="rv-avatar rv-avatar-lg" style={{ background: bg, color: fg }}>
                  {current.initials || current.customerName?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="rv-featured-name">{current.customerName}</p>
                  <p className="rv-featured-date">
                    {new Date(current.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button className="rv-carousel-btn rv-next" onClick={() => { clearInterval(timerRef.current); go(1) }} aria-label="Next review">›</button>
      </div>

      <div className="rv-carousel-dots">
        {top.map((_, i) => (
          <button
            key={i}
            className={`rv-dot ${i === idx ? 'active' : ''}`}
            onClick={() => { clearInterval(timerRef.current); setDirection(i > idx ? 1 : -1); setIdx(i) }}
            aria-label={`Review ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Reviews Section ──────────────────────────────────────────────────────
const Reviews = () => {
  const [data, setData] = useState({ reviews: [], total: 0, avgRating: 0, distribution: {} })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(0)

  useEffect(() => {
    fetch(`${FEEDBACK_ENDPOINT}?limit=50`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => {
        if (d.success) {
          setData({
            reviews: d.feedback || d.reviews || [],
            total: d.total || 0,
            avgRating: d.avgRating || 0,
            distribution: d.distribution || {},
          })
        }
      })
      .catch((err) => console.error('[Reviews] fetch failed:', err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 0 ? data.reviews : data.reviews.filter(r => r.rating === filter)
  const filledStars = Math.round(data.avgRating)

  return (
    <section className="rv-section section" id="reviews">
      <div className="container">
        <div className="section-header">
          <p className="rv-eyebrow">TESTIMONIALS</p>
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="section-subtitle">
            Real experiences from real people who transformed their homes with Dream D'Accor.
          </p>
        </div>

        {loading ? (
          <div className="rv-loading">
            {[1, 2, 3].map(i => <div key={i} className="rv-skeleton-card skeleton" />)}
          </div>
        ) : data.total === 0 ? (
          <div className="rv-empty">
            <div className="rv-empty-icon">⭐</div>
            <p className="rv-empty-text">Be the first to share your experience!</p>
          </div>
        ) : (
          <>
            {/* Summary Row */}
            <div className="rv-summary-row">
              <div className="rv-score-block">
                <div className="rv-score">{data.avgRating.toFixed(1)}</div>
                <div className="rv-score-stars">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className={`rv-score-star ${filledStars >= s ? 'filled' : ''}`}>★</span>
                  ))}
                </div>
                <p className="rv-score-count">Based on {data.total} review{data.total !== 1 ? 's' : ''}</p>
              </div>
              <div className="rv-distribution">
                {[5, 4, 3, 2, 1].map(star => (
                  <RatingBar key={star} star={star} count={data.distribution[star] || 0} total={data.total} />
                ))}
              </div>
            </div>

            {/* Carousel */}
            <TestimonialCarousel reviews={data.reviews} />

            {/* Filter Tabs */}


            {/* Review Grid */}


          </>
        )}
      </div>
    </section>
  )
}

export default Reviews
