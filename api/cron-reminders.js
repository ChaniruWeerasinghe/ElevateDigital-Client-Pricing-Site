const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

// Initialize Firebase Admin (Only once per serverless execution)
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT env variable not found in cron.");
    }
  } catch (err) {
    console.error("Firebase Admin Init Error:", err);
  }
}

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
  // Ensure it's either an authorized Cron request or a local dev POST request
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized cron request' });
  }

  if (admin.apps.length === 0 || !process.env.SMTP_USER) {
    return res.status(500).json({ message: 'System not fully configured (Firebase or SMTP missing)' });
  }

  try {
    const db = admin.firestore();
    const clientsRef = db.collection('clients');
    const snapshot = await clientsRef.get();

    const now = new Date();
    // Normalize "now" to midnight for accurate day difference calculations
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const remindersSent = [];

    // Valid reminder triggers (days remaining)
    const REMINDER_DAYS = [10, 5, 2, 1, 0];

    snapshot.forEach(async (docSnap) => {
      const client = docSnap.data();
      
      if (!client.nextDueDate) return; // Skip if no due date

      const dueDateObj = client.nextDueDate.toDate();
      const dueDate = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate());
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // If diffDays matches one of our trigger thresholds
      if (REMINDER_DAYS.includes(diffDays)) {
        
        let subject = "";
        let headline = "";
        
        if (diffDays === 0) {
          subject = `ACTION REQUIRED: Maintenance Invoice Due Today - ${client.packageName}`;
          headline = `Your Maintenance Payment is Due Today`;
        } else {
          subject = `Reminder: Maintenance Invoice Due in ${diffDays} Days`;
          headline = `Upcoming Maintenance Renewal in ${diffDays} Days`;
        }

        const mailOptions = {
          from: `"Elevate Digital Billing" <${process.env.SMTP_USER}>`,
          to: client.email,
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: ${diffDays === 0 ? '#e11d48' : '#2563eb'};">${headline}</h2>
              <p>Hi ${client.name},</p>
              <p>This is an automated reminder regarding your website maintenance plan.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid ${diffDays === 0 ? '#e11d48' : '#2563eb'}; margin: 20px 0;">
                <h3 style="margin-top: 0;">Invoice Details</h3>
                <p><strong>Package:</strong> ${client.packageName}</p>
                <p><strong>Billing Cycle:</strong> ${client.billingCycle}</p>
                <p><strong>Due Date:</strong> ${dueDateObj.toLocaleDateString()}</p>
                ${client.totalDiscount > 0 ? `<p><strong>Discount Applied:</strong> ${client.totalDiscount}%</p>` : ''}
              </div>
              
              <p>Please make sure to transfer the funds to our primary bank account before the due date to ensure uninterrupted security and maintenance services for your website.</p>
              
              ${diffDays === 0 ? `<p style="font-weight:bold; color:#e11d48;">As a reminder, failure to renew the maintenance plan will result in you assuming full liability for the website's security, uptime, and bug fixes.</p>` : ''}
              
              <p>If you have already made the payment, please reply to this email with the transfer receipt so we can manually update your account status.</p>
              
              <p>Best regards,<br>The Elevate Digital Team</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        remindersSent.push({ email: client.email, daysLeft: diffDays });
      }
    });

    res.status(200).json({ 
      success: true, 
      message: `Cron job executed. Reminders sent: ${remindersSent.length}`,
      data: remindersSent
    });

  } catch (error) {
    console.error("Cron Execution Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error during cron execution." 
    });
  }
};
