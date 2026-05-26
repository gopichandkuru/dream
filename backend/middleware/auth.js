const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")
const User = require("../models/User")

/**
 * protect — verifies JWT from Authorization header or jwt_token cookie
 * Attaches `req.user` and `req.userId` if valid.
 */
const protect = async (req, res, next) => {
  try {
    let token = null

    // 1. Check Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1]
      console.log(`[auth middleware] 🔍 Found Bearer token in Authorization header: ${token.slice(0, 15)}...`)
    }
    // 2. Fallback: check cookie
    else if (req.cookies && req.cookies.jwt_token) {
      token = req.cookies.jwt_token
      console.log(`[auth middleware] 🔍 Found token in jwt_token cookie: ${token.slice(0, 15)}...`)
    }

    if (!token) {
      console.log(`[auth middleware] ❌ No token provided for: ${req.method} ${req.originalUrl || req.path}`)
      return res.status(401).json({
        success: false,
        error: "Not authenticated. Please log in.",
      })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    console.log(`[auth middleware] ✅ JWT verified. Decoded user ID: ${decoded.id}`)

    // Ensure the decoded ID is a valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(decoded.id)) {
      console.log(`[auth middleware] ❌ Decoded ID is not a valid ObjectId: ${decoded.id}`)
      return res.status(401).json({
        success: false,
        error: "Invalid session token. Please log in again.",
      })
    }

    // Fetch user from DB (ensures user still exists and is valid)
    const user = await User.findById(decoded.id)
    if (!user) {
      console.log(`[auth middleware] ❌ User no longer exists in DB for ID: ${decoded.id}`)
      return res.status(401).json({
        success: false,
        error: "User no longer exists.",
      })
    }

    console.log(`[auth middleware] ✅ User authenticated: ${user.email} (Role: ${user.role})`)
    req.user = user
    req.userId = user._id.toString()
    next()
  } catch (err) {
    console.log(`[auth middleware] ❌ Verification failed: ${err.name} — ${err.message}`)
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Session expired. Please log in again." })
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, error: "Invalid token. Please log in again." })
    }
    console.error("[auth middleware error]", err.message)
    res.status(500).json({ success: false, error: "Authentication failed." })
  }
}

/**
 * optionalAuth — same as protect but won't reject if no token present
 * Useful for routes that enhance response when logged in
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1]
    } else if (req.cookies && req.cookies.jwt_token) {
      token = req.cookies.jwt_token
    }

    if (!token) return next()

    console.log(`[optionalAuth] 🔍 Found token: ${token.slice(0, 15)}...`)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (mongoose.isValidObjectId(decoded.id)) {
      const user = await User.findById(decoded.id)
      if (user) {
        console.log(`[optionalAuth] ✅ User attached: ${user.email}`)
        req.user = user
        req.userId = user._id.toString()
      } else {
        console.log(`[optionalAuth] ⚠️ User ID ${decoded.id} not found in DB`)
      }
    } else {
      console.log(`[optionalAuth] ⚠️ Decoded ID is not a valid ObjectId: ${decoded.id}`)
    }
    next()
  } catch (err) {
    console.log(`[optionalAuth] ⚠️ Token invalid: ${err.message}`)
    // Silently continue — token invalid but route is optional-auth
    next()
  }
}

/**
 * adminOnly — must be used AFTER protect
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Access denied. Admins only." })
  }
  next()
}

/**
 * generateToken — creates a signed JWT
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

module.exports = { protect, optionalAuth, adminOnly, generateToken }
