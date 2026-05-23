import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const ForgotPasswordModal = ({ onClose }) => {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address')
      return
    }
    setLoading(true)
    setError('')
    try {
      await forgotPassword(email)
      setSent(true)
      toast.success('Reset link sent! Check your inbox.', { icon: '📧' })
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="forgot-modal">
        {/* Close button */}
        <button className="forgot-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {!sent ? (
          <>
            <div className="forgot-modal-icon">🔑</div>
            <h2 className="forgot-modal-title">Forgot Password?</h2>
            <p className="forgot-modal-sub">
              Enter your email address and we&apos;ll send you a secure link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  className={`form-input${error ? ' input-error' : ''}`}
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoFocus
                  autoComplete="email"
                />
                {error && <span className="error-msg">{error}</span>}
              </div>

              <button
                type="submit"
                className="btn btn-accent"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner" /> Sending link...</>
                ) : (
                  'Send Reset Link →'
                )}
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 13 }}
                onClick={onClose}
              >
                Cancel
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div className="forgot-success-icon">✉️</div>
            <h2 className="forgot-modal-title" style={{ textAlign: 'center' }}>Check Your Inbox</h2>
            <p className="forgot-modal-sub" style={{ textAlign: 'center' }}>
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
              It will expire in 1 hour.
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 24 }}>
              Didn&apos;t receive it? Check your spam folder or try again.
            </p>
            <button
              type="button"
              className="btn btn-accent"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
              onClick={onClose}
            >
              Back to Sign In
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
              onClick={() => { setSent(false); setEmail('') }}
            >
              Resend with different email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordModal
