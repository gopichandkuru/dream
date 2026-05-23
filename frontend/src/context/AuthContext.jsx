import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_URL || ''

// ── API helper ────────────────────────────────────────────────────────────────
const authFetch = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem('dd_auth_token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    }
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
    let data
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await res.json()
    } else {
      const text = await res.text()
      data = { error: text || `HTTP error ${res.status}` }
    }
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    return { ok: false, status: 500, data: { error: err.message || 'Network error connection failed.' } }
  }
}

// ── Set/clear token in both localStorage and cookie ───────────────────────────
const persistToken = (token) => {
  if (token) {
    localStorage.setItem('dd_auth_token', token)
    Cookies.set('jwt_token', token, { expires: 7 })
  } else {
    localStorage.removeItem('dd_auth_token')
    Cookies.remove('jwt_token')
  }
}

// ══════════════════════════════════════════════════════════════════════════════
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('dd_auth_token'))
  const [loading, setLoading] = useState(true) // true while checking session on mount

  // ── On mount: validate stored token ────────────────────────────────────────
  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem('dd_auth_token')
      if (!storedToken) {
        setLoading(false)
        return
      }
      try {
        const { ok, data } = await authFetch('/api/auth/me')
        if (ok && data.user) {
          setUser(data.user)
          setToken(storedToken)
          // Keep cookie in sync
          Cookies.set('jwt_token', storedToken, { expires: 7 })
        } else {
          // Token invalid — clear it
          persistToken(null)
          setUser(null)
          setToken(null)
        }
      } catch {
        // Network error — keep token for offline-like degraded mode
        // but don't crash the app
      } finally {
        setLoading(false)
      }
    }
    validateSession()
  }, [])

  // ── Internal: apply a successful auth response ──────────────────────────────
  const applyAuthResponse = useCallback((data) => {
    const { token: newToken, user: newUser } = data
    persistToken(newToken)
    setToken(newToken)
    setUser(newUser)
  }, [])

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    const { ok, data } = await authFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!ok) throw new Error(data.error || 'Login failed')
    applyAuthResponse(data)
    return data.user
  }, [applyAuthResponse])

  // ── Signup ─────────────────────────────────────────────────────────────────
  const signup = useCallback(async ({ fullName, email, password, confirmPassword, phoneNumber }) => {
    const { ok, data } = await authFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password, confirmPassword, phoneNumber }),
    })
    if (!ok) throw new Error(data.error || 'Signup failed')
    return data // Returns { success, otpRequired, email, message }
  }, [])

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const verifyOtp = useCallback(async (email, otp) => {
    const { ok, data } = await authFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    })
    if (!ok) throw new Error(data.error || 'OTP verification failed')
    applyAuthResponse(data)
    return data.user
  }, [applyAuthResponse])

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const resendOtp = useCallback(async (email) => {
    const { ok, data } = await authFetch('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    if (!ok) throw new Error(data.error || 'Resending OTP failed')
    return data
  }, [])

  // ── Google Login ──────────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async (idToken) => {
    const { ok, data } = await authFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    })
    if (!ok) throw new Error(data.error || 'Google sign-in failed')
    applyAuthResponse(data)
    return data.user
  }, [applyAuthResponse])

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    persistToken(null)
    setToken(null)
    setUser(null)
    // Fire-and-forget backend logout (stateless JWT — just for any future server-side cleanup)
    authFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    toast.success('Logged out successfully', { icon: '👋' })
  }, [])

  // ── Forgot password ────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    const { ok, data } = await authFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    if (!ok) throw new Error(data.error || 'Request failed')
    return data
  }, [])

  // ── Reset password ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(async ({ token: resetToken, password, confirmPassword }) => {
    const { ok, data } = await authFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, password, confirmPassword }),
    })
    if (!ok) throw new Error(data.error || 'Reset failed')
    applyAuthResponse(data)
    return data.user
  }, [applyAuthResponse])

  const isAuthenticated = !!token && !!user

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated,
      login,
      signup,
      verifyOtp,
      resendOtp,
      loginWithGoogle,
      logout,
      forgotPassword,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
