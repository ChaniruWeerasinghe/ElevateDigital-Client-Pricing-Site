# Elevate Digital CRM & Pricing Site

This project contains the pricing site, client onboarding form, and a Mini-CRM for managing maintenance packages. It is built using custom HTML/CSS/JS with a Vercel Serverless Backend.

**Important Account Information:**
> [!IMPORTANT]
> The Firebase database and authentication for this project are hosted on the following Google Account because the main account reached its project limit:
> **Email:** `riverrangeresort2025@gmail.com`

## Features
- **Dynamic Pricing Table:** Compare maintenance packages and select addons.
- **Client Onboarding Form:** Secure modal with real-time validations and discount logic.
- **Admin CRM:** A private dashboard (`admin.html`) to track active clients and payment statuses.
- **Automated Email Reminders:** A daily Vercel cron job that automatically emails clients 10, 5, 2, 1, and 0 days before their maintenance invoice is due.
- **Instant Welcome Emails:** Client receives a branded welcome email immediately upon submitting the form.

## Tech Stack
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Vercel Serverless Functions (`api/`)
- Database & Auth: Firebase Firestore, Firebase Authentication
- Mailing: Nodemailer (SMTP)
