const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
      alias: "name",
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned in queries by default
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: null,
    },
    profileImage: {
      type: String,
      default: null,
      alias: "avatar",
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      alias: "loginType",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Password reset
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    // User data
    wishlist: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    cart: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    location: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// ── Hash password before saving ──────────────────────────────────────────────
userSchema.pre("save", async function () {
  if (!this.password) return
  
  // Hash only if the password has been modified or is newly set, and is not already hashed
  const isHashed = this.password.startsWith("$2a$") || this.password.startsWith("$2b$")
  if (this.isModified("password") && !isHashed) {
    console.log(`[User.js pre-save] Hashing password for user ${this.email}...`)
    this.password = await bcrypt.hash(this.password, 12)
  }
})


// ── Instance method: compare password ────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// ── Instance method: return safe user object (no password/tokens) ─────────────
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.resetPasswordToken
  delete obj.resetPasswordExpires
  delete obj.__v
  
  // Expose virtual/aliased fields explicitly for compatibility with custom schema expectations
  obj.name = obj.fullName
  obj.avatar = obj.profileImage
  obj.loginType = obj.authProvider
  
  return obj
}

const dbFallback = require("../utils/dbFallback")
module.exports = dbFallback(mongoose.model("User", userSchema))
