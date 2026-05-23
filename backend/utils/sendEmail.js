const nodemailer = require("nodemailer")
const { Resend } = require("resend")

// Configure Resend if key exists
let resend = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
}

// Nodemailer SMTP Transporter
const getTransporter = () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  }
  return null
}

/**
 * Generate high-end premium HTML template for Customer Order Confirmation
 */
const generateCustomerHtml = (orderId, totalAmount, customerName, items, address, paymentMethod, paymentId) => {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 14px 10px; border-bottom: 1px solid #f0ede5; color: #1a1a1a; font-weight: 500;">${item.name}</td>
      <td style="padding: 14px 10px; border-bottom: 1px solid #f0ede5; text-align: center; color: #555;">${item.quantity || 1}</td>
      <td style="padding: 14px 10px; border-bottom: 1px solid #f0ede5; text-align: right; color: #1a1a1a; font-weight: 600;">₹${((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}</td>
    </tr>
  `).join("")

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmed — Dream D'Accor</title>
    </head>
    <body style="font-family: 'Outfit', 'Segoe UI', Arial, sans-serif; background-color: #faf9f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #f0ede5;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #131313 0%, #222222 100%); padding: 40px; text-align: center;">
          <span style="color: #c8a97e; font-size: 28px; display: block; margin-bottom: 8px;">✦</span>
          <h1 style="color: #ffffff; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0; letter-spacing: 0.02em;">Dream D'Accor</h1>
          <p style="color: rgba(255,255,255,0.65); margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em;">Premium Furniture & Decor</p>
        </div>

        <!-- Success Banner -->
        <div style="background-color: #f0fdf4; padding: 24px 40px; text-align: center; border-bottom: 1px solid #dcfce7;">
          <div style="font-size: 40px; margin-bottom: 6px;">🎉</div>
          <h2 style="color: #15803d; margin: 0; font-size: 20px; font-weight: 700;">Order Confirmed!</h2>
          <p style="color: #166534; margin: 4px 0 0; font-size: 14px;">Your order has been secured and is being curated with care.</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px;">
          <p style="color: #333333; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
            Hello <strong>${customerName}</strong>,
          </p>
          <p style="color: #555555; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
            Thank you for choosing Dream D'Accor. We are delighted to assist in transforming your living space. Your order details are outlined below.
          </p>

          <!-- Order details box -->
          <div style="background-color: #faf9f6; border: 1px solid #e8e2d9; border-radius: 12px; padding: 22px; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.6;">
              <tr>
                <td style="color: #888888; font-weight: 500; padding: 6px 0; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Order ID</td>
                <td style="color: #1a1a1a; font-weight: 700; text-align: right;">${orderId}</td>
              </tr>
              <tr>
                <td style="color: #888888; font-weight: 500; padding: 6px 0; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Payment Status</td>
                <td style="color: #15803d; font-weight: 700; text-align: right;">PAID</td>
              </tr>
              <tr>
                <td style="color: #888888; font-weight: 500; padding: 6px 0; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Payment Method</td>
                <td style="color: #1a1a1a; text-transform: uppercase; font-weight: 600; text-align: right;">${paymentMethod}</td>
              </tr>
              ${paymentId ? `
              <tr>
                <td style="color: #888888; font-weight: 500; padding: 6px 0; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Transaction ID</td>
                <td style="color: #555555; font-size: 13px; font-family: monospace; text-align: right;">${paymentId}</td>
              </tr>` : ""}
              <tr>
                <td style="color: #888888; font-weight: 500; padding: 12px 0 6px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; border-top: 1px dashed #e8e2d9;">Total Amount</td>
                <td style="color: #c8a97e; font-weight: 800; font-size: 20px; text-align: right; padding-top: 10px; border-top: 1px dashed #e8e2d9;">₹${Number(totalAmount).toLocaleString("en-IN")}</td>
              </tr>
            </table>
          </div>

          <!-- Items Table -->
          <h3 style="color: #131313; font-family: 'Playfair Display', Georgia, serif; font-size: 18px; margin: 0 0 16px; border-bottom: 2px solid #c8a97e; padding-bottom: 6px;">Purchased Items</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f3f1ec;">
                <th style="padding: 10px; text-align: left; color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase;">Product</th>
                <th style="padding: 10px; text-align: center; color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase; width: 60px;">Qty</th>
                <th style="padding: 10px; text-align: right; color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase; width: 100px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Delivery Address -->
          ${address ? `
          <h3 style="color: #131313; font-family: 'Playfair Display', Georgia, serif; font-size: 18px; margin: 0 0 12px;">Shipping Address</h3>
          <p style="background-color: #faf9f6; border: 1px dashed #e8e2d9; border-radius: 8px; padding: 16px; color: #555555; font-size: 14px; line-height: 1.6; margin: 0 0 30px;">
            📍 ${address}
          </p>` : ""}

          <!-- Info Box -->
          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="font-size: 24px; vertical-align: top; padding-right: 14px; width: 30px;">🚚</td>
                <td style="color: #0369a1; font-size: 14px; line-height: 1.6; vertical-align: top;">
                  <strong>White-Glove Shipping Activated:</strong> Our specialized delivery team handles your package with extra care. Your estimated delivery window is <strong>5-7 business days</strong>. A tracking code will be mailed to you shortly.
                </td>
              </tr>
            </table>
          </div>

          <p style="color: #888888; font-size: 13px; line-height: 1.6; text-align: center; margin: 36px 0 0;">
            Need assistance? Reach out to Gopi Chand Kuruva at 
            <a href="mailto:gopichand55k@gmail.com" style="color: #c8a97e; text-decoration: none; font-weight: 600;">gopichand55k@gmail.com</a> or 
            <a href="tel:+919704491654" style="color: #c8a97e; text-decoration: none; font-weight: 600;">+91 9704491654</a>.
          </p>

        </div>

        <!-- Footer -->
        <div style="background-color: #131313; padding: 30px 40px; text-align: center;">
          <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0; line-height: 1.8;">
            © ${new Date().getFullYear()} Dream D'Accor. All rights reserved.<br>
            Andhra Pradesh, India · Luxury & Comfort Combined
          </p>
        </div>

      </div>
    </body>
    </html>
  `
}

/**
 * Generate Admin Order Notification Email
 */
const generateAdminHtml = (orderId, totalAmount, customerName, email, phone, items, address, paymentMethod, paymentId) => {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #f0ede5; color: #1a1a1a;"><strong>${item.name}</strong> (ID: ${item.id})</td>
      <td style="padding: 10px; border-bottom: 1px solid #f0ede5; text-align: center;">${item.quantity || 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #f0ede5; text-align: right;">₹${((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}</td>
    </tr>
  `).join("")

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: #b45309; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 22px;">🚨 New Order Received!</h1>
          <p style="margin: 6px 0 0; opacity: 0.8; font-size: 14px;">Order ID: ${orderId}</p>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="font-size: 16px; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 0; color: #333;">Customer Information</h2>
          <table style="width: 100%; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            <tr>
              <td style="color: #666; width: 120px;"><strong>Name:</strong></td>
              <td style="color: #1a1a1a;">${customerName}</td>
            </tr>
            <tr>
              <td style="color: #666;"><strong>Email:</strong></td>
              <td style="color: #1a1a1a;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="color: #666;"><strong>Phone:</strong></td>
              <td style="color: #1a1a1a;"><a href="tel:${phone}">${phone}</a></td>
            </tr>
            <tr>
              <td style="color: #666;"><strong>Address:</strong></td>
              <td style="color: #1a1a1a;">${address}</td>
            </tr>
          </table>

          <h2 style="font-size: 16px; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; color: #333;">Payment Information</h2>
          <table style="width: 100%; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            <tr>
              <td style="color: #666; width: 120px;"><strong>Method:</strong></td>
              <td style="color: #1a1a1a; text-transform: uppercase;"><strong>${paymentMethod}</strong></td>
            </tr>
            <tr>
              <td style="color: #666;"><strong>Transaction ID:</strong></td>
              <td style="color: #1a1a1a; font-family: monospace;">${paymentId || "N/A"}</td>
            </tr>
            <tr>
              <td style="color: #666;"><strong>Total Amount:</strong></td>
              <td style="color: #b45309; font-weight: bold; font-size: 16px;">₹${Number(totalAmount).toLocaleString("en-IN")}</td>
            </tr>
          </table>

          <h2 style="font-size: 16px; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; color: #333;">Products List</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 8px; text-align: left; color: #555;">Product</th>
                <th style="padding: 8px; text-align: center; color: #555; width: 50px;">Qty</th>
                <th style="padding: 8px; text-align: right; color: #555; width: 90px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px; text-align: center; margin-top: 30px;">
            <p style="margin: 0; color: #b45309; font-size: 13px;">
              Please review and fulfill this order via the admin control panel.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Send automated order confirmation email to both Customer and Admin
 */
const sendOrderEmail = async (to, orderId, totalAmount, customerName = "Valued Customer", items = [], address = "", phone = "", paymentMethod = "online", paymentId = "") => {
  const adminEmail = process.env.ADMIN_EMAIL || "gopichand55k@gmail.com"
  
  const customerHtml = generateCustomerHtml(orderId, totalAmount, customerName, items, address, paymentMethod, paymentId)
  const adminHtml = generateAdminHtml(orderId, totalAmount, customerName, to, phone, items, address, paymentMethod, paymentId)

  // 1. Try Nodemailer (SMTP)
  const transporter = getTransporter()
  if (transporter) {
    console.log("📨 Sending email using Nodemailer (SMTP)...")
    try {
      // Send to Customer
      await transporter.sendMail({
        from: `"Dream D'Accor" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Order Confirmed — ${orderId} | Dream D'Accor`,
        html: customerHtml,
      })
      console.log(`✅ Customer confirmation sent to ${to}`)

      // Send to Admin
      await transporter.sendMail({
        from: `"Dream D'Accor Admin Alert" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `🚨 New Order Placed [${orderId}] — ₹${Number(totalAmount).toLocaleString("en-IN")}`,
        html: adminHtml,
      })
      console.log(`✅ Admin notification sent to ${adminEmail}`)
      return true
    } catch (smtpErr) {
      console.error("❌ SMTP mailing failed:", smtpErr.message)
    }
  }

  // 2. Try Resend as reliable fallback
  if (resend) {
    console.log("📨 Sending email using Resend...")
    try {
      // Send to Customer
      await resend.emails.send({
        from: process.env.FROM_EMAIL || "onboarding@resend.dev",
        to,
        subject: `Order Confirmed — ${orderId} | Dream D'Accor`,
        html: customerHtml,
      })
      console.log(`✅ Customer confirmation sent to ${to} (Resend)`)

      // Send to Admin
      await resend.emails.send({
        from: process.env.FROM_EMAIL || "onboarding@resend.dev",
        to: adminEmail,
        subject: `🚨 New Order Placed [${orderId}] — ₹${Number(totalAmount).toLocaleString("en-IN")}`,
        html: adminHtml,
      })
      console.log(`✅ Admin notification sent to ${adminEmail} (Resend)`)
      return true
    } catch (resendErr) {
      console.error("❌ Resend mailing failed:", resendErr.message)
    }
  }

  // 3. Log details if no active mailer found
  console.warn("⚠️ No active email transporter configured (configure EMAIL_USER/EMAIL_PASS or RESEND_API_KEY). Order logs:")
  console.log(`[Order ${orderId}] Customer: ${customerName} <${to}>, Phone: ${phone}, Amount: ₹${totalAmount}`)
  return false
}

module.exports = sendOrderEmail
