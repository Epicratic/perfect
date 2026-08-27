// PerfECT Application Main Orchestrator & Router

import { translations } from './data/translations.js';
import { initialAppData } from './data/mockData.js';
import { dbStorage, firestoreSaveEvaluation, firestoreLoadEvaluations, firestoreLoadUserEvaluations, firestoreLoadAllUsers, firestoreLoadUserConversations, firestoreLoadWorkshopRequests, firestoreUpdateWorkshopRequestStatus, firestoreGetUserProfile, firestoreUpdateUserProfile } from './config/firebase.js';

import { renderHeaderHTML, renderBottomNavHTML, attachHeaderMenuEvents } from './components/nav.js';
import { renderAuthView, attachAuthEvents } from './modules/auth.js';
import { renderDashboardView, attachDashboardEvents } from './modules/dashboard.js';
import { renderReportingView, attachReportingEvents } from './modules/reporting.js';
import { renderAnalyticsView, attachAnalyticsEvents } from './modules/analytics.js';
import { renderProfilesView, attachProfilesEvents } from './modules/profiles.js';
import { renderPricingView, attachPricingEvents } from './modules/pricing.js';
import { renderAdminView, attachAdminEvents } from './modules/admin.js';
import { renderOnboardingView, attachOnboardingEvents } from './modules/onboarding.js';

class PerfECTApp {
  constructor() {
    // ── Purge stale mock/local data from previous versions ───────────────────
    // evaluations and topActors must come exclusively from Firestore.
    // Clear any cached values that may have been stored from old mock data.
    try {
      const storageKey = "PERFECT_NET_DATABASE_V1";
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        let dirty = false;
        if (parsed.evaluations && parsed.evaluations.length > 0) {
          parsed.evaluations = [];
          dirty = true;
        }
        if (parsed.topActors && parsed.topActors.length > 0) {
          parsed.topActors = [];
          dirty = true;
        }
        if (parsed.recentEvaluations && parsed.recentEvaluations.some(e => e.timeAgo === "À l'instant")) {
          parsed.recentEvaluations = parsed.recentEvaluations.filter(e => e.timeAgo !== "À l'instant");
          dirty = true;
        }
        if (dirty) {
          localStorage.setItem(storageKey, JSON.stringify(parsed));
          console.log("Purged stale mock data from localStorage.");
        }
      }
    } catch (e) {
      console.warn("Could not purge localStorage:", e);
    }

    // Load initial or persisted state
    this.appState = {
      lang: 'fr',
      activeTab: 'login', // Default screen on app open / install
      authMode: 'login', // 'login' or 'register'
      selectedCountry: 'TN', // Default country: Tunisie
      isLoggedIn: false, // Must authenticate first
      role: 'user',
      currentUser: null, // Set after login/registration
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
      tab,
      this.appState.currentUser || null
    );
    
