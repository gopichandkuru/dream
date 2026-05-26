const fs = require("fs")
const path = require("path")

const getSeedProducts = () => {
  try {
    const filePath = path.join(__dirname, "..", "..", "frontend", "src", "data", "productData.js")
    if (!fs.existsSync(filePath)) {
      console.warn("⚠️ productData.js not found at:", filePath)
      return []
    }

    const raw = fs.readFileSync(filePath, "utf8")
    
    // We want to parse the productData array. We can use a JS-friendly transform:
    // Replace "export const productData =" with "const productData ="
    // Add "module.exports = { productData };" at the end.
    let code = raw
      .replace(/export\s+const\s+productData\s*=\s*/g, "const productData = ")
      .replace(/export\s+const\s+ROOM_CATEGORIES\s*=\s*/g, "const ROOM_CATEGORIES = ")
      .replace(/export\s+const\s+categories\s*=\s*/g, "const categories = ")
      .replace(/export\s+const\s+formatPrice\s*=\s*/g, "const formatPrice = ")

    code += "\nmodule.exports = { productData };"

    // Save as a temp commonjs file
    const tempFile = path.join(__dirname, "temp_productData.cjs")
    fs.writeFileSync(tempFile, code, "utf8")

    const { productData } = require(tempFile)

    // Clean up
    try {
      fs.unlinkSync(tempFile)
    } catch {}

    return productData
  } catch (err) {
    console.error("❌ Failed to parse seed products:", err.message)
    return []
  }
}

module.exports = { getSeedProducts }
