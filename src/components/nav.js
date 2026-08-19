// Header & Navigation Components

export function renderHeaderHTML(currentLang, translations, activeRole = "user", isLoggedIn = true, activeTab = "dashboard", currentUser = null) {
  const t = translations[currentLang] || translations.fr;
  const showProfileAvatar = isLoggedIn && activeTab !== 'login';

  // Build avatar HTML from currentUser
  let avatarHTML = '';
  if (showProfileAvatar) {
    if (currentUser && currentUser.photoURL) {
      avatarHTML = `<img src="${currentUser.photoURL}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    } else {
      const name = (currentUser && currentUser.name) ? currentUser.name : (currentUser && currentUser.email ? currentUser.email : 'U');
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarHTML = `<span style="font-size:14px;font-weight:800;color:#FFFFFF;line-height:1;">${initials}</span>`;
    }
  }

  return `
    <header class="app-top-header">
      <div class="brand-logo-container">
        <img src="./src/assets/logo.png" alt="PerfECT Logo" class="brand-logo-img" />
        <div class="brand-info">
          <h1>${t.appTitle}</h1>
          <p>${t.appSubtitle}</p>
        </div>
      </div>

      <div class="header-right-actions">
        <select id="header-lang-select" class="lang-selector" aria-label="Language Selector">
          <option value="fr" ${currentLang === 'fr' ? 'selected' : ''}>🇫🇷 FR</option>
          <option value="en" ${currentLang === 'en' ? 'selected' : ''}>🇬🇧 EN</option>
          <option value="ar" ${currentLang === 'ar' ? 'selected' : ''}>🇸🇦 AR</option>
        </select>

        ${showProfileAvatar ? `
          <div id="header-profile-btn" class="user-avatar-btn" title="${t.profileTitle}" style="background:#002B49;display:flex;align-items:center;justify-content:center;">
            ${avatarHTML}
          </div>
        ` : ''}

        <!-- Hamburger 3-Bars Menu Button & Dropdown -->
        <div class="header-menu-container" style="position: relative;">
          <button id="header-menu-btn" class="header-menu-btn" aria-label="Menu principal" title="Menu" style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.22); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; transition: all 0.2s ease;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <!-- Dropdown Menu (Our Vision / Our Team / Our Events) -->
          <div id="header-dropdown-menu" class="header-dropdown-menu" style="display: none; position: absolute; right: 0; top: calc(100% + 8px); width: 220px; background: #FFFFFF; border-radius: 14px; box-shadow: 0 12px 30px rgba(0,0,0,0.25); border: 1px solid #E2E8F0; z-index: 10000; overflow: hidden; animation: fadeIn 0.2s ease;">
            <div style="padding: 10px 14px; background: #002B49; color: white; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px;">
              <span>🌐</span> À Propos de PerfECT
            </div>
            <div style="padding: 4px 0;">
              <button id="menu-item-vision" class="header-dropdown-item" style="width: 100%; text-align: left; padding: 10px 14px; background: none; border: none; font-size: 12px; font-weight: 700; color: #002B49; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.15s;">
                <span style="font-size: 16px;">🌟</span>
                <div>
                  <div style="line-height: 1.2;">Our Vision</div>
                  <div style="font-size: 9.5px; color: #64748B; font-weight: 500;">Notre Vision & Piliers</div>
                </div>
              </button>

              <div style="height: 1px; background: #F1F5F9; margin: 2px 10px;"></div>

              <button id="menu-item-team" class="header-dropdown-item" style="width: 100%; text-align: left; padding: 10px 14px; background: none; border: none; font-size: 12px; font-weight: 700; color: #002B49; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.15s;">
                <span style="font-size: 16px;">👥</span>
                <div>
                  <div style="line-height: 1.2;">Our Team</div>
                  <div style="font-size: 9.5px; color: #64748B; font-weight: 500;">Fondateurs & Équipe</div>
                </div>
              </button>

              <div style="height: 1px; background: #F1F5F9; margin: 2px 10px;"></div>

              <button id="menu-item-events" class="header-dropdown-item" style="width: 100%; text-align: left; padding: 10px 14px; background: none; border: none; font-size: 12px; font-weight: 700; color: #002B49; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.15s;">
                <span style="font-size: 16px;">📅</span>
                <div>
                  <div style="line-height: 1.2;">Our Events</div>
                  <div style="font-size: 9.5px; color: #64748B; font-weight: 500;">Ateliers, Démos & OSC</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
}

export function renderBottomNavHTML(activeTab, t) {
  return `
    <nav class="floating-bottom-nav">
      <button class="nav-item-btn ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>${t.navDashboard}</span>
      </button>

      <button class="nav-item-btn ${activeTab === 'reporting' ? 'active' : ''}" data-tab="reporting">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
        <span>${t.navReporting}</span>
      </button>

      <button class="nav-item-btn ${activeTab === 'analytics' ? 'active' : ''}" data-tab="analytics">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        <span>${t.navAnalytics}</span>
      </button>

      <button class="nav-item-btn ${activeTab === 'profiles' ? 'active' : ''}" data-tab="profiles">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>${t.navProfiles}</span>
      </button>
    </nav>
  `;
}

import { firestoreSaveWorkshopRequest } from '../config/firebase.js';

export function attachHeaderMenuEvents(headerMount, currentUser = null) {
  if (!headerMount) return;

  const menuBtn = headerMount.querySelector('#header-menu-btn');
  const dropdownMenu = headerMount.querySelector('#header-dropdown-menu');

  if (menuBtn && dropdownMenu) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdownMenu.style.display === 'block';
      dropdownMenu.style.display = isVisible ? 'none' : 'block';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.style.display = 'none';
      }
    });

    // Menu Item: Our Vision
    const visionBtn = headerMount.querySelector('#menu-item-vision');
    if (visionBtn) {
      visionBtn.addEventListener('click', () => {
        dropdownMenu.style.display = 'none';
        showVisionModal();
      });
    }

    // Menu Item: Our Team
    const teamBtn = headerMount.querySelector('#menu-item-team');
    if (teamBtn) {
      teamBtn.addEventListener('click', () => {
        dropdownMenu.style.display = 'none';
        showTeamModal();
      });
    }

    // Menu Item: Our Events
    const eventsBtn = headerMount.querySelector('#menu-item-events');
    if (eventsBtn) {
      eventsBtn.addEventListener('click', () => {
        dropdownMenu.style.display = 'none';
        showEventsModal(currentUser);
      });
    }
  }
}

