const fs = require("fs")
const path = require("path")

const dbPath = path.join(__dirname, "..", "data", "orders.json")

const ensureDir = () => {
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([], null, 2), "utf8")
  }
}

const getOrders = () => {
  try {
    ensureDir()
    const data = fs.readFileSync(dbPath, "utf8")
    return JSON.parse(data)
  } catch (err) {
    console.error("Database read error:", err)
    return []
  }
}

const saveOrder = (order) => {
  try {
    ensureDir()
    const orders = getOrders()
    orders.push(order)
    fs.writeFileSync(dbPath, JSON.stringify(orders, null, 2), "utf8")
    return order
  } catch (err) {
    console.error("Database write error:", err)
    throw new Error("Failed to save order in database")
  }
}

module.exports = {
  getOrders,
  saveOrder
}
