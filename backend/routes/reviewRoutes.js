const express = require("express")
const path = require("path")
const fs = require("fs")

const router = express.Router()

// ─── File-based Reviews DB ────────────────────────────────────────────────────
const REVIEWS_PATH = path.join(__dirname, "..", "data", "reviews.json")

function ensureReviewsDB() {
  const dir = path.dirname(REVIEWS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(REVIEWS_PATH)) fs.writeFileSync(REVIEWS_PATH, "[]", "utf8")
}

function readReviews() {
  try {
    ensureReviewsDB()
    return JSON.parse(fs.readFileSync(REVIEWS_PATH, "utf8"))
  } catch {
    return []
  }
}

function writeReview(review) {
  try {
    ensureReviewsDB()
    const reviews = readReviews()
    reviews.unshift(review) // newest first
    fs.writeFileSync(REVIEWS_PATH, JSON.stringify(reviews, null, 2), "utf8")
    return true
  } catch (err) {
    console.error("[reviews] writeReview failed:", err.message)
    return false
  }
}

// ─── POST /api/reviews ─────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  console.log("[reviews] POST / — body:", req.body)
  try {
    const {
      orderId = "",
      customerName = "",
      rating,
      message = "",
      productNames = [],
    } = req.body || {}

    // Validation
    if (!customerName || customerName.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Customer name must be at least 2 characters." })
    }
    const ratingNum = Number(rating)
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." })
    }
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Review message must be at least 10 characters." })
    }

    const review = {
      id: "REV" + Date.now(),
      orderId: orderId || "",
      customerName: customerName.trim(),
      rating: ratingNum,
      message: message.trim(),
      productNames: Array.isArray(productNames) ? productNames : [],
      createdAt: new Date().toISOString(),
      // Generate avatar initials from name
      initials: customerName.trim().split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
    }

    const saved = writeReview(review)
    if (!saved) {
      console.warn("[reviews] ⚠️  Could not persist review")
    }

    console.log("[reviews] ✅ Review saved:", review.id, "| Rating:", review.rating, "⭐")
    return res.status(201).json({ success: true, review, message: "Review submitted successfully!" })
  } catch (err) {
    console.error("[reviews] ❌ POST error:", err.message)
    return res.status(500).json({ success: false, message: "Failed to save review: " + err.message })
  }
})

// ─── GET /api/reviews ──────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  try {
    const reviews = readReviews()
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const page = Math.max(Number(req.query.page) || 1, 1)
    const start = (page - 1) * limit

    const paginated = reviews.slice(start, start + limit)

    // Compute average rating
    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "0.0"

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach(r => { if (distribution[r.rating] !== undefined) distribution[r.rating]++ })

    return res.status(200).json({
      success: true,
      reviews: paginated,
      total: reviews.length,
      avgRating: Number(avgRating),
      distribution,
    })
  } catch (err) {
    console.error("[reviews] ❌ GET error:", err.message)
    return res.status(500).json({ success: false, message: "Failed to fetch reviews: " + err.message })
  }
})

module.exports = router