export function showVisionModal() {
  const oldModal = document.getElementById('vision-info-modal');
  if (oldModal) oldModal.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'vision-info-modal';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
    z-index: 99999; display: flex; align-items: center; justify-content: center;
    padding: 16px; animation: fadeIn 0.3s ease;
  `;

  modalOverlay.innerHTML = `
    <div style="background: white; border-radius: 18px; width: 100%; max-width: 480px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #002B49, #0A3D62); color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px;">🌟</span>
          <div>
            <h3 style="font-size: 15px; font-weight: 800; margin: 0; color: white;">Our Vision / Notre Vision</h3>
            <p style="font-size: 10px; opacity: 0.85; margin: 0;">Performance Evaluation & Communication Technologies</p>
          </div>
        </div>
        <button id="close-vision-modal" style="background: rgba(255,255,255,0.15); border: none; font-size: 14px; color: white; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>

      <!-- Content -->
      <div style="padding: 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; font-size: 12px; line-height: 1.5; color: #334155;">
        <div style="background: #F0FDF4; border-left: 4px solid #00A859; padding: 12px; border-radius: 0 10px 10px 0;">
          <strong style="color: #166534; font-size: 12.5px;">🎯 Notre Mission</strong><br>
          PerfECT est une plateforme numérique citoyenne et professionnelle dédiée à la <strong>mesure, au suivi et à la valorisation de la performance sociétale</strong> des entreprises et des institutions publiques opérant dans les secteurs des services fondamentaux.
        </div>

        <div>
          <h4 style="font-size: 13px; font-weight: 800; color: #002B49; margin-bottom: 8px;">🚀 Nos Trois Piliers d'Impact :</h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px;">
              <div style="font-weight: 800; color: #2563EB; font-size: 11.5px; margin-bottom: 2px;">📈 1. Intelligence Décisionnelle (Decision-Grade Intelligence)</div>
              <div style="font-size: 11px; color: #64748B;">Consolider les signaux RSE et les retours d'expérience citoyens pour fournir aux dirigeants et décideurs une vision fiable et exploitable.</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px;">
              <div style="font-weight: 800; color: #EA5455; font-size: 11.5px; margin-bottom: 2px;">🏛️ 2. Amélioration Continue des Services</div>
              <div style="font-size: 11px; color: #64748B;">Outiller les gestionnaires publics et privés pour écouter leurs usagers, prioriser leurs investissements et valoriser leurs progrès.</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px;">
              <div style="font-weight: 800; color: #00A859; font-size: 11.5px; margin-bottom: 2px;">🌍 3. Prospérité & Durabilité Territoriale</div>
              <div style="font-size: 11px; color: #64748B;">Aligner les performances autour de 3 dimensions indissociables : <strong>Prospérité Économique, Inclusion Sociale et Viabilité Environnementale</strong>.</div>
            </div>
          </div>
        </div>

        <div>
          <h4 style="font-size: 13px; font-weight: 800; color: #002B49; margin-bottom: 8px;">💎 Nos Valeurs Fondatrices :</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center;">
            <div style="background: #EFF6FF; border-radius: 10px; padding: 10px 6px;">
              <div style="font-size: 18px; margin-bottom: 2px;">🕊️</div>
              <strong style="color: #1D4ED8; font-size: 11px;">Liberté</strong>
              <div style="font-size: 9px; color: #64748B; margin-top: 2px;">Expression citoyenne transparente</div>
            </div>
            <div style="background: #FEF2F2; border-radius: 10px; padding: 10px 6px;">
              <div style="font-size: 18px; margin-bottom: 2px;">⚖️</div>
              <strong style="color: #DC2626; font-size: 11px;">Dignité</strong>
              <div style="font-size: 9px; color: #64748B; margin-top: 2px;">Accès équitable aux services</div>
            </div>
            <div style="background: #F0FDF4; border-radius: 10px; padding: 10px 6px;">
              <div style="font-size: 18px; margin-bottom: 2px;">🤝</div>
              <strong style="color: #166534; font-size: 11px;">Symbiose</strong>
              <div style="font-size: 9px; color: #64748B; margin-top: 2px;">Synergie acteurs & usagers</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 12px 18px; background: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: right;">
        <button id="btn-ok-vision" class="btn btn-primary" style="width: auto; padding: 8px 20px; font-size: 12px; font-weight: 700; border-radius: 20px; background: #002B49; border-color: #002B49;">
          Fermer
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);
  const closeModal = () => modalOverlay.remove();
  document.getElementById('close-vision-modal').addEventListener('click', closeModal);
  document.getElementById('btn-ok-vision').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

