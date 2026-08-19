// General Dashboard Module (Tableau Général)

import { renderGaugeMeter } from '../components/gauge.js';
import { locationData } from '../data/locations.js';
import { initialAppData } from '../data/mockData.js';
import { attachLightboxToImages } from '../utils/imageLightbox.js';
import { initRadarChart } from '../components/radar.js';
import { getRadarScoresFromEvals } from './analytics.js';

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

  activeEvals.forEach(e => {
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

  if (top10Actors.length === 0) {
    const rawTop = (data.topActors && data.topActors.length > 0) ? data.topActors : initialAppData.topActors;
    top10Actors = rawTop.map(a => {
      const customAvatar = findActorAvatar(a.name);
      return {
        ...a,
        avatarUrl: customAvatar || a.avatarUrl || `https://images.unsplash.com/photo-1534528741775?w=150&auto=format&fit=crop&q=80`
      };
    });
  }

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
    'Facility': 'Équipements',
    'Programs': 'Programmes',
    'InvestmentAmount': 'Investissements',
    'JobsCreated': 'Emplois créés',
    'ValueAdded': 'Valeur ajoutée',
    'PollutionEmission': 'Pollution & Émissions',
    'ResourceConsumption': 'Consommation de ressources',
    'Resilience': 'Résilience'
  };

  // 6. CARD 6: Dernières Évaluations
  const sortedActiveEvals = activeEvals.slice().sort((a, b) => (b.createdAtSeconds || 0) - (a.createdAtSeconds || 0));
  const recentRatingsHTML = sortedActiveEvals.length > 0
    ? sortedActiveEvals.map(rev => {
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
        <div class="recent-rating-item action-rating-item" data-author-name="${rev.authorName || 'Contributeur'}">
          <div class="rating-user-avatar-circle" style="background: ${rev.authorAvatarBg || '#002B49'}; color: ${rev.authorAvatarColor || '#FFFFFF'};">
            ${rev.authorInitials || 'U'}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 700; color: #1E293B;">
              <span>${rev.authorName || 'Contributeur'}</span>
              <span style="color: #94A3B8; font-weight: 400;"> • </span>
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
        <div class="card-title" style="margin-bottom: 12px; text-align: left;">${t.indiceSocietalTitle}</div>
        <div class="v-bar-chart-container" style="height: 130px; margin-bottom: 35px;">
          ${pillarBarsHTML}
        </div>
      </div>

      <!-- CARD 3: Indice Sectoriel (Vertical Bar Chart Histogram for 7 Macro-Sectors with Oblique 2-Line Labels) -->
      <div class="card" style="padding-bottom: 60px;">
        <div class="card-title" style="margin-bottom: 12px; text-align: left;">${t.indiceSectorielTitle}</div>
        <div class="v-bar-chart-container" style="height: 130px; margin-bottom: 55px;">
          ${sectorBarsHTML}
        </div>
      </div>

      <!-- CARD 4: Indice Territorial (Horizontal Bar Chart Histogram for Selected Country Regions) -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div class="card-title" style="text-align: left;">${t.indiceTerritorialTitle}</div>
          <div class="badge badge-info">${selectedCountryObj.flag} ${selectedCountryObj.names[lang] || selectedCountryObj.names.fr}</div>
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
          ${top10CarouselHTML}
        </div>
      </div>

      <!-- CARD 6: Dernières Évaluations (50 Nouveaux) -->
      <div class="card">
        <div class="card-header" style="margin-bottom: 14px;">
          <div class="card-title" style="letter-spacing: 0.5px; text-transform: uppercase; font-size: 14px;">DERNIÈRES ÉVALUATIONS</div>
          <span class="badge badge-navy" style="padding: 5px 12px; font-size: 11px; border-radius: 12px;">50 Nouveaux</span>
        </div>

        <div>
          ${recentRatingsHTML}
        </div>
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

      <!-- Subtitle -->
      <div style="padding:14px 16px 8px; border-bottom:1px solid #F1F5F9;">
        <div style="font-size:12px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.6px;">📊 Analyse Radar par Pilier</div>
      </div>

      <!-- Radar Charts — all 3 stack vertically, no height constraint -->
      <div style="padding:16px; display:flex; flex-direction:column; gap:14px; padding-bottom:24px;">
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:14px; text-align:center;">
          <div style="font-size:11px; font-weight:800; color:#2563EB; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">💼 Économique</div>
          <div style="position:relative; width:100%; height:200px;">
            <canvas id="actor-radar-econ"></canvas>
          </div>
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:14px; text-align:center;">
          <div style="font-size:11px; font-weight:800; color:#EA5455; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">🤝 Social</div>
          <div style="position:relative; width:100%; height:200px;">
            <canvas id="actor-radar-social"></canvas>
          </div>
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:14px; text-align:center;">
          <div style="font-size:11px; font-weight:800; color:#00A859; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">🌿 Environnemental</div>
          <div style="position:relative; width:100%; height:200px;">
            <canvas id="actor-radar-env"></canvas>
          </div>
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
      initRadarChart('actor-radar-social', 'Social',          ['Équipements', 'Personnel', 'Programmes'],      scores.social, '#EA5455');
      initRadarChart('actor-radar-env',    'Environnemental', ['Pollution', 'Ressources', 'Résilience'],       scores.env,    '#00A859');
    } catch (err) {
      console.warn('Actor radar modal init error:', err);
    }
  };
  setTimeout(drawRadars, 60);
  setTimeout(drawRadars, 300);
}

