// ============================================================
// services.js — Services Updates Page
// ============================================================

// Track which client section is expanded (mobile UX)
const expandedClients = new Set();
// Track which month each client is viewing
const clientViewMonth = {};

function renderServicesPage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  const monthKey = getCurrentMonthKey();

  // Page header
  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <div>
      <div class="section-title" style="font-size:16px">Services Updates</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
        Track deliverables per client · current retainer cycles
      </div>
    </div>
  `;
  container.appendChild(header);

  if (!state.clients.length) {
    container.innerHTML += `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No clients yet</div>
        <p>Add clients first from the Clients page.</p>
      </div>`;
    return;
  }

  // Services list
  const list = document.createElement('div');
  list.className = 'services-list';

  state.clients.forEach(client => {
    ensureCurrentMonthLog(client);

    // Initialise view month for this client
    if (!clientViewMonth[client.id]) clientViewMonth[client.id] = monthKey;

    const section = buildClientServiceSection(state, client);
    list.appendChild(section);
  });

  container.appendChild(list);
}

// ─── Per-client section ───────────────────────────────────────
function buildClientServiceSection(state, client) {
  const monthKey      = getCurrentMonthKey();
  const viewMonth     = clientViewMonth[client.id] || monthKey;
  const isCurrentMonth = viewMonth === monthKey;
  const progress      = getServicesProgress(client, viewMonth);
  const allTypes      = Object.keys(client.servicesPlan || {}).filter(t => client.servicesPlan[t] > 0);
  const totalDone     = allTypes.reduce((s, t) => s + (progress[t]?.done || 0), 0);
  const totalQuota    = allTypes.reduce((s, t) => s + (progress[t]?.quota || 0), 0);
  const allComplete   = totalQuota > 0 && totalDone >= totalQuota;

  // Available months for navigation (sorted desc)
  const availableMonths = [...new Set(client.servicesLog.map(l => l.month))]
    .filter(m => m <= monthKey)
    .sort()
    .reverse();

  const isExpanded = expandedClients.has(client.id);
  const ac = getAvatarColor(state.team.find(t => client.members[0]?.memberId === t.id)?.colorIdx ?? 0);

  const section = document.createElement('div');
  section.className = `service-section${isExpanded ? ' expanded' : ''}`;
  section.id = `service-section-${client.id}`;

  section.innerHTML = `
    <!-- Section header (always visible, clickable to expand) -->
    <div class="service-section-header" role="button" tabindex="0" aria-expanded="${isExpanded}"
         onclick="toggleServiceSection('${client.id}')" onkeydown="if(event.key==='Enter')toggleServiceSection('${client.id}')">
      <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
        <div class="service-avatar-wrap">
          ${allComplete
            ? `<span style="font-size:22px">✅</span>`
            : `<span class="avatar avatar-lg" style="background:${ac.bg};color:${ac.text}">${(client.name.split(' ').map(w=>w[0]).join('').slice(0,2)).toUpperCase()}</span>`
          }
        </div>
        <div style="flex:1;min-width:0">
          <div class="service-client-name">${client.name}</div>
          <div class="service-client-sub">
            ${totalQuota > 0
              ? `${totalDone}/${totalQuota} items · ${retainerCycleLabel(viewMonth, client.startDay)}`
              : 'No service plan configured'}
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
        ${totalQuota > 0 ? `
          <div class="service-overall-progress">
            <div class="progress-track" style="width:70px;height:6px">
              <div class="progress-fill ${totalDone/totalQuota >= 1 ? '' : totalDone/totalQuota >= 0.7 ? 'high' : ''}"
                   style="width:${Math.min(100,Math.round((totalDone/totalQuota)*100))}%"></div>
            </div>
            <span style="font-size:11.5px;font-weight:600;color:var(--text-muted);white-space:nowrap">${Math.min(100,Math.round((totalDone/totalQuota)*100))}%</span>
          </div>` : ''}
        <div class="service-chevron ${isExpanded ? 'open' : ''}">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Expandable body -->
    <div class="service-section-body" id="service-body-${client.id}" style="${isExpanded ? '' : 'display:none'}">
      <!-- Month navigator -->
      ${availableMonths.length > 0 ? `
      <div class="month-navigator">
        <button class="month-nav-btn" onclick="navigateServiceMonth('${client.id}', -1)"
          ${viewMonth === availableMonths[availableMonths.length - 1] ? 'disabled' : ''}>
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span class="month-nav-label">
          ${retainerCycleLabel(viewMonth, client.startDay)}
          ${!isCurrentMonth ? '<span class="readonly-badge">Past · Read-only</span>' : '<span class="current-badge">Current Cycle</span>'}
        </span>
        <button class="month-nav-btn" onclick="navigateServiceMonth('${client.id}', 1)"
          ${viewMonth === monthKey ? 'disabled' : ''}>
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>` : ''}

      ${allTypes.length === 0
        ? `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
            No service plan set. <button class="btn btn-secondary btn-sm" onclick="openAddClientModal(window.__agencyState,'${client.id}')">Configure Plan</button>
           </div>`
        : buildServiceTypesTabs(state, client, viewMonth, isCurrentMonth, allTypes, progress)
      }
    </div>
  `;

  return section;
}

// ─── Type tabs + checkbox grids ───────────────────────────────
function buildServiceTypesTabs(state, client, viewMonth, isCurrentMonth, allTypes, progress) {
  const tabsHtml = allTypes.map((type, i) => {
    const { done, quota } = progress[type] || { done: 0, quota: 0 };
    const complete = quota > 0 && done >= quota;
    return `
      <button class="service-tab${i === 0 ? ' active' : ''}"
              id="tab-${client.id}-${type}"
              onclick="switchServiceTab('${client.id}','${type}')">
        ${typeIcon(type)} ${type}
        <span class="tab-count ${complete ? 'complete' : ''}">${done}/${quota}</span>
      </button>
    `;
  }).join('');

  const panelsHtml = allTypes.map((type, i) => {
    const { quota } = progress[type] || { quota: 0 };
    const log = getMonthLog(client, viewMonth);
    const checks = (log && Array.isArray(log[type])) ? log[type] : Array(quota).fill(false);

    const checkboxHtml = checks.map((checked, idx) => `
      <label class="service-checkbox-item ${checked ? 'checked' : ''} ${!isCurrentMonth ? 'readonly' : ''}"
             for="chk-${client.id}-${type}-${idx}">
        <input type="checkbox"
               id="chk-${client.id}-${type}-${idx}"
               ${checked ? 'checked' : ''}
               ${!isCurrentMonth ? 'disabled' : ''}
               onchange="toggleServiceCheck('${client.id}','${viewMonth}','${type}',${idx},this.checked)"
        />
        <span class="service-checkbox-label">${type.slice(0,-1)} #${idx + 1}</span>
        <span class="service-check-icon">${checked ? '✓' : ''}</span>
      </label>
    `).join('');

    return `
      <div class="service-panel${i === 0 ? ' active' : ''}" id="panel-${client.id}-${type}">
        ${quota === 0
          ? `<div style="padding:20px;color:var(--text-muted);font-size:13px;text-align:center">Quota set to 0. Update the service plan to track.</div>`
          : `<div class="service-checkbox-grid">${checkboxHtml}</div>`
        }
      </div>
    `;
  }).join('');

  return `
    <div class="service-tabs" id="tabs-${client.id}">${tabsHtml}</div>
    <div class="service-panels">${panelsHtml}</div>
  `;
}

function typeIcon(type) {
  return type === 'Reels' ? '🎬' : type === 'Posts' ? '🖼️' : type === 'Stories' ? '📖' : '📌';
}

// ─── Interaction handlers ──────────────────────────────────────

function toggleServiceSection(clientId) {
  if (expandedClients.has(clientId)) {
    expandedClients.delete(clientId);
  } else {
    expandedClients.add(clientId);
  }
  const state = window.__agencyState;
  const container = document.getElementById('page-content');
  renderServicesPage(state, container);
}

function navigateServiceMonth(clientId, direction) {
  const state        = window.__agencyState;
  const client       = state.clients.find(c => c.id === clientId);
  if (!client) return;

  const monthKey     = getCurrentMonthKey();
  const available    = [...new Set(client.servicesLog.map(l => l.month))]
    .filter(m => m <= monthKey)
    .sort();

  const current = clientViewMonth[clientId] || monthKey;
  const idx     = available.indexOf(current);
  const newIdx  = idx + direction;

  if (newIdx >= 0 && newIdx < available.length) {
    clientViewMonth[clientId] = available[newIdx];
    const container = document.getElementById('page-content');
    renderServicesPage(state, container);
  }
}

function switchServiceTab(clientId, type) {
  // Deactivate all tabs and panels for this client
  document.querySelectorAll(`#tabs-${clientId} .service-tab`).forEach(t => t.classList.remove('active'));
  document.querySelectorAll(`[id^="panel-${clientId}-"]`).forEach(p => p.classList.remove('active'));
  // Activate selected
  const tabEl   = document.getElementById(`tab-${clientId}-${type}`);
  const panelEl = document.getElementById(`panel-${clientId}-${type}`);
  if (tabEl)   tabEl.classList.add('active');
  if (panelEl) panelEl.classList.add('active');
}

