import { Link } from 'react-router-dom'
import './index.css'

const NotFound = () => {
  return (
    <div className="notfound-page">
      <div className="notfound-content">
        <div className="notfound-number">404</div>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-text">
          Oops! The page you are looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>
        <div className="notfound-actions">
          <Link to="/home" className="btn btn-accent btn-lg">
            Back to Home
          </Link>
          <Link to="/shop" className="btn btn-outline btn-lg">
            Browse Shop
          </Link>
        </div>
        <div className="notfound-decoration">🛋 🪴 🛏 🪑 💡</div>
      </div>
    </div>
  )
}

export default NotFound
