import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useCart } from '../../context/CartContext'
import { useFavorites } from '../../context/FavoritesContext'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import ProfileDropdown from '../ProfileDropdown'
import LocationPopup from '../LocationPopup'
import './index.css'

const Header = () => {
  const { cartCount } = useCart()
  const { favorites } = useFavorites()
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated, logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showLocation, setShowLocation] = useState(false)
  const [deliveryCity, setDeliveryCity] = useState(localStorage.getItem('dd_delivery_city') || '')

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinks = [
    { path: '/home',       label: 'Home' },
    { path: '/shop',       label: 'Shop' },
    { path: '/collections', label: 'Collections' },
    { path: '/my-orders',  label: '📦 My Orders', authOnly: true },
    { path: '/reviews',    label: '⭐ Reviews' },
    { path: '/about',      label: 'About' },
    { path: '/contact',    label: 'Contact' },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <header className={`header${scrolled ? ' header-scrolled' : ''}`}>
      <div className="header-inner container">
        {/* Logo */}
        <Link to="/home" className="logo">
          <span className="logo-icon">✦</span>
          Dream D&apos;Accor
        </Link>

        {/* Desktop Nav */}
        <nav className="nav-desktop">
          {navLinks.filter(l => !l.authOnly || isAuthenticated).map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link${isActive(link.path) ? ' nav-link-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="header-actions">
          {/* Theme Toggle */}
          <button
            className="action-btn theme-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Location */}
          <button
            className="action-btn loc-btn"
            onClick={() => setShowLocation(true)}
            aria-label="Set location"
            title="Set delivery location"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '16px' }}
          >
            📍
            {deliveryCity && (
              <span className="header-loc-city" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {deliveryCity.split(',')[0]}
              </span>
            )}
          </button>

          {/* Favorites */}
          <Link to="/favorites" className="action-btn fav-btn" aria-label="Favorites">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={favorites.length > 0 ? '#ef4444' : 'none'} stroke={favorites.length > 0 ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {favorites.length > 0 && <span className="cart-badge">{favorites.length}</span>}
          </Link>

          {/* Cart */}
          <Link to="/cart" className="action-btn cart-btn-action" aria-label="Cart">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {/* Profile Dropdown (when authenticated) or Sign In button */}
          {isAuthenticated ? (
            <ProfileDropdown />
          ) : (
            <Link to="/login" className="btn btn-outline btn-sm" style={{ padding: '8px 16px', fontSize: '13px' }}>
              Sign In
            </Link>
          )}

          {/* Mobile Hamburger */}
          <button
            className={`hamburger${menuOpen ? ' hamburger-open' : ''}`}
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Location Popup */}
      {showLocation && (
        <LocationPopup
          onClose={() => setShowLocation(false)}
          onLocationChange={(city) => {
            setDeliveryCity(city)
            localStorage.setItem('dd_delivery_city', city)
          }}
        />
      )}

      {/* Mobile Menu Overlay */}
      <div className={`mobile-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />

      {/* Mobile Drawer */}
      <div className={`mobile-drawer${menuOpen ? ' open' : ''}`}>
        <div className="mobile-drawer-header">
          <Link to="/home" className="logo" onClick={() => setMenuOpen(false)}>
            <span className="logo-icon">✦</span>
            Dream D&apos;Accor
          </Link>
          <button onClick={() => setMenuOpen(false)} className="close-btn" aria-label="Close">✕</button>
        </div>

        {/* Mobile user info */}
        {user && (
          <div style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div className="profile-avatar-initials" style={{ width: 36, height: 36, fontSize: 14 }}>
              {user.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {user.fullName || 'User'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{user.email}</div>
            </div>
          </div>
        )}

        <nav className="mobile-nav">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-nav-link${isActive(link.path) ? ' mobile-nav-link-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mobile-drawer-footer">
          <div className="mobile-actions">
            {isAuthenticated && (
              <Link to="/my-orders" className="mobile-action-item" onClick={() => setMenuOpen(false)}>
                📦 My Orders
              </Link>
            )}
            <Link to="/favorites" className="mobile-action-item" onClick={() => setMenuOpen(false)}>
              ♡ Favorites ({favorites.length})
            </Link>
            <Link to="/cart" className="mobile-action-item" onClick={() => setMenuOpen(false)}>
              🛍 Cart ({cartCount})
            </Link>
            <button className="mobile-action-item" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
          </div>
          {isAuthenticated ? (
            <button className="btn btn-outline logout-mobile" onClick={handleLogout}>
              Sign Out
            </button>
          ) : (
            <Link to="/login" className="btn btn-accent login-mobile" onClick={() => setMenuOpen(false)} style={{ display: 'block', textAlign: 'center', width: '100%', padding: '12px 24px' }}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
