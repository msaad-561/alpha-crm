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

    // ── Build all statement rows
    const rows = buildStatementRows(state);

    // ── Filter by period
    const monthKey = getCurrentMonthKey();
    const periodRows = rows.filter(r => {
      if (sPeriod === 'max') return true;
      // For paid: filter by paidDate; for unpaid: filter by month
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
    const paidRows    = filtered.filter(r => r.status === 'paid');
    const pendingRows = filtered.filter(r => r.status === 'pending');
    const overdueRows = filtered.filter(r => r.status === 'overdue');

    // ── Overdue section (most urgent)
    if (overdueRows.length) {
      buildStatementSection(state, '🔴 Overdue Payments', overdueRows, container, rebuild, 'overdue');
    }

    // ── Pending section
    if (pendingRows.length) {
      buildStatementSection(state, '⏳ Pending Payments', pendingRows, container, rebuild, 'pending');
    }

    // ── Paid section
    if (paidRows.length) {
      buildStatementSection(state, '✅ Received Payments', paidRows, container, rebuild, 'paid');
    }

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

// ─── Build all statement rows from client payments ─────────────
function buildStatementRows(state) {
  const rows = [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthKey = getCurrentMonthKey();

  (state.clients || []).forEach(client => {
    (client.payments || []).forEach(p => {
      const [yr, mo] = p.month.split('-').map(Number);
      const dueDay = client.startDay || 1;
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
        clientObj: client,
      });
    });
  });

  // Sort: overdue first, then pending, then paid (most recent first)
  const order = { overdue: 0, pending: 1, paid: 2 };
  rows.sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    const da = a.paidDate || a.dueDate;
    const db = b.paidDate || b.dueDate;
    return db.localeCompare(da);
  });

  return rows;
}

// ─── Summary metric cards ─────────────────────────────────────
function buildStatementMetrics(state, rows) {
  const totalReceived = rows.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const totalPending  = rows.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
  const totalOverdue  = rows.filter(r => r.status === 'overdue').reduce((s, r) => s + r.amount, 0);
  const totalExpected = rows.reduce((s, r) => s + r.amount, 0);
  const paidCount     = rows.filter(r => r.status === 'paid').length;
  const pendingCount  = rows.filter(r => r.status === 'pending').length;
  const overdueCount  = rows.filter(r => r.status === 'overdue').length;

  const grid = document.createElement('div');
  grid.className = 'metrics-grid';
  grid.style.marginBottom = '20px';

  const cards = [
    {
      label: 'Total Received',
      value: formatCurrency(state, totalReceived),
      sub: `${paidCount} payment${paidCount !== 1 ? 's' : ''} confirmed`,
      cls: 'positive',
      icon: '✅',
      highlight: true,
    },
    {
      label: 'Pending',
      value: formatCurrency(state, totalPending),
      sub: `${pendingCount} awaiting payment`,
      cls: 'neutral',
      icon: '⏳',
    },
    {
      label: 'Overdue',
      value: formatCurrency(state, totalOverdue),
      sub: `${overdueCount} past due date`,
      cls: overdueCount > 0 ? 'negative' : 'neutral',
      icon: overdueCount > 0 ? '🔴' : '🟢',
    },
    {
      label: 'Total Expected',
      value: formatCurrency(state, totalExpected),
      sub: `${rows.length} total entries`,
      cls: 'neutral',
      icon: '💼',
    },
  ];

  cards.forEach(c => {
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

  // Status pills
  const statuses = [
    { key: 'all',     label: 'All',     icon: '📋' },
    { key: 'paid',    label: 'Paid',    icon: '✅' },
    { key: 'pending', label: 'Pending', icon: '⏳' },
    { key: 'overdue', label: 'Overdue', icon: '🔴' },
  ];

  const pillGroup = document.createElement('div');
  pillGroup.className = 'statement-pill-group';
  statuses.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'filter-pill' + (activeStatus === s.key ? ' active' : '');
    btn.innerHTML = `${s.icon} ${s.label}`;
    btn.addEventListener('click', () => onChange(s.key, activeClient));
    pillGroup.appendChild(btn);
  });
  bar.appendChild(pillGroup);

  // Client dropdown
  const clientSelect = document.createElement('select');
  clientSelect.className = 'form-input statement-client-filter';
  clientSelect.innerHTML = `<option value="all">All Clients</option>` +
    (state.clients || []).map(c => `<option value="${c.id}" ${c.id === activeClient ? 'selected' : ''}>${c.name}</option>`).join('');
  clientSelect.addEventListener('change', () => onChange(activeStatus, clientSelect.value));
  bar.appendChild(clientSelect);

  // Link to Reminders
  const reminderBtn = document.createElement('button');
  reminderBtn.className = 'btn btn-secondary btn-sm';
  reminderBtn.style.marginLeft = 'auto';
  reminderBtn.innerHTML = `🔔 View Reminders`;
  reminderBtn.addEventListener('click', () => navigateTo('reminders'));
  bar.appendChild(reminderBtn);

  return bar;
}

