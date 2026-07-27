// Admin Portal Module

export function renderAdminView(appState, translations) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;
  const admin = appState.data.adminStats;

  const usersHTML = admin.contributors.map(u => `
    <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
      <td style="padding: 8px; font-weight: 700; color: #002B49;">${u.name}</td>
      <td style="padding: 8px;">${u.role}</td>
      <td style="padding: 8px;">
        <span class="badge ${u.status === 'Active' ? 'badge-success' : 'badge-danger'}">
          ${u.status === 'Active' ? t.activeStatus : t.inactiveStatus}
        </span>
      </td>
      <td style="padding: 8px;">
        <button class="btn btn-outline toggle-user-btn" data-id="${u.id}" style="padding: 3px 8px; font-size: 9px;">${t.toggleStatusBtn}</button>
      </td>
    </tr>
  `).join('');

  return `
    <div>
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #002B49;">${t.adminTitle}</h2>
        <p style="font-size: 11px; color: #64748B;">${t.adminSub}</p>
      </div>

      <!-- Key Metrics 2x2 Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div class="card" style="padding: 12px; margin-bottom: 0;">
          <div style="font-size: 10px; color: #64748B; font-weight: 600;">${t.metricTotalUsers}</div>
          <div style="font-size: 20px; font-weight: 800; color: #002B49; margin-top: 4px;">${admin.totalUsers.toLocaleString()}</div>
        </div>

        <div class="card" style="padding: 12px; margin-bottom: 0;">
          <div style="font-size: 10px; color: #64748B; font-weight: 600;">${t.metricActiveReports}</div>
          <div style="font-size: 20px; font-weight: 800; color: #00A859; margin-top: 4px;">${admin.activeReports}</div>
        </div>

        <div class="card" style="padding: 12px; margin-bottom: 0;">
          <div style="font-size: 10px; color: #64748B; font-weight: 600;">${t.metricPendingEvals}</div>
          <div style="font-size: 20px; font-weight: 800; color: #FF9F43; margin-top: 4px;">${admin.pendingEvals}</div>
        </div>

        <div class="card" style="padding: 12px; margin-bottom: 0;">
          <div style="font-size: 10px; color: #64748B; font-weight: 600;">${t.metricAvgResponseTime}</div>
          <div style="font-size: 20px; font-weight: 800; color: #00A8FF; margin-top: 4px;">${admin.avgResponseTime}</div>
        </div>
      </div>

      <!-- Financial Performance Card -->
      <div class="card" style="background: linear-gradient(135deg, #002B49 0%, #0A3D62 100%); color: white;">
        <div class="card-title" style="color: white; margin-bottom: 12px;">${t.financialTitle}</div>
        
        <div style="font-size: 24px; font-weight: 800; color: #00D26A;">${admin.financial.totalRevenue.toLocaleString()} €</div>
        <div style="font-size: 10px; color: #94A3B8; margin-bottom: 14px;">${t.totalRevenueLabel}</div>

        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
          <span>${t.mrrLabel}</span>
          <span style="font-weight: 700;">${admin.financial.mrr.toLocaleString()} € / mo</span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
          <span>${t.targetGaugeTitle}</span>
          <span style="font-weight: 700; color: #00D26A;">85%</span>
        </div>

        <div class="pillar-progress-track" style="background: rgba(255,255,255,0.15);">
          <div class="pillar-progress-fill fill-economic" style="width: 85%;"></div>
        </div>
      </div>

      <!-- User & Contributor Management -->
      <div class="card">
        <div class="card-title" style="margin-bottom: 10px;">${t.userManagementTitle}</div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="font-size: 10px; color: #64748B; border-bottom: 2px solid #E2E8F0;">
                <th style="padding: 6px;">${t.userNameCol}</th>
                <th style="padding: 6px;">${t.userRoleCol}</th>
                <th style="padding: 6px;">${t.userStatusCol}</th>
                <th style="padding: 6px;">${t.actionsCol}</th>
              </tr>
            </thead>
            <tbody>
              ${usersHTML}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function attachAdminEvents(containerEl, onToggleUserStatus) {
  const toggleBtns = containerEl.querySelectorAll('.toggle-user-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (onToggleUserStatus) onToggleUserStatus(id);
    });
  });
}
