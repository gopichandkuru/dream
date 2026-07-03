require("dotenv").config()
const express = require("express")
const { body, validationResult } = require("express-validator")
const crypto = require("crypto")
const { OAuth2Client } = require("google-auth-library")
const { Resend } = require("resend")

const User = require("../models/User")
const { generateToken } = require("../middleware/auth")
const { protect, adminOnly } = require("../middleware/auth")
const { authLimiter, forgotPasswordLimiter } = require("../middleware/rateLimiter")

const router = express.Router()
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null

// ── GET /api/auth/status — public health check ─────────────────────────────
router.get("/status", (_req, res) => {
  res.json({ success: true, message: "Auth service is running", ts: new Date().toISOString() })
})

// ── Helper: send token response ───────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id)
  const safeUser = user.toSafeObject()

  console.log(`[auth] 🔑 JWT generated for ${user.email} (${user.role}): ${token.slice(0, 20)}... Expires in 7d`)

  res.status(statusCode).json({
    success: true,
    token,
    user: safeUser,
  })
}

// ── Helper: extract validation errors ────────────────────────────────────────
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg)
    console.log(`[validation] ❌ Validation failed for ${req.method} ${req.originalUrl || req.path}:`, messages)
    return res.status(400).json({ success: false, error: messages[0] })
  }
  return null
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/signup (Direct Account Creation — No OTP)
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  "/signup",
  authLimiter,
  [
    body("fullName").trim().isLength({ min: 2 }).withMessage("Full name must be at least 2 characters"),
    body("email").isEmail().withMessage("Enter a valid email address"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) throw new Error("Passwords do not match")
      return true
    }),
    body("phoneNumber").optional().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { fullName, email, password, phoneNumber } = req.body
      const normalizedEmail = email.toLowerCase().trim()

      console.log(`[signup] 📝 Creating account for: ${normalizedEmail}`)

      // Check if email already registered
      const existingUser = await User.findOne({ email: normalizedEmail })
      if (existingUser) {
        console.log(`[signup] ⚠️  Email already in use: ${normalizedEmail}`)
        return res.status(409).json({
          success: false,
          error: "An account with this email already exists. Please sign in instead.",
        })
      }

      // Assign admin role to main dev email automatically
      const role = normalizedEmail === "gopichand55k@gmail.com" ? "admin" : "user"

      // Create user directly in MongoDB
      const user = await User.create({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        phoneNumber: phoneNumber?.trim() || null,
        authProvider: "local",
        isEmailVerified: false,
        role,
      })

      console.log(`[signup] ✅ Account created successfully: ${user.email} (Role: ${user.role})`)
      sendTokenResponse(user, 201, res)
    } catch (err) {
      console.error("[signup] ❌ Error:", err.message)
      console.error(err)
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          error: "An account with this email already exists.",
        })
      }
      res.status(500).json({ success: false, error: "Signup failed. Please try again." })
    }
  }
)

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Enter a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { email, password } = req.body
      const normalizedEmail = email.toLowerCase().trim()

      console.log(`[login] 📧 Attempting login for: ${normalizedEmail}`)

      // Find user WITH password
      const user = await User.findOne({ email: normalizedEmail }).select("+password")
      if (!user) {
        console.log(`[login] ❌ User not found: ${normalizedEmail}`)
        return res.status(401).json({
          success: false,
          error: "Invalid email or password.",
        })
      }

      console.log(`[login] ✅ User found: ${user.email}, provider: ${user.authProvider}, hasPassword: ${!!user.password}`)

      // Check if it's a Google account trying to use password
      if (user.authProvider === "google" && !user.password) {
        return res.status(400).json({
          success: false,
          error: "This account uses Google Sign-In. Please use the Google button to log in.",
        })
      }

      // Validate password
      console.log(`[login] Comparing password...`)
      const isMatch = await user.comparePassword(password)
      console.log(`[login] Password match: ${isMatch}`)
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password.",
        })
      }

      // Auto-promote role to admin on login if matches main dev email
      if (normalizedEmail === "gopichand55k@gmail.com" && user.role !== "admin") {
        user.role = "admin"
        await user.save()
      }

      console.log(`[login] ✅ Login success: ${user.email} (Role: ${user.role})`)
      sendTokenResponse(user, 200, res)
    } catch (err) {
      console.error("[login]", err.message)
      res.status(500).json({ success: false, error: "Login failed. Please try again." })
    }
  }
)

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/google
// ══════════════════════════════════════════════════════════════════════════════
router.post("/google", authLimiter, async (req, res) => {
  try {
    const { idToken, accessToken } = req.body
    const token = idToken || accessToken

    if (!token) {
      return res.status(400).json({ success: false, error: "Google token is required." })
    }

    let googleId, email, name, picture
    const isJWT = token.startsWith("eyJ") && token.split(".").length === 3
    if (isJWT && googleClient) {
      // Verify Google ID token (server-side flow)
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      const payload = ticket.getPayload()
      googleId = payload.sub
      email = payload.email
      name = payload.name
      picture = payload.picture
    } else {
      // Verify via Google's userinfo endpoint (implicit/access_token flow)
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        return res.status(401).json({ success: false, error: "Invalid Google token." })
      }
      const userInfo = await response.json()
      googleId = userInfo.sub
      email = userInfo.email
      name = userInfo.name
      picture = userInfo.picture
    }

    if (!email) {
      return res.status(400).json({ success: false, error: "Google account has no email." })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const role = normalizedEmail === "gopichand55k@gmail.com" ? "admin" : "user"

    // Upsert: find by googleId or email, then update or create
    let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] })

    if (user) {
      // Update Google info if needed
      if (!user.googleId) user.googleId = googleId
      if (!user.profileImage && picture) user.profileImage = picture
      if (user.authProvider !== "google") user.authProvider = "google"
      if (user.role !== role) user.role = role
      await user.save()
    } else {
      // New Google user
      user = await User.create({
        fullName: name || "Google User",
        email: normalizedEmail,
        googleId,
        profileImage: picture || null,
        authProvider: "google",
        isEmailVerified: true, // Google accounts are pre-verified
        role,
      })
    }

    console.log(`✅ Google auth: ${user.email} (Role: ${user.role})`)
    sendTokenResponse(user, 200, res)
  } catch (err) {
    console.error("[google auth]", err.message)
    if (err.message && (err.message.includes("Invalid token") || err.message.includes("invalid_grant"))) {
      return res.status(401).json({ success: false, error: "Invalid Google token." })
    }
    res.status(500).json({ success: false, error: "Google authentication failed." })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me (protected)
// ══════════════════════════════════════════════════════════════════════════════
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." })
    }
    res.json({ success: true, user: user.toSafeObject() })
  } catch (err) {
    console.error("[me]", err.message)
    res.status(500).json({ success: false, error: "Failed to fetch user profile." })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/auth/profile (protected: Edit Profile Details)
// ══════════════════════════════════════════════════════════════════════════════
router.put("/profile", protect, async (req, res) => {
  try {
    const { fullName, phoneNumber, profileImage, location } = req.body
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." })
    }

    if (fullName) user.fullName = fullName.trim()
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber ? phoneNumber.trim() : null
    if (profileImage !== undefined) user.profileImage = profileImage || null
    if (location !== undefined) user.location = location || null

    await user.save()

    res.json({
      success: true,
      user: user.toSafeObject(),
      message: "Profile updated successfully.",
    })
  } catch (err) {
    console.error("[update profile]", err.message)
    res.status(500).json({ success: false, error: "Failed to update profile details." })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/auth/cart (protected: Sync Cart to MongoDB)
// ══════════════════════════════════════════════════════════════════════════════
router.put("/cart", protect, async (req, res) => {
  try {
    const { cart } = req.body
    if (!Array.isArray(cart)) {
      return res.status(400).json({ success: false, error: "Cart must be an array." })
    }

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." })
    }

    user.cart = cart
    await user.save()

    res.json({ success: true, cart: user.cart, message: "Cart synced successfully." })
  } catch (err) {
    console.error("[sync cart]", err.message)
    res.status(500).json({ success: false, error: "Failed to sync cart." })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/auth/wishlist (protected: Sync Wishlist to MongoDB)
// ══════════════════════════════════════════════════════════════════════════════
router.put("/wishlist", protect, async (req, res) => {
  try {
    const { wishlist } = req.body
    if (!Array.isArray(wishlist)) {
      return res.status(400).json({ success: false, error: "Wishlist must be an array." })
    }

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." })
    }

    user.wishlist = wishlist
    await user.save()

    res.json({ success: true, wishlist: user.wishlist, message: "Wishlist synced successfully." })
  } catch (err) {
    console.error("[sync wishlist]", err.message)
    res.status(500).json({ success: false, error: "Failed to sync wishlist." })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN USER MANAGEMENT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/auth/users (Admin Only: List all users)
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    const safeUsers = users.map((u) => u.toSafeObject())
    res.json({ success: true, count: safeUsers.length, users: safeUsers })
  } catch (err) {
    console.error("[admin get users]", err.message)
    res.status(500).json({ success: false, error: "Failed to fetch user list." })
  }
})

// DELETE /api/auth/users/:id (Admin Only: Delete user)
router.delete("/users/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    if (id === req.userId) {
      return res.status(400).json({ success: false, error: "You cannot delete your own admin account." })
    }
    const result = await User.deleteOne({ _id: id })
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "User not found." })
    }
    res.json({ success: true, message: "User deleted successfully." })
  } catch (err) {
    console.error("[admin delete user]", err.message)
    res.status(500).json({ success: false, error: "Failed to delete user." })
  }
})

