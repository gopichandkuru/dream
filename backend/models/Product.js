const mongoose = require("mongoose")

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true }, // preserves "lr1", "bd1", etc.
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    subtype: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    rating: { type: Number, default: 4.5 },
    reviews: { type: Number, default: 0 },
    badge: { type: String, default: null },
    inStock: { type: Boolean, default: true },
    isNew: { type: Boolean, default: false },
    image: { type: String, required: true },
    images: [{ type: String }],
    description: { type: String, required: true },
  },
  { 
    timestamps: true,
    suppressReservedKeysWarning: true 
  }
)

module.exports = mongoose.model("Product", productSchema)
