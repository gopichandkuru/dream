require("dotenv").config({ quiet: true })

const dns = require("dns")
// Set default fallback DNS servers to resolve MongoDB Atlas SRV connection strings.
// This prevents 'querySrv ECONNREFUSED' errors in Node.js.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"])
} catch (e) {
  console.warn("⚠️ Custom DNS configuration failed:", e.message)
}

const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const mongoose = require("mongoose")
const cookieParser = require("cookie-parser")

const app = express()

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cookieParser())

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // handled by frontend
}))

// ─── CORS ────────────────────────────────────────────────────────────────────
const rawOrigins = (process.env.FRONTEND_URL || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map(o => o.trim().replace(/\/$/, ""))

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    const isAllowed = rawOrigins.some(allowed => {
      if (origin === allowed) return true
      if (allowed.startsWith("https://") && origin.endsWith(".vercel.app")) return true
      return false
    })
    if (isAllowed) return callback(null, true)
    console.warn("[cors] Blocked origin:", origin)
    callback(new Error("Not allowed by CORS: " + origin))
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}))

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} — origin: ${req.get("origin") || "N/A"}`)
  next()
})

// ─── Health Routes ────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "Dream D'Accor Backend",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    env: {
      razorpay: !!process.env.RAZORPAY_KEY_ID,
      resend: !!process.env.RESEND_API_KEY,
      smtp: !!process.env.EMAIL_USER,
      mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      googleOAuth: !!process.env.GOOGLE_CLIENT_ID,
      nodeEnv: process.env.NODE_ENV,
    },
  })
})

app.get("/health", (_req, res) => res.json({
  status: "ok",
  ts: new Date().toISOString(),
  db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
}))

// ─── API Routes ───────────────────────────────────────────────────────────────
const authRoutes = require("./routes/authRoutes")
app.use("/api/auth", authRoutes)

const productRoutes = require("./routes/productRoutes")
app.use("/api/products", productRoutes)

const orderRoutes = require("./routes/orderRoutes")
app.use("/api/orders", orderRoutes)

const paymentRoutes = require("./routes/paymentRoutes")
app.use("/api/payment", paymentRoutes)

const feedbackRoutes = require("./routes/feedbackRoutes")
app.use("/api/feedback", feedbackRoutes)
app.use("/api/reviews", feedbackRoutes)

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` })
})

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("💥 Unhandled error:", err.stack || err.message)
  res.status(500).json({ success: false, message: err.message || "Internal server error" })
})

// ─── MongoDB Seeding ──────────────────────────────────────────────────────────
const Product = require("./models/Product")
const { getSeedProducts } = require("./utils/seedHelper")

const seedProducts = async () => {
  try {
    const count = await Product.countDocuments()
    if (count === 0) {
      console.log("🌱 Database is empty. Seeding products...")
      const products = getSeedProducts()
      if (products && products.length > 0) {
        await Product.insertMany(products)
        console.log(`✅ Seeded ${products.length} products successfully!`)
      } else {
        console.warn("⚠️ No products found to seed.")
      }
    } else {
      console.log(`ℹ️ Database already has ${count} products. Skipping seed.`)
    }
  } catch (err) {
    console.error("❌ Failed to seed products:", err.message)
  }
}

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const connectDB = async () => {
  const dbUrl = process.env.MONGO_URI || process.env.MONGO_URL
  if (!dbUrl) {
    console.warn("⚠️  MONGO_URI or MONGO_URL not set — running without database (auth disabled)")
    return
  }
  try {
    await mongoose.connect(dbUrl, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    })
    console.log("✅ MongoDB connected:", mongoose.connection.host)
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message)
    console.error("   Auth routes will return 500 until DB is available")
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5002

const startServer = async () => {
  // Connect DB first, then start listening
  await connectDB()
  await seedProducts()

  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`)
    console.log(`   NODE_ENV:        ${process.env.NODE_ENV || "development"}`)
    console.log(`   Allowed origins: ${rawOrigins.join(", ")}`)
    console.log(`   MongoDB:         ${mongoose.connection.readyState === 1 ? "✅ connected" : "⚠️  not connected"}`)
    console.log(`   JWT:             ${process.env.JWT_SECRET ? "✅ configured" : "❌ NOT SET (auth won't work)"}`)
    console.log(`   Google OAuth:    ${process.env.GOOGLE_CLIENT_ID ? "✅ configured" : "⚠️  not configured (optional)"}`)
    console.log(`   Razorpay KEY:    ${process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.slice(0, 12) + "..." : "❌ NOT SET"}`)
    console.log(`   Resend:          ${process.env.RESEND_API_KEY ? "✅ configured" : "❌ NOT SET"}`)
    console.log(`   Admin Email:     ${process.env.ADMIN_EMAIL || "gopichand55k@gmail.com"}\n`)
  })
}

startServer()
