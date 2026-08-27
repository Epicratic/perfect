import { initRadarChart, renderRadarChartHTML } from '../components/radar.js';
import { firestoreUpdateUserProfile, dbStorage, firestoreSendMessage, firestoreLoadUserConversations, firestoreMarkConversationRead, firestoreUpdateEvaluationWorkflow } from '../config/firebase.js';
import { getRadarScoresFromEvals } from './analytics.js';
import { compressImageFile } from '../utils/imageCompressor.js';
import { attachLightboxToImages } from '../utils/imageLightbox.js';

function getEnterpriseProfileRadarScores(historyEvals) {
  const normStr = (s) => !s ? '' : String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').trim();

  const getAxis = (pillarName, allowedKeywords) => {
    const pEvals = historyEvals.filter(e => {
      const pNorm = normStr(e.pillar || e.societalPillar);
      if (!pNorm) return true;
      return (pillarName === 'Economic' && (pNorm.includes('econ') || pNorm.includes('écon'))) ||
             (pillarName === 'Social' && (pNorm.includes('soc') || pNorm.includes('societ'))) ||
             (pillarName === 'Environmental' && (pNorm.includes('env') || pNorm.includes('environ')));
    });

    if (pEvals.length === 0) return 0.0;

    const matchedEvals = pEvals.filter(e => {
      const catStr = normStr(e.category || e.indicatorCategory || '');
      const typeStr = normStr(e.type || e.indicatorType || e.kpi || e.indicator || '');
      return allowedKeywords.some(k => catStr.includes(k) || typeStr.includes(k));
    });

    if (matchedEvals.length === 0) return 0.0;
    const sum = matchedEvals.reduce((s, e) => s + (parseFloat(e.rating) || 0), 0);
    return parseFloat((sum / matchedEvals.length).toFixed(1));
  };

  return {
    econ: [
      getAxis('Economic', ['invest', 'montant', 'investmentamount']),
      getAxis('Economic', ['job', 'emploi', 'cree', 'jobscreated']),
      getAxis('Economic', ['valeur', 'ajouter', 'added', 'valueadded'])
    ],
    social: [
      getAxis('Social', ['facility', 'equipement', 'infra', 'locaux']),
      getAxis('Social', ['staff', 'personnel', 'agent', 'equipe']),
      getAxis('Social', ['program', 'projet', 'action'])
    ],
    env: [
      getAxis('Environmental', ['pollut', 'dechet', 'emission', 'pollutionemission']),
      getAxis('Environmental', ['resour', 'ressour', 'eau', 'energie', 'resourceconsumption']),
      getAxis('Environmental', ['resili', 'climat', 'risq', 'resilience'])
    ]
  };
}

