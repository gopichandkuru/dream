const jwt = require("jsonwebtoken")
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
    }
    // 2. Fallback: check cookie
    else if (req.cookies && req.cookies.jwt_token) {
      token = req.cookies.jwt_token
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated. Please log in.",
      })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Fetch user from DB (ensures user still exists and is valid)
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User no longer exists.",
      })
    }

    req.user = user
    req.userId = user._id.toString()
    next()
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Session expired. Please log in again." })
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, error: "Invalid token. Please log in again." })
    }
    console.error("[auth middleware]", err.message)
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    if (user) {
      req.user = user
      req.userId = user._id.toString()
    }
    next()
  } catch {
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
