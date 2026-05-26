import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './index.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const FEEDBACK_ENDPOINT = `${API_BASE}/api/feedback`

// ── Avatar colors (gold-dark palette) ─────────────────────────────────────────
const AVATAR_COLORS = [
  ['#c8a97e', '#1a1a1a'],
  ['#2d2a25', '#c8a97e'],
  ['#3b82f6', '#ffffff'],
  ['#8b5cf6', '#ffffff'],
  ['#22c55e', '#ffffff'],
  ['#f59e0b', '#1a1a1a'],
  ['#06b6d4', '#ffffff'],
  ['#ef4444', '#ffffff'],
]
const getAvatarColor = (str = '') =>
  AVATAR_COLORS[(str.charCodeAt(0) || 0) % AVATAR_COLORS.length]

// ── Rating bar for the summary ─────────────────────────────────────────────────
const RatingBar = ({ star, count, total }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="rv-bar-row">
      <span className="rv-bar-label">{star}★</span>
      <div className="rv-bar-track">
        <motion.div
          className="rv-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
        />
      </div>
      <span className="rv-bar-count">{count}</span>
    </div>
  )
}

// ── Main Reviews Section ───────────────────────────────────────────────────────
const Reviews = () => {
  const [data, setData] = useState({ reviews: [], total: 0, avgRating: 0, distribution: {} })
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [direction, setDirection] = useState(1)
  const timerRef = useRef(null)

  // ── Fetch from /api/feedback ────────────────────────────────────────────────
  useEffect(() => {
    console.log('[Reviews] Fetching from:', FEEDBACK_ENDPOINT)
    fetch(`${FEEDBACK_ENDPOINT}?limit=50`)
      .then(async (r) => {
        console.log('[Reviews] Response status:', r.status)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => {
        console.log('[Reviews] Data received:', d)
        if (d.success) {
          const reviews = d.feedback || d.reviews || []
          setData({
            reviews,
            total: d.total || reviews.length,
            avgRating: d.avgRating || 0,
            distribution: d.distribution || {},
          })
        }
      })
      .catch((err) => console.error('[Reviews] Fetch failed:', err.message))
      .finally(() => setLoading(false))
  }, [])

  // ── Auto-slide ──────────────────────────────────────────────────────────────
  const go = (dir, reviews) => {
    if (reviews.length === 0) return
    setDirection(dir)
    setIdx(prev => (prev + dir + reviews.length) % reviews.length)
  }

  useEffect(() => {
    if (data.reviews.length < 2) return
    timerRef.current = setInterval(() => go(1, data.reviews), 5000)
    return () => clearInterval(timerRef.current)
  }, [data.reviews])

  const filledStars = Math.round(data.avgRating)
  const current = data.reviews[idx]

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 90 : -90, opacity: 0, scale: 0.96 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir) => ({ x: dir > 0 ? -90 : 90, opacity: 0, scale: 0.96 }),
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="rv-section section" id="reviews">
        <div className="container">
          <div className="section-header">
            <p className="rv-eyebrow">TESTIMONIALS</p>
            <h2 className="section-title">What Our Customers Say</h2>
          </div>
          <div className="rv-skeleton-wrap">
            <div className="rv-skeleton-carousel skeleton" />
            <div className="rv-skeleton-summary skeleton" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rv-section section" id="reviews">
      <div className="container">

        {/* ── Section Header ── */}
        <div className="section-header">
          <p className="rv-eyebrow">TESTIMONIALS</p>
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="section-subtitle">
            Real experiences from real people who transformed their homes with Dream D'Accor.
          </p>
        </div>

        {data.total === 0 ? (
          /* ── Empty state ── */
          <div className="rv-empty">
            <div className="rv-empty-icon">⭐</div>
            <p className="rv-empty-title">No Reviews Yet</p>
            <p className="rv-empty-text">Be the first to share your experience!</p>
          </div>
        ) : (
          <div className="rv-content-wrap">

            {/* ════════ PREMIUM CAROUSEL ════════ */}
            <div className="rv-carousel">
              {/* Giant decorative quote */}
              <div className="rv-big-quote" aria-hidden="true">"</div>

              {/* Navigation buttons */}
              <button
                className="rv-nav-btn rv-prev"
                onClick={() => { clearInterval(timerRef.current); go(-1, data.reviews) }}
                aria-label="Previous review"
              >
                ‹
              </button>

              {/* Slide area */}
              <div className="rv-slide-area">
                <AnimatePresence mode="wait" custom={direction}>
                  {current && (
                    <motion.div
                      key={idx}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      className="rv-slide"
                    >
                      {/* Stars */}
                      <div className="rv-slide-stars">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} className={`rv-star ${current.rating >= s ? 'lit' : ''}`}>★</span>
                        ))}
                      </div>

                      {/* Quote text */}
                      <blockquote className="rv-slide-quote">
                        "{current.reviewMessage || current.message}"
                      </blockquote>

                      {/* Author */}
                      <div className="rv-slide-author">
                        {(() => {
                          const [bg, fg] = getAvatarColor(current.initials || current.customerName || '')
                          return (
                            <div className="rv-slide-avatar" style={{ background: bg, color: fg }}>
                              {current.initials || (current.customerName || 'U').slice(0, 2).toUpperCase()}
                            </div>
                          )
                        })()}
                        <div className="rv-slide-author-info">
                          <p className="rv-slide-name">{current.customerName}</p>
                          <p className="rv-slide-date">
                            {new Date(current.createdAt).toLocaleDateString('en-IN', {
                              month: 'long', year: 'numeric',
                            })}
                          </p>
                        </div>
                        <span className="rv-verified-badge">✓ Verified</span>
                      </div>

                      {/* Product tags if any */}
                      {current.productNames?.length > 0 && (
                        <div className="rv-product-tags">
                          {current.productNames.slice(0, 2).map((n, i) => (
                            <span key={i} className="rv-product-tag">🛋 {n}</span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                className="rv-nav-btn rv-next"
                onClick={() => { clearInterval(timerRef.current); go(1, data.reviews) }}
                aria-label="Next review"
              >
                ›
              </button>

              {/* Dot indicators */}
              <div className="rv-dots">
                {data.reviews.slice(0, 10).map((_, i) => (
                  <button
                    key={i}
                    className={`rv-dot ${i === idx ? 'active' : ''}`}
                    onClick={() => {
                      clearInterval(timerRef.current)
                      setDirection(i > idx ? 1 : -1)
                      setIdx(i)
                    }}
                    aria-label={`Go to review ${i + 1}`}
                  />
                ))}
              </div>

              {/* Review counter */}
              <p className="rv-counter">{idx + 1} / {data.reviews.length}</p>
            </div>

            {/* ════════ RATING SUMMARY ════════ */}
            <div className="rv-summary">
              <div className="rv-summary-score">
                <div className="rv-avg-num">{data.avgRating.toFixed(1)}</div>
                <div className="rv-avg-stars">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`rv-sum-star ${filledStars >= s ? 'lit' : ''}`}>★</span>
                  ))}
                </div>
                <p className="rv-avg-label">Based on {data.total} review{data.total !== 1 ? 's' : ''}</p>
              </div>

              <div className="rv-summary-bars">
                {[5,4,3,2,1].map(star => (
                  <RatingBar
                    key={star}
                    star={star}
                    count={data.distribution[star] || 0}
                    total={data.total}
                  />
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </section>
  )
}

export default Reviews
