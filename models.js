// ============================================================
// models.js — Models / Influencers page
// ============================================================

function renderModelsPage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  // Date filter state (local to this render cycle)
  let mPeriod = 'this_month';
  let mCustStart = '', mCustEnd = '';

  function rebuild() {
    container.innerHTML = '';
    container.className = 'fade-in';

    const range = getFilterRange(mPeriod, mCustStart, mCustEnd);

    // ── Date filter bar
    container.appendChild(buildDateFilterBar(mPeriod, mCustStart, mCustEnd, (p, cs, ce) => {
      mPeriod = p; mCustStart = cs; mCustEnd = ce; rebuild();
    }));

    // ── Section header
    const secHeader = document.createElement('div');
    secHeader.className = 'section-header';
    secHeader.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span class="section-title">Models & Influencers</span>
        <span class="section-count">${(state.models || []).length}</span>
      </div>
      <button class="btn btn-primary btn-sm" id="add-model-btn">+ Add Model</button>
    `;
    container.appendChild(secHeader);
    secHeader.querySelector('#add-model-btn').addEventListener('click', () => openAddModelModal(state, rebuild));

    // ── Summary metric (total cost for period)
    const totalCost = getTotalModelCostsForRange(state, range);
    const totalPmts = (state.models || []).reduce((s, m) =>
      s + (m.payments || []).filter(p => dateInRange(p.date, range)).length, 0);

    const summaryCard = document.createElement('div');
    summaryCard.style.cssText = 'display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap';
    summaryCard.innerHTML = `
      <div class="metric-card" style="flex:1;min-width:180px">
        <div class="metric-label">Total Model Cost</div>
        <div class="metric-value">${formatCurrency(state, totalCost)}</div>
        <div class="metric-sub">${totalPmts} payment${totalPmts !== 1 ? 's' : ''} in period</div>
      </div>
      <div class="metric-card" style="flex:1;min-width:180px">
        <div class="metric-label">Models on Roster</div>
        <div class="metric-value neutral">${(state.models || []).length}</div>
        <div class="metric-sub">Total registered</div>
      </div>
    `;
    container.appendChild(summaryCard);

    // ── Models grid
    if (!(state.models || []).length) {
      const empty = document.createElement('div');
      empty.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎭</div><div class="empty-state-title">No models yet</div><p>Click "+ Add Model" to register models or influencers.</p></div>`;
      container.appendChild(empty);

      return;
    }

    const grid = document.createElement('div');
    grid.className = 'models-grid';

    (state.models || []).forEach(model => {
      const allPmts  = model.payments || [];
      const filtered = allPmts.filter(p => dateInRange(p.date, range));
      const totalAll = allPmts.reduce((s, p) => s + p.amount, 0);
      const totalPeriod = filtered.reduce((s, p) => s + p.amount, 0);
      const c = getAvatarColor(model.colorIdx || 0);

      const card = document.createElement('div');
      card.className = 'model-card';

      // Payments list HTML (show all payments, latest first)
      const pmtRows = [...allPmts].reverse().slice(0, 8).map(pmt => {
        const client = (state.clients || []).find(cl => cl.id === pmt.clientId);
        const clientTag = client
          ? `<span class="model-client-tag">${client.name}</span>`
          : '';
        return `
          <div class="model-payment-item" data-pmt-id="${pmt.id}">
            <div class="model-payment-desc">${pmt.description || 'Payment'}</div>
            ${clientTag}
            <span class="model-payment-date">${formatDate(pmt.date)}</span>
            <span class="model-payment-amount">${formatCurrency(state, pmt.amount)}</span>
            <button class="row-delete-btn" title="Delete payment" data-pmt-id="${pmt.id}" data-model-id="${model.id}">
              <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        `;
      }).join('');

      const genderIcon = model.gender === 'Male' ? '👨' : model.gender === 'Female' ? '👩' : '🧑';
      const waBtn = model.whatsapp
        ? `<a href="https://wa.me/${model.whatsapp.replace(/\D/g,'')}" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;padding:4px 8px;font-size:11px">💬 WA</a>`
        : '';

      card.innerHTML = `
        <div class="model-card-header">
          <span class="avatar avatar-lg" style="background:${c.bg};color:${c.text};width:44px;height:44px;font-size:14px">${model.initials}</span>
          <div class="model-info">
            <div class="model-name">${genderIcon} ${model.name}</div>
            <div class="model-sub">${allPmts.length} payment${allPmts.length !== 1 ? 's' : ''} · ${formatCurrency(state, totalAll)} all time${model.defaultPay ? ` · Pay: ${formatCurrency(state, model.defaultPay)}` : ''}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            ${waBtn}
            <button class="btn btn-primary btn-sm add-pmt-btn" data-model-id="${model.id}">+ Pay</button>
            <button class="btn btn-danger btn-sm del-model-btn" data-model-id="${model.id}" title="Delete model">🗑</button>
          </div>
        </div>
        <div class="model-payments-list">
          ${pmtRows || '<div style="padding:16px 18px;font-size:13px;color:var(--text-muted)">No payments yet.</div>'}
        </div>
        <div class="model-card-footer">
          <span class="model-total-label">Period total</span>
          <span class="model-total-value">${formatCurrency(state, totalPeriod)}</span>
        </div>
      `;


      // Events
      card.querySelector('.add-pmt-btn').addEventListener('click', () =>
        openAddModelPaymentModal(state, model.id, rebuild));

      card.querySelector('.del-model-btn').addEventListener('click', () => {
        if (confirm(`Delete model "${model.name}"? All their payments will be lost.`)) {
          state.models = (state.models || []).filter(m => m.id !== model.id);
          saveState(state);
          rebuild();
        }
      });

      card.querySelectorAll('.row-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pmtId = btn.dataset.pmtId;
          const mdl = (state.models || []).find(m => m.id === model.id);
          if (!mdl) return;
          if (!confirm('Delete this payment?')) return;
          mdl.payments = mdl.payments.filter(p => p.id !== pmtId);
          saveState(state);
          rebuild();
        });
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  rebuild();
}

