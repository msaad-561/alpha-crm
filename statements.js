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
