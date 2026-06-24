// admin.js - Zero Dependency Vanilla JS Admin Dashboard

// 1. STATE MANAGEMENT
const state = {
  token: localStorage.getItem('admin_token') || '',
  user: null,
  stats: {
    totalUsers: 0,
    activeLicenses: 0,
    premiumActive: 0,
    ultimateActive: 0,
    monthlyRevenue: 0.00,
    auditLogs: []
  },
  licenses: [],
  loading: false,
  search: '',
  filterPlan: 'All',
  filterStatus: 'All',
  // Forms & Modals
  showCreateModal: false,
  showEditModal: false,
  selectedLicense: null
};

// 2. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  if (state.token) {
    fetchProfile();
    fetchDashboardData();
  } else {
    render();
  }
}

// 3. API CALLS
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${state.token}`
});

async function fetchProfile() {
  try {
    const res = await fetch('/api/auth/profile', { headers: getHeaders() });
    if (res.ok) {
      state.user = await res.json();
      render();
    } else {
      handleLogout();
    }
  } catch (err) {
    handleLogout();
  }
}

async function fetchDashboardData() {
  state.loading = true;
  render();
  try {
    const [statsRes, licRes] = await Promise.all([
      fetch('/api/license/stats', { headers: getHeaders() }),
      fetch('/api/license/list', { headers: getHeaders() })
    ]);

    if (statsRes.ok && licRes.ok) {
      state.stats = await statsRes.json();
      state.licenses = await licRes.json();
    }
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
  } finally {
    state.loading = false;
    render();
  }
}

async function handleLoginSubmit(email, password) {
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login-submit');
  
  errorEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin mr-2"></i> Authenticating...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    localStorage.setItem('admin_token', data.token);
    state.token = data.token;
    state.user = data.user;
    
    fetchProfile();
    fetchDashboardData();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Access Panel';
  }
}

function handleLogout() {
  localStorage.removeItem('admin_token');
  state.token = '';
  state.user = null;
  render();
}

async function handleCreateLicenseSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('create-form-name').value;
  const email = document.getElementById('create-form-email').value;
  const plan = document.getElementById('create-form-plan').value;
  const duration = document.getElementById('create-form-duration').value;

  try {
    const res = await fetch('/api/license/create', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        name,
        email,
        plan,
        durationMonths: duration
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create license.');

    state.showCreateModal = false;
    fetchDashboardData();
  } catch (err) {
    alert(err.message);
  }
}

async function handleEditLicenseSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('edit-form-name').value;
  const plan = document.getElementById('edit-form-plan').value;
  const status = document.getElementById('edit-form-status').value;
  const expiresAt = document.getElementById('edit-form-expires').value;
  const extend = document.getElementById('edit-form-extend').value;

  try {
    const res = await fetch(`/api/license/update/${state.selectedLicense.id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        name,
        plan,
        status,
        expiresAt: expiresAt || null,
        extendMonths: extend
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update license.');

    state.showEditModal = false;
    fetchDashboardData();
  } catch (err) {
    alert(err.message);
  }
}

