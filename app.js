// ============================================================
// app.js — Router, sidebar, global state, page orchestration
// Alpha Businesses CRM
// ============================================================

let currentPage = 'home';
window.__agencyState = null;

// ─── SVG Icons ───────────────────────────────────────────────
const ICONS = {
  home:      `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
  clients:   `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
  services:  `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>`,
  founders:  `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 20v-2a4 4 0 018 0v2"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 11v6m0 0l-2-2m2 2l2-2"/></svg>`,
  team:      `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
  reminders: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  settings:  `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>`,
  notif:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  more:      `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>`,
  add:       `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/></svg>`,
  models:     `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  expenses:   `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`,
  statements: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h4"/></svg>`,
};

// ─── App Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Use Firebase boot (handles localStorage fallback + Firestore sync)
  if (typeof bootWithFirebase === 'function') {
    bootWithFirebase(); // async — renders from localStorage instantly, then syncs
  } else {
    // Fallback if firebase.js failed to load
    window.__agencyState = initState();
    buildShell(window.__agencyState);
    navigateTo('home');
  }
});

// ─── Shell ────────────────────────────────────────────────────
function buildShell(state) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Sidebar overlay (mobile backdrop)
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebar-overlay';
  overlay.addEventListener('click', closeSidebar);
  document.body.appendChild(overlay);

  // Sidebar
  const sidebar = document.createElement('nav');
  sidebar.id = 'sidebar';
  sidebar.setAttribute('aria-label', 'Main navigation');
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">
        ${ICONS.home}
      </div>
      <div>
        <div class="sidebar-logo-text">${state.agencyName || 'Alpha Businesses CRM'}</div>
      </div>
    </div>
    <div class="sidebar-section-label">Dashboard</div>
    <div class="sidebar-nav">
      <div class="nav-item" data-page="home"      role="button" tabindex="0">${ICONS.home}<span>Home</span></div>
      <div class="nav-item" data-page="clients"   role="button" tabindex="0">${ICONS.clients}<span>Clients</span></div>
      <div class="nav-item" data-page="services"  role="button" tabindex="0">${ICONS.services}<span>Services</span></div>
      <div class="nav-item" data-page="founders"  role="button" tabindex="0">${ICONS.founders}<span>Founders</span></div>
    </div>
    <div class="sidebar-section-label">Finance</div>
    <div class="sidebar-nav">
      <div class="nav-item" data-page="statements" role="button" tabindex="0">${ICONS.statements}<span>Statements</span></div>
      <div class="nav-item" data-page="expenses"   role="button" tabindex="0">${ICONS.expenses}<span>Expenses</span></div>
      <div class="nav-item" data-page="models"     role="button" tabindex="0">${ICONS.models}<span>Models</span></div>
    </div>
    <div class="sidebar-section-label">Manage</div>
    <div class="sidebar-nav">
      <div class="nav-item" data-page="team"      role="button" tabindex="0">${ICONS.team}<span>Team</span></div>
      <div class="nav-item" data-page="reminders" role="button" tabindex="0">${ICONS.reminders}<span>Reminders</span></div>
      <div class="nav-item" data-page="settings"  role="button" tabindex="0">${ICONS.settings}<span>Settings</span></div>
    </div>
    <div class="sidebar-footer">Alpha Businesses CRM v2.0</div>
  `;

  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => { navigateTo(item.dataset.page); closeSidebar(); });
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { navigateTo(item.dataset.page); closeSidebar(); } });
  });

  // Main area
  const mainArea = document.createElement('div');
  mainArea.id = 'main-area';

  // Topbar
  const topbar = document.createElement('header');
  topbar.id = 'topbar';
  topbar.setAttribute('role', 'banner');
  topbar.innerHTML = `
    <div class="topbar-left">
      <button class="hamburger-btn" id="hamburger-btn" aria-label="Open menu" title="Menu">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <h1 class="topbar-title" id="topbar-title">Home</h1>
    </div>
    <div class="topbar-right">
      <button class="notif-btn" id="theme-toggle-btn" title="Toggle dark/light mode" aria-label="Toggle theme">
        <span id="theme-icon">🌙</span>
      </button>
      <button class="notif-btn" id="notif-btn" title="Reminders" aria-label="View reminders">
        ${ICONS.notif}
        <span class="notif-badge" id="notif-badge"></span>
      </button>
      <button class="btn btn-primary btn-sm" id="add-client-btn" style="display:none">
        ${ICONS.add} Add Client
      </button>
      <button class="logout-btn" id="logout-btn" title="Log out" aria-label="Log out">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
        Logout
      </button>
    </div>
  `;

  const pageContent = document.createElement('main');
  pageContent.id = 'page-content';
  pageContent.setAttribute('role', 'main');

  mainArea.appendChild(topbar);
  mainArea.appendChild(pageContent);

  app.appendChild(sidebar);
  app.appendChild(mainArea);

  // Bottom Navigation (mobile)
  buildBottomNav();

  // Topbar events
  document.getElementById('add-client-btn').addEventListener('click', () => openAddClientModal(window.__agencyState));
  document.getElementById('notif-btn').addEventListener('click', () => navigateTo('reminders'));
  document.getElementById('hamburger-btn').addEventListener('click', openSidebar);

  // Theme toggle
  initTheme();
  document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Log out of Alpha Businesses CRM?') && typeof window.alphaCRMLogout === 'function') {
        window.alphaCRMLogout();
      }
    });
  }
}

// ─── Mobile sidebar ───────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('visible');
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
}

// ─── Dark / Light Mode ───────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('alphaCRM_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('alphaCRM_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const el = document.getElementById('theme-icon');
  if (el) el.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ─── Bottom Navigation ────────────────────────────────────────
const BOTTOM_NAV_ITEMS = [
  { page: 'home',     label: 'Home',     icon: 'home' },
  { page: 'clients',  label: 'Clients',  icon: 'clients' },
  { page: 'services', label: 'Services', icon: 'services' },
  { page: 'founders', label: 'Founders', icon: 'founders' },
  { page: '__more',   label: 'More',     icon: 'more' },
];

const MORE_PAGES = ['team', 'reminders', 'settings', 'models', 'expenses', 'statements'];

function buildBottomNav() {
  const nav = document.createElement('nav');
  nav.id = 'bottom-nav';
  nav.setAttribute('aria-label', 'Mobile navigation');

  const items = BOTTOM_NAV_ITEMS.map(item => `
    <div class="bottom-nav-item" data-page="${item.page}" role="button" tabindex="0" aria-label="${item.label}">
      ${ICONS[item.icon]}
      <span>${item.label}</span>
    </div>
  `).join('');

  nav.innerHTML = `<div class="bottom-nav-items">${items}</div>`;
  document.body.appendChild(nav);

  nav.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.page === '__more') {
        toggleMoreDrawer();
      } else {
        navigateTo(item.dataset.page);
        closeMoreDrawer();
      }
    });
  });

  // More drawer
  const drawer = document.createElement('div');
  drawer.id = 'more-drawer';
  drawer.innerHTML = `
    <div class="drawer-items">
      <div class="drawer-item" data-page="statements" onclick="navigateTo('statements');closeMoreDrawer()">
        ${ICONS.statements}<span>Statements</span>
      </div>
      <div class="drawer-item" data-page="expenses" onclick="navigateTo('expenses');closeMoreDrawer()">
        ${ICONS.expenses}<span>Expenses</span>
      </div>
      <div class="drawer-item" data-page="models" onclick="navigateTo('models');closeMoreDrawer()">
        ${ICONS.models}<span>Models</span>
      </div>
      <div class="drawer-item" data-page="team" onclick="navigateTo('team');closeMoreDrawer()">
        ${ICONS.team}<span>Team</span>
      </div>
      <div class="drawer-item" data-page="reminders" onclick="navigateTo('reminders');closeMoreDrawer()">
        ${ICONS.reminders}<span>Reminders</span>
      </div>
      <div class="drawer-item" data-page="settings" onclick="navigateTo('settings');closeMoreDrawer()">
        ${ICONS.settings}<span>Settings</span>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);
}

