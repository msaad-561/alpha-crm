// ============================================================
// home.js — Home Dashboard (v4)
// New KPIs: Gross Sale, Profit, Model Costs + date filter
// ============================================================

let homeChartInstance = null;

function renderHomePage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  let hPeriod = 'this_month';
  let hCustStart = '', hCustEnd = '';

  function rebuild() {
    container.innerHTML = '';
    container.className = 'fade-in';

    const range = getFilterRange(hPeriod, hCustStart, hCustEnd);

    // Date filter bar
    container.appendChild(buildDateFilterBar(hPeriod, hCustStart, hCustEnd, (p, cs, ce) => {
      hPeriod = p; hCustStart = cs; hCustEnd = ce; rebuild();
    }));

    // Quick stats
    container.appendChild(buildHomeQuickStats(state, range));

    // Chart
    container.appendChild(buildHomeChart(state));

    // Services summary (active clients only)
    container.appendChild(buildHomeServicesSummary(state));
  }

  rebuild();
}

// ─── Quick Stats ──────────────────────────────────────────────
function buildHomeQuickStats(state, range) {
  const grossSales  = getGrossSalesForRange(state, range);
  const modelCosts  = getTotalModelCostsForRange(state, range);
  const draws       = getFounderDrawsForRange(state, range);
  const agencyExp   = getTotalAgencyExpensesForRange(state, range);
  const payroll     = getTotalPayroll(state); // monthly fixed
  const totalExp    = payroll + draws + modelCosts + agencyExp;
  const profit      = grossSales - totalExp;

  const activeClients = getActiveClients(state);
  const collected     = getCollectedThisMonth(state);
  const totalRetainers = getTotalRetainers(state);
  const pending  = activeClients.filter(c => getClientStatus(c) === 'Pending').length;
  const overdue  = activeClients.filter(c => getClientStatus(c) === 'Overdue').length;

  const grid = document.createElement('div');
  grid.className = 'metrics-grid';
  grid.style.cssText = 'margin-bottom:24px;grid-template-columns:repeat(3,1fr)';

  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cards = [
    {
      label: 'Total Agency Gross Sale',
      value: formatCurrency(state, grossSales),
      sub: `Revenue collected in period`,
      cls: 'neutral',
      icon: '💼',
      highlight: true,
    },
    {
      label: 'Total Profit / Earned',
      value: formatCurrency(state, profit),
      sub: `After all expenses`,
      cls: profit >= 0 ? 'positive' : 'negative',
      icon: profit >= 0 ? '📈' : '📉',
    },
    {
      label: 'Models Costing',
      value: formatCurrency(state, modelCosts),
      sub: `Paid to models/influencers`,
      cls: 'neutral',
      icon: '🎭',
    },
    {
      label: 'Monthly Revenue (Active)',
      value: formatCurrency(state, totalRetainers),
      sub: `${activeClients.length} active clients`,
      cls: 'neutral',
      icon: '💰',
    },
    {
      label: 'Collected This Month',
      value: formatCurrency(state, collected),
      sub: `${activeClients.filter(c => getClientStatus(c) === 'Paid').length} / ${activeClients.length} clients paid`,
      cls: collected >= totalRetainers ? 'positive' : 'neutral',
      icon: '✅',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(state, totalRetainers - collected),
      sub: `${pending} pending · ${overdue} overdue`,
      cls: overdue > 0 ? 'negative' : pending > 0 ? 'neutral' : 'positive',
      icon: overdue > 0 ? '🔴' : '⏳',
    },
  ];

  cards.forEach(c => {
    const card = document.createElement('div');
    card.className = 'metric-card';
    if (c.highlight) {
      card.style.cssText = 'border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)';
    }
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
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

// ─── Chart ────────────────────────────────────────────────────
function buildHomeChart(state) {
  const wrap = document.createElement('div');
  wrap.className = 'chart-card';
  wrap.innerHTML = `
    <div class="chart-card-header">
      <div>
        <div class="section-title">Income vs Expenses</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Last 6 months overview</div>
      </div>
      <div class="chart-legend">
        <span class="legend-dot" style="background:#D97706"></span><span>Collected</span>
        <span class="legend-dot" style="background:#E5E7EB"></span><span>Projected</span>
        <span class="legend-dot" style="background:#EF4444"></span><span>Expenses</span>
        <span class="legend-dot" style="background:#8B5CF6"></span><span>Models</span>
      </div>
    </div>
    <div class="chart-wrap">
      <canvas id="income-chart"></canvas>
    </div>
  `;

  requestAnimationFrame(() => {
    setTimeout(() => initHomeChart(state), 50);
  });

  return wrap;
}

function initHomeChart(state) {
  const canvas = document.getElementById('income-chart');
  if (!canvas) return;
  if (typeof Chart === 'undefined') {
    canvas.parentElement.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px">⚠️ Chart.js failed to load.</div>`;
    return;
  }

  if (homeChartInstance) { homeChartInstance.destroy(); homeChartInstance = null; }

  const data     = getLast6MonthsChartData(state);
  const totalExp = data.payroll.map((p, i) => p + data.draws[i] + (data.models[i] || 0));

  const ctx = canvas.getContext('2d');
  homeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Collected Income',
          data: data.income,
          backgroundColor: 'rgba(217,119,6,0.85)',
          borderRadius: 6,
          borderSkipped: false,
          order: 1,
        },
        {
          label: 'Projected Revenue',
          data: data.projected,
          backgroundColor: 'rgba(229,231,235,0.4)',
          borderRadius: 6,
          borderSkipped: false,
          order: 2,
        },
        {
          label: 'Total Expenses',
          data: totalExp,
          type: 'line',
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239,68,68,0.07)',
          borderWidth: 2.5,
          pointBackgroundColor: '#EF4444',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
          order: 0,
        },
        {
          label: 'Model Costs',
          data: data.models,
          type: 'line',
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139,92,246,0.06)',
          borderWidth: 2,
          pointBackgroundColor: '#8B5CF6',
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.4,
          order: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1F2937',
          titleColor: '#F9FAFB',
          bodyColor: '#D1D5DB',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${state.currency}${ctx.raw.toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { family: 'Inter', size: 12 }, color: '#9CA3AF' },
        },
        y: {
          grid: { color: 'rgba(156,163,175,0.15)', drawBorder: false },
          border: { display: false },
          ticks: {
            font: { family: 'Inter', size: 12 },
            color: '#9CA3AF',
            callback: v => `${state.currency}${(v/1000).toFixed(0)}k`,
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// ─── Services Summary ─────────────────────────────────────────
function buildHomeServicesSummary(state) {
  const wrap = document.createElement('div');
  wrap.style.marginTop = '24px';

  const activeClients = getActiveClients(state);

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span class="section-title">Services Progress This Month</span>
      <span class="section-count">${activeClients.length} active clients</span>
    </div>
    <button class="btn btn-primary btn-sm" onclick="navigateTo('services')">View All →</button>
  `;
  wrap.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'home-services-grid';

  const monthKey = getCurrentMonthKey();

  activeClients.forEach(client => {
    const progress  = getServicesProgress(client, monthKey);
    const allTypes  = Object.keys(client.servicesPlan || {}).filter(t => client.servicesPlan[t] > 0);
    const allDone   = allTypes.every(t => progress[t] && progress[t].done >= progress[t].quota && progress[t].quota > 0);

    const card = document.createElement('div');
    card.className = 'home-service-card';
    card.innerHTML = `
      <div class="home-service-card-header">
        <div class="home-service-client-name">
          ${allDone && allTypes.length > 0 ? '<span style="margin-right:6px">✅</span>' : ''}${client.name}
        </div>
        <span class="pill ${getClientStatus(client).toLowerCase()}">${getClientStatus(client)}</span>
      </div>
      <div class="home-service-types">
        ${allTypes.length === 0
          ? `<div style="font-size:12px;color:var(--text-muted);padding:4px 0">No services plan set</div>`
          : allTypes.map(type => {
              const { quota, done } = progress[type] || { quota: 0, done: 0 };
              const pct = quota > 0 ? Math.min(100, Math.round((done / quota) * 100)) : 0;
              const fillCls = pct >= 100 ? '' : pct >= 70 ? 'high' : '';
              const typeIcon = type === 'Reels' ? '🎬' : type === 'Posts' ? '🖼️' : type === 'Stories' ? '📖' : '📌';
              return `
                <div class="home-service-type-row">
                  <span class="home-service-type-label">${typeIcon} ${type}</span>
                  <div class="progress-track" style="flex:1;margin:0 10px">
                    <div class="progress-fill ${fillCls}" style="width:${pct}%"></div>
                  </div>
                  <span style="font-size:12px;font-weight:600;color:${pct>=100?'var(--paid-text)':'var(--text-secondary)'}">
                    ${done}/${quota}
                  </span>
                </div>
              `;
            }).join('')
        }
      </div>
    `;
    card.addEventListener('click', () => navigateTo('services'));
    grid.appendChild(card);
  });

  if (!activeClients.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-title">No active clients</div><p>Add clients to track service progress.</p></div>`;
  }

  wrap.appendChild(grid);
  return wrap;
}
