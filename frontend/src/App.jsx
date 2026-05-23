import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'

import ErrorBoundary from './components/ErrorBoundary'
import LoginForm from './components/LoginForm'
import Home from './components/Home'
import Shop from './components/Shop'
import Collections from './components/Collections'
import Favorites from './components/Favorites'
import ContactDetails from './components/ContactDetails'
import About from './components/About'
import Cart from './components/AddCart'
import Checkout from './components/Checkout'
import OrderSuccess from './components/OrderSuccess'
import Reviews from './components/Reviews'
import ReviewsPage from './components/ReviewsPage'
import ProtectedRoute from './components/ProtectedRoute'
import NotFound from './components/NotFound'
import ResetPassword from './pages/ResetPassword'

// ── Google Client ID — @react-oauth/google CRASHES if clientId is empty string.
// Use a safe placeholder so the provider mounts without crashing.
// Google Sign-In button is disabled at the UI level when no real clientId is set.
const RAW_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_ID = RAW_GOOGLE_CLIENT_ID.trim() || 'placeholder-no-google-oauth'

const App = () => {
  console.log("VITE_GOOGLE_CLIENT_ID loaded:", import.meta.env.VITE_GOOGLE_CLIENT_ID)
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          {/* Global Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              },
              success: {
                iconTheme: { primary: '#22c55e', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />

          <Routes>
            {/* Default route */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
            <Route path="/collections" element={<ProtectedRoute><Collections /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
            <Route path="/contact" element={<ProtectedRoute><ContactDetails /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/order-success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
            <Route path="/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />

            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  )
}

export default App