function toggleMoreDrawer() {
  const drawer = document.getElementById('more-drawer');
  if (drawer) drawer.classList.toggle('open');
}

function closeMoreDrawer() {
  document.getElementById('more-drawer')?.classList.remove('open');
}

// ─── Navigation ───────────────────────────────────────────────
function navigateTo(page) {
  if (page === '__more') return;
  currentPage = page;
  const state = window.__agencyState;
  closeMoreDrawer();

  // Titles
  const titles = {
    home:      'Home',
    clients:   'Clients',
    services:  'Services Updates',
    founders:  'Founders',
    team:      'Team',
    reminders: 'Reminders',
    settings:  'Settings',
    models:     'Models & Influencers',
    expenses:   'Overall Expenses',
    statements: 'Payment Statements',
  };

  // Update sidebar active
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update bottom nav active
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    const isMore = MORE_PAGES.includes(page) && item.dataset.page === '__more';
    item.classList.toggle('active', item.dataset.page === page || isMore);
  });

  // Update drawer active
  document.querySelectorAll('.drawer-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Topbar title
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = titles[page] || page;

  // Add Client button visibility
  const addBtn = document.getElementById('add-client-btn');
  if (addBtn) addBtn.style.display = page === 'clients' ? '' : 'none';

  // Notification badge
  updateNotifBadge(state);

  renderPage(state);
}

