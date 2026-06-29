// ============================================================
// statements.js — Payment Statements Page
// Shows all client payments received with full history
// Linked to Reminders for pending/overdue follow-up
// ============================================================

function renderStatementsPage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  let sPeriod = 'this_month';
  let sCustStart = '', sCustEnd = '';
  let filterStatus = 'all';   // 'all' | 'paid' | 'pending' | 'overdue'
  let filterClient = 'all';   // 'all' | clientId

  function rebuild() {
    container.innerHTML = '';
    container.className = 'fade-in';

    const range = getFilterRange(sPeriod, sCustStart, sCustEnd);

    // ── Page header with + Add Payment
    const pageHdr = document.createElement('div');
    pageHdr.className = 'section-header';
    pageHdr.style.marginBottom = '4px';
    pageHdr.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span class="section-title">Payment Statements</span>
      </div>
      <button class="btn btn-primary btn-sm" id="add-overhead-btn">+ Add Payment</button>
    `;
    container.appendChild(pageHdr);
    pageHdr.querySelector('#add-overhead-btn').addEventListener('click', () =>
      openAddOverheadModal(state, rebuild));

    // ── Date filter bar
    container.appendChild(buildDateFilterBar(sPeriod, sCustStart, sCustEnd, (p, cs, ce) => {
      sPeriod = p; sCustStart = cs; sCustEnd = ce; rebuild();
    }));

    // ── Build all statement rows from retainer payments
    const rows = buildStatementRows(state);

    // ── Filter by period
    const periodRows = rows.filter(r => {
      if (sPeriod === 'max') return true;
      const dateToCheck = r.paidDate || (r.month + '-01');
      return dateInRange(dateToCheck, range);
    });

    // ── Summary metrics
    container.appendChild(buildStatementMetrics(state, periodRows));

    // ── Filter controls row
    container.appendChild(buildStatementFilters(state, filterStatus, filterClient, (fs, fc) => {
      filterStatus = fs; filterClient = fc; rebuild();
    }));

    // ── Apply filters
    let filtered = periodRows;
    if (filterStatus !== 'all') filtered = filtered.filter(r => r.status === filterStatus);
    if (filterClient !== 'all') filtered = filtered.filter(r => r.clientId === filterClient);

    // ── Split into sections
    const overdueRows = filtered.filter(r => r.status === 'overdue');
    const pendingRows = filtered.filter(r => r.status === 'pending');
    const paidRows    = filtered.filter(r => r.status === 'paid');

    if (overdueRows.length) buildStatementSection(state, '🔴 Overdue Payments',  overdueRows, container, rebuild, 'overdue');
    if (pendingRows.length) buildStatementSection(state, '⏳ Pending Payments',  pendingRows, container, rebuild, 'pending');
    if (paidRows.length)    buildStatementSection(state, '✅ Received Payments', paidRows,    container, rebuild, 'paid');

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.innerHTML = `
        <div class="empty-state" style="margin-top:20px">
          <div class="empty-state-icon">📄</div>
          <div class="empty-state-title">No statements found</div>
          <p>Payments will appear here once clients are added and marked as paid.</p>
          <button class="btn btn-primary" style="margin-top:12px" onclick="navigateTo('clients')">Go to Clients →</button>
        </div>`;
      container.appendChild(empty);
    }

    // ── Overhead Charges section (always shown at bottom)
    buildOverheadSection(state, range, container, rebuild);
  }

  rebuild();
}

// ─── Build all statement rows from client retainer payments ────
function buildStatementRows(state) {
  const rows = [];
  const todayStr = new Date().toISOString().split('T')[0];

  (state.clients || []).forEach(client => {
    (client.payments || []).forEach(p => {
      const [yr, mo] = p.month.split('-').map(Number);
      const dueDay  = client.startDay || 1;
      const dueDate = `${p.month}-${String(dueDay).padStart(2, '0')}`;

      let status;
      if (p.paid) {
        status = 'paid';
      } else if (dueDate < todayStr) {
        status = 'overdue';
      } else {
        status = 'pending';
      }

      rows.push({
        id: `${client.id}-${p.month}`,
        clientId: client.id,
        clientName: client.name,
        clientStatus: client.clientStatus || 'Active',
        paymentType: client.paymentType || 'retainer',
        amount: client.retainerAmount,
        month: p.month,
        monthLabel: new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        dueDate,
        paidDate: p.paidDate || null,
        status,
        paymentObj: p,
      });
    });
  });

  const order = { overdue: 0, pending: 1, paid: 2 };
  rows.sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return (b.paidDate || b.dueDate).localeCompare(a.paidDate || a.dueDate);
  });

  return rows;
}

// ─── Summary metric cards ─────────────────────────────────────
function buildStatementMetrics(state, rows) {
  const totalReceived = rows.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const totalPending  = rows.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
  const totalOverdue  = rows.filter(r => r.status === 'overdue').reduce((s, r) => s + r.amount, 0);
  const totalExpected = rows.reduce((s, r) => s + r.amount, 0);
  const paidCount    = rows.filter(r => r.status === 'paid').length;
  const pendingCount = rows.filter(r => r.status === 'pending').length;
  const overdueCount = rows.filter(r => r.status === 'overdue').length;

  const grid = document.createElement('div');
  grid.className = 'metrics-grid';
  grid.style.marginBottom = '20px';

  [
    { label: 'Total Received',  value: formatCurrency(state, totalReceived), sub: `${paidCount} confirmed`,        cls: 'positive', icon: '✅', highlight: true },
    { label: 'Pending',         value: formatCurrency(state, totalPending),  sub: `${pendingCount} awaiting`,      cls: 'neutral',  icon: '⏳' },
    { label: 'Overdue',         value: formatCurrency(state, totalOverdue),  sub: `${overdueCount} past due`,      cls: overdueCount > 0 ? 'negative' : 'neutral', icon: overdueCount > 0 ? '🔴' : '🟢' },
    { label: 'Total Expected',  value: formatCurrency(state, totalExpected), sub: `${rows.length} total entries`,  cls: 'neutral',  icon: '💼' },
  ].forEach(c => {
    const card = document.createElement('div');
    card.className = 'metric-card';
    if (c.highlight) card.style.cssText = 'border-color:var(--paid-text);box-shadow:0 0 0 1px var(--paid-text)';
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="metric-label">${c.label}</div>
        <span style="font-size:18px">${c.icon}</span>
      </div>
      <div class="metric-value ${c.cls}">${c.value}</div>
      <div class="metric-sub">${c.sub}</div>
    `;
    grid.appendChild(card);
  });

  return grid;
}

