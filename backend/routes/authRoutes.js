require("dotenv").config()
const express = require("express")
const { body, validationResult } = require("express-validator")
const crypto = require("crypto")
const { OAuth2Client } = require("google-auth-library")
const { Resend } = require("resend")

const User = require("../models/User")
const { generateToken } = require("../middleware/auth")
const { protect } = require("../middleware/auth")
const { authLimiter, forgotPasswordLimiter } = require("../middleware/rateLimiter")

const router = express.Router()
const resend = new Resend(process.env.RESEND_API_KEY)
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null

// In-memory store for signups awaiting OTP verification
const otpStore = new Map()

// ── Helper: send token response ───────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id)
  const safeUser = user.toSafeObject()

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
    return res.status(400).json({ success: false, error: messages[0] })
  }
  return null
}

// ── Helper: Send OTP email via Resend ────────────────────────────────────────
const sendOtpEmail = async (signupEmail, fullName, otp) => {
  const isDev = process.env.NODE_ENV !== "production"
  const adminEmail = process.env.ADMIN_EMAIL || "gopichand55k@gmail.com"

  // ── Resend Free Plan Note ─────────────────────────────────────────────────
  // Free plan only allows sending to your own verified email address.
  // In dev mode: route all OTPs to ADMIN_EMAIL so delivery always works.
  // In production: add a verified domain at resend.com/domains to send to anyone.
  const toEmail = isDev ? adminEmail : signupEmail
  const isRedirected = isDev && toEmail !== signupEmail

  // ALWAYS log OTP to console
  console.log("")
  console.log("╔══════════════════════════════════════════════════╗")
  console.log("║              OTP EMAIL DETAILS                   ║")
  console.log("╠══════════════════════════════════════════════════╣")
  console.log(`║ Signup Email:  ${signupEmail.padEnd(33)}║`)
  console.log(`║ Deliver To:   ${toEmail.padEnd(34)}║`)
  console.log(`║ Name:         ${(fullName || "").substring(0, 34).padEnd(34)}║`)
  console.log(`║ OTP:          ${otp.padEnd(34)}║`)
  console.log(`║ Expires:      10 minutes                          ║`)
  if (isRedirected) {
    console.log(`║ ⚠  DEV MODE: email routed to ADMIN_EMAIL          ║`)
  }
  console.log("╚══════════════════════════════════════════════════╝")
  console.log("")

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("[OTP] ❌ RESEND_API_KEY is not set in .env")
      return { sent: false, reason: "RESEND_API_KEY not configured" }
    }

    const fromAddress = `Dream D'Accor <onboarding@resend.dev>`
    console.log(`[OTP] 📤 Sending via Resend...`)
    console.log(`[OTP]    From:    ${fromAddress}`)
    console.log(`[OTP]    To:      ${toEmail}${isRedirected ? " (redirected from " + signupEmail + ")" : ""}`)

    // Build subject and body — if redirected, include the signup email clearly
    const subject = isRedirected
      ? `[DEV] OTP ${otp} for ${signupEmail} — Dream D'Accor`
      : `${otp} is your Dream D'Accor verification code`

    const html = `
      <div style="font-family: -apple-system, 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #faf9f6; border-radius: 16px; overflow: hidden; border: 1px solid #e8e4dc;">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 36px 48px; text-align: center;">
          <p style="color: #c8a97e; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: 0.02em;">✦ Dream D&apos;Accor</p>
          <p style="color: rgba(255,255,255,0.55); margin: 6px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Email Verification</p>
        </div>
        ${isRedirected ? `
        <div style="background: #fef3c7; padding: 12px 48px; border-bottom: 1px solid #fde68a;">
          <p style="color: #92400e; font-size: 12px; margin: 0; font-weight: 600;">
            🛠 DEV MODE: This OTP is for <strong>${signupEmail}</strong>
          </p>
        </div>` : ""}
        <div style="padding: 40px 48px; text-align: center;">
          <h2 style="font-size: 20px; color: #1a1a1a; margin: 0 0 12px; font-weight: 700;">Verify Your Email Address</h2>
          <p style="color: #666; line-height: 1.7; margin: 0 0 28px; font-size: 14px;">
            Hello <strong>${fullName}</strong>, enter the code below to complete your registration:
          </p>
          <div style="background: #f0ede6; border-radius: 12px; padding: 24px 32px; display: inline-block; letter-spacing: 10px; font-size: 36px; font-weight: 800; color: #1a1a1a; margin: 0 0 24px; font-family: 'Courier New', monospace; border: 2px solid #c8a97e;">
            ${otp}
          </div>
          <p style="color: #999; font-size: 13px; margin: 0 0 8px;">
            This code expires in <strong>10 minutes</strong>.
          </p>
          <p style="color: #bbb; font-size: 12px; margin: 0;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="background: #f0ede6; padding: 18px 48px; text-align: center; border-top: 1px solid #e8e4dc;">
          <p style="color: #aaa; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Dream D&apos;Accor Luxury Furniture. All rights reserved.</p>
        </div>
      </div>
    `

    const result = await resend.emails.send({ from: fromAddress, to: toEmail, subject, html })

    // Log full response
    console.log("[OTP] 📬 Resend response — data:", JSON.stringify(result.data))
    console.log("[OTP] 📬 Resend response — error:", result.error ? JSON.stringify(result.error) : "null")

    if (result.error) {
      const errStr = JSON.stringify(result.error)
      console.error("[OTP] ❌ Resend error:", errStr)

      if (errStr.includes("only send testing emails")) {
        console.error("[OTP] ⚠️  RESEND FREE PLAN: Can only deliver to verified email. Add a domain at resend.com/domains for production.")
      } else if (errStr.toLowerCase().includes("quota") || errStr.toLowerCase().includes("ratelimit")) {
        console.error("[OTP] ⚠️  QUOTA EXCEEDED: Daily/monthly email limit hit.")
      }
      return { sent: false, reason: result.error.message || errStr }
    }

    if (result.data && result.data.id) {
      console.log(`[OTP] ✅ Email sent! ID: ${result.data.id}${isRedirected ? " → check " + adminEmail : ""}`)
      return { sent: true, messageId: result.data.id, redirectedTo: isRedirected ? toEmail : null }
    }

    return { sent: false, reason: "unexpected_response" }

  } catch (err) {
    console.error("[OTP] ❌ Exception:", err.message)
    return { sent: false, reason: err.message }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/signup (Initiate Signup — sends OTP, does NOT create user yet)
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  "/signup",
  authLimiter,
  [
    body("fullName").trim().isLength({ min: 2 }).withMessage("Full name must be at least 2 characters"),
    body("email").isEmail().normalizeEmail().withMessage("Enter a valid email address"),
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

      console.log(`[signup] 📝 Initiation request for: ${normalizedEmail}`)

      // Check if email already registered
      const existingUser = await User.findOne({ email: normalizedEmail })
      if (existingUser) {
        console.log(`[signup] ⚠️  Email already in use: ${normalizedEmail}`)
        return res.status(409).json({
          success: false,
          error: "An account with this email already exists.",
        })
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes (more forgiving)

      // Store pending signup in memory
      otpStore.set(normalizedEmail, {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        phoneNumber: phoneNumber?.trim() || null,
        otp,
        expiresAt,
        attempts: 0
      })

      console.log(`[signup] 🔑 OTP generated for ${normalizedEmail}: ${otp} (expires in 10 min)`)

      // Send OTP email
      const emailResult = await sendOtpEmail(normalizedEmail, fullName.trim(), otp)

      // Build response
      const isDev = process.env.NODE_ENV !== "production"
      const adminEmail = process.env.ADMIN_EMAIL || "gopichand55k@gmail.com"
      const isRedirected = isDev && normalizedEmail !== adminEmail

      const response = {
        success: true,
        otpRequired: true,
        email: normalizedEmail,
        emailSent: emailResult.sent,
        message: emailResult.sent
          ? isRedirected
            ? `OTP sent to ${adminEmail} (dev mode — Resend free plan routes to verified address). Code also shown in modal.`
            : `Verification code sent to ${normalizedEmail}. Check your inbox and spam folder.`
          : `Email delivery failed. OTP is shown in the modal (dev mode).`,
      }

      // In development: always include OTP in response
      if (isDev) {
        response.devOtp = otp
        response.devNote = `[DEV] OTP=${otp}. Email delivered to: ${emailResult.sent ? (isRedirected ? adminEmail : normalizedEmail) : "FAILED"}`
        console.log(`[signup] 🛠  DEV MODE — OTP: ${otp}`)
        if (isRedirected && emailResult.sent) {
          console.log(`[signup] 📧 Check inbox: ${adminEmail} (subject includes "${normalizedEmail}")`)
        }
      }

      return res.status(200).json(response)
    } catch (err) {
      console.error("[signup] ❌ Error:", err.message)
      console.error(err)
      res.status(500).json({ success: false, error: "Signup failed. Please try again." })
    }
  }
)

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/verify-otp (Verify OTP & Create User)
// ══════════════════════════════════════════════════════════════════════════════
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: "Email and verification code are required." })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const enteredOtp = String(otp).trim()

    console.log(`[verify-otp] 🔍 Verifying OTP for: ${normalizedEmail}`)
    console.log(`[verify-otp]    Entered OTP: ${enteredOtp}`)

    const storedData = otpStore.get(normalizedEmail)

    if (!storedData) {
      console.warn(`[verify-otp] ❌ No pending session found for: ${normalizedEmail}`)
      console.warn(`[verify-otp]    Active sessions: ${[...otpStore.keys()].join(", ") || "none"}`)
      return res.status(400).json({
        success: false,
        error: "Verification session not found or expired. Please sign up again."
      })
    }

    console.log(`[verify-otp]    Stored OTP: ${storedData.otp}`)
    console.log(`[verify-otp]    Expires at: ${new Date(storedData.expiresAt).toISOString()}`)
    console.log(`[verify-otp]    Now:        ${new Date().toISOString()}`)

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(normalizedEmail)
      console.warn(`[verify-otp] ⏰ OTP expired for: ${normalizedEmail}`)
      return res.status(400).json({
        success: false,
        error: "Verification code has expired. Please sign up again to receive a new code."
      })
    }

    if (storedData.otp !== enteredOtp) {
      storedData.attempts = (storedData.attempts || 0) + 1
      console.warn(`[verify-otp] ❌ Wrong OTP. Entered: ${enteredOtp}, Expected: ${storedData.otp}, Attempt: ${storedData.attempts}`)
      if (storedData.attempts >= 5) {
        otpStore.delete(normalizedEmail)
        return res.status(400).json({
          success: false,
          error: "Too many incorrect attempts. Please sign up again."
        })
      }
      return res.status(400).json({
        success: false,
        error: `Invalid verification code. ${5 - storedData.attempts} attempt(s) remaining.`
      })
    }

    // OTP matched! Create user in database
    console.log(`[verify-otp] ✅ OTP verified for: ${normalizedEmail}. Creating account...`)
    const user = await User.create({
      fullName: storedData.fullName,
      email: storedData.email,
      password: storedData.password,
      phoneNumber: storedData.phoneNumber,
      authProvider: "local",
      isEmailVerified: true
    })

    // Clean up session
    otpStore.delete(normalizedEmail)

    console.log(`[verify-otp] 🎉 User account created successfully: ${user.email}`)
    sendTokenResponse(user, 201, res)
  } catch (err) {
    console.error("[verify-otp] ❌ Error:", err.message)
    console.error(err)
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "An account with this email already exists." })
    }
    res.status(500).json({ success: false, error: "Verification failed. Please try again." })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/resend-otp