export function renderProfilesView(appState, translations) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;
  
  // Resolve current user from logged-in session or fall back to demo
  const currentUser = appState.currentUser || null;

  // Profile type: 'free' (Contributeur) vs 'paid' (Entreprise)
  // If logged-in user's role is 'entreprise', force paid view
  let profileType = appState.profileType || 'free';
  if (currentUser && currentUser.role && currentUser.role.toLowerCase().includes('entreprise')) {
    profileType = 'paid';
  }
  const isFree = profileType === 'free';

  // Determine expert upgrade status — check by currentUser.id first, then fall back to 'u1'
  const currentUserId = (currentUser && currentUser.id) ? currentUser.id : (appState.currentUserId || 'u1');
  const contributors = (appState.data && appState.data.adminStats && appState.data.adminStats.contributors) || [];
  // Match by id OR by email if the new user was just added
  const currentContrib = contributors.find(c => c.id === currentUserId || (currentUser && c.email === currentUser.email));
  const expertRequested = currentContrib ? currentContrib.expertRequested : (currentUser ? currentUser.expertRequested : false);
  const expertApproved  = currentContrib ? currentContrib.expertApproved  : (currentUser ? currentUser.expertApproved  : false);

  // Profile data definitions — use real logged-in user if available
  const displayName = (currentUser && currentUser.name) ? currentUser.name : "Jean-Luc Moreau";
  const displayEmail = (currentUser && currentUser.email) ? currentUser.email : "j.moreau@perfect-corp.fr";
  const displayUserId = (currentUser && currentUser.userId) ? currentUser.userId : "#PRF-99821-X";
  const displayRegDate = (currentUser && currentUser.registrationDate) ? currentUser.registrationDate : "12 Février 2023";
  const displayInitials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "JM";

  // Load conversations from local storage cache for instant rendering
  let userConversations = [];
  try {
    const raw = localStorage.getItem("PERFECT_CONVERSATIONS_V1");
    if (raw) {
      const allConvs = JSON.parse(raw);
      const targetEmail = (currentUser && currentUser.email ? currentUser.email : displayEmail).toLowerCase().trim();
      const targetName = displayName.toLowerCase().trim();
      userConversations = allConvs.filter(c => {
        const cEmail = (c.clientEmail || '').toLowerCase().trim();
        const cName = (c.clientName || '').toLowerCase().trim();
        const entEmail = (c.enterpriseEmail || '').toLowerCase().trim();
        return cEmail === targetEmail || cName === targetName || entEmail === targetEmail;
      });
    }
  } catch (e) {}

  userConversations.sort((a, b) => (b.lastUpdatedSeconds || 0) - (a.lastUpdatedSeconds || 0));
  const unreadClientCount = isFree ? userConversations.filter(c => c.unreadForClient).length : userConversations.filter(c => c.unreadForEnterprise).length;

  // ── Compute real stats from user's Firestore evaluations ─────────────────
  const normEmail = (currentUser && currentUser.email ? currentUser.email : displayEmail).toLowerCase().trim();
  const normName = displayName.toLowerCase().trim();

  const allRecent = (appState.data && appState.data.recentEvaluations) || [];
  const rawUserEvals = (appState.currentUserEvals && appState.currentUserEvals.length > 0) ? appState.currentUserEvals : [];

  const userEvalsMap = new Map();
  rawUserEvals.forEach(e => {
    if (e) {
      const key = e.id || `${e.targetEntity || e.actorName}-${e.rating}-${e.date || ''}`;
      userEvalsMap.set(key, e);
    }
  });

  allRecent.forEach(e => {
    if (e) {
      const eEmail = (e.authorEmail || '').toLowerCase().trim();
      const eName = (e.authorName || e.author || '').toLowerCase().trim();
      if ((normEmail && eEmail === normEmail) || (normName && eName === normName)) {
        const key = e.id || `${e.targetEntity || e.actorName}-${e.rating}-${e.date || ''}`;
        userEvalsMap.set(key, e);
      }
    }
  });

  const userEvals = Array.from(userEvalsMap.values());

  const evalCount = userEvals.length;
  const avgScore = evalCount > 0
    ? Math.round((userEvals.reduce((sum, e) => sum + (parseFloat(e.rating) || 0), 0) / evalCount) * 10) / 10
    : 0;

  // Sector scores — avg rating per sector from user's own evals
  const sectorMapKeys = [
    { key: "Governance",         label: "Gouvernance",           icon: "⚖️", keywords: ["gouv", "gov", "just", "parl"] },
    { key: "SecurityDefense",    label: "Sécurité & Défense",    icon: "🛡️", keywords: ["séc", "secu", "def", "polic", "gend"] },
    { key: "HealthHygiene",      label: "Santé & Hygiène",       icon: "🏥", keywords: ["sant", "hyg", "med", "pharm", "hopit", "hôpit"] },
    { key: "InstructionCulture", label: "Instruction & Culture", icon: "🎓", keywords: ["inst", "cult", "educ", "éduc", "univ", "ecol", "écol"] },
    { key: "FoodFinance",        label: "Alimentation & Finance",icon: "💳", keywords: ["alim", "finan", "banq", "resta", "cafet"] },
    { key: "HousingTourism",     label: "Logement & Tourisme",   icon: "🏠", keywords: ["log", "tour", "hotel", "hôt"] },
    { key: "TransportTelco",     label: "Transport & Télécoms",  icon: "🚌", keywords: ["trans", "tel", "tél", "post", "auto"] }
  ];

  const sectorTotals = {};
  const sectorCounts = {};

  userEvals.forEach(e => {
    const secStr = String(e.sectorName || e.macroSector || e.sector || '').toLowerCase();
    const matched = sectorMapKeys.find(s =>
      s.key.toLowerCase() === secStr ||
      secStr.includes(s.key.toLowerCase()) ||
      secStr.includes(s.label.toLowerCase().split('&')[0].trim()) ||
      s.keywords.some(k => secStr.includes(k))
    );

    if (matched) {
      const sk = matched.key;
      if (!sectorTotals[sk]) { sectorTotals[sk] = 0; sectorCounts[sk] = 0; }
      sectorTotals[sk] += parseFloat(e.rating) || 0;
      sectorCounts[sk]++;
    }
  });

  const realSectorScores = sectorMapKeys.map(s => {
    const score = sectorCounts[s.key] > 0
      ? Math.round((sectorTotals[s.key] / sectorCounts[s.key]) * 10) / 10
      : (userEvals.length > 0 ? 3.5 : 0.0);
    return { key: s.key, label: s.label, icon: s.icon, score };
  });

  // Badges — earned dynamically
  const earnedBadges = [];
  // "Contributeur Vérifié" — ONLY if isVerified flag is true (set by admin)
  const isVerified = (currentUser && currentUser.isVerified) ? true : false;
  if (isVerified) {
    earnedBadges.push({ icon: "🏦", label: "Contributeur Vérifié", desc: "Identité validée", color: "#007A3D", earned: true });
  }
  if (evalCount >= 1)  earnedBadges.push({ icon: "✍️", label: "Premier Pas", desc: "1ère évaluation publiée", color: "#00A859", earned: true });

  // Analyste Sectoriel: requires 5+ DISTINCT sectors evaluated
  const distinctSectors = new Set(userEvals.map(e => e.sectorName || e.macroSector || e.sector || '').filter(Boolean));
  if (distinctSectors.size >= 5) earnedBadges.push({ icon: "📊", label: "Analyste Sectoriel", desc: "5+ secteurs évalués", color: "#F59E0B", earned: true });
  if (evalCount >= 10) earnedBadges.push({ icon: "🏅", label: "Top Contributeur", desc: "10+ évaluations", color: "#002B49", earned: true });
  if (evalCount >= 50) earnedBadges.push({ icon: "🎓", label: "Évaluateur Expert", desc: "50+ évaluations", color: "#8B5CF6", earned: true });

  // History — real user evals, newest first by Firestore createdAt timestamp
  const realHistory = userEvals.slice().sort((a, b) => (b.createdAtSeconds || 0) - (a.createdAtSeconds || 0)).map((e, idx) => ({
    id: e.id || `uh-${idx}`,
    authorName: displayName,
    authorInitials: displayInitials,
    authorAvatarBg: "#002B49",
    authorAvatarColor: "#FFFFFF",
    targetEntity: e.targetEntity || e.actorName || e.entity || '—',
    sector: e.sectorName || e.macroSector || e.sector || '—',
    sectorName: e.sectorName || e.macroSector || e.sector || '',
    macroSector: e.macroSector || e.sectorName || e.sector || '',
    mesoSector: e.mesoSector || e.subSector || '',
    subSector: e.mesoSector || e.subSector || '',
    pillar: e.pillar || e.societalPillar || '',
    societalPillar: e.pillar || e.societalPillar || '',
    type: e.type || e.indicatorType || e.kpi || '',
    indicatorType: e.type || e.indicatorType || e.kpi || '',
    category: e.category || e.indicatorCategory || '',
    location: (e.locality && e.region)
      ? `${e.locality}, ${e.region}, ${e.country || 'TN'}`
      : (e.locality ? `${e.locality}, ${e.country || 'TN'}` : (e.location || 'Tunisie')),
    timeAgo: e.timeAgo || 'Récemment',
    rating: e.rating || 0,
    comment: e.comment || '',
    workflowStep: parseInt(e.workflowStep || e.step || 0),
    statusLabel: "État de prise en compte de la demande",
    authorEmail: e.authorEmail || '',
    attachmentName: e.attachmentName || null,
    attachmentBase64: e.attachmentBase64 || e.photoUrl || null,
    photoUrl: e.photoUrl || e.attachmentBase64 || null
  }));

  const displayAddress = (currentUser && currentUser.address) ? currentUser.address : "—";
  const displayBirthYear = (currentUser && (currentUser.birthYear || currentUser.age)) ? (currentUser.birthYear || currentUser.age) : "—";
  const displayPhone = (currentUser && currentUser.phone) ? currentUser.phone : "—";
  const displayProfession = (currentUser && currentUser.profession) ? currentUser.profession : "—";
  const isVerifPending = (currentUser && currentUser.verificationPending) ? true : false;
  const avatarBase64 = (currentUser && currentUser.avatarBase64) ? currentUser.avatarBase64 : null;

  const freeUserData = {
    name: displayName,
    memberSince: `Membre depuis ${displayRegDate}`,
    avatarUrl: avatarBase64 || null,
    avatarInitials: displayInitials,
    badges: [
      isVerified
        ? { text: "VÉRIFIÉ ✓", bg: "#D1FADF", color: "#027A48", clickable: false }
        : isVerifPending
        ? { text: "VÉRIF. EN COURS…", bg: "#FFF7ED", color: "#EA580C", clickable: false }
        : { text: "VÉRIFIÉ", bg: "#E2E8F0", color: "#94A3B8", clickable: true },
      { text: "GRATUIT", bg: "#E0F2FE", color: "#0284C7", clickable: false }
    ],
    info: {
      address: displayAddress,
      age: displayBirthYear,
      phone: displayPhone,
      profession: displayProfession,
      email: displayEmail,
      registrationDate: displayRegDate,
      userId: displayUserId
    },
    stats: {
      sharedEvals: evalCount,
      evalsDelta: evalCount === 0 ? "Aucune encore" : `${evalCount} au total`,
      rank: evalCount === 0 ? "—" : `#1`,
      rankLabel: "Rang Contributeur",
      avgScore: avgScore,
      scoreLabel: "Score Moyen de Qualité des Services Reçus"
    },
    sectorScores: realSectorScores,
    badgesList: earnedBadges,
    history: realHistory.length > 0 ? realHistory : []
  };


  // ── Compute real enterprise profile data & received evaluations ────────────
  const bProfile = (currentUser && currentUser.businessProfile) ? currentUser.businessProfile : {};
  const enterpriseActorName = bProfile.actorName || ((currentUser && currentUser.name) ? currentUser.name : "Mon Établissement");

  const normStr = (s) => !s ? '' : String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').trim();
  const targetNorm = normStr(enterpriseActorName);

  const allSystemEvals = [
    ...((appState.data && appState.data.recentEvaluations) || []),
    ...((appState.currentUserEvals) || [])
  ];

  const evalsMap = new Map();
  allSystemEvals.forEach(e => {
    if (e) {
      const key = e.id || `${e.targetEntity || e.actorName}-${e.rating}-${e.date || ''}`;
      evalsMap.set(key, e);
    }
  });

  const receivedEvalsList = Array.from(evalsMap.values()).filter(e => {
    const eTarget = normStr(e.targetEntity || e.actorName || e.entity || '');
    return eTarget && targetNorm && (eTarget === targetNorm || eTarget.includes(targetNorm) || targetNorm.includes(eTarget));
  });

  const realEnterpriseHistory = receivedEvalsList.slice().sort((a, b) => (b.createdAtSeconds || 0) - (a.createdAtSeconds || 0)).map((e, idx) => ({
    id: e.id || `ent-eval-${idx}`,
    authorName: e.authorName || e.author || 'Anonyme',
    authorInitials: e.authorInitials || (e.authorName || 'A').substring(0, 2).toUpperCase(),
    authorAvatarBg: e.authorAvatarBg || '#002B49',
    authorAvatarColor: e.authorAvatarColor || '#FFFFFF',
    targetEntity: enterpriseActorName,
    sector: e.sectorName || e.macroSector || e.sector || 'Gouvernance',
    sectorName: e.sectorName || e.macroSector || e.sector || '',
    macroSector: e.macroSector || e.sectorName || e.sector || '',
    mesoSector: e.mesoSector || e.subSector || '',
    pillar: e.pillar || e.societalPillar || '',
    type: e.type || e.indicatorType || e.kpi || '',
    category: e.category || e.indicatorCategory || '',
    location: (e.locality && e.region)
      ? `${e.locality}, ${e.region}, ${e.country || 'TN'}`
      : (e.locality ? `${e.locality}, ${e.country || 'TN'}` : (e.location || 'Tunisie')),
    timeAgo: e.timeAgo || 'Récemment',
    rating: parseFloat(e.rating) || 0,
    comment: e.comment || 'Évaluation partagée.',
    workflowStep: parseInt(e.workflowStep || e.step || 0),
    statusLabel: "État de prise en compte de la demande",
    authorEmail: e.authorEmail || '',
    attachmentName: e.attachmentName || null,
    attachmentBase64: e.attachmentBase64 || e.photoUrl || null,
    photoUrl: e.photoUrl || e.attachmentBase64 || null
  }));

  const entAddress = bProfile.locality && bProfile.region 
    ? `${bProfile.locality}, ${bProfile.region}, ${bProfile.country || 'TN'}` 
    : ((currentUser && currentUser.address) ? currentUser.address : "—");
  const entPhone = (currentUser && currentUser.phone) ? currentUser.phone : "—";
  const entEmail = (currentUser && currentUser.email) ? currentUser.email : "—";
  const entRegDate = (currentUser && currentUser.registrationDate) ? currentUser.registrationDate : "15 Janvier 2023";
  const entUserId = (currentUser && (currentUser.userId || currentUser.uid)) ? (currentUser.userId || currentUser.uid) : "#ENT-55410-TN";
  const entAvgScore = realEnterpriseHistory.length > 0
    ? (realEnterpriseHistory.reduce((sum, e) => sum + e.rating, 0) / realEnterpriseHistory.length).toFixed(1)
    : 0.0;

  const paidEnterpriseData = {
    name: enterpriseActorName,
    fullName: enterpriseActorName,
    memberSince: `Membre depuis ${entRegDate}`,
    avatarUrl: (currentUser && currentUser.avatarBase64) || null,
    badges: [
      isVerified
        ? { text: "VÉRIFIÉ ✓", bg: "#D1FADF", color: "#027A48", clickable: false }
        : isVerifPending
        ? { text: "VÉRIF. EN COURS…", bg: "#FFF7ED", color: "#EA580C", clickable: false }
        : { text: "NON VÉRIFIÉ 🪪", bg: "#F1F5F9", color: "#64748B", clickable: true },
      { text: "ENTREPRISE", bg: "#E0F2FE", color: "#0284C7", clickable: false }
    ],
    info: {
      address: entAddress,
      age: (currentUser && (currentUser.birthYear || currentUser.age)) ? (currentUser.birthYear || currentUser.age) : "—",
      phone: entPhone,
      email: entEmail,
      registrationDate: entRegDate,
      userId: entUserId
    },
    stats: {
      receivedEvals: realEnterpriseHistory.length,
      evalsDelta: realEnterpriseHistory.length === 0 ? "Aucune reçue" : `${realEnterpriseHistory.length} au total`,
      sectorialRank: realEnterpriseHistory.length === 0 ? "—" : "#1",
      territorialRank: realEnterpriseHistory.length === 0 ? "—" : "#1",
      avgScore: entAvgScore,
      scoreLabel: "Score Moyen de Qualité de Services Fournis"
    },
    history: realEnterpriseHistory
  };

  const profileData = isFree ? freeUserData : paidEnterpriseData;

  // Compute dynamic stats for enterprise profile
  const enterpriseEvals = paidEnterpriseData.history;
  const dynEnterpriseCount = enterpriseEvals.length;
  const dynEnterpriseAvg = enterpriseEvals.length > 0
    ? (enterpriseEvals.reduce((sum, e) => sum + e.rating, 0) / enterpriseEvals.length).toFixed(1)
    : 0.0;

  // Compute dynamic avg score for free profile
  const dynAvgScore = isFree
    ? (freeUserData.sectorScores.reduce((sum, s) => sum + s.score, 0) / freeUserData.sectorScores.length).toFixed(1)
    : dynEnterpriseAvg;

  const sectorBarsHTML = isFree ? `
    <div class="card" style="margin-bottom: 16px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
        Score Moyen de Qualité par Secteur
      </div>
      <div style="position: relative; height: 200px;">
        <canvas id="profile-sector-bar-chart"></canvas>
      </div>
    </div>
  ` : '';

  // Render Radar Charts for Paid Enterprise Profile (Superposed vertically)
  const enterpriseRadarsHTML = !isFree ? `
    <div class="card" style="margin-bottom: 16px;">
      <div class="card-title" style="margin-bottom: 2px;">Tableau de Bord</div>
      <div style="font-size: 10.5px; color: #64748B; margin-bottom: 16px;">Bilan global de vos performances</div>

      <div class="radar-charts-stack" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderRadarChartHTML('profile-radar-econ', 'ÉCONOMIQUE')}
        ${renderRadarChartHTML('profile-radar-social', 'SOCIAL')}
        ${renderRadarChartHTML('profile-radar-env', 'ENVIRONNEMENTAL')}
      </div>

      <div style="display: flex; justify-content: center; gap: 16px; margin-top: 14px; font-size: 10px; font-weight: 600;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="width: 10px; height: 10px; background: #007A3D; border-radius: 2px;"></span>
          <span>Entreprise</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="width: 12px; height: 2px; border-top: 1px dashed #64748B;"></span>
          <span>Moyenne</span>
        </div>
      </div>
    </div>
  ` : '';

  // Render Badges Gallery for Free Profile
  const badgesGalleryHTML = isFree ? `
    <div class="card" style="margin-bottom: 16px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
        Galerie de Badges
      </div>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 14px;">
        ${freeUserData.badgesList.map(b => `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 5px; width: 72px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: ${b.color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 3px 8px rgba(0,0,0,0.15);" title="${b.label}">
              ${b.icon}
            </div>
            <div style="font-size: 9.5px; font-weight: 700; color: #002B49; text-align: center; line-height: 1.2;">${b.label}</div>
            <div style="font-size: 8.5px; color: #94A3B8; text-align: center; line-height: 1.2;">${b.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';


  const indicatorNamesMap = {
    'Staff': 'Personnel',
    'Facility': 'Infrastructures',
    'Programs': 'Programmes',
    'InvestmentAmount': 'Investissements',
    'JobsCreated': 'Emplois créés',
    'ValueAdded': 'Valeur ajoutée',
    'PollutionEmission': 'Émission de pollution',
    'ResourceConsumption': 'Consommation de ressources',
    'Resilience': 'Résilience aux catastrophes'
  };

  // Render History Items — same format as analytics/dashboard buildEvalItemHTML
  const historyItemsHTML = isFree
    ? freeUserData.history.map(item => {
        const sectorLabel = item.sectorName || item.macroSector || item.sector || '';
        const subSectorLabel = item.mesoSector || item.subSector || '';
        const perfLabel = item.pillar || item.societalPillar || '';
        
        const rawCategory = item.category || item.indicatorCategory || '';
        const mainIndicator = indicatorNamesMap[rawCategory] || rawCategory;
        const subType = item.type || item.indicatorType || item.kpi || '';

        let kpiLabel = mainIndicator;
        if (kpiLabel && subType && subType !== rawCategory && subType !== mainIndicator) {
          kpiLabel = `${mainIndicator} (${subType})`;
        } else if (!kpiLabel) {
          kpiLabel = subType || item.indicator || '';
        }

        const ratingNum = parseFloat(item.rating) || 0;
        const fullStars = Math.floor(ratingNum);
        const starsStr = '★'.repeat(Math.min(5, fullStars)) + '☆'.repeat(Math.max(0, 5 - fullStars));

        return `
          <div class="recent-rating-item" 
            data-sector="${(item.sectorName || item.macroSector || item.sector || '').replace(/"/g, '&quot;')}"
            data-actor="${(item.targetEntity || '').replace(/"/g, '&quot;')}">
            <div class="rating-user-avatar-circle" style="background: ${item.authorAvatarBg || '#002B49'}; color: ${item.authorAvatarColor || '#FFFFFF'};">
              ${item.authorInitials || 'U'}
            </div>
            <div style="flex: 1;">
              <div style="font-size: 12px; font-weight: 700; color: #002B49;">
                ${item.authorName || 'Contributeur'} <span style="font-weight: 400; color: #64748B;">a noté</span>
                <span style="color: #00A859; font-weight: 800;">${item.targetEntity || 'Acteur'}</span>
              </div>

              <!-- Sector & Sub-sector, Performance & Indicator Badges -->
              <div style="display: flex; gap: 8px; margin: 6px 0; flex-wrap: wrap; align-items: flex-start;">
                ${sectorLabel ? `
                  <div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-start;">
                    <span style="background: #EFF6FF; color: #1E40AF; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid #DBEAFE;">
                      🏛️ ${sectorLabel}
                    </span>
                    ${subSectorLabel ? `
                      <span style="background: #F0FDF4; color: #166534; font-size: 8.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid #DCFCE7; margin-left: 6px;">
                        └ 🔹 Sous-secteur : ${subSectorLabel}
                      </span>
                    ` : ''}
                  </div>
                ` : ''}

                ${perfLabel ? `
                  <div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-start;">
                    <span style="background: #F5F3FF; color: #5B21B6; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid #DDD6FE;">
                      🎯 Performance : ${perfLabel}
                    </span>
                    ${kpiLabel ? `
                      <span style="background: #FFF7ED; color: #9A3412; font-size: 8.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid #FFEDD5; margin-left: 6px;">
                        └ 📊 Indicateur : ${kpiLabel}
                      </span>
                    ` : ''}
                  </div>
                ` : (kpiLabel ? `
                  <div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-start;">
                    <span style="background: #FFF7ED; color: #9A3412; font-size: 8.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid #FFEDD5;">
                      📊 Indicateur : ${kpiLabel}
                    </span>
                  </div>
                ` : '')}
              </div>

              <div class="rating-stars-gold">
                ${starsStr}
                <span style="font-size: 11px; font-weight: 800; color: #002B49; margin-left: 4px;">${ratingNum.toFixed(1)}</span>
              </div>
              <div class="rating-comment-quote">"${item.comment || 'Évaluation partagée.'}"</div>

              ${(item.photoUrl || item.attachmentBase64) ? `
                <div style="margin: 8px 0 6px 0; border-radius: 10px; overflow: hidden; max-width: 220px; border: 1.5px solid #E2E8F0; background: #0F172A; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                  <img src="${item.photoUrl || item.attachmentBase64}" alt="Photo ${item.attachmentName || ''}" class="rating-attachment-image" style="width: 100%; max-height: 140px; object-fit: cover; display: block; cursor: pointer; transition: transform 0.2s ease;" />
                  ${item.attachmentName ? `
                    <div style="background: rgba(15,23,42,0.85); color: #F8FAFC; font-size: 8.5px; font-weight: 600; padding: 3px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      📷 ${item.attachmentName}
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 8px; border-top: 1px dashed #E2E8F0; margin-top: 8px; flex-wrap: wrap; gap: 8px;">
                <div class="rating-meta-footer" style="margin-top: 0;">
                  <span>📍 ${item.location || 'Tunisie'}</span>
                  <span>⏱️ ${item.timeAgo || 'Récemment'}</span>
                </div>

                <div style="text-align: right;">
                  <div style="font-size: 8.5px; color: #64748B; margin-bottom: 3px; font-weight: 700;">État de prise en compte de la demande</div>
                  <div style="display: flex; gap: 3px; justify-content: flex-end;" title="Niveau d'avancement de la prise en compte : ${item.workflowStep > 0 ? 'Étape ' + item.workflowStep + '/5' : 'En attente'}">
                    ${[1, 2, 3, 4, 5].map(step => `
                      <span style="width: 14px; height: 14px; border-radius: 3px; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; ${step <= (item.workflowStep || 0) ? 'background: #00A859; color: white;' : 'background: #E2E8F0; color: #64748B;'}">
                        ${step}
                      </span>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')
    : (paidEnterpriseData.history.length > 0
        ? paidEnterpriseData.history.map(item => {
            const stars = '\u2605'.repeat(Math.round(item.rating)) + '\u2606'.repeat(5 - Math.round(item.rating));
            
            const sectorLabel = item.sectorName || item.macroSector || item.sector || '';
            const subSectorLabel = item.mesoSector || item.subSector || '';
            const perfLabel = item.pillar || item.societalPillar || '';

            const indicatorNamesMap = {
              'Staff': 'Personnel',
              'Facility': 'Infrastructures',
              'Programs': 'Programmes',
              'InvestmentAmount': 'Investissements',
              'JobsCreated': 'Emplois créés',
              'ValueAdded': 'Valeur ajoutée',
              'PollutionEmission': 'Émission de pollution',
              'ResourceConsumption': 'Consommation de ressources',
              'Resilience': 'Résilience aux catastrophes'
            };

            const rawCategory = item.category || item.indicatorCategory || '';
            const mainIndicator = indicatorNamesMap[rawCategory] || rawCategory;
            const subType = item.type || item.indicatorType || item.kpi || '';

            let kpiLabel = mainIndicator;
            if (kpiLabel && subType && subType !== rawCategory && subType !== mainIndicator) {
              kpiLabel = `${mainIndicator} (${subType})`;
            } else if (!kpiLabel) {
              kpiLabel = subType || item.indicator || '';
            }

            return `
              <div class="recent-rating-item" style="flex-direction: column; align-items: stretch; gap: 8px;"
                data-pillar="${(item.pillar || item.societalPillar || '').replace(/"/g, '&quot;')}"
                data-indicator="${(mainIndicator || kpiLabel || '').replace(/"/g, '&quot;')}">
                <div style="display: flex; gap: 10px; align-items: flex-start;">
                  <div class="rating-user-avatar-circle" style="background: ${item.authorAvatarBg}; color: ${item.authorAvatarColor};">
                    ${item.authorInitials}
                  </div>
                  <div style="flex: 1;">
                    <div style="font-size: 12px; font-weight: 700; color: #002B49;">
                      ${item.authorName} <span style="font-weight: 400; color: #64748B;">a noté</span>
                      <span style="color: #00A859; font-weight: 800;">${item.targetEntity}</span>
                    </div>

                    <!-- Sector & Performance / Sub-sector & Indicator Badges Grid -->
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
                      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        ${sectorLabel ? `
                          <span style="background: #EFF6FF; color: #1D4ED8; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid #BFDBFE;">
                            🏛️ Secteur : ${sectorLabel}
                          </span>
                        ` : ''}
                        ${perfLabel ? `
                          <span style="background: #F5F3FF; color: #5B21B6; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid #DDD6FE;">
                            🎯 Performance : ${perfLabel}
                          </span>
                        ` : ''}
                      </div>

                      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        ${subSectorLabel ? `
                          <span style="background: #F0FDF4; color: #166534; font-size: 8.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid #DCFCE7;">
                            └ 🔹 Sous-secteur : ${subSectorLabel}
                          </span>
                        ` : ''}
                        ${kpiLabel ? `
                          <span style="background: #FFF7ED; color: #9A3412; font-size: 8.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid #FFEDD5;">
                            └ 📊 Indicateur : ${kpiLabel}
                          </span>
                        ` : ''}
                      </div>
                    </div>

                    <div class="rating-stars-gold" style="margin-top: 4px;">
                      ${stars}
                      <span style="font-size: 11px; font-weight: 800; color: #002B49; margin-left: 4px;">${item.rating.toFixed(1)}</span>
                    </div>
                    <div class="rating-comment-quote">"${item.comment}"</div>

                    ${(item.photoUrl || item.attachmentBase64) ? `
                      <div style="margin: 8px 0 6px 0; border-radius: 10px; overflow: hidden; max-width: 220px; border: 1.5px solid #E2E8F0; background: #0F172A; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                        <img src="${item.photoUrl || item.attachmentBase64}" alt="Photo ${item.attachmentName || ''}" class="rating-attachment-image" style="width: 100%; max-height: 140px; object-fit: cover; display: block; cursor: pointer; transition: transform 0.2s ease;" />
                        ${item.attachmentName ? `
                          <div style="background: rgba(15,23,42,0.85); color: #F8FAFC; font-size: 8.5px; font-weight: 600; padding: 3px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            📷 ${item.attachmentName}
                          </div>
                        ` : ''}
                      </div>
                    ` : ''}

                    <div class="rating-meta-footer">
                      <span>📍 ${item.location}</span>
                      <span>⏱️ ${item.timeAgo}</span>
                    </div>
                  </div>
                </div>

                <!-- Enterprise Action & Status Bar -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed #E2E8F0; margin-top: 4px;">
                  <button class="btn btn-outline btn-contact-client" 
                    data-eval-id="${item.id}" 
                    data-client-name="${item.authorName || 'Contributeur'}" 
                    data-client-email="${item.authorEmail || ''}"
                    data-entity-name="${item.targetEntity || enterpriseActorName}"
                    data-eval-rating="${item.rating || 4}"
                    style="width: auto; padding: 4px 10px; font-size: 10px; border-radius: 12px; color: #3B82F6; border-color: #3B82F6; display: flex; align-items: center; gap: 4px; cursor: pointer;">
                    🛡️ Contacter le client
                  </button>

                  <div class="btn-workflow-trigger" 
                    data-eval-id="${item.id}"
                    data-workflow-step="${item.workflowStep || 0}"
                    data-client-name="${item.authorName || 'Contributeur'}"
                    data-entity-name="${item.targetEntity || enterpriseActorName}"
                    data-eval-rating="${item.rating || 0}"
                    data-eval-comment="${(item.comment || '').replace(/"/g, '&quot;')}"
                    style="text-align: right; cursor: pointer; padding: 4px 8px; border-radius: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; transition: all 0.2s ease;"
                    title="Cliquer pour mettre à jour l'état de prise en compte">
                    <div style="font-size: 8.5px; color: #002B49; margin-bottom: 3px; font-weight: 700; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                      <span>${item.statusLabel || 'État de prise en compte'}</span>
                      <span style="font-size: 10px; color: #00A859;">⚙️ Modifier</span>
                    </div>
                    <div style="display: flex; gap: 3px; justify-content: flex-end;">
                      ${[1, 2, 3, 4, 5].map(step => `
                        <span style="width: 14px; height: 14px; border-radius: 3px; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; ${step <= (item.workflowStep || 0) ? 'background: #00A859; color: white;' : 'background: #E2E8F0; color: #64748B;'}">
                          ${step}
                        </span>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')
        : `<div style="text-align: center; color: #94A3B8; font-size: 12px; padding: 20px 0;">Aucune évaluation reçue pour le moment concernant votre établissement.</div>`);


  return `
    <div>
      <!-- Page Header -->
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #002B49;">Profil d’Utilisateur</h2>
        <p style="font-size: 11px; color: #64748B;">
          ${isFree 
            ? "En tant que contributeur, vous avez ici les statistiques des services consommés"
            : "En tant qu'entreprise, vous avez ici les statistiques des retours de vos clients"}
        </p>
      </div>

      <!-- Profile Type Switcher Pill (Locked to user's registered account type) -->
      <div style="display: flex; background: #E2E8F0; border-radius: 20px; padding: 3px; margin-bottom: 16px;">
        <button
          id="btn-toggle-profile-free"
          style="flex: 1; padding: 6px 12px; font-size: 11px; font-weight: 700; border-radius: 17px; border: none; transition: all 0.2s ease;
            ${isFree
              ? 'background: #002B49; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: default;'
              : 'background: transparent; color: #94A3B8; cursor: not-allowed; opacity: 0.6;'}"
          ${!isFree ? 'disabled title="Verrouillé — Profil Entreprise actif"' : ''}
        >
          ${isFree ? '👤 Profil Gratuit (Contributeur)' : '🔒 Profil Gratuit (Verrouillé)'}
        </button>
        <button
          id="btn-toggle-profile-paid"
          style="flex: 1; padding: 6px 12px; font-size: 11px; font-weight: 700; border-radius: 17px; border: none; transition: all 0.2s ease;
            ${!isFree
              ? 'background: #002B49; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); cursor: default;'
              : 'background: transparent; color: #94A3B8; cursor: not-allowed; opacity: 0.6;'}"
          ${isFree ? 'disabled title="Verrouillé — Profil Contributeur actif"' : ''}
        >
          ${!isFree ? '🏢 Profil Payant (Entreprise)' : '🔒 Profil Payant (Verrouillé)'}
        </button>
      </div>

      <!-- Unread Messages Banner (If free user has unread messages) -->
      ${isFree && unreadClientCount > 0 ? `
        <div id="banner-unread-messages" style="background: linear-gradient(135deg, #002B49, #00A859); color: white; border-radius: 14px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 14px rgba(0, 168, 89, 0.25);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 22px;">🔔</span>
            <div>
              <div style="font-size: 12px; font-weight: 800;">Nouveau(x) message(s) reçu(s) !</div>
              <div style="font-size: 10px; opacity: 0.9;">Vous avez ${unreadClientCount} message(s) non lu(s) d'un établissement.</div>
            </div>
          </div>
          <button id="btn-scroll-to-messages" style="background: #FFFFFF; color: #002B49; border: none; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 20px; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
            Lire 💬
          </button>
        </div>
      ` : ''}

      <!-- CARD 1: Profile Main Info Card -->
      <div class="card" style="margin-bottom: 16px; text-align: center;">
        <div style="position: relative; display: inline-block; margin-bottom: 6px;">
          <div id="profile-avatar-wrapper" style="position:relative; display:inline-block; cursor:pointer;" title="Cliquez pour changer votre photo de profil">
            ${profileData.avatarUrl
              ? `<img src="${profileData.avatarUrl}" alt="${profileData.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #00A859; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" />`
              : `<div id="avatar-initials-circle" style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #002B49, #00A859); border: 3px solid #00A859; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px;">${profileData.avatarInitials || 'U'}</div>`
            }
            <div style="position:absolute;bottom:0;right:0;width:24px;height:24px;border-radius:50%;background:#002B49;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
              📷
            </div>
          </div>
          <input type="file" id="profile-avatar-input" accept="image/*" style="display:none;" />
          <div style="margin-top: 4px;">
            <button type="button" id="btn-change-photo" style="background: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE; font-size: 10.5px; font-weight: 700; border-radius: 12px; padding: 4px 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
              📷 Modifier la photo
            </button>
          </div>
        </div>
        <h3 style="font-size: 18px; font-weight: 800; color: #002B49; margin-bottom: 2px;">${profileData.name}</h3>
        <div style="font-size: 11px; color: #64748B; margin-bottom: 12px;">${profileData.memberSince}</div>

        <!-- Badges -->
        <div style="display: flex; justify-content: center; gap: 6px; margin-bottom: 12px;">
          ${profileData.badges.map(b => `
            <span
              ${b.clickable ? 'id="badge-verified-clickable"' : ''}
              style="font-size: 9.5px; font-weight: 800; padding: 3px 9px; border-radius: 12px; background: ${b.bg}; color: ${b.color}; letter-spacing: 0.5px; ${b.clickable ? 'cursor:pointer; border: 1.5px dashed #00A859;' : ''}"
              ${b.clickable ? 'title="Cliquez pour soumettre votre pièce d\'identité et obtenir le badge Vérifié"' : ''}>
              ${b.text}
            </span>
          `).join('')}
        </div>

        <!-- Identity Verification Status & Upload Button -->
        ${!isVerified ? `
          <div style="margin-bottom: 14px;">
            <button type="button" id="btn-open-verify-id" class="btn" style="width: 100%; background: ${isVerifPending ? '#FFF7ED' : '#002B49'}; color: ${isVerifPending ? '#EA580C' : '#FFFFFF'}; border: ${isVerifPending ? '1.5px solid #FED7AA' : 'none'}; font-weight: 700; font-size: 11.5px; border-radius: 12px; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 43, 73, 0.15);">
              🪪 ${isVerifPending ? '⏳ Pièce d\'identité soumise (Examen en cours)' : 'Vérifier mon compte (Uploader pièce d\'identité)'}
            </button>
          </div>
        ` : `
          <div style="margin-bottom: 14px; background: #ECFDF5; color: #027A48; border: 1px solid #A7F3D0; font-weight: 700; font-size: 11.5px; border-radius: 12px; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            ✅ Compte & Identité vérifiés
          </div>
        `}

        <!-- Key Information Grid -->
        <div style="text-align: left; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
          <div>
            <div style="font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">ADRESSE</div>
            <div style="font-weight: 600; color: #002B49;">${profileData.info.address}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">${!isFree ? 'ANNÉE DE CRÉATION' : 'ANNÉE DE NAISSANCE'}</div>
            <div style="font-weight: 700; color: #002B49;">${profileData.info.age}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">TÉLÉPHONE</div>
            <div style="font-weight: 600; color: #002B49;">${profileData.info.phone}</div>
          </div>
          ${!isFree ? `
            <div>
              <div style="font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">SECTEUR & SOUS-SECTEUR</div>
              <div style="font-weight: 700; color: #002B49;">
                ${bProfile.macroSector ? `${bProfile.macroSector}${bProfile.mesoSector ? ' (' + bProfile.mesoSector + ')' : ''}` : 'Non renseigné'}
              </div>
            </div>
          ` : `
            <div>
              <div style="font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">PROFESSION</div>
              <div style="font-weight: 600; color: #002B49;">${profileData.info.profession || '—'}</div>
            </div>
          `}
          <div>
            <div style="font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">EMAIL</div>
            <div style="font-weight: 600; color: #002B49; text-overflow: ellipsis; overflow: hidden;">${profileData.info.email}</div>
          </div>
          <div>
            <div style="font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">ID UTILISATEUR</div>
            <div style="font-weight: 700; color: #00A859;">${profileData.info.userId}</div>
          </div>
        </div>

        <!-- Action Links -->
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700;">
          <a href="#" id="link-edit-profile" style="color: #002B49; text-decoration: underline;">Modifiez vos coordonnées</a>
          ${isFree
            ? expertApproved
              ? `<span style="color: #00A859; font-weight: 700; display:flex; align-items:center; gap:4px;">
                  ✅ Contributeur Expert activé
                 </span>`
              : expertRequested
              ? `<span id="link-upgrade-profile" style="color: #FF9F43; font-weight: 700; cursor:not-allowed; display:flex; align-items:center; gap:4px;">
                  ⏳ Demande en cours d’examen…
                 </span>`
              : `<a href="#" id="link-upgrade-profile" style="color: #00A859; text-decoration: underline;">
                  Devenez contributeur expert
                 </a>`
            : `<a href="#" id="link-upgrade-profile" style="color: #00A859; text-decoration: underline;">Consultez tous nos plans</a>`
          }
        </div>

        <!-- Se Déconnecter (Logout) Button -->
        <button id="btn-logout-user" class="btn" style="width: 100%; margin-top: 14px; background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA; font-weight: 700; font-size: 12px; border-radius: 12px; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Se déconnecter
        </button>
      </div>

      <!-- CARD 2: Statistics Cards (3 Cards) -->
      ${isFree ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px;">
          <div class="card" style="padding: 12px; text-align: center;">
            <div style="font-size: 16px; margin-bottom: 4px;">📇</div>
            <div style="font-size: 20px; font-weight: 800; color: #002B49;">${freeUserData.stats.sharedEvals}</div>
            <div style="font-size: 9px; color: #64748B; font-weight: 600;">Évaluations Partagées</div>
            <div style="font-size: 8px; color: #00A859; font-weight: 700; margin-top: 2px;">${freeUserData.stats.evalsDelta}</div>
          </div>

          <div class="card" style="padding: 12px; text-align: center;">
            <div style="font-size: 16px; margin-bottom: 4px;">📊</div>
            <div style="font-size: 20px; font-weight: 800; color: #00A859;">${freeUserData.stats.rank}</div>
            <div style="font-size: 9px; color: #64748B; font-weight: 600;">${freeUserData.stats.rankLabel}</div>
          </div>

          <div class="card" style="padding: 12px; text-align: center;">
            <div style="font-size: 16px; margin-bottom: 4px;">⭐</div>
            <div style="font-size: 20px; font-weight: 800; color: #002B49;">${dynAvgScore}</div>
            <div style="font-size: 9px; color: #64748B; font-weight: 600; line-height: 1.1;">Score Moyen de Qualité de Services Reçus</div>
          </div>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px;">
          <div class="card" style="padding: 12px; text-align: center;">
            <div style="font-size: 16px; margin-bottom: 4px;">📇</div>
            <div style="font-size: 20px; font-weight: 800; color: #002B49;">${dynEnterpriseCount}</div>
            <div style="font-size: 9px; color: #64748B; font-weight: 600;">Évaluations Reçues</div>
            <div style="font-size: 8px; color: #00A859; font-weight: 700; margin-top: 2px;">${paidEnterpriseData.stats.evalsDelta}</div>
          </div>

          <div class="card" style="padding: 12px; text-align: center;">
            <div style="font-size: 16px; margin-bottom: 4px;">📊</div>
            <div style="font-size: 14px; font-weight: 800; color: #002B49;">
              <span style="color: #00A859;">${paidEnterpriseData.stats.sectorialRank}</span> <span style="font-size: 10px; color: #94A3B8;">/</span> <span style="color: #3B82F6;">${paidEnterpriseData.stats.territorialRank}</span>
            </div>
            <div style="font-size: 8.5px; color: #64748B; font-weight: 600; margin-top: 2px;">Sectoriel / Territorial</div>
          </div>

          <div class="card" style="padding: 12px; text-align: center;">
            <div style="font-size: 16px; margin-bottom: 4px;">⭐</div>
            <div style="font-size: 20px; font-weight: 800; color: #002B49;">${dynEnterpriseAvg}</div>
            <div style="font-size: 9px; color: #64748B; font-weight: 600; line-height: 1.1;">Score Moyen Fourni</div>
          </div>
        </div>
      `}

      <!-- CARD 3: Sector Bar Chart (Free) OR Spider Radars (Paid) -->
      ${sectorBarsHTML}
      ${enterpriseRadarsHTML}

      <!-- CARD 4: Badges Gallery (Free Profile Only) -->
      ${badgesGalleryHTML}

      <!-- CARD 5: Evaluation History (with filters) -->
      <div class="card" id="card-eval-history">
        ${isFree ? (() => {
          // ── Ordered FR sector list (same order as all other pages) ──
          const SECTOR_ORDER_FR = [
            { key: 'Governance',         frLabel: 'Gouvernance',            match: (v) => /gouv|gov|just|parl/i.test(v) },
            { key: 'SecurityDefense',    frLabel: 'Sécurité & Défense',     match: (v) => /séc|sec|déf|def|polic|gend/i.test(v) },
            { key: 'HealthHygiene',      frLabel: 'Santé & Hygiène',        match: (v) => /sant|hyg|med|pharm|hopit|hôpit/i.test(v) },
            { key: 'InstructionCulture', frLabel: 'Instruction & Culture',  match: (v) => /inst|cult|educ|éduc|univ|ecol|école|école/i.test(v) },
            { key: 'FoodFinance',        frLabel: 'Alimentation & Finance', match: (v) => /alim|finan|banq|rest|cafet/i.test(v) },
            { key: 'HousingTourism',     frLabel: 'Logement & Tourisme',    match: (v) => /log|tour|hotel|hôt/i.test(v) },
            { key: 'TransportTelco',     frLabel: 'Transport & Télécoms',   match: (v) => /trans|tél|tel|post|auto/i.test(v) }
          ];
          // Map each eval's raw sector string to FR label
          const normSector = (v) => {
            if (!v) return '';
            const found = SECTOR_ORDER_FR.find(s => s.match(v) || v.toLowerCase().includes(s.frLabel.toLowerCase().split(' ')[0].toLowerCase()));
            return found ? found.frLabel : v;
          };
          // Build ordered list of sectors actually present in history
          const presentFrSectors = SECTOR_ORDER_FR
            .map(s => s.frLabel)
            .filter(fr => freeUserData.history.some(h => normSector(h.sectorName || h.macroSector || h.sector || '') === fr));

          // All unique actors (for initial load, unfiltered)
          const allActors = [...new Set(freeUserData.history.map(h => h.targetEntity || '').filter(Boolean))].sort();

          return `
          <!-- Free user filters: by Sector and by Actor (cascading) -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div class="card-title">Historique des Évaluations</div>
              <span id="free-history-count" style="font-size: 10px; color: #64748B; font-weight: 600;">${freeUserData.history.length} fiche${freeUserData.history.length > 1 ? 's' : ''}</span>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 120px;">
                <label style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">🏛️ Secteur</label>
                <select id="filter-free-sector" style="width: 100%; padding: 6px 8px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 10.5px; color: #002B49; background: #F8FAFC; font-weight: 600; -webkit-appearance: none; appearance: none;">
                  <option value="">Tous les secteurs</option>
                  ${presentFrSectors.map(fr => `<option value="${fr}">${fr}</option>`).join('')}
                </select>
              </div>
              <div style="flex: 1; min-width: 120px;">
                <label style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">🏢 Acteur</label>
                <select id="filter-free-actor" style="width: 100%; padding: 6px 8px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 10.5px; color: #002B49; background: #F8FAFC; font-weight: 600; -webkit-appearance: none; appearance: none;">
                  <option value="">Tous les acteurs</option>
                  ${allActors.map(a => `<option value="${a}">${a}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>`;
        })() : (() => {
          // ── Enterprise indicator filter using FR names from indicatorNamesMap ──
          const indicatorNamesMapFR = {
            'Staff': 'Personnel',
            'Facility': 'Infrastructures',
            'Programs': 'Programmes',
            'InvestmentAmount': 'Investissements',
            'JobsCreated': 'Emplois créés',
            'ValueAdded': 'Valeur ajoutée',
            'PollutionEmission': 'Émission de pollution',
            'ResourceConsumption': 'Consommation de ressources',
            'Resilience': 'Résilience aux catastrophes'
          };
          const getMappedIndicator = (h) => {
            const raw = h.category || h.indicatorCategory || '';
            return indicatorNamesMapFR[raw] || raw || h.type || h.indicatorType || h.kpi || '';
          };
          const presentIndicators = [...new Set(paidEnterpriseData.history.map(h => getMappedIndicator(h)).filter(Boolean))].sort();
          const presentPillars = [...new Set(paidEnterpriseData.history.map(h => h.pillar || h.societalPillar || '').filter(Boolean))].sort();

          return `
          <!-- Enterprise filters: by Performance (pillar) and by Indicator (FR names) -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div class="card-title">Historique des Évaluations</div>
              <span id="ent-history-count" style="font-size: 10px; color: #64748B; font-weight: 600;">${paidEnterpriseData.history.length} fiche${paidEnterpriseData.history.length > 1 ? 's' : ''}</span>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 120px;">
                <label style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">🎯 Performance</label>
                <select id="filter-ent-pillar" style="width: 100%; padding: 6px 8px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 10.5px; color: #002B49; background: #F8FAFC; font-weight: 600; -webkit-appearance: none; appearance: none;">
                  <option value="">Toutes les performances</option>
                  ${presentPillars.map(p => `<option value="${p}">${p}</option>`).join('')}
                </select>
              </div>
              <div style="flex: 1; min-width: 120px;">
                <label style="font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">📊 Indicateur</label>
                <select id="filter-ent-indicator" style="width: 100%; padding: 6px 8px; border: 1.5px solid #E2E8F0; border-radius: 8px; font-size: 10.5px; color: #002B49; background: #F8FAFC; font-weight: 600; -webkit-appearance: none; appearance: none;">
                  <option value="">Tous les indicateurs</option>
                  ${presentIndicators.map(i => `<option value="${i}">${i}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>`;
        })()}


        <div id="history-items-list">
          ${historyItemsHTML}
        </div>
        <div id="history-no-results" style="display:none; text-align: center; padding: 20px; color: #94A3B8; font-size: 11.5px;">
          🔍 Aucune évaluation ne correspond aux filtres sélectionnés.
        </div>
      </div>


      <!-- CARD 6: Messages Reçus (Client Inbox) -->
      ${isFree ? `
        <div class="card" id="card-messages-recus" style="margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="card-title" style="margin: 0;">Messages Reçus</div>
              ${unreadClientCount > 0 ? `<span style="background: #00A859; color: white; font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 10px;">${unreadClientCount} nouveau${unreadClientCount > 1 ? 'x' : ''} 🔔</span>` : ''}
            </div>
            <span style="font-size: 10px; color: #64748B;">Échanges avec les structures</span>
          </div>

          <div id="messages-list-container">
            ${userConversations.length > 0
              ? userConversations.map(c => `
                  <div class="conversation-card-item" data-conv-id="${c.id}" style="background: #F8FAFC; border: 1.5px solid ${c.unreadForClient ? '#00A859' : '#E2E8F0'}; border-radius: 12px; padding: 12px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #002B49; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800;">🏢</div>
                        <div>
                          <div style="font-size: 12px; font-weight: 800; color: #002B49;">${c.enterpriseName || 'Établissement'}</div>
                          <div style="font-size: 9px; color: #64748B;">Réponse à votre évaluation</div>
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 9px; color: #94A3B8;">${c.lastUpdatedDisplay || ''}</div>
                        ${c.unreadForClient ? `<span style="display: inline-block; background: #DCFCE7; color: #166534; font-size: 8.5px; font-weight: 800; padding: 2px 7px; border-radius: 8px; margin-top: 2px;">Nouveau</span>` : ''}
                      </div>
                    </div>
                    <div style="font-size: 11px; color: #334155; padding-left: 40px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                      💬 <strong>Dernier message :</strong> ${c.lastMessage || 'Nouvel échange'}
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
                      <span style="font-size: 10px; color: #00A859; font-weight: 700; display: flex; align-items: center; gap: 4px;">
                        Ouvrir la discussion 💬 ➔
                      </span>
                    </div>
                  </div>
                `).join('')
              : `<div style="text-align: center; padding: 22px 12px; color: #94A3B8; font-size: 11.5px;">
                   📭 Aucun message reçu pour le moment.<br>
                   <span style="font-size: 10px; color: #CBD5E1;">Lorsqu'une structure vous contactera suite à une évaluation, la discussion s'affichera ici.</span>
                 </div>`
            }
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

export function attachProfilesEvents(containerEl, appState, renderCallback, onExpertRequest, onNavigate, onLogout) {
  const _currentUser = appState.currentUser || null;
  let profileType = appState.profileType || 'free';
  if (_currentUser && _currentUser.role && _currentUser.role.toLowerCase().includes('entreprise')) {
    profileType = 'paid';
  }
  const isFree = profileType === 'free';

  // --- Logout Button Listener ---
  const logoutBtn = containerEl.querySelector('#btn-logout-user');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (onLogout) onLogout();
    });
  }

  // --- Toggle pill ---
  const btnFree = containerEl.querySelector('#btn-toggle-profile-free');
  const btnPaid = containerEl.querySelector('#btn-toggle-profile-paid');

  if (btnFree && !isFree) {
    btnFree.addEventListener('click', () => {
      appState.profileType = 'free';
      if (renderCallback) renderCallback();
    });
  }

  if (btnPaid && isFree) {
    btnPaid.addEventListener('click', () => {
      appState.profileType = 'paid';
      if (renderCallback) renderCallback();
    });
  }

  // --- History Filters ---
  const historyList = containerEl.querySelector('#history-items-list');
  const historyNoResults = containerEl.querySelector('#history-no-results');

  // FR sector normalization (same order/labels as all other pages)
  const SECTOR_ORDER_FR = [
    { frLabel: 'Gouvernance',            match: (v) => /gouv|gov|just|parl/i.test(v) },
    { frLabel: 'Sécurité & Défense',     match: (v) => /séc|sec|déf|def|polic|gend/i.test(v) },
    { frLabel: 'Santé & Hygiène',        match: (v) => /sant|hyg|med|pharm|hopit|hôpit/i.test(v) },
    { frLabel: 'Instruction & Culture',  match: (v) => /inst|cult|educ|éduc|univ|ecol|école/i.test(v) },
    { frLabel: 'Alimentation & Finance', match: (v) => /alim|finan|banq|rest|cafet/i.test(v) },
    { frLabel: 'Logement & Tourisme',    match: (v) => /log|tour|hotel|hôt/i.test(v) },
    { frLabel: 'Transport & Télécoms',   match: (v) => /trans|tél|tel|post|auto/i.test(v) }
  ];
  const normSectorToFR = (v) => {
    if (!v) return '';
    const found = SECTOR_ORDER_FR.find(s => s.match(v) || v.toLowerCase().includes(s.frLabel.toLowerCase().split(' ')[0].toLowerCase()));
    return found ? found.frLabel : v;
  };

  function updateActorDropdown(sectorFilter) {
    const actorSel = containerEl.querySelector('#filter-free-actor');
    if (!actorSel || !historyList) return;
    const items = historyList.querySelectorAll('.recent-rating-item');
    const actors = new Set();
    items.forEach(item => {
      const rawSector = item.getAttribute('data-sector') || '';
      const itemSectorFR = normSectorToFR(rawSector);
      if (!sectorFilter || itemSectorFR === sectorFilter) {
        const actor = item.getAttribute('data-actor') || '';
        if (actor) actors.add(actor);
      }
    });
    const currentActor = actorSel.value;
    actorSel.innerHTML = '<option value="">Tous les acteurs</option>' +
      [...actors].sort().map(a => `<option value="${a}"${a === currentActor ? ' selected' : ''}>${a}</option>`).join('');
  }

  function applyHistoryFilters() {
    if (!historyList) return;
    const items = historyList.querySelectorAll('.recent-rating-item');
    let visibleCount = 0;

    if (isFree) {
      const sectorSel = containerEl.querySelector('#filter-free-sector');
      const actorSel = containerEl.querySelector('#filter-free-actor');
      const sectorFilter = (sectorSel || {}).value || '';
      const actorFilter = (actorSel || {}).value || '';
      const countEl = containerEl.querySelector('#free-history-count');

      // Update actor dropdown to reflect current sector selection
      updateActorDropdown(sectorFilter);

      items.forEach(item => {
        const rawSector = item.getAttribute('data-sector') || '';
        const itemSectorFR = normSectorToFR(rawSector);
        const actor = item.getAttribute('data-actor') || '';
        const sectorOk = !sectorFilter || itemSectorFR === sectorFilter;
        const actorOk = !actorFilter || actor === actorFilter;
        const visible = sectorOk && actorOk;
        item.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });
      if (countEl) countEl.textContent = `${visibleCount} fiche${visibleCount > 1 ? 's' : ''}`;
    } else {
      const pillarSel = containerEl.querySelector('#filter-ent-pillar');
      const indicatorSel = containerEl.querySelector('#filter-ent-indicator');
      const pillarFilter = (pillarSel || {}).value || '';
      const indicatorFilter = (indicatorSel || {}).value || '';
      const countEl = containerEl.querySelector('#ent-history-count');

      items.forEach(item => {
        const pillar = item.getAttribute('data-pillar') || '';
        const indicator = item.getAttribute('data-indicator') || '';
        const visible = (!pillarFilter || pillar === pillarFilter) && (!indicatorFilter || indicator === indicatorFilter);
        item.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });
      if (countEl) countEl.textContent = `${visibleCount} fiche${visibleCount > 1 ? 's' : ''}`;
    }

    if (historyNoResults) {
      historyNoResults.style.display = (visibleCount === 0 && items.length > 0) ? 'block' : 'none';
    }
  }

  // Free user filter listeners
  const filterFreeSector = containerEl.querySelector('#filter-free-sector');
  const filterFreeActor = containerEl.querySelector('#filter-free-actor');
  if (filterFreeSector) {
    filterFreeSector.addEventListener('change', () => {
      // Reset actor selection when sector changes, then apply
      if (filterFreeActor) filterFreeActor.value = '';
      applyHistoryFilters();
    });
  }
  if (filterFreeActor) filterFreeActor.addEventListener('change', applyHistoryFilters);

  // Enterprise filter listeners
  const filterEntPillar = containerEl.querySelector('#filter-ent-pillar');
  const filterEntIndicator = containerEl.querySelector('#filter-ent-indicator');
  if (filterEntPillar) filterEntPillar.addEventListener('change', applyHistoryFilters);
  if (filterEntIndicator) filterEntIndicator.addEventListener('change', applyHistoryFilters);

  // --- Avatar click & Change Photo button -> file upload ---
  const avatarWrapper = containerEl.querySelector('#profile-avatar-wrapper');
  const btnChangePhoto = containerEl.querySelector('#btn-change-photo');
  const avatarInput = containerEl.querySelector('#profile-avatar-input');

  const triggerAvatarUpload = (e) => {
    if (e) e.preventDefault();
    if (avatarInput) avatarInput.click();
  };

  if (avatarWrapper) avatarWrapper.addEventListener('click', triggerAvatarUpload);
  if (btnChangePhoto) btnChangePhoto.addEventListener('click', triggerAvatarUpload);

  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      try {
        const res = await compressImageFile(file, 600, 600, 0.8);
        const base64 = res && res.dataUrl ? res.dataUrl : null;
        if (!base64) return;

        if (!appState.currentUser) appState.currentUser = {};
        appState.currentUser.avatarBase64 = base64;
        appState.currentUser.photoURL = base64;
        
        // Also update local userProfile in state if present
        if (appState.data && appState.data.userProfile) {
          appState.data.userProfile.avatarUrl = base64;
          dbStorage.saveState(appState.data);
        }

        const uid = appState.currentUser.uid || appState.currentUser.id;
        if (uid) {
          firestoreUpdateUserProfile(uid, { avatarBase64: base64, photoURL: base64 });
        }

        // Show confirmation toast
        const toast = document.createElement('div');
        toast.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#00A859;color:white;padding:12px 20px;border-radius:14px;font-size:12px;font-weight:700;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:fadeIn 0.3s ease;`;
        toast.textContent = '✅ Photo de profil mise à jour !';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);

        if (renderCallback) renderCallback();
      } catch (err) {
        console.warn("Avatar compression error:", err);
      }
    });
  }

  // --- Verified badge click & verify button click -> ID document upload modal ---
  const badgeVerified = containerEl.querySelector('#badge-verified-clickable');
  const btnOpenVerifyId = containerEl.querySelector('#btn-open-verify-id');

  const triggerVerifyModal = (e) => {
    if (e) e.preventDefault();
    showVerifyIdentityModal(appState, renderCallback);
  };

  if (badgeVerified) badgeVerified.addEventListener('click', triggerVerifyModal);
  if (btnOpenVerifyId) btnOpenVerifyId.addEventListener('click', triggerVerifyModal);

  // --- "Devenez contributeur expert" OR "Consultez tous nos plans" link ---
  const upgradeLink = containerEl.querySelector('#link-upgrade-profile');
  if (upgradeLink && upgradeLink.tagName === 'A') {
    upgradeLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (isFree) {
        if (onExpertRequest) {
          onExpertRequest();
        }
      } else {
        // Switch to Page 6 "Plans & tarifs"
        if (onNavigate) {
          onNavigate('pricing');
        } else {
          appState.activeTab = 'pricing';
          if (renderCallback) renderCallback();
        }
      }
    });
  }

  // --- Modifiez vos coordonnées modal ---
  const editProfileLink = containerEl.querySelector('#link-edit-profile');
  if (editProfileLink) {
    editProfileLink.addEventListener('click', (e) => {
      e.preventDefault();
      showEditProfileModal(appState, renderCallback);
    });
  }

  // --- Sector bar chart (free profile) --- score-based colors ---
  if (isFree) {
    const canvas = containerEl.querySelector('#profile-sector-bar-chart');
    if (canvas) {
      setTimeout(() => {
        if (!window.Chart) return;
        if (window.Chart.getChart) {
          try {
            const existing = window.Chart.getChart(canvas);
            if (existing) existing.destroy();
          } catch (e) {}
        }

        // Recompute sector scores from appState directly (freeUserData is out of scope here)
        const userEvals = appState.currentUserEvals || [];
        const sectorMapKeys = [
          { key: "Governance",         label: "Gouvernance",           keywords: ["gouv", "gov", "just", "parl"] },
          { key: "SecurityDefense",    label: "Séc. & Défense",        keywords: ["séc", "secu", "def", "polic", "gend"] },
          { key: "HealthHygiene",      label: "Santé & Hyg.",          keywords: ["sant", "hyg", "med", "pharm", "hopit", "hôpit"] },
          { key: "InstructionCulture", label: "Instruction",           keywords: ["inst", "cult", "educ", "éduc", "univ", "ecol", "écol"] },
          { key: "FoodFinance",        label: "Alim. & Finance",       keywords: ["alim", "finan", "banq", "resta", "cafet"] },
          { key: "HousingTourism",     label: "Logement & Tour.",      keywords: ["log", "tour", "hotel", "hôt"] },
          { key: "TransportTelco",     label: "Transport & Tél.",      keywords: ["trans", "tel", "tél", "post", "auto"] }
        ];

        const totals = {}, counts = {};
        userEvals.forEach(e => {
          const s = String(e.sectorName || e.macroSector || e.sector || '').toLowerCase();
          const matched = sectorMapKeys.find(sk =>
            sk.key.toLowerCase() === s ||
            s.includes(sk.key.toLowerCase()) ||
            sk.keywords.some(k => s.includes(k))
          );
          if (matched) {
            totals[matched.key] = (totals[matched.key] || 0) + (parseFloat(e.rating) || 0);
            counts[matched.key] = (counts[matched.key] || 0) + 1;
          }
        });

        const sectorScores = sectorMapKeys.map(sk => ({
          label: sk.label,
          score: counts[sk.key] > 0
            ? Math.round((totals[sk.key] / counts[sk.key]) * 10) / 10
            : 0
        }));

        const scoreBarColor = (s) => {
          const val = parseFloat(s) || 0;
          if (val <= 1.0) return '#DC2626';  // Rouge vif (score <= 1.0)
          if (val <= 2.0) return '#FF9F43';  // Orange (entre 1.0 et 2.0)
          if (val <= 3.0) return '#FFB800';  // Jaune (entre 2.0 et 3.0)
          if (val <= 4.0) return '#28C76F';  // Vert clair (entre 3.0 et 4.0)
          return '#00A859';                 // Vert foncé (> 4.0)
        };

        new window.Chart(canvas, {
          type: 'bar',
          data: {
            labels: sectorScores.map(s => s.label),
            datasets: [{
              label: 'Score moyen',
              data: sectorScores.map(s => s.score),
              backgroundColor: sectorScores.map(s => scoreBarColor(s.score)),
              borderColor: sectorScores.map(s => scoreBarColor(s.score)),
              borderWidth: 2,
              borderRadius: 6,
              borderSkipped: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                min: 0,
                max: 5,
                ticks: { stepSize: 1, font: { size: 10, family: 'Inter, sans-serif' }, color: '#64748B' },
                grid: { color: '#F1F5F9' }
              },
              x: {
                ticks: { font: { size: 9, family: 'Inter, sans-serif' }, color: '#64748B', maxRotation: 35, minRotation: 25 },
                grid: { display: false }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => counts[sectorMapKeys[ctx.dataIndex]?.key] > 0
                    ? ` Score: ${ctx.raw.toFixed(1)} / 5`
                    : ' Moyenne nationale (3.5)'
                }
              }
            },
            animation: { duration: 600, easing: 'easeOutQuart' }
          }
        });
      }, 150);
    }
  }


  // --- Enterprise spider radars (paid profile) ---
  if (!isFree) {
    const renderEnterpriseRadars = () => {
      const currentUser = appState.currentUser || {};
      const bProfile = (currentUser && currentUser.businessProfile) ? currentUser.businessProfile : {};
      const enterpriseActorName = bProfile.actorName || ((currentUser && currentUser.name) ? currentUser.name : "Mon Établissement");

      const normStr = (s) => !s ? '' : String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').trim();
      const targetNorm = normStr(enterpriseActorName);

      const allSystemEvals = [
        ...((appState.data && appState.data.recentEvaluations) || []),
        ...((appState.data && appState.data.evaluations) || []),
        ...((appState.currentUserEvals) || []),
        ...((appState.evaluations) || [])
      ];

      const evalsMap = new Map();
      allSystemEvals.forEach(e => {
        if (e) {
          const key = e.id || `${e.targetEntity || e.actorName}-${e.rating}-${e.date || ''}`;
          evalsMap.set(key, e);
        }
      });

      const historyEvals = Array.from(evalsMap.values()).filter(e => {
        const eTarget = normStr(e.targetEntity || e.actorName || e.entity || '');
        return eTarget && targetNorm && (eTarget === targetNorm || eTarget.includes(targetNorm) || targetNorm.includes(eTarget));
      });

      let scores = getEnterpriseProfileRadarScores(historyEvals);

      // Fallback to global getRadarScoresFromEvals if local history scores are all zeroes
      if (scores.econ.every(v => v === 0) && scores.social.every(v => v === 0) && scores.env.every(v => v === 0)) {
        const globalData = getRadarScoresFromEvals(enterpriseActorName, appState);
        if (globalData) scores = globalData;
      }

      try {
        initRadarChart('profile-radar-econ',   'Économique',       ['Investissement', 'Emplois', 'Valeur Ajoutée'],    scores.econ, '#2563EB');
        initRadarChart('profile-radar-social', 'Social',           ['Infrastructures', 'Personnel', 'Programmes'],     scores.social, '#EA5455');
        initRadarChart('profile-radar-env',    'Environnemental',  ['Émission de pollution', 'Ressources', 'Résilience'], scores.env, '#00A859');
      } catch (e) {
        console.warn('Enterprise radar render error:', e);
      }
    };

    setTimeout(renderEnterpriseRadars, 50);
    setTimeout(renderEnterpriseRadars, 300);
    setTimeout(renderEnterpriseRadars, 800);
  }

  // --- Contact Client buttons (Enterprise side) ---
  const contactBtns = containerEl.querySelectorAll('.btn-contact-client');
  contactBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const evalId = btn.getAttribute('data-eval-id') || btn.getAttribute('data-id') || '';
      const clientName = btn.getAttribute('data-client-name') || 'Contributeur';
      const clientEmail = btn.getAttribute('data-client-email') || '';
      const entityName = btn.getAttribute('data-entity-name') || '';
      const rating = btn.getAttribute('data-eval-rating') || '4';
      showContactClientModal({ evalId, clientName, clientEmail, entityName, rating }, appState, renderCallback);
    });
  });

  // --- Workflow Status triggers (Enterprise side) ---
  const workflowTriggers = containerEl.querySelectorAll('.btn-workflow-trigger');
  workflowTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const evalId = btn.getAttribute('data-eval-id') || '';
      const currentStep = parseInt(btn.getAttribute('data-workflow-step') || 0);
      const clientName = btn.getAttribute('data-client-name') || 'Contributeur';
      const entityName = btn.getAttribute('data-entity-name') || '';
      const rating = btn.getAttribute('data-eval-rating') || '4';
      const comment = btn.getAttribute('data-eval-comment') || '';
      showWorkflowStatusModal({ evalId, currentStep, clientName, entityName, rating, comment }, appState, renderCallback);
    });
  });

  // --- Messages Reçus discussion clicks (Client side) ---
  const convItems = containerEl.querySelectorAll('.conversation-card-item');
  convItems.forEach(item => {
    item.addEventListener('click', () => {
      const convId = item.getAttribute('data-conv-id');
      if (convId) showChatConversationModal(convId, appState, renderCallback);
    });
  });

  // --- Scroll to Messages button from banner ---
  const scrollBtn = containerEl.querySelector('#btn-scroll-to-messages');
  // --- Attach Lightbox to photo attachments ---
  attachLightboxToImages(containerEl);
}

