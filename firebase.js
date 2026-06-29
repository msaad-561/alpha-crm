// ============================================================
// firebase.js — Firebase Firestore integration
// Alpha Businesses CRM
// Uses Firebase v9 Compat SDK (CDN, no bundler required)
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBKFqmhG4BarwGtF-0-6eZPKdTADxY-y-0",
  authDomain:        "alpha-crm-45867.firebaseapp.com",
  projectId:         "alpha-crm-45867",
  storageBucket:     "alpha-crm-45867.firebasestorage.app",
  messagingSenderId: "223370994298",
  appId:             "1:223370994298:web:11a880c89de0d0f156d1c3",
  measurementId:     "G-Q3QBVB6V2W",
};

// ─── Initialize ───────────────────────────────────────────────
let _db            = null;
let _stateDocRef   = null;
let _unsubscribe   = null;   // real-time listener handle
let _lastSavedJSON = '';     // prevents echo re-renders
let _firestoreReady = false;

function initFirebase() {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    _db          = firebase.firestore();
    _stateDocRef = _db.collection('agencyState').doc('main');
    _firestoreReady = true;
    console.log('[Firebase] Firestore connected ✅');
    showSyncBadge('connected');
  } catch (err) {
    console.error('[Firebase] Init failed:', err);
    showSyncBadge('offline');
  }
}

// ─── Load from Firestore ──────────────────────────────────────
async function loadFromFirestore() {
  if (!_firestoreReady || !_stateDocRef) return null;
  try {
    const snap = await _stateDocRef.get();
    if (snap.exists) {
      console.log('[Firebase] State loaded from Firestore');
      return snap.data();
    }
  } catch (err) {
    console.warn('[Firebase] Load failed (offline?):', err.message);
    showSyncBadge('offline');
  }
  return null;
}

// ─── Save to Firestore (fire and forget) ─────────────────────
async function saveToFirestore(state) {
  if (!_firestoreReady || !_stateDocRef) return;
  try {
    // Firestore doesn't allow undefined values — sanitize
    const clean = JSON.parse(JSON.stringify(state));
    await _stateDocRef.set(clean);
    showSyncBadge('saved');
  } catch (err) {
    console.warn('[Firebase] Save failed:', err.message);
    showSyncBadge('offline');
  }
}

// ─── Real-time listener ───────────────────────────────────────
function subscribeToFirestore() {
  if (!_firestoreReady || !_stateDocRef) return;
  if (_unsubscribe) _unsubscribe(); // detach previous listener

  _unsubscribe = _stateDocRef.onSnapshot(
    snap => {
      if (!snap.exists) return;
      const incomingJSON = JSON.stringify(snap.data());

      // Ignore if this is our own echo (same data we just wrote)
      if (incomingJSON === _lastSavedJSON) return;

      console.log('[Firebase] Real-time update received — re-rendering');
      _lastSavedJSON = incomingJSON;

      const freshState = snap.data();
      // Apply missing field migrations
      if (!freshState.overheadPayments) freshState.overheadPayments = [];
      if (!freshState.models)           freshState.models           = [];
      if (!freshState.agencyExpenses)   freshState.agencyExpenses   = [];
      if (!freshState.serviceTypes)     freshState.serviceTypes     = ['Reels', 'Posts', 'Stories'];
      if (!freshState.founders)         freshState.founders         = [];
      window.__agencyState = freshState;

      // Cache locally too
      try { localStorage.setItem(STORAGE_KEY, incomingJSON); } catch (e) {}

      // Re-render current page
      if (typeof renderPage === 'function') {
        renderPage(freshState);
        updateNotifBadge(freshState);
      }

      showSyncBadge('synced');
    },
    err => {
      console.warn('[Firebase] Snapshot error:', err.message);
      showSyncBadge('offline');
    }
  );
}

