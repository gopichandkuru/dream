import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '../Header'
import Footer from '../Footer'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import './index.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:    { label: 'Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   icon: '⏳' },
  Confirmed:  { label: 'Confirmed',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   icon: '✅' },
  Processing: { label: 'Processing', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',   icon: '⚙️' },
  Shipped:    { label: 'Shipped',    color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',    icon: '🚚' },
  Delivered:  { label: 'Delivered',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    icon: '📦' },
  Cancelled:  { label: 'Cancelled',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    icon: '❌' },
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="order-card skeleton-card">
    <div className="skeleton-img" />
    <div className="skeleton-lines">
      <div className="skeleton-line w-60" />
      <div className="skeleton-line w-40" />
      <div className="skeleton-line w-80" />
      <div className="skeleton-line w-30" />
    </div>
  </div>
)

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyOrders = ({ filter }) => (
  <motion.div
    className="empty-orders"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="empty-orders-icon">
      {filter === 'Cancelled' ? '🚫' : filter === 'Delivered' ? '📭' : '🛍️'}
    </div>
    <h2 className="empty-orders-title">
      {filter === 'All' ? "You haven't placed any orders yet" : `No ${filter} orders`}
    </h2>
    <p className="empty-orders-text">
      {filter === 'All'
        ? 'Discover our luxury furniture collection and place your first order.'
        : `You have no orders with status "${filter}" at this time.`}
    </p>
    {filter === 'All' && (
      <Link to="/shop" className="btn btn-accent btn-lg">
        🛒 Start Shopping
      </Link>
    )}
  </motion.div>
)

// ─── Order Product Row ────────────────────────────────────────────────────────
const ProductRow = ({ product }) => (
  <div className="order-product-row">
    <img
      src={product.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=80&q=60'}
      alt={product.name}
      className="order-product-img"
      onError={(e) => {
        e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=80&q=60'
      }}
    />
    <div className="order-product-info">
      <p className="order-product-name">{product.name}</p>
      <p className="order-product-meta">
        Qty: {product.quantity} · ₹{Number(product.price).toLocaleString('en-IN')} each
      </p>
    </div>
    <span className="order-product-total">
      ₹{(product.price * product.quantity).toLocaleString('en-IN')}
    </span>
  </div>
)

// ─── Order Card ───────────────────────────────────────────────────────────────
const OrderCard = ({ order, onCancel, cancelling }) => {
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.Confirmed
  const canCancel = ['Pending', 'Confirmed'].includes(order.orderStatus)
  const isDelivered = order.orderStatus === 'Delivered'

  const orderedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const firstProduct = order.products?.[0]

  return (
    <motion.div
      className="order-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* ── Header row ── */}
      <div className="order-card-header" onClick={() => setExpanded(!expanded)}>
        {/* Product thumbnail */}
        <img
          src={firstProduct?.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=80&q=60'}
          alt={firstProduct?.name || 'Product'}
          className="order-thumb"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=80&q=60'
          }}
        />

        {/* Main info */}
        <div className="order-main-info">
          <div className="order-top-row">
            <span className="order-id">#{order.orderId}</span>
            <span
              className="order-status-badge"
              style={{ color: status.color, background: status.bg }}
            >
              {status.icon} {status.label}
            </span>
          </div>
          <p className="order-product-summary">
            {firstProduct?.name}
            {order.products.length > 1 && (
              <span className="order-more-items"> +{order.products.length - 1} more item{order.products.length > 2 ? 's' : ''}</span>
            )}
          </p>
          <div className="order-meta-row">
            <span className="order-meta-item">📅 {orderedDate}</span>
            <span className="order-meta-sep">·</span>
            <span className="order-meta-item">₹{Number(order.payment?.amount).toLocaleString('en-IN')}</span>
            <span className="order-meta-sep">·</span>
            <span className="order-meta-item order-payment-method">
              {order.payment?.method === 'cod' ? '💵 COD' : '💳 ' + (order.payment?.method || 'Online')}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <span className={`order-chevron${expanded ? ' expanded' : ''}`}>⌄</span>
      </div>

      {/* ── Expanded details ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="order-expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="order-products-list">
              {order.products.map((p, i) => (
                <ProductRow key={i} product={p} />
              ))}
            </div>

            {/* Delivery details */}
            <div className="order-delivery-info">
              <div className="order-delivery-row">
                <span className="odl">Deliver to:</span>
                <span className="odv">{order.customerDetails?.address || '—'}</span>
              </div>
              <div className="order-delivery-row">
                <span className="odl">Payment:</span>
                <span className="odv">
                  {order.payment?.status === 'Paid' ? '✅ Paid' : '⏳ ' + order.payment?.status}
                  {order.payment?.paymentId && order.payment.paymentId !== '' && (
                    <span className="payment-id"> · {order.payment.paymentId}</span>
                  )}
                </span>
              </div>
            </div>

            {/* Status progress bar */}
            <div className="order-progress-bar">
              {['Confirmed', 'Processing', 'Shipped', 'Delivered'].map((s, i) => {
                const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
                const currentIdx = statuses.indexOf(order.orderStatus)
                const stepIdx = statuses.indexOf(s)
                const isDone = currentIdx >= stepIdx && order.orderStatus !== 'Cancelled'
                return (
                  <div key={s} className={`progress-step${isDone ? ' done' : ''}`}>
                    <div className="progress-dot" />
                    <span className="progress-label">{s}</span>
                    {i < 3 && <div className={`progress-line${isDone ? ' done' : ''}`} />}
                  </div>
                )
              })}
            </div>

            {/* Action buttons */}
            <div className="order-actions">
              {canCancel && (
                <button
                  className="btn btn-outline btn-sm order-cancel-btn"
                  onClick={() => onCancel(order.orderId)}
                  disabled={cancelling === order.orderId}
                >
                  {cancelling === order.orderId ? (
                    <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Cancelling…</>
                  ) : '✕ Cancel Order'}
                </button>
              )}
              {isDelivered && (
                <Link
                  to="/reviews"
                  state={{ orderId: order.orderId, products: order.products }}
                  className="btn btn-accent btn-sm"
                >
                  ⭐ Rate & Review
                </Link>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setExpanded(false)}
              >
                Collapse ↑
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── MY ORDERS PAGE ───────────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: 'All',       label: 'All Orders' },
  { key: 'Active',    label: 'Active' },
  { key: 'Delivered', label: 'Delivered' },
  { key: 'Cancelled', label: 'Cancelled' },
]

const MyOrders = () => {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [cancelling, setCancelling] = useState(null)

  // ── Fetch orders ────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch orders')
      }
      setOrders(data.orders || [])
    } catch (err) {
      setError(err.message || 'Could not load orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // ── Cancel order ────────────────────────────────────────────────────────────
  const handleCancel = async (orderId) => {
    if (!window.confirm(`Cancel order #${orderId}? This action cannot be undone.`)) return

    setCancelling(orderId)
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Cancellation failed')

      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, orderStatus: 'Cancelled' } : o))
      )
      toast.success('Order cancelled successfully.')
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order.')
    } finally {
      setCancelling(null)
    }
  }

  // ── Filter + search ─────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    // Tab filter
    if (activeFilter === 'Active') {
      if (['Delivered', 'Cancelled'].includes(o.orderStatus)) return false
    } else if (activeFilter !== 'All') {
      if (o.orderStatus !== activeFilter) return false
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchId = o.orderId.toLowerCase().includes(q)
      const matchProduct = o.products?.some((p) => p.name.toLowerCase().includes(q))
      if (!matchId && !matchProduct) return false
    }

    return true
  })

  return (
    <div className="my-orders-page">
      <Header />

      <main className="page-wrapper">
        <div className="container">

          {/* ── Page title ── */}
          <div className="orders-header">
            <div>
              <h1 className="orders-title">My Orders</h1>
              <p className="orders-subtitle">
                {loading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''} placed`}
              </p>
            </div>
            <Link to="/shop" className="btn btn-accent btn-sm orders-shop-btn">
              + New Order
            </Link>
          </div>

          {/* ── Search bar ── */}
          <div className="orders-search-wrap">
            <span className="orders-search-icon">🔍</span>
            <input
              type="text"
              className="orders-search-input"
              placeholder="Search by order ID or product name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="orders-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* ── Filter tabs ── */}
          <div className="orders-tabs">
            {FILTER_TABS.map((tab) => {
              const count = orders.filter((o) => {
                if (tab.key === 'All') return true
                if (tab.key === 'Active') return !['Delivered', 'Cancelled'].includes(o.orderStatus)
                return o.orderStatus === tab.key
              }).length
              return (
                <button
                  key={tab.key}
                  className={`orders-tab${activeFilter === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveFilter(tab.key)}
                >
                  {tab.label}
                  <span className="tab-count">{count}</span>
                </button>
              )
            })}
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="orders-list">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="orders-error">
              <div className="orders-error-icon">⚠️</div>
              <p className="orders-error-text">{error}</p>
              <button className="btn btn-accent" onClick={fetchOrders}>
                Retry
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyOrders filter={search ? 'All' : activeFilter} />
          ) : (
            <motion.div className="orders-list" layout>
              <AnimatePresence mode="popLayout">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.orderId}
                    order={order}
                    onCancel={handleCancel}
                    cancelling={cancelling}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default MyOrders
