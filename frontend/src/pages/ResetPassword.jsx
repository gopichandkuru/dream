import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const ResetPassword = () => {
  const { resetPassword, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link. Please request a new one.')
      navigate('/login')
    }
  }, [token, navigate])

  useEffect(() => {
    if (isAuthenticated) navigate('/home', { replace: true })
  }, [isAuthenticated, navigate])

  const validate = () => {
    const errs = {}
    if (password.length < 6) errs.password = 'Password must be at least 6 characters'
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      await resetPassword({ token, password, confirmPassword })
      setSuccess(true)
      toast.success('Password reset successfully! Welcome back. ✦', { duration: 4000 })
      setTimeout(() => navigate('/home'), 2000)
    } catch (err) {
      toast.error(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return null

  return (
    <div className="login-page">
      {/* Hero panel (same as login) */}
      <div className="login-hero">
        <div className="login-hero-bg">
          <img
            src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80"
            alt="Beautiful interior"
            className="login-hero-img"
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80' }}
          />
          <div className="login-hero-overlay" />
        </div>
        <div className="login-hero-content">
          <div className="login-logo">
            <span className="login-logo-icon">✦</span>
            Dream D&apos;Accor
          </div>
          <h2 className="login-hero-title">
            Your Premium<br />Account Awaits
          </h2>
          <p className="login-hero-sub">Set a new password to regain access.</p>
          <div className="login-hero-stats">
            <div className="login-stat"><span className="login-stat-val">2000+</span><span className="login-stat-label">Products</span></div>
            <div className="login-stat"><span className="login-stat-val">20K+</span><span className="login-stat-label">Customers</span></div>
            <div className="login-stat"><span className="login-stat-val">4.9★</span><span className="login-stat-label">Rating</span></div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-form-logo-mobile">
            <span style={{ color: 'var(--color-accent)' }}>✦</span> Dream D&apos;Accor
          </div>

          {!success ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--color-accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginBottom: 16,
                }}>🔐</div>
                <h1 className="login-form-title">Reset Password</h1>
                <p className="login-form-subtitle">Create a new secure password for your account</p>
              </div>

              <form className="login-form" onSubmit={handleSubmit}>
                {/* New Password */}
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="password-wrap">
                    <input
                      id="reset-password"
                      type={showPw ? 'text' : 'password'}
                      className={`form-input${errors.password ? ' input-error' : ''}`}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: '' })) }}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button type="button" className="eye-toggle" onClick={() => setShowPw(p => !p)} aria-label="Toggle password">
                      {showPw ? <HiOutlineEye /> : <HiOutlineEyeOff />}
                    </button>
                  </div>
                  {errors.password && <span className="error-msg">{errors.password}</span>}
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <div className="password-wrap">
                    <input
                      id="reset-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      className={`form-input${errors.confirmPassword ? ' input-error' : ''}`}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: '' })) }}
                      autoComplete="new-password"
                    />
                    <button type="button" className="eye-toggle" onClick={() => setShowConfirm(p => !p)} aria-label="Toggle confirm">
                      {showConfirm ? <HiOutlineEye /> : <HiOutlineEyeOff />}
                    </button>
                  </div>
                  {errors.confirmPassword && <span className="error-msg">{errors.confirmPassword}</span>}
                </div>

                <button
                  type="submit"
                  className="btn btn-accent login-submit-btn"
                  disabled={loading}
                >
                  {loading ? (<><span className="spinner" /> Resetting...</>) : 'Reset Password →'}
                </button>
              </form>

              <p className="auth-switch-text" style={{ marginTop: 20 }}>
                Remember your password?{' '}
                <button type="button" className="auth-switch-link" onClick={() => navigate('/login')}>
                  Sign in
                </button>
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
              <h1 className="login-form-title" style={{ marginBottom: 12 }}>Password Reset!</h1>
              <p className="login-form-subtitle">
                Your password has been updated successfully. Redirecting you to the app...
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                <span className="spinner" style={{ width: 24, height: 24, color: 'var(--color-accent)' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
