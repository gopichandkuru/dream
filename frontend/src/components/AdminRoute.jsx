import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * AdminRoute — wraps a component that only admins can access.
 * - Not authenticated → redirect to /login
 * - Authenticated but not admin → redirect to /home with toast
 * - Admin → render children
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        flexDirection: 'column',
        gap: 16,
      }}>
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3, color: 'var(--color-accent)' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
          Verifying access…
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/home" replace />
  }

  return children
}

export default AdminRoute
