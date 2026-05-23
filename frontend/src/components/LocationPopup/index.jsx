import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './location.css'

const STORE = {
  name: 'Dream D\'Accor Store',
  address: 'Jubilee Hills, Hyderabad,\nTelangana 500033',
}

function getDeliveryDate(days = 2) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

const LocationPopup = ({ onClose, onLocationChange }) => {
  const [location, setLocation] = useState(null)
  const [pincode, setPincode] = useState('')
  const [inputPin, setInputPin] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error | pin-checking | pin-error | pin-ok
  const [distance, setDistance] = useState(null)
  const [deliverable, setDeliverable] = useState(null)
  const [cityName, setCityName] = useState('')

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error')
      return
    }
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          const data = await res.json()
          const addr = data.address
          const city = addr.city || addr.town || addr.village || addr.county || 'Your City'
          const state = addr.state || ''
          const pin = addr.postcode || '500034'
          const area = addr.suburb || addr.neighbourhood || addr.road || city
          setCityName(`${area}, ${city}`)
          setLocation({ city, state, pin, area, lat: latitude, lon: longitude })
          setPincode(pin)
          // Simulate distance
          const dist = +(Math.random() * 8 + 2).toFixed(1)
          setDistance(dist)
          setDeliverable(true)
          setStatus('success')
          onLocationChange?.(`${area}, ${city}`)
        } catch {
          setCityName('Banjara Hills, Hyd')
          setLocation({ city: 'Hyderabad', state: 'Telangana', pin: '500034', area: 'Banjara Hills' })
          setPincode('500034')
          setDistance(6.4)
          setDeliverable(true)
          setStatus('success')
          onLocationChange?.('Banjara Hills, Hyd')
        }
      },
      () => {
        setStatus('error')
      },
      { timeout: 8000 }
    )
  }

  const checkPincode = () => {
    if (inputPin.length !== 6 || !/^\d{6}$/.test(inputPin)) {
      setStatus('pin-error')
      return
    }
    setStatus('pin-checking')
    setTimeout(() => {
      const del = parseInt(inputPin[0]) >= 5
      setDeliverable(del)
      setPincode(inputPin)
      setStatus('pin-ok')
      setDistance(del ? +(Math.random() * 12 + 1).toFixed(1) : null)
      if (del) onLocationChange?.(`Pincode ${inputPin}`)
    }, 800)
  }

  const overlayV = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
  const panelV   = { hidden: { opacity: 0, scale: 0.92, y: 20 }, visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 300 } }, exit: { opacity: 0, scale: 0.92, y: 20 } }

  return (
    <AnimatePresence>
      <motion.div className="loc-overlay" variants={overlayV} initial="hidden" animate="visible" exit="exit" onClick={onClose}>
        <motion.div className="loc-panel" variants={panelV} onClick={e => e.stopPropagation()}>
          <div className="loc-header">
            <div className="loc-title">
              <span className="loc-icon">📍</span>
              Your Location
            </div>
            <button className="loc-close" onClick={onClose}>✕</button>
          </div>

          {/* Detected Location */}
          {status === 'success' && location && (
            <div className="loc-current">
              <div className="loc-label">Current Location</div>
              <div className="loc-city">{location.area}, {location.city}</div>
              <div className="loc-state">{location.state} {location.pin}</div>
              <div className={`loc-deliverable ${deliverable ? 'yes' : 'no'}`}>
                {deliverable ? '✓ Deliverable' : '✗ Not Deliverable'}
              </div>
              <div className="loc-info-grid">
                <div className="loc-info-item">
                  <span className="lii-label">Distance from store</span>
                  <span className="lii-val">{distance} km</span>
                </div>
                <div className="loc-info-item">
                  <span className="lii-label">Estimated Delivery</span>
                  <span className="lii-val">1–2 Days</span>
                </div>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="loc-loading">
              <div className="loc-spinner" />
              <span>Detecting your location…</span>
            </div>
          )}

          {(status === 'idle' || status === 'error') && (
            <div className="loc-detect-section">
              {status === 'error' && <p className="loc-error">Could not detect location. Please allow location access or enter pincode below.</p>}
              <button className="btn btn-accent loc-detect-btn" onClick={detectLocation}>
                📍 Detect My Location
              </button>
            </div>
          )}

          {/* Store Location */}
          <div className="loc-store">
            <div className="loc-label">Store Location</div>
            <div className="loc-city">{STORE.name}</div>
            <div className="loc-state" style={{ whiteSpace: 'pre-line' }}>{STORE.address}</div>
          </div>

          {/* Pincode Check */}
          <div className="loc-pin-section">
            <div className="loc-label">Change Pincode</div>
            <div className="loc-pin-row">
              <input
                type="text"
                className="loc-pin-input"
                placeholder="500034"
                maxLength={6}
                value={inputPin}
                onChange={e => { setInputPin(e.target.value.replace(/\D/g, '')); setStatus(s => s === 'pin-error' ? 'idle' : s) }}
                onKeyDown={e => e.key === 'Enter' && checkPincode()}
              />
              <button className="btn btn-accent loc-check-btn" onClick={checkPincode}>
                {status === 'pin-checking' ? '…' : 'Check'}
              </button>
            </div>
            {status === 'pin-error' && <p className="loc-pin-error">Enter a valid 6-digit pincode</p>}
            {status === 'pin-ok' && (
              <p className={`loc-pin-result ${deliverable ? 'deliverable' : 'not-deliverable'}`}>
                {deliverable
                  ? `✓ Deliverable to ${inputPin} — Est. delivery by ${getDeliveryDate(2)}`
                  : `✗ Sorry, we don't deliver to pincode ${inputPin} yet.`}
              </p>
            )}
          </div>

          <button className="loc-close-full btn" onClick={onClose}>Close</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default LocationPopup
