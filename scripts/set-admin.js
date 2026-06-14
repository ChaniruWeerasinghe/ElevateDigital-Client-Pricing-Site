const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');

// 1. Read the .env file to extract the FIREBASE_SERVICE_ACCOUNT JSON string
const envData = fs.readFileSync('.env', 'utf8');
const match = envData.match(/FIREBASE_SERVICE_ACCOUNT='([\s\S]*?)'/);

if (!match || !match[1]) {
  console.error("Could not find FIREBASE_SERVICE_ACCOUNT in .env");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(match[1]);
} catch (e) {
  console.error("Failed to parse JSON from .env", e);
  process.exit(1);
}

// 2. Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

// 3. Set the Custom Claim for the specified email
const email = 'chanirub2003@gmail.com';

async function setAdmin() {
  try {
    const user = await getAuth().getUserByEmail(email);
    await getAuth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Success! Granted { admin: true } to user: ${user.email} (UID: ${user.uid})`);
    process.exit(0);
  } catch (error) {
    console.error("Error setting custom claims:", error);
    process.exit(1);
  }
}

setAdmin();
