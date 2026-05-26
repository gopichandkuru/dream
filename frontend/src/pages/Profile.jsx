import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import './Profile.css'

const Profile = () => {
  const { user, token, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('settings') // 'settings' | 'orders'
  
  // Profile settings state
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '')
  const [location, setLocation] = useState(user?.location || '')
  const [avatar, setAvatar] = useState(user?.profileImage || '')
  const [saving, setSaving] = useState(false)

  // Orders state
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Fetch orders
  useEffect(() => {
    if (activeTab === 'orders') {
      const fetchOrders = async () => {
        setOrdersLoading(true)
        try {
          const API_BASE = import.meta.env.VITE_API_URL || ''
          const res = await fetch(`${API_BASE}/api/orders/my-orders`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
          const data = await res.json()
          if (data.success) {
            setOrders(data.orders)
          } else {
            toast.error(data.error || 'Failed to load orders.')
          }
        } catch (err) {
          toast.error('Network error. Failed to load orders.')
        } finally {
          setOrdersLoading(false)
        }
      }
      fetchOrders()
    }
  }, [activeTab, token])

  // Sync state if user context updates
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setPhoneNumber(user.phoneNumber || '')
      setLocation(user.location || '')
      setAvatar(user.profileImage || '')
    }
  }, [user])

  // Handle avatar upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatar(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Handle submit details
  const handleSave = async (e) => {
    e.preventDefault()
    if (fullName.trim().length < 2) {
      toast.error('Name must be at least 2 characters.')
      return
    }

    setSaving(true)
    try {
      await updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        location: location.trim(),
        profileImage: avatar
      })
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-page">
      <Header />
      <main className="page-wrapper container">
        <div className="profile-layout">
          {/* Sidebar Panel */}
          <motion.div 
            className="profile-sidebar card glass"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="profile-user-summary">
              <div className="avatar-upload-container">
                <div className="profile-avatar-wrap">
                  {avatar ? (
                    <img src={avatar} alt={fullName} className="profile-avatar-img" />
                  ) : (
                    <div className="profile-avatar-placeholder">
                      {fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U'}
                    </div>
                  )}
                  <label htmlFor="avatar-file" className="avatar-edit-badge" title="Change picture">
                    📷
                  </label>
                  <input 
                    type="file" 
                    id="avatar-file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleAvatarChange} 
                  />
                </div>
              </div>

              <h2 className="user-name">{fullName || 'Valued User'}</h2>
              <p className="user-email">{user?.email}</p>
              {user?.role === 'admin' && <span className="admin-badge">Admin</span>}
            </div>

            <div className="profile-nav-tabs">
              <button 
                className={`profile-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                👤 Profile Settings
              </button>
              <button 
                className={`profile-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                📦 Order History ({orders.length})
              </button>
            </div>
          </motion.div>

          {/* Main Panel Content */}
          <motion.div 
            className="profile-content card glass"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {activeTab === 'settings' ? (
              <form onSubmit={handleSave} className="profile-form">
                <h2 className="content-title">Account Details</h2>
                <p className="content-desc">Keep your details up to date for effortless checkout experiences.</p>
                
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address (Locked)</label>
                  <input 
                    type="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="disabled-input"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Default Shipping Address</label>
                  <textarea 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter your shipping address"
                    rows={4}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={saving} 
                  className="btn btn-accent btn-lg shimmer-btn submit-profile-btn"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            ) : (
              <div className="order-history-section">
                <h2 className="content-title">Your Orders</h2>
                <p className="content-desc">View and track your current and past transactions.</p>

                {ordersLoading ? (
                  <div className="orders-loading-skeletons">
                    <div className="skeleton order-skeleton" />
                    <div className="skeleton order-skeleton" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="empty-orders">
                    <span className="empty-icon">📦</span>
                    <h3>No orders yet</h3>
                    <p>When you purchase products, your order history will appear here.</p>
                  </div>
                ) : (
                  <div className="orders-list">
                    {orders.map((order) => (
                      <div key={order.orderId} className="order-card card">
                        <div className="order-card-header">
                          <div>
                            <span className="order-number">Order #{order.orderId}</span>
                            <span className="order-date">
                              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <span className={`status-badge ${order.orderStatus.toLowerCase()}`}>
                            {order.orderStatus}
                          </span>
                        </div>

                        <div className="order-items-grid">
                          {order.products.map((item, idx) => (
                            <div key={idx} className="order-item-row">
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="order-item-img"
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=100&q=70' }}
                              />
                              <div className="order-item-details">
                                <span className="oi-name">{item.name}</span>
                                <span className="oi-qty">Qty: {item.quantity}</span>
                              </div>
                              <span className="oi-price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>

                        <div className="order-card-footer">
                          <div className="payment-details">
                            <span>Payment Method: <strong>{order.payment.method.toUpperCase()}</strong></span>
                            <span>Status: <strong>{order.payment.status}</strong></span>
                          </div>
                          <div className="order-total-price">
                            <span>Total Amount:</span>
                            <span className="total-amount">₹{order.payment.amount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Profile