// ─── Add Model Modal ───────────────────────────────────────────
function openAddModelModal(state, onSave) {
  const clientOptions = (state.clients || [])
    .filter(c => (c.clientStatus || 'Active') === 'Active')
    .map(c => `<option value="${c.id}">${c.name}</option>`)
    .join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:460px">
      <div class="modal-header">
        <div>
          <div class="modal-title">Add Model / Influencer</div>
          <div class="modal-subtitle">Register a model or influencer for your agency</div>
        </div>
        <button class="modal-close" id="mdl-close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">

        <div class="form-group">
          <label class="form-label" for="mdl-name">Model Name *</label>
          <input class="form-input" type="text" id="mdl-name" placeholder="e.g. Sara Khan" />
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label">Gender *</label>
            <div style="display:flex;gap:10px;margin-top:4px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary)">
                <input type="radio" name="mdl-gender" value="Female" checked style="accent-color:var(--accent)" /> 👩 Female
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary)">
                <input type="radio" name="mdl-gender" value="Male" style="accent-color:var(--accent)" /> 👨 Male
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="mdl-pay">Model Pay (${state.currency}) *</label>
            <input class="form-input" type="number" id="mdl-pay" placeholder="e.g. 15000" min="0" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="mdl-whatsapp">WhatsApp Number</label>
          <input class="form-input" type="text" id="mdl-whatsapp" placeholder="+92 300 0000000" />
        </div>

        <div class="form-group">
          <label class="form-label" for="mdl-client">Model for Client</label>
          <select class="form-input" id="mdl-client">
            <option value="">— Select client (optional) —</option>
            ${clientOptions}
          </select>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="mdl-cancel">Cancel</button>
        <button class="btn btn-primary" id="mdl-save">Add Model</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#mdl-close').addEventListener('click', close);
  overlay.querySelector('#mdl-cancel').addEventListener('click', close);

  overlay.querySelector('#mdl-save').addEventListener('click', () => {
    const name     = overlay.querySelector('#mdl-name').value.trim();
    const gender   = overlay.querySelector('input[name="mdl-gender"]:checked').value;
    const pay      = parseFloat(overlay.querySelector('#mdl-pay').value);
    const whatsapp = overlay.querySelector('#mdl-whatsapp').value.trim();
    const clientId = overlay.querySelector('#mdl-client').value;

    if (!name) { alert('Please enter the model name.'); return; }
    if (isNaN(pay) || pay < 0) { alert('Please enter a valid pay amount.'); return; }

    // Auto-generate initials from name
    const parts    = name.split(' ').filter(Boolean);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

    // Pick avatar color based on gender
    const colorIdx = gender === 'Female' ? 4 : 1; // Rose for female, Purple for male

    if (!state.models) state.models = [];
    const newModel = {
      id: generateId(),
      name,
      initials,
      colorIdx,
      gender,
      whatsapp: whatsapp || null,
      defaultPay: pay,
      defaultClientId: clientId || null,
      payments: [],
    };

    // If a client is selected, auto-create the first payment entry
    if (clientId && pay > 0) {
      const today = new Date().toISOString().split('T')[0];
      newModel.payments.push({
        id: generateId(),
        amount: pay,
        date: today,
        description: 'Initial payment',
        clientId,
      });
    }

    state.models.push(newModel);
    saveState(state);
    close();
    onSave();
  });
}


