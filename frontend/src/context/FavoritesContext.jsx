import { createContext, useContext, useState, useEffect, useCallback } from "react"

const FavoritesContext = createContext()

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("dreamdecor_favorites")
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem("dreamdecor_favorites", JSON.stringify(favorites))
  }, [favorites])

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
