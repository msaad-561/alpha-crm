// ============================================================
// founders.js — Founders Expenses Dashboard
// ============================================================

function renderFoundersPage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  // Metric cards
  container.appendChild(buildFounderMetrics(state));

  // Founder cards
  const secHeader = document.createElement('div');
  secHeader.className = 'section-header';
  secHeader.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span class="section-title">Founders</span>
      <span class="section-count">${state.founders.length}</span>
    </div>
    <button class="btn btn-secondary btn-sm" id="add-founder-btn">+ Add Founder</button>
  `;
  container.appendChild(secHeader);

  secHeader.querySelector('#add-founder-btn').addEventListener('click', () => openAddFounderModal(state));

  const grid = document.createElement('div');
  grid.className = 'founders-grid';
  state.founders.forEach(f => grid.appendChild(buildFounderCard(state, f)));
  container.appendChild(grid);

  // Money Flow table
  container.appendChild(buildMoneyFlow(state));
}

// ─── Founder Metric Cards ─────────────────────────────────────
function buildFounderMetrics(state) {
  const totalAllowance = state.founders.reduce((s, f) => s + f.monthlyAllowance, 0);
  const totalSpent     = getTotalFounderDraws(state);
  const remaining      = totalAllowance - totalSpent;
  const totalRetainers = getTotalRetainers(state);
  const totalPayroll   = getTotalPayroll(state);
  const companyNet     = totalRetainers - totalPayroll - totalSpent;

  const grid = document.createElement('div');
  grid.className = 'metrics-grid';

  const cards = [
    { label: 'Monthly Allowance', value: formatCurrency(state, totalAllowance), sub: `${state.founders.length} founders combined`, cls: 'neutral' },
    { label: 'Spent So Far',      value: formatCurrency(state, totalSpent),     sub: 'This month to date', cls: totalSpent > totalAllowance ? 'negative' : 'neutral' },
    { label: 'Remaining Budget',  value: formatCurrency(state, remaining),      sub: `${Math.max(0, Math.round((remaining/totalAllowance)*100))||0}% remaining`, cls: remaining < 0 ? 'negative' : remaining < totalAllowance * 0.2 ? 'neutral' : 'positive' },
    { label: 'Company Net',       value: formatCurrency(state, companyNet),     sub: 'Retainers − Payroll − Draws', cls: companyNet >= 0 ? 'positive' : 'negative' },
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

// ─── Individual Founder Card ──────────────────────────────────
function buildFounderCard(state, founder) {
  const spent     = getFounderSpentThisMonth(founder);
  const remaining = founder.monthlyAllowance - spent;
  const pct       = Math.min(100, Math.round((spent / founder.monthlyAllowance) * 100)) || 0;

  const budgetCls      = remaining < 0 ? 'danger' : pct >= 80 ? 'warning' : 'healthy';
  const progressCls    = remaining < 0 ? 'danger' : pct >= 80 ? 'high' : '';
  const remainingLabel = remaining < 0
    ? `${formatCurrency(state, Math.abs(remaining))} over budget`
    : `${formatCurrency(state, remaining)} remaining`;

  const c = getAvatarColor(founder.colorIdx);

  const card = document.createElement('div');
  card.className = 'founder-card';

  const recentExpenses = [...founder.expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const expenseRows = recentExpenses.map(exp => `
    <div class="expense-item" data-expense-id="${exp.id}" data-founder-id="${founder.id}">
      <div class="expense-desc">${exp.description}</div>
      <div class="expense-date">${formatDate(exp.date)}</div>
      <div class="expense-amount">${formatCurrency(state, exp.amount)}</div>
      <button class="expense-delete-btn" title="Delete expense"
        onclick="deleteExpense(event,'${founder.id}','${exp.id}')">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join('');

  card.innerHTML = `
    <div class="founder-card-header">
      <span class="avatar avatar-lg" style="background:${c.bg};color:${c.text}">${founder.initials}</span>
      <div class="founder-info">
        <div class="founder-name">${founder.name}</div>
        <div class="founder-allowance">Monthly allowance: ${formatCurrency(state, founder.monthlyAllowance)}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="deleteFounder('${founder.id}')">Remove</button>
    </div>

    <div class="founder-budget-section">
      <div class="founder-budget-row">
        <div>
          <div style="font-size:11.5px;color:var(--text-muted);font-weight:600;margin-bottom:2px">SPENT</div>
          <div class="founder-budget-spent">${formatCurrency(state, spent)}</div>
        </div>
        <span class="founder-budget-remaining ${budgetCls}">${remainingLabel}</span>
      </div>
      <div class="progress-track" style="height:7px;margin-top:2px">
        <div class="progress-fill ${progressCls}" style="width:${pct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11.5px;color:var(--text-muted)">
        <span>${pct}% used</span>
        <span>${formatCurrency(state, founder.monthlyAllowance)} limit</span>
      </div>
    </div>

    <div class="founder-expenses-header">
      <span>Recent Expenses</span>
      <span style="font-weight:700;color:var(--text-primary)">${founder.expenses.length} total</span>
    </div>
    <div class="founder-expenses-list">
      ${expenseRows || '<div style="padding:16px 22px;font-size:13px;color:var(--text-muted)">No expenses logged yet.</div>'}
    </div>

    <div class="founder-card-footer">
      <button class="btn btn-primary btn-sm" style="width:100%" onclick="toggleExpenseForm('${founder.id}')">+ Log Expense</button>
    </div>

    <div class="expense-form" id="expense-form-${founder.id}">
      <div class="form-row">
        <div>
          <label class="form-label">Description</label>
          <input class="form-input" type="text" id="exp-desc-${founder.id}" placeholder="e.g. Client dinner" />
        </div>
        <div>
          <label class="form-label">Amount (${state.currency})</label>
          <input class="form-input" type="number" id="exp-amount-${founder.id}" placeholder="0" min="0" />
        </div>
        <div>
          <label class="form-label">Date</label>
          <input class="form-input" type="date" id="exp-date-${founder.id}" value="${todayDateStr()}" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary btn-sm" onclick="toggleExpenseForm('${founder.id}')">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveExpense('${founder.id}')">Save Expense</button>
      </div>
    </div>
  `;

  return card;
}

function todayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

// ─── Money Flow Table ─────────────────────────────────────────
function buildMoneyFlow(state) {
  const totalRetainers = getTotalRetainers(state);
  const totalPayroll   = getTotalPayroll(state);
  const founderDraws   = getTotalFounderDraws(state);
  const netRemaining   = totalRetainers - totalPayroll - founderDraws;
  const rev            = totalRetainers || 1;

  const rows = [
    {
      label: 'Total Retainers',
      amount: totalRetainers,
      type: 'income',
      typeLabel: 'Income',
      pct: 100,
      pctColor: '#10B981',
      status: 'healthy',
      statusLabel: 'Healthy',
      statusCls: 'paid',
    },
    {
      label: 'Team Payroll',
      amount: totalPayroll,
      type: 'expense',
      typeLabel: 'Expense',
      pct: Math.round((totalPayroll/rev)*100),
      pctColor: '#6B7280',
      status: totalPayroll / totalRetainers > 0.6 ? 'high' : 'normal',
      statusLabel: totalPayroll / totalRetainers > 0.6 ? 'High' : 'Normal',
      statusCls: totalPayroll / totalRetainers > 0.6 ? 'overdue' : 'pending',
    },
    {
      label: 'Founder Draws',
      amount: founderDraws,
      type: 'expense',
      typeLabel: 'Expense',
      pct: Math.round((founderDraws/rev)*100),
      pctColor: '#F59E0B',
      status: 'draw',
      statusLabel: 'Draws',
      statusCls: 'pending',
    },
    {
      label: 'Net Remaining',
      amount: netRemaining,
      type: 'profit',
      typeLabel: 'Profit',
      pct: Math.round((netRemaining/rev)*100),
      pctColor: netRemaining >= 0 ? '#2563EB' : '#EF4444',
      status: netRemaining >= 0 ? 'profit' : 'loss',
      statusLabel: netRemaining >= 0 ? 'Profit' : 'Loss',
      statusCls: netRemaining >= 0 ? 'paid' : 'overdue',
    },
  ];

  const wrap = document.createElement('div');
  wrap.className = 'moneyflow-card';
  wrap.innerHTML = `
    <div class="panel-header" style="padding:16px 20px">Money Flow Summary</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Amount</th>
          <th>Type</th>
          <th>% of Revenue</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td style="font-weight:600">${r.label}</td>
            <td style="font-weight:700;font-size:15px;letter-spacing:-.4px">${formatCurrency(state, Math.abs(r.amount))}</td>
            <td><span class="pill ${r.type}">${r.typeLabel}</span></td>
            <td>
              <div class="pct-bar-wrap">
                <div class="pct-bar-track">
                  <div class="pct-bar-fill" style="width:${Math.max(0,r.pct)}%;background:${r.pctColor}"></div>
                </div>
                <span class="pct-label">${Math.max(0,r.pct)}%</span>
              </div>
            </td>
            <td><span class="pill ${r.statusCls}">${r.statusLabel}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  return wrap;
}

// ─── Expense form toggle ──────────────────────────────────────
function toggleExpenseForm(founderId) {
  const form = document.getElementById(`expense-form-${founderId}`);
  if (form) form.classList.toggle('open');
}

function saveExpense(founderId) {
  const desc   = document.getElementById(`exp-desc-${founderId}`)?.value.trim();
  const amount = parseFloat(document.getElementById(`exp-amount-${founderId}`)?.value);
  const date   = document.getElementById(`exp-date-${founderId}`)?.value;

  if (!desc || isNaN(amount) || amount <= 0 || !date) {
    alert('Please fill in all fields correctly.');
    return;
  }

  const state   = window.__agencyState;
  const founder = state.founders.find(f => f.id === founderId);
  if (!founder) return;

  founder.expenses.push({ id: generateId(), description: desc, amount, date });
  saveState(state);
  renderPage(state);
}

function deleteExpense(event, founderId, expenseId) {
  event.stopPropagation();
  const state   = window.__agencyState;
  const founder = state.founders.find(f => f.id === founderId);
  if (!founder) return;
  founder.expenses = founder.expenses.filter(e => e.id !== expenseId);
  saveState(state);
  renderPage(state);
}

function deleteFounder(founderId) {
  const state = window.__agencyState;
  if (!confirm('Remove this founder? Their expense data will also be deleted.')) return;
  state.founders = state.founders.filter(f => f.id !== founderId);
  saveState(state);
  renderPage(state);
}

// ─── Add Founder Modal ────────────────────────────────────────
function openAddFounderModal(state) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <div>
          <div class="modal-title">Add Founder</div>
          <div class="modal-subtitle">Set up a new founder profile</div>
        </div>
        <button class="modal-close" id="founder-modal-close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="f-name">Full Name</label>
          <input class="form-input" type="text" id="f-name" placeholder="e.g. Zain Malik" />
        </div>
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="f-initials">Initials</label>
            <input class="form-input" type="text" id="f-initials" placeholder="ZM" maxlength="2" />
          </div>
          <div class="form-group">
            <label class="form-label" for="f-allowance">Monthly Allowance (${state.currency})</label>
            <input class="form-input" type="number" id="f-allowance" placeholder="e.g. 3000" min="0" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="founder-cancel">Cancel</button>
        <button class="btn btn-primary" id="founder-save">Add Founder</button>
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
  overlay.querySelector('#founder-modal-close').addEventListener('click', close);
  overlay.querySelector('#founder-cancel').addEventListener('click', close);

  overlay.querySelector('#founder-save').addEventListener('click', () => {
    const name      = overlay.querySelector('#f-name').value.trim();
    const initials  = overlay.querySelector('#f-initials').value.trim().toUpperCase();
    const allowance = parseFloat(overlay.querySelector('#f-allowance').value);

    if (!name || !initials || isNaN(allowance) || allowance < 0) {
      alert('Please fill in all fields correctly.');
      return;
    }

    state.founders.push({
      id: generateId(),
      name,
      initials: initials.slice(0, 2),
      colorIdx: Math.floor(Math.random() * 8),
      monthlyAllowance: allowance,
      expenses: [],
    });

    saveState(state);
    close();
    renderPage(state);
  });
}
