// User & Enterprise Profiles Module

export function renderProfilesView(appState, translations) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;
  const user = appState.data.userProfile;
  const evals = appState.data.evaluations;

  const historyRowsHTML = evals.map(ev => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #E2E8F0;">
      <div>
        <div style="font-size: 13px; font-weight: 700; color: #002B49;">${ev.actorName} (${ev.region.toUpperCase()})</div>
        <div style="font-size: 10px; color: #64748B;">${t.sectors[ev.macroSector] || ev.macroSector} • ${ev.date}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 800; color: #00A859; font-size: 13px;">★ ${ev.rating.toFixed(1)}</div>
        <span class="badge badge-success">${t.statusVerified}</span>
      </div>
    </div>
  `).join('');

  return `
    <div>
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #002B49;">${t.profileTitle}</h2>
      </div>

      <!-- User Profile Card -->
      <div class="card" style="text-align: center;">
        <img src="${user.avatarUrl}" alt="${user.name}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid #00A859; margin-bottom: 8px;" />
        <h3 style="font-size: 16px; font-weight: 800; color: #002B49;">${user.name}</h3>
        <p style="font-size: 11px; color: #00A859; font-weight: 700; margin-bottom: 12px;">${user.role}</p>

        <div style="display: flex; justify-content: space-around; background: #F8FAFC; padding: 12px; border-radius: 12px; margin-bottom: 14px;">
          <div>
            <div style="font-size: 18px; font-weight: 800; color: #002B49;">${user.stats.evaluationsCompleted}</div>
            <div style="font-size: 9px; color: #64748B;">${t.statsEvalsDone}</div>
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 800; color: #00A859;">#${user.stats.nationalRank}</div>
            <div style="font-size: 9px; color: #64748B;">${t.statsNationalRank}</div>
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 800; color: #FF9F43;">${user.stats.avgScoreGiven}</div>
            <div style="font-size: 9px; color: #64748B;">${t.statsAvgScore}</div>
          </div>
        </div>

        <div style="text-align: left; font-size: 11px; color: #475569;">
          <div style="margin-bottom: 4px;"><strong>📧 Email:</strong> ${user.email}</div>
          <div style="margin-bottom: 4px;"><strong>📞 ${t.phoneLabel}:</strong> ${user.phone}</div>
          <div><strong>📍 ${t.addressLabel}:</strong> ${user.address}</div>
        </div>
      </div>

      <!-- Evaluation History -->
      <div class="card">
        <div class="card-title" style="margin-bottom: 12px;">${t.evaluationHistoryTitle}</div>
        ${historyRowsHTML}
      </div>
    </div>
  `;
}