export function showTeamModal() {
  const oldModal = document.getElementById('team-info-modal');
  if (oldModal) oldModal.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'team-info-modal';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
    z-index: 99999; display: flex; align-items: center; justify-content: center;
    padding: 16px; animation: fadeIn 0.3s ease;
  `;

  modalOverlay.innerHTML = `
    <div style="background: white; border-radius: 18px; width: 100%; max-width: 480px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #002B49, #0A3D62); color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px;">👥</span>
          <div>
            <h3 style="font-size: 15px; font-weight: 800; margin: 0; color: white;">Our Team / Notre Équipe</h3>
            <p style="font-size: 10px; opacity: 0.85; margin: 0;">Fondateurs & Experts PerfECT</p>
          </div>
        </div>
        <button id="close-team-modal" style="background: rgba(255,255,255,0.15); border: none; font-size: 14px; color: white; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>

      <!-- Content -->
      <div style="padding: 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; font-size: 12px; line-height: 1.45; color: #334155;">
        <!-- Founder 1: Dr. Othman Khaled -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: #002B49; color: white; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800;">
              OK
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #002B49;">Dr. Othman Khaled</div>
              <div style="font-size: 10.5px; color: #00A859; font-weight: 700;">Chief Executive Officer (CEO) & Co-fondateur</div>
            </div>
          </div>
          <div style="font-size: 11px; color: #475569; line-height: 1.45;">
            Diplômé en Architecture-Urbanisme avec plus de 12 ans d'expérience dans le pilotage de programmes urbains nationaux et financés par des bailleurs internationaux (Banque Mondiale, UE) dans la région MENA. Spécialiste en planification stratégique et suivi-évaluation (M&E), il a notamment dirigé la mise en place de l'Observatoire Urbain d'Oman, coordonné le programme de développement urbain de la Banque Mondiale en Tunisie et le département <em>Smart Cities</em> de l'ITES.
          </div>
        </div>

        <!-- Founder 2: Mr. Akil Sadkaoui -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: #00A859; color: white; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800;">
              AS
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #002B49;">Mr. Akil Sadkaoui</div>
              <div style="font-size: 10.5px; color: #00A859; font-weight: 700;">Chief Experience Officer (CXO) & Co-fondateur</div>
            </div>
          </div>
          <div style="font-size: 11px; color: #475569; line-height: 1.45;">
            Diplômé en Économie Internationale et coach professionnel certifié (PMP, PCC, ACAC, SMAC) fort de 25+ ans d'expérience comme chef de projet, Directeur de l'Expérience Client, Program Manager et consultant senior en conduite du changement au sein de groupes mondiaux. Très engagé dans le secteur associatif pour l'autonomisation citoyenne.
          </div>
        </div>

        <!-- Associated Experts Network -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 18px;">🌐</span>
            <strong style="color: #002B49; font-size: 12px;">Équipe d'Experts & Partenaires Territoriaux</strong>
          </div>
          <div style="font-size: 11px; color: #475569; line-height: 1.45;">
            Une équipe multidisciplinaire d'ingénieurs de données, d'experts RSE, d'urbanistes, d'évaluateurs certifiés et de correspondants locaux engagés pour la transparence et l'excellence du développement territorial.
          </div>
        </div>

        <div style="text-align: center; padding: 4px 0;">
          <a href="https://sites.google.com/view/perfect-net" target="_blank" style="font-size: 11px; color: #00A859; font-weight: 700; text-decoration: underline;">
            🌐 Visiter le site web officiel : sites.google.com/view/perfect-net
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 12px 18px; background: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: right;">
        <button id="btn-ok-team" class="btn btn-primary" style="width: auto; padding: 8px 20px; font-size: 12px; font-weight: 700; border-radius: 20px; background: #002B49; border-color: #002B49;">
          Fermer
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);
  const closeModal = () => modalOverlay.remove();
  document.getElementById('close-team-modal').addEventListener('click', closeModal);
  document.getElementById('btn-ok-team').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

