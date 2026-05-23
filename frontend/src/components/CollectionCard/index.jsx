import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { useFavorites } from '../../context/FavoritesContext'
import toast from 'react-hot-toast'
import './index.css'

const CollectionCard = ({ details }) => {
  const { id, name, image, price, rating, reviews, category, badge } = details
  const { addToCart, isInCart } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleAddToCart = () => {
    addToCart(details)
    toast.success(`${name} added to cart!`, { icon: '🛍', duration: 2500 })
  }

  const handleToggleFavorite = () => {
    toggleFavorite(details)
    const fav = isFavorite(id)
    toast(fav ? 'Removed from favorites' : `${name} saved!`, {
      icon: fav ? '💔' : '❤️',
      duration: 2000,
    })
  }

  const starCount = Math.round(rating)

  return (
    <div className="collection-card card">
      {/* Image */}
      <div className="col-card-img-wrap">
        {!imageLoaded && <div className="skeleton col-img-skeleton" />}
        <img
          src={image}
          alt={name}
          className={`col-card-img${imageLoaded ? ' loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
          onError={e => {
            e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=70'
            setImageLoaded(true)
          }}
        />

        {badge && (
          <span className="col-badge badge badge-accent">{badge}</span>
        )}

        <button
          className={`col-fav-btn${isFavorite(id) ? ' favorited' : ''}`}
          onClick={handleToggleFavorite}
          aria-label="Toggle favorite"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill={isFavorite(id) ? '#ef4444' : 'none'}
            stroke={isFavorite(id) ? '#ef4444' : 'currentColor'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="col-card-body">
        <p className="col-category text-muted">{category}</p>
        <h3 className="col-name">{name}</h3>

        {/* Rating */}
        <div className="col-rating">
          <span className="stars">
            {'★'.repeat(starCount)}{'☆'.repeat(5 - starCount)}
          </span>
          <span className="text-muted" style={{ fontSize: 12 }}>
            {rating} ({reviews} reviews)
          </span>
        </div>

        {/* Price & CTA */}
        <div className="col-footer">
          <div>
            <p className="col-price">
              <span className="price-symbol">₹</span>{price.toLocaleString('en-IN')}
            </p>
          </div>
          <button
            className={`btn btn-sm${isInCart(id) ? ' btn-outline' : ' btn-primary'}`}
            onClick={handleAddToCart}
          >
            {isInCart(id) ? '✓ Added' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CollectionCard