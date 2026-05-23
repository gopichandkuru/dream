import { useLocation, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Header from '../Header'
import Footer from '../Footer'
import FeedbackModal from '../FeedbackModal'
import './index.css'

const OrderSuccess = () => {
  const location = useLocation()
  const {
    orderId = 'ORD' + Date.now(),
    total = 0,
    email = 'customer@example.com',
    customerName = '',
    productNames = [],
  } = location.state || {}

  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    // Show feedback modal after 2.5s — gives user time to see the success screen first
    const t = setTimeout(() => setShowFeedback(true), 2500)
    return () => clearTimeout(t)
  }, [])

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
                  left: `${Math.random() * 100}%`,
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
              Thank you for your purchase! Your beautiful furniture is on its way.
            </p>

            <div className="success-details">
              {[
                { label: 'Order ID', value: orderId },
                { label: 'Amount Paid', value: `₹${total?.toLocaleString('en-IN')}` },
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
              <Link to="/shop" className="btn btn-accent btn-lg shimmer-btn">Continue Shopping</Link>
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
