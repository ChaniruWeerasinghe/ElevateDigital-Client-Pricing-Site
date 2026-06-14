// Import Firebase SDKs (v10 modular via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
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
      btn.innerHTML = 'Login <i class="ph ph-sign-in"></i>';
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
