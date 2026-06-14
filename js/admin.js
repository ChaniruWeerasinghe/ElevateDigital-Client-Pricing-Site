// Import Firebase SDKs (v10 modular via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: Replace with your Firebase Project Config
const firebaseConfig = {
  apiKey: "AIzaSyCmzWd5XRMaxNAv1VExf3E65ArGdj4SwwI",
  authDomain: "elevatedigital-client-db.firebaseapp.com",
  projectId: "elevatedigital-client-db",
  storageBucket: "elevatedigital-client-db.firebasestorage.app",
  messagingSenderId: "593887188272",
  appId: "1:593887188272:web:29478d8fbd9721c933a4f5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('login-error');
const btnLogout = document.getElementById('btn-logout');
const btnGoogleLogin = document.getElementById('btn-google-login');
const btnForgotPassword = document.getElementById('btn-forgot-password');
const tbody = document.getElementById('clients-tbody');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statDue = document.getElementById('stat-due');
const statOverdue = document.getElementById('stat-overdue');

// --- Auth State Listener ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is logged in
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadClients();
  } else {
    // User is signed out
    loginSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
  }
});

// --- Login Logic ---
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');

    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Logging in...';
    loginError.textContent = '';

    try {
      // For testing without real config, you can bypass this if needed, 
      // but assuming the user will add real config later.
      if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        loginError.textContent = "Please configure Firebase in js/admin.js first!";
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      loginError.textContent = "Invalid email or password.";
      console.error(error);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Login with Email <i class="ph ph-sign-in"></i>';
    }
  });
}

// --- Google Sign-In Logic ---
if (btnGoogleLogin) {
  btnGoogleLogin.addEventListener('click', async () => {
    loginError.textContent = '';
    btnGoogleLogin.disabled = true;
    btnGoogleLogin.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Connecting...';

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      loginError.textContent = "Google Sign-In failed or was cancelled.";
    } finally {
      btnGoogleLogin.disabled = false;
      btnGoogleLogin.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign in with Google';
    }
  });
}

// --- Forgot Password Logic ---
if (btnForgotPassword) {
  btnForgotPassword.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    
    if (!email) {
      loginError.textContent = "Please enter your email address first to reset your password.";
      return;
    }

    loginError.textContent = '';
    btnForgotPassword.textContent = "Sending...";

    try {
      await sendPasswordResetEmail(auth, email);
      loginError.style.color = "var(--accent)";
      loginError.textContent = "Password reset email sent! Check your inbox.";
    } catch (error) {
      console.error(error);
      loginError.style.color = "var(--danger)";
      loginError.textContent = "Error sending reset email. Make sure the email is registered.";
    } finally {
      btnForgotPassword.textContent = "Forgot Password?";
    }
  });
}

// --- Logout Logic ---
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    signOut(auth);
  });
}

// --- Load Dashboard Data ---
async function loadClients() {
  if (firebaseConfig.apiKey === "YOUR_API_KEY") return;

  try {
    const clientsRef = collection(db, "clients");
    const snapshot = await getDocs(clientsRef);
    
    let html = '';
    let total = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    const now = new Date();

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">No clients found.</td></tr>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      total++;
      const client = docSnap.data();
      const clientId = docSnap.id;
      
      // Calculate days until due
      const dueDate = client.nextDueDate ? client.nextDueDate.toDate() : new Date();
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let statusHtml = '';
      let isDueOrOverdue = false;

      if (diffDays < 0) {
        statusHtml = `<span class="status-badge status-overdue"><i class="ph-fill ph-warning-circle"></i> Overdue by ${Math.abs(diffDays)} days</span>`;
        overdueCount++;
        isDueOrOverdue = true;
      } else if (diffDays <= 10) {
        statusHtml = `<span class="status-badge status-due"><i class="ph-fill ph-clock"></i> Due in ${diffDays} days</span>`;
        dueSoonCount++;
        isDueOrOverdue = true;
      } else {
        statusHtml = `<span class="status-badge status-paid"><i class="ph-fill ph-check-circle"></i> Paid (Due in ${diffDays} days)</span>`;
      }

      html += `
        <tr>
          <td>
            <div class="client-info-cell">
              <span class="client-name">${client.name || 'Unknown'}</span>
            </div>
          </td>
          <td>
            <div class="client-info-cell">
              <span class="client-contact"><i class="ph ph-envelope"></i> ${client.email}</span>
              <span class="client-contact"><i class="ph ph-phone"></i> ${client.phone}</span>
            </div>
          </td>
          <td>
            <div class="client-info-cell">
              <span style="font-weight: 500; color: var(--accent);">${client.packageName}</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: capitalize;">${client.billingCycle} Cycle</span>
            </div>
          </td>
          <td style="font-weight: 500;">
            ${dueDate.toLocaleDateString()}
          </td>
          <td>
            ${statusHtml}
          </td>
          <td>
            <button class="action-btn btn-mark-paid" data-id="${clientId}" data-cycle="${client.billingCycle}" onclick="markAsPaid('${clientId}', '${client.billingCycle}')" ${!isDueOrOverdue ? 'disabled title="Not due yet"' : ''}>
              <i class="ph ph-check-circle"></i> Mark Paid
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    
    // Update Stats
    statTotal.textContent = total;
    statDue.textContent = dueSoonCount;
    statOverdue.textContent = overdueCount;

  } catch (error) {
    console.error("Error loading clients:", error);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 2rem;">Error loading data.</td></tr>`;
  }
}

// --- Mark As Paid Action ---
// We attach this to the global window object so the inline onclick works.
window.markAsPaid = async function(clientId, billingCycle) {
  if (!confirm("Are you sure you want to mark this client as paid? This will push their next due date forward.")) return;

  try {
    const clientRef = doc(db, "clients", clientId);
    
    // Calculate new due date based on billing cycle
    const newDueDate = new Date(); // Start from today
    if (billingCycle === 'annual') {
      newDueDate.setFullYear(newDueDate.getFullYear() + 1);
    } else if (billingCycle === 'semi-annual') {
      newDueDate.setMonth(newDueDate.getMonth() + 6);
    } else {
      newDueDate.setMonth(newDueDate.getMonth() + 1);
    }

    await updateDoc(clientRef, {
      nextDueDate: Timestamp.fromDate(newDueDate)
    });

    alert("Successfully marked as paid!");
    loadClients(); // Reload table

  } catch (error) {
    console.error("Error updating document:", error);
    alert("Failed to update status.");
  }
};