// ─── Page renderer ────────────────────────────────────────────
function renderPage(state) {
  window.__agencyState = state;
  updateNotifBadge(state);
  const container = document.getElementById('page-content');
  if (!container) return;

  switch (currentPage) {
    case 'home':       renderHomePage(state, container);       break;
    case 'clients':    renderClientsPage(state, container);    break;
    case 'services':   renderServicesPage(state, container);   break;
    case 'founders':   renderFoundersPage(state, container);   break;
    case 'team':       renderTeamPage(state, container);       break;
    case 'team-member': renderTeamMemberDetail(state, window.__currentMemberId, container); break;
    case 'reminders':  renderRemindersPage(state, container);  break;
    case 'settings':   renderSettingsPage(state, container);   break;
    case 'models':     renderModelsPage(state, container);     break;
    case 'expenses':   renderExpensesPage(state, container);   break;
    case 'statements': renderStatementsPage(state, container); break;
    default:           renderHomePage(state, container);
  }
}

// ─── Also render mobile client cards in Clients page ─────────
const _origRenderClientsPage = typeof renderClientsPage !== 'undefined' ? renderClientsPage : null;

// ─── Team Page ────────────────────────────────────────────────
function renderTeamPage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  const earnings = getMemberEarningsThisMonth(state);

  const secHeader = document.createElement('div');
  secHeader.className = 'section-header';
  secHeader.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span class="section-title">Team Members</span>
      <span class="section-count">${state.team.length}</span>
    </div>
    <button class="btn btn-primary btn-sm" id="add-team-btn">+ Add Member</button>
  `;
  container.appendChild(secHeader);
  secHeader.querySelector('#add-team-btn').addEventListener('click', () => openAddTeamModal(state));

  const grid = document.createElement('div');
  grid.className = 'team-grid';

  state.team.forEach(tm => {
    const c = getAvatarColor(tm.colorIdx);
    const clientCount = state.clients.filter(c => c.members.some(m => m.memberId === tm.id)).length;
    const card = document.createElement('div');
    card.className = 'team-card clickable-card';
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <span class="avatar avatar-lg" style="background:${c.bg};color:${c.text};width:46px;height:46px;font-size:15px">${tm.initials}</span>
      <div class="team-card-info">
        <div class="team-card-name">${tm.name}</div>
        <div class="team-card-earnings">Monthly: <strong>${formatCurrency(state, earnings[tm.id] || 0)}</strong></div>
        <div class="team-card-clients">${clientCount} client${clientCount !== 1 ? 's' : ''}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="font-size:11px;color:var(--text-muted)">View →</span>
        <button class="btn btn-secondary btn-sm remove-tm-btn" data-id="${tm.id}">Remove</button>
      </div>
    `;
    // Click card → detail page (but not the Remove button)
    card.addEventListener('click', e => {
      if (e.target.closest('.remove-tm-btn')) return;
      window.__currentMemberId = tm.id;
      navigateTo('team-member');
    });
    card.querySelector('.remove-tm-btn').addEventListener('click', e => {
      e.stopPropagation();
      deleteTeamMember(tm.id);
    });
    grid.appendChild(card);
  });

  if (!state.team.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">No team members</div><p>Add your first team member.</p></div>`;
  }

  container.appendChild(grid);
}