// ─── Boot sequence ────────────────────────────────────────────
// Called from DOMContentLoaded INSTEAD of the plain initState approach.
// 1. Render immediately from localStorage (fast)
// 2. Fetch Firestore in background
// 3. If Firestore has data → update + re-render
// 4. If not (first time) → push localStorage up
// 5. Subscribe to real-time changes

async function bootWithFirebase() {
  initFirebase();

  // Step 1: instant render from localStorage
  let state = loadState();                          // from data.js
  if (!state) {
    state = JSON.parse(JSON.stringify(SEED_DATA));  // from data.js
    saveStateLocal(state);
  }
  window.__agencyState = state;
  buildShell(state);                                // from app.js
  navigateTo('home');                               // from app.js

  showSyncBadge('connecting');

  // Step 2: fetch from Firestore
  const fsState = await loadFromFirestore();

  if (fsState) {
    // Check schema version — if old data, reset to fresh empty state
    if (!fsState.schemaVersion || fsState.schemaVersion < 3) {
      console.log('[Firebase] Old schema detected — resetting to fresh state');
      const freshState = JSON.parse(JSON.stringify(SEED_DATA));
      _lastSavedJSON = JSON.stringify(freshState);
      window.__agencyState = freshState;
      saveStateLocal(freshState);
      await saveToFirestore(freshState);
      renderPage(freshState);
      updateNotifBadge(freshState);
      showSyncBadge('saved');
    } else {
      // Firestore has current schema data — apply any missing field migrations then use it
      if (!fsState.overheadPayments) fsState.overheadPayments = [];
      if (!fsState.models)           fsState.models           = [];
      if (!fsState.agencyExpenses)   fsState.agencyExpenses   = [];
      if (!fsState.serviceTypes)     fsState.serviceTypes     = ['Reels', 'Posts', 'Stories'];
      if (!fsState.founders)         fsState.founders         = [];
      if (fsState.schemaVersion < 5) fsState.schemaVersion    = 5;
      _lastSavedJSON = JSON.stringify(fsState);
      window.__agencyState = fsState;
      saveStateLocal(fsState);
      renderPage(fsState);
      updateNotifBadge(fsState);
      showSyncBadge('synced');
    }
  } else {
    // First time on Firestore — push local state up
    console.log('[Firebase] No Firestore data — uploading local state');
    _lastSavedJSON = JSON.stringify(state);
    await saveToFirestore(state);
    showSyncBadge('saved');
  }

  // Step 3: subscribe to real-time changes (for multi-device sync)
  subscribeToFirestore();
}

// ─── Sync badge UI ────────────────────────────────────────────
let _badgeTimeout = null;

function showSyncBadge(status) {
  let badge = document.getElementById('sync-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'sync-badge';
    badge.style.cssText = `
      position: fixed;
      bottom: calc(var(--bottom-nav-h, 60px) + 10px);
      right: 14px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 600;
      font-family: Inter, sans-serif;
      z-index: 9999;
      transition: opacity .3s ease;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,.12);
    `;
    document.body.appendChild(badge);
  }

  const styles = {
    connected:  { bg: '#D1FAE5', color: '#065F46', text: '🔗 Connected' },
    connecting: { bg: '#FEF9C3', color: '#854D0E', text: '⏳ Connecting…' },
    saved:      { bg: '#DBEAFE', color: '#1D4ED8', text: '☁️ Saved' },
    synced:     { bg: '#D1FAE5', color: '#065F46', text: '✅ Synced' },
    offline:    { bg: '#FEE2E2', color: '#991B1B', text: '📵 Offline' },
  };

  const s = styles[status] || styles.offline;
  badge.style.background = s.bg;
  badge.style.color = s.color;
  badge.textContent = s.text;
  badge.style.opacity = '1';

  clearTimeout(_badgeTimeout);
  // Auto-hide after 3s (except offline — keep showing)
  if (status !== 'offline' && status !== 'connecting') {
    _badgeTimeout = setTimeout(() => {
      if (badge) badge.style.opacity = '0';
    }, 3000);
  }
}
