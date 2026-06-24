// ============================================================
// data.js — State management, seed data, localStorage helpers
// ============================================================

const STORAGE_KEY = 'alphaCRM_v3';

const AVATAR_COLORS = [
  { bg: '#DBEAFE', text: '#1D4ED8' },
  { bg: '#EDE9FE', text: '#6D28D9' },
  { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#FCE7F3', text: '#9D174D' },
  { bg: '#CCFBF1', text: '#0F766E' },
  { bg: '#E0E7FF', text: '#3730A3' },
  { bg: '#FEE2E2', text: '#991B1B' },
];

const SERVICE_TYPES = ['Reels', 'Posts', 'Stories'];

const SEED_DATA = {
  agencyName: 'Alpha Businesses CRM',
  currency: 'PKR',
  schemaVersion: 3,
  serviceTypes: ['Reels', 'Posts', 'Stories'],
  team: [],
  clients: [],
  founders: [],
};

// ─── Date helpers ────────────────────────────────────────────

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getPrevMonthKey() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function thisMonthDate(day) {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getLast6MonthKeys() {
  const keys = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

function monthKeyToLabel(key) {
  const [yr, mo] = key.split('-');
  return new Date(+yr, +mo - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function monthKeyToFullLabel(key) {
  const [yr, mo] = key.split('-');
  return new Date(+yr, +mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ─── localStorage ────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Migrate old key
    const old = localStorage.getItem('agencyOS_v1');
    if (old) {
      const parsed = JSON.parse(old);
      parsed.agencyName = 'Alpha Businesses CRM';
      parsed.serviceTypes = ['Reels', 'Posts', 'Stories'];
      parsed.clients && parsed.clients.forEach(c => {
        if (!c.servicesPlan) c.servicesPlan = { Reels: 0, Posts: 0, Stories: 0 };
        if (!c.servicesLog)  c.servicesLog  = [];
      });
      return parsed;
    }
  } catch (e) { /* ignore */ }
  return null;
}

// localStorage-only save (used by Firebase boot before Firestore is ready)
function saveStateLocal(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

// Full save: localStorage + Firestore (if connected)
function saveState(state) {
  const json = JSON.stringify(state);
  // Track what we're saving to prevent Firestore echo re-renders
  if (typeof _lastSavedJSON !== 'undefined') {
    window._lastSavedJSONGlobal = json;
    if (typeof window !== 'undefined') _lastSavedJSON = json;
  }
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) { /* ignore */ }
  // Push to Firestore (if firebase.js has loaded and connected)
  if (typeof saveToFirestore === 'function') {
    saveToFirestore(state);
  }
}

function initState() {
  let state = loadState();
  if (!state) {
    state = JSON.parse(JSON.stringify(SEED_DATA));
  }
  // Force schema upgrade: if old sample data detected, clear it
  if (!state.schemaVersion || state.schemaVersion < 3) {
    state = JSON.parse(JSON.stringify(SEED_DATA));
  }
  // Ensure schema fields exist
  if (!state.serviceTypes) state.serviceTypes = ['Reels', 'Posts', 'Stories'];
  if (!state.founders)     state.founders     = [];
  state.clients && state.clients.forEach(c => {
    if (!c.servicesPlan) c.servicesPlan = { Reels: 0, Posts: 0, Stories: 0 };
    if (!c.servicesLog)  c.servicesLog  = [];
    ensureCurrentMonthLog(c);
  });
  saveStateLocal(state);
  return state;
}

// ─── Services log helpers ────────────────────────────────────

function ensureCurrentMonthLog(client) {
  const key = getCurrentMonthKey();
  let log = client.servicesLog.find(l => l.month === key);
  if (!log) {
    log = { month: key };
    (client.servicesPlan ? Object.keys(client.servicesPlan) : []).forEach(type => {
      const quota = client.servicesPlan[type] || 0;
      log[type] = Array(quota).fill(false);
    });
    client.servicesLog.push(log);
  } else {
    // Sync array lengths if plan changed
    const plan = client.servicesPlan || {};
    Object.keys(plan).forEach(type => {
      const quota = plan[type] || 0;
      if (!Array.isArray(log[type])) log[type] = Array(quota).fill(false);
      if (log[type].length < quota) {
        while (log[type].length < quota) log[type].push(false);
      } else if (log[type].length > quota) {
        log[type] = log[type].slice(0, quota);
      }
    });
  }
}

function getMonthLog(client, monthKey) {
  return client.servicesLog.find(l => l.month === monthKey) || null;
}

function getServicesProgress(client, monthKey) {
  const log = getMonthLog(client, monthKey);
  const plan = client.servicesPlan || {};
  const result = {};
  Object.keys(plan).forEach(type => {
    const quota = plan[type] || 0;
    const done  = log && Array.isArray(log[type]) ? log[type].filter(Boolean).length : 0;
    result[type] = { quota, done };
  });
  return result;
}

// ─── Business logic ──────────────────────────────────────────

function getNextDueDate(client) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const day   = client.startDay;
  const dueThisMonth = new Date(year, month, day);
  if (dueThisMonth >= now) return dueThisMonth;
  return new Date(year, month + 1, day);
}

function getDaysUntilDue(client) {
  const due = getNextDueDate(client);
  const now = new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((dueMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
}

function getClientStatus(client) {
  const monthKey = getCurrentMonthKey();
  const payment  = client.payments.find(p => p.month === monthKey);
  if (payment && payment.paid) return 'Paid';
  const days = getDaysUntilDue(client);
  if (days < 0) return 'Overdue';
  return 'Pending';
}

function getTeamMember(state, id) {
  return state.team.find(t => t.id === id);
}

function getAvatarColor(idx) {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

// PKR as suffix: "4,500 PKR"
function formatCurrency(state, amount) {
  const num = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `${num} ${state.currency}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDueDate(client) {
  const d = getNextDueDate(client);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTotalRetainers(state) {
  return state.clients.reduce((sum, c) => sum + c.retainerAmount, 0);
}

function getCollectedThisMonth(state) {
  const key = getCurrentMonthKey();
  return state.clients
    .filter(c => c.payments.find(p => p.month === key && p.paid))
    .reduce((sum, c) => sum + c.retainerAmount, 0);
}

function getCollectedForMonth(state, monthKey) {
  return state.clients
    .filter(c => c.payments.find(p => p.month === monthKey && p.paid))
    .reduce((sum, c) => sum + c.retainerAmount, 0);
}

function getTotalPayroll(state) {
  return state.clients.reduce((sum, c) =>
    sum + c.members.reduce((s, m) => s + m.share, 0), 0);
}

function getMemberEarningsThisMonth(state) {
  const earnings = {};
  state.team.forEach(t => { earnings[t.id] = 0; });
  state.clients.forEach(c => {
    c.members.forEach(m => {
      earnings[m.memberId] = (earnings[m.memberId] || 0) + m.share;
    });
  });
  return earnings;
}

function getTotalFounderDraws(state) {
  const key = getCurrentMonthKey();
  return state.founders.reduce((sum, f) => {
    return sum + f.expenses
      .filter(e => e.date && e.date.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
  }, 0);
}

function getFounderDrawsForMonth(state, monthKey) {
  return state.founders.reduce((sum, f) => {
    return sum + f.expenses
      .filter(e => e.date && e.date.startsWith(monthKey))
      .reduce((s, e) => s + e.amount, 0);
  }, 0);
}

function getFounderSpentThisMonth(founder) {
  const key = getCurrentMonthKey();
  return founder.expenses
    .filter(e => e.date && e.date.startsWith(key))
    .reduce((sum, e) => sum + e.amount, 0);
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// ─── Chart data helpers ──────────────────────────────────────

function getLast6MonthsChartData(state) {
  const months = getLast6MonthKeys();
  const payroll = getTotalPayroll(state); // fixed each month
  return {
    labels: months.map(monthKeyToLabel),
    income:   months.map(m => getCollectedForMonth(state, m)),
    payroll:  months.map(() => payroll),
    draws:    months.map(m => getFounderDrawsForMonth(state, m)),
    projected: months.map(() => getTotalRetainers(state)),
  };
}