// PUT /api/auth/users/:id/role (Admin Only: Change user role)
router.put("/users/:id/role", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (id === req.userId) {
      return res.status(400).json({ success: false, error: "You cannot modify your own role." })
    }
    if (role !== "user" && role !== "admin") {
      return res.status(400).json({ success: false, error: "Invalid role value." })
    }

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." })
    }

    user.role = role
    await user.save()

    res.json({ success: true, user: user.toSafeObject(), message: `User role updated to ${role}.` })
  } catch (err) {
    console.error("[admin change role]", err.message)
    res.status(500).json({ success: false, error: "Failed to update user role." })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/logout
// ══════════════════════════════════════════════════════════════════════════════
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully." })
})

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  [body("email").isEmail().withMessage("Enter a valid email")],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { email } = req.body
      const user = await User.findOne({ email })

      if (!user) {
        return res.json({
          success: true,
          message: "If that email exists, a reset link has been sent.",
        })
      }

      if (user.authProvider === "google" && !user.password) {
        return res.json({
          success: true,
          message: "If that email exists, a reset link has been sent.",
        })
      }

      const rawToken = crypto.randomBytes(32).toString("hex")
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")

      user.resetPasswordToken = hashedToken
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
      await user.save()

      const frontendUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL)
        ? (process.env.FRONTEND_URL || process.env.CLIENT_URL).split(",")[0].trim()
        : "http://localhost:5173"
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`

      const fromAddress = process.env.FROM_EMAIL || "Dream D'Accor <onboarding@resend.dev>"
      if (resend) {
        const { error } = await resend.emails.send({
          from: fromAddress,
          to: user.email,
          subject: "Dream D'Accor — Reset Your Password",
          html: `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #faf9f6; border-radius: 16px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px 48px; text-align: center;">
                <p style="color: #c8a97e; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 0.02em;">✦ Dream D'Accor</p>
                <p style="color: rgba(255,255,255,0.6); margin: 8px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em;">Password Reset</p>
              </div>
              <div style="padding: 40px 48px;">
                <h2 style="font-size: 22px; color: #1a1a1a; margin: 0 0 16px;">Hello, ${user.fullName}!</h2>
                <p style="color: #555; line-height: 1.7; margin: 0 0 24px;">
                  We received a request to reset the password for your Dream D'Accor account. 
                  Click the button below to set a new password.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" 
                     style="display: inline-block; background: linear-gradient(135deg, #c8a97e 0%, #e8c99e 50%, #a8834e 100%); 
                            color: #fff; text-decoration: none; padding: 16px 40px; border-radius: 9999px; 
                            font-weight: 600; font-size: 15px; letter-spacing: 0.02em;">
                    Reset My Password
                  </a>
                </div>
                <p style="color: #999; font-size: 13px; text-align: center; margin: 0 0 8px;">
                  This link expires in <strong>1 hour</strong>.
                </p>
                <p style="color: #999; font-size: 13px; text-align: center;">
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
              <div style="background: #f3f1ec; padding: 20px 48px; text-align: center;">
                <p style="color: #aaa; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Dream D'Accor. All rights reserved.</p>
              </div>
            </div>
          `,
        })

        if (error) console.error("[forgot-password email]", error)
      } else {
        console.warn("[forgot-password] Resend API key is not configured. Hashed token URL (dev/test):", resetUrl)
      }

      res.json({ success: true, message: "If that email exists, a reset link has been sent." })
    } catch (err) {
      console.error("[forgot-password]", err.message)
      res.status(500).json({ success: false, error: "Failed to process request. Try again." })
    }
  }
)

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) throw new Error("Passwords do not match")
      return true
    }),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { token, password } = req.body
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      })

      if (!user) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired reset link. Please request a new one.",
        })
      }

      user.password = password
      user.resetPasswordToken = null
      user.resetPasswordExpires = null
      await user.save()

      console.log(`✅ Password reset: ${user.email}`)
      sendTokenResponse(user, 200, res)
    } catch (err) {
      console.error("[reset-password]", err.message)
      res.status(500).json({ success: false, error: "Failed to reset password. Try again." })
    }
  }
)

module.exports = router