function showContactClientModal({ evalId, clientName, clientEmail, entityName, rating }, appState, renderCallback) {
  const oldModal = document.getElementById('contact-client-modal');
  if (oldModal) oldModal.remove();

  const currentUser = appState.currentUser || {};
  const enterpriseName = (currentUser.businessProfile && currentUser.businessProfile.actorName) || currentUser.name || "Mon Établissement";
  const enterpriseEmail = currentUser.email || "contact@entreprise.tn";

  // Check if a conversation thread already exists
  let allConvs = [];
  try {
    const raw = localStorage.getItem("PERFECT_CONVERSATIONS_V1");
    if (raw) allConvs = JSON.parse(raw);
  } catch (e) {}

  const cleanEntEmail = enterpriseEmail.trim().toLowerCase();
  const cleanCliEmail = (clientEmail || 'client').trim().toLowerCase();
  const convId = `conv_${evalId || 'direct'}_${cleanEntEmail}_${cleanCliEmail}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const existingConv = allConvs.find(c => c.id === convId || (c.clientName === clientName && c.enterpriseEmail === enterpriseEmail));

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'contact-client-modal';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    padding: 16px; animation: fadeIn 0.3s ease;
  `;

  modalOverlay.innerHTML = `
    <div style="background: white; border-radius: 16px; width: 100%; max-width: 440px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);">
      <!-- Modal Header -->
      <div style="padding: 16px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; background: #F8FAFC;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">💬</span>
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #002B49;">Contacter le client</div>
            <div style="font-size: 10px; color: #64748B;">Échange direct via la messagerie interne</div>
          </div>
        </div>
        <button id="close-contact-modal-btn" style="background: none; border: none; font-size: 18px; color: #94A3B8; cursor: pointer; padding: 4px;">✕</button>
      </div>

      <!-- Modal Body -->
      <div style="padding: 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px;">
        <!-- Field 1: Client Name (Read-only / Uneditable) -->
        <div>
          <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">
            Nom du client / Destinataire (non modifiable)
          </label>
          <div style="position: relative;">
            <input 
              type="text" 
              value="${clientName}" 
              readonly 
              disabled 
              style="width: 100%; padding: 10px 12px; border: 1.5px solid #E2E8F0; border-radius: 10px; background: #F1F5F9; color: #002B49; font-weight: 700; font-size: 12px; cursor: not-allowed;"
            />
            <span style="position: absolute; right: 12px; top: 10px; font-size: 12px;">🔒</span>
          </div>
        </div>

        <!-- Conversation History if already exists -->
        ${existingConv && existingConv.messages && existingConv.messages.length > 0 ? `
          <div>
            <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">
              Historique des échanges précédents
            </label>
            <div style="max-height: 160px; overflow-y: auto; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 6px;">
              ${existingConv.messages.map(m => {
                const isMe = m.senderRole === 'entreprise';
                return `
                  <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; max-width: 85%; background: ${isMe ? '#00A859' : '#FFFFFF'}; color: ${isMe ? '#FFFFFF' : '#002B49'}; border: ${isMe ? 'none' : '1px solid #E2E8F0'}; border-radius: 10px; padding: 6px 10px; font-size: 11px;">
                    <div style="font-size: 9px; opacity: 0.8; margin-bottom: 2px;">${m.senderName} (${m.dateDisplay || ''})</div>
                    <div>${m.text}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Field 2: Textarea Message -->
        <div>
          <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">
            Votre message au client
          </label>
          <textarea 
            id="contact-message-input" 
            rows="4" 
            placeholder="Bonjour ${clientName}, suite à votre évaluation nous souhaitions vous apporter les précisions suivantes..."
            style="width: 100%; padding: 10px 12px; border: 1.5px solid #CBD5E1; border-radius: 10px; font-size: 12px; font-family: inherit; resize: vertical; line-height: 1.4; outline: none; transition: border-color 0.2s;"
          ></textarea>
        </div>
      </div>

      <!-- Modal Footer Actions -->
      <div style="padding: 14px 16px; border-top: 1px solid #E2E8F0; background: #F8FAFC; display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancel-contact-modal-btn" class="btn btn-outline" style="width: auto; padding: 8px 16px; font-size: 12px; border-radius: 20px;">
          Annuler
        </button>
        <button id="send-contact-modal-btn" class="btn btn-primary" style="width: auto; padding: 8px 18px; font-size: 12px; font-weight: 700; border-radius: 20px; background: #00A859; border-color: #00A859; display: flex; align-items: center; gap: 6px;">
          Envoyer le message ✉️
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const closeModal = () => modalOverlay.remove();
  document.getElementById('close-contact-modal-btn').addEventListener('click', closeModal);
  document.getElementById('cancel-contact-modal-btn').addEventListener('click', closeModal);

  const msgInput = document.getElementById('contact-message-input');
  msgInput.focus();

  document.getElementById('send-contact-modal-btn').addEventListener('click', async () => {
    const text = msgInput.value.trim();
    if (!text) {
      msgInput.style.borderColor = '#EA5455';
      msgInput.focus();
      return;
    }

    const sendBtn = document.getElementById('send-contact-modal-btn');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Envoi...';

    await firestoreSendMessage({
      evalId,
      enterpriseName,
      enterpriseEmail,
      clientName,
      clientEmail,
      senderRole: 'entreprise',
      senderName: enterpriseName,
      text
    });

    closeModal();

    // Success Toast Notification
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#002B49;color:white;padding:12px 20px;border-radius:14px;font-size:12px;font-weight:700;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:fadeIn 0.3s ease;`;
    toast.textContent = `✅ Message envoyé avec succès à ${clientName} !`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);

    if (renderCallback) renderCallback();
  });
}

