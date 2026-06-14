const nodemailer = require('nodemailer');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

// Initialize Firebase Admin (Only once per serverless execution)
if (getApps().length === 0) {
  try {
    // Vercel Environment Variables need to contain the Firebase Service Account JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT env variable not found. Firestore saving will fail.");
    }
  } catch (err) {
    console.error("Firebase Admin Init Error:", err);
  }
}

// Nodemailer Transporter Setup
// e.g. using a generic SMTP or Gmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { name, email, phone, packageName, billingCycle, couponCode } = req.body;

    if (!name || !email || !phone || !packageName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Server-side Coupon Logic (Mirroring frontend for security)
    const MOCK_COUPONS = {
      'FAMILY20': 20,
      'ELEVATE10': 10,
      'START50': 50
    };
    
    let couponDiscount = 0;
    if (couponCode && MOCK_COUPONS[couponCode.toUpperCase()]) {
      couponDiscount = MOCK_COUPONS[couponCode.toUpperCase()];
    }

    let billingDiscount = 0;
    if (billingCycle === 'semi-annual') billingDiscount = 10;
    else if (billingCycle === 'annual') billingDiscount = 20;

    const totalDiscount = Math.min(couponDiscount + billingDiscount, 100);

    // Calculate Due Date based on Package Warranty
    const WARRANTY_DAYS = {
      'Starter': 30,
      'Digital Presence': 30,
      'Business Standard': 45,
      'Business Pro': 45,
      'E-Commerce': 60,
      'E-Commerce Pro': 90,
      'Custom Web Application': 90
    };
    
    // Default to 30 if somehow a weird package name gets through
    const warrantyDays = WARRANTY_DAYS[packageName] || 30;

    const now = new Date();
    const dueDate = new Date();
    dueDate.setDate(now.getDate() + warrantyDays);

    // 1. Save to Firebase Firestore
    let clientId = "pending";
    if (getApps().length > 0) {
      const db = getFirestore();
      const docRef = await db.collection('clients').add({
        name,
        email,
        phone,
        packageName,
        billingCycle,
        couponCode: couponCode || null,
        totalDiscount,
        nextDueDate: Timestamp.fromDate(dueDate),
        createdAt: FieldValue.serverTimestamp(),
        status: 'warranty'
      });
      clientId = docRef.id;
    }

    // 2. Send Emails via Nodemailer
    if (process.env.SMTP_USER) {
      // Email to Client
      const clientMailOptions = {
        from: `"Elevate Digital" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Your Web Development Package: ${packageName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #2563eb;">Welcome to Elevate Digital!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for choosing the <strong>${packageName}</strong> package.</p>
            <p>Your request has been successfully received, and we are thrilled to start working with you. We will be in touch shortly via email or phone (${phone}) to discuss the next steps.</p>
            
            <div style="background: #f4f6f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Subscription Summary</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Package:</strong> ${packageName}</li>
                <li><strong>Maintenance Cycle:</strong> ${billingCycle.replace('-', ' ').toUpperCase()}</li>
                ${couponCode ? `<li><strong>Coupon Applied:</strong> ${couponCode} (-${couponDiscount}%)</li>` : ''}
                <li><strong>Total Maintenance Discount:</strong> ${totalDiscount}%</li>
              </ul>
              <p style="font-size: 0.85rem; color: #666; margin-bottom: 0;">
                <em>Note: Your first ${warrantyDays} days after launch are covered under our free post-launch warranty. Your first maintenance invoice will be generated on ${dueDate.toLocaleDateString()}.</em>
              </p>
            </div>
            
            <p>If you have any immediate questions, feel free to reply to this email.</p>
            <p>Best regards,<br>The Elevate Digital Team</p>
          </div>
        `
      };

      // Email to Admin
      const adminMailOptions = {
        from: `"CRM System" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
        subject: `New Lead: ${name} - ${packageName}`,
        html: `
          <h2>New Client Registration</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Package:</strong> ${packageName}</p>
          <p><strong>Billing:</strong> ${billingCycle}</p>
          <p><strong>Discount:</strong> ${totalDiscount}% (Coupon: ${couponCode || 'None'})</p>
          <p><strong>System Status:</strong> Client saved to Firebase with ID: ${clientId}</p>
        `
      };

      await transporter.sendMail(clientMailOptions);
      await transporter.sendMail(adminMailOptions);
    } else {
      console.warn("SMTP_USER not set. Skipping email delivery.");
    }

    res.status(200).json({ 
      success: true, 
      message: "Request submitted successfully!" 
    });

  } catch (error) {
    console.error("Submit Plan Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error while processing request." 
    });
  }
};
