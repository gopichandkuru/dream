import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import './index.css'

// ─── API Base — uses VITE_API_URL in production, Vite proxy in dev ────────────
const getApiBase = () => (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// ─── Star Rating Sub-component ────────────────────────────────────────────────
const StarRating = ({ value, onChange, readonly = false, size = 32 }) => {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value

  return (
    <div className="fb-stars" role="group" aria-label={`Rating: ${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`fb-star ${display >= star ? 'active' : ''} ${readonly ? 'readonly' : ''}`}
          style={{ fontSize: size }}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          disabled={readonly}
        >
          ★
        </button>
      ))}
    </div>
  )
}

const RATING_LABELS = {
  1: 'Poor 😞',
  2: 'Fair 😕',
  3: 'Good 🙂',
  4: 'Great 😊',
  5: 'Excellent 🤩',
}

// ─── Main FeedbackModal ───────────────────────────────────────────────────────
const FeedbackModal = ({
  isOpen,
  onClose,
  orderId = '',
  customerName = '',
  productNames = [],
  productId = '',
}) => {
  const [form, setForm] = useState({
    name: customerName,
    rating: 0,
    reviewMessage: '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({ name: customerName || '', rating: 0, reviewMessage: '' })
      setErrors({})
      setSubmitted(false)
      setSubmitting(false)
    }
  }, [isOpen, customerName])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // ── Client-side validation ──────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.name.trim() || form.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters'
    }
    if (!form.rating || form.rating < 1) {
      errs.rating = 'Please select a star rating'
    }
    if (!form.reviewMessage.trim() || form.reviewMessage.trim().length < 10) {
      errs.reviewMessage = 'Review must be at least 10 characters'
    }
    return errs
  }

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate before sending
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Please fix the errors above before submitting.')
      return
    }

    setSubmitting(true)
    console.log('[FeedbackModal] Submitting feedback...')

    const apiBase = getApiBase()
    const endpoint = `${apiBase}/api/feedback`
    const payload = {
      customerName: form.name.trim(),
      rating: form.rating,
      reviewMessage: form.reviewMessage.trim(),
      productId: productId || '',
      productNames,
      orderId: orderId || '',
      createdAt: new Date().toISOString(),
    }

    console.log('[FeedbackModal] POST', endpoint, payload)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // Guard: some servers return HTML on 502/503 — always parse safely
      let data
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        data = await res.json()
      } else {
        const raw = await res.text()
        console.error('[FeedbackModal] Non-JSON response:', res.status, raw.slice(0, 300))
        throw new Error(`Server error (${res.status}). Please try again.`)
      }

      console.log('[FeedbackModal] Response:', res.status, data)

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Submission failed (${res.status})`)
      }

      // ── Success ──────────────────────────────────────────────────────────
      setSubmitted(true)
      toast.success('Thank you for your feedback! 🌟', { duration: 4000 })
      console.log('[FeedbackModal] ✅ Feedback submitted successfully:', data.feedback?.id)

    } catch (err) {
      console.error('[FeedbackModal] ❌ Submit failed:', err.message)
      toast.error(err.message || 'Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            className="fb-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={handleClose}
          />

          {/* ── Modal wrapper ── */}
          <motion.div
            className="fb-modal-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="fb-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="fb-modal-title"
              initial={{ scale: 0.85, y: 48, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                className="fb-close"
                onClick={handleClose}
                aria-label="Close feedback modal"
                disabled={submitting}
              >
                ×
              </button>

              {/* ════════════════ SUCCESS STATE ════════════════ */}
              {submitted ? (
                <motion.div
                  className="fb-success"
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                >
                  <motion.div
                    className="fb-success-icon"
                    initial={{ rotate: -20, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  >
                    🌟
                  </motion.div>
                  <h2 className="fb-success-title">Thank You!</h2>
                  <p className="fb-success-text">
                    Your review helps other customers find the perfect furniture.
                    We truly appreciate your feedback!
                  </p>
                  <div style={{ marginTop: 4 }}>
                    <StarRating value={form.rating} readonly size={26} />
                  </div>
                  <button className="btn btn-accent fb-done-btn" onClick={handleClose}>
                    Done ✓
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* ════════════════ FORM HEADER ════════════════ */}
                  <div className="fb-header">
                    <div className="fb-emoji" aria-hidden="true">✍️</div>
                    <h2 id="fb-modal-title" className="fb-title">Share Your Experience</h2>
                    <p className="fb-subtitle">
                      How was your shopping experience with Dream D'Accor?
                    </p>
                    {orderId && (
                      <span className="fb-order-badge">Order #{orderId}</span>
                    )}
                  </div>

                  {/* ════════════════ FORM ════════════════ */}
                  <form onSubmit={handleSubmit} noValidate className="fb-form">

                    {/* Star Rating */}
                    <div className="fb-field">
                      <label className="fb-label">Your Rating *</label>
                      <div className="fb-rating-wrap">
                        <StarRating
                          value={form.rating}
                          size={38}
                          onChange={(r) => {
                            setForm((prev) => ({ ...prev, rating: r }))
                            setErrors((prev) => ({ ...prev, rating: '' }))
                          }}
                        />
                        {form.rating > 0 && (
                          <motion.span
                            key={form.rating}
                            className="fb-rating-label"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {RATING_LABELS[form.rating]}
                          </motion.span>
                        )}
                      </div>
                      {errors.rating && (
                        <span className="fb-error" role="alert">{errors.rating}</span>
                      )}
                    </div>

                    {/* Customer Name */}
                    <div className="fb-field">
                      <label className="fb-label" htmlFor="fb-name">Your Name *</label>
                      <input
                        id="fb-name"
                        type="text"
                        className={`fb-input${errors.name ? ' fb-input-error' : ''}`}
                        placeholder="e.g. Gopi Chand"
                        value={form.name}
                        maxLength={60}
                        disabled={submitting}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, name: e.target.value }))
                          setErrors((prev) => ({ ...prev, name: '' }))
                        }}
                        autoComplete="name"
                      />
                      {errors.name && (
                        <span className="fb-error" role="alert">{errors.name}</span>
                      )}
                    </div>

                    {/* Review Message */}
                    <div className="fb-field">
                      <label className="fb-label" htmlFor="fb-msg">
                        Your Review *
                        <span className="fb-char-count">{form.reviewMessage.length}/500</span>
                      </label>
                      <textarea
                        id="fb-msg"
                        className={`fb-textarea${errors.reviewMessage ? ' fb-input-error' : ''}`}
                        placeholder="Tell us about the quality, delivery, and your overall experience..."
                        value={form.reviewMessage}
                        maxLength={500}
                        rows={4}
                        disabled={submitting}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, reviewMessage: e.target.value }))
                          setErrors((prev) => ({ ...prev, reviewMessage: '' }))
                        }}
                      />
                      {errors.reviewMessage && (
                        <span className="fb-error" role="alert">{errors.reviewMessage}</span>
                      )}
                    </div>

                    {/* Purchased products (display only) */}
                    {productNames.length > 0 && (
                      <div className="fb-products">
                        <span className="fb-products-label">Purchased:</span>
                        <div className="fb-product-tags">
                          {productNames.slice(0, 4).map((name, i) => (
                            <span key={i} className="fb-product-tag">{name}</span>
                          ))}
                          {productNames.length > 4 && (
                            <span className="fb-product-tag">+{productNames.length - 4} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      id="fb-submit-btn"
                      className="btn btn-accent fb-submit-btn"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <><span className="spinner" aria-hidden="true" /> Submitting...</>
                      ) : (
                        <>🌟 Submit Review</>
                      )}
                    </button>

                    {/* Skip link */}
                    <button
                      type="button"
                      className="fb-skip-btn"
                      onClick={handleClose}
                      disabled={submitting}
                    >
                      Skip for now
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Named export for star rating reuse
export { StarRating }
export default FeedbackModal
