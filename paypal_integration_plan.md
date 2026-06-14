# PayPal Recurring Payments Implementation Plan

This document outlines the strategy for implementing automated, recurring card payments for website packages and monthly maintenance plans via PayPal.

## Is it possible in Sri Lanka right now?
**Yes!** As of May 15, 2026, PayPal officially launched the ability to *receive* funds in Sri Lanka. You can link a Sri Lankan business bank account (currently supported by Commercial Bank, Sampath Bank, and Bank of Ceylon) to withdraw your earnings.

By setting up PayPal Subscriptions, you can securely store a client's credit/debit card and automatically charge them every month without having to chase them for manual bank transfers. This guarantees your income!

---

## Phase 1: Business Setup & Prerequisites

1. **Create a PayPal Business Account**
   - Register at PayPal Sri Lanka.
   - Link your local bank account (Commercial, Sampath, or BOC) to enable withdrawals.
2. **Access the Developer Dashboard**
   - Go to `developer.paypal.com`.
   - Create a new "App" to get your **Client ID** and **Secret Key**.
3. **Create Billing Products & Plans**
   - In the PayPal Dashboard, create your Maintenance Plans (e.g., Basic $50/mo, Standard $100/mo, Pro $250/mo).
   - PayPal will give you a specific `Plan ID` for each tier.

---

## Phase 2: Frontend Integration (Client-Side)

Currently, the user fills out the form and clicks "Send Request." In the future, this button will be replaced with a secure PayPal checkout flow.

### 1. Add the PayPal SDK
In `index.html`, add the PayPal JavaScript SDK with the `vault=true` flag (required for recurring subscriptions):
```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&vault=true&intent=subscription"></script>
```

### 2. Render the PayPal Buttons
In `js/main.js`, render the PayPal buttons instead of immediately firing our custom `fetch('/api/submit-plan')`.

```javascript
paypal.Buttons({
  style: {
    shape: 'rect',
    color: 'blue',
    layout: 'vertical',
    label: 'subscribe'
  },
  createSubscription: function(data, actions) {
    // Dynamically pass the PayPal Plan ID based on what the user selected in the dropdown
    const selectedPlanId = 'P-XXXXX_PAYPAL_PLAN_ID'; 
    return actions.subscription.create({
      'plan_id': selectedPlanId
    });
  },
  onApprove: async function(data, actions) {
    // The user successfully authorized their card!
    // data.subscriptionID contains their recurring profile ID.
    
    // Now we run our normal code to save them to Firebase, but include the subscription ID!
    await saveToFirebase({
      ...formData,
      paypalSubscriptionId: data.subscriptionID
    });
    
    showToast("Payment Successful! Your plan is active.", "success");
  }
}).render('#paypal-button-container'); // Render into a div in your modal
```

---

## Phase 3: Backend & Webhooks (Server-Side)

To ensure nobody fakes a payment, and to know exactly when a monthly charge succeeds or fails, we need to set up a Webhook in Vercel.

### 1. Create a Webhook Route (`api/paypal-webhook.js`)
Create a new serverless function that listens to automated messages sent by PayPal.

```javascript
// api/paypal-webhook.js
export default async function handler(req, res) {
  const event = req.body;

  // Verify the event came from PayPal (Security Check)
  
  if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    // Update Firebase: Mark client as ACTIVE
  } 
  else if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
    // A monthly recurring payment was just successfully charged!
    // Log the revenue or send a receipt to the client.
  }
  else if (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' || event.event_type === 'PAYMENT.SALE.DENIED') {
    // The client's card declined or they canceled.
    // Update Firebase: Mark client as SUSPENDED and trigger an alert email to the admin.
  }

  res.status(200).send('Webhook Received');
}
```

### 2. Register the Webhook
In the PayPal Developer Dashboard, add the URL to your Vercel webhook (e.g., `https://your-domain.com/api/paypal-webhook`) and select the events you want to listen to.

---

## Alternative Option: PayHere Sri Lanka

While PayPal is highly trusted by international clients, if the majority of your clients are **local Sri Lankans**, you should consider using **PayHere**. 
- PayHere is native to Sri Lanka and fully supports Automated Recurring Billing (ARB) through local credit/debit cards.
- The transaction fees are lower (around 2.69%) compared to PayPal.
- The integration process is very similar: generate an authorization token, pass it to PayHere, and listen to the PayHere webhook to verify recurring success.
