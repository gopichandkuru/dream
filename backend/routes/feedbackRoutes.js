const express = require("express")
const path = require("path")
const fs = require("fs")

const router = express.Router()

// ─── JSON File Storage ────────────────────────────────────────────────────────
const FEEDBACK_PATH = path.join(__dirname, "..", "data", "feedback.json")

function ensureDB() {
  const dir = path.dirname(FEEDBACK_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(FEEDBACK_PATH)) fs.writeFileSync(FEEDBACK_PATH, "[]", "utf8")
}

function readFeedback() {
  try {
    ensureDB()
    const raw = fs.readFileSync(FEEDBACK_PATH, "utf8")
    return JSON.parse(raw)
  } catch (err) {
    console.error("[feedback] readFeedback error:", err.message)
    return []
  }
}

function saveFeedback(entry) {
  try {
    ensureDB()
    const all = readFeedback()
    all.unshift(entry) // newest first
    fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(all, null, 2), "utf8")
    console.log("[feedback] ✅ Saved to disk:", FEEDBACK_PATH)
    return true
  } catch (err) {
    console.error("[feedback] saveFeedback error:", err.message)
    return false
  }
}

// ─── POST /api/feedback ───────────────────────────────────────────────────────
router.post("/", (req, res) => {
  console.log("[feedback] POST /api/feedback — incoming body:", JSON.stringify(req.body))

  try {
    const {
      customerName = "",
      rating,
      reviewMessage = "",
      productId = "",
      productNames = [],
      orderId = "",
    } = req.body || {}

    // ── Validation ────────────────────────────────────────────────────────────
    const errors = []

    const trimmedName = String(customerName).trim()
    if (!trimmedName || trimmedName.length < 2) {
      errors.push("Customer name must be at least 2 characters.")
    }

    const ratingNum = Number(rating)
    if (!ratingNum || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      errors.push("Rating must be a number between 1 and 5.")
    }

    const trimmedMessage = String(reviewMessage).trim()
    if (!trimmedMessage || trimmedMessage.length < 10) {
      errors.push("Review message must be at least 10 characters.")
    }

    if (errors.length > 0) {
      console.warn("[feedback] Validation failed:", errors)
      return res.status(400).json({
        success: false,
        message: errors[0], // Return the first error to the user
        errors,
      })
    }

    // ── Build Entry ───────────────────────────────────────────────────────────
    const initials = trimmedName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

    const entry = {
      id: "FB" + Date.now() + Math.floor(Math.random() * 1000),
      customerName: trimmedName,
      rating: ratingNum,
      reviewMessage: trimmedMessage,
      productId: productId || "",
      productNames: Array.isArray(productNames) ? productNames : [],
      orderId: orderId || "",
      initials,
      createdAt: new Date().toISOString(),
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    const saved = saveFeedback(entry)
    if (!saved) {
      console.warn("[feedback] ⚠️  Disk write failed but continuing...")
    }

    console.log(
      `[feedback] ✅ New feedback: id=${entry.id} | name=${entry.customerName} | rating=${entry.rating}⭐`
    )

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: entry,
    })
  } catch (err) {
    console.error("[feedback] ❌ Unexpected error:", err.message, err.stack)
    return res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
    })
  }
})

// ─── GET /api/feedback ────────────────────────────────────────────────────────
router.get("/", (req, res) => {
  console.log("[feedback] GET /api/feedback — query:", req.query)
  try {
    const all = readFeedback()

    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const page = Math.max(Number(req.query.page) || 1, 1)
    const ratingFilter = req.query.rating ? Number(req.query.rating) : 0
    const productIdFilter = req.query.productId || ""

    // Filter
    let filtered = all
    if (ratingFilter >= 1 && ratingFilter <= 5) {
      filtered = filtered.filter((f) => f.rating === ratingFilter)
    }
    if (productIdFilter) {
      filtered = filtered.filter((f) => f.productId === productIdFilter)
    }

    // Paginate
    const start = (page - 1) * limit
    const paginated = filtered.slice(start, start + limit)

    // Stats (from ALL feedback, not filtered)
    const avgRating =
      all.length > 0
        ? Number((all.reduce((sum, f) => sum + f.rating, 0) / all.length).toFixed(1))
        : 0

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    all.forEach((f) => {
      if (distribution[f.rating] !== undefined) distribution[f.rating]++
    })

    return res.status(200).json({
      success: true,
      feedback: paginated,
      total: all.length,
      totalFiltered: filtered.length,
      avgRating,
      distribution,
    })
  } catch (err) {
    console.error("[feedback] ❌ GET error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch feedback",
    })
  }
})

module.exports = router