export function showEventsModal(currentUser = null) {
  const oldModal = document.getElementById('events-info-modal');
  if (oldModal) oldModal.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'events-info-modal';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
    z-index: 99999; display: flex; align-items: center; justify-content: center;
    padding: 16px; animation: fadeIn 0.3s ease;
  `;

  modalOverlay.innerHTML = `
    <div style="background: white; border-radius: 18px; width: 100%; max-width: 480px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #002B49, #0A3D62); color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px;">📅</span>
          <div>
            <h3 style="font-size: 15px; font-weight: 800; margin: 0; color: white;">Our Events / Nos Événements</h3>
            <p style="font-size: 10px; opacity: 0.85; margin: 0;">Ateliers, Démos & Formations Pratiques</p>
          </div>
        </div>
        <button id="close-events-modal" style="background: rgba(255,255,255,0.15); border: none; font-size: 14px; color: white; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>

      <!-- Content -->
      <div style="padding: 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 12px; font-size: 12px; line-height: 1.45; color: #334155;">
        <!-- Event 1: Ateliers OSC -->
        <div style="background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 12px; padding: 14px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 18px;">🎓</span>
            <strong style="color: #166534; font-size: 12.5px;">Ateliers de Formation à l'Évaluation des Performances du Développement</strong>
          </div>
          <div style="font-size: 9.5px; font-weight: 700; color: #00A859; margin-bottom: 6px; text-transform: uppercase;">
            Particulièrement destinés aux Organisations de la Société Civile (OSC)
          </div>
          <div style="font-size: 11px; color: #334155; line-height: 1.45;">
            Formations pratiques et méthodologiques pour outiller les associations, collectifs citoyens et ONG :
            <ul style="margin: 6px 0 0 16px; padding: 0;">
              <li>Collecte de données et crowdsourcing d'indicateurs terrain</li>
              <li>Suivi-évaluation participatif des services publics et privés</li>
              <li>Plaidoyer citoyen structuré basé sur la data sociétale</li>
            </ul>
          </div>
        </div>

        <!-- Event 2: Live Demos -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
            <span style="font-size: 18px;">🖥️</span>
            <strong style="color: #002B49; font-size: 12px;">Live Démos & Découverte Interactive</strong>
          </div>
          <div style="font-size: 11px; color: #475569; line-height: 1.45;">
            Sessions interactives en direct pour explorer la cartographie interactive, les radars d'évaluation et les fiches de reporting standardisées.
          </div>
        </div>

        <!-- Event 3: Onboardings Personnalisés -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
            <span style="font-size: 18px;">🚀</span>
            <strong style="color: #002B49; font-size: 12px;">Onboardings Personnalisés On-Demand</strong>
          </div>
          <div style="font-size: 11px; color: #475569; line-height: 1.45;">
            Accompagnement sur mesure pour les entreprises, municipalités et établissements publics souhaitant intégrer PerfECT dans leur suivi de réputation et d'impact.
          </div>
        </div>

        <!-- Event 4: Tutoriels & Documentation -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
            <span style="font-size: 18px;">📚</span>
            <strong style="color: #002B49; font-size: 12px;">Tutoriels Vidéos & Guides Méthodologiques</strong>
          </div>
          <div style="font-size: 11px; color: #475569; line-height: 1.45;">
            Accès libre et permanent à nos modules d'auto-formation, fiches méthodologiques et bonnes pratiques de notation.
          </div>
        </div>

        <button id="btn-request-events-contact" class="btn btn-primary" style="width: 100%; padding: 11px; font-size: 12px; font-weight: 700; border-radius: 20px; background: #00A859; border-color: #00A859; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span>📝</span> Demander une session ou un atelier
        </button>
      </div>

      <!-- Footer -->
      <div style="padding: 12px 18px; background: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: right;">
        <button id="btn-ok-events" class="btn btn-primary" style="width: auto; padding: 8px 20px; font-size: 12px; font-weight: 700; border-radius: 20px; background: #002B49; border-color: #002B49;">
          Fermer
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);
  const closeModal = () => modalOverlay.remove();
  document.getElementById('close-events-modal').addEventListener('click', closeModal);
  document.getElementById('btn-ok-events').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.getElementById('btn-request-events-contact').addEventListener('click', () => {
    closeModal();
    showWorkshopRequestModal(currentUser);
  });
}

