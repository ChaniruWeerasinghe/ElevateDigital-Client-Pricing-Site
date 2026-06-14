# Elevate Digital CRM & Pricing Site

This project serves as the official client-facing pricing website, client onboarding portal, and internal Mini-CRM for managing maintenance subscriptions.

**Live Website:** https://elevate-digital-client-pricing-site.vercel.app

**Important Account Information:**
> [!IMPORTANT]
> The Firebase database and authentication for this project are hosted on the following Google Account because the main account reached its project limit:
> **Email:** `riverrangeresort2025@gmail.com`

## Features

- **Dynamic Pricing & Packages:** Interactive tables comparing web development packages and individual addons.
- **Real-Time Currency Toggle:** Instantly switch all site prices between USD and LKR (using up-to-date conversion rates).
- **Client Onboarding Form:** Secure lead capture modal with real-time field validations. Submissions are stored directly in Firebase Firestore.
- **Admin CRM Portal (`/admin.html`):** A private, secure dashboard built for the agency owner to track active clients, view payment statuses, and monitor overdue maintenance invoices. Secured via Firebase Authentication.
- **Automated Email Reminders:** A daily Vercel cron job that automatically emails clients 10, 5, 2, 1, and 0 days before their maintenance invoice is due.
- **Instant Welcome Emails:** Clients receive a branded welcome email immediately upon submitting the onboarding form.
- **Legal & Transparency Pages:** Includes dedicated `privacy.html`, `terms.html`, and a `glossary.html` to clearly define industry terms to non-technical clients.
- **Agency Assets:** Contains an internal `agency_assets/Master_Web_Development_Contract.md` template used for generating legally binding client agreements.

## Tech Stack

- **Frontend:** HTML5, CSS3 (Custom Properties), Vanilla JavaScript.
- **Backend & APIs:** Vercel Serverless Functions (`api/`).
- **Database & Auth:** Firebase Firestore, Firebase Authentication.
- **Mailing:** Nodemailer (SMTP).
- **Hosting:** Vercel.

## Accessing the Admin Portal

1. Navigate to `https://elevate-digital-client-pricing-site.vercel.app/admin.html`
2. Log in using the authorized administrator email and password.
3. Manage client subscriptions and track maintenance dues through the dashboard.
