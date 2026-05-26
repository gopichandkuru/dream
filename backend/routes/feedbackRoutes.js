const express = require("express")
const Review = require("../models/Review")

const router = express.Router()

// ─── POST /api/feedback (Submit a Review) ─────────────────────────────────────
router.post("/", async (req, res) => {
  console.log("[feedback] POST / — body:", JSON.stringify(req.body, null, 2))
  try {
    const {
      productId,
      customerName,
      rating,
      reviewMessage,
      orderId,
      productNames,
    } = req.body || {}

    // ── Validation ──────────────────────────────────────────────────────────
    if (!customerName || String(customerName).trim().length < 2) {
      console.warn("[feedback] ⚠️  Validation fail: name too short")
      return res.status(400).json({ success: false, message: "Customer name must be at least 2 characters." })
    }
    const ratingNum = Number(rating)
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      console.warn("[feedback] ⚠️  Validation fail: bad rating:", rating)
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." })
    }
    if (!reviewMessage || String(reviewMessage).trim().length < 10) {
      console.warn("[feedback] ⚠️  Validation fail: message too short")
      return res.status(400).json({ success: false, message: "Review message must be at least 10 characters." })
    }
    // NOTE: productId is optional — general reviews from ReviewsPage don't have one
    const resolvedProductId = productId || "general"

    const initials = String(customerName)
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

    // ── Save to MongoDB ──────────────────────────────────────────────────────
    const newReview = await Review.create({
      productId: resolvedProductId,
      customerName: String(customerName).trim(),
      rating: ratingNum,
      reviewMessage: String(reviewMessage).trim(),
      initials,
      orderId: orderId || "",
      productNames: Array.isArray(productNames) ? productNames : [],
    })

    console.log(`[feedback] ✅ Review saved: ${newReview._id} | Rating: ${newReview.rating}⭐ | By: ${newReview.customerName}`)

    return res.status(201).json({
      success: true,
      review: newReview,
      feedback: newReview,
      message: "Review submitted successfully!",
    })
  } catch (err) {
    console.error("[feedback] ❌ POST error:", err.message)
    return res.status(500).json({ success: false, message: "Failed to save review: " + err.message })
  }
})

// ─── GET /api/feedback (Get Reviews & Analytics) ──────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { productId, rating, limit = 50, page = 1 } = req.query
    console.log("[feedback] GET / — query:", req.query)

    const filter = {}
    if (productId) filter.productId = productId
    if (rating) filter.rating = Number(rating)

    const limitNum = Math.min(Number(limit) || 50, 100)
    const pageNum = Math.max(Number(page) || 1, 1)
    const skip = (pageNum - 1) * limitNum

    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)

    const totalCount = await Review.countDocuments(filter)

    // Compute stats on ALL reviews (not filtered by rating)
    const statsFilter = productId ? { productId } : {}
    const allStats = await Review.find(statsFilter).select("rating")

    const totalStatsCount = allStats.length
    const avgRating = totalStatsCount
      ? (allStats.reduce((sum, r) => sum + r.rating, 0) / totalStatsCount).toFixed(1)
      : "0.0"

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    allStats.forEach((r) => {
      if (distribution[r.rating] !== undefined) distribution[r.rating]++
    })

    console.log(`[feedback] ✅ GET — ${reviews.length} reviews returned, total: ${totalCount}, avg: ${avgRating}`)

    return res.status(200).json({
      success: true,
      reviews,
      feedback: reviews, // alias for backwards compatibility
      total: totalCount,
      avgRating: Number(avgRating),
      distribution,
    })
  } catch (err) {
    console.error("[feedback] ❌ GET error:", err.message)
    return res.status(500).json({ success: false, message: "Failed to fetch reviews: " + err.message })
  }
})

module.exports = router
