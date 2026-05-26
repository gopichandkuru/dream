const rateLimit = require("express-rate-limit")

/**
 * authLimiter — strict limiter for auth endpoints
 * 10 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased from 10 — was locking out users on bad credentials
  message: {
    success: false,
    error: "Too many attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
})

/**
 * forgotPasswordLimiter — very strict for reset emails (prevent spam)
 * 3 requests per hour per IP
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: "Too many password reset requests. Please try again in 1 hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * generalLimiter — loose limiter for general API
 * 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: "Too many requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = { authLimiter, forgotPasswordLimiter, generalLimiter }