export function showWorkshopRequestModal(currentUser = null) {
  const oldModal = document.getElementById('workshop-request-modal');
  if (oldModal) oldModal.remove();

  const userName = currentUser ? (currentUser.name || currentUser.fullName || '') : '';
  const userEmail = currentUser ? (currentUser.email || '') : '';
  const userOrg = currentUser ? (currentUser.organization || (currentUser.businessProfile && currentUser.businessProfile.companyName) || '') : '';

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'workshop-request-modal';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px);
    z-index: 100000; display: flex; align-items: center; justify-content: center;
    padding: 16px; animation: fadeIn 0.3s ease;
  `;

  modalOverlay.innerHTML = `
    <div style="background: white; border-radius: 18px; width: 100%; max-width: 480px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #00A859, #008444); color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px;">📝</span>
          <div>
            <h3 style="font-size: 15px; font-weight: 800; margin: 0; color: white;">Demande d'Atelier / Événement</h3>
            <p style="font-size: 10px; opacity: 0.9; margin: 0;">Transmettez votre besoin directement à l'équipe PerfECT</p>
          </div>
        </div>
        <button id="close-workshop-req-modal" style="background: rgba(255,255,255,0.2); border: none; font-size: 14px; color: white; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>

      <!-- Form Content -->
      <div style="padding: 18px; overflow-y: auto; flex: 1;">
        <form id="workshop-request-form" style="display: flex; flex-direction: column; gap: 12px; font-size: 12px;">
          <div>
            <label style="display: block; font-weight: 700; color: #002B49; margin-bottom: 4px;">Nom & Prénom *</label>
            <input type="text" id="workshop-req-name" required value="${userName}" placeholder="Votre nom complet" class="form-control" style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1.5px solid #CBD5E1; border-radius: 10px;" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="display: block; font-weight: 700; color: #002B49; margin-bottom: 4px;">Email de contact *</label>
              <input type="email" id="workshop-req-email" required value="${userEmail}" placeholder="votre@email.com" class="form-control" style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1.5px solid #CBD5E1; border-radius: 10px;" />
            </div>
            <div>
              <label style="display: block; font-weight: 700; color: #002B49; margin-bottom: 4px;">Téléphone</label>
              <input type="tel" id="workshop-req-phone" placeholder="+216 ..." class="form-control" style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1.5px solid #CBD5E1; border-radius: 10px;" />
            </div>
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #002B49; margin-bottom: 4px;">Organisation / Société / OSC *</label>
            <input type="text" id="workshop-req-org" required value="${userOrg}" placeholder="Nom de votre organisation, association ou entreprise" class="form-control" style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1.5px solid #CBD5E1; border-radius: 10px;" />
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #002B49; margin-bottom: 4px;">Type d'événement souhaité *</label>
            <select id="workshop-req-type" required class="form-control" style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1.5px solid #CBD5E1; border-radius: 10px; background: white;">
              <option value="Atelier Formation OSC">🎓 Atelier de Formation à l'Évaluation des Performances (OSC)</option>
              <option value="Live Démo Plateforme">🖥️ Live Démo & Présentation guidée de la plateforme</option>
              <option value="Onboarding Entreprise">🚀 Onboarding Personnalisé On-Demand (Entreprise/Collectivité)</option>
              <option value="Autre Session Spécifique">📚 Autre / Programme de formation sur mesure</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #002B49; margin-bottom: 4px;">Message / Besoins & Objectifs *</label>
            <textarea id="workshop-req-msg" rows="3" required placeholder="Décrivez brièvement le nombre de participants prévus, la localisation ou vos attentes particulières..." class="form-control" style="width: 100%; padding: 9px 12px; font-size: 12px; border: 1.5px solid #CBD5E1; border-radius: 10px; resize: vertical;"></textarea>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 6px;">
            <button type="button" id="btn-cancel-workshop-req" class="btn btn-outline" style="flex: 1; padding: 10px; font-size: 12px; font-weight: 700; border-radius: 20px;">
              Annuler
            </button>
            <button type="submit" id="btn-submit-workshop-req" class="btn btn-primary" style="flex: 1.5; padding: 10px; font-size: 12px; font-weight: 700; border-radius: 20px; background: #00A859; border-color: #00A859;">
              🚀 Envoyer la demande
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);
  const closeModal = () => modalOverlay.remove();
  document.getElementById('close-workshop-req-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-workshop-req').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  const form = document.getElementById('workshop-request-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('workshop-req-name').value.trim();
    const email = document.getElementById('workshop-req-email').value.trim();
    const phone = document.getElementById('workshop-req-phone').value.trim();
    const org = document.getElementById('workshop-req-org').value.trim();
    const type = document.getElementById('workshop-req-type').value;
    const msg = document.getElementById('workshop-req-msg').value.trim();

    const submitBtn = document.getElementById('btn-submit-workshop-req');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';

    const reqData = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userName: name,
      userEmail: email,
      userPhone: phone,
      organization: org,
      requestType: type,
      message: msg,
      status: 'En attente',
      createdAt: new Date().toISOString(),
      createdAtSeconds: Math.floor(Date.now() / 1000),
      dateDisplay: new Date().toLocaleString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    try {
      await firestoreSaveWorkshopRequest(reqData);
    } catch (err) {
      console.warn('Error saving workshop request:', err);
    }

    closeModal();

    // Success Toast
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: #002B49; color: white; padding: 14px 22px; border-radius: 14px;
      font-size: 12px; font-weight: 700; z-index: 100000; box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      border-left: 5px solid #00A859; max-width: 90%; text-align: center; animation: fadeIn 0.3s ease;
    `;
    toast.innerHTML = `🎉 <strong>Demande transmise avec succès !</strong><br><span style="font-size:10.5px;opacity:0.9;">Votre demande a été enregistrée dans le Portail Admin PerfECT. Notre équipe vous recontactera rapidement.</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  });
}

