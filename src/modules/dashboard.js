// General Dashboard Module (Tableau Général)

import { renderGaugeMeter } from '../components/gauge.js';
import { locationData } from '../data/locations.js';
import { initialAppData } from '../data/mockData.js';
import { attachLightboxToImages } from '../utils/imageLightbox.js';
import { initRadarChart } from '../components/radar.js';
import { getRadarScoresFromEvals } from './analytics.js';
import { renderAuthorAvatarHTML, renderAuthorVerifiedBadgeHTML } from '../utils/avatarHelper.js';

// Color helper function based on score (0-5 scale)
function getScoreColor(score) {
  if (score < 1.0) return "#EA5455"; // Red (0 - 1)
  if (score < 2.0) return "#FF9F43"; // Orange (1 - 2)
  if (score < 3.0) return "#FFB800"; // Yellow (2 - 3)
  if (score < 4.0) return "#28C76F"; // Light Green (3 - 4)
  return "#00A859";                  // Dark Green (4 - 5)
}

// Star string generator helper
function renderStarRating(rating) {
  const fullStars = Math.floor(rating);
  let stars = '';
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars += '★';
    } else {
      stars += '☆';
    }
  }
  return stars;
}

export function renderDashboardView(appState, translations) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;
  const data = appState.data;

  const currentCountryCode = appState.selectedCountry || "TN";
  const selectedCountryObj = locationData.find(c => c.code === currentCountryCode) || locationData[0];

  // Country Dropdown Options HTML
  const countryOptionsHTML = locationData.map(c => `
    <option value="${c.code}" ${c.code === currentCountryCode ? 'selected' : ''}>${c.flag} ${c.names[lang] || c.names.fr}</option>
  `).join('');

  // Robust string normalizer
  const normalizeStr = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  };

  // Filter evaluations for the selected country (or all if country matches)
  const allRecentEvals = data.recentEvaluations || [];
  const activeEvals = allRecentEvals;
  const totalEvalsCount = activeEvals.length;

  // 3. CARD 3 Calculation First (Indice Sectoriel for 7 Macro-Sectors)
  const sectorMapKeys = [
    { id: "Governance", l1: "Gouvernance", l2: "", keywords: ["gouv", "gov", "just", "parl", "minist", "tribun"] },
    { id: "SecurityDefense", l1: "Sécurité &", l2: "Défense", keywords: ["securite", "secu", "defense", "def", "police", "polic", "gendarmerie", "gend", "armee"] },
    { id: "HealthHygiene", l1: "Santé &", l2: "Hygiène", keywords: ["sante", "sant", "hygiene", "hyg", "medecine", "med", "pharmacie", "pharm", "hopital", "hopit", "clinique"] },
    { id: "InstructionCulture", l1: "Instruction &", l2: "Culture", keywords: ["instruction", "inst", "culture", "cult", "education", "educ", "universite", "univ", "ecole", "ecol", "lycee"] },
    { id: "FoodFinance", l1: "Alimentation &", l2: "Finance", keywords: ["alimentation", "alim", "finance", "finan", "agriculture", "agri", "banque", "banq", "bourse", "assurance"] },
    { id: "HousingTourism", l1: "Logement &", l2: "Tourisme", keywords: ["logement", "log", "tourisme", "tour", "hotel", "hot", "immobilier", "immo", "urbanisme"] },
    { id: "TransportTelco", l1: "Transport &", l2: "Télécoms", keywords: ["transport", "trans", "telecoms", "tel", "telephonie", "internet", "route", "rout", "bus", "train", "post"] }
  ];

  const sectorTotals = {};
  const sectorCounts = {};

  // NDPI macro-sector ID → macroScores JSON key mapping
  const ndpiMacroKeyMap = {
    Governance: 'Governance', SecurityDefense: 'SecurityDefense',
    HealthHygiene: 'HealthHygiene', InstructionCulture: 'InstructionCulture',
    FoodFinance: 'FoodFinance', HousingTourism: 'HousingTourism', TransportTelco: 'TransportTelco'
  };

  activeEvals.forEach(e => {
    // NDPI territorial docs: macroScores has all 7 sector scores — use them directly
    if (e.isTerritoryRating && e.macroScores) {
      let parsedMacro = null;
      try { parsedMacro = typeof e.macroScores === 'string' ? JSON.parse(e.macroScores) : e.macroScores; } catch(_) {}
      if (parsedMacro) {
        sectorMapKeys.forEach(s => {
          const val = parsedMacro[ndpiMacroKeyMap[s.id]];
          if (val !== undefined && val !== null) {
            if (!sectorTotals[s.id]) { sectorTotals[s.id] = 0; sectorCounts[s.id] = 0; }
            sectorTotals[s.id] += parseFloat(val) || 0;
            sectorCounts[s.id]++;
          }
        });
        return; // skip normal sector matching for this NDPI doc
      }
    }
    // Normal evaluation: match by macroSector field
    const secNorm = normalizeStr(e.sectorName || e.macroSector || e.sector || '');
    const matched = sectorMapKeys.find(s => {
      const sIdNorm = normalizeStr(s.id);
      const l1Norm = normalizeStr(s.l1);
      return sIdNorm === secNorm ||
             (secNorm && sIdNorm.includes(secNorm)) ||
             (secNorm && secNorm.includes(sIdNorm)) ||
             (l1Norm && secNorm.includes(l1Norm)) ||
             s.keywords.some(k => secNorm.includes(normalizeStr(k)));
    });
    if (matched) {
      const sid = matched.id;
      if (!sectorTotals[sid]) { sectorTotals[sid] = 0; sectorCounts[sid] = 0; }
      sectorTotals[sid] += parseFloat(e.rating) || 0;
      sectorCounts[sid]++;
    }
  });

  const sectorsData = sectorMapKeys.map(s => {
    const score = sectorCounts[s.id] > 0
      ? parseFloat((sectorTotals[s.id] / sectorCounts[s.id]).toFixed(1))
      : 0.0;
    return { ...s, score };
  });

  // Calculate Indice National as average of evaluated sector averages (Moyenne des moyennes sectorielles)
  const evaluatedSectors = sectorsData.filter(s => sectorCounts[s.id] > 0);
  const computedOverallScore = evaluatedSectors.length > 0
    ? parseFloat((evaluatedSectors.reduce((sum, s) => sum + s.score, 0) / evaluatedSectors.length).toFixed(1))
    : (totalEvalsCount > 0
        ? parseFloat((activeEvals.reduce((s, e) => s + (parseFloat(e.rating) || 0), 0) / totalEvalsCount).toFixed(1))
        : (data.overallScore || 0));

  // 1. CARD 1: Indice National Gauge Meter
  const gaugeHTML = renderGaugeMeter(
    computedOverallScore, 
    data.maxScore || 5.0, 
    computedOverallScore >= 4.0 ? t.scoreStatusGood : "Modéré", 
    t.indiceNationalTitle, 
    totalEvalsCount, 
    t.basedOnRatings
  );

  // Helper to normalize pillar string
  const normalizePillar = (pStr) => {
    if (!pStr) return 'Social';
    const s = normalizeStr(pStr);
    if (s.includes('econ')) return 'Economic';
    if (s.includes('env')) return 'Environmental';
    return 'Social';
  };

  // 2. CARD 2: Indice Sociétal (Vertical Bar Chart Histogram for 3 Pillars)
  const pillarTotals = { Economic: 0, Social: 0, Environmental: 0 };
  const pillarCounts = { Economic: 0, Social: 0, Environmental: 0 };

  activeEvals.forEach(e => {
    // NDPI territorial docs: use real pillarScores computed from indicatorsData
    if (e.isTerritoryRating && (e.pillarScores || e.indicatorsData)) {
      let scores = e.pillarScores;
      if (!scores && e.indicatorsData) {
        try {
          const arr = typeof e.indicatorsData === 'string' ? JSON.parse(e.indicatorsData) : e.indicatorsData;
          if (Array.isArray(arr) && arr.length > 0) {
            let eTot = 0, eCnt = 0, sTot = 0, sCnt = 0, envTot = 0, envCnt = 0;
            for (let i = 0; i < arr.length; i++) {
              const ind = arr[i];
              if (ind.p === 'Economic') { eTot += ind.r; eCnt++; }
              else if (ind.p === 'Social') { sTot += ind.r; sCnt++; }
              else if (ind.p === 'Environmental') { envTot += ind.r; envCnt++; }
            }
            scores = {
              Economic: eCnt > 0 ? eTot / eCnt : 0,
              Social: sCnt > 0 ? sTot / sCnt : 0,
              Environmental: envCnt > 0 ? envTot / envCnt : 0
            };
          }
        } catch (_) {}
      }

      if (scores) {
        if (scores.Economic !== undefined && scores.Economic > 0) {
          pillarTotals.Economic += parseFloat(scores.Economic) || 0;
          pillarCounts.Economic++;
        }
        if (scores.Social !== undefined && scores.Social > 0) {
          pillarTotals.Social += parseFloat(scores.Social) || 0;
          pillarCounts.Social++;
        }
        if (scores.Environmental !== undefined && scores.Environmental > 0) {
          pillarTotals.Environmental += parseFloat(scores.Environmental) || 0;
          pillarCounts.Environmental++;
        }
        return; // skip normal pillar matching for this NDPI doc
      }
    }
    // Normal evaluation: match by pillar field
    const p = normalizePillar(e.pillar || e.societalPillar);
    pillarTotals[p] += parseFloat(e.rating) || 0;
    pillarCounts[p]++;
  });

  const getPillarScore = (pillarKey) => {
    return pillarCounts[pillarKey] > 0
      ? parseFloat((pillarTotals[pillarKey] / pillarCounts[pillarKey]).toFixed(1))
      : 0.0;
  };

  const pillarsData = [
    { label: t.pillarEconomic, score: getPillarScore('Economic') },
    { label: t.pillarSocial, score: getPillarScore('Social') },
    { label: t.pillarEnvironmental, score: getPillarScore('Environmental') }
  ];

  const pillarBarsHTML = pillarsData.map(p => {
    const heightPercent = (p.score / 5.0) * 100;
    const color = getScoreColor(p.score);
    return `
      <div class="v-bar-item">
        <div class="v-bar-val" style="color: ${color};">${p.score.toFixed(1)}</div>
        <div class="v-bar-fill" style="height: ${heightPercent}%; background: ${color}; width: 32px;"></div>
        <div class="pillar-label-anchor">
          <span class="pillar-label-text">${p.label}</span>
        </div>
      </div>
    `;
  }).join('');

  const sectorBarsHTML = sectorsData.map(s => {
    const heightPercent = (s.score / 5.0) * 100;
    const color = getScoreColor(s.score);
    return `
      <div class="v-bar-item">
        <div class="v-bar-val" style="color: ${color};">${s.score.toFixed(1)}</div>
        <div class="v-bar-fill" style="height: ${heightPercent}%; background: ${color};"></div>
        <div class="sector-label-wrapper">
          <div class="sector-label-oblique">
            <div style="white-space: nowrap;">${s.l1}</div>
            ${s.l2 ? `<div style="white-space: nowrap;">${s.l2}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 4. CARD 4: Indice Territorial (Horizontal Bar Chart Histogram for Selected Country Regions)
  const regionTotals = {};
  const regionCounts = {};

  activeEvals.forEach(e => {
    const eRegionNorm = normalizeStr(e.region);
    const eLocalityNorm = normalizeStr(e.locality);
    const eLocationNorm = normalizeStr(e.location);

    selectedCountryObj.regions.forEach(r => {
      const rIdNorm = normalizeStr(r.id);
      const rNameFrNorm = normalizeStr(r.names ? r.names.fr : '');
      const rNameEnNorm = normalizeStr(r.names ? r.names.en : '');
      const rLocsNorm = (r.localities || []).map(l => normalizeStr(l));

      const isMatch = (eRegionNorm && (
                        eRegionNorm === rIdNorm || 
                        eRegionNorm === rNameFrNorm || 
                        eRegionNorm === rNameEnNorm || 
                        eRegionNorm.includes(rIdNorm) || 
                        rIdNorm.includes(eRegionNorm) || 
                        eRegionNorm.includes(rNameFrNorm) || 
                        rNameFrNorm.includes(eRegionNorm)
                      )) ||
                      (eLocationNorm && (eLocationNorm.includes(rIdNorm) || eLocationNorm.includes(rNameFrNorm))) ||
                      (eLocalityNorm && rLocsNorm.some(loc => loc && loc.length > 2 && (eLocalityNorm.includes(loc) || loc.includes(eLocalityNorm))));


      if (isMatch) {
        if (!regionTotals[r.id]) { regionTotals[r.id] = 0; regionCounts[r.id] = 0; }
        regionTotals[r.id] += parseFloat(e.rating) || 0;
        regionCounts[r.id]++;
      }
    });
  });

  const regionsDataRaw = selectedCountryObj.regions.map(r => {
    const rName = r.names[lang] || r.names.fr;
    const score = regionCounts[r.id] > 0
      ? parseFloat((regionTotals[r.id] / regionCounts[r.id]).toFixed(1))
      : 0.0;
    return { name: rName, score };
  });

  // Sort: default descending by score
  const territorialSort = appState.territorialSort || 'desc';
  const regionsData = [...regionsDataRaw].sort((a, b) =>
    territorialSort === 'alpha'
      ? a.name.localeCompare(b.name, 'fr')
      : b.score - a.score
  );

  const regionBarsHTML = regionsData.map((r, i) => {
    const widthPercent = (r.score / 5.0) * 100;
    const color = getScoreColor(r.score);
    return `
      <div class="h-bar-item">
        <div class="h-bar-info">
          <span style="font-weight: 700;">${territorialSort === 'desc' ? `<span style="font-size:9px;color:#94A3B8;margin-right:4px;">#${i+1}</span>` : ''}${r.name}</span>
          <span style="color: ${color}; font-weight: 800;">${r.score.toFixed(1)} / 5.0</span>
        </div>
        <div class="h-bar-track">
          <div class="h-bar-fill" style="width: ${widthPercent}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');

  // Helper to dynamically find custom avatar for an actor (business user profile)
  const findActorAvatar = (actorName) => {
    if (!actorName) return null;
    const normName = normalizeStr(actorName);

    const matchUser = (u) => {
      if (!u) return false;
      const uActor = (u.businessProfile && u.businessProfile.actorName) || u.name || u.displayName || '';
      return (normalizeStr(uActor) === normName || normalizeStr(u.name || '') === normName)
        && !!(u.avatarBase64 || u.photoURL || u.photoUrl);
    };

    // 1. Check logged-in user (business account)
    const cu = appState.currentUser;
    if (cu && matchUser(cu)) return cu.avatarBase64 || cu.photoURL || cu.photoUrl;

    // 2. Check appState.allUsers (admin-loaded list)
    const allUsers = appState.allUsers || (appState.data && appState.data.allUsers) || [];
    const found1 = allUsers.find(matchUser);
    if (found1) return found1.avatarBase64 || found1.photoURL || found1.photoUrl;

    // 3. Check appState.users
    const users = appState.users || [];
    const found2 = users.find(matchUser);
    if (found2) return found2.avatarBase64 || found2.photoURL || found2.photoUrl;

    // 4. Check contributors array
    const contributors = (appState.data && appState.data.adminStats && appState.data.adminStats.contributors) || [];
    const found3 = contributors.find(matchUser);
    if (found3) return found3.avatarBase64 || found3.photoURL || found3.photoUrl;

    return null;
  };

  // 5. CARD 5: Top 10 Acteurs Horizontal Carousel
  let top10Actors = [];
  if (totalEvalsCount > 0) {
    const actorGroup = {};
    activeEvals.forEach(e => {
      const aName = e.targetEntity || e.actorName || "Acteur Public";
      if (!actorGroup[aName]) {
        actorGroup[aName] = {
          name: aName,
          sector: e.sectorName || e.macroSector || "Gouvernance",
          ratingsSum: 0,
          count: 0
        };
      }
      actorGroup[aName].ratingsSum += parseFloat(e.rating) || 0;
      actorGroup[aName].count++;
    });

    top10Actors = Object.values(actorGroup).map((a, idx) => {
      const customAvatar = findActorAvatar(a.name);
      return {
        id: `act-${idx}`,
        rank: idx + 1,
        name: a.name,
        sector: a.sector,
        score: parseFloat((a.ratingsSum / a.count).toFixed(1)),
        avatarUrl: customAvatar || `https://images.unsplash.com/photo-${1534528741775 + idx * 100}?w=150&auto=format&fit=crop&q=80`
      };
    }).sort((a, b) => b.score - a.score).slice(0, 10);
  }

  // No fallback to mock data — if no Firestore evals exist, top10Actors stays empty
  // and the card will show an appropriate empty-state message.

  const top10CarouselHTML = top10Actors.map(actor => `
    <div class="actor-carousel-card action-actor-item" 
      data-actor-id="${actor.id}" 
      data-actor-name="${actor.name}" 
      data-actor-sector="${t.sectors[actor.sector] || actor.sector}" 
      data-actor-score="${actor.score.toFixed(1)}" 
      data-actor-avatar="${actor.avatarUrl}"
      style="cursor: pointer;">
      <span class="actor-rank-badge">#${actor.rank}</span>
      <img src="${actor.avatarUrl}" alt="${actor.name}" class="actor-carousel-avatar" />
      <div class="actor-carousel-name">${actor.name}</div>
      <div class="actor-carousel-sector">${t.sectors[actor.sector] || actor.sector}</div>
      <div style="background: #E6F7EF; color: ${getScoreColor(actor.score)}; font-weight: 800; font-size: 11px; padding: 4px 8px; border-radius: 8px;">★ ${actor.score.toFixed(1)}</div>
    </div>
  `).join('');

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

  // 6. CARD 6: Dernières Évaluations (Plafonné à 50 au maximum, affichage initial des 10 premières)
  const sortedActiveEvals = activeEvals.slice().sort((a, b) => (b.createdAtSeconds || 0) - (a.createdAtSeconds || 0));
  const cappedEvals = sortedActiveEvals.slice(0, 50);
  const recentRatingsHTML = cappedEvals.length > 0
    ? cappedEvals.map((rev, idx) => {
        const isExtra = idx >= 10;
        const sectorLabel = rev.sectorName || rev.macroSector || rev.sector || '';
        const subSectorLabel = rev.mesoSector || rev.subSector || '';
        const perfLabel = rev.pillar || rev.societalPillar || '';
        
        const rawCategory = rev.category || rev.indicatorCategory || '';
        const mainIndicator = indicatorNamesMap[rawCategory] || rawCategory;
        const subType = rev.type || rev.indicatorType || rev.kpi || '';

        let kpiLabel = mainIndicator;
        if (kpiLabel && subType && subType !== rawCategory && subType !== mainIndicator) {
          kpiLabel = `${mainIndicator} (${subType})`;
        } else if (!kpiLabel) {
          kpiLabel = subType || rev.indicator || '';
        }

        return `
        <div class="recent-rating-item action-rating-item ${isExtra ? 'dashboard-eval-extra' : ''}" 
          data-author-name="${rev.authorName || 'Contributeur'}"
          style="${isExtra ? 'display: none !important;' : ''}">
          ${renderAuthorAvatarHTML(rev, appState, rev.authorInitials || 'U', rev.authorAvatarBg || '#002B49', rev.authorAvatarColor || '#FFFFFF')}
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 700; color: #1E293B; display: flex; align-items: center; flex-wrap: wrap; gap: 2px;">
              <span>${rev.authorName || 'Contributeur'}</span>${renderAuthorVerifiedBadgeHTML(rev, appState)}
              <span style="color: #94A3B8; font-weight: 400; margin: 0 2px;"> • </span>
              <span style="color: #00A859; font-weight: 600;">${rev.targetEntity || rev.actorName || 'Acteur'}</span>
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

            <div class="rating-stars-gold">${renderStarRating(rev.rating)}</div>
            <div class="rating-comment-quote">"${rev.comment || 'Évaluation partagée.'}"</div>

            ${(rev.photoUrl || rev.attachmentBase64) ? `
              <div style="margin: 8px 0 6px 0; border-radius: 10px; overflow: hidden; max-width: 220px; border: 1.5px solid #E2E8F0; background: #0F172A; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <img src="${rev.photoUrl || rev.attachmentBase64}" alt="Photo ${rev.attachmentName || ''}" class="rating-attachment-image" style="width: 100%; max-height: 140px; object-fit: cover; display: block; cursor: pointer; transition: transform 0.2s ease;" />
                ${rev.attachmentName ? `
                  <div style="background: rgba(15,23,42,0.85); color: #F8FAFC; font-size: 8.5px; font-weight: 600; padding: 3px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    📷 ${rev.attachmentName}
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <div class="rating-meta-footer">
              <span>📍 ${(rev.locality && rev.region) ? `${rev.locality}, ${rev.region}, ${rev.country || 'TN'}` : (rev.locality ? `${rev.locality}, ${rev.country || 'TN'}` : (rev.location || 'Tunisie'))}</span>
              <span>🕒 ${rev.timeAgo || 'Récemment'}</span>
            </div>
          </div>
        </div>
      `;
      }).join('')
    : `<div style="text-align: center; padding: 24px 12px; color: #64748B; font-size: 12px; font-weight: 500;">
         ℹ️ Aucune évaluation publiée pour ce pays pour le moment.
       </div>`;

  return `
    <div>
      <!-- Welcome Header -->
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #002B49; margin-bottom: 4px;">${t.generalDashboard}</h2>
        <p style="font-size: 11px; color: #64748B; line-height: 1.4;">${t.generalDashboardSub}</p>
      </div>

      <!-- Country Selector (Positioned BEFORE Card 1) -->
      <div class="card" style="padding: 12px 16px; margin-bottom: 14px; background: white;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <label for="dashboard-country-select" style="font-size: 12px; font-weight: 700; color: #002B49; white-space: nowrap;">
            📍 ${t.countryLabel} :
          </label>
          <select id="dashboard-country-select" class="form-control" style="font-weight: 700; font-size: 13px; color: #002B49; cursor: pointer; padding: 8px 12px;">
            ${countryOptionsHTML}
          </select>
        </div>
      </div>

      <!-- CARD 1: Indice National (Gauge Meter + Ratings count line) -->
      ${gaugeHTML}

      <!-- CARD 2: Indice Sociétal (Vertical Bar Chart Histogram for 3 Pillars) -->
      <div class="card" style="padding-bottom: 50px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div class="card-title" style="margin-bottom: 0; text-align: left; font-size: 13.5px; font-weight: 700; color: #002B49; flex: 1; padding-right: 8px; line-height: 1.3;">${t.indiceSocietalTitle}</div>
          <button class="btn-card-info" data-info-type="societal" title="Informations sur cet indicateur" style="background: rgba(0,43,73,0.06); border: 1px solid #CBD5E1; color: #002B49; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s;">?</button>
        </div>
        <div class="v-bar-chart-container" style="height: 130px; margin-bottom: 35px;">
          ${pillarBarsHTML}
        </div>
      </div>

      <!-- CARD 3: Indice Sectoriel (Vertical Bar Chart Histogram for 7 Macro-Sectors with Oblique 2-Line Labels) -->
      <div class="card" style="padding-bottom: 60px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div class="card-title" style="margin-bottom: 0; text-align: left; font-size: 13.5px; font-weight: 700; color: #002B49; flex: 1; padding-right: 8px; line-height: 1.3;">${t.indiceSectorielTitle}</div>
          <button class="btn-card-info" data-info-type="sectorial" title="Informations sur cet indicateur" style="background: rgba(0,43,73,0.06); border: 1px solid #CBD5E1; color: #002B49; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s;">?</button>
        </div>
        <div class="v-bar-chart-container" style="height: 130px; margin-bottom: 55px;">
          ${sectorBarsHTML}
        </div>
      </div>

      <!-- CARD 4: Indice Territorial (Horizontal Bar Chart Histogram for Selected Country Regions) -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div class="card-title" style="text-align: left; margin-bottom: 0; font-size: 13.5px; font-weight: 700; color: #002B49; flex: 1; padding-right: 8px; line-height: 1.3;">${t.indiceTerritorialTitle}</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="badge badge-info">${selectedCountryObj.flag} ${selectedCountryObj.names[lang] || selectedCountryObj.names.fr}</div>
            <button class="btn-card-info" data-info-type="territorial" title="Informations sur cet indicateur" style="background: rgba(0,43,73,0.06); border: 1px solid #CBD5E1; color: #002B49; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s;">?</button>
          </div>
        </div>
        <!-- Sort toggle buttons -->
        <div style="display: flex; gap: 6px; margin-bottom: 12px;">
          <button id="btn-territorial-sort-desc"
            style="flex:1; padding: 5px 8px; font-size: 10px; font-weight: 700; border-radius: 10px; border: 1.5px solid ${territorialSort === 'desc' ? '#002B49' : '#E2E8F0'}; background: ${territorialSort === 'desc' ? '#002B49' : 'white'}; color: ${territorialSort === 'desc' ? 'white' : '#94A3B8'}; cursor: pointer; transition: all 0.2s;">
            ↓ Ordre de performance
          </button>
          <button id="btn-territorial-sort-alpha"
            style="flex:1; padding: 5px 8px; font-size: 10px; font-weight: 700; border-radius: 10px; border: 1.5px solid ${territorialSort === 'alpha' ? '#002B49' : '#E2E8F0'}; background: ${territorialSort === 'alpha' ? '#002B49' : 'white'}; color: ${territorialSort === 'alpha' ? 'white' : '#94A3B8'}; cursor: pointer; transition: all 0.2s;">
            A–Z Alphabétique
          </button>
        </div>
        <div style="padding-top: 4px;">
          ${regionBarsHTML}
        </div>
      </div>

      <!-- CARD 5: Top 10 Acteurs (Horizontal Carousel) -->
      <div class="card">
        <div class="card-header" style="margin-bottom: 8px;">
          <div>
            <div class="card-title">Top 10 Acteurs</div>
            <div class="card-subtitle">Acteurs majeurs les mieux notés de la nation</div>
          </div>
          <span class="badge badge-success">Top 10</span>
        </div>

        <div class="actors-carousel-container">
          ${top10Actors.length > 0 ? top10CarouselHTML : `
            <div style="width:100%;text-align:center;padding:24px 16px;color:#94A3B8;">
              <div style="font-size:28px;margin-bottom:8px;">🏆</div>
              <div style="font-size:12px;font-weight:600;">Aucune évaluation disponible</div>
              <div style="font-size:11px;margin-top:4px;">Publiez des évaluations pour voir apparaître le classement des acteurs.</div>
            </div>
          `}
        </div>
      </div>

      <!-- CARD 6: Dernières Évaluations (50 Récents) -->
      <div class="card" id="card-recent-evaluations">
        <div class="card-header" style="margin-bottom: 14px;">
          <div class="card-title" style="letter-spacing: 0.5px; text-transform: uppercase; font-size: 14px;">DERNIÈRES ÉVALUATIONS</div>
          <span class="badge badge-navy" style="padding: 5px 12px; font-size: 11px; border-radius: 12px;">${Math.min(50, sortedActiveEvals.length)} Récents</span>
        </div>

        <div id="recent-evaluations-list">
          ${recentRatingsHTML}
        </div>
        ${cappedEvals.length > 10 ? `
          <div style="text-align: center; margin-top: 14px; padding-top: 10px; border-top: 1px dashed #E2E8F0;">
            <button id="btn-load-more-dashboard" class="btn" style="background: #F1F5F9; color: #002B49; border: 1.5px solid #CBD5E1; font-size: 11.5px; font-weight: 700; padding: 8px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: all 0.2s ease;">
              <span>Afficher plus (+10)</span>
              <span id="load-more-dashboard-count" style="font-size: 10px; color: #64748B;">(${cappedEvals.length - 10} restants)</span>
              <span style="font-size: 9px;">▼</span>
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

export function attachDashboardEvents(containerEl, onCountryChange, onSectorSelect, onNavigate, appState, renderCallback) {
  // Support flexible argument positions
  let _countryHandler = typeof onCountryChange === 'function' ? onCountryChange : null;
  let _navigateHandler = typeof onNavigate === 'function' ? onNavigate : (typeof onSectorSelect === 'function' ? onSectorSelect : null);
  let _appState = (typeof appState === 'object' && appState !== null) ? appState : (typeof onSectorSelect === 'object' ? onSectorSelect : (typeof onNavigate === 'object' ? onNavigate : null));
  let _renderCb = typeof renderCallback === 'function' ? renderCallback : (typeof appState === 'function' ? appState : null);

  // Country Dropdown Change Listener
  const countrySelect = containerEl.querySelector('#dashboard-country-select');
  if (countrySelect) {
    countrySelect.addEventListener('change', (e) => {
      if (_countryHandler) _countryHandler(e.target.value);
    });
  }

  // Territorial sort buttons
  const sortDescBtn = containerEl.querySelector('#btn-territorial-sort-desc');
  const sortAlphaBtn = containerEl.querySelector('#btn-territorial-sort-alpha');
  if (sortDescBtn) {
    sortDescBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (_appState) _appState.territorialSort = 'desc';
      if (_renderCb) _renderCb();
    });
  }
  if (sortAlphaBtn) {
    sortAlphaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (_appState) _appState.territorialSort = 'alpha';
      if (_renderCb) _renderCb();
    });
  }

  // Top 10 Actor Carousel Cards Click Listener -> Opens Radar Modal
  const actorCards = containerEl.querySelectorAll('.action-actor-item');
  actorCards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const actorName   = card.getAttribute('data-actor-name');
      const actorSector = card.getAttribute('data-actor-sector');
      const actorScore  = card.getAttribute('data-actor-score');
      const actorAvatar = card.getAttribute('data-actor-avatar');
      if (actorName && _appState) {
        showActorRadarModal(actorName, actorSector, actorScore, actorAvatar, _appState);
      } else if (_navigateHandler) {
        _navigateHandler('profiles');
      }
    });
  });

  // Recent Ratings Items Click Listener -> Navigates to Contributor Profile
  const ratingItems = containerEl.querySelectorAll('.action-rating-item');
  ratingItems.forEach(item => {
    item.addEventListener('click', () => {
      if (_navigateHandler) _navigateHandler('profiles');
    });
  });

  // Card Info Buttons ('?') Click Listener -> Displays contextual explanation modal
  const infoButtons = containerEl.querySelectorAll('.btn-card-info');
  infoButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const infoType = btn.getAttribute('data-info-type');
      showCardInfoModal(infoType, _appState ? _appState.lang : 'fr');
    });
  });

  // Load More Button Listener for Recent Evaluations
  const loadMoreBtn = containerEl.querySelector('#btn-load-more-dashboard');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      const hiddenItems = Array.from(containerEl.querySelectorAll('.dashboard-eval-extra'));
      const currentlyHidden = hiddenItems.filter(el => el.style.display === 'none' || el.style.getPropertyValue('display') === 'none');
      const toShow = currentlyHidden.slice(0, 10);
      toShow.forEach(el => el.style.setProperty('display', 'flex', 'important'));
      const stillHidden = currentlyHidden.length - toShow.length;
      if (stillHidden <= 0) {
        loadMoreBtn.style.display = 'none';
      } else {
        const countSpan = loadMoreBtn.querySelector('#load-more-dashboard-count');
        if (countSpan) countSpan.textContent = `(${stillHidden} restants)`;
      }
    });
  }

  // Attach Lightbox viewer for evaluation attachment images
  attachLightboxToImages(containerEl);
}
// ─────────────────────────────────────────────────────────────────────
// Actor Radar Modal — opened when a Top 10 actor card is tapped
// ─────────────────────────────────────────────────────────────────────
function showActorRadarModal(actorName, actorSector, actorScore, actorAvatarUrl, appState) {
  const old = document.getElementById('actor-radar-modal-overlay');
  if (old) old.remove();

  // Prevent body scroll while modal is open
  const prevBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = 'actor-radar-modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15,23,42,0.82); backdrop-filter: blur(6px);
    z-index: 999990;
    display: flex; align-items: flex-start; justify-content: center;
    padding: 20px 12px; box-sizing: border-box;
    overflow-y: auto;
  `;

  const scoreColor = parseFloat(actorScore) >= 4 ? '#00A859' : parseFloat(actorScore) >= 3 ? '#28C76F' : parseFloat(actorScore) >= 2 ? '#FFB800' : '#EA5455';

  // Look up actor description from allUsers
  const _normStr = s => !s ? '' : String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').trim();
  const _normActor = _normStr(actorName);
  const _allUsers = (appState && appState.allUsers) || [];
  const _matchedUser = _allUsers.find(u => {
    const uActor = (u.businessProfile && u.businessProfile.actorName) || u.name || '';
    const n = _normStr(uActor);
    return n === _normActor || n.includes(_normActor) || _normActor.includes(n);
  });
  const _actorDesc =
    (_matchedUser && _matchedUser.businessProfile && _matchedUser.businessProfile.description) ||
    (_matchedUser && _matchedUser.description) || '';

  overlay.innerHTML = `
    <div id="actor-radar-panel" style="width:100%; max-width:480px; background:#FFFFFF; border-radius:20px; box-shadow:0 24px 48px rgba(0,0,0,0.35); flex-shrink:0;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg,#002B49,#004A7C); padding: 20px 16px 16px; position:relative; border-radius:20px 20px 0 0;">
        <button id="btn-close-actor-modal" style="position:absolute; top:14px; right:14px; background:rgba(255,255,255,0.15); border:none; color:#fff; width:32px; height:32px; border-radius:50%; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
        <div style="display:flex; align-items:center; gap:14px;">
          <img src="${actorAvatarUrl}" alt="${actorName}" style="width:56px; height:56px; border-radius:50%; object-fit:cover; border:3px solid rgba(255,255,255,0.3); flex-shrink:0;" onerror="this.style.display='none'" />
          <div>
            <div style="font-size:15px; font-weight:800; color:#FFFFFF; margin-bottom:4px;">${actorName}</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.7); font-weight:600; margin-bottom:6px;">${actorSector || ''}</div>
            <div style="display:inline-block; background:rgba(255,255,255,0.15); color:${scoreColor}; border:1.5px solid ${scoreColor}; font-size:13px; font-weight:800; padding:3px 12px; border-radius:20px;">★ ${actorScore}</div>
          </div>
        </div>
      </div>

      <!-- Actor Description (shown only if available) -->
      ${_actorDesc ? `
        <div style="padding: 12px 16px; background: #F0FDF4; border-bottom: 1px solid #D1FAE5;">
          <div style="font-size: 9.5px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">📋 À propos de l'établissement</div>
          <div style="font-size: 11.5px; color: #1E3A2F; line-height: 1.5;">${_actorDesc}</div>
        </div>
      ` : ''}

      <!-- Subtitle -->
      <div style="padding:14px 16px 8px; border-bottom:1px solid #F1F5F9;">
        <div style="font-size:12px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.6px;">📊 Analyse Radar par Pilier</div>
      </div>

      <!-- Radar Charts — all 3 stack vertically, no height constraint -->
      <div style="padding:16px; display:flex; flex-direction:column; gap:14px; padding-bottom:24px;">
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:14px; text-align:center;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #EEF2F6;">
            <div style="font-size:11px; font-weight:800; color:#2563EB; text-transform:uppercase; letter-spacing:0.5px;">💼 Économique</div>
            <div id="actor-radar-econ-avg-badge" style="font-size:11px; font-weight:800; color:#2563EB; background:#FFFFFF; border:1px solid #DBEAFE; padding:2px 8px; border-radius:12px; display:none;"></div>
          </div>
          <div style="position:relative; width:100%; height:200px;">
            <canvas id="actor-radar-econ"></canvas>
          </div>
          <div id="actor-radar-econ-indicators-row" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-top:10px; padding-top:10px; border-top:1px solid #EEF2F6;"></div>
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:14px; text-align:center;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #EEF2F6;">
            <div style="font-size:11px; font-weight:800; color:#EA5455; text-transform:uppercase; letter-spacing:0.5px;">🤝 Social</div>
            <div id="actor-radar-social-avg-badge" style="font-size:11px; font-weight:800; color:#EA5455; background:#FFFFFF; border:1px solid #FECACA; padding:2px 8px; border-radius:12px; display:none;"></div>
          </div>
          <div style="position:relative; width:100%; height:200px;">
            <canvas id="actor-radar-social"></canvas>
          </div>
          <div id="actor-radar-social-indicators-row" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-top:10px; padding-top:10px; border-top:1px solid #EEF2F6;"></div>
        </div>

        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:14px; text-align:center;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #EEF2F6;">
            <div style="font-size:11px; font-weight:800; color:#00A859; text-transform:uppercase; letter-spacing:0.5px;">🌿 Environnemental</div>
            <div id="actor-radar-env-avg-badge" style="font-size:11px; font-weight:800; color:#00A859; background:#FFFFFF; border:1px solid #BBF7D0; padding:2px 8px; border-radius:12px; display:none;"></div>
          </div>
          <div style="position:relative; width:100%; height:200px;">
            <canvas id="actor-radar-env"></canvas>
          </div>
          <div id="actor-radar-env-indicators-row" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-top:10px; padding-top:10px; border-top:1px solid #EEF2F6;"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.body.style.overflow = prevBodyOverflow;
  };

  overlay.querySelector('#btn-close-actor-modal').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // Init radars after DOM settles
  const drawRadars = () => {
    const scores = getRadarScoresFromEvals(actorName, appState);
    try {
      initRadarChart('actor-radar-econ',   'Économique',      ['Investissement', 'Emplois', 'Valeur Ajoutée'], scores.econ,   '#2563EB');
      initRadarChart('actor-radar-social', 'Social',          ['Infrastructures', 'Personnel', 'Programmes'],   scores.social, '#EA5455');
      initRadarChart('actor-radar-env',    'Environnemental', ['Émission de pollution', 'Ressources', 'Résilience'], scores.env, '#00A859');
    } catch (err) {
      console.warn('Actor radar modal init error:', err);
    }
  };
  setTimeout(drawRadars, 60);
  setTimeout(drawRadars, 300);
}

