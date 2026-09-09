// PerfECT Application Main Orchestrator & Router

import { translations } from './data/translations.js';
import { initialAppData } from './data/mockData.js';
import { dbStorage, firestoreSaveEvaluation, firestoreLoadEvaluations, firestoreLoadUserEvaluations, firestoreLoadAllUsers, firestoreLoadUserConversations, firestoreLoadWorkshopRequests, firestoreUpdateWorkshopRequestStatus, firestoreGetUserProfile, firestoreUpdateUserProfile, firestoreSaveFcmToken } from './config/firebase.js';

import { renderHeaderHTML, renderBottomNavHTML, attachHeaderMenuEvents } from './components/nav.js';
import { renderAuthView, attachAuthEvents } from './modules/auth.js';
import { renderDashboardView, attachDashboardEvents } from './modules/dashboard.js';
import { renderReportingView, attachReportingEvents } from './modules/reporting.js';
import { renderAnalyticsView, attachAnalyticsEvents } from './modules/analytics.js';
import { renderProfilesView, attachProfilesEvents, showChatConversationModal } from './modules/profiles.js';
import { renderPricingView, attachPricingEvents } from './modules/pricing.js';
import { renderAdminView, attachAdminEvents } from './modules/admin.js';
import { renderOnboardingView, attachOnboardingEvents } from './modules/onboarding.js';

// ── Workflow Progression Notification Engine ────────────────────────────────
const WORKFLOW_STEPS_LABELS = {
  1: "Demande reçue et enregistrée",
  2: "Examen et vérification en cours",
  3: "Plan d'action et mesures correctives engagées",
  4: "Mise en œuvre des résolutions sur le terrain",
  5: "Demande traitée et clôturée avec succès"
};

function showInAppWorkflowNotification(title, body) {
  const existing = document.getElementById('workflow-notif-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'workflow-notif-banner';
  banner.style.cssText = `
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
    background: #002B49; color: #FFFFFF; padding: 14px 18px; border-radius: 16px;
    font-size: 12px; font-weight: 700; z-index: 999999; box-shadow: 0 10px 30px rgba(0,0,0,0.45);
    border: 1.5px solid #00A859; width: calc(100% - 32px); max-width: 420px;
    animation: slideDown 0.3s ease; display: flex; align-items: flex-start; gap: 12px;
  `;
  banner.innerHTML = `
    <div style="background: #00A859; color: white; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,168,89,0.4);">
      🔔
    </div>
    <div style="flex: 1;">
      <div style="font-size: 12px; font-weight: 800; color: #FFFFFF; margin-bottom: 3px;">${title}</div>
      <div style="font-size: 11px; font-weight: 500; color: #E2E8F0; line-height: 1.4;">${body}</div>
    </div>
    <button style="background: transparent; border: none; color: #94A3B8; font-size: 16px; cursor: pointer; padding: 0 4px;" onclick="this.parentElement.remove()">✕</button>
  `;
  document.body.appendChild(banner);
  setTimeout(() => {
    if (banner && banner.parentElement) {
      banner.style.opacity = '0';
      banner.style.transition = 'opacity 0.4s ease';
      setTimeout(() => banner.remove(), 400);
    }
  }, 9000);
}

export function checkWorkflowStepUpdates(evalsList, userEmail) {
  if (!evalsList || !userEmail) return;
  const userEvals = evalsList.filter(e => e && e.authorEmail && e.authorEmail.trim().toLowerCase() === userEmail.trim().toLowerCase());
  if (userEvals.length === 0) return;

  let knownSteps = {};
  try {
    const raw = localStorage.getItem("PERFECT_KNOWN_WORKFLOW_STEPS_V1");
    if (raw) knownSteps = JSON.parse(raw);
  } catch (e) {}

  const isFirstTime = Object.keys(knownSteps).length === 0;

  userEvals.forEach(ev => {
    if (!ev || !ev.id) return;
    const currentStep = parseInt(ev.workflowStep || 0);
    const prevStep = knownSteps[ev.id];

    if (!isFirstTime && typeof prevStep === 'number' && currentStep > prevStep && currentStep > 0) {
      const stepDesc = WORKFLOW_STEPS_LABELS[currentStep] || `Étape ${currentStep}/5`;
      const entity = ev.targetEntity || 'Établissement';
      const sub = ev.subSector || ev.mesoSector || ev.sector || '';
      const kpi = ev.kpi || ev.indicatorType || ev.type || '';
      const note = ev.rating ? ` (${parseFloat(ev.rating).toFixed(1)}/5)` : '';
      const meta = sub ? (kpi ? ` • ${sub} - ${kpi}${note}` : ` • ${sub}${note}`) : '';

      const title = `🏛️ ${entity} a mis à jour votre demande`;
      const body = `Étape ${currentStep}/5 : ${stepDesc}${meta}`;

      // Set highlighted evaluation in state
      if (window.perfApp && window.perfApp.appState) {
        window.perfApp.appState.highlightedEvalId = ev.id;
        if (window.perfApp.appState.activeTab === 'profiles') {
          window.perfApp.render();
        }
      }

      // 1. Android Native System Notification
      if (window.AndroidNative && typeof window.AndroidNative.showNotification === 'function') {
        try {
          window.AndroidNative.showNotification(title, body, JSON.stringify({ evalId: ev.id, step: currentStep, targetEntity: entity }));
        } catch (e) {
          console.warn("Android native notification error:", e);
        }
      }

      // 2. Web Notification API fallback
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon: './assets/icons/icon-192.png' });
        } catch (e) {}
      }

      // 3. In-App Banner
      showInAppWorkflowNotification(title, body);
    }

    knownSteps[ev.id] = currentStep;
  });

  try {
    localStorage.setItem("PERFECT_KNOWN_WORKFLOW_STEPS_V1", JSON.stringify(knownSteps));
  } catch (e) {}
}