// ─── Status + Client filter bar ───────────────────────────────
function buildStatementFilters(state, activeStatus, activeClient, onChange) {
  const bar = document.createElement('div');
  bar.className = 'statement-filter-bar';

  const pillGroup = document.createElement('div');
  pillGroup.className = 'statement-pill-group';
  [
    { key: 'all',     label: 'All',     icon: '📋' },
    { key: 'paid',    label: 'Paid',    icon: '✅' },
    { key: 'pending', label: 'Pending', icon: '⏳' },
    { key: 'overdue', label: 'Overdue', icon: '🔴' },
  ].forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'filter-pill' + (activeStatus === s.key ? ' active' : '');
    btn.innerHTML = `${s.icon} ${s.label}`;
    btn.addEventListener('click', () => onChange(s.key, activeClient));
    pillGroup.appendChild(btn);
  });
  bar.appendChild(pillGroup);

  const clientSelect = document.createElement('select');
  clientSelect.className = 'form-input statement-client-filter';
  clientSelect.innerHTML = `<option value="all">All Clients</option>` +
    (state.clients || []).map(c =>
      `<option value="${c.id}" ${c.id === activeClient ? 'selected' : ''}>${c.name}</option>`
    ).join('');
  clientSelect.addEventListener('change', () => onChange(activeStatus, clientSelect.value));
  bar.appendChild(clientSelect);

  const reminderBtn = document.createElement('button');
  reminderBtn.className = 'btn btn-secondary btn-sm';
  reminderBtn.style.marginLeft = 'auto';
  reminderBtn.innerHTML = `🔔 View Reminders`;
  reminderBtn.addEventListener('click', () => navigateTo('reminders'));
  bar.appendChild(reminderBtn);

  return bar;
}