// ══════════════════════════════════════════════════════════════════════════════
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required." })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const storedData = otpStore.get(normalizedEmail)

    console.log(`[resend-otp] 📨 Resend request for: ${normalizedEmail}`)

    if (!storedData) {
      console.warn(`[resend-otp] ❌ No session found for: ${normalizedEmail}`)
      return res.status(400).json({
        success: false,
        error: "Verification session not found. Please sign up again."
      })
    }

    // Generate new OTP & extend expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    storedData.otp = otp
    storedData.expiresAt = Date.now() + 10 * 60 * 1000 // Reset to 10 min
    storedData.attempts = 0
    otpStore.set(normalizedEmail, storedData)

    console.log(`[resend-otp] 🔑 New OTP for ${normalizedEmail}: ${otp}`)

    const emailResult = await sendOtpEmail(normalizedEmail, storedData.fullName, otp)

    const isDev = process.env.NODE_ENV !== "production"
    const response = {
      success: true,
      emailSent: emailResult.sent,
      message: emailResult.sent
        ? `New verification code sent to ${normalizedEmail}.`
        : `Could not send email. Check the server console for the OTP code.`,
    }

    if (isDev) {
      response.devOtp = otp
    }

    return res.status(200).json(response)
  } catch (err) {
    console.error("[resend-otp] ❌ Error:", err.message)
    res.status(500).json({ success: false, error: "Failed to resend verification code." })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail().withMessage("Enter a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { email, password } = req.body

      // Find user WITH password (select: false by default)
      const user = await User.findOne({ email: email.toLowerCase() }).select("+password")
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password.",
        })
      }

      // Check if it's a Google account trying to use password
      if (user.authProvider === "google" && !user.password) {
        return res.status(400).json({
          success: false,
          error: "This account uses Google Sign-In. Please use the Google button to log in.",
        })
      }

      // Validate password
      const isMatch = await user.comparePassword(password)
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password.",
        })
      }

      console.log(`✅ User login: ${user.email}`)
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

    // Upsert: find by googleId or email, then update or create
    let user = await User.findOne({ $or: [{ googleId }, { email }] })

    if (user) {
      // Update Google info if needed
      if (!user.googleId) user.googleId = googleId
      if (!user.profileImage && picture) user.profileImage = picture
      if (user.authProvider !== "google") user.authProvider = "google"
      await user.save()
    } else {
      // New Google user
      user = await User.create({
        fullName: name || "Google User",
        email,
        googleId,
        profileImage: picture || null,
        authProvider: "google",
        isEmailVerified: true, // Google accounts are pre-verified
      })
    }

    console.log(`✅ Google auth: ${user.email}`)
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
// GET /api/auth/me  (protected)
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
// POST /api/auth/logout
// ══════════════════════════════════════════════════════════════════════════════
router.post("/logout", (req, res) => {
  // JWTs are stateless — just clear the cookie on client side
  res.json({ success: true, message: "Logged out successfully." })
})

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// ══════════════════════════════════════════════════════════════════════════════
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  [body("email").isEmail().normalizeEmail().withMessage("Enter a valid email")],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { email } = req.body
      const user = await User.findOne({ email })

      // Always return success (don't leak whether email exists)
      if (!user) {
        return res.json({
          success: true,
          message: "If that email exists, a reset link has been sent.",
        })
      }

      // Google-only accounts can't use password reset
      if (user.authProvider === "google" && !user.password) {
        return res.json({
          success: true,
          message: "If that email exists, a reset link has been sent.",
        })
      }

      // Generate reset token
      const rawToken = crypto.randomBytes(32).toString("hex")
      const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")

      user.resetPasswordToken = hashedToken
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      await user.save()

      // Build reset URL (frontend URL)
      const frontendUrl = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",")[0].trim()
        : "http://localhost:5173"
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`

      // Send email via Resend
      const { error } = await resend.emails.send({
        from: process.env.FROM_EMAIL || "onboarding@resend.dev",
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

      if (error) {
        console.error("[forgot-password email]", error)
        // Don't fail the request — token is still saved
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

      // Hash the incoming raw token to compare with stored hash
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

      // Update password and clear reset fields
      user.password = password // will be hashed by pre-save hook
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