// ── Enterprise In-App New Evaluation Notification Engine ──────────────────────
export function showInAppNewEvaluationNotification(title, body, evalId) {
  const existing = document.getElementById('new-eval-notif-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'new-eval-notif-banner';
  banner.style.cssText = `
    position: fixed;
    top: 64px;
    left: 12px;
    right: 12px;
    background: linear-gradient(135deg, #002B49 0%, #007A3D 100%);
    color: #FFFFFF;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0, 43, 73, 0.4), 0 0 0 1.5px rgba(0, 168, 89, 0.5);
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 999999;
    cursor: pointer;
    animation: slideDownInApp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    transition: opacity 0.3s, transform 0.3s;
  `;

  banner.innerHTML = `
    <div style="font-size: 26px; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">⭐</div>
    <div style="flex: 1; min-width: 0;">
      <div style="font-size: 11px; font-weight: 800; color: #86EFAC; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
        Nouvelle évaluation reçue
      </div>
      <div style="font-size: 12px; font-weight: 700; color: #FFFFFF; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${title}
      </div>
      <div style="font-size: 11px; color: #E2E8F0; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${body}
      </div>
    </div>
    <div style="font-size: 18px; opacity: 0.7; padding: 4px; flex-shrink: 0;">✕</div>
  `;

  banner.addEventListener('click', (e) => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-10px)';
    setTimeout(() => banner.remove(), 300);

    if (e.target && e.target.innerText === '✕') return;

    const app = window.perfApp;
    if (app) {
      app.appState.highlightedEvalId = evalId;
      if (app.appState.activeTab === 'profiles') {
        app.render();
      } else {
        app.navigateTo('profiles');
      }
    }
  });

  document.body.appendChild(banner);

  setTimeout(() => {
    if (banner && banner.parentElement) {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-10px)';
      setTimeout(() => banner.remove(), 300);
    }
  }, 8000);
}

