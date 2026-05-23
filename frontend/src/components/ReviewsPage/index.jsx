import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Header from '../Header'
import Footer from '../Footer'
import Reviews from '../Reviews'
import FeedbackModal from '../FeedbackModal'
import './index.css'

const ReviewsPage = () => {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="reviews-page">
      <Header />

      <main className="page-wrapper">
        {/* ── Page Hero ── */}
        <div className="rv-page-hero">
          <div className="container">
            <motion.div
              className="rv-page-hero-inner"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              <p className="rv-page-eyebrow">CUSTOMER REVIEWS</p>
              <h1 className="rv-page-title">Real Stories,<br />Real Homes</h1>
              <p className="rv-page-subtitle">
                Hear directly from our customers about their Dream D'Accor experience.
                Every review is from a verified purchase.
              </p>
              <div className="rv-page-cta-row">
                <button
                  className="btn btn-accent shimmer-btn"
                  onClick={() => setShowModal(true)}
                  id="write-review-btn"
                >
                  ✍️ Write a Review
                </button>
                <Link to="/shop" className="btn btn-outline">
                  Shop Now →
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Reviews Section (reused component) ── */}
        <Reviews />
      </main>

      <Footer />

      {/* ── Standalone Feedback Modal ── */}
      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  )
}

export default ReviewsPage
