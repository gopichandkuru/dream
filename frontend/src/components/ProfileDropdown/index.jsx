import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './index.css'

const ProfileDropdown = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  // Get initials from full name
  const initials = user.fullName
    ? user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user.email?.[0]?.toUpperCase() || 'U'

  const firstName = user.fullName?.split(' ')[0] || user.email?.split('@')[0] || 'User'

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login')
  }

  const handleNavigate = (path) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div style={{ position: 'relative' }} ref={wrapperRef}>
      <button
        className="profile-btn"
        onClick={() => setOpen(prev => !prev)}
        aria-label="User profile"
        aria-expanded={open}
      >
        {/* Avatar */}
        {user.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.fullName}
            className="profile-avatar"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="profile-avatar-initials">{initials}</div>
        )}

        {/* Name */}
        <span className="profile-name">{firstName}</span>

        {/* Chevron */}
        <span className={`profile-chevron${open ? ' profile-chevron-open' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="profile-dropdown">
          {/* Header */}
          <div className="profile-dropdown-header">
            <div className="profile-dropdown-name">{user.fullName || 'User'}</div>
            <div className="profile-dropdown-email">{user.email}</div>
            {user.lastLogin && (
              <div className="profile-dropdown-activity">
                🕒 Last Sign-in: {(() => {
                  try {
                    const dt = new Date(user.lastLogin)
                    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + 
                           dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
                  } catch (e) {
                    return ''
                  }
                })()}
              </div>
            )}
          </div>

          {/* Menu items */}
          <button className="profile-dropdown-item" onClick={() => handleNavigate('/home')}>
            🏠 Home
          </button>
          {user.role === 'admin' && (
            <button className="profile-dropdown-item" style={{ color: 'var(--color-accent)', fontWeight: 700 }} onClick={() => handleNavigate('/admin')}>
              🛡️ Admin Panel
            </button>
          )}
          <button className="profile-dropdown-item" onClick={() => handleNavigate('/my-orders')}>
            📦 My Orders
          </button>
          <button className="profile-dropdown-item" onClick={() => handleNavigate('/favorites')}>
            ♡ Wishlist
          </button>
          <button className="profile-dropdown-item" onClick={() => handleNavigate('/cart')}>
            🛍 My Cart
          </button>

          <div className="profile-dropdown-divider" />

          <button
            className="profile-dropdown-item profile-dropdown-logout"
            onClick={handleLogout}
          >
            ↩ Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default ProfileDropdown