export function checkNewEnterpriseEvaluationUpdates(evalsList, currentUser) {
  if (!evalsList || !currentUser) return;

  const isEnterprise = Boolean(currentUser.businessProfile) || (currentUser.role && currentUser.role.toLowerCase().includes('entreprise'));
  if (!isEnterprise) return;

  const bProfile = currentUser.businessProfile || {};
  const entName = (bProfile.actorName || currentUser.name || '').trim();
  const entEmail = (currentUser.email || '').trim().toLowerCase();
  if (!entName && !entEmail) return;

  const normStr = (s) => !s ? '' : String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').trim();
  const targetNorm = normStr(entName);

  const targetedEvals = evalsList.filter(e => {
    if (!e) return false;
    if (e.authorEmail && e.authorEmail.trim().toLowerCase() === entEmail) return false;

    const eEntEmail = (e.enterpriseEmail || '').trim().toLowerCase();
    if (entEmail && eEntEmail && eEntEmail === entEmail) return true;

    const eTarget = normStr(e.targetEntity || e.actorName || e.entity || '');
    return eTarget && targetNorm && (eTarget === targetNorm || eTarget.includes(targetNorm) || targetNorm.includes(eTarget));
  });

  const storageKey = `PERFECT_KNOWN_PRO_EVALS_${entEmail || targetNorm}`;
  let knownEvals = {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) knownEvals = JSON.parse(raw);
  } catch (e) {}

  const isFirstTime = Object.keys(knownEvals).length === 0;

  targetedEvals.forEach(ev => {
    if (!ev || !ev.id) return;
    const isNew = !knownEvals[ev.id];

    if (!isFirstTime && isNew) {
      const author = ev.authorName || ev.author || 'Un contributeur';
      const ratingNum = parseFloat(ev.rating) || 0;
      const sector = ev.subSector || ev.mesoSector || ev.sectorName || ev.sector || 'Gouvernance';
      const kpi = ev.kpi || ev.indicatorType || ev.type || '';
      const kpiText = kpi ? ` • ${kpi}` : '';
      const shortComment = (ev.comment && ev.comment.trim())
        ? `"${ev.comment.trim().substring(0, 70)}${ev.comment.length > 70 ? '...' : ''}"`
        : 'Évaluation partagée.';

      const title = `⭐ Nouvelle évaluation reçue de ${author}`;
      const body = `Note : ${ratingNum.toFixed(1)}/5 • ${sector}${kpiText} — ${shortComment}`;

      if (window.perfApp && window.perfApp.appState) {
        window.perfApp.appState.highlightedEvalId = ev.id;
        if (window.perfApp.appState.activeTab === 'profiles') {
          window.perfApp.render();
        }
      }

      if (window.AndroidNative && typeof window.AndroidNative.showNotification === 'function') {
        try {
          window.AndroidNative.showNotification(title, body, JSON.stringify({ type: 'new_eval', evalId: ev.id, authorName: author }));
        } catch (e) {
          console.warn("Android native notification error:", e);
        }
      }

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon: './assets/icons/icon-192.png' });
        } catch (e) {}
      }

      showInAppNewEvaluationNotification(title, body, ev.id);
    }

    knownEvals[ev.id] = true;
  });

  try {
    localStorage.setItem(storageKey, JSON.stringify(knownEvals));
  } catch (e) {}
}

// ── Real-Time Messaging Notification Engine ──────────────────────────────────
export function showInAppMessageNotification(title, body, convId) {
  const existing = document.getElementById('message-notif-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'message-notif-banner';
  banner.style.cssText = `
    position: fixed;
    top: 64px;
    left: 12px;
    right: 12px;
    background: linear-gradient(135deg, #002B49 0%, #1E3A8A 100%);
    color: #FFFFFF;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0, 43, 73, 0.4), 0 0 0 1.5px rgba(59, 130, 246, 0.5);
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 999999;
    cursor: pointer;
    animation: slideDownInApp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    transition: opacity 0.3s, transform 0.3s;
  `;

  banner.innerHTML = `
    <div style="font-size: 26px; flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">💬</div>
    <div style="flex: 1; min-width: 0;">
      <div style="font-size: 11px; font-weight: 800; color: #60A5FA; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
        Nouveau message reçu
      </div>
      <div style="font-size: 12px; font-weight: 700; color: #FFFFFF; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${title}
      </div>
      <div style="font-size: 11px; color: #E2E8F0; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${body}
      </div>
    </div>
    <div style="font-size: 18px; opacity: 0.7; padding: 4px; flex-shrink: 0;">✕</div>
  `;

  banner.addEventListener('click', (e) => {
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-10px)';
    setTimeout(() => banner.remove(), 300);

    if (e.target && e.target.innerText === '✕') return;

    const app = window.perfApp;
    if (app) {
      if (app.appState.activeTab === 'profiles') {
        try {
          showChatConversationModal(convId, app.appState, () => app.render());
        } catch(err) {
          app.appState.pendingConvId = convId;
          app.render();
        }
      } else {
        app.appState.pendingConvId = convId;
        app.navigateTo('profiles');
      }
    }
  });

  document.body.appendChild(banner);

  setTimeout(() => {
    if (banner && banner.parentElement) {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-10px)';
      setTimeout(() => banner.remove(), 300);
    }
  }, 8000);
}

