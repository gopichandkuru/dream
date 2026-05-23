const express = require("express")
const path = require("path")
const fs = require("fs")
const sendOrderEmail = require("../utils/sendEmail")

const router = express.Router()

// ─── File-based Database ──────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "..", "data", "orders.json")

function ensureDB() {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "[]", "utf8")
}

function readOrders() {
  try {
    ensureDB()
    const raw = fs.readFileSync(DB_PATH, "utf8")
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function writeOrder(order) {
  try {
    ensureDB()
    const orders = readOrders()
    orders.push(order)
    fs.writeFileSync(DB_PATH, JSON.stringify(orders, null, 2), "utf8")
    return true
  } catch (err) {
    console.error("[db] writeOrder failed:", err.message)
    return false
  }
}

// ─── POST /api/orders/place-order ─────────────────────────────────────────────
router.post("/place-order", async (req, res) => {
  console.log("[orders] POST /place-order — body keys:", Object.keys(req.body || {}))

  try {
    const {
      email = "",
      items = [],
      totalAmount = 0,
      customerName = "Valued Customer",
      address = "",
      phone = "",
      paymentMethod = "cod",
      paymentId = "",
      transactionId = "",
    } = req.body || {}

    // ── Validation ────────────────────────────────────────────────────────────
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "A valid email address is required." })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "items must be a non-empty array." })
    }
    if (!totalAmount || Number(totalAmount) <= 0) {
      return res.status(400).json({ success: false, message: "totalAmount must be a positive number." })
    }

    // ── Build Order ───────────────────────────────────────────────────────────
    const orderId = "ORD" + Date.now()
    const finalPaymentId = paymentId || transactionId || ""
    const paymentStatus = paymentMethod === "cod" ? "Pending (COD)" : "Paid"

    const newOrder = {
      orderId,
      customerDetails: { name: customerName, email, phone, address },
      products: items,
      payment: {
        method: paymentMethod,
        paymentId: finalPaymentId,
        amount: Number(totalAmount),
        status: paymentStatus,
      },
      orderStatus: "Confirmed",
      createdAt: new Date().toISOString(),
    }

    // ── Persist to file DB ────────────────────────────────────────────────────
    const saved = writeOrder(newOrder)
    if (saved) {
      console.log("[orders] ✅ Saved order:", orderId)
    } else {
      console.warn("[orders] ⚠️  Could not persist order to file — continuing without save")
    }

    // ── Send Emails (non-blocking — don't fail the request on email error) ────
    sendOrderEmail(
      email,
      orderId,
      totalAmount,
      customerName,
      items,
      address,
      phone,
      paymentMethod,
      finalPaymentId,
    ).catch(err => console.error("[orders] Email error (non-fatal):", err.message))

    // ── Success Response ──────────────────────────────────────────────────────
    console.log("[orders] ✅ Order placed:", orderId, "| Payment:", paymentMethod, "|", paymentStatus)
    return res.status(200).json({
      success: true,
      orderId,
      message: "Order placed successfully!",
    })
  } catch (err) {
    console.error("[orders] ❌ place-order error:", err.message, err.stack)
    return res.status(500).json({
      success: false,
      message: "Order placement failed: " + err.message,
    })
  }
})

// ─── GET /api/orders/:orderId ─────────────────────────────────────────────────
router.get("/:orderId", (req, res) => {
  try {
    const { orderId } = req.params
    const orders = readOrders()
    const found = orders.find(o => o.orderId === orderId)
    return res.status(200).json({
      success: true,
      order: found || {
        orderId,
        orderStatus: "Confirmed",
        estimatedDelivery: "5-7 business days",
      },
    })
  } catch (err) {
    console.error("[orders] ❌ GET order error:", err.message)
    return res.status(500).json({ success: false, message: "Could not retrieve order." })
  }
})

module.exports = router