    // Attach Header Menu & Modals Events
    attachHeaderMenuEvents(this.headerMount, this.appState.currentUser || null);

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
          (userPayload) => {
          // Store the full logged-in user object in appState
            this.appState.isLoggedIn = true;
            this.appState.role = (typeof userPayload === 'string') ? userPayload : (userPayload.role || 'contributeur');
            this.appState.currentUser = (typeof userPayload === 'object') ? userPayload : null;

            // Add newly registered user to adminStats.contributors if not already present
            if (this.appState.currentUser && this.appState.data && this.appState.data.adminStats) {
              const contrib = this.appState.data.adminStats.contributors || [];
              const alreadyExists = contrib.some(c => c.id === this.appState.currentUser.id || c.email === this.appState.currentUser.email);
              if (!alreadyExists) {
                this.appState.data.adminStats.contributors = [this.appState.currentUser, ...contrib];
                dbStorage.saveState(this.appState.data);
              }
            }

            // Load real evaluations and conversations from Firestore and replace mock data
            const userEmail = this.appState.currentUser && this.appState.currentUser.email;
            const selectedCountry = (this.appState.data && this.appState.data.selectedCountry) || 'Tunisia';

            Promise.all([
              firestoreLoadEvaluations(selectedCountry),
              userEmail ? firestoreLoadUserEvaluations(userEmail) : Promise.resolve([]),
              userEmail ? firestoreLoadUserConversations(userEmail).catch(() => []) : Promise.resolve([])
            ]).then(([countryEvals, userEvals]) => {
              if (countryEvals && countryEvals.length > 0) {
                this.appState.data.recentEvaluations = countryEvals;
              } else {
                // No real evals yet for this country — clear mock ones
                this.appState.data.recentEvaluations = [];
              }
              this.appState.currentUserEvals = userEvals || [];
              this.render();
            }).catch(err => {
              console.warn('Could not load evaluations from Firestore:', err);
              this.appState.data.recentEvaluations = [];
              this.appState.currentUserEvals = [];
              this.render();
            });

            const isBusinessUser = this.appState.role === 'entreprise';
            const needsOnboarding = isBusinessUser && (!this.appState.currentUser || !this.appState.currentUser.onboardingComplete);
            
            if (needsOnboarding) {
              this.navigateTo('onboarding');
            } else {
              this.navigateTo('dashboard');
            }
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
        // Load all registered users in background to enable custom avatar display in Top 10
        if (!this.appState.allUsersLoaded) {
          firestoreLoadAllUsers().then(users => {
            if (users && users.length > 0) {
              this.appState.allUsers = users;
              this.appState.allUsersLoaded = true;
              // Re-render dashboard silently to update avatars if we're still on dashboard
              if (this.appState.activeTab === 'dashboard') {
                this.render();
              }
            }
          }).catch(() => {});
        }
        attachDashboardEvents(
          this.bodyMount,
          (country) => {
            this.appState.selectedCountry = country;
            if (this.appState.data) {
              this.appState.data.selectedCountry = (country === 'TN' || country === 'Tunisia') ? 'Tunisia' : country;
            }
            const countryName = (country === 'TN' || country === 'Tunisia') ? 'Tunisia' : country;
            firestoreLoadEvaluations(countryName).then(realEvals => {
              if (realEvals && realEvals.length > 0) {
                this.appState.data.recentEvaluations = realEvals;
              } else {
                this.appState.data.recentEvaluations = [];
              }
              this.render();
            }).catch(() => {
              this.render();
            });
          },
          (sector) => {
            this.appState.selectedSector = sector;
            this.navigateTo('reporting');
          },
          (targetTab) => {
            this.navigateTo(targetTab);
          },
          this.appState,
          () => this.render()
        );
        break;

      case 'reporting':
        bodyHTML = renderReportingView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        attachReportingEvents(this.bodyMount, this.appState, translations, (newEval) => {
          // Save ONLY to Firestore — do NOT call dbStorage.addEvaluation to prevent duplicate records
          const targetCountry = (newEval && newEval.country) ? newEval.country : (this.appState.data.selectedCountry || "Tunisia");
          firestoreSaveEvaluation(newEval).then(evalId => {
            console.log("Evaluation synced to Firestore with ID:", evalId);
            // Reload canonical list from Firestore (this is the single source of truth)
            return firestoreLoadEvaluations(targetCountry);
          }).then(realEvals => {
            if (realEvals && realEvals.length > 0) {
              this.appState.data.recentEvaluations = realEvals;
            }
            this.render();
          }).catch(err => {
            console.warn("Firestore sync error:", err);
          });

          // Also reload user's own evaluations if logged in
          const userEmail = this.appState.currentUser && this.appState.currentUser.email;
          if (userEmail) {
            firestoreLoadUserEvaluations(userEmail).then(userEvals => {
              this.appState.currentUserEvals = userEvals;
            });
          }

          // Navigate back to Dashboard to see updated results
          this.navigateTo('dashboard');
        });
        break;

      case 'analytics':
        bodyHTML = renderAnalyticsView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        attachAnalyticsEvents(this.bodyMount, this.appState, () => this.render());
        break;

      case 'profiles': {
        const profileUserEmail = this.appState.currentUser && this.appState.currentUser.email;
        const profileUserId = this.appState.currentUser && (this.appState.currentUser.uid || this.appState.currentUser.id);

        const _doRenderProfile = () => {
          // Sync currentUser with latest status from contributors list if present
          if (this.appState.currentUser && this.appState.data && this.appState.data.adminStats && this.appState.data.adminStats.contributors) {
            const contrib = this.appState.data.adminStats.contributors.find(
              c => (profileUserId && (c.id === profileUserId || c.uid === profileUserId)) || (profileUserEmail && c.email === profileUserEmail)
            );
            if (contrib) {
              if (typeof contrib.isVerified === 'boolean') this.appState.currentUser.isVerified = contrib.isVerified;
              if (typeof contrib.verificationPending === 'boolean') this.appState.currentUser.verificationPending = contrib.verificationPending;
              if (typeof contrib.expertApproved === 'boolean') this.appState.currentUser.expertApproved = contrib.expertApproved;
              if (typeof contrib.expertRequested === 'boolean') this.appState.currentUser.expertRequested = contrib.expertRequested;
              if (contrib.avatarBase64) this.appState.currentUser.avatarBase64 = contrib.avatarBase64;
            }
          }

          bodyHTML = renderProfilesView(this.appState, translations);
          this.bodyMount.innerHTML = bodyHTML;
          attachProfilesEvents(
            this.bodyMount,
            this.appState,
            () => this.render(),
            // onExpertRequest
            () => {
              const currentUserId = (this.appState.currentUser && (this.appState.currentUser.uid || this.appState.currentUser.id)) || null;
              if (this.appState.data && this.appState.data.adminStats) {
                const contrib = this.appState.data.adminStats.contributors.find(
                  c => currentUserId ? (c.id === currentUserId || c.uid === currentUserId || c.email === (this.appState.currentUser && this.appState.currentUser.email)) : false
                );
                if (contrib && !contrib.expertApproved) {
                  contrib.expertRequested = true;
                  dbStorage.saveState(this.appState.data);
                }
              }
              this.render();
            },
            // onNavigate
            (targetTab) => this.navigateTo(targetTab),
            // onLogout
            () => {
              this.appState.isLoggedIn = false;
              this.appState.currentUser = null;
              this.appState.role = 'user';
              this.navigateTo('login');
            }
          );
        };

        const promises = [];
        const selectedCountry = this.appState.selectedCountry || 'TN';
        promises.push(firestoreLoadEvaluations(selectedCountry).then(countryEvals => {
          if (countryEvals && countryEvals.length > 0) {
            this.appState.data.recentEvaluations = countryEvals;
          }
        }).catch(() => {}));

        if (profileUserEmail) {
          promises.push(firestoreLoadUserEvaluations(profileUserEmail).then(userEvals => {
            if (userEvals && userEvals.length > 0) {
              this.appState.currentUserEvals = userEvals;
            }
          }).catch(() => {}));
          promises.push(firestoreLoadUserConversations(profileUserEmail).catch(() => []));
        }
        if (profileUserId) {
          promises.push(firestoreGetUserProfile(profileUserId).then(freshProfile => {
            if (freshProfile && this.appState.currentUser) {
              if (typeof freshProfile.isVerified === 'boolean') this.appState.currentUser.isVerified = freshProfile.isVerified;
              if (typeof freshProfile.verificationPending === 'boolean') this.appState.currentUser.verificationPending = freshProfile.verificationPending;
              if (typeof freshProfile.expertApproved === 'boolean') this.appState.currentUser.expertApproved = freshProfile.expertApproved;
              if (typeof freshProfile.expertRequested === 'boolean') this.appState.currentUser.expertRequested = freshProfile.expertRequested;
              if (freshProfile.avatarBase64) this.appState.currentUser.avatarBase64 = freshProfile.avatarBase64;
              if (freshProfile.photoURL) this.appState.currentUser.photoURL = freshProfile.photoURL;
            }
          }).catch(() => {}));
        }

        Promise.all(promises).then(() => _doRenderProfile()).catch(() => _doRenderProfile());
        break;
      }

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
        // Load real users and workshop requests from Firestore
        Promise.all([
          firestoreLoadAllUsers(),
          firestoreLoadWorkshopRequests()
        ]).then(([firestoreUsers, firestoreRequests]) => {
          if (firestoreUsers && firestoreUsers.length > 0) {
            const existing = this.appState.data.adminStats.contributors || [];
            const merged = [];
            firestoreUsers.forEach(fu => {
              const prev = existing.find(c => (fu.id && (c.id === fu.id || c.uid === fu.id)) || (fu.uid && (c.id === fu.uid || c.uid === fu.uid)) || (fu.email && c.email === fu.email));
              
              const isVerified = (prev && typeof prev.isVerified === 'boolean') ? prev.isVerified : Boolean(fu.isVerified);
              const verificationPending = isVerified ? false : ((prev && typeof prev.verificationPending === 'boolean') ? prev.verificationPending : Boolean(fu.verificationPending));
              const expertApproved = (prev && typeof prev.expertApproved === 'boolean') ? prev.expertApproved : Boolean(fu.expertApproved);
              const expertRequested = (prev && typeof prev.expertRequested === 'boolean') ? prev.expertRequested : Boolean(fu.expertRequested);
              const status = (prev && prev.status) ? prev.status : (fu.status || 'Active');

              merged.push({
                ...fu,
                ...(prev || {}),
                isVerified,
                verificationPending,
                expertApproved,
                expertRequested,
                status,
                idDocBase64: (prev && prev.idDocBase64) || fu.idDocBase64 || null,
                idDocName: (prev && prev.idDocName) || fu.idDocName || null,
                idDocType: (prev && prev.idDocType) || fu.idDocType || null,
                idDocDate: (prev && prev.idDocDate) || fu.idDocDate || null
              });
            });

            // Also keep any local contributor not in firestoreUsers
            existing.forEach(ex => {
              const already = merged.some(m => (m.id && (m.id === ex.id || m.uid === ex.id)) || (m.uid && (m.id === ex.uid || m.uid === ex.uid)) || (m.email && m.email === ex.email));
              if (!already) merged.push(ex);
            });

            this.appState.data.adminStats.contributors = merged;
            // Also store globally for avatar lookups on other views
            this.appState.allUsers = merged;
            this.appState.allUsersLoaded = true;
          }

          if (firestoreRequests && firestoreRequests.length >= 0) {
            this.appState.data.adminStats.workshopRequests = firestoreRequests;
          }

          bodyHTML = renderAdminView(this.appState, translations);
          this.bodyMount.innerHTML = bodyHTML;
          attachAdminEvents(
            this.bodyMount,
            this.appState,
            // onToggleUserStatus
            (userId) => {
              const user = this.appState.data.adminStats.contributors.find(c => c.id === userId || c.uid === userId);
              if (user) {
                user.status = user.status === 'Active' ? 'Inactive' : 'Active';
                dbStorage.saveState(this.appState.data);
                firestoreUpdateUserProfile(userId, { status: user.status });
                this.render();
              }
            },
            // onToggleExpertApproval
            (userId) => {
              const user = this.appState.data.adminStats.contributors.find(c => c.id === userId || c.uid === userId);
              if (user && user.role && !user.role.toLowerCase().includes('entreprise')) {
                user.expertApproved = !user.expertApproved;
                if (user.expertApproved) {
                  user.expertRequested = true;
                }
                dbStorage.saveState(this.appState.data);
                firestoreUpdateUserProfile(userId, { expertApproved: user.expertApproved, expertRequested: user.expertRequested });
                this.render();
              }
            },
            // onAdminLoginSuccess
            () => {
              this.appState.isAdminAuthenticated = true;
              this.render();
            },
            // onAdminLogout
            () => {
              this.appState.isAdminAuthenticated = false;
              this.render();
            },
            // onAdminBackToAuth
            () => {
              this.navigateTo('login');
            },
            // onToggleVerifyId — confirms or updates identity verification for a user
            (userId, forceState) => {
              const user = this.appState.data.adminStats.contributors.find(c => c.id === userId || c.uid === userId);
              if (user) {
                if (typeof forceState === 'boolean') {
                  user.isVerified = forceState;
                } else {
                  user.isVerified = !user.isVerified;
                }
                if (user.isVerified) {
                  user.verificationPending = false;
                }
                dbStorage.saveState(this.appState.data);

                // If the verified user is currently logged in, update their session too
                if (this.appState.currentUser &&
                    (this.appState.currentUser.id === userId || this.appState.currentUser.uid === userId || this.appState.currentUser.email === user.email)) {
                  this.appState.currentUser.isVerified = user.isVerified;
                  this.appState.currentUser.verificationPending = user.verificationPending;
                }

                // Render immediately so lamp and toggle update to green
                this.render();

                // Sync to Firestore
                firestoreUpdateUserProfile(userId, {
                  isVerified: user.isVerified,
                  verificationPending: user.verificationPending
                }).catch(e => console.warn("Firestore update error:", e));
              }
            },
            // onToggleWorkshopStatus
            (reqId, newStatus) => {
              const reqs = this.appState.data.adminStats.workshopRequests || [];
              const targetReq = reqs.find(r => r.id === reqId);
              if (targetReq) {
                targetReq.status = newStatus;
                dbStorage.saveState(this.appState.data);
                firestoreUpdateWorkshopRequestStatus(reqId, newStatus);
                this.render();
              }
            }
          );
        }).catch(() => {
          // Fallback if Firestore unreachable: render with current contributors
          bodyHTML = renderAdminView(this.appState, translations);
          this.bodyMount.innerHTML = bodyHTML;
        });
        break;

      case 'onboarding':
        bodyHTML = renderOnboardingView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        attachOnboardingEvents(this.bodyMount, this.appState, translations, (updatedUser) => {
          if (updatedUser) this.appState.currentUser = updatedUser;
          this.navigateTo('dashboard');
        });
        break;

      default:
        bodyHTML = renderDashboardView(this.appState, translations);
        this.bodyMount.innerHTML = bodyHTML;
        attachDashboardEvents(this.bodyMount, (country) => {
          this.appState.selectedCountry = country;
          this.render();
        });
        break;
    }

