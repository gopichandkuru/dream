import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi'
import { FcGoogle } from 'react-icons/fc'
import { useGoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import ForgotPasswordModal from './ForgotPasswordModal'
import './index.css'

// ── Validation helper ────────────────────────────────────────────────────────
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

// ── Password strength helper ──────────────────────────────────────────────────
const checkPasswordStrength = (pw) => {
  if (!pw) return { score: 0, text: '', color: '', pct: 0 }
  let score = 0
  if (pw.length >= 6) score += 1
  if (pw.length >= 10) score += 1
  if (/[A-Z]/.test(pw)) score += 1
  if (/[0-9]/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1

  let text = 'Weak'
  let color = '#ef4444'
  let pct = 20
  if (score >= 4) {
    text = 'Strong'
    color = '#10b981'
    pct = 100
  } else if (score >= 2) {
    text = 'Medium'
    color = '#f59e0b'
    pct = 60
  }
  return { score, text, color, pct }
}

const LoginForm = () => {
  const { login, signup, loginWithGoogle, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // ── Panel mode: 'login' | 'signup' ───────────────────────────────────────
  const [mode, setMode] = useState('login')

  // ── Login fields ─────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // ── Signup fields ─────────────────────────────────────────────────────────
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirm, setSignupConfirm] = useState('')
  const [showSignupPw, setShowSignupPw] = useState(false)
  const [showSignupConfirm, setShowSignupConfirm] = useState(false)

  // ── Shared state ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showForgotModal, setShowForgotModal] = useState(false)

  // ── Redirect if already authenticated ────────────────────────────────────
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/home', { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate])

  // ── Switch mode ───────────────────────────────────────────────────────────
  const switchMode = (newMode) => {
    setMode(newMode)
    setErrors({})
  }

  // ── Field change: clear error on change ───────────────────────────────────
  const clearError = (field) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  // ── Validate login ────────────────────────────────────────────────────────
  const validateLogin = () => {
    const errs = {}
    if (!isValidEmail(loginEmail)) errs.loginEmail = 'Enter a valid email address'
    if (loginPassword.length < 4) errs.loginPassword = 'Password must be at least 4 characters'
    return errs
  }

  // ── Validate signup ───────────────────────────────────────────────────────
  const validateSignup = () => {
    const errs = {}
    if (signupName.trim().length < 2) errs.signupName = 'Name must be at least 2 characters'
    if (!isValidEmail(signupEmail)) errs.signupEmail = 'Enter a valid email address'
    if (signupPassword.length < 6) errs.signupPassword = 'Password must be at least 6 characters'
    if (signupConfirm !== signupPassword) errs.signupConfirm = 'Passwords do not match'
    return errs
  }

  // ── Submit Login ──────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    const errs = validateLogin()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      await login({ email: loginEmail, password: loginPassword })
      toast.success('Welcome back to Dream D\'Accor!', { icon: '✦', duration: 3000 })
      navigate('/home')
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  // ── Submit Signup (Direct — No OTP) ──────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault()
    const errs = validateSignup()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      const user = await signup({
        fullName: signupName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        confirmPassword: signupConfirm,
        phoneNumber: signupPhone.trim() || undefined,
      })

      toast.success(`Welcome to Dream D'Accor, ${user.fullName.split(' ')[0]}! ✦`, { duration: 4000 })
      navigate('/home')
    } catch (err) {
      console.error('[Signup error]', err)
      toast.error(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Google Login ──────────────────────────────────────────────────────────
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      try {
        const user = await loginWithGoogle(tokenResponse.access_token)
        toast.success(`Welcome, ${user.fullName.split(' ')[0]}! ✦`, { duration: 3000 })
        navigate('/home')
      } catch (err) {
        toast.error(err.message || 'Google sign-in failed. Please try again.')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => {
      toast.error('Google sign-in was cancelled or failed.')
      setGoogleLoading(false)
    },
    flow: 'implicit',
  })

  const handleGoogleClick = () => {
    googleLogin()
  }

  // Calculate password strength
  const strength = checkPasswordStrength(signupPassword)

  // ── Loading screen while checking session ─────────────────────────────────
  if (authLoading) {
    return (
      <div className="login-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, color: 'var(--color-accent)' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Connecting to account...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="login-page">
        {/* ── Left panel - hero ── */}
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
              Transform Your<br />Living Space
            </h2>
            <p className="login-hero-sub">
              Premium furniture and decor for every lifestyle.
            </p>
            <div className="login-hero-stats">
              <div className="login-stat">
                <span className="login-stat-val">2000+</span>
                <span className="login-stat-label">Products</span>
              </div>
              <div className="login-stat">
                <span className="login-stat-val">20K+</span>
                <span className="login-stat-label">Customers</span>
              </div>
              <div className="login-stat">
                <span className="login-stat-val">4.9★</span>
                <span className="login-stat-label">Rating</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel - form ── */}
        <div className="login-form-panel">
          <div className="login-form-inner">
            {/* Mobile logo */}
            <div className="login-form-logo-mobile">
              <span style={{ color: 'var(--color-accent)' }}>✦</span> Dream D&apos;Accor
            </div>

            {/* ── Tab Toggle ── */}
            <div className="auth-tab-row">
              <button
                className={`auth-tab${mode === 'login' ? ' auth-tab-active' : ''}`}
                onClick={() => switchMode('login')}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`auth-tab${mode === 'signup' ? ' auth-tab-active' : ''}`}
                onClick={() => switchMode('signup')}
                type="button"
              >
                Create Account
              </button>
            </div>

            {/* ── Form slide wrapper ── */}
            <div className="auth-form-slider">
              {/* ════════════════════ LOGIN FORM ════════════════════ */}
              <div className={`auth-form-slide${mode === 'login' ? ' auth-slide-visible' : ' auth-slide-hidden'}`}>
                <h1 className="login-form-title">Welcome Back</h1>
                <p className="login-form-subtitle">Sign in to access your account</p>

                <form className="login-form" onSubmit={handleLogin}>
                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="login-email">Email Address</label>
                    <input
                      id="login-email"
                      type="email"
                      className={`form-input${errors.loginEmail ? ' input-error' : ''}`}
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={e => { setLoginEmail(e.target.value); clearError('loginEmail') }}
                      autoComplete="email"
                    />
                    {errors.loginEmail && <span className="error-msg">{errors.loginEmail}</span>}
                  </div>

                  {/* Password */}
                  <div className="form-group">
                    <div className="form-label-row">
                      <label className="form-label" htmlFor="login-password">Password</label>
                      <button
                        type="button"
                        className="forgot-pw-link"
                        onClick={() => setShowForgotModal(true)}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="password-wrap">
                      <input
                        id="login-password"
                        type={showLoginPw ? 'text' : 'password'}
                        className={`form-input${errors.loginPassword ? ' input-error' : ''}`}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={e => { setLoginPassword(e.target.value); clearError('loginPassword') }}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="eye-toggle"
                        onClick={() => setShowLoginPw(p => !p)}
                        aria-label="Toggle password visibility"
                      >
                        {showLoginPw ? <HiOutlineEye /> : <HiOutlineEyeOff />}
                      </button>
                    </div>
                    {errors.loginPassword && <span className="error-msg">{errors.loginPassword}</span>}
                  </div>

                  {/* Remember Me */}
                  <div className="remember-me-row">
                    <label className="remember-me-label">
                      <input
                        type="checkbox"
                        className="remember-me-checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                      />
                      <span>Remember me for 7 days</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-accent login-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (<><span className="spinner" /> Signing in...</>) : 'Sign In →'}
                  </button>
                </form>

                {/* Divider */}
                <div className="login-divider"><span>or continue with</span></div>

                {/* Google Button */}
                <button
                  type="button"
                  className="google-btn"
                  onClick={handleGoogleClick}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <><span className="spinner" style={{ borderTopColor: '#4285f4' }} /> Connecting...</>
                  ) : (
                    <><FcGoogle size={20} /> Continue with Google</>
                  )}
                </button>

                <p className="auth-switch-text">
                  Don&apos;t have an account?{' '}
                  <button type="button" className="auth-switch-link" onClick={() => switchMode('signup')}>
                    Create one free
                  </button>
                </p>
              </div>

              {/* ════════════════════ SIGNUP FORM ════════════════════ */}
              <div className={`auth-form-slide${mode === 'signup' ? ' auth-slide-visible' : ' auth-slide-hidden'}`}>
                <h1 className="login-form-title">Create Account</h1>
                <p className="login-form-subtitle">Join Dream D&apos;Accor today</p>

                <form className="login-form" onSubmit={handleSignup}>
                  {/* Full Name */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-name">Full Name</label>
                    <input
                      id="signup-name"
                      type="text"
                      className={`form-input${errors.signupName ? ' input-error' : ''}`}
                      placeholder="Your full name"
                      value={signupName}
                      onChange={e => { setSignupName(e.target.value); clearError('signupName') }}
                      autoComplete="name"
                    />
                    {errors.signupName && <span className="error-msg">{errors.signupName}</span>}
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-email">Email Address</label>
                    <input
                      id="signup-email"
                      type="email"
                      className={`form-input${errors.signupEmail ? ' input-error' : ''}`}
                      placeholder="your@email.com"
                      value={signupEmail}
                      onChange={e => { setSignupEmail(e.target.value); clearError('signupEmail') }}
                      autoComplete="email"
                    />
                    {errors.signupEmail && <span className="error-msg">{errors.signupEmail}</span>}
                  </div>

                  {/* Phone */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-phone">Phone Number <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                    <input
                      id="signup-phone"
                      type="tel"
                      className="form-input"
                      placeholder="+91 98765 43210"
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>

                  {/* Password */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-password">Password</label>
                    <div className="password-wrap">
                      <input
                        id="signup-password"
                        type={showSignupPw ? 'text' : 'password'}
                        className={`form-input${errors.signupPassword ? ' input-error' : ''}`}
                        placeholder="Min. 6 characters"
                        value={signupPassword}
                        onChange={e => { setSignupPassword(e.target.value); clearError('signupPassword') }}
                        autoComplete="new-password"
                      />
                      <button type="button" className="eye-toggle" onClick={() => setShowSignupPw(p => !p)} aria-label="Toggle password">
                        {showSignupPw ? <HiOutlineEye /> : <HiOutlineEyeOff />}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {signupPassword && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Password Strength:</span>
                          <span style={{ fontSize: '11px', color: strength.color, fontWeight: 700 }}>{strength.text}</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${strength.pct}%`, height: '100%', background: strength.color, transition: 'all 0.3s ease' }} />
                        </div>
                      </div>
                    )}
                    {errors.signupPassword && <span className="error-msg">{errors.signupPassword}</span>}
                  </div>

                  {/* Confirm Password */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="signup-confirm">Confirm Password</label>
                    <div className="password-wrap">
                      <input
                        id="signup-confirm"
                        type={showSignupConfirm ? 'text' : 'password'}
                        className={`form-input${errors.signupConfirm ? ' input-error' : ''}`}
                        placeholder="Repeat your password"
                        value={signupConfirm}
                        onChange={e => { setSignupConfirm(e.target.value); clearError('signupConfirm') }}
                        autoComplete="new-password"
                      />
                      <button type="button" className="eye-toggle" onClick={() => setShowSignupConfirm(p => !p)} aria-label="Toggle confirm password">
                        {showSignupConfirm ? <HiOutlineEye /> : <HiOutlineEyeOff />}
                      </button>
                    </div>
                    {errors.signupConfirm && <span className="error-msg">{errors.signupConfirm}</span>}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-accent login-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (<><span className="spinner" /> Creating Account...</>) : 'Create Account →'}
                  </button>
                </form>

                {/* Divider */}
                <div className="login-divider"><span>or continue with</span></div>

                {/* Google Button */}
                <button
                  type="button"
                  className="google-btn"
                  onClick={handleGoogleClick}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <><span className="spinner" style={{ borderTopColor: '#4285f4' }} /> Connecting...</>
                  ) : (
                    <><FcGoogle size={20} /> Sign up with Google</>
                  )}
                </button>

                <p className="auth-switch-text">
                  Already have an account?{' '}
                  <button type="button" className="auth-switch-link" onClick={() => switchMode('login')}>
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
      )}
    </>
  )
}

export default LoginForm
