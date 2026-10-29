/**
 * Hospital Appointment & Management System (HMS) - Frontend Logic
 */

const API_BASE = '/api/v1';

// Global App State
const state = {
  token: localStorage.getItem('hms_token') || null,
  user: JSON.parse(localStorage.getItem('hms_user') || 'null'),
  doctors: [],
  selectedDoctor: null,
  selectedSlotTime: null,
  activeTab: 'doctors'
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  updateAuthUI();
  loadDoctors();
  setupEventListeners();

  // Set default date for slot picker to today
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('slotDatePicker');
  if (dateInput) {
    dateInput.value = today;
    dateInput.min = today;
  }
});

// --- UI & Tab Navigation ---
function initUI() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;

  // Update nav buttons
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });

  // Show corresponding section
  document.querySelectorAll('.content-section').forEach(sec => {
    sec.style.display = (sec.id === `section-${tabId}`) ? 'block' : 'none';
  });

  // Load data for specific tabs
  if (tabId === 'doctors') {
    loadDoctors();
  } else if (tabId === 'appointments') {
    if (!state.token) {
      openAuthModal('login');
      showToast('Please log in to view your appointments', 'info');
      return;
    }
    loadMyAppointments();
  } else if (tabId === 'doctor-workspace') {
    if (!state.token) {
      openAuthModal('login');
      return;
    }
    loadDoctorWorkspace();
  } else if (tabId === 'admin') {
    if (!state.token) {
      openAuthModal('login');
      return;
    }
    loadAdminReports();
  }
}

// --- Auth State & UI Updates ---
function updateAuthUI() {
  const unauthedActions = document.getElementById('unauthedActions');
  const authedActions = document.getElementById('authedActions');
  const userNameEl = document.getElementById('headerUserName');
  const userRoleEl = document.getElementById('headerUserRole');
  const tabAppointments = document.querySelector('[data-tab="appointments"]');
  const tabDoctor = document.querySelector('[data-tab="doctor-workspace"]');
  const tabAdmin = document.querySelector('[data-tab="admin"]');

  if (state.token && state.user) {
    unauthedActions.style.display = 'none';
    authedActions.style.display = 'flex';
    userNameEl.textContent = state.user.fullName || state.user.email;
    userRoleEl.textContent = state.user.role.replace('ROLE_', '');

    tabAppointments.style.display = 'flex';
    
    // Role-dependent tabs
    tabDoctor.style.display = (state.user.role === 'ROLE_DOCTOR' || state.user.role === 'ROLE_ADMIN') ? 'flex' : 'none';
    tabAdmin.style.display = (state.user.role === 'ROLE_ADMIN') ? 'flex' : 'none';
  } else {
    unauthedActions.style.display = 'flex';
    authedActions.style.display = 'none';
    tabAppointments.style.display = 'none';
    tabDoctor.style.display = 'none';
    tabAdmin.style.display = 'none';
  }
}

