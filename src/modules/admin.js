// Admin Portal Module

export function renderAdminView(appState, translations) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;
  const admin = appState.data.adminStats;

  // Dynamic KPIs computed from real data
  const realTotalUsers = admin.contributors ? admin.contributors.length : 0;
  const realEvals = (appState.data.recentEvaluations || []).length;
  const realPending = admin.contributors ? admin.contributors.filter(c =>
    (c.expertRequested && !c.expertApproved) || (c.verificationPending && !c.isVerified)
  ).length : 0;

  // Check if admin is authenticated
  if (!appState.isAdminAuthenticated) {
    return `
      <div>
        <div style="margin-bottom: 14px;">
          <h2 style="font-size: 18px; font-weight: 800; color: #002B49;">Portail Administrateur</h2>
          <p style="font-size: 11px; color: #64748B;">Authentification requise pour accéder aux statistiques et paramètres d'administration.</p>
        </div>

        <div class="card" style="padding: 24px; text-align: center; max-width: 380px; margin: 30px auto; border-top: 4px solid #002B49;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #EFF6FF; color: #002B49; display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 12px; box-shadow: 0 3px 8px rgba(0,0,0,0.08);">
            🔐
          </div>
          <h3 style="font-size: 16px; font-weight: 800; color: #002B49; margin-bottom: 6px;">Accès Sécurisé Admin</h3>
          <p style="font-size: 11px; color: #64748B; margin-bottom: 18px; line-height: 1.4;">
            Saisissez le mot de passe administrateur PerfECT pour déverrouiller cet espace.
          </p>

          <form id="admin-login-form" style="display: flex; flex-direction: column; gap: 12px;">
            <input
              type="password"
              id="admin-password-input"
              class="form-control"
              placeholder="Mot de passe administrateur"
              required
              style="text-align: center; font-size: 13px; font-weight: 700; letter-spacing: 1px; padding: 10px;"
            />
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 10px; font-size: 12px; font-weight: 700; background: #002B49;">
              🔒 Accéder au Portail Admin
            </button>
          </form>

          <div id="admin-auth-error" style="font-size: 10.5px; font-weight: 700; color: #EA5455; margin-top: 12px; display: none; background: #FEE2E2; padding: 6px 10px; border-radius: 6px;">
            ❌ Mot de passe incorrect. Réessayez.
          </div>

          <div style="margin-top: 16px; font-size: 11px;">
            <a href="#" id="admin-back-to-auth" style="color: #00A859; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              ← Retour à la page de connexion
            </a>
          </div>
        </div>
      </div>
    `;
  }

  // Helper: check if role is enterprise (case-insensitive)
  const isEnterprise = (role) => {
    if (!role) return false;
    const r = role.toLowerCase();
    return r.includes('entreprise') || r.includes('enterprise');
  };

  // Role label helper
  const roleLabel = (role) => {
    if (isEnterprise(role)) return '<span style="font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;background:#EFF6FF;color:#2563EB;">Entreprise</span>';
    return '<span style="font-size:9px;font-weight:800;padding:2px 8px;border-radius:10px;background:#F0FDF4;color:#007A3D;">Contributeur</span>';
  };

  // Expert request lamp: grey (no request) → red (pending) → green (approved)
  const expertLamp = (u) => {
    if (!u.expertRequested && !u.expertApproved) {
      return `<div style="width:16px;height:16px;border-radius:50%;background:#CBD5E1;box-shadow:none;margin:auto;" title="Aucune demande"></div>`;
    }
    if (u.expertApproved) {
      return `<div style="width:16px;height:16px;border-radius:50%;background:#00A859;box-shadow:0 0 8px 2px rgba(0,168,89,0.6);margin:auto;" title="Demande approuvée"></div>`;
    }
    return `<div style="width:16px;height:16px;border-radius:50%;background:#EA5455;box-shadow:0 0 8px 2px rgba(234,84,85,0.6);margin:auto;" title="Demande en attente"></div>`;
  };

  // Verification ID lamp: grey (no request) → red (pending) → green (verified)
  const verifyLamp = (u) => {
    const isVerif = Boolean(u.isVerified);
    const isPending = Boolean(u.verificationPending) && !isVerif;
    if (isVerif) {
      return `<div style="width:16px;height:16px;border-radius:50%;background:#00A859;box-shadow:0 0 8px 2px rgba(0,168,89,0.6);margin:auto;" title="Identité vérifiée (Confirmé)"></div>`;
    }
    if (isPending) {
      return `<div style="width:16px;height:16px;border-radius:50%;background:#EA5455;box-shadow:0 0 8px 2px rgba(234,84,85,0.6);margin:auto;" title="Pièce soumise — en attente de validation"></div>`;
    }
    return `<div style="width:16px;height:16px;border-radius:50%;background:#CBD5E1;box-shadow:none;margin:auto;" title="Aucune pièce soumise"></div>`;
  };

  // Toggle to confirm identity verification (available for both free & business users)
  const verifyToggle = (u) => {
    const isVerif = Boolean(u.isVerified);
    const isPending = Boolean(u.verificationPending) && !isVerif;
    const labelColor = isVerif ? '#00A859' : isPending ? '#EA5455' : '#94A3B8';
    const labelText = isVerif ? 'Confirmé' : isPending ? 'Confirmer' : '—';
    if (!isPending && !isVerif && !u.idDocBase64) return `<span style="font-size:9px;color:#CBD5E1;">—</span>`;
    return `
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="toggle-track verify-id-toggle-track ${isVerif ? 'toggle-on' : ''}" data-id="${u.id || u.uid}"
          style="width:38px;height:20px;border-radius:10px;background:${isVerif ? '#00A859' : '#CBD5E1'};position:relative;transition:background 0.25s;cursor:pointer;display:inline-block;vertical-align:middle;flex-shrink:0;">
          <div style="position:absolute;top:2px;left:${isVerif ? '20px' : '2px'};width:16px;height:16px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,0.3);transition:left 0.25s;"></div>
        </div>
        <span style="font-size:9.5px;font-weight:700;color:${labelColor};white-space:nowrap;">${labelText}</span>
      </div>`;
  };

  // Expert approval toggle (always visible for all non-enterprise users!)
  const expertToggle = (u) => {
    if (isEnterprise(u.role)) {
      return `<span style="font-size:9px;color:#CBD5E1;">—</span>`;
    }
    const labelColor = u.expertApproved ? '#00A859' : u.expertRequested ? '#FF9F43' : '#64748B';
    const labelText = u.expertApproved ? 'Approuvé' : u.expertRequested ? 'En attente' : 'Activer';
    return `
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="toggle-track expert-toggle-track ${u.expertApproved ? 'toggle-on' : ''}" data-id="${u.id}"
          style="width:38px;height:20px;border-radius:10px;background:${u.expertApproved ? '#00A859' : '#CBD5E1'};position:relative;transition:background 0.25s;cursor:pointer;display:inline-block;vertical-align:middle;flex-shrink:0;">
          <div style="position:absolute;top:2px;left:${u.expertApproved ? '20px' : '2px'};width:16px;height:16px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,0.3);transition:left 0.25s;"></div>
        </div>
        <span style="font-size:9.5px;font-weight:700;color:${labelColor};white-space:nowrap;">${labelText}</span>
      </div>`;
  };

  const usersHTML = admin.contributors.map(u => `
    <tr style="border-bottom: 1px solid #E2E8F0; font-size: 11px;">
      <td style="padding: 8px; font-weight: 700; color: #002B49;">${u.name}</td>
      <td style="padding: 8px;">${roleLabel(u.role)}</td>
      <td style="padding: 8px; text-align:center;">${expertLamp(u)}</td>
      <td style="padding: 8px;">${expertToggle(u)}</td>
      <td style="padding: 8px; text-align:center;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:3px;">
          ${verifyLamp(u)}
          ${(u.idDocBase64 || u.verificationPending || u.isVerified) ? `
            <button type="button" class="btn btn-outline btn-view-id-doc" data-id="${u.id}" style="padding: 2px 6px; font-size: 8.5px; font-weight: 700; border-radius: 6px; color: #002B49; border-color: #CBD5E1; cursor: pointer; white-space: nowrap; margin-top: 2px; background: #F8FAFC;">
              👁️ Voir pièce
            </button>
          ` : ''}
        </div>
      </td>
      <td style="padding: 8px;">${verifyToggle(u)}</td>
      <td style="padding: 8px;">
        <span class="badge ${u.status === 'Active' ? 'badge-success' : 'badge-danger'}">
          ${u.status === 'Active' ? (t.activeStatus || 'Actif') : (t.inactiveStatus || 'Inactif')}
        </span>
      </td>
      <td style="padding: 8px;">
        <button class="btn btn-outline toggle-user-btn" data-id="${u.id}"
          style="padding: 3px 8px; font-size: 9px; white-space:nowrap;">${t.toggleStatusBtn || 'Basculer'}</button>
      </td>
    </tr>
  `).join('');

  const workshopRequests = admin.workshopRequests || [];
  const pendingRequestsCount = workshopRequests.filter(r => r.status === 'En attente').length;

  const requestsHTML = workshopRequests.length === 0 ? `
    <div style="text-align: center; padding: 24px 12px; color: #64748B; font-size: 11.5px;">
      <div style="font-size: 28px; margin-bottom: 6px;">📬</div>
      <strong>Aucune demande d'atelier ou de formation reçue pour le moment.</strong>
      <div style="font-size: 10px; color: #94A3B8; margin-top: 4px;">Les demandes soumises depuis le menu "Our Events" s'afficheront ici en temps réel.</div>
    </div>
  ` : workshopRequests.map(r => {
    const isPending = r.status === 'En attente';
    const statusBg = isPending ? '#FEF3C7' : '#DCFCE7';
    const statusColor = isPending ? '#B45309' : '#15803D';

    return `
      <div class="workshop-req-card" style="border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; background: #FFFFFF; transition: box-shadow 0.2s;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #002B49; display: flex; align-items: center; gap: 6px;">
              <span>👤</span> ${r.userName || 'Demandeur anonyme'}
              <span style="font-size: 10px; font-weight: 600; color: #64748B; margin-left: 4px;">(${r.userEmail || 'Email non fourni'})</span>
            </div>
            <div style="font-size: 10.5px; font-weight: 700; color: #00A859; margin-top: 2px;">
              🏢 ${r.organization || 'Organisation non spécifiée'} ${r.userPhone ? `• 📞 ${r.userPhone}` : ''}
            </div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <span style="font-size: 9.5px; font-weight: 800; padding: 3px 8px; border-radius: 10px; background: ${statusBg}; color: ${statusColor}; display: inline-block;">
              ${r.status || 'En attente'}
            </span>
            <div style="font-size: 9px; color: #94A3B8; margin-top: 2px;">${r.dateDisplay || ''}</div>
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          <span style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; background: #EFF6FF; color: #1E40AF;">
            ${r.requestType || 'Atelier'}
          </span>
        </div>

        <div style="background: #F8FAFC; border-left: 3px solid #002B49; padding: 8px 10px; border-radius: 0 6px 6px 0; font-size: 11px; color: #334155; line-height: 1.4; margin-bottom: 10px;">
          ${r.message ? r.message.replace(/\n/g, '<br>') : '<em>Aucun message spécifique.</em>'}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-top: 6px; border-top: 1px dashed #E2E8F0;">
          <a href="mailto:${r.userEmail}?subject=PerfECT%20-%20Votre%20demande%20d'atelier%20/${encodeURIComponent(r.requestType || 'Formation')}" class="btn btn-outline" style="padding: 4px 10px; font-size: 10px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
            ✉️ Répondre par Email
          </a>
          <button class="btn btn-primary toggle-workshop-status-btn" data-id="${r.id}" data-current-status="${r.status || 'En attente'}" style="width: auto; padding: 4px 12px; font-size: 10px; font-weight: 700; border-radius: 12px; background: ${isPending ? '#00A859' : '#64748B'}; border-color: ${isPending ? '#00A859' : '#64748B'};">
            ${isPending ? '✓ Marquer comme Traité' : '↩ Remettre en attente'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom: 14px;">
        <div>
          <h2 style="font-size: 18px; font-weight: 800; color: #002B49;">${t.adminTitle}</h2>
          <p style="font-size: 11px; color: #64748B;">${t.adminSub}</p>
        </div>
        <button id="btn-admin-logout" class="btn btn-outline" style="width:auto;padding:4px 10px;font-size:10px;border-color:#EA5455;color:#EA5455;">
          🔒 Se déconnecter
        </button>
      </div>

      <!-- Key Metrics 2x2 Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
        <div class="card" style="padding: 12px; margin-bottom: 0;">
          <div style="font-size: 10px; color: #64748B; font-weight: 600;">${t.metricTotalUsers}</div>
          <div style="font-size: 20px; font-weight: 800; color: #002B49; margin-top: 4px;">${realTotalUsers}</div>
        </div>

        <div class="card" style="padding: 12px; margin-bottom: 0;">
          <div style="font-size: 10px; color: #64748B; font-weight: 600;">${t.metricActiveReports}</div>
          <div style="font-size: 20px; font-weight: 800; color: #00A859; margin-top: 4px;">${realEvals}</div>
        </div>

        <div class="card" style="padding: 12px; margin-bottom: 0;">
          <div style="font-size: 10px; color: #64748B; font-weight: 600;">Demandes Ateliers / OSC</div>
          <div style="font-size: 20px; font-weight: 800; color: #2563EB; margin-top: 4px;">
            ${workshopRequests.length} <span style="font-size: 11px; font-weight: 600; color: ${pendingRequestsCount > 0 ? '#EA5455' : '#64748B'};">(${pendingRequestsCount} en attente)</span>
          </div>
        </div>

        <div class="card" style="padding: 12px; margin-bottom: 0;">
          <div style="font-size: 10px; color: #64748B; font-weight: 600;">Dernière mise à jour</div>
          <div style="font-size: 13px; font-weight: 800; color: #64748B; margin-top: 4px;">${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
      </div>

      <!-- Workshop Requests Card -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div class="card-title" style="margin-bottom: 0; display: flex; align-items: center; gap: 6px;">
            <span>📬</span> Demandes d'Ateliers & Événements
          </div>
          ${pendingRequestsCount > 0 ? `
            <span style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 10px; background: #FEE2E2; color: #DC2626;">
              ${pendingRequestsCount} nouvelle(s)
            </span>
          ` : `
            <span style="font-size: 10px; font-weight: 700; color: #00A859;">✓ À jour</span>
          `}
        </div>

        <div class="workshop-requests-container">
          ${requestsHTML}
        </div>
      </div>

      <!-- Financial Performance Card -->
      <div class="card" style="background: linear-gradient(135deg, #002B49 0%, #0A3D62 100%); color: white;">
        <div class="card-title" style="color: white; margin-bottom: 12px;">${t.financialTitle}</div>

        <div style="font-size: 14px; font-weight: 700; color: #94A3B8; margin-bottom: 16px; line-height: 1.5;">
          📊 Phase de lancement — Les statistiques financières seront disponibles dès l'activation des premiers abonnements payants.
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.08); border-radius: 8px;">
          <span style="color: #94A3B8;">Utilisateurs inscrits</span>
          <span style="font-weight: 800; color: #00D26A;">${realTotalUsers}</span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.08); border-radius: 8px;">
          <span style="color: #94A3B8;">Évaluations publiées</span>
          <span style="font-weight: 800; color: #00D26A;">${realEvals}</span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 8px; background: rgba(255,255,255,0.08); border-radius: 8px;">
          <span style="color: #94A3B8;">Chiffre d'affaires</span>
          <span style="font-weight: 800; color: #94A3B8;">N/A</span>
        </div>
      </div>

      <!-- User & Contributor Management -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div class="card-title">${t.userManagementTitle}</div>
          <!-- Legend for the expert lamp -->
          <div style="display:flex;gap:10px;align-items:center;font-size:9px;color:#64748B;font-weight:600;">
            <span style="display:flex;align-items:center;gap:3px;">
              <span style="width:9px;height:9px;border-radius:50%;background:#CBD5E1;display:inline-block;"></span> Aucune demande
            </span>
            <span style="display:flex;align-items:center;gap:3px;">
              <span style="width:9px;height:9px;border-radius:50%;background:#EA5455;display:inline-block;"></span> En attente
            </span>
            <span style="display:flex;align-items:center;gap:3px;">
              <span style="width:9px;height:9px;border-radius:50%;background:#00A859;display:inline-block;"></span> Approuvé
            </span>
          </div>
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="font-size: 10px; color: #64748B; border-bottom: 2px solid #E2E8F0;">
                <th style="padding: 6px;">${t.userNameCol}</th>
                <th style="padding: 6px;">${t.userRoleCol}</th>
                <th style="padding: 6px; text-align:center;">Dem. Expert</th>
                <th style="padding: 6px;">Approbation</th>
                <th style="padding: 6px; text-align:center;">ID soumise</th>
                <th style="padding: 6px;">Vérif. ID</th>
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

export function attachAdminEvents(containerEl, appState, onToggleUserStatus, onToggleExpertApproval, onAdminLoginSuccess, onAdminLogout, onAdminBackToAuth, onToggleVerifyId, onToggleWorkshopStatus) {
  // Support legacy signature if appState was omitted
  if (typeof appState === 'function') {
    onToggleWorkshopStatus = onToggleVerifyId;
    onToggleVerifyId = onAdminBackToAuth;
    onAdminBackToAuth = onAdminLogout;
    onAdminLogout = onAdminLoginSuccess;
    onAdminLoginSuccess = onToggleExpertApproval;
    onToggleExpertApproval = onToggleUserStatus;
    onToggleUserStatus = appState;
    appState = null;
  }

  // Admin password login form
  const loginForm = containerEl.querySelector('#admin-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwdInput = containerEl.querySelector('#admin-password-input');
      const errEl = containerEl.querySelector('#admin-auth-error');
      const entered = pwdInput ? pwdInput.value.trim() : '';

      if (entered === 'Mdp1@Perfect') {
        if (onAdminLoginSuccess) onAdminLoginSuccess();
      } else {
        if (errEl) errEl.style.display = 'block';
      }
    });

    const backBtn = containerEl.querySelector('#admin-back-to-auth');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (onAdminBackToAuth) onAdminBackToAuth();
      });
    }
    return;
  }

  // Admin Logout button
  const logoutBtn = containerEl.querySelector('#btn-admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (onAdminLogout) onAdminLogout();
    });
  }

  // Toggle active/inactive status
  const toggleBtns = containerEl.querySelectorAll('.toggle-user-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (onToggleUserStatus) onToggleUserStatus(id);
    });
  });

  // Expert approval toggle tracks (the visual pill toggle)
  const expertToggleTracks = containerEl.querySelectorAll('.expert-toggle-track');
  expertToggleTracks.forEach(track => {
    track.addEventListener('click', () => {
      const id = track.getAttribute('data-id');
      if (onToggleExpertApproval) onToggleExpertApproval(id);
    });
  });

  // Identity verification toggle tracks
  const verifyToggleTracks = containerEl.querySelectorAll('.verify-id-toggle-track');
  verifyToggleTracks.forEach(track => {
    track.addEventListener('click', () => {
      const id = track.getAttribute('data-id');
      if (onToggleVerifyId) onToggleVerifyId(id);
    });
  });

  // View ID Document Modal Buttons
  const viewIdBtns = containerEl.querySelectorAll('.btn-view-id-doc');
  viewIdBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const userId = btn.getAttribute('data-id');
      const contributors = (appState && appState.data && appState.data.adminStats && appState.data.adminStats.contributors) || [];
      const user = contributors.find(c => c.id === userId || c.uid === userId);
      if (user) {
        showAdminIdDocModal(user, onToggleVerifyId);
      } else {
        alert("Détails de l'utilisateur introuvables.");
      }
    });
  });

  // Workshop / Event requests status toggle
  const workshopToggleBtns = containerEl.querySelectorAll('.toggle-workshop-status-btn');
  workshopToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const reqId = btn.getAttribute('data-id');
      const currentStatus = btn.getAttribute('data-current-status');
      const newStatus = currentStatus === 'En attente' ? 'Traité' : 'En attente';
      if (onToggleWorkshopStatus) onToggleWorkshopStatus(reqId, newStatus);
    });
  });
}

// ─── Modal pour Consulter la Pièce d'Identité Soumise par l'Utilisateur ─────────
function showAdminIdDocModal(user, onToggleVerifyId) {
  const oldModal = document.getElementById('admin-id-doc-modal');
  if (oldModal) oldModal.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'admin-id-doc-modal';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px);
    z-index: 99999; display: flex; align-items: center; justify-content: center;
    padding: 16px; animation: fadeIn 0.25s ease;
  `;

  const isVerified = user.isVerified === true;
  const isPending = user.verificationPending === true;
  const hasDoc = Boolean(user.idDocBase64);

  modalOverlay.innerHTML = `
    <div style="background: white; border-radius: 20px; padding: 22px 18px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; text-align: left; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 10px;">
        <div>
          <h3 style="font-size: 15px; font-weight: 800; color: #002B49; display: flex; align-items: center; gap: 6px;">
            <span>🪪</span> Pièce d'Identité
          </h3>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
            ${user.name} (${user.email || 'Email non renseigné'})
          </div>
        </div>
        <button id="close-admin-id-modal" style="background: #F1F5F9; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 14px; cursor: pointer; color: #64748B; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>

      <!-- Metadata summary -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px; font-size: 11px; margin-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          <span style="color: #94A3B8; font-size: 9.5px; font-weight: 700; text-transform: uppercase;">Statut Vérif :</span>
          <div style="font-weight: 800; color: ${isVerified ? '#00A859' : isPending ? '#EA580C' : '#64748B'};">
            ${isVerified ? '✅ Identité Validée' : isPending ? '⏳ En cours d\'examen' : 'Non vérifié'}
          </div>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 9.5px; font-weight: 700; text-transform: uppercase;">Date Document :</span>
          <div style="font-weight: 700; color: #002B49;">${user.idDocDate || user.registrationDate || 'Récemment'}</div>
        </div>
        <div style="grid-column: 1 / -1;">
          <span style="color: #94A3B8; font-size: 9.5px; font-weight: 700; text-transform: uppercase;">Nom de fichier :</span>
          <div style="font-weight: 600; color: #334155; word-break: break-all;">${user.idDocName || 'Piece_Identite.jpg'}</div>
        </div>
      </div>

      <!-- Document Image Preview Container -->
      <div style="margin-bottom: 16px; text-align: center;">
        ${hasDoc ? `
          <div style="background: #0F172A; border-radius: 12px; padding: 8px; margin-bottom: 8px;">
            <img src="${user.idDocBase64}" alt="Document d'identité de ${user.name}" style="max-width: 100%; max-height: 280px; object-fit: contain; border-radius: 8px; display: block; margin: auto;" />
          </div>
          <a href="${user.idDocBase64}" download="${user.idDocName || 'Piece_Identite.jpg'}" class="btn btn-outline" style="padding: 5px 12px; font-size: 10.5px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
            💾 Télécharger / Plein écran
          </a>
        ` : `
          <div style="padding: 24px 14px; background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 12px; color: #64748B; font-size: 11.5px;">
            <div style="font-size: 28px; margin-bottom: 6px;">📄</div>
            <strong>Aucun aperçu d'image disponible.</strong>
            <div style="font-size: 10px; color: #94A3B8; margin-top: 4px;">L'utilisateur a soumis une demande sans pièce jointe ou avec un document non imagé.</div>
          </div>
        `}
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 8px;">
        ${!isVerified ? `
          <button id="btn-admin-approve-id" class="btn btn-primary" style="flex: 1; padding: 10px; font-size: 12px; font-weight: 700; background: #00A859; border-color: #00A859;">
            ✓ Valider l'identité
          </button>
        ` : `
          <button id="btn-admin-revoke-id" class="btn btn-outline" style="flex: 1; padding: 10px; font-size: 12px; font-weight: 700; color: #DC2626; border-color: #FCA5A5; background: #FEF2F2;">
            ✕ Révoquer la validation
          </button>
        `}
        <button id="btn-admin-close-modal" class="btn btn-outline" style="padding: 10px 14px; font-size: 12px;">
          Fermer
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const closeModal = () => modalOverlay.remove();
  document.getElementById('close-admin-id-modal').addEventListener('click', closeModal);
  document.getElementById('btn-admin-close-modal').addEventListener('click', closeModal);

  const approveBtn = document.getElementById('btn-admin-approve-id');
  if (approveBtn) {
    approveBtn.addEventListener('click', () => {
      closeModal();
      if (onToggleVerifyId) onToggleVerifyId(user.id || user.uid, true);
    });
  }

  const revokeBtn = document.getElementById('btn-admin-revoke-id');
  if (revokeBtn) {
    revokeBtn.addEventListener('click', () => {
      closeModal();
      if (onToggleVerifyId) onToggleVerifyId(user.id || user.uid, false);
    });
  }
}
