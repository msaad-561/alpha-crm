// ============================================================
// home.js — Home Dashboard (Charts + Service Summary)
// ============================================================

let homeChartInstance = null;

function renderHomePage(state, container) {
  container.innerHTML = '';
  container.className = 'fade-in';

  // Quick stats row
  container.appendChild(buildHomeQuickStats(state));

  // Chart section
  container.appendChild(buildHomeChart(state));

  // Services summary
  container.appendChild(buildHomeServicesSummary(state));
}

// ─── Quick Stats ──────────────────────────────────────────────
function buildHomeQuickStats(state) {
  const totalRetainers = getTotalRetainers(state);
  const collected      = getCollectedThisMonth(state);
  const pending        = state.clients.filter(c => getClientStatus(c) === 'Pending').length;
  const overdue        = state.clients.filter(c => getClientStatus(c) === 'Overdue').length;
  const payroll        = getTotalPayroll(state);
  const draws          = getTotalFounderDraws(state);
  const net            = collected - payroll - draws;

  const grid = document.createElement('div');
  grid.className = 'metrics-grid';
  grid.style.marginBottom = '24px';

  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cards = [
    {
      label: 'Monthly Revenue',
      value: formatCurrency(state, totalRetainers),
      sub: `${monthName}`,
      cls: 'neutral',
      icon: '💰',
    },
    {
      label: 'Collected So Far',
      value: formatCurrency(state, collected),
      sub: `${state.clients.filter(c => getClientStatus(c) === 'Paid').length} / ${state.clients.length} clients paid`,
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
    {
      label: 'Net Profit',
      value: formatCurrency(state, net),
      sub: `After payroll & draws`,
      cls: net >= 0 ? 'positive' : 'negative',
      icon: net >= 0 ? '📈' : '📉',
    },
  ];

  cards.forEach(c => {
    const card = document.createElement('div');
    card.className = 'metric-card';
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
      </div>
    </div>
    <div class="chart-wrap">
      <canvas id="income-chart"></canvas>
    </div>
  `;

  // Chart renders after DOM insertion — use setTimeout trick
  requestAnimationFrame(() => {
    setTimeout(() => initHomeChart(state), 50);
  });

  return wrap;
}

function initHomeChart(state) {
  const canvas = document.getElementById('income-chart');
  if (!canvas) return;
  if (typeof Chart === 'undefined') {
    canvas.parentElement.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px">⚠️ Chart.js failed to load. Check your internet connection.</div>`;
    return;
  }

  if (homeChartInstance) { homeChartInstance.destroy(); homeChartInstance = null; }

  const data   = getLast6MonthsChartData(state);
  const totalExp = data.payroll.map((p, i) => p + data.draws[i]);

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
          backgroundColor: 'rgba(229,231,235,0.6)',
          borderRadius: 6,
          borderSkipped: false,
          order: 2,
        },
        {
          label: 'Total Expenses',
          data: totalExp,
          type: 'line',
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#EF4444',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
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
          grid: { color: '#F3F4F6', drawBorder: false },
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

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span class="section-title">Services Progress This Month</span>
      <span class="section-count">${state.clients.length} clients</span>
    </div>
    <button class="btn btn-primary btn-sm" onclick="navigateTo('services')">View All →</button>
  `;
  wrap.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'home-services-grid';

  const monthKey = getCurrentMonthKey();

  state.clients.forEach(client => {
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

  if (!state.clients.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-title">No clients yet</div><p>Add clients to track service progress.</p></div>`;
  }

  wrap.appendChild(grid);
  return wrap;
}