function toggleServiceCheck(clientId, monthKey, type, idx, checked) {
  const state  = window.__agencyState;
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;

  let log = client.servicesLog.find(l => l.month === monthKey);
  if (!log) {
    log = { month: monthKey };
    client.servicesLog.push(log);
  }
  if (!Array.isArray(log[type])) {
    log[type] = Array(client.servicesPlan[type] || 0).fill(false);
  }
  log[type][idx] = checked;

  saveState(state);

  // Update UI in-place (no full re-render for performance)
  const label = document.querySelector(`label[for="chk-${clientId}-${type}-${idx}"]`);
  if (label) {
    label.classList.toggle('checked', checked);
    const icon = label.querySelector('.service-check-icon');
    if (icon) icon.textContent = checked ? '✓' : '';
  }

  // Update tab count badge
  const prog = getServicesProgress(client, monthKey);
  const tabEl = document.getElementById(`tab-${clientId}-${type}`);
  if (tabEl) {
    const badge = tabEl.querySelector('.tab-count');
    const { done, quota } = prog[type] || { done: 0, quota: 0 };
    if (badge) {
      badge.textContent = `${done}/${quota}`;
      badge.classList.toggle('complete', done >= quota && quota > 0);
    }
  }

  // Update overall progress in section header
  updateSectionHeaderProgress(state, client, monthKey);

  // Refresh home if it was last rendered
  updateNotifBadge(state);
}