async function changeLicenseStatus(id, status) {
  if (!confirm(`Are you sure you want to change license status to ${status}?`)) return;
  try {
    const res = await fetch(`/api/license/update/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    if (res.ok) fetchDashboardData();
  } catch (err) {
    alert('Error updating status');
  }
}

// 4. RENDERING VIEWS
function render() {
  const root = document.getElementById('root');
  if (!state.token) {
    root.innerHTML = renderLogin();
    bindLoginEvents();
  } else {
    root.innerHTML = renderDashboard();
    bindDashboardEvents();
    renderLicenseTable();
    renderAuditLogs();
    renderModals();
  }
}

function renderLogin() {
  return `
    <div class="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div class="w-full max-w-md glass-card rounded-2xl p-8 shadow-2xl">
        <div class="flex flex-col items-center mb-8">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-purple text-white shadow-lg mb-4">
            <i class="fa-solid fa-wand-magic-sparkles text-2xl"></i>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-white">License Admin</h2>
          <p class="text-sm text-slate-400 mt-1">Sign in to manage client subscriptions</p>
        </div>

        <div id="login-error" class="mb-6 rounded-lg bg-red-950/50 border border-red-500/30 p-4 text-sm text-red-200 hidden">
          <i class="fa-solid fa-circle-exclamation mr-2"></i>
        </div>

        <form id="login-form" class="space-y-6">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <i class="fa-regular fa-envelope"></i>
              </span>
              <input
                type="email"
                id="login-email"
                required
                class="w-full rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <i class="fa-solid fa-lock"></i>
              </span>
              <input
                type="password"
                id="login-password"
                required
                class="w-full rounded-xl bg-slate-900 border border-slate-700 pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            id="btn-login-submit"
            class="w-full rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 py-3 font-semibold text-white hover:from-brand-500 hover:to-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition shadow-lg"
          >
            Access Panel
          </button>
        </form>
      </div>
    </div>
  `;
}

function bindLoginEvents() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    handleLoginSubmit(email, password);
  });
}

function renderDashboard() {
  return `
    <div class="min-h-screen bg-slate-950 flex flex-col">
      <!-- Navbar -->
      <header class="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-accent-purple text-white shadow-md">
            <i class="fa-solid fa-crop-simple text-lg"></i>
          </div>
          <div>
            <h1 class="text-lg font-bold tracking-tight text-white">Smart Image Editor</h1>
            <p class="text-2xs text-slate-400">Licensing Administrator Studio</p>
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <div class="flex flex-col text-right">
            <span class="text-sm font-semibold text-slate-200">${state.user?.name || 'Administrator'}</span>
            <span class="text-xs text-slate-400">${state.user?.email || ''}</span>
          </div>
          <button 
            id="btn-logout"
            class="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-red-950/30 hover:text-red-400 transition"
            title="Log Out"
          >
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </header>

      <!-- Stats Summary Panel -->
      <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div class="glass-card rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</p>
              <h3 class="text-2xl font-bold mt-1 text-white">${state.stats.totalUsers}</h3>
            </div>
            <div class="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center text-brand-400">
              <i class="fa-solid fa-users text-lg"></i>
            </div>
          </div>
          <div class="glass-card rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Licenses</p>
              <h3 class="text-2xl font-bold mt-1 text-white">${state.stats.activeLicenses}</h3>
            </div>
            <div class="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center text-accent-emerald">
              <i class="fa-solid fa-key text-lg"></i>
            </div>
          </div>
          <div class="glass-card rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Premium Active</p>
              <h3 class="text-2xl font-bold mt-1 text-white">${state.stats.premiumActive}</h3>
            </div>
            <div class="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
              <i class="fa-solid fa-gem text-lg"></i>
            </div>
          </div>
          <div class="glass-card rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Ultimate Active</p>
              <h3 class="text-2xl font-bold mt-1 text-white">${state.stats.ultimateActive}</h3>
            </div>
            <div class="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center text-accent-purple">
              <i class="fa-solid fa-crown text-lg"></i>
            </div>
          </div>
          <div class="glass-card rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Est. MRR</p>
              <h3 class="text-2xl font-bold mt-1 text-accent-emerald">$${state.stats.monthlyRevenue.toFixed(2)}</h3>
            </div>
            <div class="h-12 w-12 rounded-xl bg-accent-emerald/10 flex items-center justify-center text-accent-emerald">
              <i class="fa-solid fa-dollar-sign text-lg"></i>
            </div>
          </div>
        </div>

        <!-- Dashboard Content split -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col space-y-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 class="text-lg font-bold text-white">Active Licenses</h2>
                <p class="text-xs text-slate-400">Create, renew, and suspend credentials</p>
              </div>
              <button 
                id="btn-open-create"
                class="rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition flex items-center space-x-2"
              >
                <i class="fa-solid fa-plus"></i>
                <span>Generate License</span>
              </button>
            </div>

            <!-- Filter Search controls -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="relative sm:col-span-1">
                <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <i class="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input
                  type="text"
                  id="filter-search"
                  placeholder="Search user, email or key..."
                  class="w-full rounded-xl bg-slate-900/80 border border-slate-800 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <select
                  id="filter-plan"
                  class="w-full rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="All">All Plans</option>
                  <option value="Free">Free</option>
                  <option value="Premium">Premium</option>
                  <option value="Ultimate">Ultimate</option>
                </select>
              </div>
              <div>
                <select
                  id="filter-status"
                  class="w-full rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Revoked">Revoked</option>
                </select>
              </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto rounded-xl border border-slate-800">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-900/70 border-b border-slate-800 text-2xs uppercase tracking-wider text-slate-400 font-semibold">
                    <th class="p-3">User & Email</th>
                    <th class="p-3">Plan</th>
                    <th class="p-3">License Key</th>
                    <th class="p-3">Expiry</th>
                    <th class="p-3">Status</th>
                    <th class="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="license-table-body" class="divide-y divide-slate-800/50 text-xs">
                  <!-- Injected dynamically -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Audit Logs -->
          <div class="glass-card rounded-2xl p-6 flex flex-col space-y-4">
            <div>
              <h2 class="text-lg font-bold text-white">System Security Log</h2>
              <p class="text-xs text-slate-400">Verifications and modifications</p>
            </div>
            <div id="audit-log-container" class="flex-1 overflow-y-auto max-h-[500px] custom-scroll pr-1 space-y-3">
              <!-- Injected dynamically -->
            </div>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        &copy; 2026 Smart Image Resizer & BG Remover. All rights reserved.
      </footer>
    </div>

    <!-- Dynamic Modals Container -->
    <div id="modal-container"></div>
  `;
}

function bindDashboardEvents() {
  document.getElementById('btn-logout').addEventListener('click', handleLogout);
  
  document.getElementById('btn-open-create').addEventListener('click', () => {
    state.showCreateModal = true;
    renderModals();
  });

  // Filters inputs
  const searchInput = document.getElementById('filter-search');
  searchInput.value = state.search;
  searchInput.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderLicenseTable();
  });

  const planSelect = document.getElementById('filter-plan');
  planSelect.value = state.filterPlan;
  planSelect.addEventListener('change', (e) => {
    state.filterPlan = e.target.value;
    renderLicenseTable();
  });

  const statusSelect = document.getElementById('filter-status');
  statusSelect.value = state.filterStatus;
  statusSelect.addEventListener('change', (e) => {
    state.filterStatus = e.target.value;
    renderLicenseTable();
  });
}

// 5. LIST AND MODAL RENDERING DETAILS
function renderLicenseTable() {
  const tbody = document.getElementById('license-table-body');
  if (state.loading) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-500">
          <i class="fa-solid fa-spinner animate-spin mr-2"></i> Loading licenses...
        </td>
      </tr>
    `;
    return;
  }

  const filtered = state.licenses.filter(lic => {
    const matchesSearch = lic.name.toLowerCase().includes(state.search.toLowerCase()) || 
                          lic.email.toLowerCase().includes(state.search.toLowerCase()) || 
                          (lic.licenseKey && lic.licenseKey.toLowerCase().includes(state.search.toLowerCase()));
    const matchesPlan = state.filterPlan === 'All' || lic.plan === state.filterPlan;
    const matchesStatus = state.filterStatus === 'All' || lic.status === state.filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-slate-500">No licenses found matching your filters.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(lic => {
    const planClass = lic.plan === 'Ultimate' ? 'bg-purple-950 text-purple-300 border border-purple-500/20' :
                      lic.plan === 'Premium' ? 'bg-blue-950 text-blue-300 border border-blue-500/20' :
                      'bg-slate-800 text-slate-300';
    
    const statusClass = lic.status === 'Active' ? 'bg-emerald-950 text-emerald-400' :
                        lic.status === 'Suspended' ? 'bg-amber-950 text-amber-400' :
                        'bg-red-950 text-red-400';

    const statusDotClass = lic.status === 'Active' ? 'bg-emerald-400' :
                           lic.status === 'Suspended' ? 'bg-amber-400' :
                           'bg-red-400';

    const toggleActionText = lic.status === 'Active' ? 'Suspend' : 'Activate';
    const toggleActionIcon = lic.status === 'Active' ? 'fa-pause' : 'fa-play';
    const toggleActionColor = lic.status === 'Active' ? 'text-amber-500 bg-amber-950/20 hover:bg-amber-950/50' : 'text-emerald-500 bg-emerald-950/20 hover:bg-emerald-950/50';

    return `
      <tr class="hover:bg-slate-900/30 transition">
        <td class="p-3">
          <div class="font-medium text-slate-200">${escapeHtml(lic.name)}</div>
          <div class="text-2xs text-slate-400">${escapeHtml(lic.email)}</div>
        </td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded text-2xs font-semibold ${planClass}">${lic.plan}</span>
        </td>
        <td class="p-3 font-mono text-2xs text-slate-300">
          <div class="flex items-center space-x-1">
            <span>${lic.licenseKey}</span>
            <button onclick="navigator.clipboard.writeText('${lic.licenseKey}'); alert('Key copied!');" class="text-slate-500 hover:text-white" title="Copy Key">
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>
        </td>
        <td class="p-3 text-2xs text-slate-400">${lic.expiresAt || '<span class="text-slate-600">Never</span>'}</td>
        <td class="p-3">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-3xs font-semibold ${statusClass}">
            <span class="h-1 w-1 rounded-full mr-1 ${statusDotClass}"></span>
            ${lic.status}
          </span>
        </td>
        <td class="p-3 text-center">
          <div class="flex items-center justify-center space-x-2">
            <button onclick="openEditModal(${lic.id})" class="h-7 w-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center" title="Edit / Extend">
              <i class="fa-solid fa-pen-to-square text-2xs"></i>
            </button>
            <button onclick="changeLicenseStatus(${lic.id}, '${lic.status === 'Active' ? 'Suspended' : 'Active'}')" class="h-7 w-7 rounded ${toggleActionColor} flex items-center justify-center" title="${toggleActionText}">
              <i class="fa-solid ${toggleActionIcon} text-2xs"></i>
            </button>
            <button onclick="changeLicenseStatus(${lic.id}, 'Revoked')" class="h-7 w-7 rounded bg-red-950/20 hover:bg-red-950/50 text-red-500 flex items-center justify-center" title="Revoke">
              <i class="fa-solid fa-trash text-2xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAuditLogs() {
  const container = document.getElementById('audit-log-container');
  if (state.stats.auditLogs.length === 0) {
    container.innerHTML = `<div class="text-center text-slate-500 text-xs py-8">No logs compiled yet.</div>`;
    return;
  }

  container.innerHTML = state.stats.auditLogs.map(log => {
    const isSuccess = log.action.includes('SUCCESS') || log.action.includes('CREATED');
    const isFailed = log.action.includes('FAILED') || log.action.includes('REVOKED');
    const statusClass = isSuccess ? 'bg-emerald-950/50 text-emerald-400' :
                        isFailed ? 'bg-red-950/50 text-red-400' :
                        'bg-slate-800 text-slate-300';

    return `
      <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col space-y-1.5">
        <div class="flex items-center justify-between text-2xs">
          <span class="font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${statusClass}">
            ${log.action.replace(/_/g, ' ')}
          </span>
          <span class="text-slate-500 font-mono">
            ${new Date(log.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p class="text-xs text-slate-300 leading-normal font-sans">${escapeHtml(log.details)}</p>
        <div class="flex items-center justify-between text-3xs text-slate-500 font-mono pt-1 border-t border-slate-800/40">
          <span>IP: ${log.ipAddress}</span>
          <span>${log.userEmail || 'System'}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderModals() {
  const container = document.getElementById('modal-container');
  container.innerHTML = '';

  if (state.showCreateModal) {
    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div class="w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold text-white">Generate License Key</h3>
            <button onclick="closeCreateModal()" class="text-slate-400 hover:text-white">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form id="create-license-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Customer Name</label>
              <input type="text" id="create-form-name" required class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none" placeholder="John Doe" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Customer Email</label>
              <input type="email" id="create-form-email" required class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none" placeholder="john@example.com" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Plan Level</label>
                <select id="create-form-plan" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="Free">Free</option>
                  <option value="Premium">Premium</option>
                  <option value="Ultimate">Ultimate</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Validity Period</label>
                <select id="create-form-duration" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12" selected>12 Months (1 Year)</option>
                  <option value="0">Lifetime</option>
                </select>
              </div>
            </div>

            <button type="submit" class="w-full rounded-xl bg-brand-500 hover:bg-brand-600 py-3 font-semibold text-white transition text-xs shadow-lg mt-4">
              Generate & Save License
            </button>
          </form>
        </div>
      </div>
    `;
    document.getElementById('create-license-form').addEventListener('submit', handleCreateLicenseSubmit);
  }

  if (state.showEditModal && state.selectedLicense) {
    const lic = state.selectedLicense;
    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div class="w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold text-white">Edit / Extend Subscription</h3>
            <button onclick="closeEditModal()" class="text-slate-400 hover:text-white">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>

          <form id="edit-license-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Customer Name</label>
              <input type="text" id="edit-form-name" required value="${escapeHtml(lic.name)}" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Customer Email (ReadOnly)</label>
              <input type="email" disabled value="${escapeHtml(lic.email)}" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-500 cursor-not-allowed" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Plan Level</label>
                <select id="edit-form-plan" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="Free" ${lic.plan === 'Free' ? 'selected' : ''}>Free</option>
                  <option value="Premium" ${lic.plan === 'Premium' ? 'selected' : ''}>Premium</option>
                  <option value="Ultimate" ${lic.plan === 'Ultimate' ? 'selected' : ''}>Ultimate</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1">Status</label>
                <select id="edit-form-status" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none">
                  <option value="Active" ${lic.status === 'Active' ? 'selected' : ''}>Active</option>
                  <option value="Suspended" ${lic.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
                  <option value="Revoked" ${lic.status === 'Revoked' ? 'selected' : ''}>Revoked</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Expiration Date (YYYY-MM-DD)</label>
              <input type="text" id="edit-form-expires" value="${lic.expiresAt || ''}" placeholder="YYYY-MM-DD or blank for Lifetime" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Quick Extend Subscription</label>
              <select id="edit-form-extend" class="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none">
                <option value="0" selected>Do not extend</option>
                <option value="1">Add 1 Month</option>
                <option value="3">Add 3 Months</option>
                <option value="6">Add 6 Months</option>
                <option value="12">Add 12 Months (1 Year)</option>
              </select>
            </div>

            <button type="submit" class="w-full rounded-xl bg-brand-500 hover:bg-brand-600 py-3 font-semibold text-white transition text-xs shadow-lg mt-4">
              Update License Details
            </button>
          </form>
        </div>
      </div>
    `;
    document.getElementById('edit-license-form').addEventListener('submit', handleEditLicenseSubmit);
  }
}

// Global modal triggers
window.closeCreateModal = () => {
  state.showCreateModal = false;
  renderModals();
};

window.closeEditModal = () => {
  state.showEditModal = false;
  state.selectedLicense = null;
  renderModals();
};

window.openEditModal = (id) => {
  const lic = state.licenses.find(l => l.id === id);
  if (lic) {
    state.selectedLicense = lic;
    state.showEditModal = true;
    renderModals();
  }
};

window.changeLicenseStatus = (id, status) => {
  changeLicenseStatus(id, status);
};

// 6. UTILITY FUNCTIONS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