function showChatConversationModal(convId, appState, renderCallback) {
  const oldModal = document.getElementById('chat-conversation-modal');
  if (oldModal) oldModal.remove();

  const currentUser = appState.currentUser || {};
  const isBusinessUser = currentUser.role && currentUser.role.toLowerCase().includes('entreprise');
  const activeRole = isBusinessUser ? 'entreprise' : 'contributeur';

  // Mark conversation as read
  firestoreMarkConversationRead(convId, activeRole);

  // Retrieve conversation
  let allConvs = [];
  try {
    const raw = localStorage.getItem("PERFECT_CONVERSATIONS_V1");
    if (raw) allConvs = JSON.parse(raw);
  } catch (e) {}

  let conv = allConvs.find(c => c.id === convId);
  if (!conv) {
    alert("Conversation introuvable.");
    return;
  }

  const otherPartyName = activeRole === 'contributeur' ? (conv.enterpriseName || 'Établissement') : (conv.clientName || 'Contributeur');
  const myName = activeRole === 'contributeur' ? (currentUser.name || 'Moi') : ((currentUser.businessProfile && currentUser.businessProfile.actorName) || currentUser.name || 'Mon Établissement');

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'chat-conversation-modal';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    padding: 16px; animation: fadeIn 0.3s ease;
  `;

  const renderMessagesHTML = (messages) => {
    if (!messages || messages.length === 0) {
      return `<div style="text-align: center; color: #94A3B8; font-size: 11px; padding: 20px;">Début de la discussion. Écrivez votre premier message ci-dessous.</div>`;
    }
    return messages.map(m => {
      const isMe = m.senderRole === activeRole;
      return `
        <div style="display: flex; flex-direction: column; align-self: ${isMe ? 'flex-end' : 'flex-start'}; max-width: 80%;">
          <div style="background: ${isMe ? '#00A859' : '#FFFFFF'}; color: ${isMe ? '#FFFFFF' : '#002B49'}; border: ${isMe ? 'none' : '1px solid #E2E8F0'}; border-radius: ${isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px'}; padding: 9px 13px; font-size: 12px; line-height: 1.35; box-shadow: 0 1px 3px rgba(0,0,0,0.06); word-break: break-word;">
            ${m.text}
          </div>
          <div style="font-size: 8.5px; color: #94A3B8; margin-top: 2px; text-align: ${isMe ? 'right' : 'left'}; padding: 0 4px;">
            ${m.senderName} • ${m.dateDisplay || ''}
          </div>
        </div>
      `;
    }).join('');
  };

  modalOverlay.innerHTML = `
    <div style="background: white; border-radius: 18px; width: 100%; max-width: 460px; height: 85vh; max-height: 600px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
      <!-- Chat Header -->
      <div style="padding: 12px 16px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; background: #002B49; color: white;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: #00A859; color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800;">
            ${activeRole === 'contributeur' ? '🏢' : '👤'}
          </div>
          <div>
            <div style="font-size: 13px; font-weight: 800;">${otherPartyName}</div>
            <div style="font-size: 9.5px; opacity: 0.8;">Échange en direct • Messagerie interne</div>
          </div>
        </div>
        <button id="close-chat-modal-btn" style="background: rgba(255,255,255,0.15); border: none; font-size: 14px; color: white; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>

      <!-- Chat Messages Scroll Container -->
      <div id="chat-messages-container" style="flex: 1; overflow-y: auto; padding: 14px; background: #F1F5F9; display: flex; flex-direction: column; gap: 10px;">
        ${renderMessagesHTML(conv.messages)}
      </div>

      <!-- Chat Input Footer -->
      <div style="padding: 10px 14px; border-top: 1px solid #E2E8F0; background: white; display: flex; align-items: center; gap: 8px;">
        <input 
          id="chat-reply-input" 
          type="text" 
          placeholder="Écrivez votre message..." 
          style="flex: 1; padding: 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 24px; font-size: 12px; font-family: inherit; outline: none;"
        />
        <button 
          id="chat-send-btn" 
          class="btn btn-primary" 
          style="width: auto; padding: 10px 16px; border-radius: 24px; background: #00A859; border-color: #00A859; font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 4px;"
        >
          Envoyer ✉️
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const closeModal = () => {
    modalOverlay.remove();
    if (renderCallback) renderCallback();
  };
  document.getElementById('close-chat-modal-btn').addEventListener('click', closeModal);

  const messagesBox = document.getElementById('chat-messages-container');
  messagesBox.scrollTop = messagesBox.scrollHeight;

  const chatInput = document.getElementById('chat-reply-input');
  chatInput.focus();

  const handleSendMessage = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    chatInput.focus();

    const updated = await firestoreSendMessage({
      evalId: conv.evalId || '',
      enterpriseName: conv.enterpriseName,
      enterpriseEmail: conv.enterpriseEmail,
      clientName: conv.clientName,
      clientEmail: conv.clientEmail,
      senderRole: activeRole,
      senderName: myName,
      text
    });

    conv = updated;
    messagesBox.innerHTML = renderMessagesHTML(conv.messages);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  };

  document.getElementById('chat-send-btn').addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  });
}

