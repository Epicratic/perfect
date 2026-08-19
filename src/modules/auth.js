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
              <input type="email" id="login-email" class="form-control" placeholder="${t.emailPlaceholder}" required />
            </div>

            <div class="form-group" style="text-align: left;">
              <label class="form-label">${t.passwordLabel}</label>
              <input type="password" id="login-password" class="form-control" placeholder="${t.passwordPlaceholder}" required />
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
                <option value="contributeur">${t.roleEvaluator}</option>
                <option value="entreprise">${t.roleEnterprise}</option>
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

import { firebaseRegister, firebaseLogin } from '../config/firebase.js';

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

  // ── Helper: show inline error/success message ──────────────────────────────
  function showMsg(form, text, isError = true) {
    let msgEl = form.querySelector('.auth-msg');
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.className = 'auth-msg';
      msgEl.style.cssText = `margin: 8px 0 12px; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; text-align: left;`;
      form.insertBefore(msgEl, form.querySelector('button[type="submit"]'));
    }
    msgEl.textContent = text;
    msgEl.style.background = isError ? '#FEE2E2' : '#D1FAE5';
    msgEl.style.color = isError ? '#B91C1C' : '#065F46';
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.style.opacity = loading ? '0.7' : '1';
    btn.textContent = loading ? '⏳ Chargement...' : btn.dataset.label;
  }

  // ── LOGIN FORM ─────────────────────────────────────────────────────────────
  const loginForm = containerEl.querySelector('#login-form');
  if (loginForm) {
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.dataset.label = submitBtn.textContent;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (containerEl.querySelector('#login-email')?.value || '').trim();
      const password = containerEl.querySelector('#login-password')?.value || '';

      if (!email || !password) {
        showMsg(loginForm, "Veuillez remplir tous les champs.");
        return;
      }

      if (submitBtn) setLoading(submitBtn, true);

      let result = null;
      try {
        result = await firebaseLogin({ email, password });
      } catch (err) {
        if (submitBtn) setLoading(submitBtn, false);
        const errMsg = `❌ Erreur inattendue : ${err && err.message ? err.message : String(err)}`;
        showMsg(loginForm, errMsg, true);
        alert(errMsg);
        return;
      }

      if (submitBtn) setLoading(submitBtn, false);

      if (!result || !result.ok) {
        const errMsg = (result && result.error) ? result.error : "Email ou mot de passe incorrect.";
        showMsg(loginForm, `❌ ${errMsg}`, true);
        alert(`❌ Échec de la connexion\n${errMsg}`);
        return;
      }

      // Build user payload from Firestore profile data or Firebase user
      const fbUser = result.user;
      const profile = result.profileData || {};
      const userPayload = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: profile.name || fbUser.displayName || email.split('@')[0],
        email: fbUser.email,
        role: profile.role || 'contributeur',
        status: profile.status || "Active",
        expertRequested: profile.expertRequested || false,
        expertApproved: profile.expertApproved || false,
        registrationDate: profile.registrationDate || new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        userId: profile.userId || `#PRF-${Math.floor(10000 + Math.random() * 90000)}-TN`,
        address: profile.address || "",
        phone: profile.phone || "",
        birthYear: profile.birthYear || profile.age || "",
        age: profile.age || profile.birthYear || "",
        profession: profile.profession || "",
        onboardingComplete: profile.onboardingComplete || false,
        businessProfile: profile.businessProfile || null,
        isVerified: profile.isVerified || false,
        verificationPending: profile.verificationPending || false,
        avatarBase64: profile.avatarBase64 || profile.photoURL || null,
        photoURL: profile.photoURL || profile.avatarBase64 || null,
        idDocBase64: profile.idDocBase64 || null,
        idDocName: profile.idDocName || null,
        idDocType: profile.idDocType || null,
        idDocDate: profile.idDocDate || null
      };

      onLoginSuccess(userPayload);
    });
  }

  // ── REGISTER FORM ──────────────────────────────────────────────────────────
  const regForm = containerEl.querySelector('#register-form');
  if (regForm) {
    const submitBtn = regForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.dataset.label = submitBtn.textContent;

    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = (containerEl.querySelector('#reg-fullname')?.value || '').trim();
      const email = (containerEl.querySelector('#reg-email')?.value || '').trim();
      const pass = containerEl.querySelector('#reg-pass')?.value || '';
      const confirm = containerEl.querySelector('#reg-confirm-pass')?.value || '';
      const roleSelect = containerEl.querySelector('#reg-role');
      const role = roleSelect ? roleSelect.value : 'contributeur';

      if (!fullName || !email || !pass || !confirm) {
        showMsg(regForm, "Veuillez remplir tous les champs obligatoires.");
        return;
      }
      if (pass !== confirm) {
        showMsg(regForm, "Les mots de passe ne correspondent pas.");
        return;
      }
      if (pass.length < 6) {
        showMsg(regForm, "Le mot de passe doit contenir au moins 6 caractères.");
        return;
      }

      if (submitBtn) setLoading(submitBtn, true);

      const result = await firebaseRegister({ email, password: pass, fullName, role });

      if (submitBtn) setLoading(submitBtn, false);

      if (!result.ok) {
        showMsg(regForm, result.error);
        return;
      }

      // Registration success → show verification message, don't auto-login yet
      showMsg(regForm,
        `✅ Compte créé ! Un email de vérification a été envoyé à ${email}. Cliquez sur le lien dans l'email puis revenez vous connecter.`,
        false
      );

      // Disable form after success
      regForm.querySelectorAll('input, select, button').forEach(el => el.disabled = true);

      // Switch to login tab after 3 seconds
      setTimeout(() => onToggleAuthMode('login'), 4000);
    });
  }

  // ── Admin Access Quick Action ──────────────────────────────────────────────
  const adminBtn = containerEl.querySelector('#admin-access-quick-btn');
  if (adminBtn) {
    adminBtn.addEventListener('click', () => onAdminAccess());
  }
}
