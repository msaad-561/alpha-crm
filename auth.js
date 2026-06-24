// ============================================================
// auth.js — Access-key login gate for Alpha Businesses CRM
// A valid 16-digit key must be entered before the app loads.
// Keys are stored hashed in localStorage so they are never
// stored in plain text after first verification.
// ============================================================

(function () {
  'use strict';

  // ── Configuration ─────────────────────────────────────────
  // Add / remove valid 16-digit keys here (digits + letters OK).
  // Keys are compared case-insensitively and stripped of spaces/dashes.
  const VALID_KEYS = [
    'ALPH-BUSI-CRM1-2024',   // key 1  → normalises to ALPHBUSICRM12024
    'XRAY-9281-BETA-0055',   // key 2
    'ZETA-1111-MNOP-7777',   // key 3
  ];

  const SESSION_KEY = 'alphaCRM_auth_session';
  const THEME_KEY   = 'alphaCRM_theme';

  // ── Helpers ───────────────────────────────────────────────
  function normalise(raw) {
    return raw.toUpperCase().replace(/[\s\-_]/g, '');
  }

  // Simple hash (djb2) — keeps the raw key out of localStorage
  function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  function validHashes() {
    return VALID_KEYS.map(k => djb2(normalise(k)));
  }

  function isValidKey(raw) {
    const norm = normalise(raw);
    if (norm.length < 12) return false;          // minimum reasonable length
    const h = djb2(norm);
    return validHashes().includes(h);
  }

  function isAuthenticated() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return false;
    return validHashes().includes(stored);
  }

  function persistSession(raw) {
    const h = djb2(normalise(raw));
    sessionStorage.setItem(SESSION_KEY, h);
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  }

  // Expose logout globally so it can be called from other modules
  window.alphaCRMLogout = logout;

  // ── Login screen HTML ─────────────────────────────────────
  function buildLoginScreen() {
    // Respect saved theme even on login page
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const screen = document.createElement('div');
    screen.id = 'login-screen';
    screen.innerHTML = `
      <div class="login-bg-blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
      </div>

      <div class="login-card" role="main" aria-label="Login">
        <div class="login-logo-wrap">
          <div class="login-logo-icon">
            <svg width="26" height="26" fill="none" stroke="white" stroke-width="2.4" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <div class="login-brand">Alpha Businesses</div>
            <div class="login-brand-sub">CRM &amp; Finance Dashboard</div>
          </div>
        </div>

        <div class="login-divider"></div>

        <h1 class="login-heading">Welcome back</h1>
        <p class="login-sub">Enter your 16-character access key to continue.</p>

        <div class="login-key-wrap" id="login-key-wrap">
          <div class="login-key-icon">
            <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
          </div>
          <input
            id="login-key-input"
            class="login-key-input"
            type="text"
            maxlength="24"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            aria-label="Access key"
          />
          <button class="login-eye-btn" id="login-eye-btn" type="button" title="Show / hide key" aria-label="Toggle key visibility">
            <svg id="eye-open" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            <svg id="eye-closed" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:none">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
            </svg>
          </button>
        </div>

        <div id="login-error" class="login-error" role="alert" aria-live="polite"></div>

        <div class="login-key-dots" id="login-key-dots">
          ${Array.from({length:16}, (_,i) => `<div class="key-dot" id="kdot-${i}"></div>`).join('')}
        </div>

        <button class="login-btn" id="login-submit-btn" type="button">
          <span id="login-btn-text">Unlock Dashboard</span>
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
          </svg>
        </button>

        <p class="login-hint">Contact your administrator for access.</p>
      </div>
    `;

    document.body.appendChild(screen);
    initLoginLogic(screen);
  }

  // ── Login logic ───────────────────────────────────────────
  function initLoginLogic(screen) {
    const input     = screen.querySelector('#login-key-input');
    const submitBtn = screen.querySelector('#login-submit-btn');
    const errorEl   = screen.querySelector('#login-error');
    const wrap      = screen.querySelector('#login-key-wrap');
    const eyeBtn    = screen.querySelector('#login-eye-btn');
    const eyeOpen   = screen.querySelector('#eye-open');
    const eyeClosed = screen.querySelector('#eye-closed');

    // ── Dots indicator
    function updateDots() {
      const norm = normalise(input.value);
      const len  = Math.min(norm.length, 16);
      for (let i = 0; i < 16; i++) {
        const dot = document.getElementById(`kdot-${i}`);
        if (!dot) continue;
        dot.classList.toggle('filled', i < len);
        dot.classList.toggle('active', i === len && len < 16);
      }
    }

    input.addEventListener('input', () => {
      clearError();
      updateDots();
      // Auto-format with dashes every 4 chars for readability
      let raw = input.value.replace(/[\s\-]/g, '').toUpperCase();
      if (raw.length > 16) raw = raw.slice(0, 16);
      const parts = raw.match(/.{1,4}/g) || [];
      const cursor = input.selectionStart;
      input.value = parts.join('-');
      // Adjust cursor to avoid jumping
      try { input.setSelectionRange(cursor, cursor); } catch (_) {}
      updateDots();
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') attempt();
    });

    submitBtn.addEventListener('click', attempt);

    // Toggle show/hide
    eyeBtn.addEventListener('click', () => {
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      eyeOpen.style.display  = isText ? 'none'  : '';
      eyeClosed.style.display = isText ? ''      : 'none';
    });

    // Start dots
    updateDots();

    function attempt() {
      const raw = input.value;
      if (isValidKey(raw)) {
        persistSession(raw);
        screen.classList.add('login-exit');
        setTimeout(() => {
          screen.remove();
          bootApp();
        }, 500);
      } else {
        showError();
      }
    }

    function showError() {
      wrap.classList.add('shake');
      wrap.classList.add('error-state');
      errorEl.textContent = 'Invalid access key. Please try again.';
      input.value = '';
      updateDots();
      setTimeout(() => {
        wrap.classList.remove('shake');
        wrap.classList.remove('error-state');
      }, 600);
    }

    function clearError() {
      wrap.classList.remove('error-state');
      errorEl.textContent = '';
    }
  }

  // ── Boot the real app ─────────────────────────────────────
  function bootApp() {
    if (typeof bootWithFirebase === 'function') {
      bootWithFirebase();
    } else if (typeof initState === 'function') {
      window.__agencyState = initState();
      buildShell(window.__agencyState);
      navigateTo('home');
    }
  }

  // ── Entry point ───────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) {
      // Already logged in — let the main app boot normally
      return;
    }
    // Hide the loading screen immediately; we show login instead
    const loading = document.getElementById('app-loading');
    if (loading) loading.style.display = 'none';

    buildLoginScreen();
  });

})();
