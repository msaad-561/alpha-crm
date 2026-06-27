// ============================================================
// expenses.js — Overall Expenses Page
// ============================================================

function renderExpensesPage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  let ePeriod = 'this_month';
  let eCustStart = '', eCustEnd = '';

  function rebuild() {
    container.innerHTML = '';
    container.className = 'fade-in';

    const range = getFilterRange(ePeriod, eCustStart, eCustEnd);

    // ── Date filter bar
    container.appendChild(buildDateFilterBar(ePeriod, eCustStart, eCustEnd, (p, cs, ce) => {
      ePeriod = p; eCustStart = cs; eCustEnd = ce; rebuild();
    }));

    // ── Compute totals
    const payroll   = getTotalPayroll(state); // monthly, per active client
    const draws     = getFounderDrawsForRange(state, range);
    const models    = getTotalModelCostsForRange(state, range);
    const agencyExp = getTotalAgencyExpensesForRange(state, range);
    const gross     = getGrossSalesForRange(state, range);
    const total     = payroll + draws + models + agencyExp;
    const profit    = gross - total;

    // ── Summary metric cards
    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'expense-metrics-grid';

    const metricCards = [
      { label: 'Total Expenses',  value: formatCurrency(state, total),   cls: 'negative', icon: '📊' },
      { label: 'Payroll',         value: formatCurrency(state, payroll),  cls: 'neutral',  icon: '👥' },
      { label: 'Founder Draws',   value: formatCurrency(state, draws),    cls: 'neutral',  icon: '👤' },
      { label: 'Model / Influencer', value: formatCurrency(state, models), cls: 'neutral', icon: '🎭' },
      { label: 'Agency Expenses', value: formatCurrency(state, agencyExp),cls: 'neutral',  icon: '🏢' },
    ];

    metricCards.forEach(mc => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="metric-label">${mc.label}</div>
          <span style="font-size:16px">${mc.icon}</span>
        </div>
        <div class="metric-value ${mc.cls}">${mc.value}</div>
      `;
      metricsGrid.appendChild(card);
    });
    container.appendChild(metricsGrid);

    // ── Profit summary banner
    const banner = document.createElement('div');
    banner.style.cssText = `
      background:${profit >= 0 ? 'var(--paid-bg)' : 'var(--overdue-bg)'};
      border:1px solid ${profit >= 0 ? 'var(--paid-text)' : 'var(--overdue-text)'};
      border-radius:var(--radius-md);padding:14px 18px;margin-bottom:24px;
      display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap
    `;
    banner.innerHTML = `
      <div>
        <div style="font-size:11px;font-weight:600;color:${profit >= 0 ? 'var(--paid-text)' : 'var(--overdue-text)'};text-transform:uppercase;letter-spacing:.5px">Net Profit (Period)</div>
        <div style="font-size:22px;font-weight:800;color:${profit >= 0 ? 'var(--paid-text)' : 'var(--overdue-text)'};letter-spacing:-.5px;margin-top:2px">${formatCurrency(state, profit)}</div>
      </div>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600">Gross Sales</div>
          <div style="font-size:15px;font-weight:700;color:var(--text-primary)">${formatCurrency(state, gross)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text-muted);font-weight:600">Total Expenses</div>
          <div style="font-size:15px;font-weight:700;color:var(--danger)">${formatCurrency(state, total)}</div>
        </div>
      </div>
    `;
    container.appendChild(banner);

    // ── Expense breakdown table
    buildExpenseBreakdownTable(state, range, container);

    // ── Agency Expenses log
    buildAgencyExpenseLog(state, range, container, rebuild);
  }

  rebuild();
}

// ─── Breakdown Table ───────────────────────────────────────────
function buildExpenseBreakdownTable(state, range, container) {
  const tableCard = document.createElement('div');
  tableCard.className = 'expense-table-card';

  // Collect all expense rows
  const rows = [];

  // Payroll rows (team shares per active client)
  const activeClients = getActiveClients(state);
  activeClients.forEach(client => {
    client.members.forEach(m => {
      const tm = getTeamMember(state, m.memberId);
      if (tm && m.share > 0) {
        rows.push({
          category: 'Payroll',
          description: `${tm.name} — ${client.name}`,
          amount: m.share,
          date: null,
          catCls: 'payroll',
        });
      }
    });
  });

  // Founder draws
  state.founders && state.founders.forEach(f => {
    f.expenses && f.expenses
      .filter(e => dateInRange(e.date, range))
      .forEach(e => {
        rows.push({
          category: 'Founder Draw',
          description: `${f.name} — ${e.description || 'Draw'}`,
          amount: e.amount,
          date: e.date,
          catCls: 'founder',
        });
      });
  });

  // Model payments
  (state.models || []).forEach(model => {
    (model.payments || [])
      .filter(p => dateInRange(p.date, range))
      .forEach(p => {
        const client = (state.clients || []).find(c => c.id === p.clientId);
        rows.push({
          category: 'Model',
          description: `${model.name}${client ? ' — ' + client.name : ''} — ${p.description || 'Payment'}`,
          amount: p.amount,
          date: p.date,
          catCls: 'model',
        });
      });
  });

  // Agency expenses
  (state.agencyExpenses || [])
    .filter(e => dateInRange(e.date, range))
    .forEach(e => {
      rows.push({
        category: e.category || 'Agency',
        description: e.description,
        amount: e.amount,
        date: e.date,
        catCls: 'agency',
      });
    });

  // Sort by date desc (nulls last)
  rows.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  const header = document.createElement('div');
  header.className = 'panel-header';
  header.innerHTML = `<span>Expense Breakdown</span><span class="section-count">${rows.length} entries</span>`;
  tableCard.appendChild(header);

  if (!rows.length) {
    tableCard.innerHTML += '<div class="empty-state" style="padding:24px"><div class="empty-state-icon">📊</div><p>No expenses in this period.</p></div>';
    container.appendChild(tableCard);
    return;
  }

  const tableWrap = document.createElement('div');
  tableWrap.style.overflowX = 'auto';
  tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Category</th>
          <th>Description</th>
          <th>Date</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td><span class="expense-category-chip expense-cat-${r.catCls}">${r.category}</span></td>
            <td style="font-size:13px">${r.description}</td>
            <td style="font-size:12px;color:var(--text-muted)">${r.date ? formatDate(r.date) : '(monthly)'}</td>
            <td style="text-align:right;font-weight:700;font-size:14px">${formatCurrency(state, r.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  tableCard.appendChild(tableWrap);
  container.appendChild(tableCard);
}

// ─── Agency Expense Log ────────────────────────────────────────
function buildAgencyExpenseLog(state, range, container, onUpdate) {
  const wrap = document.createElement('div');

  const secHeader = document.createElement('div');
  secHeader.className = 'section-header';
  secHeader.style.marginTop = '8px';
  secHeader.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span class="section-title">Agency Expenses</span>
      <span class="section-count">${(state.agencyExpenses || []).filter(e => dateInRange(e.date, range)).length} in period</span>
    </div>
    <button class="btn btn-primary btn-sm" id="add-agency-exp-btn">+ Add Expense</button>
  `;
  wrap.appendChild(secHeader);

  secHeader.querySelector('#add-agency-exp-btn').addEventListener('click', () =>
    openAddAgencyExpenseModal(state, onUpdate));

  const filtered = (state.agencyExpenses || [])
    .filter(e => dateInRange(e.date, range))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!filtered.length) {
    wrap.innerHTML += '<div class="empty-state" style="padding:20px"><p>No agency expenses in this period. Add tools, ads, or misc costs.</p></div>';
    container.appendChild(wrap);
    return;
  }

  const listCard = document.createElement('div');
  listCard.className = 'table-card';
  listCard.style.marginBottom = '24px';

  filtered.forEach(e => {
    const row = document.createElement('div');
    row.className = 'expense-item';
    row.innerHTML = `
      <span class="expense-category-chip expense-cat-agency">${e.category || 'Agency'}</span>
      <span class="expense-desc">${e.description}</span>
      <span class="expense-date">${formatDate(e.date)}</span>
      <span class="expense-amount">${formatCurrency(state, e.amount)}</span>
      <button class="expense-delete-btn row-delete-btn" data-exp-id="${e.id}" title="Delete">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    `;
    row.querySelector('.row-delete-btn').addEventListener('click', () => {
      if (confirm('Delete this expense?')) {
        state.agencyExpenses = (state.agencyExpenses || []).filter(ex => ex.id !== e.id);
        saveState(state);
        onUpdate();
      }
    });
    listCard.appendChild(row);
  });

  wrap.appendChild(listCard);
  container.appendChild(wrap);
}