function handleLoginSuccess(authData) {
  state.token = authData.token;
  state.user = {
    userId: authData.userId,
    email: authData.email,
    fullName: authData.fullName,
    role: authData.role,
    profileId: authData.profileId
  };

  localStorage.setItem('hms_token', state.token);
  localStorage.setItem('hms_user', JSON.stringify(state.user));

  updateAuthUI();
  closeModal('authModal');
  showToast(`Welcome back, ${state.user.fullName}!`, 'success');

  // Navigate to appropriate section based on role
  if (state.user.role === 'ROLE_ADMIN') {
    switchTab('admin');
  } else if (state.user.role === 'ROLE_DOCTOR') {
    switchTab('doctor-workspace');
  } else {
    switchTab('doctors');
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('hms_token');
  localStorage.removeItem('hms_user');
  updateAuthUI();
  switchTab('doctors');
  showToast('You have been logged out.', 'info');
}

// --- API Helpers ---
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

// --- Quick Demo Logins ---
async function quickDemoLogin(email, password) {
  try {
    showToast(`Signing in as ${email}...`, 'info');
    const res = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    handleLoginSuccess(res.data);
  } catch (err) {
    showToast(err.message || 'Login failed. Verify server is running.', 'error');
  }
}

// --- Doctor Discovery & Directory ---
async function loadDoctors(specialization = '') {
  const grid = document.getElementById('doctorsGrid');
  grid.innerHTML = '<div class="empty-state">Loading doctors directory...</div>';

  try {
    const url = specialization ? `/doctors?specialization=${encodeURIComponent(specialization)}` : '/doctors';
    const res = await apiCall(url);
    state.doctors = res.data || [];

    if (state.doctors.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🩺</div><h3>No doctors found</h3><p>Try changing filter</p></div>';
      return;
    }

    grid.innerHTML = state.doctors.map(doc => `
      <div class="card doctor-card">
        <div class="doctor-header">
          <div class="doctor-avatar-circle">👨‍⚕️</div>
          <div class="doctor-info">
            <h3>Dr. ${escapeHtml(doc.fullName)}</h3>
            <span class="specialty-tag">${escapeHtml(doc.specialization)}</span>
          </div>
        </div>
        <div class="doctor-body">
          <p>${escapeHtml(doc.bio || 'General physician with expertise in outpatient consultation.')}</p>
        </div>
        <div class="doctor-stats">
          <div class="stat-item">
            <span class="stat-label">Fee</span>
            <span class="stat-value fee">$${doc.consultationFee.toFixed(2)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Room</span>
            <span class="stat-value">${escapeHtml(doc.roomNumber)}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Experience</span>
            <span class="stat-value">${doc.experienceYears} yrs</span>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openSlotPicker('${doc.id}')">
          📅 View Slots & Book
        </button>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Failed to load doctors</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

// --- Slot Picker Modal ---
function openSlotPicker(doctorId) {
  const doc = state.doctors.find(d => d.id === doctorId);
  if (!doc) return;
  state.selectedDoctor = doc;
  state.selectedSlotTime = null;

  document.getElementById('slotDoctorName').textContent = `Dr. ${doc.fullName} (${doc.specialization})`;
  document.getElementById('slotDoctorFee').textContent = `$${doc.consultationFee.toFixed(2)}`;
  document.getElementById('slotDoctorRoom').textContent = doc.roomNumber;

  const dateInput = document.getElementById('slotDatePicker');
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  fetchSlotsForDoctor();
  openModal('slotModal');
}

async function fetchSlotsForDoctor() {
  if (!state.selectedDoctor) return;
  const date = document.getElementById('slotDatePicker').value;
  const container = document.getElementById('slotsContainer');
  const bookBtn = document.getElementById('btnConfirmSlotBooking');
  bookBtn.disabled = true;

  container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;">Calculating available appointment slots...</div>';

  try {
    const res = await apiCall(`/doctors/${state.selectedDoctor.id}/slots?date=${date}`);
    const slots = res.data || [];

    if (slots.length === 0) {
      container.innerHTML = '<div style="color:var(--text-dim);grid-column:1/-1;padding:1.5rem;text-align:center;">Doctor is not scheduled on this day. Please select another date.</div>';
      return;
    }

    container.innerHTML = slots.map(s => {
      const startTime = new Date(s.startTime);
      const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const isAvailable = (s.available === true);

      return `
        <div class="slot-chip ${isAvailable ? 'available' : 'booked'}" 
             data-start="${s.startTime}" 
             onclick="${isAvailable ? `selectSlot(this, '${s.startTime}')` : ''}">
          ${timeStr}
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger);font-size:0.85rem;">${escapeHtml(err.message)}</div>`;
  }
}

function selectSlot(element, slotStartTime) {
  document.querySelectorAll('.slot-chip').forEach(c => c.classList.remove('selected'));
  element.classList.add('selected');
  state.selectedSlotTime = slotStartTime;
  document.getElementById('btnConfirmSlotBooking').disabled = false;
}

async function confirmSlotBooking() {
  if (!state.token) {
    closeModal('slotModal');
    openAuthModal('login');
    showToast('Please sign in as a Patient to book this appointment', 'info');
    return;
  }

  if (state.user.role !== 'ROLE_PATIENT') {
    showToast('Only registered Patients can book appointments. (Switch to Patient demo)', 'error');
    return;
  }

  if (!state.selectedDoctor || !state.selectedSlotTime) {
    showToast('Please select a valid slot time', 'error');
    return;
  }

  try {
    showToast('Securing booking transaction...', 'info');
    const res = await apiCall('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        doctorId: state.selectedDoctor.id,
        slotStartTime: state.selectedSlotTime
      })
    });

    closeModal('slotModal');
    showToast(res.message || 'Appointment successfully booked!', 'success');
    switchTab('appointments');
  } catch (err) {
    showToast(err.message || 'Booking conflict! This slot was already booked.', 'error');
  }
}