// ─────────────────────────────────────────────────────────────────────
// Dashboard Card Info Modal — opened when clicking '?' on cards 1-4
// ─────────────────────────────────────────────────────────────────────
function showCardInfoModal(infoType, lang = 'fr') {
  const old = document.getElementById('card-info-modal-overlay');
  if (old) old.remove();

  const prevBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = 'card-info-modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15,23,42,0.80); backdrop-filter: blur(6px);
    z-index: 999995;
    display: flex; align-items: center; justify-content: center;
    padding: 20px 16px; box-sizing: border-box;
    animation: fadeIn 0.2s ease;
  `;

  const infoContents = {
    national: {
      badge: "🌍 Performance Globale",
      title: "Indice de développement – score de performance nationale",
      desc: "Mesure globale et synthétique du niveau de développement et de performance des services publics et privés à l'échelle de la nation sélectionnée.",
      calcTitle: "Méthode de Calcul :",
      calcText: "Moyenne consolidée des scores de performance issus de l'ensemble des 7 macro-secteurs d'activité évalués par les citoyens, entreprises et experts.",
      scaleTitle: "Échelle de Lecture (0 à 5) :",
      scaleItems: [
        { color: "#EA5455", range: "0.0 – 1.9", label: "Performance critique / Défaillante" },
        { color: "#FFB800", range: "2.0 – 2.9", label: "Performance moyenne / Passable" },
        { color: "#28C76F", range: "3.0 – 3.9", label: "Bonne performance / Satisfaisante" },
        { color: "#00A859", range: "4.0 – 5.0", label: "Performance excellente / Exemplaire" }
      ]
    },
    societal: {
      badge: "🎯 3 Piliers du Développement",
      title: "Indice de développement – score par performance sociétale",
      desc: "Décompose la performance nationale selon les trois piliers fondamentaux du développement durable :",
      pillarsList: [
        { icon: "💼", name: "Économique", detail: "Dynamisme des investissements, emplois créés et valeur ajoutée." },
        { icon: "🤝", name: "Social", detail: "Qualité des infrastructures, compétence et accueil du personnel, impact des programmes." },
        { icon: "🌿", name: "Environnemental", detail: "Émission de pollution, maîtrise des ressources (eau, énergie), résilience aux catastrophes (inondations, incendies, séismes)." }
      ],
      calcTitle: "Méthode de Calcul :",
      calcText: "Moyenne des évaluations enregistrées pour chaque pilier sur l'échelle standardisée de 1 à 5 étoiles."
    },
    sectorial: {
      badge: "🏛️ 7 Macro-Secteurs Clés",
      title: "Indice de développement – score de performance par secteur",
      desc: "Évalue et compare la performance sur les 7 secteurs stratégiques de la nation :",
      sectorsList: [
        "⚖️ <strong>Gouvernance</strong> : Parlement, Gouvernement, Justice",
        "🛡️ <strong>Sécurité & Défense</strong> : Police, Gendarmerie, Pompiers, Armées",
        "🏥 <strong>Santé & Hygiène</strong> : Médecine, Pharmacie, Déchets, Assainissement",
        "🎓 <strong>Instruction & Culture</strong> : Éducation, Université, Formation, Arts, Sports, Cultes",
        "💳 <strong>Alimentation & Finance</strong> : Agriculture, Industrie, Commerce, Banque, Bourse, Assurance",
        "🏠 <strong>Logement & Tourisme</strong> : Aménagement, Équipement, Immobilier, Hôtellerie",
        "🚌 <strong>Transport & Télécoms</strong> : Routes, Rail, Maritime, Aérien, Poste, Téléphonie, Internet"
      ],
      calcTitle: "Méthode de Calcul :",
      calcText: "Moyenne des notes attribuées aux structures et acteurs rattachés à chaque secteur d'activité."
    },
    territorial: {
      badge: "🗺️ Baromètre Territorial",
      title: "Indice de développement – score de performance par territoire",
      desc: "Mesure le niveau de développement sociétal de chaque secteur par région / gouvernorat du pays sélectionné.",
      featuresList: [
        "📊 <strong>↓ Ordre de performance</strong> : Classement descendant mettant en valeur les territoires moteurs et ceux nécessitant des actions prioritaires.",
        "🔤 <strong>A–Z Alphabétique</strong> : Consultation et recherche alphabétique rapide d'un territoire précis."
      ],
      calcTitle: "Méthode de Calcul :",
      calcText: "Moyenne agrégée de l'ensemble des évaluations géolocalisées dans chaque région et ses localités."
    }
  };

  const item = infoContents[infoType] || infoContents.national;

  overlay.innerHTML = `
    <div style="width:100%; max-width:440px; background:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 24px 48px rgba(0,0,0,0.35); max-height:90vh; display:flex; flex-direction:column;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg,#002B49,#004A7C); padding: 18px 18px 16px; position:relative; color:#FFFFFF;">
        <button id="btn-close-info-modal" style="position:absolute; top:12px; right:12px; background:rgba(255,255,255,0.15); border:none; color:#fff; width:30px; height:30px; border-radius:50%; font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s;">✕</button>
        <span style="font-size:10px; font-weight:800; background:rgba(255,255,255,0.18); padding:3px 10px; border-radius:12px; display:inline-block; margin-bottom:6px; letter-spacing:0.4px;">${item.badge}</span>
        <h3 style="font-size:13.5px; font-weight:800; margin:0; line-height:1.35; color:#FFFFFF;">${item.title}</h3>
      </div>

      <!-- Body -->
      <div style="padding:16px 18px; overflow-y:auto; font-size:12px; color:#334155; line-height:1.5; display:flex; flex-direction:column; gap:12px;">
        <div>
          <strong style="color:#002B49; font-size:11.5px; text-transform:uppercase; letter-spacing:0.5px;">📖 Définition & Portée :</strong>
          <p style="margin:4px 0 0 0; color:#475569;">${item.desc}</p>
        </div>

        ${item.pillarsList ? `
          <div style="display:flex; flex-direction:column; gap:6px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:10px 12px;">
            ${item.pillarsList.map(p => `
              <div style="font-size:11.5px;">
                <span style="font-weight:800; color:#002B49;">${p.icon} ${p.name} :</span>
                <span style="color:#64748B;"> ${p.detail}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${item.sectorsList ? `
          <div style="display:flex; flex-direction:column; gap:5px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:10px 12px; font-size:11px;">
            ${item.sectorsList.map(s => `<div>${s}</div>`).join('')}
          </div>
        ` : ''}

        ${item.featuresList ? `
          <div style="display:flex; flex-direction:column; gap:6px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:10px 12px; font-size:11.5px;">
            ${item.featuresList.map(f => `<div>${f}</div>`).join('')}
          </div>
        ` : ''}

        ${item.scaleItems ? `
          <div>
            <strong style="color:#002B49; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">🎯 Échelle de Lecture :</strong>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">
              ${item.scaleItems.map(si => `
                <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-left:4px solid ${si.color}; border-radius:8px; padding:6px 8px; font-size:10.5px;">
                  <div style="font-weight:800; color:${si.color};">${si.range}</div>
                  <div style="color:#64748B; font-size:9.5px; font-weight:600;">${si.label}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="background:#F0FDF4; border:1px solid #DCFCE7; border-radius:12px; padding:10px 12px;">
          <div style="font-size:11px; font-weight:800; color:#166534; margin-bottom:2px;">🧮 ${item.calcTitle}</div>
          <div style="font-size:11px; color:#15803D; line-height:1.4;">${item.calcText}</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.body.style.overflow = prevBodyOverflow;
  };

  overlay.querySelector('#btn-close-info-modal').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}


