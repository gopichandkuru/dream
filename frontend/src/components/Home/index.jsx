import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Header from '../Header'
import Footer from '../Footer'
import Reviews from '../Reviews'
import './index.css'

const stats = [
  { icon: '🏆', value: '2000+', label: 'Products' },
  { icon: '😊', value: '20K+', label: 'Happy Customers' },
  { icon: '🎖️', value: '10+', label: 'Design Awards' },
  { icon: '⭐', value: '4.9★', label: 'Average Rating' },
]

const features = [
  { icon: '🏆', title: 'Premium Quality', desc: 'Every piece is hand-selected by our design team for craftsmanship and durability.' },
  { icon: '🚚', title: 'Free Delivery', desc: 'Complimentary delivery on all orders above ₹1,000. No hidden charges.' },
  { icon: '↩️', title: '30-Day Returns', desc: 'Not in love? Return within 30 days, no questions asked.' },
  { icon: '💬', title: '24/7 Support', desc: 'Our interior design consultants are always ready to help you.' },
]

const ROOMS = [
  { label: 'Living Room', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80', count: '8 products' },
  { label: 'Bedroom',     img: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80', count: '8 products' },
  { label: 'Dining Room', img: 'https://images.unsplash.com/photo-1549187774-b4e9b0445b41?auto=format&fit=crop&w=800&q=80', count: '8 products' },
  { label: 'Home Office', img: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?auto=format&fit=crop&w=800&q=80', count: '8 products' },
]

function Particle({ style }) {
  return <div className="particle" style={style} />
}

const Home = () => {
  const navigate = useNavigate()
  const fadeRefs = useRef([])
  const heroRef = useRef(null)
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const heroY = useTransform(scrollY, [0, 400], [0, 80])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    fadeRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const addRef = (el) => {
    if (el && !fadeRefs.current.includes(el)) fadeRefs.current.push(el)
  }

  const particles = Array.from({ length: 12 }, (_, i) => ({
    left: `${10 + (i * 7.5) % 85}%`,
    top: `${10 + (i * 11.3) % 80}%`,
    animationDelay: `${i * 0.4}s`,
    animationDuration: `${5 + (i % 4)}s`,
    width: `${3 + (i % 3)}px`,
    height: `${3 + (i % 3)}px`,
    opacity: 0.15 + (i % 3) * 0.1,
  }))

  const handleRoomClick = (roomLabel) => {
    navigate(`/shop?category=${encodeURIComponent(roomLabel)}`)
  }

  return (
    <div className="home-page">
      <Header />

      {/* ── HERO ── */}
      <section className="hero" ref={heroRef}>
        <div className="hero-bg">
          <img
            src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1920&q=85"
            alt="Premium modern interior"
            className="hero-img"
            loading="eager"
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1920&q=80' }}
          />
          <div className="hero-overlay" />
          <div className="hero-glow" />
        </div>

        {/* Floating particles */}
        <div className="hero-particles" aria-hidden="true">
          {particles.map((p, i) => <Particle key={i} style={p} />)}
        </div>

        <motion.div
          className="hero-content container"
          style={{ opacity: heroOpacity, y: heroY }}
        >
          <div className="hero-text">
            <motion.div
              className="hero-badge badge badge-accent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              ✦ Premium Furniture &amp; Decor
            </motion.div>

            <motion.h1
              className="hero-title"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
            >
              Decorate Your<br />
              <span className="hero-title-accent">Dream Space</span>
            </motion.h1>

            <motion.p
              className="hero-subtitle"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              Discover our curated collection of premium furniture and decor, crafted to transform your living spaces into a sanctuary of style.
            </motion.p>

            <motion.div
              className="hero-cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
            >
              <Link to="/collections" className="btn btn-accent btn-lg shimmer-btn">
                Explore Collections
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link to="/shop" className="btn btn-outline btn-lg hero-outline-btn">
                Shop Now
              </Link>
            </motion.div>
          </div>

          {/* Floating product card teaser */}
          <motion.div
            className="hero-float-card"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.8 }}
          >
            <div className="hfc-icon">🛋️</div>
            <div>
              <div className="hfc-title">Modern Comfort</div>
              <div className="hfc-sub">Designed for the way you live today.</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          className="stats-bar"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
        >
          <div className="container stats-inner">
            {stats.map((stat, i) => (
              <div key={i} className="stat-item">
                <span className="stat-icon">{stat.icon}</span>
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features-section section">
        <div className="container">
          <div className="section-header fade-up" ref={addRef}>
            <div className="badge badge-accent">Why Choose Us</div>
            <h2 className="section-title" style={{ marginTop: 14 }}>
              The Dream D&apos;Accor Difference
            </h2>
            <p className="section-subtitle">
              We believe your home deserves the finest. Every product is designed with intention.
            </p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="feature-card card fade-up"
                ref={addRef}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="feature-icon-wrap">
                  <span className="feature-icon">{f.icon}</span>
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHOP BY ROOM ── */}
      <section className="categories-preview section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header fade-up" ref={addRef}>
            <div className="badge badge-accent">Browse</div>
            <h2 className="section-title" style={{ marginTop: 14 }}>Shop by Room</h2>
            <p className="section-subtitle">Find the perfect furniture for every corner of your home.</p>
          </div>

          <div className="room-grid">
            {ROOMS.map((room, i) => (
              <motion.div
                key={i}
                className="room-card fade-up"
                ref={addRef}
                style={{ transitionDelay: `${i * 0.08}s` }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                onClick={() => handleRoomClick(room.label)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleRoomClick(room.label)}
              >
                <img
                  src={room.img}
                  alt={room.label}
                  className="room-img"
                  loading="lazy"
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80' }}
                />
                <div className="room-overlay">
                  <div>
                    <span className="room-label">{room.label}</span>
                    <span className="room-count">{room.count}</span>
                  </div>
                  <span className="room-arrow">→</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="cta-banner">
        <div className="cta-bg">
          <img
            src="https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1920&q=85"
            alt="Luxury living room"
            className="cta-img"
            loading="lazy"
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1920&q=80' }}
          />
          <div className="cta-overlay" />
        </div>
        <div className="container cta-content fade-up" ref={addRef}>
          <div className="badge badge-accent">Limited Offer</div>
          <h2 className="cta-title">Ready to Transform Your Home?</h2>
          <p className="cta-subtitle">Get 10% off your first order. Use code <strong>DREAMDECOR10</strong> at checkout.</p>
          <Link to="/shop" className="btn btn-accent btn-lg shimmer-btn">
            Start Shopping →
          </Link>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <Reviews />

      <Footer />
    </div>
  )
}

export default Home