export function checkNewMessageUpdates(conversations, userEmail, userName, userRole) {
  if (!conversations || !userEmail) return;

  const storageKey = `PERFECT_NOTIFIED_MSGS_${userEmail.toLowerCase().trim()}`;
  let notifiedMap = {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) notifiedMap = JSON.parse(raw);
  } catch (e) {}

  const myEmail = userEmail.toLowerCase().trim();
  const myName = (userName || '').toLowerCase().trim();
  const isEnterprise = (userRole === 'entreprise');

  conversations.forEach(conv => {
    if (!conv || !conv.id) return;
    const convId = conv.id;
    const lastMsgId = conv.lastMessageId || (conv.messages && conv.messages.length > 0 && conv.messages[conv.messages.length - 1].id) || `${convId}_${conv.lastUpdatedSeconds || 0}`;

    const clientEmail = (conv.clientEmail || '').toLowerCase().trim();
    const entEmail = (conv.enterpriseEmail || '').toLowerCase().trim();
    const clientName = (conv.clientName || '').toLowerCase().trim();
    const entName = (conv.enterpriseName || '').toLowerCase().trim();

    const isClient = (clientEmail === myEmail || (!isEnterprise && clientName && clientName === myName));
    const isEnt = (entEmail === myEmail || (isEnterprise && entName && entName === myName));

    if (!isClient && !isEnt) return;

    const unread = isClient ? conv.unreadForClient : conv.unreadForEnterprise;
    const senderRole = conv.lastSenderRole || (conv.messages && conv.messages.length > 0 && conv.messages[conv.messages.length - 1].senderRole) || '';

    const sentByOther = isClient 
      ? (senderRole === 'entreprise' || (!senderRole && unread)) 
      : (senderRole === 'contributeur' || (!senderRole && unread));

    // If this specific message ID has already been notified, skip
    if (notifiedMap[convId] === lastMsgId) return;

    // Check if this is the very first time we see this conversation
    if (!notifiedMap[convId]) {
      const nowSec = Math.floor(Date.now() / 1000);
      const isRecent = Math.abs(nowSec - (conv.lastUpdatedSeconds || 0)) < 1800;
      if (unread && isRecent && sentByOther) {
        _dispatchMessageAlert(conv, isClient, convId, lastMsgId, notifiedMap, storageKey);
      } else {
        notifiedMap[convId] = lastMsgId;
        try { localStorage.setItem(storageKey, JSON.stringify(notifiedMap)); } catch (e) {}
      }
      return;
    }

    // Existing conversation has updated with a new message
    if (sentByOther || unread) {
      _dispatchMessageAlert(conv, isClient, convId, lastMsgId, notifiedMap, storageKey);
    } else {
      notifiedMap[convId] = lastMsgId;
      try { localStorage.setItem(storageKey, JSON.stringify(notifiedMap)); } catch (e) {}
    }
  });
}

function _dispatchMessageAlert(conv, isClient, convId, lastMsgId, notifiedMap, storageKey) {
  notifiedMap[convId] = lastMsgId;
  try { localStorage.setItem(storageKey, JSON.stringify(notifiedMap)); } catch (e) {}

  const partnerName = isClient ? (conv.enterpriseName || 'L\'établissement') : (conv.clientName || 'Un client');
  const title = isClient ? `💬 ${partnerName} vous a envoyé un message` : `💬 ${partnerName} a répondu à votre message`;
  const body = conv.lastMessage ? `"${conv.lastMessage}"` : 'Nouveau message reçu';

  // 1. In-App Banner
  showInAppMessageNotification(title, body, convId);

  // 2. Android Native Notification
  if (window.AndroidNative && typeof window.AndroidNative.showNotification === 'function') {
    try {
      const payload = JSON.stringify({ type: 'message', convId: convId, partnerName: partnerName });
      window.AndroidNative.showNotification(title, body, payload);
    } catch (e) {}
  }
}