// ─── Statement Section (paid / pending / overdue) ─────────────
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

    const statusPillHtml = row.status === 'paid'
      ? `<span class="pill paid"><span class="pill-dot"></span>Paid</span>`
      : row.status === 'overdue'
        ? `<span class="pill overdue"><span class="pill-dot"></span>Overdue</span>`
        : `<span class="pill pending"><span class="pill-dot"></span>Pending</span>`;

    const clientStatusBadge = row.clientStatus !== 'Active'
      ? `<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:var(--bg-page);color:var(--text-muted);margin-left:4px">${row.clientStatus}</span>`
      : '';

    tr.innerHTML = `
      <td>
        <div style="font-weight:600;font-size:14px">${row.clientName}${clientStatusBadge}</div>
        <div style="font-size:11.5px;color:var(--text-muted)">${row.paymentType === 'one-time' ? '🔁 One-Time' : '🔄 Retainer'}</div>
      </td>
      <td style="font-size:13px;font-weight:500">${row.monthLabel}</td>
      <td><span class="expense-category-chip expense-cat-${row.paymentType === 'one-time' ? 'model' : 'payroll'}">${row.paymentType === 'one-time' ? 'One-Time' : 'Monthly'}</span></td>
      <td style="font-weight:700;font-size:15px">${formatCurrency(state, row.amount)}</td>
      <td style="font-size:12.5px;color:var(--text-muted)">${formatDate(row.dueDate)}</td>
      <td>${statusPillHtml}</td>
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

    // Mark as paid
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

    // Undo paid
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

  // Build client options — all clients grouped
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
          <div class="modal-subtitle">Log any non-routine payment received from a client</div>
        </div>
        <button class="modal-close" id="oh-close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">

        <div class="form-group">
          <label class="form-label" for="oh-client">Client *</label>
          <select class="form-input" id="oh-client">
            ${clientOptions}
          </select>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="oh-amount">Amount Received (${state.currency}) *</label>
            <input class="form-input" type="number" id="oh-amount" placeholder="e.g. 100000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="oh-date">Date Received *</label>
            <input class="form-input" type="date" id="oh-date" value="${today}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="oh-reason">Payment Name / Reason *</label>
          <input class="form-input" type="text" id="oh-reason"
            placeholder="e.g. Website redesign bonus, Q1 extra services" />
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

  overlay.querySelector('#oh-save').addEventListener('click', () => {
    const clientId = overlay.querySelector('#oh-client').value;
    const amount   = parseFloat(overlay.querySelector('#oh-amount').value);
    const date     = overlay.querySelector('#oh-date').value;
    const reason   = overlay.querySelector('#oh-reason').value.trim();
    const notes    = overlay.querySelector('#oh-notes').value.trim();

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!date) {
      alert('Please select a date.');
      return;
    }
    if (!reason) {
      alert('Please enter a payment name / reason.');
      return;
    }

    if (!state.overheadPayments) state.overheadPayments = [];
    state.overheadPayments.push({
      id: generateId(),
      clientId: clientId || null,
      amount,
      date,
      reason,
      notes: notes || null,
    });

    saveState(state);
    close();
    onSave();
  });
}

// ─── Overhead Charges Section ─────────────────────────────────
function buildOverheadSection(state, range, container, onUpdate) {
  const all = (state.overheadPayments || [])
    .filter(p => dateInRange(p.date, range))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Always render the section header + Add button
  const wrap = document.createElement('div');
  wrap.style.marginTop = '32px';

  const divider = document.createElement('hr');
  divider.style.cssText = 'border:none;border-top:1px solid var(--border-light);margin-bottom:24px';
  wrap.appendChild(divider);

  const hdr = document.createElement('div');
  hdr.className = 'section-header';
  hdr.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <span class="section-title">⚡ Overhead Charges</span>
      <span class="section-count">${all.length}</span>
      <span style="font-size:12px;color:var(--text-muted)">(Non-routine received payments)</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:14px;font-weight:700;color:var(--paid-text)">
        ${formatCurrency(state, all.reduce((s, p) => s + p.amount, 0))}
      </span>
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
      Click <strong>+ Add Payment</strong> to log any bonus or non-retainer payment received.</p>
    `;
    wrap.appendChild(empty);
    container.appendChild(wrap);
    return;
  }

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

  all.forEach(p => {
    const client = (state.clients || []).find(c => c.id === p.clientId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span style="font-weight:600;font-size:13.5px">${client ? client.name : '<span style="color:var(--text-muted)">—</span>'}</span>
      </td>
      <td>
        <span style="font-weight:600;font-size:13.5px;color:var(--accent)">${p.reason}</span>
      </td>
      <td style="font-size:12.5px;color:var(--text-muted)">${p.notes || '—'}</td>
      <td>
        <span style="font-size:12.5px;font-weight:600;color:var(--paid-text)">${formatDate(p.date)}</span>
      </td>
      <td style="text-align:right;font-weight:800;font-size:15px;color:var(--paid-text)">
        ${formatCurrency(state, p.amount)}
      </td>
      <td>
        <button class="row-delete-btn del-oh-btn" data-id="${p.id}" title="Delete">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </td>
    `;

    tr.querySelector('.del-oh-btn').addEventListener('click', () => {
      if (!confirm('Delete this overhead payment?')) return;
      state.overheadPayments = (state.overheadPayments || []).filter(x => x.id !== p.id);
      saveState(state);
      onUpdate();
    });

    tbody.appendChild(tr);
  });

  tableWrap.appendChild(table);
  tableCard.appendChild(tableWrap);
  wrap.appendChild(tableCard);
  container.appendChild(wrap);
}

