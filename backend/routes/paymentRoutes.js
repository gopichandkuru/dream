const express = require("express")
const crypto = require("crypto")
const Razorpay = require("razorpay")

const router = express.Router()

// ─── Razorpay Instance ─────────────────────────────────────────────────────────
function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials not configured. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in environment variables."
    )
  }

  // Guard against accidentally using test keys in production
  if (process.env.NODE_ENV === "production" && keyId.startsWith("rzp_test_")) {
    console.warn("[payment] ⚠️  WARNING: Using TEST Razorpay key in production environment!")
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

// ─── POST /api/payment/create-order ───────────────────────────────────────────
router.post("/create-order", async (req, res) => {
  console.log("[payment] POST /create-order — body:", req.body)
  try {
    const amount = Number(req.body?.amount)

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount — must be a positive number (in INR).",
      })
    }

    // Razorpay minimum order is ₹1 (100 paise)
    const amountInPaise = Math.round(amount * 100)
    if (amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum order amount is ₹1.",
      })
    }

    const razorpay = getRazorpay()
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
      notes: {
        source: "DreamDaccor-Checkout",
        env: process.env.NODE_ENV || "development",
      },
    })

    console.log("[payment] ✅ Razorpay order created:", order.id, "| Amount:", order.amount, "paise")
    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    })
  } catch (err) {
    console.error("[payment] ❌ create-order error:", err.message)

    // Razorpay SDK errors have a specific shape
    const errorMsg = err.error?.description || err.message || "Payment initialization failed."
    return res.status(500).json({
      success: false,
      message: "Payment initialization failed: " + errorMsg,
    })
  }
})

// ─── POST /api/payment/verify ─────────────────────────────────────────────────
router.post("/verify", (req, res) => {
  console.log("[payment] POST /verify — body:", req.body)
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {}

    // Validate all required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      const missing = []
      if (!razorpay_order_id) missing.push("razorpay_order_id")
      if (!razorpay_payment_id) missing.push("razorpay_payment_id")
      if (!razorpay_signature) missing.push("razorpay_signature")
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      })
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      console.error("[payment] ❌ RAZORPAY_KEY_SECRET not set!")
      return res.status(500).json({
        success: false,
        message: "Server misconfigured: RAZORPAY_KEY_SECRET is not set.",
      })
    }

    // Razorpay signature verification: HMAC-SHA256(order_id|payment_id, key_secret)
    const signBody = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(signBody)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      console.warn("[payment] ❌ Signature mismatch!")
      console.warn("  Expected:", expectedSignature)
      console.warn("  Received:", razorpay_signature)
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed — this payment may be fraudulent.",
      })
    }

    console.log("[payment] ✅ Signature verified — paymentId:", razorpay_payment_id)
    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      paymentId: razorpay_payment_id,
    })
  } catch (err) {
    console.error("[payment] ❌ verify error:", err.message)
    return res.status(500).json({
      success: false,
      message: "Verification error: " + err.message,
    })
  }
})

module.exports = router
