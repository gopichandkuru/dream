import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../Header'
import Footer from '../Footer'
import { useCart } from '../../context/CartContext'
import toast from 'react-hot-toast'
import './index.css'

// ─── API Base URL ─────────────────────────────────────────────────────────────
// In local dev (VITE_API_URL is empty), Vite proxy routes /api → localhost:5001
// In production (Vercel), VITE_API_URL = https://your-backend.onrender.com
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// ─── Checkout Component ───────────────────────────────────────────────────────
const Checkout = () => {
  const { cartItems, cartTotal, clearCart } = useCart()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'razorpay',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const FREE_DELIVERY_THRESHOLD = 1000
  const deliveryFee = cartTotal >= FREE_DELIVERY_THRESHOLD ? 0 : (cartTotal > 0 ? 499 : 0)
  const tax = Math.round(cartTotal * 0.18)
  const grandTotal = cartTotal + deliveryFee + tax
  const amountForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - cartTotal)

  // ─── Form Validation ─────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'Required'
    if (!form.lastName.trim()) errs.lastName = 'Required'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Valid email required'
    if (!form.phone.match(/^\d{10}$/)) errs.phone = '10-digit number required'
    if (!form.address.trim()) errs.address = 'Required'
    if (!form.city.trim()) errs.city = 'Required'
    if (!form.state.trim()) errs.state = 'Required'
    if (!form.pincode.match(/^\d{6}$/)) errs.pincode = '6-digit pincode required'
    return errs
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  // ─── API: Place Order ─────────────────────────────────────────────────────
  const placeOrderViaAPI = async (paymentDetails = {}) => {
    const body = {
      email: form.email,
      items: cartItems,
      totalAmount: grandTotal,
      customerName: `${form.firstName} ${form.lastName}`,
      address: `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`,
      phone: form.phone,
      paymentMethod: form.paymentMethod,
      paymentId: paymentDetails.paymentId || '',
      transactionId: paymentDetails.transactionId || '',
    }

    console.log('[checkout] Placing order →', { ...body, items: body.items.length + ' item(s)' })

    try {
      const res = await fetch(`${API_BASE}/api/orders/place-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      let data
      try {
        data = await res.json()
      } catch {
        const text = await res.text()
        throw new Error(`Server responded with non-JSON (${res.status}): ${text.slice(0, 200)}`)
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Server error ${res.status}`)
      }

      return data
    } catch (err) {
      console.error('[checkout] place-order failed:', err.message)
      return { success: false, message: err.message || 'Cannot reach backend server. Please try again.' }
    }
  }

  // ─── PayPal (kept but secondary) ─────────────────────────────────────────
  useEffect(() => {
    const scriptId = 'paypal-sdk-script'
    if (form.paymentMethod === 'paypal') {
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb'
      const loadPayPal = () => {
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script')
          script.id = scriptId
          script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`
          script.async = true
          script.onload = () => renderPayPalButtons()
          document.body.appendChild(script)
        } else if (window.paypal) {
          renderPayPalButtons()
        }
      }
      loadPayPal()
    }
    return () => {
      const container = document.getElementById('paypal-button-container')
      if (container) container.innerHTML = ''
    }
  }, [form.paymentMethod, cartItems, grandTotal])

  const renderPayPalButtons = useCallback(() => {
    const container = document.getElementById('paypal-button-container')
    if (!container || !window.paypal) return
    container.innerHTML = ''

    window.paypal.Buttons({
      onClick: (data, actions) => {
        const errs = validate()
        if (Object.keys(errs).length > 0) {
          setErrors(errs)
          toast.error('Please complete all shipping fields first!')
          return actions.reject()
        }
        if (cartItems.length === 0) {
          toast.error('Your cart is empty!')
          return actions.reject()
        }
        return actions.resolve()
      },
      createOrder: (data, actions) => {
        const usdAmount = (grandTotal / 83.5).toFixed(2)
        return actions.order.create({
          purchase_units: [{
            amount: { value: usdAmount, currency_code: 'USD' },
            description: `Dream D'Accor — Order for ${form.email}`,
          }],
        })
      },
      onApprove: async (data, actions) => {
        setLoading(true)
        const loadingToast = toast.loading('Capturing PayPal payment...')
        try {
          const details = await actions.order.capture()
          const transactionId = details.id || details.purchase_units?.[0]?.payments?.captures?.[0]?.id
          toast.dismiss(loadingToast)
          const orderResult = await placeOrderViaAPI({ paymentId: transactionId, transactionId })
          if (orderResult.success) {
            clearCart()
            toast.success('Payment successful! Order confirmed.', { duration: 4500 })
            navigate('/order-success', { state: { orderId: orderResult.orderId, total: grandTotal, email: form.email } })
          } else {
            toast.error(orderResult.message || 'Order registration failed.')
          }
        } catch (err) {
          toast.dismiss(loadingToast)
          console.error('[checkout] PayPal capture error:', err)
          toast.error('Failed to capture PayPal payment.')
        } finally {
          setLoading(false)
        }
      },
      onError: (err) => {
        console.error('[checkout] PayPal SDK error:', err)
        toast.error('PayPal payment failed. Please retry.')
        setLoading(false)
      },
    }).render('#paypal-button-container')
  }, [grandTotal, form.email, cartItems])

  // ─── Razorpay Flow ────────────────────────────────────────────────────────
  const handleRazorpay = async () => {
    if (!window.Razorpay) {
      toast.error('Razorpay SDK not loaded. Please refresh and try again.')
      return
    }

    setLoading(true)
    const orderInitToast = toast.loading('Initializing payment...')

    let razorpayOrderId = ''
    let razorpayKey = import.meta.env.VITE_RAZORPAY_KEY || ''

    // Step 1: Create Razorpay order on backend
    try {
      const res = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: grandTotal }),
      })

      let orderData
      try {
        orderData = await res.json()
      } catch {
        const text = await res.text()
        throw new Error(`Non-JSON response from create-order (${res.status}): ${text.slice(0, 200)}`)
      }

      if (!res.ok || !orderData.success) {
        throw new Error(orderData.message || `Backend error ${res.status}`)
      }

      razorpayOrderId = orderData.orderId
      if (orderData.key) razorpayKey = orderData.key // use key from backend

      toast.dismiss(orderInitToast)
      console.log('[checkout] Razorpay order created:', razorpayOrderId)
    } catch (err) {
      toast.dismiss(orderInitToast)
      console.error('[checkout] create-order failed:', err.message)
      toast.error(`Payment init failed: ${err.message}`)
      setLoading(false)
      return
    }

    // Step 2: Open Razorpay checkout
    const options = {
      key: razorpayKey,
      amount: grandTotal * 100, // paise
      currency: 'INR',
      name: "Dream D'Accor",
      description: `Order of ${cartItems.length} item(s)`,
      image: 'https://ui-avatars.com/api/?name=DD&background=c8a97e&color=fff&size=128',
      order_id: razorpayOrderId,
      handler: async (response) => {
        // Payment successful — now verify on backend
        setLoading(true)
        const verifyToast = toast.loading('Verifying payment...')
        try {
          const verifyRes = await fetch(`${API_BASE}/api/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })

          let verifyData
          try {
            verifyData = await verifyRes.json()
          } catch {
            const text = await verifyRes.text()
            throw new Error(`Non-JSON verify response (${verifyRes.status}): ${text.slice(0, 200)}`)
          }

          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData.message || `Verification failed (${verifyRes.status})`)
          }

          toast.dismiss(verifyToast)
          console.log('[checkout] Payment verified:', response.razorpay_payment_id)

          // Step 3: Save order
          const saveToast = toast.loading('Saving your order...')
          const orderResult = await placeOrderViaAPI({
            paymentId: response.razorpay_payment_id,
            transactionId: response.razorpay_payment_id,
          })
          toast.dismiss(saveToast)

          if (orderResult.success) {
            clearCart()
            toast.success('Payment verified & order placed! 🎉', { duration: 4500 })
            navigate('/order-success', {
              state: {
                orderId: orderResult.orderId,
                total: grandTotal,
                email: form.email,
                customerName: `${form.firstName} ${form.lastName}`,
                productNames: cartItems.map(i => i.name),
              },
            })
          } else {
            // Payment was successful but order save failed — log prominently
            console.error('[checkout] ⚠️ Payment succeeded but order save failed:', orderResult.message)
            toast.error(
              `Payment received (${response.razorpay_payment_id}), but order save failed. Please contact support with this ID.`,
              { duration: 8000 }
            )
          }
        } catch (err) {
          toast.dismiss(verifyToast)
          console.error('[checkout] Payment verification/save error:', err.message)
          toast.error(err.message || 'Payment verification failed. Please contact support.')
        } finally {
          setLoading(false)
        }
      },
      prefill: {
        name: `${form.firstName} ${form.lastName}`,
        email: form.email,
        contact: form.phone,
      },
      theme: { color: '#c8a97e' },
      modal: {
        ondismiss: () => {
          console.log('[checkout] Razorpay modal dismissed by user')
          toast('Payment cancelled', { icon: '⚠️', duration: 2500 })
          setLoading(false)
        },
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', (response) => {
      console.error('[checkout] Razorpay payment.failed:', response.error)
      toast.error(`Payment failed: ${response.error.description || 'Unknown error'}`)
      setLoading(false)
    })

    setLoading(false) // Reset loading before opening modal (user is interacting)
    rzp.open()
  }

  // ─── COD Flow ─────────────────────────────────────────────────────────────
  const handleCOD = async () => {
    setLoading(true)
    const loadingToast = toast.loading('Placing your order...')
    try {
      const orderResult = await placeOrderViaAPI({
        paymentId: 'COD-' + Date.now(),
        transactionId: '',
      })
      toast.dismiss(loadingToast)

      if (orderResult.success) {
        clearCart()
        toast.success('Order placed! Pay on delivery. 📦', { duration: 4000 })
        navigate('/order-success', {
          state: {
            orderId: orderResult.orderId,
            total: grandTotal,
            email: form.email,
            customerName: `${form.firstName} ${form.lastName}`,
            productNames: cartItems.map(i => i.name),
          },
        })
      } else {
        toast.error(orderResult.message || 'Failed to place COD order.')
      }
    } catch (err) {
      toast.dismiss(loadingToast)
      console.error('[checkout] COD order error:', err)
      toast.error('Failed to reach server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Form Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Please fill in all required shipping fields correctly.')
      return
    }
    if (cartItems.length === 0) {
      toast.error('Your cart is empty!')
      return
    }

    if (form.paymentMethod === 'razorpay') {
      await handleRazorpay()
      return
    }

    if (form.paymentMethod === 'paypal') {
      toast.error('Please click the PayPal button below to complete payment.')
      return
    }

    if (form.paymentMethod === 'cod') {
      await handleCOD()
      return
    }
  }

  // ─── Empty Cart State ─────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <Header />
        <main className="page-wrapper">
          <div className="container">
            <div className="empty-state" style={{ paddingTop: 80 }}>
              <div className="empty-state-icon">🛒</div>
              <h3 className="empty-state-title">No items to checkout</h3>
              <p className="empty-state-text">Add items to your cart before checking out.</p>
              <a href="/shop" className="btn btn-accent">Go to Shop</a>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ─── Main Checkout UI ─────────────────────────────────────────────────────
  return (
    <div className="checkout-page">
      <Header />

      <main className="page-wrapper">
        <div className="container">
          <div className="checkout-header">
            <h1 className="section-title">Checkout</h1>
            <div className="checkout-steps">
              <div className="step active">1. Details</div>
              <div className="step-divider">›</div>
              <div className="step active">2. Payment</div>
              <div className="step-divider">›</div>
              <div className="step">3. Confirm</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="checkout-layout">
            {/* ── Left: Shipping + Payment ── */}
            <div className="checkout-form-section">
              {/* Shipping */}
              <div className="checkout-block card">
                <h2 className="block-title">Shipping Information</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      className={`form-input${errors.firstName ? ' input-error' : ''}`}
                      name="firstName" value={form.firstName}
                      onChange={handleChange} placeholder="John"
                      disabled={loading}
                    />
                    {errors.firstName && <span className="error-msg">{errors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      className={`form-input${errors.lastName ? ' input-error' : ''}`}
                      name="lastName" value={form.lastName}
                      onChange={handleChange} placeholder="Doe"
                      disabled={loading}
                    />
                    {errors.lastName && <span className="error-msg">{errors.lastName}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      className={`form-input${errors.email ? ' input-error' : ''}`}
                      name="email" type="email" value={form.email}
                      onChange={handleChange} placeholder="john@example.com"
                      disabled={loading}
                    />
                    {errors.email && <span className="error-msg">{errors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input
                      className={`form-input${errors.phone ? ' input-error' : ''}`}
                      name="phone" type="tel" value={form.phone}
                      onChange={handleChange} placeholder="9876543210" maxLength={10}
                      disabled={loading}
                    />
                    {errors.phone && <span className="error-msg">{errors.phone}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address *</label>
                  <input
                    className={`form-input${errors.address ? ' input-error' : ''}`}
                    name="address" value={form.address}
                    onChange={handleChange} placeholder="123, Street Name, Area"
                    disabled={loading}
                  />
                  {errors.address && <span className="error-msg">{errors.address}</span>}
                </div>

                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                      className={`form-input${errors.city ? ' input-error' : ''}`}
                      name="city" value={form.city}
                      onChange={handleChange} placeholder="Hyderabad"
                      disabled={loading}
                    />
                    {errors.city && <span className="error-msg">{errors.city}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input
                      className={`form-input${errors.state ? ' input-error' : ''}`}
                      name="state" value={form.state}
                      onChange={handleChange} placeholder="Telangana"
                      disabled={loading}
                    />
                    {errors.state && <span className="error-msg">{errors.state}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode *</label>
                    <input
                      className={`form-input${errors.pincode ? ' input-error' : ''}`}
                      name="pincode" value={form.pincode}
                      onChange={handleChange} placeholder="500001" maxLength={6}
                      disabled={loading}
                    />
                    {errors.pincode && <span className="error-msg">{errors.pincode}</span>}
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="checkout-block card">
                <h2 className="block-title">Payment Method</h2>
                <div className="payment-options">
                  {[
                    { value: 'razorpay', label: 'Razorpay', icon: '💳', desc: 'UPI · Cards · Net Banking · Wallets' },
                    { value: 'paypal', label: 'PayPal (Global)', icon: '🌍', desc: 'Credit Card or PayPal Account' },
                    { value: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives' },
                  ].map(opt => (
                    <label key={opt.value} className={`payment-option${form.paymentMethod === opt.value ? ' selected' : ''}`}>
                      <input
                        type="radio" name="paymentMethod" value={opt.value}
                        checked={form.paymentMethod === opt.value}
                        onChange={handleChange} className="payment-radio"
                        disabled={loading}
                      />
                      <span className="payment-icon">{opt.icon}</span>
                      <div>
                        <span className="payment-label">{opt.label}</span>
                        <span className="payment-desc">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="checkout-summary-section">
              <div className="checkout-summary card">
                <h2 className="block-title">Order Summary</h2>

                <div className="summary-items">
                  {cartItems.map(item => (
                    <div key={item.id} className="summary-item">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="summary-item-img"
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=80&q=60' }}
                      />
                      <div className="summary-item-info">
                        <p className="summary-item-name">{item.name}</p>
                        <p className="summary-item-qty text-muted">Qty: {item.quantity}</p>
                      </div>
                      <span className="summary-item-price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                <div className="divider" />

                <div className="summary-lines">
                  <div className="summary-line">
                    <span>Subtotal</span>
                    <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="summary-line">
                    <span>Delivery</span>
                    {deliveryFee === 0 ? (
                      <span className="delivery-free-badge">🎁 FREE</span>
                    ) : (
                      <span>₹{deliveryFee.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                  <div className="summary-line">
                    <span>GST (18%)</span>
                    <span>₹{tax.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Delivery progress */}
                {amountForFreeDelivery > 0 ? (
                  <div className="delivery-progress-wrap">
                    <p className="delivery-progress-msg">
                      🚚 Add <strong>₹{amountForFreeDelivery.toLocaleString('en-IN')}</strong> more for <strong>FREE delivery</strong>
                    </p>
                    <div className="delivery-progress-bar">
                      <div
                        className="delivery-progress-fill"
                        style={{ width: `${Math.min((cartTotal / FREE_DELIVERY_THRESHOLD) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="delivery-free-note">🎉 You qualify for free delivery!</div>
                )}

                <div className="divider" />

                <div className="summary-line summary-grand-total">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>

                {form.paymentMethod === 'paypal' ? (
                  <div className="paypal-btn-wrapper" style={{ marginTop: '16px' }}>
                    <div id="paypal-button-container" />
                    {loading && (
                      <p style={{ fontSize: '13px', textAlign: 'center', color: 'var(--color-accent)', marginTop: '8px' }}>
                        Processing payment...
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    type="submit"
                    id="place-order-btn"
                    className="btn btn-accent btn-lg place-order-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <><span className="spinner" /> Processing...</>
                    ) : (
                      <>🔒 {form.paymentMethod === 'cod' ? 'Place Order (COD)' : 'Pay'} · ₹{grandTotal.toLocaleString('en-IN')}</>
                    )}
                  </button>
                )}

                <p className="secure-note">🔒 Your payment info is 100% secure and encrypted.</p>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Checkout
