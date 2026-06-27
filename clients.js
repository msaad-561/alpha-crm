// ============================================================
// clients.js — Clients Dashboard (v4)
// Active / Previous tabs, client status, date filters
// ============================================================

let clientsActiveTab = 'active'; // 'active' | 'previous'

// ─── Main render ─────────────────────────────────────────────
function renderClientsPage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  let cPeriod = 'this_month';
  let cCustStart = '', cCustEnd = '';

  function rebuild() {
    container.innerHTML = '';
    container.className = 'fade-in';

    const range = getFilterRange(cPeriod, cCustStart, cCustEnd);
    const activeClients   = getActiveClients(state);
    const previousClients = getPreviousClients(state);

    // ── Alert banner (active only)
    if (clientsActiveTab === 'active') {
      const banner = document.createElement('div');
      banner.className = 'alert-banner';
      banner.id = 'clients-alert-banner';
      container.appendChild(banner);
      renderAlertBanner(state, banner);
    }

    // ── Date filter bar
    container.appendChild(buildDateFilterBar(cPeriod, cCustStart, cCustEnd, (p, cs, ce) => {
      cPeriod = p; cCustStart = cs; cCustEnd = ce; rebuild();
    }));

    // ── Metric cards
    container.appendChild(buildClientMetrics(state, range));

    // ── Tabs
    const tabs = document.createElement('div');
    tabs.className = 'client-tabs';
    tabs.innerHTML = `
      <div class="client-tab ${clientsActiveTab === 'active' ? 'active' : ''}" data-tab="active" id="tab-active">
        Active Clients <span class="client-tab-count">${activeClients.length}</span>
      </div>
      <div class="client-tab ${clientsActiveTab === 'previous' ? 'active' : ''}" data-tab="previous" id="tab-previous">
        Previous Clients <span class="client-tab-count">${previousClients.length}</span>
      </div>
    `;
    container.appendChild(tabs);

    tabs.querySelectorAll('.client-tab').forEach(t => {
      t.addEventListener('click', () => {
        clientsActiveTab = t.dataset.tab;
        rebuild();
      });
    });

    // ── Tab content
    if (clientsActiveTab === 'active') {
      // Section header
      const secHeader = document.createElement('div');
      secHeader.className = 'section-header';
      secHeader.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <span class="section-title">Active Clients</span>
          <span class="section-count">${activeClients.length}</span>
        </div>
      `;
      container.appendChild(secHeader);
      container.appendChild(buildClientTable(state, activeClients));

      if (typeof buildMobileClientCards === 'function') {
        container.appendChild(buildMobileClientCards(state));
      }

      const twocol = document.createElement('div');
      twocol.className = 'two-col';
      twocol.appendChild(buildUpcomingPayments(state));
      twocol.appendChild(buildTeamEarnings(state));
      container.appendChild(twocol);

    } else {
      // Previous clients tab
      buildPreviousClientsSection(state, previousClients, container, rebuild);
    }
  }

  rebuild();
}

// ─── Metric cards ────────────────────────────────────────────
function buildClientMetrics(state, range) {
  const totalRetainers  = getTotalRetainers(state);
  const collected       = getCollectedThisMonth(state);
  const totalPayroll    = getTotalPayroll(state);
  const net             = totalRetainers - totalPayroll;
  const activeClients   = getActiveClients(state);

  const grid = document.createElement('div');
  grid.className = 'metrics-grid';

  const cards = [
    { label: 'Total Retainers',   value: formatCurrency(state, totalRetainers), sub: `${activeClients.length} active clients`, cls: 'neutral' },
    { label: 'Collected This Month', value: formatCurrency(state, collected), sub: `${activeClients.filter(c => getClientStatus(c) === 'Paid').length} of ${activeClients.length} paid`, cls: collected >= totalRetainers ? 'positive' : 'neutral' },
    { label: 'Total Payroll',     value: formatCurrency(state, totalPayroll), sub: `${state.team.length} team members`, cls: 'neutral' },
    { label: 'Net After Payroll', value: formatCurrency(state, net), sub: `${Math.round((totalRetainers ? (net/totalRetainers)*100 : 0))}% margin`, cls: net >= 0 ? 'positive' : 'negative' },
  ];

  cards.forEach(c => {
    const card = document.createElement('div');
    card.className = 'metric-card';
    card.innerHTML = `
      <div class="metric-label">${c.label}</div>
      <div class="metric-value ${c.cls}">${c.value}</div>
      <div class="metric-sub">${c.sub}</div>
    `;
    grid.appendChild(card);
  });

  return grid;
}

// ─── Client table ────────────────────────────────────────────
function buildClientTable(state, clients) {
  const wrap = document.createElement('div');
  wrap.className = 'table-card';

  if (!clients.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No clients yet</div>
        <p>Click "Add Client" to get started.</p>
      </div>`;
    return wrap;
  }

  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Client</th>
        <th>Retainer</th>
        <th>Team Share</th>
        <th>Next Due</th>
        <th>Payment</th>
        <th>Status</th>
        <th>Team</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="client-tbody"></tbody>
  `;

  const tbody = table.querySelector('#client-tbody');

  clients.forEach(client => {
    const payStatus = getClientStatus(client);
    const days      = getDaysUntilDue(client);
    const dueDate   = formatDueDate(client);
    const memberShares = client.members.map(m => {
      const tm = getTeamMember(state, m.memberId);
      return tm ? `${tm.name.split(' ')[0]} ${formatCurrency(state, m.share)}` : '';
    }).join(' · ');

    const cStatus = client.clientStatus || 'Active';
    const statusBadgeHtml = `<span class="status-badge ${cStatus.toLowerCase()}"><span class="status-badge-dot"></span>${cStatus}</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight:600;font-size:14px">${client.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">Since day ${client.startDay} of month</div>
      </td>
      <td>
        <span style="font-weight:700;font-size:14px">${formatCurrency(state, client.retainerAmount)}</span>
        <div style="font-size:11.5px;color:var(--text-muted)">per month</div>
      </td>
      <td style="font-size:12.5px;color:var(--text-secondary);max-width:180px">${memberShares || '—'}</td>
      <td>
        <div style="font-weight:600;font-size:13.5px">${dueDate}</div>
        <div style="font-size:12px;color:var(--text-muted)">${daysLabel(days, payStatus)}</div>
      </td>
      <td>${statusPill(payStatus)}</td>
      <td>${statusBadgeHtml}</td>
      <td>${buildAvatarGroup(state, client)}</td>
      <td>
        <button class="btn btn-secondary btn-sm view-client-btn" data-id="${client.id}">View</button>
      </td>
    `;

    tr.addEventListener('click', (e) => {
      if (!e.target.closest('.view-client-btn') || e.target.tagName !== 'BUTTON') {
        openClientModal(state, client.id);
      } else {
        openClientModal(state, client.id);
      }
    });

    tbody.appendChild(tr);
  });

  wrap.appendChild(table);
  return wrap;
}

// ─── Previous Clients Section ─────────────────────────────────
function buildPreviousClientsSection(state, clients, container, onUpdate) {
  if (!clients.length) {
    container.innerHTML += `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <div class="empty-state-title">No previous clients</div>
        <p>Clients you mark as "Gone" or "Paused" will appear here with their full financial history.</p>
      </div>`;
    return;
  }

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span class="section-title">Previous Clients</span>
      <span class="section-count">${clients.length}</span>
    </div>
  `;
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'churn-grid';

  clients.forEach(client => {
    const paidMonths     = client.payments.filter(p => p.paid).length;
    const totalRevenue   = getClientLifetimeRevenue(client);
    const monthlyPayroll = client.members.reduce((s, m) => s + m.share, 0);
    const totalPayroll   = monthlyPayroll * paidMonths;
    const totalProfit    = totalRevenue - totalPayroll;
    const cStatus        = client.clientStatus || 'Gone';

    const card = document.createElement('div');
    card.className = 'churn-card';
    card.innerHTML = `
      <div class="churn-card-header">
        <div>
          <div class="churn-client-name">${client.name}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${paidMonths} month${paidMonths !== 1 ? 's' : ''} active · Day ${client.startDay}/mo</div>
        </div>
        <span class="status-badge ${cStatus.toLowerCase()}"><span class="status-badge-dot"></span>${cStatus}</span>
      </div>
      <div class="churn-stats">
        <div>
          <div class="churn-stat-label">Revenue</div>
          <div class="churn-stat-value">${formatCurrency(state, totalRevenue)}</div>
        </div>
        <div>
          <div class="churn-stat-label">Payroll Paid</div>
          <div class="churn-stat-value">${formatCurrency(state, totalPayroll)}</div>
        </div>
        <div>
          <div class="churn-stat-label">Net Profit</div>
          <div class="churn-stat-value ${totalProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(state, totalProfit)}</div>
        </div>
      </div>
      <div class="churn-card-footer">
        <span style="font-size:12px;color:var(--text-muted)">Retainer: ${formatCurrency(state, client.retainerAmount)}/mo</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm reactivate-btn" data-id="${client.id}">Reactivate</button>
          <button class="btn btn-secondary btn-sm view-churn-btn" data-id="${client.id}">View</button>
        </div>
      </div>
    `;

    card.querySelector('.view-churn-btn').addEventListener('click', () =>
      openClientModal(state, client.id));

    card.querySelector('.reactivate-btn').addEventListener('click', () => {
      client.clientStatus = 'Active';
      saveState(state);
      onUpdate();
    });

    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function daysLabel(days, status) {
  if (status === 'Overdue') return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `In ${days} days`;
}

function statusPill(status) {
  const cls = status.toLowerCase();
  return `<span class="pill ${cls}"><span class="pill-dot"></span>${status}</span>`;
}

function buildAvatarGroup(state, client) {
  const avatars = client.members.slice(0, 4).map(m => {
    const tm = getTeamMember(state, m.memberId);
    if (!tm) return '';
    const c = getAvatarColor(tm.colorIdx);
    return `<span class="avatar" style="background:${c.bg};color:${c.text}" title="${tm.name}">${tm.initials}</span>`;
  }).join('');
  return `<div class="avatar-group">${avatars}</div>`;
}

// ─── Upcoming Payments panel ──────────────────────────────────
function buildUpcomingPayments(state) {
  const panel = document.createElement('div');
  panel.className = 'panel-card';
  panel.innerHTML = `<div class="panel-header">Upcoming Payments</div><div class="panel-body" id="upcoming-list"></div>`;

  const list = panel.querySelector('#upcoming-list');
  const sorted = [...getActiveClients(state)]
    .map(c => ({ c, days: getDaysUntilDue(c), status: getClientStatus(c) }))
    .sort((a, b) => a.days - b.days);

  sorted.forEach(({ c, days, status }) => {
    const chipCls = status === 'Overdue' ? 'urgent' : days <= 3 ? 'warning' : 'normal';
    const chipTxt = status === 'Overdue' ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`;
    const item = document.createElement('div');
    item.className = 'panel-item';
    item.innerHTML = `
      <div class="panel-item-main">
        <div class="panel-item-name">${c.name}</div>
        <div class="panel-item-sub">${formatDueDate(c)}</div>
      </div>
      <span class="days-chip ${chipCls}">${chipTxt}</span>
      <span style="font-weight:700;font-size:14px;margin-left:4px">${formatCurrency(state, c.retainerAmount)}</span>
    `;
    list.appendChild(item);
  });

  if (!sorted.length) {
    list.innerHTML = '<div class="empty-state" style="padding:24px"><p>No active clients</p></div>';
  }

  return panel;
}

// ─── Team Earnings panel ──────────────────────────────────────
function buildTeamEarnings(state) {
  const panel = document.createElement('div');
  panel.className = 'panel-card';
  panel.innerHTML = `<div class="panel-header">Team Earnings This Month</div><div class="panel-body" id="team-earnings-list"></div>`;

  const list = panel.querySelector('#team-earnings-list');
  const earnings = getMemberEarningsThisMonth(state);
  const maxEarning = Math.max(...Object.values(earnings), 1);

  state.team
    .filter(t => earnings[t.id] > 0)
    .sort((a, b) => earnings[b.id] - earnings[a.id])
    .forEach(tm => {
      const amt = earnings[tm.id];
      const pct = Math.round((amt / maxEarning) * 100);
      const c   = getAvatarColor(tm.colorIdx);
      const fillCls = pct >= 100 ? '' : pct >= 70 ? 'high' : '';

      const item = document.createElement('div');
      item.className = 'panel-item';
      item.innerHTML = `
        <span class="avatar avatar-lg" style="background:${c.bg};color:${c.text}">${tm.initials}</span>
        <div class="panel-item-main">
          <div class="panel-item-name">${tm.name}</div>
          <div class="progress-wrap" style="margin-top:6px">
            <div class="progress-track">
              <div class="progress-fill ${fillCls}" style="width:${pct}%"></div>
            </div>
            <span class="progress-label">${pct}%</span>
          </div>
        </div>
        <span style="font-weight:700;font-size:14px">${formatCurrency(state, amt)}</span>
      `;
      list.appendChild(item);
    });

  if (!state.team.length) {
    list.innerHTML = '<div class="empty-state" style="padding:24px"><p>No team members</p></div>';
  }

  return panel;
}

// ─── Client Detail Modal ──────────────────────────────────────
function openClientModal(state, clientId) {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;

  const payStatus = getClientStatus(client);
  const dueDate   = formatDueDate(client);
  const monthKey  = getCurrentMonthKey();
  const payment   = client.payments.find(p => p.month === monthKey);
  const isPaid    = payment && payment.paid;
  const cStatus   = client.clientStatus || 'Active';

  const memberRows = client.members.map(m => {
    const tm = getTeamMember(state, m.memberId);
    if (!tm) return '';
    const c = getAvatarColor(tm.colorIdx);
    return `
      <div class="member-share-row">
        <span class="avatar" style="background:${c.bg};color:${c.text}">${tm.initials}</span>
        <span class="member-share-name">${tm.name}</span>
        <span class="member-share-amount">${formatCurrency(state, m.share)}</span>
      </div>
    `;
  }).join('');

  const histRows = [...client.payments].reverse().map(p => {
    const [yr, mo] = p.month.split('-');
    const monthName = new Date(+yr, +mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `
      <div class="ph-item">
        <span class="ph-month">${monthName}</span>
        <span class="ph-paid-date">${p.paid ? `Paid ${formatDate(p.paidDate)}` : 'Unpaid'}</span>
        ${statusPill(p.paid ? 'Paid' : (p.month < monthKey ? 'Overdue' : 'Pending'))}
      </div>
    `;
  }).join('');

  const waLink = buildWhatsAppLink(client.contactPhone, client.name, client.retainerAmount, dueDate, state.currency);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'client-modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${client.name} details">
      <div class="modal-header">
        <div>
          <div class="modal-title">${client.name}</div>
          <div class="modal-subtitle">Client since day ${client.startDay} of every month</div>
        </div>
        <button class="modal-close" id="modal-close-btn" title="Close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="client-modal-grid">
          <div class="info-group">
            <div class="info-label">Monthly Retainer</div>
            <div class="info-value large">${formatCurrency(state, client.retainerAmount)}</div>
          </div>
          <div class="info-group">
            <div class="info-label">Next Due Date</div>
            <div class="info-value large">${dueDate}</div>
          </div>
          <div class="info-group">
            <div class="info-label">Payment Status</div>
            <div style="margin-top:4px">${statusPill(payStatus)}</div>
          </div>
          <div class="info-group">
            <div class="info-label">Team Payroll</div>
            <div class="info-value large">${formatCurrency(state, client.members.reduce((s,m)=>s+m.share,0))}</div>
          </div>
        </div>

        ${client.notes ? `<div style="background:var(--bg-page);border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;margin-bottom:18px;font-size:13px;color:var(--text-secondary)">
          <strong style="color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px">Notes</strong><br/>
          <span style="margin-top:4px;display:block">${client.notes}</span>
        </div>` : ''}

        <!-- Client Status -->
        <div class="info-label" style="margin-bottom:10px">Client Status</div>
        <div class="status-selector" id="status-selector" style="margin-bottom:20px">
          <button class="status-option-btn ${cStatus === 'Active' ? 'selected-active' : ''}" data-status="Active">✅ Active</button>
          <button class="status-option-btn ${cStatus === 'Paused' ? 'selected-paused' : ''}" data-status="Paused">⏸ Paused</button>
          <button class="status-option-btn ${cStatus === 'Gone' ? 'selected-gone' : ''}" data-status="Gone">🚪 Gone</button>
        </div>

        <div class="info-label" style="margin-bottom:10px">Team & Shares</div>
        <div class="member-share-list">${memberRows || '<p style="color:var(--text-muted);font-size:13px">No team members assigned.</p>'}</div>

        <div class="payment-history">
          <div class="ph-title">Payment History</div>
          ${histRows || '<p style="color:var(--text-muted);font-size:13px">No payment records yet.</p>'}
        </div>
      </div>
      <div class="modal-footer">
        <div style="display:flex;gap:8px">
          <button class="btn btn-danger btn-sm" id="delete-client-btn">Delete</button>
          <a href="${waLink}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.997 0C5.373 0 0 5.373 0 11.997c0 2.118.554 4.107 1.523 5.832L0 24l6.335-1.508A11.955 11.955 0 0011.997 24C18.621 24 24 18.627 24 11.997 24 5.373 18.621 0 11.997 0zm0 21.818a9.815 9.815 0 01-5.032-1.387l-.361-.214-3.737.889.928-3.636-.236-.373A9.818 9.818 0 012.182 12c0-5.415 4.4-9.818 9.815-9.818 5.416 0 9.821 4.403 9.821 9.818 0 5.416-4.405 9.818-9.821 9.818z"/></svg>
            Send Reminder
          </a>
        </div>
        <div style="display:flex;gap:8px">
          ${!isPaid ? `<button class="btn btn-success btn-sm" id="mark-paid-btn" data-id="${client.id}">Mark as Paid</button>` : `<button class="btn btn-secondary btn-sm" id="mark-unpaid-btn" data-id="${client.id}">Mark as Unpaid</button>`}
          <button class="btn btn-primary btn-sm" id="edit-client-btn" data-id="${client.id}">Edit</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#modal-close-btn').addEventListener('click', close);

  // Status selector
  overlay.querySelectorAll('.status-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.status-option-btn').forEach(b => {
        b.className = 'status-option-btn';
      });
      const newStatus = btn.dataset.status;
      btn.classList.add(`selected-${newStatus.toLowerCase()}`);
      client.clientStatus = newStatus;
      saveState(state);
      renderPage(state); // refresh underlying page
    });
  });

  const markPaidBtn = overlay.querySelector('#mark-paid-btn');
  if (markPaidBtn) {
    markPaidBtn.addEventListener('click', () => {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      let p = client.payments.find(p => p.month === monthKey);
      if (!p) { p = { month: monthKey, paid: false, paidDate: null }; client.payments.push(p); }
      p.paid = true;
      p.paidDate = dateStr;
      saveState(state);
      close();
      renderPage(state);
    });
  }

  const markUnpaidBtn = overlay.querySelector('#mark-unpaid-btn');
  if (markUnpaidBtn) {
    markUnpaidBtn.addEventListener('click', () => {
      const p = client.payments.find(p => p.month === monthKey);
      if (p) { p.paid = false; p.paidDate = null; }
      saveState(state);
      close();
      renderPage(state);
    });
  }

  overlay.querySelector('#delete-client-btn').addEventListener('click', () => {
    if (confirm(`Delete ${client.name}? This cannot be undone.`)) {
      state.clients = state.clients.filter(c => c.id !== clientId);
      saveState(state);
      close();
      renderPage(state);
    }
  });

  overlay.querySelector('#edit-client-btn').addEventListener('click', () => {
    close();
    openAddClientModal(state, clientId);
  });
}

// ─── Add / Edit Client Modal ──────────────────────────────────
function openAddClientModal(state, editId = null) {
  const editing = editId ? state.clients.find(c => c.id === editId) : null;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const memberRows = state.team.map(tm => {
    const existing = editing ? editing.members.find(m => m.memberId === tm.id) : null;
    const checked  = existing ? 'checked' : '';
    const share    = existing ? existing.share : '';
    const c = getAvatarColor(tm.colorIdx);
    return `
      <div class="member-assignment-row" id="member-row-${tm.id}">
        <input type="checkbox" id="chk-${tm.id}" data-member="${tm.id}" ${checked} onchange="toggleShareInput('${tm.id}')"/>
        <span class="avatar" style="background:${c.bg};color:${c.text}">${tm.initials}</span>
        <label for="chk-${tm.id}" class="member-assignment-name">${tm.name}</label>
        <input type="number" class="form-input share-input" id="share-${tm.id}" placeholder="Share amount" min="0" value="${share}" style="display:${existing ? 'block' : 'none'};width:140px" />
      </div>
    `;
  }).join('');

  const plan = (editing && editing.servicesPlan) || { Reels: 0, Posts: 0, Stories: 0 };
  const serviceTypes = (state.serviceTypes && state.serviceTypes.length ? state.serviceTypes : ['Reels', 'Posts', 'Stories']);
  const servicePlanRows = serviceTypes.map(type => `
    <div class="form-group">
      <label class="form-label" for="svc-${type}">
        ${type === 'Reels' ? '🎬' : type === 'Posts' ? '🖼️' : '📖'} ${type} per month
      </label>
      <input class="form-input" type="number" id="svc-${type}" min="0" max="99"
             placeholder="0" value="${plan[type] || 0}" style="max-width:100px" />
    </div>
  `).join('');

  const currentStatus = editing ? (editing.clientStatus || 'Active') : 'Active';

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div>
          <div class="modal-title">${editing ? 'Edit Client' : 'Add New Client'}</div>
          <div class="modal-subtitle">${editing ? 'Update client details' : 'Fill in the client retainer details'}</div>
        </div>
        <button class="modal-close" id="add-modal-close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="add-name">Client Name</label>
            <input class="form-input" type="text" id="add-name" placeholder="e.g. Apex Brands" value="${editing ? editing.name : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="add-retainer">Monthly Retainer (${state.currency})</label>
            <input class="form-input" type="number" id="add-retainer" placeholder="e.g. 4500" min="0" value="${editing ? editing.retainerAmount : ''}" />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="add-startday">Payment Day of Month</label>
            <input class="form-input" type="number" id="add-startday" placeholder="e.g. 21" min="1" max="28" value="${editing ? editing.startDay : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="add-phone">Client WhatsApp (optional)</label>
            <input class="form-input" type="text" id="add-phone" placeholder="+92 300 0000000" value="${editing ? (editing.contactPhone || '') : ''}" />
          </div>
        </div>

        <div class="form-section-title">Client Status</div>
        <div class="status-selector" id="add-status-selector" style="margin-bottom:16px">
          <button type="button" class="status-option-btn ${currentStatus === 'Active' ? 'selected-active' : ''}" data-status="Active">✅ Active</button>
          <button type="button" class="status-option-btn ${currentStatus === 'Paused' ? 'selected-paused' : ''}" data-status="Paused">⏸ Paused</button>
          <button type="button" class="status-option-btn ${currentStatus === 'Gone' ? 'selected-gone' : ''}" data-status="Gone">🚪 Gone</button>
        </div>

        <div class="form-section-title">📦 Monthly Service Plan</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Set how many deliverables are included per month for this client.</div>
        <div class="form-grid-2" style="grid-template-columns:repeat(3,1fr)">
          ${servicePlanRows}
        </div>

        <div class="form-section-title">Assign Team Members &amp; Shares</div>
        <div class="member-assignment-list">${memberRows || '<p style="color:var(--text-muted);font-size:13px">No team members. Add them in the Team section.</p>'}</div>
        <div class="form-section-title">Notes</div>
        <div class="form-group">
          <textarea class="form-input" id="add-notes" placeholder="Any notes about this client…">${editing ? (editing.notes || '') : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="add-modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="add-modal-save">${editing ? 'Save Changes' : 'Add Client'}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  let selectedStatus = currentStatus;
  overlay.querySelectorAll('#add-status-selector .status-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('#add-status-selector .status-option-btn').forEach(b => b.className = 'status-option-btn');
      selectedStatus = btn.dataset.status;
      btn.classList.add(`selected-${selectedStatus.toLowerCase()}`);
    });
  });

  const close = () => {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#add-modal-close').addEventListener('click', close);
  overlay.querySelector('#add-modal-cancel').addEventListener('click', close);

  overlay.querySelector('#add-modal-save').addEventListener('click', () => {
    const name      = overlay.querySelector('#add-name').value.trim();
    const retainer  = parseFloat(overlay.querySelector('#add-retainer').value);
    const startDay  = parseInt(overlay.querySelector('#add-startday').value);
    const phone     = overlay.querySelector('#add-phone').value.trim();
    const notes     = overlay.querySelector('#add-notes').value.trim();

    if (!name || isNaN(retainer) || isNaN(startDay) || startDay < 1 || startDay > 28) {
      alert('Please fill in all required fields correctly (day must be 1–28).');
      return;
    }

    const members = [];
    state.team.forEach(tm => {
      const chk   = overlay.querySelector(`#chk-${tm.id}`);
      const share = parseFloat(overlay.querySelector(`#share-${tm.id}`)?.value);
      if (chk && chk.checked && !isNaN(share) && share >= 0) {
        members.push({ memberId: tm.id, share });
      }
    });

    const svcTypes = (state.serviceTypes && state.serviceTypes.length ? state.serviceTypes : ['Reels', 'Posts', 'Stories']);
    const newPlan = {};
    svcTypes.forEach(type => {
      const val = parseInt(overlay.querySelector(`#svc-${type}`)?.value) || 0;
      newPlan[type] = Math.max(0, val);
    });

    if (editing) {
      editing.name           = name;
      editing.retainerAmount = retainer;
      editing.startDay       = startDay;
      editing.contactPhone   = phone;
      editing.notes          = notes;
      editing.members        = members;
      editing.servicesPlan   = newPlan;
      editing.clientStatus   = selectedStatus;
      ensureCurrentMonthLog(editing);
    } else {
      const monthKey = getCurrentMonthKey();
      const newClient = {
        id: generateId(),
        name,
        retainerAmount: retainer,
        startDay,
        contactPhone: phone,
        members,
        payments: [{ month: monthKey, paid: false, paidDate: null }],
        notes,
        servicesPlan: newPlan,
        servicesLog: [],
        clientStatus: selectedStatus,
      };
      ensureCurrentMonthLog(newClient);
      state.clients.push(newClient);
    }

    saveState(state);
    close();
    renderPage(state);
  });
}

function toggleShareInput(memberId) {
  const chk   = document.querySelector(`#chk-${memberId}`);
  const input = document.querySelector(`#share-${memberId}`);
  if (!input) return;
  input.style.display = chk && chk.checked ? 'block' : 'none';
  if (chk && chk.checked) input.focus();
}
