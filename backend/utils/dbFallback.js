const fs = require("fs")
const path = require("path")
const bcrypt = require("bcryptjs")
const mongoose = require("mongoose")

const MOCK_DB_FILE = path.join(__dirname, "..", "mock_db.json")

// Load users from mock database file
const loadUsers = () => {
  try {
    if (!fs.existsSync(MOCK_DB_FILE)) {
      fs.writeFileSync(MOCK_DB_FILE, JSON.stringify([]))
      return []
    }
    const data = fs.readFileSync(MOCK_DB_FILE, "utf8")
    return JSON.parse(data || "[]")
  } catch (e) {
    console.error("Error reading mock DB:", e.message)
    return []
  }
}

// Save users to mock database file
const saveUsers = (users) => {
  try {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(users, null, 2))
  } catch (e) {
    console.error("Error writing mock DB:", e.message)
  }
}

// Wrapper to mimic mongoose document
class MockUserDoc {
  constructor(data) {
    Object.assign(this, data)
    if (!this._id) {
      this._id = "mock_" + Math.random().toString(36).substring(2, 15)
    }
  }

  async comparePassword(candidatePassword) {
    if (!this.password) return false
    return bcrypt.compare(candidatePassword, this.password)
  }

  toSafeObject() {
    const obj = { ...this }
    delete obj.password
    delete obj.resetPasswordToken
    delete obj.resetPasswordExpires
    return obj
  }

  toObject() {
    return { ...this }
  }

  // Support mongoose isModified check
  isModified(field) {
    return true
  }

  async save() {
    const users = loadUsers()
    const index = users.findIndex(u => u._id === this._id)
    
    // Hash password if modified and in plain text
    if (this.password && !this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
      this.password = await bcrypt.hash(this.password, 12)
    }

    if (index !== -1) {
      users[index] = { ...this }
    } else {
      users.push({ ...this })
    }
    saveUsers(users)
    return this
  }
}

// Proxy-like query helper to match mongoose query chaining (like .select("+password"))
class MockQuery {
  constructor(result) {
    this.result = result
  }

  select(fields) {
    // Mimic mongoose select chain
    return this
  }

  // Allow using await on query
  then(onfulfilled, onrejected) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

// Export fallback wrapper
const dbFallback = (mongooseModel) => {
  const handler = {
    // Intercept database calls
    get(target, prop) {
      const isConnected = mongoose.connection.readyState === 1
      
      if (isConnected) {
        return Reflect.get(target, prop)
      }

      console.log(`⚠️ MongoDB Atlas is not connected — falling back to mock database for ${prop}()`)

      if (prop === "findOne") {
        return (query) => {
          const users = loadUsers()
          let foundUser = null

          if (query.$or) {
            foundUser = users.find(u => {
              return query.$or.some(q => {
                if (q.googleId && u.googleId === q.googleId) return true
                if (q.email && u.email && u.email.toLowerCase() === q.email.toLowerCase()) return true
                return false
              })
            })
          } else if (query.email) {
            foundUser = users.find(u => u.email && u.email.toLowerCase() === query.email.toLowerCase())
          } else if (query.resetPasswordToken) {
            foundUser = users.find(u => u.resetPasswordToken === query.resetPasswordToken && new Date(u.resetPasswordExpires) > Date.now())
          }

          const doc = foundUser ? new MockUserDoc(foundUser) : null
          return new MockQuery(doc)
        }
      }

      if (prop === "findById") {
        return (id) => {
          const users = loadUsers()
          const user = users.find(u => u._id === id)
          const doc = user ? new MockUserDoc(user) : null
          return new MockQuery(doc)
        }
      }

      if (prop === "create") {
        return async (data) => {
          const doc = new MockUserDoc(data)
          await doc.save()
          return doc
        }
      }

      // Default to target properties if not intercepted
      return Reflect.get(target, prop)
    }
  }

  return new Proxy(mongooseModel, handler)
}

module.exports = dbFallback