// ── FCM Token Handler ────────────────────────────────────────────────────────
// Called by Android WebView bridge ~3s after page load with the device's FCM token.
// We save it to Firestore so Cloud Functions can send push notifications to this device.
let _fcmSavedForEmail = null;
window.onFcmTokenReady = function(token) {
  if (!token) return;
  try { localStorage.setItem('PERFECT_FCM_TOKEN', token); } catch(e) {}
  // If a user is already logged in, save immediately
  const rawSession = localStorage.getItem('PERFECT_ACTIVE_SESSION_V1');
  if (rawSession) {
    try {
      const session = JSON.parse(rawSession);
      const email = session && session.currentUser && session.currentUser.email;
      if (email && email !== _fcmSavedForEmail) {
        _fcmSavedForEmail = email;
        firestoreSaveFcmToken(email, token).catch(() => {});
      }
    } catch(e) {}
  }
};

// ── Notification Tap Dispatcher ──────────────────────────────────────────────
// Called by Android MainActivity whenever a user taps a system notification.
// Routes to the appropriate view: workflow update (profile highlight) or new message (chat modal).
window.onNotificationClicked = function(payloadRaw) {
  console.log('[Notification Clicked]', payloadRaw);
  let payload = {};
  if (payloadRaw) {
    try {
      payload = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw;
    } catch (e) {
      console.warn('Failed to parse notification payload:', e);
    }
  }

  // Clear notifications & badge from system shade
  if (window.AndroidNative && typeof window.AndroidNative.clearAllNotifications === 'function') {
    try { window.AndroidNative.clearAllNotifications(); } catch(e) {}
  }

  const app = window.perfApp;
  if (!app) return;

  const notifType = payload.type || 'workflow';

  // ── Message Notification Tap ──────────────────────────────────────────────
  if (notifType === 'message' && payload.convId) {
    const convId = payload.convId;

    // Navigate to profiles first, then open the conversation modal once rendered
    const userEmail = app.appState.currentUser && app.appState.currentUser.email;
    if (userEmail) {
      firestoreLoadUserConversations(userEmail).then(convs => {
        if (convs && convs.length > 0) {
          const existing = app.appState.data.conversations || [];
          const merged = new Map();
          existing.forEach(c => merged.set(c.id, c));
          convs.forEach(c => merged.set(c.id, c));
          app.appState.data.conversations = Array.from(merged.values());
        }
        // Navigate to profiles
        app.appState.pendingConvId = convId;
        app.navigateTo('profiles');
      }).catch(() => {
        app.appState.pendingConvId = convId;
        app.navigateTo('profiles');
      });
    } else {
      app.appState.pendingConvId = convId;
      app.navigateTo('profiles');
    }
    return;
  }

  // ── Evaluation or Workflow Notification Tap ───────────────────────────────
  const evalId = payload.evalId || payload.id || null;

  if (evalId) {
    app.appState.highlightedEvalId = evalId;
  }

  // If this is a new evaluation received by an enterprise account, ensure enterprise profile is active
  if (notifType === 'new_eval' && app.appState.currentUser) {
    const isEnt = Boolean(app.appState.currentUser.businessProfile) || (app.appState.currentUser.role && app.appState.currentUser.role.toLowerCase().includes('entreprise'));
    if (isEnt) {
      app.appState.profileType = 'paid';
    }
  }

  const userEmail = app.appState.currentUser && app.appState.currentUser.email;
  const country = app.appState.selectedCountry || 'TN';

  if (userEmail) {
    Promise.all([
      firestoreLoadEvaluations(country),
      firestoreLoadUserEvaluations(userEmail)
    ]).then(([countryEvals, userEvals]) => {
      if (countryEvals && countryEvals.length > 0) {
        app.appState.data.recentEvaluations = countryEvals;
      }
      if (userEvals && userEvals.length > 0) {
        app.appState.currentUserEvals = userEvals;
      }
      app.navigateTo('profiles');
    }).catch(() => {
      app.navigateTo('profiles');
    });
  } else {
    app.navigateTo('profiles');
  }
};

