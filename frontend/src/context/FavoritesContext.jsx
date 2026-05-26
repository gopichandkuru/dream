import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "./AuthContext"

const FavoritesContext = createContext()

export const FavoritesProvider = ({ children }) => {
  const { user, isAuthenticated, updateWishlist } = useAuth()
  
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("dreamdecor_favorites")
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Load wishlist from MongoDB when user logs in
  useEffect(() => {
    if (isAuthenticated && user && Array.isArray(user.wishlist)) {
      setFavorites(user.wishlist)
    } else if (!isAuthenticated) {
      // Local storage fallback for guests
      try {
        const saved = localStorage.getItem("dreamdecor_favorites")
        setFavorites(saved ? JSON.parse(saved) : [])
      } catch {
        setFavorites([])
      }
    }
  }, [isAuthenticated, user])

  // Persist to localStorage and MongoDB when favorites changes
  useEffect(() => {
    localStorage.setItem("dreamdecor_favorites", JSON.stringify(favorites))
    if (isAuthenticated) {
      updateWishlist(favorites)
    }
  }, [favorites, isAuthenticated, updateWishlist])

  const addToFavorites = useCallback((item) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === item.id)) return prev
      return [...prev, item]
    })
  }, [])

  const removeFromFavorites = useCallback((id) => {
    setFavorites(prev => prev.filter(item => item.id !== id))
  }, [])

  const isFavorite = useCallback((id) => {
    return favorites.some(item => item.id === id)
  }, [favorites])

  const toggleFavorite = useCallback((item) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === item.id)
      if (exists) {
        return prev.filter(f => f.id !== item.id)
      }
      return [...prev, item]
    })
  }, [])

  return (
    <FavoritesContext.Provider
      value={{ favorites, addToFavorites, removeFromFavorites, isFavorite, toggleFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error("useFavorites must be used within FavoritesProvider")
  return context
}
