import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    // Clear any bad state from localStorage that might be causing crashes
    try {
      const keysToCheck = ['dd_auth_token']
      keysToCheck.forEach(key => {
        const val = localStorage.getItem(key)
        if (val && val === 'undefined') localStorage.removeItem(key)
      })
    } catch {}
    window.location.href = '/login'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 24,
          padding: '0 24px',
          background: 'var(--color-bg, #faf9f6)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text-primary, #1a1a1a)',
            marginBottom: 8,
          }}>
            <span style={{ color: '#c8a97e' }}>✦</span>
            Dream D&apos;Accor
          </div>

          {/* Error card */}
          <div style={{
            background: 'var(--color-bg-card, #fff)',
            border: '1px solid var(--color-border, #e8e2d9)',
            borderRadius: 20,
            padding: '40px 32px',
            maxWidth: 440,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--color-text-primary, #1a1a1a)',
              marginBottom: 10,
              fontFamily: "'Playfair Display', serif",
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: 14,
              color: 'var(--color-text-secondary, #555)',
              lineHeight: 1.7,
              marginBottom: 28,
            }}>
              An unexpected error occurred. This could be a temporary issue.
              Click below to return to the login page.
            </p>

            {/* Error details for debugging */}
            {this.state.error && (
              <details style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 24,
                textAlign: 'left',
                fontSize: 12,
                color: '#991b1b',
                cursor: 'pointer',
              }}>
                <summary style={{ fontWeight: 600, marginBottom: 6 }}>
                  Error Details (click to expand)
                </summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReload}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 9999,
                border: 'none',
                background: 'linear-gradient(135deg, #c8a97e 0%, #e8c99e 50%, #a8834e 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
