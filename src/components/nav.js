// Header & Navigation Components

export function renderHeaderHTML(currentLang, translations, activeRole = "user", isLoggedIn = true, activeTab = "dashboard") {
  const t = translations[currentLang] || translations.fr;
  const showProfileAvatar = isLoggedIn && activeTab !== 'login';

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
          <div id="header-profile-btn" class="user-avatar-btn" title="${t.profileTitle}">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" alt="Avatar" />
          </div>
        ` : ''}
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