function updateSectionHeaderProgress(state, client, monthKey) {
  const allTypes   = Object.keys(client.servicesPlan || {}).filter(t => client.servicesPlan[t] > 0);
  const progress   = getServicesProgress(client, monthKey);
  const totalDone  = allTypes.reduce((s, t) => s + (progress[t]?.done || 0), 0);
  const totalQuota = allTypes.reduce((s, t) => s + (progress[t]?.quota || 0), 0);
  const pct        = totalQuota > 0 ? Math.min(100, Math.round((totalDone / totalQuota) * 100)) : 0;

  const section = document.getElementById(`service-section-${client.id}`);
  if (!section) return;

  // Update sub text
  const sub = section.querySelector('.service-client-sub');
  if (sub) sub.textContent = `${totalDone}/${totalQuota} items · ${retainerCycleLabel(monthKey, client.startDay)}`;

  // Update progress bar
  const fill = section.querySelector('.service-overall-progress .progress-fill');
  const pctLabel = section.querySelector('.service-overall-progress + span, .service-overall-progress span:last-child');
  if (fill) fill.style.width = `${pct}%`;

  // Update avatar/tick
  const avatarWrap = section.querySelector('.service-avatar-wrap');
  if (avatarWrap && totalQuota > 0) {
    const allComplete = totalDone >= totalQuota;
    const ac = getAvatarColor(state.team.find(t => client.members[0]?.memberId === t.id)?.colorIdx ?? 0);
    avatarWrap.innerHTML = allComplete
      ? `<span style="font-size:22px">✅</span>`
      : `<span class="avatar avatar-lg" style="background:${ac.bg};color:${ac.text}">${(client.name.split(' ').map(w=>w[0]).join('').slice(0,2)).toUpperCase()}</span>`;
  }
}

// ─── Retainer cycle label ────────────────────────────────────
// Returns e.g. "21 Jun → 21 Jul" for a client whose cycle starts on day 21
// monthKey: 'YYYY-MM' — this is the billing month the log is stored under
function retainerCycleLabel(monthKey, startDay) {
  if (!startDay || startDay <= 1) {
    // Fallback: just show full month name
    const [yr, mo] = monthKey.split('-').map(Number);
    return new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const [yr, mo] = monthKey.split('-').map(Number);

  // Cycle: from startDay of this month → startDay of next month
  const startDate = new Date(yr, mo - 1, startDay);
  const endDate   = new Date(yr, mo, startDay); // same day, next month

  const fmt = d => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const endYr = endDate.getFullYear();

  // If the period spans two years, append the year on end
  const endLabel = endYr !== yr
    ? endDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : fmt(endDate);

  return `${fmt(startDate)} → ${endLabel}`;
}
