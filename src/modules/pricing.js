// Plans & Tarifs Module

export function renderPricingView(appState, translations) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;

  return `
    <div>
      <div style="margin-bottom: 14px; text-align: center;">
        <h2 style="font-size: 18px; font-weight: 800; color: #002B49;">${t.pricingTitle}</h2>
        <p style="font-size: 11px; color: #64748B;">${t.pricingSub}</p>
      </div>

      <!-- Billing Cycle Switch -->
      <div class="billing-toggle-wrapper">
        <span style="color: ${!appState.isAnnualBilling ? '#00A859' : '#64748B'}">${t.monthlyBilling}</span>
        <div id="billing-switch" class="switch-control ${appState.isAnnualBilling ? 'active' : ''}">
          <div class="switch-knob"></div>
        </div>
        <span style="color: ${appState.isAnnualBilling ? '#00A859' : '#64748B'}">${t.annualBilling}</span>
      </div>

      <!-- Silver Plan -->
      <div class="card">
        <div class="card-title">${t.silverPlanTitle}</div>
        <div style="font-size: 26px; font-weight: 800; color: #002B49; margin: 6px 0;">
          ${appState.isAnnualBilling ? '80 €' : t.silverPrice} <span style="font-size: 12px; font-weight: 500; color: #64748B;">${t.perMonth}</span>
        </div>
        <ul style="list-style: none; font-size: 11px; color: #475569; margin: 12px 0;">
          <li style="margin-bottom: 6px;">✔ ${t.feature1}</li>
          <li style="margin-bottom: 6px;">✔ ${t.feature2}</li>
          <li style="margin-bottom: 6px; color: #CBD5E1;">✖ ${t.feature3}</li>
        </ul>
        <button class="btn btn-outline select-plan-btn" data-plan="Silver">${t.choosePlanBtn}</button>
      </div>

      <!-- Gold Plan (Recommended) -->
      <div class="card" style="border: 2px solid #00A859; position: relative;">
        <div style="position: absolute; top: -12px; right: 16px;" class="badge badge-success">${t.popularBadge}</div>
        <div class="card-title" style="color: #00A859;">${t.goldPlanTitle}</div>
        <div style="font-size: 26px; font-weight: 800; color: #002B49; margin: 6px 0;">
          ${appState.isAnnualBilling ? '400 €' : t.goldPrice} <span style="font-size: 12px; font-weight: 500; color: #64748B;">${t.perMonth}</span>
        </div>
        <ul style="list-style: none; font-size: 11px; color: #475569; margin: 12px 0;">
          <li style="margin-bottom: 6px;">✔ ${t.feature1}</li>
          <li style="margin-bottom: 6px;">✔ ${t.feature2}</li>
          <li style="margin-bottom: 6px;">✔ ${t.feature3}</li>
          <li style="margin-bottom: 6px;">✔ ${t.feature4}</li>
        </ul>
        <button class="btn btn-primary select-plan-btn" data-plan="Gold">${t.choosePlanBtn}</button>
      </div>

      <!-- Platinum Plan -->
      <div class="card" style="background: #002B49; color: white;">
        <div class="card-title" style="color: white;">${t.platinumPlanTitle}</div>
        <div style="font-size: 26px; font-weight: 800; color: white; margin: 6px 0;">
          ${appState.isAnnualBilling ? '800 €' : t.platinumPrice} <span style="font-size: 12px; font-weight: 500; color: #94A3B8;">${t.perMonth}</span>
        </div>
        <ul style="list-style: none; font-size: 11px; color: #CBD5E1; margin: 12px 0;">
          <li style="margin-bottom: 6px;">✔ ${t.feature1}</li>
          <li style="margin-bottom: 6px;">✔ ${t.feature2}</li>
          <li style="margin-bottom: 6px;">✔ ${t.feature3}</li>
          <li style="margin-bottom: 6px;">✔ ${t.feature4}</li>
          <li style="margin-bottom: 6px;">✔ ${t.feature5}</li>
        </ul>
        <button class="btn btn-primary select-plan-btn" style="background: white; color: #002B49;" data-plan="Platinum">${t.choosePlanBtn}</button>
      </div>
    </div>
  `;
}

export function attachPricingEvents(containerEl, onToggleBilling, onSelectPlan) {
  const switchBtn = containerEl.querySelector('#billing-switch');
  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      if (onToggleBilling) onToggleBilling();
    });
  }

  const planBtns = containerEl.querySelectorAll('.select-plan-btn');
  planBtns.forEach(b => {
    b.addEventListener('click', () => {
      const planName = b.getAttribute('data-plan');
      if (window.confetti) {
        window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
      alert(`Merci ! Vous avez choisi le plan ${planName}.`);
    });
  });
}