// ─── Statement Section (overdue / pending / paid) ─────────────
function buildStatementSection(state, title, rows, container, onUpdate, sectionType) {
  const section = document.createElement('div');
  section.style.marginBottom = '28px';

  const hdr = document.createElement('div');
  hdr.className = 'section-header';
  hdr.style.marginBottom = '10px';
  hdr.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span class="section-title">${title}</span>
      <span class="section-count">${rows.length}</span>
    </div>
    <span style="font-size:13px;font-weight:700;color:var(--text-secondary)">
      ${formatCurrency(state, rows.reduce((s, r) => s + r.amount, 0))}
    </span>
  `;
  section.appendChild(hdr);

  const tableCard = document.createElement('div');
  tableCard.className = 'table-card';
  const tableWrap = document.createElement('div');
  tableWrap.style.overflowX = 'auto';

  const table = document.createElement('table');
  table.className = 'data-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Client</th>
        <th>Period</th>
        <th>Type</th>
        <th>Amount</th>
        <th>Due Date</th>
        <th>Status</th>
        <th>Date Received</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  rows.forEach(row => {
    const tr = document.createElement('tr');

    const statusPill = row.status === 'paid'
      ? `<span class="pill paid"><span class="pill-dot"></span>Paid</span>`
      : row.status === 'overdue'
        ? `<span class="pill overdue"><span class="pill-dot"></span>Overdue</span>`
        : `<span class="pill pending"><span class="pill-dot"></span>Pending</span>`;

    const clientBadge = row.clientStatus !== 'Active'
      ? `<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:var(--bg-page);color:var(--text-muted);margin-left:4px">${row.clientStatus}</span>`
      : '';

    tr.innerHTML = `
      <td>
        <div style="font-weight:600;font-size:14px">${row.clientName}${clientBadge}</div>
        <div style="font-size:11.5px;color:var(--text-muted)">${row.paymentType === 'one-time' ? '🔁 One-Time' : '🔄 Retainer'}</div>
      </td>
      <td style="font-size:13px;font-weight:500">${row.monthLabel}</td>
      <td><span class="expense-category-chip expense-cat-${row.paymentType === 'one-time' ? 'model' : 'payroll'}">${row.paymentType === 'one-time' ? 'One-Time' : 'Monthly'}</span></td>
      <td style="font-weight:700;font-size:15px">${formatCurrency(state, row.amount)}</td>
      <td style="font-size:12.5px;color:var(--text-muted)">${formatDate(row.dueDate)}</td>
      <td>${statusPill}</td>
      <td style="font-size:13px;color:${row.paidDate ? 'var(--paid-text)' : 'var(--text-muted)'}">
        ${row.paidDate ? `<strong>${formatDate(row.paidDate)}</strong>` : '—'}
      </td>
      <td>
        ${row.status !== 'paid'
          ? `<button class="btn btn-success btn-sm mark-paid-stmt-btn">Mark Paid</button>`
          : `<button class="btn btn-secondary btn-sm mark-unpaid-stmt-btn" style="opacity:.7">Undo</button>`
        }
      </td>
    `;

    const markPaidBtn = tr.querySelector('.mark-paid-stmt-btn');
    if (markPaidBtn) {
      markPaidBtn.addEventListener('click', () => {
        const now = new Date();
        const ds = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        row.paymentObj.paid     = true;
        row.paymentObj.paidDate = ds;
        saveState(state);
        onUpdate();
      });
    }

    const markUnpaidBtn = tr.querySelector('.mark-unpaid-stmt-btn');
    if (markUnpaidBtn) {
      markUnpaidBtn.addEventListener('click', () => {
        if (!confirm('Mark this payment as unpaid?')) return;
        row.paymentObj.paid     = false;
        row.paymentObj.paidDate = null;
        saveState(state);
        onUpdate();
      });
    }

    tbody.appendChild(tr);
  });

  tableWrap.appendChild(table);
  tableCard.appendChild(tableWrap);
  section.appendChild(tableCard);
  container.appendChild(section);
}

