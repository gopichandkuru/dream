import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import './AdminDashboard.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.14)',  icon: '⏳', label: 'Pending' },
  Confirmed:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.14)',  icon: '✅', label: 'Confirmed' },
  Processing: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.14)',  icon: '⚙️', label: 'Processing' },
  Shipped:    { color: '#06b6d4', bg: 'rgba(6,182,212,0.14)',   icon: '🚚', label: 'Shipped' },
  Delivered:  { color: '#22c55e', bg: 'rgba(34,197,94,0.14)',   icon: '📦', label: 'Delivered' },
  Cancelled:  { color: '#ef4444', bg: 'rgba(239,68,68,0.14)',   icon: '❌', label: 'Cancelled' },
}

// ─── Authenticated fetch ───────────────────────────────────────────────────────
const authFetch = async (url, token, options = {}) => {
  console.log('[Admin]', options.method || 'GET', url)
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  const data = await res.json()
  console.log('[Admin] Response:', res.status, data)
  return { ok: res.ok, data }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, subtitle }) => (
  <motion.div
    className="adm-stat"
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    style={{ '--stat-color': color }}
  >
    <div className="adm-stat-icon">{icon}</div>
    <div className="adm-stat-body">
      <div className="adm-stat-value">{value}</div>
      <div className="adm-stat-label">{label}</div>
      {subtitle && <div className="adm-stat-sub">{subtitle}</div>}
    </div>
    <div className="adm-stat-glow" />
  </motion.div>
)

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab]         = useState('dashboard')
  const [sidebarOpen, setSidebarOpen]     = useState(true)
  const [loading, setLoading]             = useState(false)
  const [products, setProducts]           = useState([])
  const [users, setUsers]                 = useState([])
  const [orders, setOrders]               = useState([])
  const [orderSearch, setOrderSearch]     = useState('')
  const [orderFilter, setOrderFilter]     = useState('All')
  const [updatingOrder, setUpdatingOrder] = useState(null)

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct]     = useState(null)
  const [productForm, setProductForm] = useState({
    name: '', category: 'Living Room', subtype: 'sofas',
    price: '', originalPrice: '', description: '',
    image: '', badge: '', inStock: true, isNew: false,
  })

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    const { ok, data } = await authFetch('/api/products', token)
    if (ok && data.success) setProducts(data.products || [])
  }, [token])

  const fetchUsers = useCallback(async () => {
    const { ok, data } = await authFetch('/api/auth/users', token)
    if (ok && data.success) setUsers(data.users || [])
  }, [token])

  const fetchOrders = useCallback(async () => {
    const { ok, data } = await authFetch('/api/orders/admin/all', token)
    if (ok && data.success) setOrders(data.orders || [])
  }, [token])

  // Load data on mount + tab switch
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchOrders()
      if (activeTab === 'products') await fetchProducts()
      if (activeTab === 'users')    await fetchUsers()
      setLoading(false)
    }
    load()
  }, [activeTab])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalRevenue   = orders.filter(o => o.orderStatus !== 'Cancelled').reduce((s, o) => s + (o.payment?.amount || 0), 0)
  const pendingCount   = orders.filter(o => ['Pending', 'Confirmed', 'Processing'].includes(o.orderStatus)).length
  const deliveredCount = orders.filter(o => o.orderStatus === 'Delivered').length
  const cancelledCount = orders.filter(o => o.orderStatus === 'Cancelled').length

  // ── Order status update ────────────────────────────────────────────────────
  const handleOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrder(orderId)
    console.log('[Admin] Updating order', orderId, '→', newStatus)
    const { ok, data } = await authFetch(`/api/orders/admin/${orderId}/status`, token, {
      method: 'PUT',
      body: JSON.stringify({ orderStatus: newStatus }),
    })
    if (ok && data.success) {
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, orderStatus: newStatus } : o))
      toast.success(`Order #${orderId} → ${newStatus} ✅`)
    } else {
      toast.error(data.error || data.message || 'Status update failed')
    }
    setUpdatingOrder(null)
  }

  // ── Product CRUD ───────────────────────────────────────────────────────────
  const openNewProduct = () => {
    setEditingProduct(null)
    setProductForm({ name:'', category:'Living Room', subtype:'sofas', price:'', originalPrice:'', description:'', image:'', badge:'', inStock:true, isNew:false })
    setShowProductModal(true)
  }
  const openEditProduct = (prod) => {
    setEditingProduct(prod)
    setProductForm({
      name: prod.name||'', category: prod.category||'Living Room', subtype: prod.subtype||'sofas',
      price: prod.price||'', originalPrice: prod.originalPrice||'', description: prod.description||'',
      image: prod.image||'', badge: prod.badge||'', inStock: prod.inStock!==false, isNew: !!prod.isNew,
    })
    setShowProductModal(true)
  }
  const handleProductSubmit = async (e) => {
    e.preventDefault()
    if (!productForm.name || !productForm.price || !productForm.image || !productForm.description) {
      toast.error('Please fill in all required fields.')
      return
    }
    const method = editingProduct ? 'PUT' : 'POST'
    const url    = editingProduct ? `/api/products/${editingProduct.id || editingProduct._id}` : '/api/products'
    const { ok, data } = await authFetch(url, token, {
      method,
      body: JSON.stringify({ ...productForm, price: Number(productForm.price), originalPrice: Number(productForm.originalPrice || productForm.price) }),
    })
    if (ok && data.success) {
      toast.success(data.message || 'Product saved!')
      setShowProductModal(false)
      await fetchProducts()
    } else {
      toast.error(data.error || data.message || 'Save failed.')
    }
  }
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return
    const { ok, data } = await authFetch(`/api/products/${id}`, token, { method: 'DELETE' })
    if (ok && data.success) {
      toast.success('Product deleted.')
      setProducts(prev => prev.filter(p => p.id !== id && p._id !== id))
    } else {
      toast.error(data.error || 'Delete failed.')
    }
  }

  // ── User management ────────────────────────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    const { ok, data } = await authFetch(`/api/auth/users/${userId}/role`, token, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole }),
    })
    if (ok && data.success) {
      toast.success(`Role updated to ${newRole}`)
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u))
    } else {
      toast.error(data.error || 'Role update failed')
    }
  }
  const handleDeleteUser = async (userId) => {
    if (userId === user?._id) { toast.error('Cannot delete your own account.'); return }
    if (!window.confirm('Delete this user?')) return
    const { ok, data } = await authFetch(`/api/auth/users/${userId}`, token, { method: 'DELETE' })
    if (ok && data.success) {
      toast.success('User deleted.')
      setUsers(prev => prev.filter(u => u._id !== userId))
    } else {
      toast.error(data.error || 'Delete failed')
    }
  }

  // ── Filtered orders ────────────────────────────────────────────────────────
  const filteredOrders = orders.filter(o => {
    if (orderFilter !== 'All' && o.orderStatus !== orderFilter) return false
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase()
      return (o.orderId || '').toLowerCase().includes(q) ||
        o.customerDetails?.name?.toLowerCase().includes(q) ||
        o.customerDetails?.email?.toLowerCase().includes(q)
    }
    return true
  })

  // ── Sidebar nav items ──────────────────────────────────────────────────────
  const NAV = [
    { key: 'dashboard', icon: '◈',  label: 'Dashboard' },
    { key: 'orders',    icon: '📦', label: 'Orders',   badge: orders.length },
    { key: 'products',  icon: '🏷️', label: 'Products', badge: products.length },
    { key: 'users',     icon: '👥', label: 'Users',    badge: users.length },
  ]

  return (
    <div className="adm-layout">

      {/* ══════════ SIDEBAR ══════════ */}
      <aside className={`adm-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="adm-sidebar-brand">
          <div className="adm-logo-icon">✦</div>
          {sidebarOpen && (
            <div className="adm-brand-text">
              <span className="adm-brand-name">Dream D'Accor</span>
              <span className="adm-brand-sub">Admin Panel</span>
            </div>
          )}
          <button className="adm-collapse-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle sidebar">
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        <nav className="adm-nav">
          {NAV.map(item => (
            <button
              key={item.key}
              className={`adm-nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="adm-nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="adm-nav-label">{item.label}</span>}
              {sidebarOpen && item.badge > 0 && (
                <span className="adm-nav-badge">{item.badge}</span>
              )}
              {activeTab === item.key && <div className="adm-nav-active-bar" />}
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          {sidebarOpen && (
            <div className="adm-sidebar-user">
              <div className="adm-sidebar-avatar">
                {user?.fullName?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() || 'AD'}
              </div>
              <div className="adm-sidebar-user-info">
                <span className="adm-sidebar-name">{user?.fullName || 'Admin'}</span>
                <span className="adm-sidebar-role">🛡️ Administrator</span>
              </div>
            </div>
          )}
          <Link to="/home" className="adm-back-link" title="Back to Store">
            {sidebarOpen ? '← Back to Store' : '←'}
          </Link>
        </div>
      </aside>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main className="adm-main">

        {/* ── Topbar ── */}
        <div className="adm-topbar">
          <div className="adm-topbar-left">
            <h1 className="adm-page-title">
              {activeTab === 'dashboard' && '◈ Dashboard Overview'}
              {activeTab === 'orders'    && '📦 Order Management'}
              {activeTab === 'products'  && '🏷️ Product Inventory'}
              {activeTab === 'users'     && '👥 User Accounts'}
            </h1>
          </div>
          <div className="adm-topbar-right">
            <span className="adm-badge-pill">🛡️ Admin</span>
            <span className="adm-topbar-email">{user?.email}</span>
          </div>
        </div>

        <div className="adm-content">

          {/* ════ STATS ROW (always visible) ════ */}
          <div className="adm-stats-grid">
            <StatCard icon="📦" label="Total Orders"   value={orders.length}                              color="#3b82f6" />
            <StatCard icon="⏳" label="Active Orders"  value={pendingCount}                               color="#f59e0b" subtitle="Pending confirmation" />
            <StatCard icon="📫" label="Delivered"       value={deliveredCount}                             color="#22c55e" />
            <StatCard icon="❌" label="Cancelled"       value={cancelledCount}                             color="#ef4444" />
            <StatCard icon="💰" label="Revenue"         value={`₹${totalRevenue.toLocaleString('en-IN')}`} color="#c8a97e" subtitle="Excluding cancelled" />
            <StatCard icon="🏷️" label="Products"        value={products.length}                            color="#06b6d4" />
          </div>

          {/* ════ TAB CONTENT ════ */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" className="adm-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="adm-spinner" />
                <p>Loading data…</p>
              </motion.div>

            ) : activeTab === 'dashboard' ? (
              /* ── DASHBOARD TAB ── */
              <motion.div key="dashboard" className="adm-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="adm-dashboard-grid">
                  {/* Recent Orders */}
                  <div className="adm-card">
                    <div className="adm-card-header">
                      <h3 className="adm-card-title">Recent Orders</h3>
                      <button className="adm-view-all" onClick={() => setActiveTab('orders')}>View All →</button>
                    </div>
                    <div className="adm-recent-orders">
                      {orders.slice(0, 6).map(ord => {
                        const st = STATUS_CONFIG[ord.orderStatus] || STATUS_CONFIG.Confirmed
                        return (
                          <div key={ord.orderId} className="adm-recent-row">
                            <div className="adm-recent-id">#{ord.orderId}</div>
                            <div className="adm-recent-name">{ord.customerDetails?.name || '—'}</div>
                            <div className="adm-recent-amount">₹{Number(ord.payment?.amount || 0).toLocaleString('en-IN')}</div>
                            <span className="adm-status-pill" style={{ color: st.color, background: st.bg }}>
                              {st.icon} {ord.orderStatus}
                            </span>
                          </div>
                        )
                      })}
                      {orders.length === 0 && <p className="adm-empty-hint">No orders yet</p>}
                    </div>
                  </div>

                  {/* Order Status Breakdown */}
                  <div className="adm-card">
                    <div className="adm-card-header">
                      <h3 className="adm-card-title">Order Status</h3>
                    </div>
                    <div className="adm-status-breakdown">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                        const count = orders.filter(o => o.orderStatus === key).length
                        const pct = orders.length ? Math.round((count / orders.length) * 100) : 0
                        return (
                          <div key={key} className="adm-status-item">
                            <div className="adm-status-item-left">
                              <span>{cfg.icon}</span>
                              <span className="adm-status-item-label">{key}</span>
                            </div>
                            <div className="adm-status-bar-track">
                              <motion.div
                                className="adm-status-bar-fill"
                                style={{ background: cfg.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: 0.1 }}
                              />
                            </div>
                            <span className="adm-status-count">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>

            ) : activeTab === 'orders' ? (
              /* ── ORDERS TAB ── */
              <motion.div key="orders" className="adm-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="adm-tab-header">
                  <h2 className="adm-tab-title">Order Management</h2>
                  <div className="adm-orders-controls">
                    <div className="adm-search-box">
                      <span className="adm-search-icon">🔍</span>
                      <input
                        className="adm-search-input"
                        placeholder="Search order ID, name, email…"
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)}
                      />
                    </div>
                    <div className="adm-filter-pills">
                      {['All','Pending','Confirmed','Processing','Shipped','Delivered','Cancelled'].map(s => {
                        const cfg = STATUS_CONFIG[s]
                        return (
                          <button
                            key={s}
                            className={`adm-pill ${orderFilter === s ? 'active' : ''}`}
                            onClick={() => setOrderFilter(s)}
                            style={orderFilter === s && cfg ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color + '60' } : {}}
                          >
                            {cfg?.icon || '🔵'} {s}
                            <span className="adm-pill-count">
                              {s === 'All' ? orders.length : orders.filter(o => o.orderStatus === s).length}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="adm-empty">
                    <div className="adm-empty-icon">📭</div>
                    <p>No orders found{orderSearch ? ` for "${orderSearch}"` : ''}</p>
                  </div>
                ) : (
                  <div className="adm-orders-list">
                    {filteredOrders.map(ord => {
                      const st = STATUS_CONFIG[ord.orderStatus] || STATUS_CONFIG.Confirmed
                      const isUpdating = updatingOrder === ord.orderId
                      return (
                        <motion.div key={ord.orderId} className="adm-order-card" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                          {/* Header */}
                          <div className="adm-oc-header">
                            <div className="adm-oc-id-block">
                              <span className="adm-oc-id">#{ord.orderId}</span>
                              <span className="adm-oc-date">
                                {new Date(ord.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                              </span>
                            </div>
                            <span className="adm-status-pill" style={{ color: st.color, background: st.bg }}>
                              {st.icon} {ord.orderStatus}
                            </span>
                          </div>

                          {/* Customer */}
                          <div className="adm-oc-customer">
                            <div className="adm-oc-avatar">
                              {(ord.customerDetails?.name || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="adm-oc-name">{ord.customerDetails?.name}</div>
                              <div className="adm-oc-meta">{ord.customerDetails?.email} · {ord.customerDetails?.phone}</div>
                              <div className="adm-oc-addr">📍 {ord.customerDetails?.address}</div>
                            </div>
                          </div>

                          {/* Products */}
                          <div className="adm-oc-products">
                            {(ord.products || []).map((p, i) => (
                              <div key={i} className="adm-oc-product-row">
                                <img
                                  src={p.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=60&q=60'}
                                  alt={p.name}
                                  className="adm-oc-thumb"
                                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=60&q=60' }}
                                />
                                <span className="adm-oc-pname">{p.name}</span>
                                <span className="adm-oc-qty">×{p.quantity}</span>
                                <span className="adm-oc-price">₹{(p.price * p.quantity).toLocaleString('en-IN')}</span>
                              </div>
                            ))}
                          </div>

                          {/* Footer */}
                          <div className="adm-oc-footer">
                            <div className="adm-oc-payment">
                              <span className="adm-oc-method">
                                {ord.payment?.method === 'cod' ? '💵 Cash on Delivery' : '💳 ' + (ord.payment?.method || 'Online')}
                              </span>
                              <span className={`adm-oc-pay-status ${(ord.payment?.status || '').toLowerCase()}`}>
                                {ord.payment?.status === 'Paid' ? '✅ Paid' : '⏳ ' + (ord.payment?.status || 'Pending')}
                              </span>
                              <span className="adm-oc-total">₹{Number(ord.payment?.amount || 0).toLocaleString('en-IN')}</span>
                            </div>

                            {/* Status flow buttons */}
                            <div className="adm-oc-flow">
                              <span className="adm-oc-flow-label">Update Status:</span>
                              <div className="adm-oc-steps">
                                {['Confirmed','Processing','Shipped','Delivered','Cancelled'].map(s => {
                                  const cfg2 = STATUS_CONFIG[s]
                                  const isCurrent = ord.orderStatus === s
                                  const isDone    = ord.orderStatus === 'Delivered' || ord.orderStatus === 'Cancelled'
                                  return (
                                    <button
                                      key={s}
                                      className={`adm-step-btn ${isCurrent ? 'current' : ''} ${s === 'Cancelled' ? 'danger' : ''}`}
                                      disabled={isUpdating || isCurrent || isDone}
                                      onClick={() => handleOrderStatus(ord.orderId, s)}
                                      style={isCurrent ? { color: cfg2.color, borderColor: cfg2.color + '80', background: cfg2.bg } : {}}
                                    >
                                      {isUpdating ? '…' : cfg2.icon + ' ' + s}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </motion.div>

            ) : activeTab === 'products' ? (
              /* ── PRODUCTS TAB ── */
              <motion.div key="products" className="adm-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="adm-tab-header">
                  <h2 className="adm-tab-title">Product Inventory ({products.length})</h2>
                  <button className="btn btn-accent" onClick={openNewProduct}>➕ Add Product</button>
                </div>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(prod => (
                        <tr key={prod.id || prod._id}>
                          <td>
                            <img src={prod.image} alt={prod.name} className="adm-table-thumb"
                              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=60' }} />
                          </td>
                          <td>
                            <div className="adm-prod-name">{prod.name}</div>
                            <div className="adm-prod-id">ID: {prod.id || (prod._id || '').slice(-6)}</div>
                          </td>
                          <td><span className="adm-cat-tag">{prod.category}</span></td>
                          <td>
                            <div className="adm-price-cell">
                              <span className="adm-price-main">₹{Number(prod.price).toLocaleString('en-IN')}</span>
                              {prod.originalPrice && prod.originalPrice > prod.price && (
                                <span className="adm-price-orig">₹{Number(prod.originalPrice).toLocaleString('en-IN')}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`adm-stock ${prod.inStock ? 'in' : 'out'}`}>
                              {prod.inStock ? '● In Stock' : '○ Out of Stock'}
                            </span>
                          </td>
                          <td>
                            <div className="adm-row-actions">
                              <button className="btn btn-sm btn-outline" onClick={() => openEditProduct(prod)}>✏️ Edit</button>
                              <button className="btn btn-sm adm-danger-btn" onClick={() => handleDeleteProduct(prod.id || prod._id)}>🗑️ Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length === 0 && (
                    <div className="adm-empty"><div className="adm-empty-icon">🏷️</div><p>No products found</p></div>
                  )}
                </div>
              </motion.div>

            ) : (
              /* ── USERS TAB ── */
              <motion.div key="users" className="adm-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="adm-tab-header">
                  <h2 className="adm-tab-title">User Accounts ({users.length})</h2>
                </div>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Provider</th>
                        <th>Joined</th>
                        <th>Role</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id}>
                          <td>
                            <div className="adm-user-cell">
                              {u.profileImage ? (
                                <img src={u.profileImage} alt="" className="adm-user-avatar" />
                              ) : (
                                <div className="adm-user-avatar placeholder">
                                  {(u.fullName || 'U').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
                                </div>
                              )}
                              <span className="adm-user-name">{u.fullName}</span>
                            </div>
                          </td>
                          <td className="adm-email-cell">{u.email}</td>
                          <td>
                            <span className="adm-provider-tag">
                              {u.authProvider === 'google' ? '🔵 Google' : '🔑 Email'}
                            </span>
                          </td>
                          <td className="adm-date-cell">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                          </td>
                          <td>
                            <select
                              value={u.role}
                              onChange={e => handleRoleChange(u._id, e.target.value)}
                              disabled={u._id === user?._id}
                              className={`adm-role-select ${u.role}`}
                            >
                              <option value="user">👤 User</option>
                              <option value="admin">🛡️ Admin</option>
                            </select>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm adm-danger-btn"
                              onClick={() => handleDeleteUser(u._id)}
                              disabled={u._id === user?._id}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="adm-empty"><div className="adm-empty-icon">👥</div><p>No users found</p></div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ════ PRODUCT MODAL ════ */}
      <AnimatePresence>
        {showProductModal && (
          <motion.div
            className="adm-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowProductModal(false)}
          >
            <motion.div
              className="adm-modal"
              initial={{ scale: 0.92, y: 28 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="adm-modal-head">
                <h3>{editingProduct ? '✏️ Edit Product' : '➕ Add New Product'}</h3>
                <button className="adm-modal-close" onClick={() => setShowProductModal(false)}>✕</button>
              </div>

              <form onSubmit={handleProductSubmit} className="adm-modal-form">
                <div className="adm-form-row">
                  <div className="adm-form-field" style={{ flex: 2 }}>
                    <label>Product Name *</label>
                    <input value={productForm.name} onChange={e => setProductForm(p => ({...p, name: e.target.value}))} placeholder="Royal Velvet Sofa" required />
                  </div>
                  <div className="adm-form-field" style={{ flex: 1 }}>
                    <label>Category *</label>
                    <select value={productForm.category} onChange={e => setProductForm(p => ({...p, category: e.target.value}))}>
                      <option>Living Room</option>
                      <option>Bedroom</option>
                      <option>Dining Room</option>
                      <option>Home Office</option>
                    </select>
                  </div>
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-field">
                    <label>Subtype</label>
                    <input value={productForm.subtype} onChange={e => setProductForm(p => ({...p, subtype: e.target.value}))} placeholder="sofas / beds / tables" />
                  </div>
                  <div className="adm-form-field">
                    <label>Sale Price (₹) *</label>
                    <input type="number" value={productForm.price} onChange={e => setProductForm(p => ({...p, price: e.target.value}))} placeholder="54999" required />
                  </div>
                  <div className="adm-form-field">
                    <label>Original Price (₹)</label>
                    <input type="number" value={productForm.originalPrice} onChange={e => setProductForm(p => ({...p, originalPrice: e.target.value}))} placeholder="68000" />
                  </div>
                </div>

                <div className="adm-form-field">
                  <label>Image URL *</label>
                  <input type="url" value={productForm.image} onChange={e => setProductForm(p => ({...p, image: e.target.value}))} placeholder="https://images.unsplash.com/..." required />
                </div>

                {productForm.image && (
                  <div className="adm-img-preview">
                    <img src={productForm.image} alt="preview" onError={e => e.target.style.display='none'} />
                    <span>Image Preview</span>
                  </div>
                )}

                <div className="adm-form-row">
                  <div className="adm-form-field" style={{ flex: 2 }}>
                    <label>Badge</label>
                    <input value={productForm.badge} onChange={e => setProductForm(p => ({...p, badge: e.target.value}))} placeholder="Bestseller / New Arrival / Premium" />
                  </div>
                  <div className="adm-form-field adm-toggles">
                    <label className="adm-check-label">
                      <input type="checkbox" checked={productForm.inStock} onChange={e => setProductForm(p => ({...p, inStock: e.target.checked}))} />
                      In Stock
                    </label>
                    <label className="adm-check-label">
                      <input type="checkbox" checked={productForm.isNew} onChange={e => setProductForm(p => ({...p, isNew: e.target.checked}))} />
                      New Arrival
                    </label>
                  </div>
                </div>

                <div className="adm-form-field">
                  <label>Description *</label>
                  <textarea value={productForm.description} onChange={e => setProductForm(p => ({...p, description: e.target.value}))} placeholder="Detailed product description…" rows={4} required />
                </div>

                <div className="adm-modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowProductModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-accent shimmer-btn">
                    {editingProduct ? '💾 Save Changes' : '➕ Add Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdminDashboard
