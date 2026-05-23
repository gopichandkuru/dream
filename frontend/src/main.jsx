import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

import ErrorBoundary from './components/ErrorBoundary'
import { FavoritesProvider } from './context/FavoritesContext'
import { CartProvider } from './context/CartContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
)