// ─── Add Agency Expense Modal ──────────────────────────────────
function openAddAgencyExpenseModal(state, onSave) {
  const today = new Date().toISOString().split('T')[0];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <div><div class="modal-title">Add Agency Expense</div></div>
        <button class="modal-close" id="ae-close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="ae-desc">Description</label>
          <input class="form-input" type="text" id="ae-desc" placeholder="e.g. Adobe subscription, Facebook Ads" />
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="ae-amount">Amount (${state.currency})</label>
            <input class="form-input" type="number" id="ae-amount" placeholder="e.g. 5000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ae-date">Date</label>
            <input class="form-input" type="date" id="ae-date" value="${today}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="ae-category">Category</label>
          <select class="form-input" id="ae-category">
            <option value="Software">Software / Tools</option>
            <option value="Ads">Advertising / Ads</option>
            <option value="Equipment">Equipment</option>
            <option value="Office">Office / Misc</option>
            <option value="Agency">Agency (Other)</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="ae-cancel">Cancel</button>
        <button class="btn btn-primary" id="ae-save">Add Expense</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#ae-close').addEventListener('click', close);
  overlay.querySelector('#ae-cancel').addEventListener('click', close);

  overlay.querySelector('#ae-save').addEventListener('click', () => {
    const desc     = overlay.querySelector('#ae-desc').value.trim();
    const amount   = parseFloat(overlay.querySelector('#ae-amount').value);
    const date     = overlay.querySelector('#ae-date').value;
    const category = overlay.querySelector('#ae-category').value;

    if (!desc || isNaN(amount) || amount <= 0 || !date) {
      alert('Please fill in all fields with a valid amount.');
      return;
    }

    if (!state.agencyExpenses) state.agencyExpenses = [];
    state.agencyExpenses.push({ id: generateId(), description: desc, amount, date, category });
    saveState(state);
    close();
    onSave();
  });
}
