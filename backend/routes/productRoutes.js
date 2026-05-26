const express = require("express")
const Product = require("../models/Product")
const { protect, adminOnly } = require("../middleware/auth")

const router = express.Router()

// ─── GET /api/products (Public Search/Filter/Sort) ───────────────────────────
router.get("/", async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, sort } = req.query

    const filter = {}

    // Search query
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { subtype: { $regex: q, $options: "i" } },
      ]
    }

    // Category filter
    if (category && category !== "All") {
      filter.category = category
    }

    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {}
      if (minPrice) filter.price.$gte = Number(minPrice)
      if (maxPrice) filter.price.$lte = Number(maxPrice)
    }

    let query = Product.find(filter)

    // Sorting
    if (sort) {
      if (sort === "price-asc") {
        query = query.sort({ price: 1 })
      } else if (sort === "price-desc") {
        query = query.sort({ price: -1 })
      } else if (sort === "latest") {
        query = query.sort({ createdAt: -1 })
      } else if (sort === "popular") {
        query = query.sort({ rating: -1, reviews: -1 })
      }
    } else {
      // Default: sort latest
      query = query.sort({ createdAt: -1 })
    }

    const products = await query

    res.json({
      success: true,
      count: products.length,
      products,
    })
  } catch (err) {
    console.error("[get products] ❌ Error:", err.message)
    res.status(500).json({ success: false, error: "Failed to fetch products." })
  }
})

// ─── GET /api/products/:id (Public Details Lookup) ───────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params
    // Attempt search by string id (e.g. lr1) first, then try mongoose object id
    let product = await Product.findOne({ id })
    if (!product && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id)
    }

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found." })
    }

    res.json({ success: true, product })
  } catch (err) {
    console.error("[get product by id] ❌ Error:", err.message)
    res.status(500).json({ success: false, error: "Failed to fetch product details." })
  }
})

// ─── POST /api/products (Admin Only: Create Product) ─────────────────────────
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const {
      name,
      category,
      subtype,
      price,
      originalPrice,
      badge,
      inStock,
      isNew,
      image,
      images,
      description,
    } = req.body

    if (!name || !category || !subtype || !price || !originalPrice || !image || !description) {
      return res.status(400).json({ success: false, error: "Required fields are missing." })
    }

    // Auto-generate a unique string ID for consistency
    const id = "p_" + Date.now() + Math.floor(Math.random() * 100)

    const newProduct = await Product.create({
      id,
      name,
      category,
      subtype,
      price: Number(price),
      originalPrice: Number(originalPrice),
      badge: badge || null,
      inStock: inStock !== undefined ? inStock : true,
      isNew: isNew !== undefined ? isNew : true,
      image,
      images: Array.isArray(images) && images.length > 0 ? images : [image],
      description,
    })

    res.status(201).json({ success: true, product: newProduct, message: "Product created successfully." })
  } catch (err) {
    console.error("[create product] ❌ Error:", err.message)
    res.status(500).json({ success: false, error: "Failed to create product." })
  }
})

// ─── PUT /api/products/:id (Admin Only: Update Product) ───────────────────────
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    let product = await Product.findOne({ id })
    if (!product && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id)
    }

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found." })
    }

    const updates = req.body
    if (updates.price) updates.price = Number(updates.price)
    if (updates.originalPrice) updates.originalPrice = Number(updates.originalPrice)

    // Avoid overwriting string id
    delete updates.id
    delete updates._id

    Object.assign(product, updates)
    await product.save()

    res.json({ success: true, product, message: "Product updated successfully." })
  } catch (err) {
    console.error("[update product] ❌ Error:", err.message)
    res.status(500).json({ success: false, error: "Failed to update product." })
  }
})

// ─── DELETE /api/products/:id (Admin Only: Delete Product) ────────────────────
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    let result = await Product.deleteOne({ id })
    if (result.deletedCount === 0 && id.match(/^[0-9a-fA-F]{24}$/)) {
      result = await Product.deleteOne({ _id: id })
    }

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "Product not found." })
    }

    res.json({ success: true, message: "Product deleted successfully." })
  } catch (err) {
    console.error("[delete product] ❌ Error:", err.message)
    res.status(500).json({ success: false, error: "Failed to delete product." })
  }
})

module.exports = router