// ─── Add Model Payment Modal ───────────────────────────────────
function openAddModelPaymentModal(state, modelId, onSave) {
  const model = (state.models || []).find(m => m.id === modelId);
  if (!model) return;

  const today = new Date().toISOString().split('T')[0];
  const clientOptions = (state.clients || [])
    .map(c => `<option value="${c.id}" ${c.id === model.defaultClientId ? 'selected' : ''}>${c.name}</option>`)
    .join('');

  const defaultAmount = model.defaultPay || '';


  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <div>
          <div class="modal-title">Log Payment — ${model.name}</div>
          <div class="modal-subtitle">Record a payment made to this model/influencer</div>
        </div>
        <button class="modal-close" id="mp-close">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="mp-amount">Amount (${state.currency})</label>
            <input class="form-input" type="number" id="mp-amount" placeholder="e.g. 15000" min="0" value="${defaultAmount}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="mp-date">Date</label>
            <input class="form-input" type="date" id="mp-date" value="${today}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="mp-desc">Description</label>
          <input class="form-input" type="text" id="mp-desc" placeholder="e.g. Reel shoot for April campaign" />
        </div>
        <div class="form-group">
          <label class="form-label" for="mp-client">For Which Client? (optional)</label>
          <select class="form-input" id="mp-client">
            <option value="">— No specific client —</option>
            ${clientOptions}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="mp-cancel">Cancel</button>
        <button class="btn btn-primary" id="mp-save">Log Payment</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#mp-close').addEventListener('click', close);
  overlay.querySelector('#mp-cancel').addEventListener('click', close);

  overlay.querySelector('#mp-save').addEventListener('click', () => {
    const amount = parseFloat(overlay.querySelector('#mp-amount').value);
    const date   = overlay.querySelector('#mp-date').value;
    const desc   = overlay.querySelector('#mp-desc').value.trim();
    const clientId = overlay.querySelector('#mp-client').value;

    if (isNaN(amount) || amount <= 0 || !date) {
      alert('Please enter a valid amount and date.');
      return;
    }

    if (!model.payments) model.payments = [];
    model.payments.push({
      id: generateId(),
      amount,
      date,
      description: desc || 'Payment',
      clientId: clientId || null,
    });
    saveState(state);
    close();
    onSave();
  });
}
