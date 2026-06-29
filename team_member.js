// ============================================================
// team_member.js — Team Member Detail Page
// Shows clients the member is assigned to, per-client payments,
// payment status tracking, and time-period breakdowns
// ============================================================

function renderTeamMemberDetail(state, memberId, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  const tm = (state.team || []).find(t => t.id === memberId);
  if (!tm) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Member not found</div>
      <button class="btn btn-secondary" onclick="navigateTo('team')">← Back to Team</button></div>`;
    return;
  }

  // ── Ensure memberPayments array exists on state
  if (!state.memberPayments) state.memberPayments = [];

  // ── Period filter state
  let period = 'this_month';
  let custStart = '', custEnd = '';

  function rebuild() {
    container.innerHTML = '';
    container.className = 'fade-in';

    const range = getFilterRange(period, custStart, custEnd);
    const color = getAvatarColor(tm.colorIdx);

    // ── Back + Header
    const hdr = document.createElement('div');
    hdr.innerHTML = `
      <button class="btn btn-secondary btn-sm" id="back-team-btn" style="margin-bottom:16px">← Back to Team</button>
      <div class="member-detail-hero">
        <span class="avatar avatar-lg" style="background:${color.bg};color:${color.text};width:56px;height:56px;font-size:20px;flex-shrink:0">${tm.initials}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:22px;font-weight:800;color:var(--text-primary)">${tm.name}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px">
            ${tm.phone ? `📱 ${tm.phone} · ` : ''}Team Member
          </div>
        </div>
      </div>
    `;
    container.appendChild(hdr);
    hdr.querySelector('#back-team-btn').addEventListener('click', () => navigateTo('team'));

    // ── Date filter
    container.appendChild(buildDateFilterBar(period, custStart, custEnd, (p, cs, ce) => {
      period = p; custStart = cs; custEnd = ce; rebuild();
    }));

    // ── Gather clients this member is assigned to (all clients, including paused/gone)
    const assignedClients = (state.clients || []).filter(c =>
      (c.members || []).some(m => m.memberId === tm.id)
    );

    // ── Summary metrics
    const totalEarned    = calcMemberTotal(state, tm.id, assignedClients, range, 'paid');
    const totalPending   = calcMemberTotal(state, tm.id, assignedClients, range, 'pending');
    const totalAllTime   = assignedClients.reduce((s, c) => {
      const m = c.members.find(m => m.memberId === tm.id);
      return s + (m ? m.share : 0);
    }, 0);

    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'metrics-grid';
    metricsGrid.style.marginBottom = '24px';
    [
      { label: 'Paid (Period)',    value: formatCurrency(state, totalEarned),   icon: '✅', cls: 'positive' },
      { label: 'Pending (Period)', value: formatCurrency(state, totalPending),  icon: '⏳', cls: 'neutral' },
      { label: 'Monthly Rate',     value: formatCurrency(state, totalAllTime),  icon: '💼', cls: 'neutral' },
      { label: 'Clients',          value: assignedClients.length,               icon: '👥', cls: 'neutral' },
    ].forEach(m => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="metric-label">${m.label}</div>
          <span style="font-size:18px">${m.icon}</span>
        </div>
        <div class="metric-value ${m.cls}">${m.value}</div>
      `;
      metricsGrid.appendChild(card);
    });
    container.appendChild(metricsGrid);

    // ── Section header
    const secHdr = document.createElement('div');
    secHdr.className = 'section-header';
    secHdr.style.marginBottom = '14px';
    secHdr.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span class="section-title">Client Payments</span>
        <span class="section-count">${assignedClients.length}</span>
      </div>
      <button class="btn btn-primary btn-sm" id="add-mpay-btn">+ Log Payment</button>
    `;
    container.appendChild(secHdr);
    secHdr.querySelector('#add-mpay-btn').addEventListener('click', () =>
      openLogMemberPaymentModal(state, tm, assignedClients, rebuild));

    if (!assignedClients.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-title">No clients assigned</div>
        <p>Go to a client and add ${tm.name} as a team member.</p>
        <button class="btn btn-secondary" style="margin-top:12px" onclick="navigateTo('clients')">Open Clients →</button>
      `;
      container.appendChild(empty);
      return;
    }

    // ── Per-client payment cards
    const clientsWrap = document.createElement('div');
    clientsWrap.style.display = 'flex';
    clientsWrap.style.flexDirection = 'column';
    clientsWrap.style.gap = '16px';

    assignedClients.forEach(client => {
      const memberShare = (client.members.find(m => m.memberId === tm.id) || {}).share || 0;

      // Get manual payment logs for this member+client in the period
      const logs = (state.memberPayments || []).filter(p =>
        p.memberId === tm.id && p.clientId === client.id &&
        (period === 'max' ? true : dateInRange(p.date, range))
      ).sort((a, b) => b.date.localeCompare(a.date));

      const totalPaid    = logs.filter(p => p.paid).reduce((s, p) => s + p.amount, 0);
      const totalUnpaid  = logs.filter(p => !p.paid).reduce((s, p) => s + p.amount, 0);

      const card = document.createElement('div');
      card.className = 'table-card stmt-table-card';
      card.style.padding = '18px';

      // Client header row
      const cStatus = client.clientStatus || 'Active';
      const statusColor = cStatus === 'Active' ? 'var(--paid-text)' : cStatus === 'Paused' ? 'var(--accent)' : 'var(--text-muted)';
      card.innerHTML = `
        <div class="member-client-header">
          <div>
            <div style="font-size:16px;font-weight:800;color:var(--text-primary)">${client.name}
              <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:var(--bg-page);color:${statusColor};margin-left:6px;font-weight:600">${cStatus}</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:3px">
              Monthly share: <strong>${formatCurrency(state, memberShare)}</strong>
              · ${(client.paymentType || 'retainer') === 'one-time' ? '🔁 One-Time' : '🔄 Retainer'}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${logs.length ? `
              <span style="font-size:12px;color:var(--paid-text);font-weight:600">✅ ${formatCurrency(state, totalPaid)} paid</span>
              ${totalUnpaid > 0 ? `<span style="font-size:12px;color:var(--overdue-text);font-weight:600">⏳ ${formatCurrency(state, totalUnpaid)} pending</span>` : ''}
            ` : '<span style="font-size:12px;color:var(--text-muted)">No payments logged this period</span>'}
            <button class="btn btn-primary btn-sm add-mpay-client-btn">+ Log</button>
          </div>
        </div>
      `;

      card.querySelector('.add-mpay-client-btn').addEventListener('click', () =>
        openLogMemberPaymentModal(state, tm, assignedClients, rebuild, client.id));

      // Payments log table
      if (logs.length) {
        const logTable = document.createElement('div');
        logTable.style.marginTop = '14px';

        logs.forEach(log => {
          const row = document.createElement('div');
          row.className = 'stmt-card';
          row.style.borderTop = '1px solid var(--border-light)';
          row.innerHTML = `
            <div class="stmt-card-body">
              <div class="stmt-card-client">
                <span class="stmt-card-name">${log.reason || 'Payment'}</span>
                ${log.paid
                  ? `<span class="pill paid"><span class="pill-dot"></span>Paid</span>`
                  : `<span class="pill overdue"><span class="pill-dot"></span>Unpaid</span>`}
              </div>
              <div class="stmt-card-sub">
                ${formatDate(log.date)}
                ${log.paid && log.paidDate ? ` · <span style="color:var(--paid-text)">Paid on ${formatDate(log.paidDate)}</span>` : ''}
              </div>
            </div>
            <div class="stmt-card-right">
              <div class="${log.paid ? 'stmt-amt-paid' : 'stmt-amt-overdue'}">${formatCurrency(state, log.amount)}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
                ${!log.paid
                  ? `<button class="btn btn-success btn-sm mpay-mark-paid-btn">✅ Mark Paid</button>`
                  : `<button class="btn btn-secondary btn-sm mpay-mark-unpaid-btn" style="opacity:.7;font-size:11px">Undo</button>`}
                <button class="btn btn-secondary btn-sm mpay-edit-btn">✏️</button>
                <button class="row-delete-btn mpay-del-btn" title="Delete">
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          `;

          // Mark paid
          const mpBtn = row.querySelector('.mpay-mark-paid-btn');
          if (mpBtn) mpBtn.addEventListener('click', () => {
            const live = window.__agencyState;
            const now  = new Date();
            const ds   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
            const entry = (live.memberPayments || []).find(x => x.id === log.id);
            if (entry) { entry.paid = true; entry.paidDate = ds; }
            saveState(live); rebuild();
          });

          // Mark unpaid
          const muBtn = row.querySelector('.mpay-mark-unpaid-btn');
          if (muBtn) muBtn.addEventListener('click', () => {
            if (!confirm('Mark as unpaid?')) return;
            const live = window.__agencyState;
            const entry = (live.memberPayments || []).find(x => x.id === log.id);
            if (entry) { entry.paid = false; entry.paidDate = null; }
            saveState(live); rebuild();
          });

          // Edit
          row.querySelector('.mpay-edit-btn').addEventListener('click', () =>
            openLogMemberPaymentModal(state, tm, assignedClients, rebuild, client.id, log));

          // Delete
          row.querySelector('.mpay-del-btn').addEventListener('click', () => {
            if (!confirm('Delete this payment log?')) return;
            const live = window.__agencyState;
            live.memberPayments = (live.memberPayments || []).filter(x => x.id !== log.id);
            saveState(live); rebuild();
          });

          logTable.appendChild(row);
        });

        card.appendChild(logTable);
      }

      clientsWrap.appendChild(card);
    });

    container.appendChild(clientsWrap);
  }

  rebuild();
}

