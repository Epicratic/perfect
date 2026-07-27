// Authentication & Registration Module

export function renderAuthView(appState, translations) {
  const t = translations[appState.lang] || translations.fr;
  const isRegisterMode = appState.authMode === 'register';

  return `
    <div style="padding: 10px 0;">
      <div class="card" style="text-align: center; padding: 24px 18px;">
        <img src="./src/assets/logo.png" alt="PerfECT Logo" style="width: 76px; height: 76px; margin: 0 auto 12px auto; display: block; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,168,89,0.3));" />
        <h2 style="font-size: 20px; font-weight: 800; color: #002B49; margin-bottom: 4px;">${t.appTitle}</h2>
        <p style="font-size: 11px; color: #64748B; margin-bottom: 20px;">${t.appSubtitle}</p>

        <!-- Auth Tabs (Se connecter vs Créer un compte) -->
        <div style="display: flex; background: #F1F5F9; border-radius: 12px; padding: 4px; margin-bottom: 20px;">
          <button id="tab-login-btn" class="btn" style="flex: 1; padding: 8px; font-size: 12px; border-radius: 8px; background: ${!isRegisterMode ? 'white' : 'transparent'}; color: ${!isRegisterMode ? '#002B49' : '#64748B'}; box-shadow: ${!isRegisterMode ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'};">
            ${t.signInTab}
          </button>
          <button id="tab-register-btn" class="btn" style="flex: 1; padding: 8px; font-size: 12px; border-radius: 8px; background: ${isRegisterMode ? 'white' : 'transparent'}; color: ${isRegisterMode ? '#002B49' : '#64748B'}; box-shadow: ${isRegisterMode ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'};">
            ${t.signUpTab}
          </button>
        </div>

        ${!isRegisterMode ? `
          <!-- LOGIN FORM -->
          <form id="login-form">
            <div class="form-group" style="text-align: left;">
              <label class="form-label">${t.emailLabel}</label>
              <input type="email" id="login-email" class="form-control" value="jeanluc.moreau@perfect-tech.io" placeholder="${t.emailPlaceholder}" required />
            </div>

            <div class="form-group" style="text-align: left;">
              <label class="form-label">${t.passwordLabel}</label>
              <input type="password" class="form-control" value="••••••••" placeholder="${t.passwordPlaceholder}" required />
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 11px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: #475569;">
                <input type="checkbox" checked /> ${t.rememberMe}
              </label>
              <a href="#" style="color: #00A859; font-weight: 600; text-decoration: none;">${t.forgotPassword}</a>
            </div>

            <button type="submit" class="btn btn-primary" style="margin-bottom: 14px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              ${t.signInBtn}
            </button>
          </form>

          <div style="font-size: 12px; color: #64748B; margin-bottom: 14px;">
            ${t.dontHaveAccount} <a href="#" id="toggle-to-register" style="color: #00A859; font-weight: 700; text-decoration: none;">${t.signUpTab}</a>
          </div>
        ` : `
          <!-- REGISTER FORM (CRÉER UN COMPTE) -->
          <form id="register-form">
            <div class="form-group" style="text-align: left;">
              <label class="form-label">${t.fullNameLabel} *</label>
              <input type="text" id="reg-fullname" class="form-control" placeholder="${t.fullNamePlaceholder}" required />
            </div>

            <div class="form-group" style="text-align: left;">
              <label class="form-label">${t.emailLabel} *</label>
              <input type="email" id="reg-email" class="form-control" placeholder="${t.emailPlaceholder}" required />
            </div>

            <div class="form-group" style="text-align: left;">
              <label class="form-label">${t.roleSelectLabel} *</label>
              <select id="reg-role" class="form-control" required>
                <option value="user">${t.roleEvaluator}</option>
                <option value="enterprise">${t.roleEnterprise}</option>
                <option value="citizen">${t.roleCitizen}</option>
              </select>
            </div>

            <div class="form-group" style="text-align: left;">
              <label class="form-label">${t.passwordLabel} *</label>
              <input type="password" id="reg-pass" class="form-control" placeholder="${t.passwordPlaceholder}" required />
            </div>

            <div class="form-group" style="text-align: left;">
              <label class="form-label">${t.confirmPasswordLabel} *</label>
              <input type="password" id="reg-confirm-pass" class="form-control" placeholder="${t.confirmPasswordPlaceholder}" required />
            </div>

            <div style="text-align: left; margin-bottom: 16px; font-size: 11px;">
              <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; color: #475569;">
                <input type="checkbox" required checked /> ${t.termsCheck}
              </label>
            </div>

            <button type="submit" class="btn btn-primary" style="margin-bottom: 14px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
              ${t.signUpBtn}
            </button>
          </form>

          <div style="font-size: 12px; color: #64748B; margin-bottom: 14px;">
            ${t.alreadyHaveAccount} <a href="#" id="toggle-to-login" style="color: #00A859; font-weight: 700; text-decoration: none;">${t.signInTab}</a>
          </div>
        `}

        <div style="margin: 16px 0; display: flex; align-items: center; gap: 10px;">
          <div style="flex:1; height:1px; background:#E2E8F0;"></div>
          <span style="font-size: 10px; color: #94A3B8; font-weight: 700;">ACCÈS RAPIDE</span>
          <div style="flex:1; height:1px; background:#E2E8F0;"></div>
        </div>

        <button id="admin-access-quick-btn" class="btn btn-secondary" style="margin-bottom: 10px; background: #002B49;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          ${t.adminAccessBtn}
        </button>
      </div>
    </div>
  `;
}

export function attachAuthEvents(containerEl, onLoginSuccess, onAdminAccess, onToggleAuthMode) {
  // Tab Switchers
  const tabLogin = containerEl.querySelector('#tab-login-btn');
  const tabRegister = containerEl.querySelector('#tab-register-btn');
  const toggleToReg = containerEl.querySelector('#toggle-to-register');
  const toggleToLog = containerEl.querySelector('#toggle-to-login');

  if (tabLogin) tabLogin.addEventListener('click', () => onToggleAuthMode('login'));
  if (tabRegister) tabRegister.addEventListener('click', () => onToggleAuthMode('register'));
  if (toggleToReg) toggleToReg.addEventListener('click', (e) => { e.preventDefault(); onToggleAuthMode('register'); });
  if (toggleToLog) toggleToLog.addEventListener('click', (e) => { e.preventDefault(); onToggleAuthMode('login'); });

  // Login Submit
  const loginForm = containerEl.querySelector('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      onLoginSuccess('user');
    });
  }

  // Register Submit
  const regForm = containerEl.querySelector('#register-form');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pass = containerEl.querySelector('#reg-pass').value;
      const confirm = containerEl.querySelector('#reg-confirm-pass').value;
      if (pass !== confirm) {
        alert("Les mots de passe ne correspondent pas.");
        return;
      }
      const fullName = containerEl.querySelector('#reg-fullname').value;
      alert(`Compte créé avec succès pour ${fullName} ! Vous êtes maintenant connecté.`);
      onLoginSuccess('user');
    });
  }

  // Admin Access Quick Action
  const adminBtn = containerEl.querySelector('#admin-access-quick-btn');
  if (adminBtn) {
    adminBtn.addEventListener('click', () => {
      onAdminAccess();
    });
  }
}
