// api/paypal-webhook.js
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp(); // Relies on GOOGLE_APPLICATION_CREDENTIALS or Firebase Vercel Integration
}

// Nodemailer config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const event = req.body;

    // TODO: In production, securely verify the webhook signature from PayPal
    // using paypal-rest-sdk or manual verification against PayPal APIs.
    console.log(`Received PayPal Webhook Event: ${event.event_type}`);

    const db = getFirestore();

    // The subscription ID is usually nested depending on the event type
    let subscriptionId = null;
    
    if (event.resource && event.resource.billing_agreement_id) {
      subscriptionId = event.resource.billing_agreement_id;
    } else if (event.resource && event.resource.id) {
      subscriptionId = event.resource.id;
    }

    if (!subscriptionId) {
      return res.status(400).send('No subscription ID found in event');
    }

    // Find the client in our database with this subscription ID
    const clientsRef = db.collection('clients');
    const snapshot = await clientsRef.where('paypalSubscriptionId', '==', subscriptionId).get();

    if (snapshot.empty) {
      console.warn(`No client found for subscription ID: ${subscriptionId}`);
      return res.status(200).send('Event acknowledged, but no matching client.');
    }

    const clientDoc = snapshot.docs[0];
    const clientData = clientDoc.data();
    const clientId = clientDoc.id;

    if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      // Mark as active
      await clientsRef.doc(clientId).update({
        status: 'active'
      });
      console.log(`Client ${clientId} subscription activated.`);
    } 
    else if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
      // A monthly payment succeeded!
      // Here you could save an invoice record or send a receipt
      console.log(`Client ${clientId} monthly payment succeeded.`);
    }
    else if (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' || event.event_type === 'PAYMENT.SALE.DENIED') {
      // Card declined or they cancelled
      await clientsRef.doc(clientId).update({
        status: 'suspended_payment_failed'
      });
      
      // Email Admin about the failure
      if (process.env.SMTP_USER) {
        await transporter.sendMail({
          from: `"CRM System" <${process.env.SMTP_USER}>`,
          to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
          subject: `URGENT: Maintenance Payment Failed for ${clientData.name}`,
          html: `
            <h2>Payment Failed or Cancelled</h2>
            <p>The automated PayPal subscription for <strong>${clientData.name}</strong> has failed or been cancelled.</p>
            <p><strong>Package:</strong> ${clientData.packageName}</p>
            <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
            <p><strong>Client ID:</strong> ${clientId}</p>
            <p>Their database status has been marked as <strong>suspended_payment_failed</strong>. Please contact the client immediately to restore their maintenance plan.</p>
          `
        });
      }
    }

    res.status(200).send('Webhook Processed Successfully');

  } catch (error) {
    console.error("Webhook Processing Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