    // Render Bottom Nav Bar (Hide on login, onboarding, and admin screens)
    if (tab === 'login' || tab === 'onboarding' || tab === 'admin') {
      this.navMount.innerHTML = '';
      this.navMount.style.display = 'none';
    } else {
      this.navMount.style.display = 'block';
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

  showRatingSuccessModal() {
    // Remove existing modal if any
    const oldModal = document.getElementById('rating-success-modal');
    if (oldModal) oldModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'rating-success-modal';
    modalOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      padding: 20px; animation: fadeIn 0.3s ease;
    `;

    modalOverlay.innerHTML = `
      <div style="background: white; border-radius: 24px; padding: 28px 22px; width: 100%; max-width: 360px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid #E2E8F0;">
        <div style="width: 64px; height: 64px; background: #E6F7EF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; font-size: 32px; box-shadow: 0 4px 12px rgba(0, 168, 89, 0.2);">
          🎉
        </div>
        <h3 style="font-size: 18px; font-weight: 800; color: #002B49; margin-bottom: 10px;">Évaluation Enregistrée !</h3>
        <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 22px; font-weight: 500;">
          Votre évaluation a bien été enregistrée. Merci pour votre contribution et à la prochaine !
        </p>
        <button id="modal-ok-btn" style="width: 100%; padding: 12px; background: #00A859; color: white; border: none; border-radius: 14px; font-size: 14px; font-weight: 800; cursor: pointer; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(0, 168, 89, 0.35);">
          OK
        </button>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    document.getElementById('modal-ok-btn').addEventListener('click', () => {
      modalOverlay.remove();
      this.navigateTo('dashboard');
    });
  }
}

// Start Application safely when DOM is ready
function startPerfECTApp() {
  try {
    if (!window.appInstance) {
      window.appInstance = new PerfECTApp();
      console.log('PerfECT App initialized successfully!');
    }
  } catch (err) {
    console.error('Fatal initialization error:', err);
    const mount = document.getElementById('app-body-mount') || document.body;
    if (mount) {
      mount.innerHTML = `
        <div style="padding: 30px; text-align: center; color: #002B49; font-family: sans-serif;">
          <h2 style="color: #EA5455; font-size: 18px; font-weight: 800;">⚠️ Erreur de démarrage</h2>
          <p style="font-size: 12px; color: #64748B; margin-top: 8px;">${err.message || err}</p>
          <button onclick="location.reload()" style="margin-top: 16px; padding: 10px 20px; background: #00A859; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Réessayer</button>
        </div>
      `;
    }
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  startPerfECTApp();
} else {
  document.addEventListener('DOMContentLoaded', startPerfECTApp);
}

