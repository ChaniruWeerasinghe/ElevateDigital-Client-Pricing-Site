# Project Progress Log

This document tracks the major milestones, features, and security implementations added to the Elevate Digital CRM & Pricing Site over time.

## Phase 1: Core Pricing & Lead Capture
- [x] **Dynamic Pricing Tables:** Interactive tables allowing users to select packages and addons.
- [x] **Real-Time Currency Converter:** Live LKR to USD conversion toggle for pricing transparency.
- [x] **Lead Capture Form:** Secure onboarding modal collecting client details (name, email, phone, industry) and saving directly to Firebase Firestore.
- [x] **Automated Welcome Emails:** Nodemailer integration via Vercel Serverless Functions to instantly email new leads.

## Phase 2: CRM Dashboard & Automated Billing
- [x] **Private Admin Portal (`/admin.html`):** A secure dashboard to manage active subscriptions.
- [x] **Automated Email Reminders:** Vercel Cron Job configured to scan the database daily and email clients exactly 10, 5, 2, 1, and 0 days before their maintenance invoice is due.
- [x] **PayPal Webhook Automation:** Backend endpoint (`api/paypal-webhook.js`) deployed to listen for `PAYMENT.SALE.COMPLETED` events and automatically push the client's `nextDueDate` forward without manual intervention.

## Phase 3: UI Upgrades & Enterprise Security
- [x] **Firebase Custom Claims (RBAC):** Removed hardcoded emails. Implemented an enterprise-grade backend script to inject the `{ admin: true }` claim directly into the owner's Google Auth token.
- [x] **Database Lockdown:** Upgraded Firestore Security Rules so only the authenticated admin can read/write the `clients` collection.
- [x] **Premium Admin UI:** Overhauled the dashboard with dynamically generated client avatars, premium badge styling, and custom row hover effects.
- [x] **System Notifications:** Completely removed ugly default browser `alert()` popups and replaced them with professional, animated floating Toast notifications.

## Future / Pending Enhancements
- [ ] Connect custom domain (e.g., `elevatedigital.com`).
- [ ] Enable Vercel Web Analytics to track lead conversions.
