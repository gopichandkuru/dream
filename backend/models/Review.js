const mongoose = require("mongoose")

const reviewSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, index: true }, // fits 'lr1', 'bd2', etc.
    customerName: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewMessage: { type: String, required: true },
    initials: { type: String, default: "" },
    orderId: { type: String, default: "" },
    productNames: [{ type: String }], // for multi-product feedback compatibility
  },
  { timestamps: true }
)

module.exports = mongoose.model("Review", reviewSchema)