// ─── Helper: total paid/pending for a member in a period ──────
function calcMemberTotal(state, memberId, clients, range, type) {
  return (state.memberPayments || [])
    .filter(p =>
      p.memberId === memberId &&
      clients.some(c => c.id === p.clientId) &&
      (type === 'paid' ? p.paid : !p.paid) &&
      (!range || !range.start || dateInRange(p.date, range))
    )
    .reduce((s, p) => s + p.amount, 0);
}

// ─── Log / Edit Member Payment Modal ─────────────────────────
function openLogMemberPaymentModal(state, tm, clients, onSave, preselectedClientId, existingLog) {
  const isEdit = !!existingLog;
  const today  = new Date().toISOString().split('T')[0];

  const clientOpts = clients.map(c =>
    `<option value="${c.id}" ${(isEdit ? existingLog.clientId : preselectedClientId) === c.id ? 'selected' : ''}>${c.name}</option>`
  ).join('');

  const initStatus = isEdit ? (existingLog.paid ? 'paid' : 'unpaid') : 'unpaid';
  const initAmount = isEdit ? existingLog.amount : (() => {
    if (preselectedClientId) {
      const client = clients.find(c => c.id === preselectedClientId);
      if (client) {
        const m = (client.members || []).find(m => m.memberId === tm.id);
        return m ? m.share : '';
      }
    }
    return '';
  })();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <div>
          <div class="modal-title">${isEdit ? '✏️ Edit Payment Log' : '📝 Log Member Payment'}</div>
          <div class="modal-subtitle">${tm.name}</div>
        </div>
        <button class="modal-close" id="mpay-close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">

        <div class="form-group">
          <label class="form-label" for="mpay-client">Client *</label>
          <select class="form-input" id="mpay-client">${clientOpts}</select>
        </div>

        <div class="form-group">
          <label class="form-label" for="mpay-reason">Payment Label / Reason</label>
          <input class="form-input" type="text" id="mpay-reason"
            value="${isEdit ? (existingLog.reason || '') : ''}"
            placeholder="e.g. June 2026 salary, Bonus" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mpay-amount">Amount (${state.currency}) *</label>
            <input class="form-input" type="number" id="mpay-amount"
              value="${initAmount}" placeholder="e.g. 50000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="mpay-date">Date *</label>
            <input class="form-input" type="date" id="mpay-date"
              value="${isEdit ? existingLog.date : today}" />
          </div>
        </div>

        <div class="form-section-title">💳 Payment Status</div>
        <div class="status-selector" id="mpay-status-sel" style="margin-bottom:16px">
          <button type="button" class="status-option-btn ${initStatus === 'paid' ? 'selected-active' : ''}" data-status="paid">
            ✅ Paid<br/>
            <span style="font-size:10px;font-weight:400;opacity:.8">Already paid to member</span>
          </button>
          <button type="button" class="status-option-btn ${initStatus === 'unpaid' ? 'selected-active' : ''}" data-status="unpaid">
            ⏳ Unpaid / Pending<br/>
            <span style="font-size:10px;font-weight:400;opacity:.8">Still to be paid out</span>
          </button>
        </div>

      </div>
      <div class="modal-footer">
        ${isEdit ? `<button class="btn btn-danger btn-sm" id="mpay-delete" style="margin-right:auto">🗑 Delete</button>` : ''}
        <button class="btn btn-secondary" id="mpay-cancel">Cancel</button>
        <button class="btn btn-primary" id="mpay-save">${isEdit ? 'Save Changes' : 'Log Payment'}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#mpay-close').addEventListener('click', close);
  overlay.querySelector('#mpay-cancel').addEventListener('click', close);

  // Auto-fill amount when client changes
  overlay.querySelector('#mpay-client').addEventListener('change', e => {
    if (!isEdit) {
      const client = clients.find(c => c.id === e.target.value);
      if (client) {
        const m = (client.members || []).find(m => m.memberId === tm.id);
        if (m) overlay.querySelector('#mpay-amount').value = m.share;
      }
    }
  });

  // Delete button
  const delBtn = overlay.querySelector('#mpay-delete');
  if (delBtn) delBtn.addEventListener('click', () => {
    if (!confirm('Delete this payment log?')) return;
    const live = window.__agencyState || state;
    live.memberPayments = (live.memberPayments || []).filter(x => x.id !== existingLog.id);
    saveState(live); close(); onSave();
  });

  let selectedStatus = initStatus;
  overlay.querySelectorAll('#mpay-status-sel .status-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('#mpay-status-sel .status-option-btn').forEach(b => b.className = 'status-option-btn');
      selectedStatus = btn.dataset.status;
      btn.classList.add('selected-active');
    });
  });

  overlay.querySelector('#mpay-save').addEventListener('click', () => {
    const clientId = overlay.querySelector('#mpay-client').value;
    const amount   = parseFloat(overlay.querySelector('#mpay-amount').value);
    const date     = overlay.querySelector('#mpay-date').value;
    const reason   = overlay.querySelector('#mpay-reason').value.trim();

    if (!clientId)            { alert('Please select a client.'); return; }
    if (isNaN(amount) || amount <= 0) { alert('Please enter a valid amount.'); return; }
    if (!date)                { alert('Please select a date.'); return; }

    const live = window.__agencyState || state;
    if (!live.memberPayments) live.memberPayments = [];

    if (isEdit) {
      const idx = live.memberPayments.findIndex(x => x.id === existingLog.id);
      if (idx !== -1) {
        live.memberPayments[idx] = {
          ...live.memberPayments[idx],
          clientId, amount, date,
          reason: reason || null,
          paid:     selectedStatus === 'paid',
          paidDate: selectedStatus === 'paid' ? (live.memberPayments[idx].paidDate || date) : null,
        };
      }
    } else {
      live.memberPayments.push({
        id:       generateId(),
        memberId: tm.id,
        clientId,
        amount, date,
        reason:   reason || null,
        paid:     selectedStatus === 'paid',
        paidDate: selectedStatus === 'paid' ? date : null,
      });
    }

    saveState(live);
    close();
    onSave();
  });
}
