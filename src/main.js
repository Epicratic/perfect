// PerfECT Application Main Orchestrator & Router

import { translations } from './data/translations.js';
import { initialAppData } from './data/mockData.js';
import { dbStorage } from './config/firebase.js';

import { renderHeaderHTML, renderBottomNavHTML } from './components/nav.js';
import { renderAuthView, attachAuthEvents } from './modules/auth.js';
import { renderDashboardView, attachDashboardEvents } from './modules/dashboard.js';
import { renderReportingView, attachReportingEvents } from './modules/reporting.js';
import { renderAnalyticsView, attachAnalyticsEvents } from './modules/analytics.js';
import { renderProfilesView } from './modules/profiles.js';
import { renderPricingView, attachPricingEvents } from './modules/pricing.js';
import { renderAdminView, attachAdminEvents } from './modules/admin.js';

class PerfECTApp {
  constructor() {
    // Load initial or persisted state
    this.appState = {
      lang: 'fr',
      activeTab: 'dashboard',
      authMode: 'login', // 'login' or 'register'
      selectedCountry: 'SN', // Default country
      isLoggedIn: true,
      role: 'user',
      isAnnualBilling: false,
      data: dbStorage.loadState(initialAppData)
    };

    this.headerMount = document.getElementById('app-header-mount');
    this.bodyMount = document.getElementById('app-body-mount');
    this.navMount = document.getElementById('app-nav-mount');
    this.desktopSelect = document.getElementById('desktop-screen-switcher');
    this.screenNameTag = document.getElementById('preview-active-screen-name');
    this.shellEl = document.getElementById('mobile-app-shell');

    this.init();
  }

  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 30000);

    // Desktop Screen Switcher Listener
    if (this.desktopSelect) {
      this.desktopSelect.addEventListener('change', (e) => {
        this.navigateTo(e.target.value);
      });
    }

    this.render();
  }

  updateClock() {
    const clock = document.getElementById('clock-time');
    if (clock) {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  setLanguage(langCode) {
    this.appState.lang = langCode;
    const isRTL = langCode === 'ar';

    // Apply RTL direction to root and shell if Arabic
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('data-lang', langCode);
    
    if (isRTL) {
      this.shellEl.classList.add('lang-ar');
    } else {
      this.shellEl.classList.remove('lang-ar');
    }

    this.render();
  }

  navigateTo(tabId) {
    this.appState.activeTab = tabId;
    if (this.desktopSelect) this.desktopSelect.value = tabId;

    const screenNames = {
      login: "Connexion / Auth",
      dashboard: "Tableau Général",
      reporting: "Fiche de Reporting",
      analytics: "Tableau Détaillé",
      profiles: "Profil Utilisateur",
      pricing: "Plans & Tarifs",
      admin: "Portail Admin"
    };

    if (this.screenNameTag) {
      this.screenNameTag.textContent = screenNames[tabId] || tabId;
    }

    this.render();
  }

  render() {
    const lang = this.appState.lang;
    const t = translations[lang] || translations.fr;
    const tab = this.appState.activeTab;

    // Render Header with isLoggedIn check
    this.headerMount.innerHTML = renderHeaderHTML(
      lang, 
      translations, 
      this.appState.role, 
      this.appState.isLoggedIn, 
      tab
    );
    
    // Header Language Select Event
    const langSelect = this.headerMount.querySelector('#header-lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => this.setLanguage(e.target.value));
    }

    // Profile Avatar Button Event
    const profileAvatarBtn = this.headerMount.querySelector('#header-profile-btn');
    if (profileAvatarBtn) {
      profileAvatarBtn.addEventListener('click', () => this.navigateTo('profiles'));
    }

    // Render Main Screen Body
    let bodyHTML = '';

    switch (tab) {
      case 'login':
        bodyHTML = renderAuthView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        attachAuthEvents(this.bodyMount, 
          (role) => {
            this.appState.isLoggedIn = true;
            this.appState.role = role;
            this.navigateTo('dashboard');
          },
          () => {
            this.appState.isLoggedIn = true;
            this.appState.role = 'admin';
            this.navigateTo('admin');
          },
          (newMode) => {
            this.appState.authMode = newMode;
            this.render();
          }
        );
        break;

      case 'dashboard':
        bodyHTML = renderDashboardView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        attachDashboardEvents(
          this.bodyMount, 
          (targetTab) => this.navigateTo(targetTab),
          (selectedCountry) => {
            this.appState.selectedCountry = selectedCountry;
            this.render();
          }
        );
        break;

      case 'reporting':
        bodyHTML = renderReportingView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        attachReportingEvents(this.bodyMount, this.appState, translations, (newEval) => {
          this.appState.data = dbStorage.addEvaluation(this.appState.data, newEval);
          if (window.confetti) {
            window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }
          alert(t.formSuccessMsg);
          this.navigateTo('dashboard');
        });
        break;

      case 'analytics':
        bodyHTML = renderAnalyticsView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        attachAnalyticsEvents(this.bodyMount, this.appState, () => this.render());
        break;

      case 'profiles':
        bodyHTML = renderProfilesView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        break;

      case 'pricing':
        bodyHTML = renderPricingView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        attachPricingEvents(this.bodyMount, 
          () => {
            this.appState.isAnnualBilling = !this.appState.isAnnualBilling;
            this.render();
          },
          (planName) => {
            alert(`Plan ${planName} sélectionné !`);
          }
        );
        break;

      case 'admin':
        bodyHTML = renderAdminView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        attachAdminEvents(this.bodyMount, (userId) => {
          const user = this.appState.data.adminStats.contributors.find(c => c.id === userId);
          if (user) {
            user.status = user.status === 'Active' ? 'Inactive' : 'Active';
            dbStorage.saveState(this.appState.data);
            this.render();
          }
        });
        break;

      default:
        bodyHTML = renderDashboardView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        break;
    }

    // Render Bottom Nav Bar (Hide if on login screen)
    if (tab === 'login') {
      this.navMount.innerHTML = '';
    } else {
      this.navMount.innerHTML = renderBottomNavHTML(tab, t);
      
      // Bottom Nav Click Listeners
      const navBtns = this.navMount.querySelectorAll('.nav-item-btn');
      navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-tab');
          this.navigateTo(targetTab);
        });
      });
    }
  }
}

// Start Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new PerfECTApp();
});