function showEditProfileModal(appState, renderCallback) {
  const oldModal = document.getElementById('edit-profile-modal');
  if (oldModal) oldModal.remove();

  const currentUser = appState.currentUser || {};
  const isBusinessUser = currentUser.role && currentUser.role.toLowerCase().includes('entreprise');
  const currentAddress = currentUser.address || '';
  const currentPhone = currentUser.phone || '';
  const currentBirthYear = currentUser.birthYear || currentUser.age || '';
  const currentProfession = currentUser.profession || '';

  const professionOptions = ['Étudiant', 'Salarié', 'Entrepreneur', 'Retraité', 'En recherche d\'emploi'];

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'edit-profile-modal';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.3s ease;
  `;

  modalOverlay.innerHTML = `
    <div style="background: white; border-radius: 20px; padding: 24px 20px; width: 100%; max-width: 360px; text-align: left; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 800; color: #002B49;">✏️ Modifier vos coordonnées</h3>
        <button id="close-edit-modal-btn" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #64748B;">✕</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
        ${!isBusinessUser ? `
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Adresse</label>
            <input type="text" id="edit-profile-address" value="${currentAddress}" placeholder="Ex: Tunis, Tunisie" class="form-control" style="font-size: 12px; margin-top: 4px;" />
          </div>
        ` : ''}

        <div>
          <label style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Téléphone</label>
          <input type="tel" id="edit-profile-phone" value="${currentPhone}" placeholder="Ex: +216 20 123 456" class="form-control" style="font-size: 12px; margin-top: 4px;" />
        </div>

        <div>
          <label style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">${isBusinessUser ? 'Année de création' : 'Année de naissance'}</label>
          <input type="text" id="edit-profile-age" value="${currentBirthYear}" placeholder="${isBusinessUser ? 'Ex: 2015' : 'Ex: 1990'}" class="form-control" style="font-size: 12px; margin-top: 4px;" />
        </div>

        ${!isBusinessUser ? `
          <div>
            <label style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Profession</label>
            <select id="edit-profile-profession" class="form-control" style="font-size: 12px; margin-top: 4px;">
              <option value="">-- Sélectionner --</option>
              ${professionOptions.map(p => `<option value="${p}" ${currentProfession === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
        ` : ''}
      </div>

      <div style="display: flex; gap: 10px;">
        <button id="cancel-edit-modal-btn" class="btn btn-outline" style="flex: 1; padding: 10px; font-size: 13px;">Annuler</button>
        <button id="save-edit-modal-btn" class="btn btn-primary" style="flex: 1; padding: 10px; font-size: 13px; background: #00A859; border-color: #00A859;">Enregistrer</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const closeBtn = document.getElementById('close-edit-modal-btn');
  const cancelBtn = document.getElementById('cancel-edit-modal-btn');
  const saveBtn = document.getElementById('save-edit-modal-btn');

  const closeModal = () => modalOverlay.remove();
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  saveBtn.addEventListener('click', () => {
    const addressEl = document.getElementById('edit-profile-address');
    const phoneEl = document.getElementById('edit-profile-phone');
    const ageEl = document.getElementById('edit-profile-age');
    const professionEl = document.getElementById('edit-profile-profession');

    const address = addressEl ? addressEl.value.trim() : (appState.currentUser.address || '');
    const phone = phoneEl ? phoneEl.value.trim() : (appState.currentUser.phone || '');
    const age = ageEl ? ageEl.value.trim() : (appState.currentUser.birthYear || appState.currentUser.age || '');
    const profession = professionEl ? professionEl.value.trim() : (appState.currentUser.profession || '');

    if (!appState.currentUser) appState.currentUser = {};
    if (addressEl) appState.currentUser.address = address || '—';
    appState.currentUser.phone = phone || '—';
    appState.currentUser.birthYear = age || '—';
    appState.currentUser.age = age || '—';
    if (professionEl) appState.currentUser.profession = profession || '—';

    // Persist to Firestore if user is authenticated
    const uid = appState.currentUser.uid || appState.currentUser.id;
    if (uid) {
      const updateData = {
        phone: appState.currentUser.phone,
        birthYear: appState.currentUser.birthYear,
        age: appState.currentUser.age
      };
      if (addressEl) updateData.address = appState.currentUser.address;
      if (professionEl) updateData.profession = appState.currentUser.profession;
      firestoreUpdateUserProfile(uid, updateData);
    }

    if (appState.data) {
      dbStorage.saveState(appState.data);
    }

    closeModal();
    if (renderCallback) renderCallback();
  });
}

// ─── Identity Verification Modal ───────────────────────────────────────────────
function showVerifyIdentityModal(appState, renderCallback) {
  const oldModal = document.getElementById('verify-identity-modal');
  if (oldModal) oldModal.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'verify-identity-modal';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.3s ease;
  `;

  modalOverlay.innerHTML = `
    <div style="background: white; border-radius: 20px; padding: 24px 20px; width: 100%; max-width: 360px; text-align: left; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 800; color: #002B49;">🪪 Vérification d'identité</h3>
        <button id="close-verify-modal-btn" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #64748B;">✕</button>
      </div>

      <p style="font-size: 11px; color: #64748B; margin-bottom: 14px; line-height: 1.5;">
        Pour obtenir le badge <strong style="color:#007A3D;">✓ VÉRIFIÉ</strong>, uploadez une copie de votre pièce d'identité (CIN, passeport).
        Elle sera examinée par notre équipe dans un délai de 24–48h.
      </p>

      <div id="verify-upload-zone" style="border: 2px dashed #CBD5E1; border-radius: 14px; padding: 20px 14px; text-align: center; cursor: pointer; background: #F8FAFC; margin-bottom: 14px; transition: all 0.2s;">
        <div style="font-size: 30px; margin-bottom: 4px;">🪪</div>
        <div style="font-size: 12px; font-weight: 700; color: #002B49;">Cliquez ou glissez votre pièce d'identité</div>
        <div style="font-size: 10px; color: #94A3B8; margin-top: 2px; margin-bottom: 10px;">Carte CIN, Passeport (JPG, PNG ou PDF — max 5 Mo)</div>
        <button type="button" id="btn-browse-verify-file" style="background: #002B49; color: white; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; padding: 6px 14px; cursor: pointer;">
          📁 Choisir le fichier / Prendre photo
        </button>
        <input type="file" id="verify-id-input" accept="image/*,.pdf" style="display:none;" />
      </div>
      <div id="verify-file-preview-container" style="display:none; margin-bottom: 14px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 8px 12px; text-align: center;">
        <img id="verify-img-thumb" src="" style="max-height: 80px; max-width: 100%; border-radius: 6px; margin-bottom: 4px; display: none;" />
        <div id="verify-file-preview" style="font-size: 11.5px; color: #166534; font-weight: 700;"></div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button id="cancel-verify-modal-btn" class="btn btn-outline" style="flex: 1; padding: 10px; font-size: 13px;">Annuler</button>
        <button id="submit-verify-modal-btn" class="btn btn-primary" style="flex: 1; padding: 10px; font-size: 13px; background: #002B49; border-color: #002B49;" disabled>
          Envoyer la demande
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const closeModal = () => modalOverlay.remove();
  document.getElementById('close-verify-modal-btn').addEventListener('click', closeModal);
  document.getElementById('cancel-verify-modal-btn').addEventListener('click', closeModal);

  const uploadZone = document.getElementById('verify-upload-zone');
  const btnBrowseFile = document.getElementById('btn-browse-verify-file');
  const fileInput = document.getElementById('verify-id-input');
  const previewContainer = document.getElementById('verify-file-preview-container');
  const filePreview = document.getElementById('verify-file-preview');
  const imgThumb = document.getElementById('verify-img-thumb');
  const submitBtn = document.getElementById('submit-verify-modal-btn');

  const triggerFileInput = (e) => {
    if (e) e.stopPropagation();
    fileInput.click();
  };

  uploadZone.addEventListener('click', triggerFileInput);
  btnBrowseFile.addEventListener('click', triggerFileInput);

  let selectedIdDocBase64 = null;
  let selectedIdDocName = null;
  let selectedIdDocType = null;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) {
      selectedIdDocName = file.name;
      selectedIdDocType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      previewContainer.style.display = 'block';
      filePreview.textContent = `⏳ Traitement de ${file.name}...`;

      try {
        const res = await compressImageFile(file, 900, 900, 0.75);
        if (res && res.dataUrl) {
          selectedIdDocBase64 = res.dataUrl;
          filePreview.textContent = `✓ Fichier prêt : ${file.name} (${(res.dataUrl.length / 1024).toFixed(0)} Ko)`;
          submitBtn.removeAttribute('disabled');
          uploadZone.style.borderColor = '#00A859';

          if (res.isImage) {
            imgThumb.src = res.dataUrl;
            imgThumb.style.display = 'inline-block';
          } else {
            imgThumb.style.display = 'none';
          }
        }
      } catch (err) {
        console.warn("ID doc compression error:", err);
        filePreview.textContent = `✓ Fichier sélectionné : ${file.name}`;
        submitBtn.removeAttribute('disabled');
      }
    }
  });

  submitBtn.addEventListener('click', () => {
    const docDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Mark pending verification in appState and Firestore
    if (!appState.currentUser) appState.currentUser = {};
    appState.currentUser.verificationPending = true;
    if (selectedIdDocBase64) {
      appState.currentUser.idDocBase64 = selectedIdDocBase64;
      appState.currentUser.idDocName = selectedIdDocName;
      appState.currentUser.idDocType = selectedIdDocType;
      appState.currentUser.idDocDate = docDate;
    }

    const uid = appState.currentUser.uid || appState.currentUser.id;
    if (uid) {
      firestoreUpdateUserProfile(uid, {
        verificationPending: true,
        idDocBase64: selectedIdDocBase64 || null,
        idDocName: selectedIdDocName || 'Piece_Identite.jpg',
        idDocType: selectedIdDocType || 'image/jpeg',
        idDocDate: docDate
      });
    }

    // Also flag in admin contributors list for immediate access
    if (appState.data && appState.data.adminStats && appState.data.adminStats.contributors) {
      const contrib = appState.data.adminStats.contributors.find(
        c => c.id === uid || (appState.currentUser && c.email === appState.currentUser.email)
      );
      if (contrib) {
        contrib.verificationPending = true;
        contrib.idDocBase64 = selectedIdDocBase64 || null;
        contrib.idDocName = selectedIdDocName || 'Piece_Identite.jpg';
        contrib.idDocType = selectedIdDocType || 'image/jpeg';
        contrib.idDocDate = docDate;
      }
      dbStorage.saveState(appState.data);
    }

    closeModal();
    // Show success toast
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#002B49;color:white;padding:12px 20px;border-radius:14px;font-size:12px;font-weight:700;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:fadeIn 0.3s ease;`;
    toast.textContent = '✅ Demande envoyée ! Votre pièce d\'identité est en cours d\'examen.';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);

    if (renderCallback) renderCallback();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Status Modal for Enterprise Users
// ─────────────────────────────────────────────────────────────────────────────
function showWorkflowStatusModal({ evalId, currentStep, clientName, entityName, rating, comment }, appState, renderCallback) {
  const oldModal = document.getElementById('workflow-status-modal');
  if (oldModal) oldModal.remove();

  let selectedStep = parseInt(currentStep) || 0;

  const WORKFLOW_STAGES = [
    {
      step: 1,
      title: "Étape 1 : Accusé de réception",
      desc: "L'établissement accuse bonne réception du rating et des remarques formulées."
    },
    {
      step: 2,
      title: "Étape 2 : Identification des solutions",
      desc: "Les procédures internes sont initiées pour identifier les solutions et actions requises."
    },
    {
      step: 3,
      title: "Étape 3 : Début de mise en œuvre",
      desc: "La mise en œuvre des solutions et actions correctives a débuté sur le terrain."
    },
    {
      step: 4,
      title: "Étape 4 : Mi-parcours de réalisation",
      desc: "La mise en œuvre des solutions est avancée à mi-parcours de son déploiement."
    },
    {
      step: 5,
      title: "Étape 5 : Finalisation & Demande traitée",
      desc: "La mise en œuvre des solutions est finalisée ; la demande a été pleinement prise en compte."
    }
  ];

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'workflow-status-modal';
  modalOverlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0, 43, 73, 0.65); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 16px;
    animation: fadeIn 0.2s ease;
  `;

  function renderModalContent() {
    const stepsHTML = WORKFLOW_STAGES.map(s => {
      const isSelected = selectedStep === s.step;
      const isPast = selectedStep > s.step;
      const borderColor = isSelected ? '#00A859' : (isPast ? '#A7F3D0' : '#E2E8F0');
      const bgColor = isSelected ? '#F0FDF4' : (isPast ? '#F8FAFC' : '#FFFFFF');
      const badgeBg = isSelected ? '#00A859' : (isPast ? '#10B981' : '#E2E8F0');
      const badgeColor = (isSelected || isPast) ? '#FFFFFF' : '#64748B';

      return `
        <div class="workflow-step-option" data-step="${s.step}" style="
          border: 2px solid ${borderColor};
          background: ${bgColor};
          border-radius: 12px;
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          box-shadow: ${isSelected ? '0 4px 12px rgba(0, 168, 89, 0.12)' : 'none'};
        ">
          <div style="
            width: 26px; height: 26px; border-radius: 50%;
            background: ${badgeBg}; color: ${badgeColor};
            font-size: 11px; font-weight: 800;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; margin-top: 1px;
          ">
            ${isPast ? '✓' : s.step}
          </div>

          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
              <span style="font-size: 12px; font-weight: 800; color: ${isSelected ? '#007A3D' : '#002B49'};">
                ${s.title}
              </span>
              ${isSelected ? `
                <span style="font-size: 9px; font-weight: 800; background: #D1FADF; color: #027A48; padding: 2px 7px; border-radius: 8px;">
                  Étape Actuelle
                </span>
              ` : (isPast ? `
                <span style="font-size: 9px; font-weight: 700; color: #059669;">
                  ✓ Validée
                </span>
              ` : '')}
            </div>
            <p style="font-size: 10.5px; color: #64748B; margin: 0; line-height: 1.4;">
              ${s.desc}
            </p>
          </div>
        </div>
      `;
    }).join('');

    modalOverlay.innerHTML = `
      <div style="
        background: #FFFFFF; border-radius: 20px; max-width: 480px; width: 100%; max-height: 90vh;
        overflow-y: auto; box-shadow: 0 20px 40px rgba(0, 43, 73, 0.25); border: 1px solid #E2E8F0;
        display: flex; flex-direction: column;
      ">
        <!-- Header -->
        <div style="
          padding: 16px 20px; border-bottom: 1px solid #F1F5F9;
          display: flex; justify-content: space-between; align-items: center; background: #FAFBFD;
          border-top-left-radius: 20px; border-top-right-radius: 20px;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">⚙️</span>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #002B49;">État de prise en compte</div>
              <div style="font-size: 10px; color: #64748B;">Progression du traitement de l'évaluation</div>
            </div>
          </div>
          <button id="btn-close-workflow-modal" style="
            background: #F1F5F9; border: none; font-size: 16px; width: 28px; height: 28px;
            border-radius: 50%; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center;
          ">×</button>
        </div>

        <!-- Rating Context Summary Box -->
        <div style="padding: 14px 20px 0 20px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 11px; font-weight: 700; color: #002B49;">👤 ${clientName}</span>
              <span style="font-size: 11px; font-weight: 800; color: #00A859;">★ ${parseFloat(rating || 0).toFixed(1)}/5.0</span>
            </div>
            ${comment ? `
              <div style="font-size: 10px; color: #475569; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                "${comment}"
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Steps Selection List -->
        <div style="padding: 14px 20px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 11px; font-weight: 700; color: #002B49; margin-bottom: 2px;">
            Sélectionnez l'étape d'avancement atteinte :
          </div>
          ${stepsHTML}
        </div>

        <!-- Footer Actions -->
        <div style="
          padding: 14px 20px 18px 20px; border-top: 1px solid #F1F5F9; background: #FAFBFD;
          display: flex; gap: 10px; align-items: center; justify-content: space-between;
          border-bottom-left-radius: 20px; border-bottom-right-radius: 20px;
        ">
          <button id="btn-reset-workflow-step" style="
            background: none; border: 1px solid #CBD5E1; color: #64748B; padding: 8px 12px;
            border-radius: 10px; font-size: 11px; font-weight: 600; cursor: pointer;
          " title="Remettre à l'état initial non initié">
            🔄 Réinitialiser
          </button>

          <div style="display: flex; gap: 8px;">
            <button id="btn-cancel-workflow" style="
              background: #F1F5F9; border: none; color: #475569; padding: 8px 14px;
              border-radius: 10px; font-size: 11px; font-weight: 700; cursor: pointer;
            ">
              Annuler
            </button>
            <button id="btn-save-workflow" style="
              background: #00A859; border: none; color: #FFFFFF; padding: 8px 18px;
              border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer;
              box-shadow: 0 4px 12px rgba(0, 168, 89, 0.25);
            ">
              Enregistrer l'étape
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach step click handlers
    modalOverlay.querySelectorAll('.workflow-step-option').forEach(el => {
      el.addEventListener('click', () => {
        const stepNum = parseInt(el.getAttribute('data-step')) || 0;
        selectedStep = stepNum;
        renderModalContent();
      });
    });

    // Reset button
    const resetBtn = modalOverlay.querySelector('#btn-reset-workflow-step');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        selectedStep = 0;
        renderModalContent();
      });
    }

    // Close & Cancel
    const closeBtn = modalOverlay.querySelector('#btn-close-workflow-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => modalOverlay.remove());

    const cancelBtn = modalOverlay.querySelector('#btn-cancel-workflow');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modalOverlay.remove());

    // Save button
    const saveBtn = modalOverlay.querySelector('#btn-save-workflow');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Enregistrement...';

        const currentUser = appState.currentUser || {};
        const updaterEmail = currentUser.email || currentUser.name || '';

        // 1. Update in Firestore
        try {
          await firestoreUpdateEvaluationWorkflow(evalId, selectedStep, updaterEmail, entityName, clientName);
        } catch (err) {
          console.warn('Could not sync workflow step to Firestore:', err);
        }

        // 2. Update in-memory state
        if (appState.data && Array.isArray(appState.data.recentEvaluations)) {
          const match = appState.data.recentEvaluations.find(e => e.id === evalId || (e.targetEntity === entityName && e.authorName === clientName));
          if (match) match.workflowStep = selectedStep;
        }

        if (Array.isArray(appState.currentUserEvals)) {
          const match = appState.currentUserEvals.find(e => e.id === evalId || (e.targetEntity === entityName && e.authorName === clientName));
          if (match) match.workflowStep = selectedStep;
        }

        modalOverlay.remove();

        // 3. Success Toast
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
          background: #002B49; color: white; padding: 12px 20px; border-radius: 14px;
          font-size: 12px; font-weight: 700; z-index: 99999; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          animation: fadeIn 0.3s ease;
        `;
        toast.textContent = selectedStep > 0
          ? `✅ Étape ${selectedStep}/5 enregistrée ! Votre client peut maintenant suivre l'avancement.`
          : `✅ État de prise en compte réinitialisé.`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);

        // 4. Re-render profile history view
        if (renderCallback) renderCallback();
      });
    }
  }

  renderModalContent();
  document.body.appendChild(modalOverlay);
}