// --- Patient Appointments ---
async function loadMyAppointments() {
  const container = document.getElementById('myAppointmentsList');
  container.innerHTML = '<div class="empty-state">Loading your appointments...</div>';

  try {
    const res = await apiCall('/appointments/my');
    const appointments = res.data || [];

    if (appointments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No appointments scheduled</h3>
          <p>Browse our doctor directory and book your first consultation.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="switchTab('doctors')">Find Doctors</button>
        </div>
      `;
      return;
    }

    container.innerHTML = appointments.map(app => {
      const startTime = new Date(app.slotStartTime);
      const dateStr = startTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      let badgeClass = 'badge-booked';
      if (app.status === 'COMPLETED') badgeClass = 'badge-completed';
      if (app.status === 'CANCELLED') badgeClass = 'badge-cancelled';
      if (app.status === 'NO_SHOW') badgeClass = 'badge-noshow';

      const canCancel = (app.status === 'BOOKED');

      return `
        <div class="appointment-card">
          <div class="app-meta">
            <div class="app-icon">🩺</div>
            <div>
              <div class="app-title">Dr. ${escapeHtml(app.doctorName)}</div>
              <div class="app-subtitle">${escapeHtml(app.doctorSpecialization || '')} &bull; ${escapeHtml(app.roomNumber || '')}</div>
              <div class="app-time">🕒 ${dateStr} at ${timeStr}</div>
              ${app.cancellationReason ? `<div style="font-size:0.75rem;color:var(--danger);margin-top:0.25rem;">Reason: ${escapeHtml(app.cancellationReason)}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span class="badge ${badgeClass}">${app.status}</span>
            ${canCancel ? `<button class="btn btn-danger btn-sm" onclick="promptCancelAppointment('${app.id}')">Cancel</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Failed to load appointments</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

// --- Cancellation ---
let appointmentToCancel = null;
function promptCancelAppointment(appId) {
  appointmentToCancel = appId;
  document.getElementById('cancelReasonInput').value = '';
  openModal('cancelModal');
}

async function confirmCancelAppointment() {
  if (!appointmentToCancel) return;
  const reason = document.getElementById('cancelReasonInput').value.trim() || 'Patient requested cancellation';

  try {
    await apiCall(`/appointments/${appointmentToCancel}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });

    closeModal('cancelModal');
    showToast('Appointment successfully cancelled. The slot has been released.', 'success');
    loadMyAppointments();
  } catch (err) {
    showToast(err.message || 'Failed to cancel appointment', 'error');
  }
}

// --- Doctor Workspace ---
async function loadDoctorWorkspace() {
  const container = document.getElementById('doctorScheduleList');
  container.innerHTML = '<div class="empty-state">Loading assigned schedule...</div>';

  try {
    // We can fetch via /appointments/my as the doctor
    const res = await apiCall('/appointments/my');
    const appointments = res.data || [];

    if (appointments.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><h3>No patient appointments found</h3><p>Your calendar is clear.</p></div>';
      return;
    }

    container.innerHTML = appointments.map(app => {
      const startTime = new Date(app.slotStartTime);
      const dateStr = startTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const isBooked = (app.status === 'BOOKED');

      return `
        <div class="appointment-card">
          <div class="app-meta">
            <div class="app-icon">👤</div>
            <div>
              <div class="app-title">Patient: ${escapeHtml(app.patientName)}</div>
              <div class="app-subtitle">Contact: ${escapeHtml(app.patientPhone || 'N/A')}</div>
              <div class="app-time">🕒 ${dateStr} at ${timeStr}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <span class="badge ${app.status === 'BOOKED' ? 'badge-booked' : (app.status === 'COMPLETED' ? 'badge-completed' : 'badge-cancelled')}">${app.status}</span>
            ${isBooked ? `
              <button class="btn btn-primary btn-sm" onclick="updateAppointmentStatus('${app.id}', 'COMPLETED')">✓ Complete</button>
              <button class="btn btn-secondary btn-sm" onclick="updateAppointmentStatus('${app.id}', 'NO_SHOW')">No Show</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Failed to load doctor workspace</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function updateAppointmentStatus(appId, status) {
  try {
    await apiCall(`/appointments/${appId}/status?status=${status}`, {
      method: 'PATCH'
    });
    showToast(`Appointment status updated to ${status}`, 'success');
    loadDoctorWorkspace();
  } catch (err) {
    showToast(err.message || 'Status update failed', 'error');
  }
}

// --- Admin Analytics ---
async function loadAdminReports() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const reportRes = await apiCall(`/admin/reports/daily?date=${today}`);
    const r = reportRes.data;

    document.getElementById('kpiTotal').textContent = r.totalAppointments;
    document.getElementById('kpiBooked').textContent = r.activeBookings;
    document.getElementById('kpiCompleted').textContent = r.completedAppointments;
    document.getElementById('kpiRate').textContent = `${(r.cancellationRate * 100).toFixed(1)}%`;

    // Load Busiest Doctors
    const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const end = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const docRes = await apiCall(`/admin/reports/busiest-doctors?startDate=${start}&endDate=${end}&limit=5`);
    const docs = docRes.data || [];

    const tableBody = document.getElementById('busiestDoctorsTableBody');
    if (docs.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);">No appointment activity recorded yet.</td></tr>';
    } else {
      tableBody.innerHTML = docs.map((d, idx) => `
        <tr>
          <td><span style="font-weight:700;color:var(--accent);">#${idx + 1}</span></td>
          <td style="font-weight:600;">Dr. ${escapeHtml(d.doctorName)}</td>
          <td><span class="specialty-tag">${escapeHtml(d.specialization)}</span></td>
          <td style="font-weight:700;color:var(--success);">${d.completedAppointments + d.activeAppointments} visits</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load admin metrics: ' + err.message, 'error');
  }
}

// --- Auth Modal & Form Handling ---
function openAuthModal(mode = 'login') {
  document.getElementById('authModalTitle').textContent = (mode === 'login') ? 'Sign In to Hospital Portal' : 'Register New Patient';
  document.getElementById('loginFormContainer').style.display = (mode === 'login') ? 'block' : 'none';
  document.getElementById('registerFormContainer').style.display = (mode === 'register') ? 'block' : 'none';
  openModal('authModal');
}

function setupEventListeners() {
  // Login Form
  document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      handleLoginSuccess(res.data);
    } catch (err) {
      showToast(err.message || 'Invalid email or password', 'error');
    }
  });

  // Register Form
  document.getElementById('formRegister').addEventListener('submit', async (e) => {
    e.preventDefault();
    const req = {
      email: document.getElementById('regEmail').value.trim(),
      password: document.getElementById('regPassword').value,
      firstName: document.getElementById('regFirstName').value.trim(),
      lastName: document.getElementById('regLastName').value.trim(),
      phoneNumber: document.getElementById('regPhone').value.trim(),
      role: 'ROLE_PATIENT'
    };

    try {
      const res = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(req)
      });
      handleLoginSuccess(res.data);
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    }
  });

  // Specialization Filter
  document.getElementById('specialtyFilter').addEventListener('change', (e) => {
    loadDoctors(e.target.value);
  });
}

// --- Modal Helpers ---
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

// Close modal on background click
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// --- Toast Notifications ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Utility ---
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