class PerfECTApp {
  constructor() {
    window.perfApp = this;
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
    let savedSession = null;
    try {
      const rawSession = localStorage.getItem("PERFECT_ACTIVE_SESSION_V1");
      if (rawSession) savedSession = JSON.parse(rawSession);
    } catch (e) {}

    const hasValidSession = !!(savedSession && savedSession.currentUser);

    this.appState = {
      lang: 'fr',
      activeTab: hasValidSession ? (savedSession.activeTab || 'profiles') : 'login',
      authMode: 'login', // 'login' or 'register'
      selectedCountry: 'TN', // Default country: Tunisie
      isLoggedIn: hasValidSession,
      role: (savedSession && savedSession.role) || 'user',
      currentUser: (savedSession && savedSession.currentUser) || null,
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

    // Check for pending notification payload from cold launch via notification tap
    if (typeof window !== 'undefined' && window.AndroidNative && typeof window.AndroidNative.getPendingNotificationPayload === 'function') {
      try {
        const pending = window.AndroidNative.getPendingNotificationPayload();
        if (pending) {
          const parsed = JSON.parse(pending);
          if (parsed && parsed.evalId) {
            this.appState.highlightedEvalId = parsed.evalId;
            if (this.appState.isLoggedIn) {
              this.appState.activeTab = 'profiles';
            }
          }
        }
      } catch (e) {}
    }

    // Request notification permission on Android native wrapper
    if (typeof window !== 'undefined' && window.AndroidNative && typeof window.AndroidNative.requestNotificationPermission === 'function') {
      try {
        window.AndroidNative.requestNotificationPermission();
      } catch (e) {}
    }

    // Start native background Firestore listener for instant sleep/background notifications
    if (this.appState.isLoggedIn && this.appState.currentUser && this.appState.currentUser.email) {
      const userEmail = this.appState.currentUser.email;
      const userName = (this.appState.currentUser.businessProfile && this.appState.currentUser.businessProfile.actorName) || this.appState.currentUser.name || '';
      const userRole = this.appState.currentUser.businessProfile ? 'entreprise' : (this.appState.role || 'contributeur');

      if (window.AndroidNative && typeof window.AndroidNative.startWorkflowMonitoring === 'function') {
        try {
          window.AndroidNative.startWorkflowMonitoring(userEmail, userRole, userName);
        } catch (e) {}
      }

      // Initial check for unread messages & evaluations immediately on app startup
      firestoreLoadUserConversations(userEmail).then(convs => {
        if (convs && convs.length > 0) {
          checkNewMessageUpdates(convs, userEmail, userName, userRole);
        }
      }).catch(() => {});

      firestoreLoadEvaluations(this.appState.selectedCountry || 'TN').then(countryEvals => {
        if (countryEvals && countryEvals.length > 0) {
          this.appState.data.recentEvaluations = countryEvals;
          checkWorkflowStepUpdates(countryEvals, userEmail);
          checkNewEnterpriseEvaluationUpdates(countryEvals, this.appState.currentUser);
          if (this.appState.activeTab === 'dashboard' || this.appState.activeTab === 'analytics') {
            this.render();
          }
        }
      }).catch(() => {});

      firestoreLoadAllUsers().then(users => {
        if (users && users.length > 0) {
          this.appState.allUsers = users;
          this.appState.allUsersLoaded = true;
          if (this.appState.activeTab === 'dashboard' || this.appState.activeTab === 'analytics' || this.appState.activeTab === 'profiles') {
            this.render();
          }
        }
      }).catch(() => {});
    }

    // Periodic check for incoming messages (every 10s for fast in-app responsiveness)
    setInterval(() => {
      if (this.appState.isLoggedIn && this.appState.currentUser && this.appState.currentUser.email) {
        const userEmail = this.appState.currentUser.email;
        const userName = (this.appState.currentUser.businessProfile && this.appState.currentUser.businessProfile.actorName) || this.appState.currentUser.name || '';
        const userRole = this.appState.currentUser.businessProfile ? 'entreprise' : (this.appState.role || 'contributeur');
        firestoreLoadUserConversations(userEmail).then(convs => {
          if (convs && convs.length > 0) {
            const existing = this.appState.data.conversations || [];
            const merged = new Map();
            existing.forEach(c => merged.set(c.id, c));
            convs.forEach(c => merged.set(c.id, c));
            this.appState.data.conversations = Array.from(merged.values());
            checkNewMessageUpdates(convs, userEmail, userName, userRole);
          }
        }).catch(() => {});
      }
    }, 10000);

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

    // Scroll to top on page change, unless this is a notification deep-link
    if (!this.appState.pendingConvId && !this.appState.highlightedEvalId) {
      try {
        const bodyMount = document.getElementById('app-body-mount') || document.querySelector('.app-body');
        if (bodyMount) bodyMount.scrollTop = 0;
        window.scrollTo(0, 0);
      } catch(e) {}
    }

    if (this.appState.isLoggedIn && this.appState.currentUser) {
      try {
        localStorage.setItem("PERFECT_ACTIVE_SESSION_V1", JSON.stringify({
          currentUser: this.appState.currentUser,
          role: this.appState.role,
          activeTab: tabId
        }));
      } catch (e) {}
    }

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

    // Fetch fresh evaluations on page change (throttled to 15s to avoid redundant reads)
    if (this.appState.isLoggedIn && (tabId === 'dashboard' || tabId === 'analytics' || tabId === 'profiles')) {
      const now = Date.now();
      if (!this._lastNavFetchTime || (now - this._lastNavFetchTime) > 15000) {
        this._lastNavFetchTime = now;
        const selectedCountry = this.appState.selectedCountry || 'TN';
        const userEmail = this.appState.currentUser ? this.appState.currentUser.email : null;
        firestoreLoadEvaluations(selectedCountry).then(countryEvals => {
          if (countryEvals && countryEvals.length > 0) {
            this.appState.data.recentEvaluations = countryEvals;
            if (userEmail) {
              checkWorkflowStepUpdates(countryEvals, userEmail);
              checkNewEnterpriseEvaluationUpdates(countryEvals, this.appState.currentUser);
            }
            if (this.appState.activeTab === tabId) {
              this.render();
            }
          }
        }).catch(() => {});
      }
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

    // Bug 3 fix: clear notification badge whenever user is actively navigating the app
    if (this.appState.isLoggedIn && window.AndroidNative && typeof window.AndroidNative.clearAllNotifications === 'function') {
      try { window.AndroidNative.clearAllNotifications(); } catch(e) {}
    }

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

            try {
              localStorage.setItem("PERFECT_ACTIVE_SESSION_V1", JSON.stringify({
                currentUser: this.appState.currentUser,
                role: this.appState.role,
                activeTab: 'profiles'
              }));
            } catch (e) {}

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

            // Save FCM token to Firestore for this user (enables Cloud Function push notifications)
            if (userEmail && userEmail !== _fcmSavedForEmail) {
              const storedToken = localStorage.getItem('PERFECT_FCM_TOKEN');
              if (storedToken) {
                _fcmSavedForEmail = userEmail;
                firestoreSaveFcmToken(userEmail, storedToken).catch(() => {});
              }
            }

            // Start native background Firestore listener for real-time sleep/background alerts
            const curUserName = (this.appState.currentUser && ((this.appState.currentUser.businessProfile && this.appState.currentUser.businessProfile.actorName) || this.appState.currentUser.name)) || '';
            const curUserRole = (this.appState.currentUser && this.appState.currentUser.businessProfile) ? 'entreprise' : (this.appState.role || 'contributeur');

            if (userEmail && window.AndroidNative && typeof window.AndroidNative.startWorkflowMonitoring === 'function') {
              try {
                window.AndroidNative.startWorkflowMonitoring(userEmail, curUserRole, curUserName);
              } catch (e) {}
            }

            Promise.all([
              firestoreLoadEvaluations(selectedCountry),
              userEmail ? firestoreLoadUserEvaluations(userEmail) : Promise.resolve([]),
              userEmail ? firestoreLoadUserConversations(userEmail).catch(() => []) : Promise.resolve([]),
              firestoreLoadAllUsers()
            ]).then(([countryEvals, userEvals, userConvs, allUsers]) => {
              if (allUsers && allUsers.length > 0) {
                this.appState.allUsers = allUsers;
                this.appState.allUsersLoaded = true;
              }
              if (countryEvals && countryEvals.length > 0) {
                this.appState.data.recentEvaluations = countryEvals;
              } else {
                // No real evals yet for this country — clear mock ones
                this.appState.data.recentEvaluations = [];
              }
              this.appState.currentUserEvals = userEvals || [];
              if (userEmail) {
                const combined = [...(countryEvals || []), ...(userEvals || [])];
                checkWorkflowStepUpdates(combined, userEmail);
                checkNewEnterpriseEvaluationUpdates(combined, this.appState.currentUser);
                if (userConvs && userConvs.length > 0) {
                  const existing = this.appState.data.conversations || [];
                  const merged = new Map();
                  existing.forEach(c => merged.set(c.id, c));
                  userConvs.forEach(c => merged.set(c.id, c));
                  this.appState.data.conversations = Array.from(merged.values());
                  checkNewMessageUpdates(userConvs, userEmail, curUserName, curUserRole);
                }
              }
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

          // If the evaluated entity matches a registered enterprise, attach enterpriseEmail & enterpriseName
          try {
            const normTarget = (newEval.targetEntity || newEval.actorName || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
            if (normTarget) {
              const allUsers = this.appState.allUsers || (this.appState.data && this.appState.data.allUsers) || (this.appState.data && this.appState.data.adminStats && this.appState.data.adminStats.contributors) || [];
              const matched = allUsers.find(u => {
                if (!u) return false;
                const uActor = (u.businessProfile && u.businessProfile.actorName) || u.name || '';
                const normU = uActor.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
                return normU === normTarget || normU.includes(normTarget) || normTarget.includes(normU);
              });
              if (matched && matched.email) {
                newEval.enterpriseEmail = matched.email.trim().toLowerCase();
                newEval.enterpriseName = (matched.businessProfile && matched.businessProfile.actorName) || matched.name || newEval.targetEntity;
              }
            }
          } catch (e) {}

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
        if (!this.appState.allUsersLoaded) {
          firestoreLoadAllUsers().then(users => {
            if (users && users.length > 0) {
              this.appState.allUsers = users;
              this.appState.allUsersLoaded = true;
              if (this.appState.activeTab === 'analytics') {
                this.render();
              }
            }
          }).catch(() => {});
        }
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
              if (window.AndroidNative && typeof window.AndroidNative.stopWorkflowMonitoring === 'function') {
                try {
                  window.AndroidNative.stopWorkflowMonitoring();
                } catch (e) {}
              }
              try {
                localStorage.removeItem("PERFECT_ACTIVE_SESSION_V1");
              } catch (e) {}
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

        if (!this.appState.allUsersLoaded) {
          promises.push(firestoreLoadAllUsers().then(users => {
            if (users && users.length > 0) {
              this.appState.allUsers = users;
              this.appState.allUsersLoaded = true;
            }
          }).catch(() => {}));
        }

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

        Promise.all(promises).then(() => {
          if (profileUserEmail) {
            const allEvals = [...(this.appState.data.recentEvaluations || []), ...(this.appState.currentUserEvals || [])];
            checkWorkflowStepUpdates(allEvals, profileUserEmail);
            checkNewEnterpriseEvaluationUpdates(allEvals, this.appState.currentUser);
          }
          _doRenderProfile();

          // If arriving from a message notification tap, auto-open the corresponding conversation
          const pendingConvId = this.appState.pendingConvId;
          if (pendingConvId) {
            this.appState.pendingConvId = null;
            setTimeout(() => {
              try {
                showChatConversationModal(pendingConvId, this.appState, () => this.render());
              } catch (e) {
                console.warn('Could not auto-open conversation modal:', e);
              }
            }, 350);
          }
        }).catch(() => {
          _doRenderProfile();
          const pendingConvId = this.appState.pendingConvId;
          if (pendingConvId) {
            this.appState.pendingConvId = null;
            setTimeout(() => {
              try {
                showChatConversationModal(pendingConvId, this.appState, () => this.render());
              } catch (e) {}
            }, 350);
          }
        });
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

