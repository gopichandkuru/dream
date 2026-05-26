import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "./AuthContext"

const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated, updateCart } = useAuth()
  
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem("dreamdecor_cart")
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Load cart from MongoDB when user logs in
  useEffect(() => {
    if (isAuthenticated && user && Array.isArray(user.cart)) {
      setCartItems(user.cart)
    } else if (!isAuthenticated) {
      // Local storage fallback for guests
      try {
        const saved = localStorage.getItem("dreamdecor_cart")
        setCartItems(saved ? JSON.parse(saved) : [])
      } catch {
        setCartItems([])
      }
    }
  }, [isAuthenticated, user])

  // Persist to localStorage and MongoDB when cartItems changes
  useEffect(() => {
    localStorage.setItem("dreamdecor_cart", JSON.stringify(cartItems))
    if (isAuthenticated) {
      updateCart(cartItems)
    }
  }, [cartItems, isAuthenticated, updateCart])

  const addToCart = useCallback((item) => {
    setCartItems(prev => {
      const existing = prev.find(each => each.id === item.id)
      if (existing) {
        return prev.map(each =>
          each.id === item.id
            ? { ...each, quantity: each.quantity + 1 }
            : each
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((id) => {
    setCartItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const increaseQuantity = useCallback((id) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    )
  }, [])

  const decreaseQuantity = useCallback((id) => {
    setCartItems(prev =>
      prev
        .map(item =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter(item => item.quantity > 0)
    )
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
  }, [])

  const isInCart = useCallback((id) => {
    return cartItems.some(item => item.id === id)
  }, [cartItems])

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)

  const cartTotal = cartItems.reduce((total, item) => {
    const price = typeof item.price === "number" ? item.price : 0
    return total + price * item.quantity
  }, 0)

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        isInCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within CartProvider")
  return context
}