function openAddTeamModal(state) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <div><div class="modal-title">Add Team Member</div></div>
        <button class="modal-close" id="tm-modal-close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="tm-name">Full Name</label>
          <input class="form-input" type="text" id="tm-name" placeholder="e.g. Ali Hassan" />
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="tm-initials">Initials</label>
            <input class="form-input" type="text" id="tm-initials" placeholder="AH" maxlength="2" />
          </div>
          <div class="form-group">
            <label class="form-label" for="tm-color">Avatar Color</label>
            <select class="form-input" id="tm-color">
              <option value="0">Blue</option><option value="1">Purple</option><option value="2">Green</option>
              <option value="3">Amber</option><option value="4">Rose</option><option value="5">Teal</option>
              <option value="6">Indigo</option><option value="7">Red</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="tm-phone">Phone / WhatsApp (optional)</label>
          <input class="form-input" type="text" id="tm-phone" placeholder="+92 300 0000000" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="tm-cancel">Cancel</button>
        <button class="btn btn-primary" id="tm-save">Add Member</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#tm-modal-close').addEventListener('click', close);
  overlay.querySelector('#tm-cancel').addEventListener('click', close);

  overlay.querySelector('#tm-save').addEventListener('click', () => {
    const name     = overlay.querySelector('#tm-name').value.trim();
    const initials = overlay.querySelector('#tm-initials').value.trim().toUpperCase();
    const colorIdx = parseInt(overlay.querySelector('#tm-color').value);
    const phone    = overlay.querySelector('#tm-phone').value.trim();

    if (!name || !initials) { alert('Please enter a name and initials.'); return; }

    state.team.push({ id: generateId(), name, initials: initials.slice(0,2), colorIdx, phone });
    saveState(state);
    close();
    renderPage(state);
  });
}

function deleteTeamMember(memberId) {
  const state = window.__agencyState;
  const tm = state.team.find(t => t.id === memberId);
  if (!tm) return;
  if (!confirm(`Remove ${tm.name}? They will be unassigned from all clients.`)) return;
  state.team = state.team.filter(t => t.id !== memberId);
  state.clients.forEach(c => { c.members = c.members.filter(m => m.memberId !== memberId); });
  saveState(state);
  renderPage(state);
}

