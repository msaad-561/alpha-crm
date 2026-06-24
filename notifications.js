// ============================================================
// notifications.js — Due-date alerts, banners, WhatsApp links
// ============================================================

function getUrgentClients(state) {
  return state.clients
    .map(c => {
      const status = getClientStatus(c);
      const days   = getDaysUntilDue(c);
      return { client: c, status, days };
    })
    .filter(({ status, days }) => status === 'Overdue' || (status === 'Pending' && days <= 3))
    .sort((a, b) => a.days - b.days);
}

function renderAlertBanner(state, container) {
  const urgent = getUrgentClients(state);
  if (!urgent.length) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';
  container.innerHTML = `
    <span class="alert-banner-icon">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </svg>
    </span>
    <div class="alert-banner-content">
      <div class="alert-banner-title">
        ${urgent.length === 1 ? '1 payment requires attention' : `${urgent.length} payments require attention`}
      </div>
      <div class="alert-banner-items">
        ${urgent.map(({ client, status, days }) => {
          const cls   = status === 'Overdue' ? 'overdue' : 'due-soon';
          const label = status === 'Overdue'
            ? `${client.name} — ${formatCurrency(state, client.retainerAmount)} (${Math.abs(days)}d overdue)`
            : `${client.name} — ${formatCurrency(state, client.retainerAmount)} (due in ${days}d)`;
          return `<span class="alert-chip ${cls}">${label}</span>`;
        }).join('')}
      </div>
    </div>
    <button class="alert-banner-close" onclick="this.closest('.alert-banner').style.display='none'" title="Dismiss">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  `;
}

function buildWhatsAppLink(phone, clientName, amount, dueDate, currency) {
  const msg = encodeURIComponent(
    `Hello! This is a friendly reminder that your retainer of ${currency}${amount.toLocaleString()} for ${clientName} is due on ${dueDate}. Please arrange the payment at your earliest convenience. Thank you! 🙏`
  );
  const num = (phone || '').replace(/\D/g, '');
  return num
    ? `https://wa.me/${num}?text=${msg}`
    : `https://wa.me/?text=${msg}`;
}

function updateNotifBadge(state) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const urgent = getUrgentClients(state);
  badge.classList.toggle('visible', urgent.length > 0);
}