// ─── Add Overhead Payment Modal ───────────────────────────────
function openAddOverheadModal(state, onSave) {
  const today = new Date().toISOString().split('T')[0];

  const allClients = state.clients || [];
  const activeOpts = allClients
    .filter(c => (c.clientStatus || 'Active') === 'Active')
    .map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const prevOpts = allClients
    .filter(c => c.clientStatus === 'Paused' || c.clientStatus === 'Gone')
    .map(c => `<option value="${c.id}">${c.name} (${c.clientStatus})</option>`).join('');
  const clientOptions = `
    <option value="">— No specific client —</option>
    ${activeOpts ? `<optgroup label="Active">${activeOpts}</optgroup>` : ''}
    ${prevOpts   ? `<optgroup label="Previous / Paused">${prevOpts}</optgroup>` : ''}
  `;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:460px">
      <div class="modal-header">
        <div>
          <div class="modal-title">Add Overhead Payment</div>
          <div class="modal-subtitle">Log any non-routine payment from a client</div>
        </div>
        <button class="modal-close" id="oh-close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">

        <div class="form-group">
          <label class="form-label" for="oh-client">Client</label>
          <select class="form-input" id="oh-client">
            ${clientOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="oh-reason">Payment Name / Reason *</label>
          <input class="form-input" type="text" id="oh-reason"
            placeholder="e.g. Website redesign bonus, Q1 extra services" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="oh-amount">Amount (${state.currency}) *</label>
            <input class="form-input" type="number" id="oh-amount" placeholder="e.g. 100000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="oh-date" id="oh-date-label">Date *</label>
            <input class="form-input" type="date" id="oh-date" value="${today}" />
          </div>
        </div>

        <div class="form-section-title">💳 Payment Status</div>
        <div class="status-selector" id="oh-status-selector" style="margin-bottom:16px">
          <button type="button" class="status-option-btn selected-active" data-status="paid">
            ✅ Paid / Received<br/>
            <span style="font-size:10px;font-weight:400;opacity:.8">Money already received</span>
          </button>
          <button type="button" class="status-option-btn" data-status="unpaid">
            ⏳ Unpaid / Pending<br/>
            <span style="font-size:10px;font-weight:400;opacity:.8">Still to be collected</span>
          </button>
        </div>

        <div class="form-group">
          <label class="form-label" for="oh-notes">Notes (optional)</label>
          <input class="form-input" type="text" id="oh-notes"
            placeholder="Any additional details..." />
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="oh-cancel">Cancel</button>
        <button class="btn btn-primary" id="oh-save">Add Payment</button>
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
  overlay.querySelector('#oh-close').addEventListener('click', close);
  overlay.querySelector('#oh-cancel').addEventListener('click', close);

  let selectedStatus = 'paid';
  const dateLabel = overlay.querySelector('#oh-date-label');

  overlay.querySelectorAll('#oh-status-selector .status-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('#oh-status-selector .status-option-btn').forEach(b => {
        b.className = 'status-option-btn';
      });
      selectedStatus = btn.dataset.status;
      btn.classList.add('selected-active');
      if (dateLabel) {
        dateLabel.textContent = selectedStatus === 'paid' ? 'Date Received *' : 'Expected Date *';
      }
    });
  });

  overlay.querySelector('#oh-save').addEventListener('click', () => {
    const clientId = overlay.querySelector('#oh-client').value;
    const amount   = parseFloat(overlay.querySelector('#oh-amount').value);
    const date     = overlay.querySelector('#oh-date').value;
    const reason   = overlay.querySelector('#oh-reason').value.trim();
    const notes    = overlay.querySelector('#oh-notes').value.trim();

    if (isNaN(amount) || amount <= 0) { alert('Please enter a valid amount.'); return; }
    if (!date)   { alert('Please select a date.'); return; }
    if (!reason) { alert('Please enter a payment name / reason.'); return; }

    if (!state.overheadPayments) state.overheadPayments = [];
    state.overheadPayments.push({
      id:       generateId(),
      clientId: clientId || null,
      amount,
      date,
      reason,
      notes:    notes || null,
      paid:     selectedStatus === 'paid',
      paidDate: selectedStatus === 'paid' ? date : null,
    });

    saveState(state);
    close();
    onSave();
  });
}

