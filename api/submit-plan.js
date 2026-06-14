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
    const { name, email, phone, companyName, companyAddress, businessType, industry, projectBrief, timeline, packageName, planType, maintenanceTier, billingCycle, couponCode, paypalSubscriptionId } = req.body;

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
    if (billingCycle === 'semi-annual') billingDiscount = 5;
    else if (billingCycle === 'annual') billingDiscount = 10;

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
    const isMaintenanceOnly = planType === 'maintenance';
    const warrantyDays = isMaintenanceOnly ? 0 : (WARRANTY_DAYS[packageName] || 30);

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
        companyName: companyName || null,
        companyAddress: companyAddress || null,
        businessType: businessType || null,
        industry: industry || null,
        projectBrief: projectBrief || null,
        timeline: timeline || null,
        packageName,
        planType: planType || 'package',
        maintenanceTier: maintenanceTier || 'none',
        billingCycle,
        couponCode: couponCode || null,
        totalDiscount,
        paypalSubscriptionId: paypalSubscriptionId || null,
        nextDueDate: isMaintenanceOnly ? null : Timestamp.fromDate(dueDate),
        createdAt: FieldValue.serverTimestamp(),
        status: isMaintenanceOnly ? 'active' : 'warranty'
      });
      clientId = docRef.id;
    }
    // --- PAYPAL API: GENERATE DRAFT INVOICE (50% DEPOSIT) ---
    let draftInvoiceId = null;
    let depositAmount = 0;
    if (planType === 'package' && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET) {
      const packagePrices = {
        'Starter': 350,
        'Digital Presence': 750,
        'Business Standard': 1500,
        'Business Pro': 3500,
        'E-Commerce': 4500,
        'E-Commerce Pro': 8500
      };
      
      const fullPrice = packagePrices[packageName];
      if (fullPrice) {
        depositAmount = (fullPrice * 0.5).toFixed(2);
        try {
          // 1. Get Access Token
          const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
          const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          const tokenData = await tokenRes.json();
          
          if (tokenData.access_token) {
            // 2. Create Draft Invoice
            const invoicePayload = {
              "detail": {
                "currency_code": "USD",
                "note": "Thank you for choosing Elevate Digital! This invoice is for the 50% upfront deposit to officially kick off your web development project."
              },
              "primary_recipients": [{
                "billing_info": {
                  "name": { "given_name": name },
                  "email_address": email
                }
              }],
              "items": [{
                "name": `50% Deposit - ${packageName} Package`,
                "quantity": "1",
                "unit_amount": {
                  "currency_code": "USD",
                  "value": depositAmount.toString()
                }
              }]
            };

            const invoiceRes = await fetch('https://api-m.sandbox.paypal.com/v2/invoicing/invoices', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(invoicePayload)
            });
            const invoiceData = await invoiceRes.json();
            
            if (invoiceData.id) {
              draftInvoiceId = invoiceData.id;
            } else {
              console.error("PayPal Invoice Creation Failed:", invoiceData);
            }
          }
        } catch (paypalErr) {
          console.error("PayPal API Error:", paypalErr);
        }
      }
    }
    // --- END PAYPAL API ---

    // 2. Send Emails via Nodemailer
    if (process.env.SMTP_USER) {
      // Email to Client
      let clientSubject = '';
      let clientHtml = '';
      
      if (isMaintenanceOnly) {
        let monthlyPrice = 0;
        let features = '';
        if (packageName === 'Basic Maintenance') {
          monthlyPrice = 50;
          features = '<li>Software/plugin updates</li><li>Weekly backups</li><li>Security patches & uptime monitoring</li>';
        } else if (packageName === 'Standard Maintenance') {
          monthlyPrice = 150;
          features = '<li>Daily backups</li><li>Security hardening & malware scans</li><li>Monthly performance reports</li><li>Priority email support</li>';
        } else if (packageName === 'Pro Maintenance') {
          monthlyPrice = 300;
          features = '<li>Real-time backups</li><li>Speed & performance optimization</li><li>SEO monitoring & adjustments</li><li>Priority same-day support</li>';
        }

        let cycleMonths = 1;
        if (billingCycle === 'semi-annual') cycleMonths = 6;
        if (billingCycle === 'annual') cycleMonths = 12;

        let subtotal = monthlyPrice * cycleMonths;
        let finalPrice = subtotal - (subtotal * (totalDiscount / 100));

        clientSubject = `Your Maintenance Plan: ${packageName}`;
        clientHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #10b981;">Maintenance Plan Activated!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for returning to Elevate Digital. We have received your request to start the <strong>${packageName}</strong>.</p>
            <p>We are thrilled to continue keeping your website secure, fast, and up-to-date.</p>
            
            ${paypalSubscriptionId ? `<div style="background: #eef2ff; padding: 15px; border-left: 4px solid #4f46e5; margin: 20px 0;">
              <strong>Automated Billing Active</strong><br>
              Your payment method has been securely saved via PayPal (Subscription ID: ${paypalSubscriptionId}). You will be automatically billed based on your cycle, so you never have to worry about missing a payment.
            </div>` : ''}

            <div style="background: #f2fbf7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Subscription Summary</h3>
              <ul style="list-style: none; padding: 0; line-height: 1.6;">
                <li><strong>Plan:</strong> ${packageName}</li>
                <li><strong>Billing Cycle:</strong> ${billingCycle.replace('-', ' ').toUpperCase()}</li>
                ${couponCode ? `<li><strong>Coupon Applied:</strong> ${couponCode} (-${couponDiscount}%)</li>` : ''}
                <li><strong>Discount Applied:</strong> ${totalDiscount}%</li>
                <li><strong>Total Recurring Charge:</strong> $${finalPrice.toFixed(2)} USD / ${billingCycle.replace('-', ' ')}</li>
              </ul>
            </div>

            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h3 style="margin-top: 0; font-size: 1.1rem;">What is included in this plan?</h3>
              <ul style="margin-bottom: 0; padding-left: 20px; line-height: 1.6;">
                ${features}
              </ul>
            </div>
            
            <p>If you have any immediate questions, feel free to reply directly to this email.</p>
            <p>Best regards,<br>The Elevate Digital Team</p>
          </div>
        `;
      } else {
        clientSubject = `Your Web Development Package: ${packageName}`;
        clientHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #2563eb;">Welcome to Elevate Digital!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for choosing the <strong>${packageName}</strong> package.</p>
            <p>Your project brief has been successfully received! Here is what happens next:</p>
            
            <ol style="background: #eef2ff; padding: 20px 20px 20px 40px; border-radius: 8px; margin: 20px 0; line-height: 1.6;">
              <li><strong>Review:</strong> We are currently reviewing your project requirements.</li>
              <li><strong>Consultation:</strong> We will contact you shortly via email or phone (${phone}) to discuss your vision and align on the final scope.</li>
              <li><strong>Kickoff:</strong> Once everything is approved, we will send you a secure PayPal invoice for a 50% project deposit so we can begin development!</li>
            </ol>
            
            <div style="background: #f4f6f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Subscription Summary</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Package:</strong> ${packageName}</li>
                <li><strong>Future Maintenance Tier:</strong> ${maintenanceTier !== 'none' ? maintenanceTier : 'Opted Out'}</li>
                <li><strong>Future Maintenance Cycle:</strong> ${billingCycle.replace('-', ' ').toUpperCase()}</li>
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
        `;
      }
      
      const clientMailOptions = {
        from: `"Elevate Digital" <${process.env.SMTP_USER}>`,
        to: email,
        subject: clientSubject,
        html: clientHtml
      };

      // Email to Admin
      const adminMailOptions = {
        from: `"CRM System" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
        subject: `New Lead: ${name} - ${packageName} (${planType})`,
        html: `
          <h2>New Client Registration</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          ${companyName ? `<p><strong>Company:</strong> ${companyName}</p>` : ''}
          ${companyAddress ? `<p><strong>Address:</strong> ${companyAddress}</p>` : ''}
          ${businessType ? `<p><strong>Business Type:</strong> ${businessType}</p>` : ''}
          ${industry ? `<p><strong>Industry:</strong> ${industry}</p>` : ''}
          <p><strong>Type:</strong> ${planType}</p>
          <p><strong>Package/Plan Name:</strong> ${packageName}</p>
          ${timeline ? `<p><strong>Target Timeline:</strong> ${timeline}</p>` : ''}
          ${planType === 'package' ? `<p><strong>Future Maintenance Tier:</strong> ${maintenanceTier}</p>` : ''}
          <p><strong>Billing:</strong> ${billingCycle}</p>
          <p><strong>Discount:</strong> ${totalDiscount}% (Coupon: ${couponCode || 'None'})</p>
          ${paypalSubscriptionId ? `<p><strong>PayPal Sub ID:</strong> ${paypalSubscriptionId}</p>` : ''}
          ${projectBrief ? `<h3>Project Brief:</h3><p style="background: #f4f6f8; padding: 15px; border-left: 4px solid #4f46e5; white-space: pre-wrap;">${projectBrief}</p>` : ''}
          ${draftInvoiceId ? `<div style="background: #eef2ff; padding: 15px; border: 1px solid #4f46e5; border-radius: 8px; margin-top: 20px;">
            <h3 style="color: #4f46e5; margin-top: 0;">🚀 Draft Invoice Generated!</h3>
            <p>A draft invoice for the <strong>$${depositAmount}</strong> deposit has been automatically created in your PayPal account.</p>
            <p><strong>PayPal Invoice ID:</strong> ${draftInvoiceId}</p>
            <p><em>After your consultation call, just log into PayPal -> Invoicing -> Drafts, and click Send!</em></p>
          </div>` : ''}
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