// ─── Reminders Page ───────────────────────────────────────────
function renderRemindersPage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  const urgent = getUrgentClients(state);
  const all = [...state.clients]
    .map(c => ({ c, days: getDaysUntilDue(c), status: getClientStatus(c) }))
    .sort((a, b) => a.days - b.days);

  const secHeader = document.createElement('div');
  secHeader.className = 'section-header';
  secHeader.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span class="section-title">Payment Reminders</span>
      <span class="section-count">${urgent.length} urgent</span>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="navigateTo('statements')">📄 View Statements →</button>
  `;
  container.appendChild(secHeader);

  const infoNote = document.createElement('div');
  infoNote.style.cssText = 'background:var(--bg-page);border:1px solid var(--border-light);border-radius:8px;padding:10px 14px;font-size:12.5px;color:var(--text-muted);margin-bottom:16px;display:flex;align-items:center;gap:8px';
  infoNote.innerHTML = `<span>💡</span> Payments marked here are automatically recorded in <strong style="color:var(--accent);cursor:pointer" onclick="navigateTo('statements')">Statements</strong> with the date.`;
  container.appendChild(infoNote);

  if (!all.length) {
    container.innerHTML += `<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-title">No reminders</div><p>Add clients to track payments.</p></div>`;
    return;
  }

  const list = document.createElement('div');
  list.className = 'reminder-list';

  all.forEach(({ c, days, status }) => {
    const chipCls = status === 'Overdue' ? 'urgent' : days <= 3 ? 'warning' : 'normal';
    const chipTxt = status === 'Overdue' ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`;
    const waLink  = buildWhatsAppLink(c.contactPhone, c.name, c.retainerAmount, formatDueDate(c), state.currency);

    const row = document.createElement('div');
    row.className = 'reminder-row';
    row.innerHTML = `
      <span class="days-chip ${chipCls}" style="font-size:12px;padding:5px 10px">${chipTxt}</span>
      <div class="reminder-client">
        <div class="reminder-client-name">${c.name}</div>
        <div class="reminder-client-sub">Due ${formatDueDate(c)} · ${formatCurrency(state, c.retainerAmount)}</div>
      </div>
      <div class="reminder-actions">
        ${statusPill(status)}
        <a href="${waLink}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.997 0C5.373 0 0 5.373 0 11.997c0 2.118.554 4.107 1.523 5.832L0 24l6.335-1.508A11.955 11.955 0 0011.997 24C18.621 24 24 18.627 24 11.997 24 5.373 18.621 0 11.997 0zm0 21.818a9.815 9.815 0 01-5.032-1.387l-.361-.214-3.737.889.928-3.636-.236-.373A9.818 9.818 0 012.182 12c0-5.415 4.4-9.818 9.815-9.818 5.416 0 9.821 4.403 9.821 9.818 0 5.416-4.405 9.818-9.821 9.818z"/></svg>
          WhatsApp
        </a>
        <button class="btn btn-success btn-sm" onclick="markPaidFromReminders('${c.id}')">Mark Paid</button>
      </div>
    `;
    list.appendChild(row);
  });

  container.appendChild(list);
}

function markPaidFromReminders(clientId) {
  const state = window.__agencyState;
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;
  const monthKey = getCurrentMonthKey();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  let p = client.payments.find(p => p.month === monthKey);
  if (!p) { p = { month: monthKey, paid: false, paidDate: null }; client.payments.push(p); }
  p.paid = true;
  p.paidDate = dateStr;
  saveState(state);
  renderPage(state);
}

// ─── Settings Page ────────────────────────────────────────────
function renderSettingsPage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  const card1 = document.createElement('div');
  card1.className = 'settings-card';
  card1.innerHTML = `
    <div class="settings-card-title">Agency Settings</div>
    <div class="settings-card-desc">Customize your agency name and currency symbol.</div>
    <div class="form-group">
      <label class="form-label" for="set-agency-name">Agency Name</label>
      <input class="form-input" type="text" id="set-agency-name" value="${state.agencyName}" style="max-width:280px" />
    </div>
    <div class="form-group">
      <label class="form-label" for="set-currency">Currency Symbol</label>
      <input class="form-input" type="text" id="set-currency" value="${state.currency}" maxlength="3" style="max-width:80px" />
    </div>
    <button class="btn btn-primary" id="save-settings-btn">Save Changes</button>
  `;
  container.appendChild(card1);

  card1.querySelector('#save-settings-btn').addEventListener('click', () => {
    const name     = card1.querySelector('#set-agency-name').value.trim();
    const currency = card1.querySelector('#set-currency').value.trim();
    if (name) state.agencyName = name;
    if (currency) state.currency = currency;
    saveState(state);
    const logoText = document.querySelector('.sidebar-logo-text');
    if (logoText) logoText.textContent = state.agencyName;
    alert('Settings saved!');
  });

  const card2 = document.createElement('div');
  card2.className = 'settings-card';
  card2.innerHTML = `
    <div class="settings-card-title">🔌 Firebase Database Setup</div>
    <div class="settings-card-desc">Connect to a free Firebase Firestore database for cloud sync across devices.</div>
    <div style="background:var(--bg-page);border:1px solid var(--border);border-radius:8px;padding:14px;font-size:12.5px;color:var(--text-secondary);line-height:1.8">
      <strong style="color:var(--text-primary)">Steps to connect:</strong><br/>
      1. Go to <a href="https://console.firebase.google.com" target="_blank" style="color:var(--accent)">console.firebase.google.com</a><br/>
      2. Create a new project (e.g. "alpha-crm")<br/>
      3. Add a <strong>Web App</strong> → copy the <code>firebaseConfig</code> object<br/>
      4. Enable <strong>Firestore Database</strong> in test mode<br/>
      5. Share the config with us — we'll wire everything up in ~1 hour<br/><br/>
      <strong style="color:var(--text-primary)">Free tier limits (Spark Plan):</strong>
      1 GB storage · 50K reads/day · 20K writes/day — more than enough for a small agency.
    </div>
  `;
  container.appendChild(card2);

  const card3 = document.createElement('div');
  card3.className = 'settings-card';
  card3.innerHTML = `
    <div class="settings-card-title">📱 WhatsApp Reminders</div>
    <div class="settings-card-desc">Reminder buttons open WhatsApp with a pre-filled message. For automated Twilio sends, see the guide below.</div>
    <div style="background:var(--bg-page);border:1px solid var(--border);border-radius:8px;padding:14px;font-size:12.5px;color:var(--text-secondary);line-height:1.8">
      <strong style="color:var(--text-primary)">Twilio automation:</strong><br/>
      1. Create a Twilio account & enable WhatsApp Sandbox<br/>
      2. Set up a Netlify/Vercel serverless function with your credentials<br/>
      3. POST to the Twilio Messages API from that function<br/>
      4. Wire the Send button to call your function URL
    </div>
  `;
  container.appendChild(card3);

  const card4 = document.createElement('div');
  card4.className = 'settings-card';
  card4.innerHTML = `
    <div class="settings-card-title">Data Management</div>
    <div class="settings-card-desc">Your data is stored in browser localStorage.</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-secondary" id="export-btn">📥 Export JSON</button>
      <button class="btn btn-danger" id="reset-btn">🔄 Reset to Demo Data</button>
    </div>
  `;
  container.appendChild(card4);

  card4.querySelector('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'alpha-crm-data.json' });
    a.click();
    URL.revokeObjectURL(url);
  });

  card4.querySelector('#reset-btn').addEventListener('click', () => {
    if (confirm('This will delete ALL data and restore sample data. Are you sure?')) {
      localStorage.removeItem(STORAGE_KEY);
      window.__agencyState = initState();
      buildShell(window.__agencyState);
      navigateTo('home');
    }
  });
}

// ─── Mobile client card renderer ─────────────────────────────
// Injected into clients page for mobile view
function buildMobileClientCards(state) {
  const wrap = document.createElement('div');
  wrap.className = 'client-mobile-cards';

  state.clients.forEach(client => {
    const status  = getClientStatus(client);
    const days    = getDaysUntilDue(client);
    const chipCls = status === 'Overdue' ? 'urgent' : days <= 3 ? 'warning' : 'normal';
    const chipTxt = status === 'Overdue' ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`;

    const card = document.createElement('div');
    card.className = 'client-mobile-card';
    card.innerHTML = `
      <div class="client-mobile-info">
        <div class="client-mobile-name">${client.name}</div>
        <div class="client-mobile-sub">Due day ${client.startDay} · ${formatCurrency(state, client.retainerAmount)}/mo</div>
        <div class="client-mobile-meta">
          ${statusPill(status)}
          <span class="days-chip ${chipCls}">${chipTxt}</span>
          ${buildAvatarGroup(state, client)}
        </div>
      </div>
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:var(--text-muted);flex-shrink:0">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    `;
    card.addEventListener('click', () => openClientModal(state, client.id));
    wrap.appendChild(card);
  });

  return wrap;
}
