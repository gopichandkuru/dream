const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    orderId: { type: String, required: true, unique: true },
    customerDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    products: [
      {
        id: { type: String, required: true }, // compatible with item.id (like lr1)
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        image: { type: String },
        category: { type: String },
      },
    ],
    payment: {
      method: { type: String, default: "cod" }, // cod, razorpay
      paymentId: { type: String, default: "" },
      amount: { type: Number, required: true },
      status: { type: String, default: "Pending" }, // Pending, Paid, Refunded
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Confirmed",
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Order", orderSchema)