// ─── Overhead Charges Section ─────────────────────────────────
function buildOverheadSection(state, range, container, onUpdate) {
  const all = (state.overheadPayments || [])
    .filter(p => range ? dateInRange(p.date, range) : true)
    .sort((a, b) => b.date.localeCompare(a.date));

  const unpaid = all.filter(p => !p.paid);
  const paid   = all.filter(p =>  p.paid);

  const totalPending  = unpaid.reduce((s, p) => s + p.amount, 0);
  const totalReceived = paid.reduce((s, p) => s + p.amount, 0);

  const wrap = document.createElement('div');
  wrap.style.marginTop = '32px';

  const divider = document.createElement('hr');
  divider.style.cssText = 'border:none;border-top:1px solid var(--border-light);margin-bottom:24px';
  wrap.appendChild(divider);

  // Section header
  const hdr = document.createElement('div');
  hdr.className = 'section-header';
  hdr.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span class="section-title">⚡ Overhead Charges</span>
      <span class="section-count">${all.length}</span>
      <span style="font-size:11px;color:var(--text-muted)">(Non-routine payments)</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      ${unpaid.length ? `<span style="font-size:12px;color:var(--overdue-text);font-weight:600">⏳ ${formatCurrency(state, totalPending)} pending</span>` : ''}
      ${paid.length   ? `<span style="font-size:12px;color:var(--paid-text);font-weight:600">✅ ${formatCurrency(state, totalReceived)} received</span>` : ''}
      <button class="btn btn-primary btn-sm" id="oh-add-inline">+ Add Payment</button>
    </div>
  `;
  wrap.appendChild(hdr);
  hdr.querySelector('#oh-add-inline').addEventListener('click', () =>
    openAddOverheadModal(state, onUpdate));

  if (!all.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.padding = '24px';
    empty.innerHTML = `
      <div class="empty-state-icon" style="font-size:28px">⚡</div>
      <p style="margin-top:8px">No overhead payments in this period.<br/>
      Click <strong>+ Add Payment</strong> to log any extra payment received or pending.</p>
    `;
    wrap.appendChild(empty);
    container.appendChild(wrap);
    return;
  }

  // ── Unpaid block (needs action — shown first)
  if (unpaid.length) {
    const unpaidLabel = document.createElement('div');
    unpaidLabel.style.cssText = 'font-size:12px;font-weight:700;color:var(--overdue-text);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 8px';
    unpaidLabel.textContent = `⏳ Unpaid / Pending — ${formatCurrency(state, totalPending)}`;
    wrap.appendChild(unpaidLabel);

    const unpaidCard = document.createElement('div');
    unpaidCard.className = 'table-card';
    unpaidCard.style.marginBottom = '20px';

    unpaid.forEach(p => {
      const client = (state.clients || []).find(c => c.id === p.clientId);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid var(--border-light);flex-wrap:wrap';
      row.innerHTML = `
        <span class="pill overdue"><span class="pill-dot"></span>Unpaid</span>
        <div style="flex:1;min-width:120px">
          <div style="font-weight:700;font-size:13.5px;color:var(--accent)">${p.reason}</div>
          <div style="font-size:12px;color:var(--text-muted)">${client ? client.name : 'No client'} · Due ${formatDate(p.date)}</div>
          ${p.notes ? `<div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${p.notes}</div>` : ''}
        </div>
        <span style="font-weight:800;font-size:16px;color:var(--overdue-text)">${formatCurrency(state, p.amount)}</span>
        <button class="btn btn-success btn-sm mark-oh-paid-btn">✅ Mark Paid</button>
        <button class="row-delete-btn del-oh-btn" title="Delete">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      `;

      row.querySelector('.mark-oh-paid-btn').addEventListener('click', () => {
        const now = new Date();
        const ds = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const entry = (state.overheadPayments || []).find(x => x.id === p.id);
        if (entry) { entry.paid = true; entry.paidDate = ds; }
        saveState(state);
        onUpdate();
      });

      row.querySelector('.del-oh-btn').addEventListener('click', () => {
        if (!confirm('Delete this overhead payment?')) return;
        state.overheadPayments = (state.overheadPayments || []).filter(x => x.id !== p.id);
        saveState(state);
        onUpdate();
      });

      unpaidCard.appendChild(row);
    });
    wrap.appendChild(unpaidCard);
  }

  // ── Paid / Received block
  if (paid.length) {
    const paidLabel = document.createElement('div');
    paidLabel.style.cssText = 'font-size:12px;font-weight:700;color:var(--paid-text);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 8px';
    paidLabel.textContent = `✅ Received — ${formatCurrency(state, totalReceived)}`;
    wrap.appendChild(paidLabel);

    const paidCard = document.createElement('div');
    paidCard.className = 'table-card';
    const tableWrap = document.createElement('div');
    tableWrap.style.overflowX = 'auto';

    const table = document.createElement('table');
    table.className = 'data-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Client</th>
          <th>Payment Name / Reason</th>
          <th>Notes</th>
          <th>Date Received</th>
          <th style="text-align:right">Amount</th>
          <th></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    paid.forEach(p => {
      const client = (state.clients || []).find(c => c.id === p.clientId);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span style="font-weight:600;font-size:13.5px">${client ? client.name : '<span style="color:var(--text-muted)">—</span>'}</span></td>
        <td><span style="font-weight:600;font-size:13.5px;color:var(--accent)">${p.reason}</span></td>
        <td style="font-size:12.5px;color:var(--text-muted)">${p.notes || '—'}</td>
        <td><span style="font-size:12.5px;font-weight:600;color:var(--paid-text)">${formatDate(p.paidDate || p.date)}</span></td>
        <td style="text-align:right;font-weight:800;font-size:15px;color:var(--paid-text)">${formatCurrency(state, p.amount)}</td>
        <td style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-secondary btn-sm undo-oh-btn" style="font-size:11px;opacity:.7">Undo</button>
          <button class="row-delete-btn del-oh-btn" title="Delete">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </td>
      `;

      tr.querySelector('.undo-oh-btn').addEventListener('click', () => {
        if (!confirm('Mark this as unpaid?')) return;
        const entry = (state.overheadPayments || []).find(x => x.id === p.id);
        if (entry) { entry.paid = false; entry.paidDate = null; }
        saveState(state);
        onUpdate();
      });

      tr.querySelector('.del-oh-btn').addEventListener('click', () => {
        if (!confirm('Delete this overhead payment?')) return;
        state.overheadPayments = (state.overheadPayments || []).filter(x => x.id !== p.id);
        saveState(state);
        onUpdate();
      });

      tbody.appendChild(tr);
    });

    tableWrap.appendChild(table);
    paidCard.appendChild(tableWrap);
    wrap.appendChild(paidCard);
  }

  container.appendChild(wrap);
}
