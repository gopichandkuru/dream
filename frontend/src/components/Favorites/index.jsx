import { Link } from 'react-router-dom'
import Header from '../Header'
import Footer from '../Footer'
import { useFavorites } from '../../context/FavoritesContext'
import { useCart } from '../../context/CartContext'
import toast from 'react-hot-toast'
import './index.css'

const Favorites = () => {
  const { favorites, removeFromFavorites } = useFavorites()
  const { addToCart, isInCart } = useCart()

  const handleRemove = (item) => {
    removeFromFavorites(item.id)
    toast(`${item.name} removed from favorites`, { icon: '💔', duration: 2000 })
  }

  const handleAddToCart = (item) => {
    addToCart(item)
    toast.success(`${item.name} added to cart!`, { icon: '🛍', duration: 2500 })
  }

  return (
    <div className="favorites-page">
      <Header />

      <main className="page-wrapper">
        <div className="container">
          <div className="favorites-header">
            <div>
              <div className="badge badge-accent" style={{ marginBottom: 12 }}>Saved Items</div>
              <h1 className="section-title">Your Wishlist</h1>
              <p className="text-secondary" style={{ marginTop: 6, fontSize: 14 }}>
                {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
          </div>

          {favorites.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🤍</div>
              <h3 className="empty-state-title">Your wishlist is empty</h3>
              <p className="empty-state-text">
                Save your favorite pieces by clicking the heart icon on any product.
              </p>
              <Link to="/collections" className="btn btn-accent btn-lg">
                Browse Collections
              </Link>
            </div>
          ) : (
            <div className="favorites-grid">
              {favorites.map(item => (
                <div key={item.id} className="favorite-card card">
                  <div className="fav-img-wrap">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="fav-img"
                      onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=70' }}
                    />
                    <button
                      className="fav-remove-btn"
                      onClick={() => handleRemove(item)}
                      aria-label="Remove from favorites"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="fav-card-body">
                    <p className="text-muted fav-category">{item.category}</p>
                    <h3 className="fav-name">{item.name}</h3>

                    <div className="fav-rating">
                      <span className="stars" style={{ color: '#f59e0b', fontSize: 13 }}>
                        {'★'.repeat(Math.floor(item.rating || 4))}{'☆'.repeat(5 - Math.floor(item.rating || 4))}
                      </span>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {item.rating || 4.5} ({item.reviews || 0})
                      </span>
                    </div>

                    <div className="fav-footer">
                      <span className="fav-price">
                        <span className="price-symbol">₹</span>
                        {item.price?.toLocaleString('en-IN')}
                      </span>
                      <button
                        className={`btn btn-sm${isInCart(item.id) ? ' btn-outline' : ' btn-accent'}`}
                        onClick={() => handleAddToCart(item)}
                      >
                        {isInCart(item.id) ? '✓ In Cart' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Favorites
