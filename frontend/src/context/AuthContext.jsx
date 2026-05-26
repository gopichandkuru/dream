import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// ── Token helpers ─────────────────────────────────────────────────────────────
const getStoredToken = () => {
  try { return localStorage.getItem('dd_auth_token') || null } catch { return null }
}

const persistToken = (token) => {
  try {
    if (token) {
      localStorage.setItem('dd_auth_token', token)
      Cookies.set('jwt_token', token, { expires: 7, sameSite: 'Lax' })
    } else {
      localStorage.removeItem('dd_auth_token')
      Cookies.remove('jwt_token')
    }
  } catch (e) {
    console.warn('[auth] Token storage error:', e.message)
  }
}

// ── Raw fetch — NO side effects, just returns data ────────────────────────────
const rawFetch = async (endpoint, options = {}) => {
  const token = getStoredToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
    let data = {}
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      data = await res.json()
    } else {
      const text = await res.text()
      data = { error: text || `HTTP ${res.status}` }
    }
    console.debug(`[auth] ${options.method || 'GET'} ${endpoint} → ${res.status}`, data)
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    console.error(`[auth] Network error on ${endpoint}:`, err.message)
    return { ok: false, status: 0, data: { error: err.message || 'Network error. Check your connection.' } }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(null)
  const [token, setToken]   = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Clear everything ────────────────────────────────────────────────────────
  const clearSession = useCallback((silent = false) => {
    console.debug('[auth] Clearing session, silent:', silent)
    persistToken(null)
    setUser(null)
    setToken(null)
  }, [])

  // ── Apply auth response from API ────────────────────────────────────────────
  const applyAuthResponse = useCallback((data) => {
    if (!data?.token || !data?.user) {
      throw new Error('Invalid auth response from server')
    }
    console.debug('[auth] Applying auth response, user:', data.user.email, 'role:', data.user.role)
    persistToken(data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  // ── Session validation on mount ─────────────────────────────────────────────
  // Validates stored token against server. If valid, restores session.
  // If invalid (expired, user deleted, etc.) — silently clears without any toast.
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = getStoredToken()
      if (!storedToken) {
        console.debug('[auth] No stored token — skipping session restore')
        setLoading(false)
        return
      }

      console.debug('[auth] Found stored token, validating with /me...')
      try {
        const { ok, status, data } = await rawFetch('/api/auth/me')

        if (ok && data?.user) {
          console.debug('[auth] ✅ Session restored:', data.user.email, 'role:', data.user.role)
          setToken(storedToken)
          setUser(data.user)
          // Refresh cookie too
          Cookies.set('jwt_token', storedToken, { expires: 7, sameSite: 'Lax' })
        } else {
          // Token is invalid (expired, user deleted, etc.) — clear silently
          console.debug('[auth] ❌ Session invalid (status:', status, ') — clearing token silently')
          clearSession(true) // silent = no toast
        }
      } catch (err) {
        // Network error on startup — don't clear session, just show degraded state
        // User might be offline temporarily
        console.warn('[auth] Session validation network error:', err.message)
        // Keep the token in state — user will get an error when they actually try to do something
        setToken(storedToken)
      } finally {
        setLoading(false)
      }
    }
    restoreSession()
  }, [clearSession])

  // ── LOGIN ───────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    console.debug('[auth] Login attempt:', email)
    const { ok, status, data } = await rawFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })

    if (!ok) {
      const msg = data?.error || 'Login failed. Please check your credentials.'
      console.error('[auth] Login failed:', status, msg)
      throw new Error(msg)
    }

    console.debug('[auth] ✅ Login success:', data.user?.email)
    return applyAuthResponse(data)
  }, [applyAuthResponse])

  // ── SIGNUP ──────────────────────────────────────────────────────────────────
  const signup = useCallback(async ({ fullName, email, password, confirmPassword, phoneNumber }) => {
    console.debug('[auth] Signup attempt:', email)
    const { ok, status, data } = await rawFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ fullName, email: email.trim().toLowerCase(), password, confirmPassword, phoneNumber }),
    })

    if (!ok) {
      const msg = data?.error || 'Signup failed. Please try again.'
      console.error('[auth] Signup failed:', status, msg)
      throw new Error(msg)
    }

    console.debug('[auth] ✅ Signup success:', data.user?.email)
    return applyAuthResponse(data)
  }, [applyAuthResponse])

  // ── GOOGLE LOGIN ────────────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async (accessToken) => {
    console.debug('[auth] Google login attempt...')
    const { ok, status, data } = await rawFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    })

    if (!ok) {
      const msg = data?.error || 'Google sign-in failed.'
      console.error('[auth] Google login failed:', status, msg)
      throw new Error(msg)
    }

    console.debug('[auth] ✅ Google login success:', data.user?.email)
    return applyAuthResponse(data)
  }, [applyAuthResponse])

  // ── LOGOUT ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    console.debug('[auth] Logout')
    clearSession(true)
    // Fire and forget — don't await
    rawFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    toast.success('Logged out successfully', { icon: '👋' })
  }, [clearSession])

  // ── FORGOT PASSWORD ─────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    const { ok, data } = await rawFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    if (!ok) throw new Error(data?.error || 'Request failed')
    return data
  }, [])

  // ── RESET PASSWORD ──────────────────────────────────────────────────────────
  const resetPassword = useCallback(async ({ token: resetToken, password, confirmPassword }) => {
    const { ok, data } = await rawFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, password, confirmPassword }),
    })
    if (!ok) throw new Error(data?.error || 'Reset failed')
    return applyAuthResponse(data)
  }, [applyAuthResponse])

  // ── UPDATE PROFILE ──────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (profileData) => {
    const { ok, data } = await rawFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
    if (!ok) throw new Error(data?.error || 'Profile update failed')
    setUser(data.user)
    return data.user
  }, [])

  // ── SYNC CART ───────────────────────────────────────────────────────────────
  const updateCart = useCallback(async (cartArray) => {
    const { ok, data } = await rawFetch('/api/auth/cart', {
      method: 'PUT',
      body: JSON.stringify({ cart: cartArray }),
    })
    if (!ok) console.warn('[auth] Cart sync failed:', data?.error)
    return ok
  }, [])

  // ── SYNC WISHLIST ───────────────────────────────────────────────────────────
  const updateWishlist = useCallback(async (wishlistArray) => {
    const { ok, data } = await rawFetch('/api/auth/wishlist', {
      method: 'PUT',
      body: JSON.stringify({ wishlist: wishlistArray }),
    })
    if (!ok) console.warn('[auth] Wishlist sync failed:', data?.error)
    return ok
  }, [])

  // ── Computed ─────────────────────────────────────────────────────────────────
  const isAuthenticated = !!token && !!user

  useEffect(() => {
    console.log(`[AuthContext State] 👤 User: ${user?.email || 'Guest'} | 🔑 Token: ${token ? token.slice(0, 15) + '...' : 'None'} | 🛡️ Authenticated: ${isAuthenticated} | ⏳ Loading: ${loading}`)
  }, [user, token, isAuthenticated, loading])

  if (process.env.NODE_ENV !== 'production') {
    // Debug helper visible in browser console
    window.__auth = { isAuthenticated, user, token: token?.slice(0, 30) + '...' }
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated,
      login,
      signup,
      loginWithGoogle,
      logout,
      forgotPassword,
      resetPassword,
      updateProfile,
      updateCart,
      updateWishlist,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

export default AuthContext
