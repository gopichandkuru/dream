import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '../Header'
import Footer from '../Footer'
import FeedbackModal from '../FeedbackModal'
import { useAuth } from '../../context/AuthContext'
import './index.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// ─── OrderSuccess — only accessible after a real order is placed ──────────────
const OrderSuccess = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, isAuthenticated } = useAuth()

  // State passed from Checkout via navigate('/order-success', { state: {...} })
  const locationState = location.state

  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [order, setOrder] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const didVerify = useRef(false)

  useEffect(() => {
    // Prevent double-run in React StrictMode
    if (didVerify.current) return
    didVerify.current = true

    const verifyOrder = async () => {
      // 1 — Must be authenticated
      if (!isAuthenticated || !token) {
        navigate('/login', { replace: true })
        return
      }

      // 2 — Must have arrived via navigate() with state (not direct URL)
      if (!locationState || !locationState.orderId) {
        navigate('/home', { replace: true })
        return
      }

      // 3 — Verify the order actually exists in DB and belongs to this user
      try {
        const res = await fetch(`${API_BASE}/api/orders/${locationState.orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await res.json()

        if (!res.ok || !data.success || !data.order) {
          // Order doesn't exist or doesn't belong to user → go home
          navigate('/home', { replace: true })
          return
        }

        setOrder(data.order)
        setVerified(true)

        // Show feedback modal after 2.5 s
        setTimeout(() => setShowFeedback(true), 2500)
      } catch {
        // Network error — still allow showing if we have local state
        setOrder(null)
        setVerified(true)
        setTimeout(() => setShowFeedback(true), 2500)
      } finally {
        setVerifying(false)
      }
    }

    verifyOrder()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pull display data: prefer DB order, fallback to navigation state
  const orderId = order?.orderId || locationState?.orderId || ''
  const total = order?.payment?.amount || locationState?.total || 0
  const email = order?.customerDetails?.email || locationState?.email || ''
  const customerName = order?.customerDetails?.name || locationState?.customerName || ''
  const productNames =
    order?.products?.map((p) => p.name) || locationState?.productNames || []

  // ── Loading state while verifying ──────────────────────────────────────────
  if (verifying) {
    return (
      <div className="success-page">
        <Header />
        <main className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="spinner" style={{ width: 40, height: 40, borderWidth: 4, color: 'var(--color-accent)', display: 'inline-block' }} />
            <p style={{ marginTop: 16, color: 'var(--color-text-secondary)', fontFamily: "'Inter', sans-serif" }}>
              Verifying your order…
            </p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ── Should never reach here — redirect happens in useEffect ────────────────
  if (!verified) return null

  // ── Success UI ─────────────────────────────────────────────────────────────
  return (
    <div className="success-page">
      <Header />
      <main className="page-wrapper">
        <div className="container">
          <motion.div
            className="success-card card"
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Confetti */}
            <div className="success-confetti" aria-hidden="true">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="confetti-piece" style={{
                  left: `${(i * 6.25 + 3)}%`,
                  animationDelay: `${i * 0.1}s`,
                  background: ['#c8a97e', '#22c55e', '#3b82f6', '#f59e0b', '#a8834e'][i % 5],
                }} />
              ))}
            </div>

            {/* Check Icon */}
            <motion.div
              className="success-checkmark"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </motion.div>

            <h1 className="success-title">Order Confirmed! 🎉</h1>
            <p className="success-subtitle">
              Thank you{customerName ? `, ${customerName.split(' ')[0]}` : ''}! Your beautiful furniture is on its way.
            </p>

            <div className="success-details">
              {[
                { label: 'Order ID', value: orderId },
                { label: 'Amount Paid', value: `₹${Number(total).toLocaleString('en-IN')}` },
                { label: 'Confirmation sent to', value: email },
                { label: 'Estimated Delivery', value: '5–7 Business Days', accent: true },
              ].map((row, i) => (
                <motion.div
                  key={i}
                  className="detail-row"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <span className="detail-label">{row.label}</span>
                  <span className={`detail-value${row.accent ? ' detail-accent' : ''}`}>{row.value}</span>
                </motion.div>
              ))}
            </div>

            {/* Products summary */}
            {productNames.length > 0 && (
              <motion.div
                className="success-products"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <p className="success-products-label">Items ordered:</p>
                <p className="success-products-list">{productNames.join(' · ')}</p>
              </motion.div>
            )}

            {/* Review Prompt Banner */}
            <motion.div
              className="success-review-prompt"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              onClick={() => setShowFeedback(true)}
            >
              <span className="srp-stars">⭐⭐⭐⭐⭐</span>
              <span className="srp-text">Enjoying your order? <strong>Share your review!</strong></span>
              <span className="srp-arrow">›</span>
            </motion.div>

            <div className="success-actions">
              <Link to="/my-orders" className="btn btn-accent btn-lg shimmer-btn">View My Orders</Link>
              <Link to="/shop" className="btn btn-outline btn-lg">Continue Shopping</Link>
              <Link to="/home" className="btn btn-outline btn-lg">Back to Home</Link>
            </div>

            <p className="success-note">
              📧 A confirmation email has been sent to <strong>{email}</strong>
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />

      {/* ── Feedback Modal ── */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        orderId={orderId}
        customerName={customerName}
        productNames={productNames}
      />
    </div>
  )
}

export default OrderSuccess
