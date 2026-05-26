const express = require("express")
const Order = require("../models/Order")
const sendOrderEmail = require("../utils/sendEmail")
const { protect, optionalAuth, adminOnly } = require("../middleware/auth")

const router = express.Router()

// ─── POST /api/orders/place-order (Place an Order — requires login) ───────────
router.post("/place-order", protect, async (req, res) => {
  console.log("[orders] POST /place-order — userId:", req.userId, "body keys:", Object.keys(req.body || {}))

  try {
    const {
      email,
      items,
      totalAmount,
      customerName,
      address,
      phone,
      paymentMethod = "cod",
      paymentId = "",
      transactionId = "",
    } = req.body || {}

    // Validation
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "A valid email address is required." })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: "Items must be a non-empty array." })
    }
    if (!totalAmount || Number(totalAmount) <= 0) {
      return res.status(400).json({ success: false, error: "Total amount must be a positive number." })
    }

    const orderId = "ORD" + Date.now() + Math.floor(Math.random() * 1000)
    const finalPaymentId = paymentId || transactionId || ""
    const paymentStatus = paymentMethod === "cod" ? "Pending" : "Paid"

    const formattedProducts = items.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      image: item.image,
      category: item.category || "",
    }))

    const newOrder = await Order.create({
      userId: req.userId, // Always link to logged-in user
      orderId,
      customerDetails: {
        name: customerName || req.user.fullName || "Valued Customer",
        email,
        phone: phone || req.user.phoneNumber || "",
        address: address || "",
      },
      products: formattedProducts,
      payment: {
        method: paymentMethod,
        paymentId: finalPaymentId,
        amount: Number(totalAmount),
        status: paymentStatus,
      },
      orderStatus: "Confirmed",
    })

    console.log("[orders] ✅ Order created in MongoDB:", newOrder.orderId, "for user:", req.userId)

    // Send Emails (non-blocking)
    sendOrderEmail(
      email,
      orderId,
      totalAmount,
      customerName || req.user.fullName || "Valued Customer",
      items,
      address || "",
      phone || "",
      paymentMethod,
      finalPaymentId
    ).catch((err) => console.error("[orders] Email error (non-fatal):", err.message))

    return res.status(200).json({
      success: true,
      orderId: newOrder.orderId,
      order: newOrder,
      message: "Order placed successfully!",
    })
  } catch (err) {
    console.error("[orders] ❌ place-order error:", err.message)
    return res.status(500).json({
      success: false,
      error: "Order placement failed: " + err.message,
    })
  }
})

// ─── GET /api/orders/my-orders (Protected: User's own orders) ─────────────────
router.get("/my-orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ userId: req.userId }, { "customerDetails.email": req.user.email }],
    }).sort({ createdAt: -1 })

    res.json({ success: true, count: orders.length, orders })
  } catch (err) {
    console.error("[my-orders] ❌ Error:", err.message)
    res.status(500).json({ success: false, error: "Failed to fetch order history." })
  }
})

// ─── PUT /api/orders/:orderId/cancel (Cancel an order — owner only) ───────────
router.put("/:orderId/cancel", protect, async (req, res) => {
  try {
    const { orderId } = req.params

    let order = await Order.findOne({ orderId })
    if (!order && orderId.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(orderId)
    }

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found." })
    }

    // Ownership check
    const isOwner =
      (order.userId && order.userId.toString() === req.userId) ||
      order.customerDetails.email === req.user.email

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "You are not authorized to cancel this order." })
    }

    // Only allow cancellation for Pending / Confirmed orders
    const cancellableStatuses = ["Pending", "Confirmed"]
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        error: `Order cannot be cancelled. Current status: ${order.orderStatus}`,
      })
    }

    order.orderStatus = "Cancelled"
    await order.save()

    console.log("[cancel-order] ✅ Order", orderId, "cancelled by user:", req.userId)
    res.json({ success: true, order, message: "Order cancelled successfully." })
  } catch (err) {
    console.error("[cancel-order] ❌ Error:", err.message)
    res.status(500).json({ success: false, error: "Failed to cancel order." })
  }
})

// ─── GET /api/orders/admin/all (Admin Only: List All Orders) ─────────────────
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 })
    res.json({ success: true, count: orders.length, orders })
  } catch (err) {
    console.error("[admin all orders] ❌ Error:", err.message)
    res.status(500).json({ success: false, error: "Failed to fetch all orders." })
  }
})

// ─── PUT /api/orders/admin/:id/status (Admin Only: Update Status) ──────────────
router.put("/admin/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const { orderStatus } = req.body

    const validStatuses = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"]
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, error: "Invalid status value." })
    }

    let order = await Order.findOne({ orderId: id })
    if (!order && id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id)
    }

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found." })
    }

    order.orderStatus = orderStatus
    if (orderStatus === "Delivered") {
      order.payment.status = "Paid"
    }
    await order.save()

    res.json({ success: true, order, message: `Order status updated to ${orderStatus}.` })
  } catch (err) {
    console.error("[update order status] ❌ Error:", err.message)
    res.status(500).json({ success: false, error: "Failed to update order status." })
  }
})

// ─── GET /api/orders/:orderId (Get Single Order — owner or admin) ─────────────
router.get("/:orderId", protect, async (req, res) => {
  try {
    const { orderId } = req.params

    let order = await Order.findOne({ orderId })
    if (!order && orderId.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(orderId)
    }

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found." })
    }

    // Ownership check — admin can see any order
    const isOwner =
      (order.userId && order.userId.toString() === req.userId) ||
      order.customerDetails.email === req.user.email

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "You are not authorized to view this order." })
    }

    return res.status(200).json({ success: true, order })
  } catch (err) {
    console.error("[get order] ❌ Error:", err.message)
    return res.status(500).json({ success: false, error: "Could not retrieve order details." })
  }
})

module.exports = router
