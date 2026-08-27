// Detailed Analytics & Exploration Module (Tableau Détaillé)

import { renderSVGMap, attachMapEvents } from '../components/svgMap.js';
import { renderRadarChartHTML, initRadarChart, initRadarChartMulti } from '../components/radar.js';
import { locationData } from '../data/locations.js';
import { sectorData } from '../data/sectors.js';
import { initialAppData } from '../data/mockData.js';
import { translations } from '../data/translations.js';
import { attachLightboxToImages } from '../utils/imageLightbox.js';

// ─── Module-level helper: build HTML for a single evaluation card item ───────
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

function buildEvalItemHTML(rev) {
  const sectorLabel = rev.sectorName || rev.macroSector || rev.sector || '';
  const subSectorLabel = rev.mesoSector || rev.subSector || '';
  const perfLabel = rev.pillar || rev.societalPillar || '';
  
  // Prioritize category/indicatorCategory for main indicator label (e.g. Personnel instead of sub-type)
  const rawCategory = rev.category || rev.indicatorCategory || '';
  const mainIndicator = indicatorNamesMap[rawCategory] || rawCategory;
  const subType = rev.type || rev.indicatorType || rev.kpi || '';

  let kpiLabel = mainIndicator;
  if (kpiLabel && subType && subType !== rawCategory && subType !== mainIndicator) {
    kpiLabel = `${mainIndicator} (${subType})`;
  } else if (!kpiLabel) {
    kpiLabel = subType || rev.indicator || '';
  }

  const ratingNum = parseFloat(rev.rating) || 0;
  const fullStars = Math.floor(ratingNum);
  const starsStr = '★'.repeat(Math.min(5, fullStars)) + '☆'.repeat(Math.max(0, 5 - fullStars));

  return `
  <div class="recent-rating-item">
    <div class="rating-user-avatar-circle" style="background: ${rev.authorAvatarBg || '#002B49'}; color: ${rev.authorAvatarColor || '#FFFFFF'};">
      ${rev.authorInitials || 'U'}
    </div>
    <div style="flex: 1;">
      <div style="font-size: 12px; font-weight: 700; color: #002B49;">
        ${rev.authorName || 'Contributeur'} <span style="font-weight: 400; color: #64748B;">a noté</span>
        <span style="color: #00A859; font-weight: 800;">${rev.targetEntity || rev.actorName || rev.entity || 'Acteur'}</span>
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
        <span>⏱️ ${rev.timeAgo || 'Récemment'}</span>
      </div>
    </div>
  </div>
  `;
}

// ─── Module-level helper: filter evaluations based on all active appState slicers ───
export function getFilteredEvaluations(appState) {
  if (!appState) return [];

  // ONLY use Firestore-backed sources — never data.evaluations or appState.evaluations
  // which may contain stale localStorage/mock data
  const allEvalsData = [
    ...((appState.data && appState.data.recentEvaluations) ? appState.data.recentEvaluations : []),
    ...((appState.currentUserEvals) ? appState.currentUserEvals : [])
  ];

  const evalsMap = new Map();
  allEvalsData.forEach(e => {
    if (e) {
      const key = e.id || `${e.targetEntity || e.actorName}-${e.rating}-${e.date || ''}-${e.comment || ''}`;
      evalsMap.set(key, e);
    }
  });
  const evals = Array.from(evalsMap.values());

  const normStr = (s) => !s ? '' : String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();

  const selectedCountryCode = appState.selectedCountry || 'TN';
  const selectedMacro = appState.selectedMacro || 'ALL';
  const selectedMeso = appState.selectedMeso || 'ALL';
  const selectedPillar = appState.selectedPillar || 'ALL';
  const selectedCategory = appState.selectedCategory || 'ALL';
  const selectedType = appState.selectedType || 'ALL';
  const selectedActors = (appState.selectedActors || []).map(normStr);
  const selectedActor = appState.selectedActor || 'ALL';
  const selectedRegions = (appState.selectedRegions || []).map(normStr);
  const selectedLocalities = (appState.selectedLocalities || []).map(normStr);

  const sectorKeywords = {
    Governance: ['gouv', 'gov', 'just', 'parl', 'minist', 'tribun', 'governance', 'gouvernance'],
    SecurityDefense: ['securite', 'secu', 'defense', 'def', 'police', 'polic', 'gendarmerie', 'gend', 'armee', 'securitydefense'],
    HealthHygiene: ['sante', 'sant', 'hygiene', 'hyg', 'medecine', 'med', 'pharmacie', 'pharm', 'hopital', 'hopit', 'clinique', 'healthhygiene'],
    InstructionCulture: ['instruction', 'inst', 'culture', 'cult', 'education', 'educ', 'universite', 'univ', 'ecole', 'ecol', 'lycee', 'instructionculture'],
    FoodFinance: ['alimentation', 'alim', 'finance', 'finan', 'agriculture', 'agri', 'banque', 'banq', 'bourse', 'assurance', 'foodfinance'],
    HousingTourism: ['logement', 'log', 'tourisme', 'tour', 'hotel', 'hot', 'immobilier', 'immo', 'urbanisme', 'housingtourism'],
    TransportTelco: ['transport', 'trans', 'telecoms', 'tel', 'telephonie', 'internet', 'route', 'rout', 'bus', 'train', 'post', 'transporttelco']
  };

  return evals.filter(rev => {
    // 1. Country filter
    if (rev.country && selectedCountryCode && normStr(rev.country) !== normStr(selectedCountryCode)) {
      return false;
    }

    // 2. Actor filter (if multi-actors or single actor chosen)
    if (selectedActors.length > 0) {
      const eActor = normStr(rev.targetEntity || rev.actorName || rev.entity || '');
      const matchesAny = selectedActors.some(sActor => eActor && (eActor.includes(sActor) || sActor.includes(eActor)));
      if (!matchesAny) return false;
    } else if (selectedActor && selectedActor !== 'ALL') {
      const eActor = normStr(rev.targetEntity || rev.actorName || rev.entity || '');
      const sActor = normStr(selectedActor);
      if (!eActor || (!eActor.includes(sActor) && !sActor.includes(eActor))) {
        return false;
      }
    }

    // 3. Macro-Sector filter
    if (selectedMacro && selectedMacro !== 'ALL') {
      const eMacro = normStr(rev.macroSector || rev.sectorName || rev.sector || '');
      const sMacro = normStr(selectedMacro);
      const keywords = sectorKeywords[selectedMacro] || [sMacro];
      const matchesMacro = (eMacro && (eMacro.includes(sMacro) || sMacro.includes(eMacro))) ||
                           keywords.some(k => eMacro.includes(k));
      if (!matchesMacro) return false;
    }

    // 4. Meso-Sector (Sous-secteur) filter
    if (selectedMeso && selectedMeso !== 'ALL') {
      const eMeso = normStr(rev.mesoSector || rev.subSector || '');
      const sMeso = normStr(selectedMeso);
      if (!eMeso || (!eMeso.includes(sMeso) && !sMeso.includes(eMeso))) {
        return false;
      }
    }

    // 5. Pillar filter
    if (selectedPillar && selectedPillar !== 'ALL') {
      const pNorm = normStr(rev.pillar || rev.societalPillar || '');
      if (selectedPillar === 'Economic' && !pNorm.includes('econ')) return false;
      if (selectedPillar === 'Social' && !pNorm.includes('soc')) return false;
      if (selectedPillar === 'Environmental' && !pNorm.includes('env')) return false;
    }

    // 6. Category (Indicator) filter
    if (selectedCategory && selectedCategory !== 'ALL') {
      const catStr = normStr(rev.category || rev.indicatorCategory || '');
      const sCat = normStr(selectedCategory);
      if (!catStr || (!catStr.includes(sCat) && !sCat.includes(catStr))) {
        return false;
      }
    }

    // 7. Type (Sub-indicator) filter
    if (selectedType && selectedType !== 'ALL') {
      const typeStr = normStr(rev.type || rev.indicatorType || rev.kpi || rev.indicator || '');
      const sType = normStr(selectedType);
      if (!typeStr || (!typeStr.includes(sType) && !sType.includes(typeStr))) {
        return false;
      }
    }

    // 8. Territory filter (Localities or Regions)
    if (selectedLocalities.length > 0) {
      // Locality filter: exact match (no partial)
      const locStr = normStr(rev.locality || '');
      const matchesLoc = selectedLocalities.some(l => locStr && locStr === l);
      if (!matchesLoc) return false;
    } else if (selectedRegions.length > 0) {
      const regStr = normStr(rev.region || '');
      const locStr = normStr(rev.locality || '');
      // Use imported locationData to validate locality belongs to the selected region
      const countryObj = locationData.find(c => normStr(c.code) === normStr(selectedCountryCode));
      const matchesReg = selectedRegions.some(rNorm => {
        // 1. Region field direct match
        if (regStr && (regStr === rNorm || regStr.includes(rNorm) || rNorm.includes(regStr))) return true;
        // 2. Locality EXACT match against the region's official locality list (prevents cross-region collisions)
        if (locStr && countryObj) {
          const rObj = countryObj.regions.find(r => normStr(r.id) === rNorm);
          if (rObj && rObj.localities) {
            return rObj.localities.some(loc => normStr(loc) === locStr);
          }
        }
        return false;
      });
      if (!matchesReg) return false;
    }

    return true;
  }).sort((a, b) => (b.createdAtSeconds || 0) - (a.createdAtSeconds || 0));
}

// ----------- Radar Charts: Granular per-category computation from Firestore evaluations -----------
export function getRadarScoresFromEvals(actorName, appState) {
  if (!appState) return { econ: [0, 0, 0], social: [0, 0, 0], env: [0, 0, 0] };
  const allEvals = [
    ...(appState.data && appState.data.recentEvaluations ? appState.data.recentEvaluations : []),
    ...(appState.data && appState.data.evaluations ? appState.data.evaluations : []),
    ...(appState.currentUserEvals ? appState.currentUserEvals : []),
    ...(appState.evaluations ? appState.evaluations : [])
  ];

  const evalsMap = new Map();
  allEvals.forEach(e => {
    if (e) {
      const key = e.id || `${e.targetEntity || e.actorName}-${e.rating}-${e.date || ''}`;
      evalsMap.set(key, e);
    }
  });
  const evals = Array.from(evalsMap.values());

  const selectedCountryCode = appState.selectedCountry || 'TN';
  const countryEvals = evals.filter(e => !e.country || e.country === selectedCountryCode);
  const poolEvals = countryEvals.length > 0 ? countryEvals : evals;

  const normStr = (s) => !s ? '' : String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').trim();

  const filtered = actorName === 'ALL'
    ? poolEvals
    : poolEvals.filter(e => {
        const eActor = normStr(e.targetEntity || e.actorName || e.entity || e.actor || '');
        const selActor = normStr(actorName);
        if (!eActor || !selActor) return false;
        return eActor === selActor || eActor.includes(selActor) || selActor.includes(eActor);
      });

  const categoryAxisMap = {
    // Economic
    'InvestmentAmount': ['investmentamount', 'domestic', 'foreign', 'invest', 'montant'],
    'JobsCreated': ['jobscreated', 'specialist', 'technician', 'job', 'emploi', 'cree'],
    'ValueAdded': ['valueadded', 'gross', 'net', 'valeur', 'ajouter', 'added'],
    // Social
    'Facility': ['facility', 'accessibility', 'cleanliness', 'comfort', 'equipement', 'locaux', 'infra'],
    'Staff': ['staff', 'availability', 'friendliness', 'expertise', 'personnel', 'agent', 'equipe', 'accueil'],
    'Programs': ['programs', 'effectiveness', 'inclusivity', 'innovation', 'program', 'projet', 'action'],
    // Environmental
    'PollutionEmission': ['pollutionemission', 'waste', 'ghg', 'pollut', 'dechet', 'emission'],
    'ResourceConsumption': ['resourceconsumption', 'water', 'energy', 'resour', 'ressour', 'eau', 'energie'],
    'Resilience': ['resilience', 'floods', 'fires', 'earthquakes', 'resili', 'climat', 'risq', 'inondation', 'incendie', 'seisme']
  };

  const getAxisScore = (pillarKey, categoryKey, keywords) => {
    // Find evals matching pillar
    const pillarEvals = filtered.filter(e => {
      const pNorm = normStr(e.pillar || e.societalPillar);
      if (!pNorm) return true;
      return (pillarKey === 'Economic' && (pNorm.includes('econ') || pNorm.includes('écon'))) ||
             (pillarKey === 'Social' && (pNorm.includes('soc') || pNorm.includes('societ'))) ||
             (pillarKey === 'Environmental' && (pNorm.includes('env') || pNorm.includes('environ')));
    });

    if (pillarEvals.length === 0) return 0.0;

    // Match strictly against category & type fields only (DO NOT match comments or mesoSectors)
    const allowedKeywords = categoryAxisMap[categoryKey] || keywords.map(k => normStr(k));
    const targetNorm = normStr(categoryKey);

    const catEvals = pillarEvals.filter(e => {
      const catStr = normStr(e.category || e.indicatorCategory || '');
      const typeStr = normStr(e.type || e.indicatorType || e.kpi || e.indicator || '');

      if (catStr && (catStr === targetNorm || targetNorm === catStr)) return true;
      
      const matchCat = catStr && allowedKeywords.some(k => catStr.includes(k));
      const matchType = typeStr && allowedKeywords.some(k => typeStr.includes(k));

      return matchCat || matchType;
    });

    if (actorName !== 'ALL') {
      // When a specific actor is selected, strictly require matching catEvals.
      // Non-evaluated KPIs return 0.0 so the radar chart renders a LINE to the evaluated KPI (not a hallucinated polygon).
      if (catEvals.length === 0) return 0.0;
      const expertEvals = catEvals.filter(e => e.isTerritoryRating || e.isExpertRating);
      const evalsToUse = expertEvals.length > 0 ? expertEvals : catEvals;
      const sum = evalsToUse.reduce((s, e) => s + (parseFloat(e.rating) || 0), 0);
      return parseFloat((sum / evalsToUse.length).toFixed(1));
    } else {
      // When ALL actors are selected (Territory scale), check if authorized expert territory ratings exist.
      // If an authorized expert rating exists for this territory KPI, it BYPASSES operator averages!
      const baseEvals = catEvals.length > 0 ? catEvals : pillarEvals;
      if (baseEvals.length === 0) return 0.0;
      const expertEvals = baseEvals.filter(e => e.isTerritoryRating || e.isExpertRating);
      const evalsToUse = expertEvals.length > 0 ? expertEvals : baseEvals;
      const sum = evalsToUse.reduce((s, e) => s + (parseFloat(e.rating) || 0), 0);
      return parseFloat((sum / evalsToUse.length).toFixed(1));
    }
  };

  return {
    econ: [
      getAxisScore('Economic', 'InvestmentAmount', ['invest', 'montant']),
      getAxisScore('Economic', 'JobsCreated', ['job', 'emploi', 'cree']),
      getAxisScore('Economic', 'ValueAdded', ['valeur', 'ajouter', 'added'])
    ],
    social: [
      getAxisScore('Social', 'Facility', ['facility', 'equipement', 'infra', 'locaux']),
      getAxisScore('Social', 'Staff', ['staff', 'personnel', 'agent', 'equipe']),
      getAxisScore('Social', 'Programs', ['program', 'projet', 'action'])
    ],
    env: [
      getAxisScore('Environmental', 'PollutionEmission', ['pollut', 'dechet', 'emission']),
      getAxisScore('Environmental', 'ResourceConsumption', ['resour', 'ressour', 'eau', 'energie']),
      getAxisScore('Environmental', 'Resilience', ['resili', 'climat', 'risq'])
    ]
  };
}

export function renderAnalyticsView(appState, translations) {
  try {
    const lang = appState.lang || 'fr';
    const t = translations[lang] || translations.fr;

    // Selected Country (Default 'TN')
    const selectedCountryCode = appState.selectedCountry || 'TN';
    const selectedCountryObj = locationData.find(c => c.code === selectedCountryCode) || locationData[0];
    const activeRegions = selectedCountryObj.regions || [];

    const selectedRegions = appState.selectedRegions || [];
    const selectedLocalities = appState.selectedLocalities || [];
    const allLocalitiesFlat = activeRegions.flatMap(r => r.localities || []);

    // Compute card state using helper
    const { isShowingLocalities, territorialItems, tableSubtitle, xAxisItems, chartCurves, selectedMacro } = computeFilterState(appState, lang);

    let sectoralSubtitle = 'Moyenne nationale';
    if (selectedLocalities.length === 1) sectoralSubtitle = `Localité : ${selectedLocalities[0]}`;
    else if (selectedLocalities.length > 1) sectoralSubtitle = `${selectedLocalities.length} localités comparées`;
    else if (selectedRegions.length === 1) sectoralSubtitle = `1 région sélectionnée`;
    else if (selectedRegions.length > 1) sectoralSubtitle = `${selectedRegions.length} régions comparées`;

    const selectedPillar = appState.selectedPillar || 'ALL';
    const pillarNamesMap = { Economic: 'Économique', Social: 'Sociale', Environmental: 'Environnementale' };
    if (selectedPillar !== 'ALL') {
      sectoralSubtitle += ` · Perf. ${pillarNamesMap[selectedPillar] || selectedPillar}`;
    }

    const sectoralBadgeLabel = selectedMacro !== 'ALL' ? `${xAxisItems.length} Méso-secteurs` : `7 Secteurs`;

    // Localities for dropdown: filtered by selected region(s)
    const localitiesForDropdown = (() => {
      if (selectedRegions.length === 1) {
        const r = activeRegions.find(reg => reg.id === selectedRegions[0]);
        return (r && r.localities) || [];
      }
      if (selectedRegions.length > 1) {
        return selectedRegions.flatMap(rId => {
          const r = activeRegions.find(reg => reg.id === rId);
          return (r && r.localities) || [];
        });
      }
      return allLocalitiesFlat;
    })();

    // Active Meso Sectors based on selectedMacro
    const activeMesoSectors = selectedMacro !== 'ALL' ? (sectorData.mesoSectors[selectedMacro] || []) : [];

    // Selected Pillar categories
    const activeCategories = sectorData.indicatorCategories[selectedPillar] || [];

    // Selected Indicator Category
    const selectedCategory = appState.selectedCategory || activeCategories[0] || 'Facility';
    const activeSubTypes = sectorData.indicatorTypes[selectedCategory] || [];

    // Robust string normalizer
    const normalizeStr = (str) => {
      if (!str) return '';
      return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    };

    // Filter topActors and recentEvaluations by selected country code from real data
    const realEvals = (appState.data && appState.data.recentEvaluations) ? appState.data.recentEvaluations : [];
    
    // Build actor dropdown list ONLY from real Firestore evaluation entities (no mock actors)
    const activeCountryActors = [...new Set(
      realEvals
        .map(e => (e.targetEntity || e.actorName || e.entity || '').trim())
        .filter(Boolean)
    )].sort();

    // Compute regional scores map for the interactive map using normalizeStr + substring matching
    const regionScoresMap = {};
    const regionTotalsMap = {}, regionCountsMap = {};
    realEvals.forEach(e => {
      const eRegNorm = normalizeStr(e.region);
      const eLocNorm = normalizeStr(e.locality);
      const eLocaNorm = normalizeStr(e.location);
      activeRegions.forEach(r => {
        const rIdNorm = normalizeStr(r.id);
        const rNameFrNorm = normalizeStr(r.names ? r.names.fr : '');
        const rNameEnNorm = normalizeStr(r.names ? r.names.en : '');
        const rLocsNorm = (r.localities || []).map(l => normalizeStr(l));

        const isMatch = (eRegNorm && (
                          eRegNorm === rIdNorm ||
                          eRegNorm === rNameFrNorm ||
                          eRegNorm === rNameEnNorm ||
                          eRegNorm.includes(rIdNorm) ||
                          rIdNorm.includes(eRegNorm) ||
                          eRegNorm.includes(rNameFrNorm) ||
                          rNameFrNorm.includes(eRegNorm)
                        )) ||
                        (eLocaNorm && (eLocaNorm.includes(rIdNorm) || eLocaNorm.includes(rNameFrNorm) || rIdNorm.includes(eLocaNorm))) ||
                        (eLocNorm && rLocsNorm.some(loc => loc && loc.length > 2 && (eLocNorm.includes(loc) || loc.includes(eLocNorm))));

        if (isMatch) {
          if (!regionTotalsMap[r.id]) { regionTotalsMap[r.id] = 0; regionCountsMap[r.id] = 0; }
          regionTotalsMap[r.id] += parseFloat(e.rating) || 0;
          regionCountsMap[r.id]++;
        }
      });
    });

    activeRegions.forEach(r => {
      if (regionCountsMap[r.id] > 0) {
        regionScoresMap[r.id] = parseFloat((regionTotalsMap[r.id] / regionCountsMap[r.id]).toFixed(1));
      }
    });

    // Render SVG Map for active country with real regional scores
    const mapHTML = renderSVGMap(selectedCountryCode, regionScoresMap);

    // Triple Radar Charts HTML
    const econRadarHTML = renderRadarChartHTML('radar-canvas-econ', 'ÉCONOMIQUE');
    const socialRadarHTML = renderRadarChartHTML('radar-canvas-social', 'SOCIAL');
    const envRadarHTML = renderRadarChartHTML('radar-canvas-env', 'ENVIRONNEMENTAL');

    const displayEvals = getFilteredEvaluations(appState);
    const recentRatingsHTML = displayEvals.length > 0
      ? displayEvals.slice(0, 10).map(buildEvalItemHTML).join('')
      : `<div style="text-align: center; padding: 24px 16px; color: #64748B; font-size: 11.5px; font-weight: 500;">
           ℹ️ Aucune évaluation ne correspond aux critères sélectionnés.
         </div>`;


    return `
    <div>
      <!-- Screen Header -->
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #002B49;">Tableau Détaillé</h2>
        <p style="font-size: 11px; color: #64748B;">Explorez la base de données pour appuyer votre plaidoyer et vos prises de décisions</p>
      </div>

      <!-- CARD 1: Filtres & Slicers (All Dropdowns Selectable & Fully Cascading) -->
      <div class="card" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div class="card-title" style="display: flex; align-items: center; gap: 6px; font-size: 14px;">
            <span>🔍</span> Filtres
          </div>
          <button id="btn-reset-filters" class="btn btn-outline" style="width: auto; padding: 2px 10px; font-size: 10px; border-radius: 12px; color: #00A859; border-color: #00A859;">
            🔄 Réinitialiser
          </button>
        </div>

        <div class="slicer-dropdowns-stack">
          <!-- 1. Date Range Pill -->
          <div>
            <select id="filter-date-select" class="slicer-pill-select">
              <option value="ALL">Toutes les dates</option>
              <option value="2026">Année 2026</option>
              <option value="2025">Année 2025</option>
              <option value="2024">Année 2024</option>
            </select>
          </div>

          <!-- 2. Pays Pill (Triggers dynamic map & region update) -->
          <div>
            <select id="filter-country-select" class="slicer-pill-select">
              ${locationData.map(c => `
                <option value="${c.code}" ${c.code === selectedCountryCode ? 'selected' : ''}>Pays: ${c.names[lang] || c.names.fr}</option>
              `).join('')}
            </select>
          </div>

          <!-- 3. Région - MULTI-SELECT SLICER -->
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #64748B; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em;">Régions (multi-sélection)</div>
            <select id="filter-region-select" class="slicer-pill-select" multiple size="4" style="height: auto; min-height: 80px; border-radius: 10px; padding: 4px;">
              ${activeRegions.map(r => `
                <option value="${r.id}" ${(appState.selectedRegions || []).includes(r.id) ? 'selected' : ''}>${r.names[lang] || r.names.fr}</option>
              `).join('')}
            </select>
            <div style="font-size: 9px; color: #94A3B8; margin-top: 3px;">Ctrl+clic pour sélectionner plusieurs régions</div>
          </div>

          <!-- 4. Localité - MULTI-SELECT SLICER -->
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #64748B; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em;">Localités (multi-sélection)</div>
            <select id="filter-locality-select" class="slicer-pill-select" multiple size="4" style="height: auto; min-height: 80px; border-radius: 10px; padding: 4px;">
              ${localitiesForDropdown.map(loc => `
                <option value="${loc}" ${(appState.selectedLocalities || []).includes(loc) ? 'selected' : ''}>${loc}</option>
              `).join('')}
            </select>
            <div style="font-size: 9px; color: #94A3B8; margin-top: 3px;">Ctrl+clic pour sélectionner plusieurs localités</div>
          </div>

          <!-- 5. Macro-Secteur Pill -->
          <div>
            <select id="filter-macro-select" class="slicer-pill-select">
              <option value="ALL" ${selectedMacro === 'ALL' ? 'selected' : ''}>Secteur: Tous</option>
              ${sectorData.macroSectors.map(ms => `
                <option value="${ms}" ${ms === selectedMacro ? 'selected' : ''}>Secteur: ${t.sectors[ms] || ms}</option>
              `).join('')}
            </select>
          </div>

          <!-- 6. Méso-Secteur Pill (Selectable with active meso sectors) -->
          <div>
            <select id="filter-meso-select" class="slicer-pill-select">
              <option value="ALL">Méso-Secteur: Tous</option>
              ${activeMesoSectors.map(m => `
                <option value="${m.id}">${m.names[lang] || m.names.fr || m.id}</option>
              `).join('')}
            </select>
          </div>

          <!-- 7. Performance Pillar Pill -->
          <div>
            <select id="filter-pillar-select" class="slicer-pill-select">
              <option value="ALL" ${selectedPillar === 'ALL' ? 'selected' : ''}>Performance: Toutes</option>
              <option value="Economic" ${selectedPillar === 'Economic' ? 'selected' : ''}>Performance: Économique</option>
              <option value="Social" ${selectedPillar === 'Social' ? 'selected' : ''}>Performance: Social</option>
              <option value="Environmental" ${selectedPillar === 'Environmental' ? 'selected' : ''}>Performance: Environnemental</option>
            </select>
          </div>

          <!-- 8. Indicateur Pill (Selectable with active categories) -->
          <div>
            <select id="filter-indicator-select" class="slicer-pill-select">
              <option value="ALL">Indicateur: Tous</option>
              ${activeCategories.map(cat => `
                <option value="${cat}">${t.indicators[cat] || cat}</option>
              `).join('')}
            </select>
          </div>

          <!-- 9. Sous-Indicateur Pill (Selectable with active sub-indicators) -->
          <div>
            <select id="filter-subindicator-select" class="slicer-pill-select">
              <option value="ALL">Sous-Indicateur: Tous</option>
              ${activeSubTypes.map(tp => `
                <option value="${tp}">${t.subIndicators[tp] || tp}</option>
              `).join('')}
            </select>
          </div>

          <!-- 10. Acteurs Comparaison (max 3) -->
          <div id="actor-multi-wrapper">
            <select id="filter-actor-add" class="slicer-pill-select">
              <option value="">➕ Ajouter un acteur (max 3)</option>
              ${activeCountryActors.map(actorName => {
                const alreadySelected = (appState.selectedActors || []).includes(actorName);
                return `<option value="${actorName}" ${alreadySelected ? 'disabled' : ''}>${actorName}</option>`;
              }).join('')}
            </select>
            <div id="actor-pills-container" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;">
              ${(appState.selectedActors || []).map((name, idx) => {
                const styles = ['solid','dashed','dotted'];
                const styleLabels = ['━━', '╌╌', '···'];
                return `<span class="actor-pill" data-actor="${name}" style="display:inline-flex;align-items:center;gap:4px;background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;font-size:10px;font-weight:700;padding:3px 8px;border-radius:12px;">
                  <span style="font-size:9px;opacity:0.7;" title="${styles[idx]}">${styleLabels[idx]}</span>
                  ${name}
                  <button class="actor-pill-remove" data-actor="${name}" style="background:none;border:none;color:#1E40AF;cursor:pointer;font-size:11px;padding:0;line-height:1;margin-left:2px;">×</button>
                </span>`;
              }).join('')}
            </div>
          </div>

          <!-- 11. Plage de Note Pill -->
          <div>
            <select id="filter-rating-select" class="slicer-pill-select">
              <option value="ALL">Plage de note: Toutes (0.0 - 5.0)</option>
              <option value="HIGH">⭐ Excellente (4.0 - 5.0)</option>
              <option value="MEDIUM">🟡 Moyenne (3.0 - 4.0)</option>
              <option value="LOW">🔴 Faible (0.0 - 3.0)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- CARD 2: Performances Territoriales -->
      <div id="analytics-territorial-card" class="card" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div>
            <div class="card-title">Performances Territoriales</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">${tableSubtitle}</div>
          </div>
          ${isShowingLocalities ? `<span style="font-size: 9px; background: #E8F5EE; color: #00A859; padding: 2px 7px; border-radius: 10px; font-weight: 700; white-space: nowrap;">📍 Localités</span>` : `<span style="font-size: 9px; background: #EFF6FF; color: #3B82F6; padding: 2px 7px; border-radius: 10px; font-weight: 700; white-space: nowrap;">🗺️ Régions</span>`}
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 10px; color: #64748B; text-transform: uppercase;">
                <th style="padding: 8px;">${isShowingLocalities ? 'Localité' : 'Région'}</th>
                <th style="padding: 8px; text-align: center;">Score</th>
                <th style="padding: 8px; text-align: right;">Évolution</th>
              </tr>
            </thead>
            <tbody>
              ${territorialItems.map((item, idx) => {
                const score = parseFloat(item.score);
                const scoreColor = score >= 4.0 ? '#00A859' : score >= 3.0 ? '#28C76F' : score >= 2.0 ? '#FFB800' : score >= 1.0 ? '#FF9F43' : '#DC2626';
                const isTrendUp = item.trend === '+';
                return `<tr style="border-bottom: 1px solid #EDF2F7; font-size: 12px;">
                  <td style="padding: 9px 8px; font-weight: 600; color: #002B49;">${item.name}</td>
                  <td style="padding: 9px 8px; font-weight: 800; text-align: center; color: ${scoreColor};">${item.score}</td>
                  <td style="padding: 9px 8px; text-align: right;">
                    <span class="badge ${isTrendUp ? 'badge-success' : 'badge-danger'}">${isTrendUp ? '↗' : '↘'} ${item.trend}${item.delta}</span>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- CARD 3: Performances Sectorielles -->
      <div id="analytics-sectoral-card" class="card" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div>
            <div class="card-title">Performances Sectorielles</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">${sectoralSubtitle}</div>
          </div>
          <span class="badge badge-info">${sectoralBadgeLabel}</span>
        </div>

        ${(() => {
          const W = 300, H = 170;
          const padL = 24, padR = 8, padT = 10, padB = 60; // padB large for rotated labels
          const chartW = W - padL - padR;
          const chartH = H - padT - padB;
          const nSec = xAxisItems.length;
          const xStep = nSec > 1 ? chartW / (nSec - 1) : 0;

          function yPos(score) { return padT + chartH - ((score / 5) * chartH); }
          function xPos(i) { return nSec === 1 ? padL + chartW / 2 : padL + i * xStep; }

          // Y gridlines
          const yGrids = [5, 4, 3, 2, 1].map(v => {
            const y = yPos(v).toFixed(1);
            return `
              <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E2E8F0" stroke-width="0.6"/>
              <text x="${(padL - 3).toFixed(1)}" y="${(parseFloat(y) + 2.5).toFixed(1)}" font-size="6.5" fill="#94A3B8" text-anchor="end">${v}</text>`;
          }).join('');

          // X axis base line
          const xBase = `<line x1="${padL}" y1="${(padT + chartH).toFixed(1)}" x2="${W - padR}" y2="${(padT + chartH).toFixed(1)}" stroke="#CBD5E1" stroke-width="1.5"/>` ;

          // X vertical guides
          const xGuides = xAxisItems.map((_, i) =>
            `<line x1="${xPos(i).toFixed(1)}" y1="${padT}" x2="${xPos(i).toFixed(1)}" y2="${(padT + chartH).toFixed(1)}" stroke="#F1F5F9" stroke-width="0.5"/>`
          ).join('');

          // X axis labels: single line, rotated -45°
          const xLabels = xAxisItems.map((item, i) => {
            const x = xPos(i);
            const y = padT + chartH + 8;
            return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="6.5" fill="#475569" text-anchor="end" font-weight="600" transform="rotate(-45, ${x.toFixed(1)}, ${y.toFixed(1)})">${item.label}</text>`;
          }).join('');

          // Curves with numeric badges
          const curveSVG = chartCurves.map(curve => {
            const pts = curve.scores.map((s, i) => ({ x: xPos(i), y: yPos(s), score: s }));
            const d = pts.map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`)).join(' ');
            const dotsSVG = pts.map(p => {
              const valText = p.score > 0
                ? `<text x="${p.x.toFixed(1)}" y="${(p.y - 7).toFixed(1)}" font-size="7.5" font-weight="800" fill="${curve.color}" text-anchor="middle">${p.score.toFixed(1)}</text>`
                : `<text x="${p.x.toFixed(1)}" y="${(padT + chartH + 7).toFixed(1)}" font-size="6" font-weight="600" fill="#94A3B8" text-anchor="middle">0</text>`;
              return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${curve.color}" stroke="#FFFFFF" stroke-width="1"/>${valText}`;
            }).join('');
            return `<path d="${d}" fill="none" stroke="${curve.color}" stroke-width="2" stroke-linejoin="round"/>${dotsSVG}`;
          }).join('');

          // Legend
          const legendHTML = chartCurves.map(curve => {
            const evaluatedScores = curve.scores.filter(s => s > 0);
            const avgScore = evaluatedScores.length > 0
              ? (evaluatedScores.reduce((a, b) => a + b, 0) / evaluatedScores.length).toFixed(1)
              : '0.0';
            const scoreColor = parseFloat(avgScore) >= 4.0 ? '#00A859' : parseFloat(avgScore) >= 3.0 ? '#28C76F' : parseFloat(avgScore) >= 2.0 ? '#FFB800' : parseFloat(avgScore) >= 1.0 ? '#FF9F43' : '#DC2626';
            return `<div style="display:flex;align-items:center;gap:5px;padding:5px 8px;background:#F8FAFC;border-radius:8px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${curve.color};flex-shrink:0;"></span>
              <span style="font-size:10px;color:#1E293B;font-weight:600;flex:1;">${curve.name}</span>
              <span style="font-size:10px;font-weight:800;color:${scoreColor};">${avgScore}</span>
            </div>`;
          }).join('');

          return `
            <div style="width:100%;overflow:hidden;">
              <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;">
                ${yGrids}${xBase}${xGuides}${xLabels}${curveSVG}
              </svg>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px;">${legendHTML}</div>`;
        })()}
      </div>

      <!-- CARD 4: Cartographie du Développement -->
      <div class="card" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div class="card-title">Cartographie du Développement</div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-outline" style="width: auto; padding: 2px 6px; font-size: 10px;">🔍</button>
            <button class="btn btn-outline" style="width: auto; padding: 2px 6px; font-size: 10px;">🔗</button>
          </div>
        </div>

        ${mapHTML}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 12px; font-size: 10px; font-weight: 600;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 10px; height: 10px; background: #007A3D; border-radius: 50%;"></span>
            <span>Très Bon (> 4.5)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 10px; height: 10px; background: #00A859; border-radius: 50%;"></span>
            <span>Bon (4.0 - 4.5)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 10px; height: 10px; background: #FFB800; border-radius: 50%;"></span>
            <span>Moyen (3.0 - 4.0)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 10px; height: 10px; background: #FF9F43; border-radius: 50%;"></span>
            <span>Faible (2.0 - 3.0)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 10px; height: 10px; background: #EA5455; border-radius: 50%;"></span>
            <span>Critique (< 2.0)</span>
          </div>
        </div>
      </div>

      <!-- CARD 5: Analyse Radar par Pilier -->
      <div class="card" style="margin-bottom: 16px;">
        <div class="card-title" style="margin-bottom: 2px;">Analyse Radar</div>
        <div id="radar-actor-subtitle" style="font-size: 10px; color: #64748B; margin-bottom: 6px;">Tous les acteurs</div>
        <div id="radar-stroke-legend" style="display:none;flex-wrap:wrap;gap:8px;margin-bottom:12px;font-size:9.5px;color:#475569;font-weight:600;">
          <span>━━ Acteur 1 (trait plein)</span>
          <span>╌╌ Acteur 2 (pointillé)</span>
          <span>··· Acteur 3 (discontinu)</span>
        </div>

        <div class="radar-charts-grid">
          ${econRadarHTML}
          ${socialRadarHTML}
          ${envRadarHTML}
        </div>
      </div>

      <!-- CARD 6: Dernières Évaluations Feed -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div class="card-title">Dernières Évaluations</div>
          <button class="btn btn-outline" style="width: auto; padding: 2px 8px; font-size: 10px;">Filtres</button>
        </div>

        <div id="evaluations-feed">
          ${recentRatingsHTML}
        </div>
      </div>
    </div>
  `;
  } catch (err) {
    console.error("renderAnalyticsView error:", err);
    // Return a valid fallback HTML so the page at least navigates
    return `
      <div style="padding: 20px;">
        <div style="margin-bottom: 14px;">
          <h2 style="font-size: 18px; font-weight: 800; color: #002B49;">Tableau Détaillé</h2>
          <p style="font-size: 11px; color: #64748B;">Explorez la base de données pour appuyer votre plaidoyer et vos prises de décisions</p>
        </div>
        <div class="card" style="padding: 24px; text-align: center; color: #64748B;">
          <p style="font-size: 12px;">Données en cours de chargement. Veuillez réessayer dans un instant.</p>
        </div>
      </div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: compute all filter-dependent card data from appState
// ─────────────────────────────────────────────────────────────────────────────
// ─── Module-level helper: compute state and curves for analytics view ───────
const mesoSectorKeywords = {
  // Governance
  Parlement: ['parlement', 'parl', 'depute', 'assemblee', 'parliament', 'مجلس', 'برلمان'],
  Gouvernement: ['gouvernement', 'gouv', 'gov', 'minist', 'cabinet', 'premier', 'government', 'حكومة', 'وزارة'],
  Justice: ['justice', 'just', 'tribunal', 'tribun', 'juge', 'cour', 'magistrat', 'avocat', 'عدالة', 'محكمة'],

  // Security & Defense
  Police: ['police', 'polic', 'commissariat', 'poste de police', 'شرطة', 'أمن'],
  Gendarmerie: ['gendarmerie', 'gend', 'garde nationale', 'garde', 'حرس'],
  Pompiers: ['pompier', 'pompiers', 'protection civile', 'incendie', 'firefighter', 'حماية مدنية', 'إطفاء'],
  ArmeeTerre: ['armeeterre', 'armee de terre', 'armee', 'milit', 'terre', 'army', 'جيش بري'],
  MarineNationale: ['marinenationale', 'marine', 'mer', 'cotiere', 'navy', 'بحرية'],
  ArmeeAir: ['armeeair', 'armee de lair', 'air', 'aviation', 'force aerienne', 'air force', 'طيران'],

  // Health & Hygiene
  Medecine: ['medecine', 'medecin', 'médecine', 'médecin', 'med', 'hopital', 'hôpital', 'hopit', 'clinique', 'dispensaire', 'docteur', 'urgenc', 'soin', 'sante', 'santé', 'cabinet medical', 'polyclinique', 'centre de sante', 'chu', 'طب', 'مستشفى', 'عيادة', 'صحة'],
  Pharmacie: ['pharmacie', 'pharm', 'medicament', 'médicament', 'officine', 'drugstore', 'صيدلة', 'دواء'],
  Biologie: ['biologie', 'bio', 'laboratoire', 'analyse', 'labo', 'تحاليل', 'مخبر'],
  GestionDechets: ['gestiondechet', 'gestion des dechets', 'gestion des déchets', 'dechet', 'déchet', 'ordur', 'poubelle', 'collecte', 'recyclage', 'waste', 'proprete', 'propreté', 'نفايات', 'قمامة'],
  Assainissement: ['assainissement', 'onass', 'egout', 'égout', 'eau usee', 'eau usée', 'sanitation', 'تطهير'],
  ProtectionEnvironnement: ['protectionenvironnement', 'protection de lenvironnement', 'protection de l\'environnement', 'environnement', 'ecologie', 'écologie', 'foret', 'forêt', 'anpe', 'dpm', 'parc', 'بيئة'],

  // Instruction & Culture
  Education: ['education', 'éducation', 'educ', 'éduc', 'ecole', 'école', 'lycee', 'lycée', 'college', 'collège', 'primaire', 'secondaire', 'scolaire', 'تعليم', 'مدرسة'],
  EnseignementSuperieur: ['enseignementsuperieur', 'enseignement superieur', 'enseignement supérieur', 'superieur', 'supérieur', 'universite', 'université', 'univ', 'faculte', 'faculté', 'fac', 'institut', 'campus', 'جامعة', 'كلية'],
  FormationProfessionnelle: ['formationprofessionnelle', 'formation professionnelle', 'formation', 'apprentissage', 'metier', 'métier', 'centre de formation', 'تكوين مهني'],
  Arts: ['arts', 'art', 'theatre', 'théâtre', 'cinema', 'cinéma', 'musee', 'musée', 'galerie', 'exposition', 'culture', 'فنون', 'مسرح', 'سينما', 'متحف'],
  Sports: ['sports', 'sport', 'stade', 'complexe', 'piscine', 'gymnase', 'club', 'رياضة', 'ملعب'],
  Cultes: ['cultes', 'culte', 'mosquee', 'mosquée', 'eglise', 'église', 'synagogue', 'religieux', 'شؤون دينية', 'جامع', 'مسجد'],

  // Food & Finance
  Agriculture: ['agriculture', 'agri', 'ferme', 'recolte', 'récolte', 'peche', 'pêche', 'elevage', 'élevage', 'فلاحة', 'زراعة', 'صيد'],
  Industrie: ['industrie', 'indus', 'usine', 'fabrique', 'manufacture', 'agroalimentaire', 'صناعة', 'معمل'],
  Commerce: ['commerce', 'comm', 'marche', 'marché', 'magasin', 'supermarche', 'supermarché', 'boutique', 'grossiste', 'تجارة', 'سوق', 'محل'],
  Banque: ['banque', 'banq', 'bank', 'credit', 'crédit', 'agence bancaire', 'atm', 'distributeur', 'بنك', 'مصرف'],
  Bourse: ['bourse', 'bvmt', 'marche financier', 'marché financier', 'action', 'titre', 'بورصة'],
  Assurance: ['assurance', 'assur', 'compagnie dassurance', 'compagnie d\'assurance', 'sinistre', 'تأمين'],

  // Housing & Tourism
  Logement: ['logement', 'log', 'immobilier', 'immo', 'residence', 'résidence', 'habitat', 'foyer', 'سكن', 'عقار'],
  AmenagementTerritoire: ['amenagement', 'aménagement', 'territoire', 'urbanisme', 'cadastre', 'voirie', 'municipalite', 'municipalité', 'تهيئة ترابية', 'بلدية'],
  EquipementsPublics: ['equipement', 'équipement', 'public', 'infrastructure', 'eclairage', 'éclairage', 'espace vert', 'jardin', 'تجهيزات عمومية', 'حديقة'],
  Hotellerie: ['hotellerie', 'hôtellerie', 'hotel', 'hôtel', 'auberge', 'resort', 'chambre', 'فندقة', 'نزل', 'فندق'],
  Restauration: ['restauration', 'restaurant', 'resto', 'cafe', 'café', 'cafet', 'salon de the', 'salon de thé', 'مطعم', 'مقهى'],
  AgencesVoyages: ['voyage', 'tourisme', 'tour', 'agence', 'guide', 'excursion', 'travel', 'وكالة أسفar', 'سياحة'],

  // Transport & Telco
  TransportTerrestre: ['transportterrestre', 'transport terrestre', 'terrestre', 'bus', 'train', 'sncft', 'metro', 'métro', 'taxi', 'louage', 'route', 'gare', 'نقل بري', 'حافلة', 'قطار'],
  TransportMaritime: ['transportmaritime', 'transport maritime', 'maritime', 'port', 'bateau', 'ferry', 'navire', 'ctn', 'نقل بحري', 'ميناء'],
  TransportAerien: ['transportaerien', 'transport aerien', 'transport aérien', 'aerien', 'aérien', 'aeroport', 'aéroport', 'avion', 'tunisair', 'vol', 'نقل جوي', 'مطار', 'طائرة'],
  Poste: ['poste', 'post', 'courrier', 'colis', 'facteur', 'bureau de poste', 'بريد'],
  Telecommunications: ['telecommunication', 'télécommunication', 'telecom', 'télécom', 'tel', 'tél', 'operateur', 'opérateur', 'telephonie', 'téléphonie', 'mobile', 'fibre', 'tt', 'ooredoo', 'orange', 'اتصالات'],
  InternetMedias: ['internet', 'media', 'médias', 'web', 'presse', 'radio', 'television', 'télévision', 'tv', 'journal', 'إنترنت', 'إعلام']
};

function computeFilterState(appState, lang) {
  const selectedCountryCode = appState.selectedCountry || 'TN';
  const selectedCountryObj = locationData.find(c => c.code === selectedCountryCode) || locationData[0];
  const activeRegions = selectedCountryObj.regions || [];
  const allLocalitiesFlat = activeRegions.flatMap(r => r.localities || []);

  const selectedRegions = appState.selectedRegions || [];
  const selectedLocalities = appState.selectedLocalities || [];
  const selectedMacro = appState.selectedMacro || 'ALL';
  const selectedPillar = appState.selectedPillar || 'ALL';

  const pillarLabels = {
    ALL: '', Economic: 'Économique', Social: 'Sociale', Environmental: 'Environnementale'
  };

  // ── UNIFIED REAL EVALUATIONS POOL — Firestore sources only ──────────────────
  // data.evaluations and appState.evaluations are excluded: they may contain
  // stale localStorage data or old mock records.
  const allEvalsData = [
    ...((appState.data && appState.data.recentEvaluations) ? appState.data.recentEvaluations : []),
    ...((appState.currentUserEvals) ? appState.currentUserEvals : [])
  ];

  const evalsMap = new Map();
  allEvalsData.forEach(e => {
    if (e) {
      const key = e.id || `${e.targetEntity || e.actorName}-${e.rating}-${e.date || ''}-${e.comment || ''}`;
      evalsMap.set(key, e);
    }
  });
  const allEvals = Array.from(evalsMap.values());

  // Helper: normalize pillar
  const normalizePillar = (pStr) => {
    if (!pStr) return null;
    const s = String(pStr).toLowerCase();
    if (s.includes('econ') || s.includes('écon')) return 'Economic';
    if (s.includes('env')) return 'Environmental';
    if (s.includes('soc')) return 'Social';
    return null;
  };

  // Helper: normalize sector to macroSector id
  const sectorMapKeys = [
    { id: "Governance",         keywords: ["gouv", "gov", "just", "parl", "governance", "gouvernance"] },
    { id: "SecurityDefense",    keywords: ["séc", "secu", "def", "polic", "gend", "securitydefense", "sécurité"] },
    { id: "HealthHygiene",      keywords: ["sant", "hyg", "med", "pharm", "hopit", "hôpit", "healthhygiene", "santé"] },
    { id: "InstructionCulture", keywords: ["inst", "cult", "educ", "éduc", "univ", "ecol", "écol", "instructionculture"] },
    { id: "FoodFinance",        keywords: ["alim", "finan", "banq", "resta", "cafet", "foodfinance", "agriculture"] },
    { id: "HousingTourism",     keywords: ["log", "tour", "hotel", "hôt", "housingtourism", "logement"] },
    { id: "TransportTelco",     keywords: ["trans", "tel", "tél", "post", "auto", "transporttelco", "transport"] }
  ];
  const normalizeSector = (s) => {
    if (!s) return null;
    const sl = String(s).toLowerCase();
    const matched = sectorMapKeys.find(sk =>
      sk.id.toLowerCase() === sl || sl.includes(sk.id.toLowerCase()) ||
      sk.keywords.some(k => sl.includes(k))
    );
    return matched ? matched.id : null;
  };

  const normalizeStrLocal = (str) => !str ? '' : String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'').trim();

  const filterEvals = (evals) => {
    return evals.filter(e => {
      const eCountry = e.country || selectedCountryCode;
      if (normalizeStrLocal(eCountry) !== normalizeStrLocal(selectedCountryCode)) return false;
      if (selectedPillar !== 'ALL') {
        const p = normalizePillar(e.pillar || e.societalPillar);
        if (p !== selectedPillar) return false;
      }
      if (selectedMacro !== 'ALL') {
        const sec = normalizeSector(e.sectorName || e.macroSector || e.sector);
        if (sec !== selectedMacro) return false;
      }
      if (selectedRegions.length > 0) {
        const eRegNorm = normalizeStrLocal(e.region);
        const eLocNorm = normalizeStrLocal(e.locality);
        const matches = selectedRegions.some(rId => {
          const rObj = activeRegions.find(r => r.id === rId);
          const rNorm = normalizeStrLocal(rId);
          const rNameNorm = rObj ? normalizeStrLocal(rObj.names[lang] || rObj.names.fr) : rNorm;

          // 1. Region field matches — ONLY when eRegNorm is non-empty (empty string must not match anything)
          const regionFieldMatches = eRegNorm !== '' && (
            eRegNorm === rNorm || eRegNorm === rNameNorm ||
            eRegNorm.includes(rNorm) || rNorm.includes(eRegNorm)
          );

          // 2. Locality field: EXACT match against the region's official locality list ONLY
          //    (prevents "Médina" from Tunis matching "Sousse Médina" from Sousse)
          //    ONLY used when the locality field is non-empty
          const rLocs = (rObj && rObj.localities) ? rObj.localities.map(normalizeStrLocal) : [];
          const localityInRegion = eLocNorm !== '' && rLocs.length > 0 && rLocs.some(loc => loc && eLocNorm === loc);

          return regionFieldMatches || localityInRegion;
        });
        if (!matches) return false;
      }
      if (selectedLocalities.length > 0) {
        const eLoc = normalizeStrLocal(e.locality);
        const matches = selectedLocalities.some(l => {
          const lNorm = normalizeStrLocal(l);
          return eLoc === lNorm || (eLoc && (eLoc.includes(lNorm) || lNorm.includes(eLoc)));
        });
        if (!matches) return false;
      }
      return true;
    });
  };
  const filteredEvals = filterEvals(allEvals);

  // ── TERRITORIAL TABLE & LOCALITIES SELECTION ───────────────────────────────
  const selectedRegionObjs = selectedRegions.map(rId => activeRegions.find(r => r.id === rId)).filter(Boolean);
  const isShowingLocalities = selectedLocalities.length > 0 || selectedRegionObjs.length > 0;

  const regionTotals = {}, regionCounts = {};
  allEvals.forEach(e => {
    const eRegion = normalizeStrLocal(e.region);
    const eLocality = normalizeStrLocal(e.locality);
    const eLocation = normalizeStrLocal(e.location);
    activeRegions.forEach(r => {
      const rId = normalizeStrLocal(r.id);
      const rNameFr = normalizeStrLocal(r.names ? r.names.fr : '');
      const rNameEn = normalizeStrLocal(r.names ? r.names.en : '');
      const rLocs = (r.localities || []).map(l => normalizeStrLocal(l));
      const isMatch = (eRegion && (
                        eRegion === rId || eRegion === rNameFr || eRegion === rNameEn ||
                        eRegion.includes(rId) || rId.includes(eRegion) ||
                        eRegion.includes(rNameFr) || rNameFr.includes(eRegion)
                      )) ||
                      (eLocation && (eLocation.includes(rId) || eLocation.includes(rNameFr) || rId.includes(eLocation))) ||
                      (eLocality && rLocs.some(loc => loc && loc.length > 2 && (eLocality.includes(loc) || loc.includes(eLocality))));
      if (isMatch) {
        regionTotals[r.id] = (regionTotals[r.id] || 0) + (parseFloat(e.rating) || 0);
        regionCounts[r.id] = (regionCounts[r.id] || 0) + 1;
      }
    });
  });

  const getRegionScore = (rId) => regionCounts[rId] > 0
    ? parseFloat((regionTotals[rId] / regionCounts[rId]).toFixed(1))
    : null;

  const territorialItems = isShowingLocalities
    ? (() => {
        let targetLocs = [];
        if (selectedLocalities.length > 0) {
          targetLocs = selectedLocalities;
        } else if (selectedRegionObjs.length > 0) {
          targetLocs = [...new Set(selectedRegionObjs.flatMap(r => r.localities || []))];
        }
        return targetLocs.map(loc => {
          const locNorm = normalizeStrLocal(loc);
          const evsForLoc = filteredEvals.filter(e => {
            const eLoc = normalizeStrLocal(e.locality || '');
            return eLoc === locNorm || (eLoc && locNorm && (eLoc.includes(locNorm) || locNorm.includes(eLoc)));
          });
          const score = evsForLoc.length > 0
            ? (evsForLoc.reduce((s, e) => s + (parseFloat(e.rating) || 0), 0) / evsForLoc.length).toFixed(1)
            : '—';
          return { name: loc, score, trend: parseFloat(score) >= 3.5 ? '+' : '-', delta: '0.0' };
        });
      })()
    : activeRegions.map(r => {
        const rScore = getRegionScore(r.id);
        const score = rScore !== null ? rScore.toFixed(1) : '—';
        return {
          name: r.names[lang] || r.names.fr, score,
          trend: parseFloat(score) >= 3.5 ? '+' : '-',
          delta: rScore !== null ? Math.abs(rScore - 3.5).toFixed(1) : '0.0'
        };
      });

  // ── X-AXIS DEFINITION ─────────────────────────────────────────────────────
  const macroSectorsDef = [
    { id: 'Governance',         label: 'Gouvernance' },
    { id: 'SecurityDefense',    label: 'Sécurité & Défense' },
    { id: 'HealthHygiene',      label: 'Santé & Hygiène' },
    { id: 'InstructionCulture', label: 'Instruction & Culture' },
    { id: 'FoodFinance',        label: 'Alimentation & Finance' },
    { id: 'HousingTourism',     label: 'Logement & Tourisme' },
    { id: 'TransportTelco',     label: 'Transport & Télécoms' }
  ];
  const activeMesoSectors = selectedMacro !== 'ALL' ? (sectorData.mesoSectors[selectedMacro] || []) : [];
  const xAxisItems = selectedMacro !== 'ALL' && activeMesoSectors.length > 0
    ? activeMesoSectors.map(m => ({ id: m.id, label: m.names[lang] || m.names.fr }))
    : macroSectorsDef.map(s => ({ id: s.id, label: s.label }));

  // Helper to compute sector scores for a filtered subset of evals
  // STRICT: only match on the explicit mesoSector/subSector field (exact ID or ≥5-char keyword)
  // This prevents false-positive cross-contamination between sub-sectors
  const getSectorScoreForEvals = (evalsSubset, secId) => {
    const secNorm = normalizeStrLocal(secId);

    let secEvals;
    if (selectedMacro !== 'ALL') {
      const allowedKeywords = (mesoSectorKeywords[secId] || []).map(normalizeStrLocal).filter(k => k.length >= 5);
      secEvals = evalsSubset.filter(e => {
        const eMeso = normalizeStrLocal(e.mesoSector || e.subSector || '');
        if (!eMeso) return false; // no meso field → cannot assign to any sub-sector
        // Exact ID match
        if (eMeso === secNorm) return true;
        // Long-keyword match only (≥5 chars prevents short-token false positives like "med", "bio", "art")
        return allowedKeywords.some(k => eMeso === k);
      });
    } else {
      secEvals = evalsSubset.filter(e => {
        const sec = normalizeSector(e.sectorName || e.macroSector || e.sector);
        return sec === secId;
      });
    }

    if (!secEvals || secEvals.length === 0) return 0;
    return parseFloat((secEvals.reduce((s, e) => s + (parseFloat(e.rating) || 0), 0) / secEvals.length).toFixed(1));
  };

  // ── CHART CURVES (Sectoral Performance Line Chart — Multi-Region / Multi-Locality) ──
  const chartPalette = ['#00A859','#002B49','#FF9F43','#3B82F6','#EA5455','#8B5CF6','#06B6D4'];
  const countryName = selectedCountryObj.names[lang] || selectedCountryObj.names.fr;
  let chartCurves = [];

  if (selectedLocalities.length > 0) {
    chartCurves = selectedLocalities.map((locName, idx) => {
      const locNorm = normalizeStrLocal(locName);
      const locEvals = allEvals.filter(e => {
        const eCountry = e.country || selectedCountryCode;
        if (normalizeStrLocal(eCountry) !== normalizeStrLocal(selectedCountryCode)) return false;
        if (selectedPillar !== 'ALL') {
          const p = normalizePillar(e.pillar || e.societalPillar);
          if (p !== selectedPillar) return false;
        }
        if (selectedMacro !== 'ALL') {
          const sec = normalizeSector(e.sectorName || e.macroSector || e.sector);
          if (sec !== selectedMacro) return false;
        }
        const eLoc = normalizeStrLocal(e.locality);
        return eLoc === locNorm || (eLoc && locNorm && (eLoc.includes(locNorm) || locNorm.includes(eLoc)));
      });
      return {
        name: `Performance moyenne — ${locName}`,
        color: chartPalette[idx % chartPalette.length],
        scores: xAxisItems.map(item => getSectorScoreForEvals(locEvals, item.id))
      };
    });
  } else if (selectedRegions.length > 0) {
    chartCurves = selectedRegions.map((rId, idx) => {
      const rObj = activeRegions.find(r => r.id === rId);
      const rName = rObj ? (rObj.names[lang] || rObj.names.fr) : rId;
      const rIdNorm = normalizeStrLocal(rId);
      const rNameNorm = normalizeStrLocal(rName);
      const rLocsNorm = (rObj && rObj.localities) ? rObj.localities.map(normalizeStrLocal) : [];

      const regEvals = allEvals.filter(e => {
        const eCountry = e.country || selectedCountryCode;
        if (normalizeStrLocal(eCountry) !== normalizeStrLocal(selectedCountryCode)) return false;
        if (selectedPillar !== 'ALL') {
          const p = normalizePillar(e.pillar || e.societalPillar);
          if (p !== selectedPillar) return false;
        }
        if (selectedMacro !== 'ALL') {
          const sec = normalizeSector(e.sectorName || e.macroSector || e.sector);
          if (sec !== selectedMacro) return false;
        }
        const eReg = normalizeStrLocal(e.region);
        const eLoc = normalizeStrLocal(e.locality);
        // Region field match (only when eReg is non-empty — empty string must NOT match anything)
        const regionFieldMatch = eReg !== '' && (
          eReg === rIdNorm || eReg === rNameNorm ||
          eReg.includes(rIdNorm) || rIdNorm.includes(eReg)
        );
        // Locality field: EXACT match against official locality list ONLY (no substrings, no cross-region pollution)
        const localityListMatch = eLoc !== '' && rLocsNorm.some(loc => loc && eLoc === loc);

        return regionFieldMatch || localityListMatch;
      });
      return {
        name: `Performance moyenne — ${rName}`,
        color: chartPalette[idx % chartPalette.length],
        scores: xAxisItems.map(item => getSectorScoreForEvals(regEvals, item.id))
      };
    });
  } else {
    chartCurves = [{
      name: `Performance moyenne — ${countryName}`,
      color: chartPalette[0],
      scores: xAxisItems.map(item => getSectorScoreForEvals(filteredEvals, item.id))
    }];
  }

  const pillarText = selectedPillar !== 'ALL' ? ` · Perf. ${pillarLabels[selectedPillar]}` : '';
  const tableSubtitle = (selectedLocalities.length > 0
    ? `Localités sélectionnées (${selectedLocalities.length})`
    : selectedRegions.length > 0
    ? `Localités de ${selectedRegionObjs.map(r => r.names[lang] || r.names.fr).join(', ')}`
    : `Toutes les régions — ${countryName}`)
    + (selectedMacro !== 'ALL' ? ` · ${xAxisItems.length} méso-secteurs` : '')
    + pillarText;

  return { isShowingLocalities, territorialItems, tableSubtitle, macroSectorsDef, xAxisItems, chartCurves, selectedMacro, selectedPillar, activeMesoSectors };
}


// ─────────────────────────────────────────────────────────────────────────────
// Partial DOM update: refreshes only the two data-driven cards + locality list
// ─────────────────────────────────────────────────────────────────────────────
function refreshFilteredCards(containerEl, appState, lang) {
  const { isShowingLocalities, territorialItems, tableSubtitle, xAxisItems, chartCurves } = computeFilterState(appState, lang);

  // --- Update Card 2: Performances Territoriales ---
  const territorialCard = containerEl.querySelector('#analytics-territorial-card');
  if (territorialCard) {
    const badge = isShowingLocalities
      ? `<span style="font-size:9px;background:#E8F5EE;color:#00A859;padding:2px 7px;border-radius:10px;font-weight:700;white-space:nowrap;">📍 Localités</span>`
      : `<span style="font-size:9px;background:#EFF6FF;color:#3B82F6;padding:2px 7px;border-radius:10px;font-weight:700;white-space:nowrap;">🗺️ Régions</span>`;
    territorialCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div class="card-title">Performances Territoriales</div>
          <div style="font-size:10px;color:#64748B;margin-top:2px;">${tableSubtitle}</div>
        </div>
        ${badge}
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;text-align:left;">
          <thead>
            <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;font-size:10px;color:#64748B;text-transform:uppercase;">
              <th style="padding:8px;">${isShowingLocalities ? 'Localité' : 'Région'}</th>
              <th style="padding:8px;text-align:center;">Score</th>
              <th style="padding:8px;text-align:right;">Evolution</th>
            </tr>
          </thead>
          <tbody>
            ${territorialItems.map(item => {
              const score = parseFloat(item.score);
              const scoreColor = score >= 4.0 ? '#00A859' : score >= 3.0 ? '#28C76F' : score >= 2.0 ? '#FFB800' : score >= 1.0 ? '#FF9F43' : '#DC2626';
              const isTrendUp = item.trend === '+';
              return `<tr style="border-bottom:1px solid #EDF2F7;font-size:12px;">
                <td style="padding:9px 8px;font-weight:600;color:#002B49;">${item.name}</td>
                <td style="padding:9px 8px;font-weight:800;text-align:center;color:${scoreColor};">${item.score}</td>
                <td style="padding:9px 8px;text-align:right;">
                  <span class="badge ${isTrendUp ? 'badge-success' : 'badge-danger'}">${isTrendUp ? '↗' : '↘'} ${item.trend}${item.delta}</span>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // --- Update Card 3: Performances Sectorielles ---
  const sectoralCard = containerEl.querySelector('#analytics-sectoral-card');
  if (sectoralCard) {
    const W = 300, H = 170, padL = 24, padR = 8, padT = 10, padB = 60;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const nSec = xAxisItems.length;
    const xStep = nSec > 1 ? chartW / (nSec - 1) : 0;
    const yPos = s => padT + chartH - ((s / 5) * chartH);
    const xPos = i => nSec === 1 ? padL + chartW / 2 : padL + i * xStep;

    const yGrids = [5, 4, 3, 2, 1].map(v => {
      const y = yPos(v).toFixed(1);
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E2E8F0" stroke-width="0.6"/><text x="${(padL-3).toFixed(1)}" y="${(parseFloat(y)+2.5).toFixed(1)}" font-size="6.5" fill="#94A3B8" text-anchor="end">${v}</text>`;
    }).join('');
    const xBase = `<line x1="${padL}" y1="${(padT+chartH).toFixed(1)}" x2="${W-padR}" y2="${(padT+chartH).toFixed(1)}" stroke="#CBD5E1" stroke-width="1.5"/>`;
    const xGuides = xAxisItems.map((_, i) => `<line x1="${xPos(i).toFixed(1)}" y1="${padT}" x2="${xPos(i).toFixed(1)}" y2="${(padT+chartH).toFixed(1)}" stroke="#F1F5F9" stroke-width="0.5"/>`).join('');
    const xLabels = xAxisItems.map((item, i) => {
      const x = xPos(i);
      const y = padT + chartH + 8;
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="6.5" fill="#475569" text-anchor="end" font-weight="600" transform="rotate(-45, ${x.toFixed(1)}, ${y.toFixed(1)})">${item.label}</text>`;
    }).join('');
    const curveSVG = chartCurves.map(curve => {
      const pts = curve.scores.map((s, i) => ({ x: xPos(i), y: yPos(s), score: s }));
      const d = pts.map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`)).join(' ');
      const dotsSVG = pts.map(p => {
        const valText = p.score > 0
          ? `<text x="${p.x.toFixed(1)}" y="${(p.y - 7).toFixed(1)}" font-size="7.5" font-weight="800" fill="${curve.color}" text-anchor="middle">${p.score.toFixed(1)}</text>`
          : `<text x="${p.x.toFixed(1)}" y="${(padT + chartH + 7).toFixed(1)}" font-size="6" font-weight="600" fill="#94A3B8" text-anchor="middle">0</text>`;
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${curve.color}" stroke="#FFFFFF" stroke-width="1"/>${valText}`;
      }).join('');
      return `<path d="${d}" fill="none" stroke="${curve.color}" stroke-width="2" stroke-linejoin="round"/>${dotsSVG}`;
    }).join('');
    const legendHTML = chartCurves.map(curve => {
      const evaluatedScores = curve.scores.filter(s => s > 0);
      const avg = evaluatedScores.length > 0
        ? (evaluatedScores.reduce((a, b) => a + b, 0) / evaluatedScores.length).toFixed(1)
        : '0.0';
      const scoreColor = parseFloat(avg) >= 4.0 ? '#00A859' : parseFloat(avg) >= 3.0 ? '#28C76F' : parseFloat(avg) >= 2.0 ? '#FFB800' : parseFloat(avg) >= 1.0 ? '#FF9F43' : '#DC2626';
      return `<div style="display:flex;align-items:center;gap:5px;padding:5px 8px;background:#F8FAFC;border-radius:8px;"><span style="width:10px;height:10px;border-radius:50%;background:${curve.color};flex-shrink:0;"></span><span style="font-size:10px;color:#1E293B;font-weight:600;flex:1;">${curve.name}</span><span style="font-size:10px;font-weight:800;color:${scoreColor};">${avg}</span></div>`;
    }).join('');

    // Subtitle based on current selection
    const selLocalities = appState.selectedLocalities || [];
    const selRegions = appState.selectedRegions || [];
    const selMacro = appState.selectedMacro || 'ALL';
    const selPillar = appState.selectedPillar || 'ALL';
    const pillarNames = { Economic: 'Économique', Social: 'Sociale', Environmental: 'Environnementale' };

    let sectoralSubtitle = 'Moyenne nationale';
    if (selLocalities.length === 1) sectoralSubtitle = `Localité : ${selLocalities[0]}`;
    else if (selLocalities.length > 1) sectoralSubtitle = `${selLocalities.length} localités comparées`;
    else if (selRegions.length === 1) sectoralSubtitle = `1 région sélectionnée`;
    else if (selRegions.length > 1) sectoralSubtitle = `${selRegions.length} régions comparées`;

    if (selPillar !== 'ALL') {
      sectoralSubtitle += ` · Perf. ${pillarNames[selPillar] || selPillar}`;
    }

    const badgeLabel = selMacro !== 'ALL' ? `${xAxisItems.length} Méso-secteurs` : `7 Secteurs`;

    sectoralCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div class="card-title">Performances Sectorielles</div>
          <div style="font-size:10px;color:#64748B;margin-top:2px;">${sectoralSubtitle}</div>
        </div>
        <span class="badge badge-info">${badgeLabel}</span>
      </div>
      <div style="width:100%;overflow:hidden;">
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;">${yGrids}${xBase}${xGuides}${xLabels}${curveSVG}</svg>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px;">${legendHTML}</div>`;
  }
}

export function attachAnalyticsEvents(containerEl, appState, onStateChangeCallback) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;

  const countrySelect = containerEl.querySelector('#filter-country-select');
  const regionSelect = containerEl.querySelector('#filter-region-select');
  const localitySelect = containerEl.querySelector('#filter-locality-select');
  const macroSelect = containerEl.querySelector('#filter-macro-select');
  const mesoSelect = containerEl.querySelector('#filter-meso-select');
  const pillarSelect = containerEl.querySelector('#filter-pillar-select');
  const indicatorSelect = containerEl.querySelector('#filter-indicator-select');
  const subIndicatorSelect = containerEl.querySelector('#filter-subindicator-select');

  // Helper: populate region multi-select for a given country code
  function updateRegionDropdown(code) {
    const countryObj = locationData.find(c => c.code === code);
    const regions = (countryObj && countryObj.regions) || [];
    // Rebuild multi-select options (no "ALL" option — empty selection = national average)
    regionSelect.innerHTML = regions.map(r =>
      `<option value="${r.id}">${r.names[lang] || r.names.fr}</option>`
    ).join('');
    // Reset locality to all localities of the new country
    const allLocs = regions.flatMap(r => r.localities || []);
    localitySelect.innerHTML = `<option value="ALL">Localité: Toutes</option>` +
      allLocs.map(loc => `<option value="${loc}">${loc}</option>`).join('');
    // Reset region selections in state
    appState.selectedRegions = [];
    appState.selectedLocalities = [];
  }

  // ----------- Evaluations feed: reactive multi-criteria refresh -----------
  function refreshEvaluationsFeed() {
    const feed = document.getElementById('evaluations-feed');
    if (!feed) return;
    const filtered = getFilteredEvaluations(appState);
    if (filtered.length === 0) {
      feed.innerHTML = `<div style="text-align:center; color:#94A3B8; font-size:12px; padding:24px 12px; font-weight:500;">ℹ️ Aucune évaluation trouvée pour les critères de filtres sélectionnés.</div>`;
    } else {
      feed.innerHTML = filtered.slice(0, 10).map(buildEvalItemHTML).join('');
      attachLightboxToImages(feed);
    }
  }

  // Country Change -> Immediately update region/locality dropdowns, then re-render map & feed
  if (countrySelect) {
    countrySelect.addEventListener('change', () => {
      const code = countrySelect.value;
      appState.selectedCountry = code;
      updateRegionDropdown(code);
      if (onStateChangeCallback) onStateChangeCallback();
      else refreshEvaluationsFeed();
    });
  }

  // Region Multi-Select Change -> Updates Localités dropdown, refreshes cards & feed
  if (regionSelect) {
    regionSelect.addEventListener('change', () => {
      const code = countrySelect ? countrySelect.value : 'SN';
      const countryObj = locationData.find(c => c.code === code);

      const selectedOpts = Array.from(regionSelect.selectedOptions).map(o => o.value);
      appState.selectedRegions = selectedOpts;
      appState.selectedLocalities = [];

      if (countryObj && countryObj.regions) {
        let locs = [];
        if (selectedOpts.length === 0) {
          locs = countryObj.regions.flatMap(r => r.localities || []);
        } else if (selectedOpts.length === 1) {
          const regObj = countryObj.regions.find(r => r.id === selectedOpts[0]);
          locs = (regObj && regObj.localities) || [];
        } else {
          locs = selectedOpts.flatMap(rId => {
            const rObj = countryObj.regions.find(r => r.id === rId);
            return (rObj && rObj.localities) || [];
          });
        }
        if (localitySelect) localitySelect.innerHTML = locs.map(loc => `<option value="${loc}">${loc}</option>`).join('');
      }

      refreshFilteredCards(containerEl, appState, lang);
      refreshEvaluationsFeed();
    });
  }

  // Locality Multi-Select Change -> Updates appState.selectedLocalities and refreshes cards & feed
  if (localitySelect) {
    localitySelect.addEventListener('change', () => {
      const selectedLocs = Array.from(localitySelect.selectedOptions).map(o => o.value);
      appState.selectedLocalities = selectedLocs;
      refreshFilteredCards(containerEl, appState, lang);
      refreshEvaluationsFeed();
    });
  }

  // Macro-Sector Change -> Updates Méso-Secteur dropdown + refreshes performance cards & feed
  if (macroSelect) {
    macroSelect.addEventListener('change', () => {
      const macroVal = macroSelect.value;
      appState.selectedMacro = macroVal;
      appState.selectedMeso = 'ALL';
      if (mesoSelect) {
        if (macroVal !== 'ALL') {
          const mesos = sectorData.mesoSectors[macroVal] || [];
          mesoSelect.innerHTML = `<option value="ALL">Méso-Secteur: Tous</option>` + mesos.map(m =>
            `<option value="${m.id}">${m.names[lang] || m.names.fr || m.id}</option>`
          ).join('');
        } else {
          mesoSelect.innerHTML = `<option value="ALL">Méso-Secteur: Tous</option>`;
        }
      }
      refreshFilteredCards(containerEl, appState, lang);
      refreshEvaluationsFeed();
    });
  }

  // Meso-Sector (Sous-secteur) Change -> Refreshes cards & evaluations feed
  if (mesoSelect) {
    mesoSelect.addEventListener('change', () => {
      appState.selectedMeso = mesoSelect.value;
      refreshFilteredCards(containerEl, appState, lang);
      refreshEvaluationsFeed();
    });
  }

  // Pillar Change -> Updates Indicateur dropdown AND refreshes performance cards & feed
  if (pillarSelect) {
    pillarSelect.addEventListener('change', () => {
      const pillarVal = pillarSelect.value;
      appState.selectedPillar = pillarVal;
      appState.selectedCategory = 'ALL';
      appState.selectedType = 'ALL';
      const categories = sectorData.indicatorCategories[pillarVal] || [];
      if (indicatorSelect) {
        indicatorSelect.innerHTML = `<option value="ALL">Indicateur: Tous</option>` + categories.map(cat => `
          <option value="${cat}">${t.indicators[cat] || cat}</option>
        `).join('');
      }
      if (subIndicatorSelect) subIndicatorSelect.innerHTML = `<option value="ALL">Sous-Indicateur: Tous</option>`;
      refreshFilteredCards(containerEl, appState, lang);
      refreshEvaluationsFeed();
    });
  }

  // Indicator Change -> Updates Sous-Indicateur dropdown & refreshes feed
  if (indicatorSelect) {
    indicatorSelect.addEventListener('change', () => {
      const catVal = indicatorSelect.value;
      appState.selectedCategory = catVal;
      appState.selectedType = 'ALL';
      const types = sectorData.indicatorTypes[catVal] || [];
      if (subIndicatorSelect) {
        subIndicatorSelect.innerHTML = `<option value="ALL">Sous-Indicateur: Tous</option>` + types.map(tp => `
          <option value="${tp}">${t.subIndicators[tp] || tp}</option>
        `).join('');
      }
      refreshEvaluationsFeed();
    });
  }

  // Sub-Indicator Change -> Refreshes feed
  if (subIndicatorSelect) {
    subIndicatorSelect.addEventListener('change', () => {
      appState.selectedType = subIndicatorSelect.value;
      refreshEvaluationsFeed();
    });
  }

  // Reset Filters Button
  const resetBtn = containerEl.querySelector('#btn-reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      appState.selectedCountry = 'TN';
      appState.selectedMacro = 'ALL';
      appState.selectedMeso = 'ALL';
      appState.selectedPillar = 'ALL';
      appState.selectedCategory = 'ALL';
      appState.selectedType = 'ALL';
      appState.selectedActor = 'ALL';
      appState.selectedActors = [];
      appState.selectedRegions = [];
      appState.selectedLocalities = [];
      rebuildActorPills();
      renderRadarCharts();
      if (onStateChangeCallback) onStateChangeCallback();
      else refreshEvaluationsFeed();
    });
  }

  // Attach SVG Map Events
  attachMapEvents(containerEl, (regionId, regionName) => {
    console.log(`Territoire sélectionné: ${regionName} (${regionId})`);
  });

  function renderRadarCharts() {
    const selectedActors = appState.selectedActors || [];
    const subtitle = document.getElementById('radar-actor-subtitle');
    const strokeLegend = document.getElementById('radar-stroke-legend');

    // Update subtitle
    if (subtitle) {
      subtitle.textContent = selectedActors.length > 0
        ? selectedActors.join(' vs ')
        : 'Tous les acteurs';
    }

    // Show stroke legend only when multiple actors
    if (strokeLegend) {
      strokeLegend.style.display = selectedActors.length > 1 ? 'flex' : 'none';
    }

    // Build datasets
    let econDatasets, socialDatasets, envDatasets;

    if (selectedActors.length === 0) {
      // Global view — all actors
      const scores = getRadarScoresFromEvals('ALL', appState);
      econDatasets   = [{ label: 'Tous', values: scores.econ }];
      socialDatasets = [{ label: 'Tous', values: scores.social }];
      envDatasets    = [{ label: 'Tous', values: scores.env }];
    } else {
      econDatasets   = [];
      socialDatasets = [];
      envDatasets    = [];
      selectedActors.forEach(actorName => {
        const scores = getRadarScoresFromEvals(actorName, appState);
        econDatasets.push(  { label: actorName, values: scores.econ });
        socialDatasets.push({ label: actorName, values: scores.social });
        envDatasets.push(   { label: actorName, values: scores.env });
      });
    }

    // Destroy existing charts
    ['radar-canvas-econ', 'radar-canvas-social', 'radar-canvas-env'].forEach(id => {
      const canvasEl = document.getElementById(id);
      if (canvasEl && window.Chart && window.Chart.getChart) {
        try { const e = window.Chart.getChart(canvasEl); if (e) e.destroy(); } catch (_) {}
      }
    });

    try {
      initRadarChartMulti('radar-canvas-econ',   'Économique',      ['Investissement', 'Emplois', 'Valeur Ajoutée'],          econDatasets,   '#2563EB');
      initRadarChartMulti('radar-canvas-social', 'Social',          ['Infrastructures', 'Personnel', 'Programmes'],            socialDatasets, '#EA5455');
      initRadarChartMulti('radar-canvas-env',    'Environnemental', ['Émission de pollution', 'Ressources', 'Résilience'],     envDatasets,    '#00A859');
    } catch (e) {
      console.warn('Radar init warning:', e);
    }
  }

  // Initialize radar charts and actor pills on page load
  rebuildActorPills();
  setTimeout(() => renderRadarCharts(), 50);
  setTimeout(() => renderRadarCharts(), 300);

  // Helper: rebuild actor pills container DOM
  function rebuildActorPills() {
    const container = containerEl.querySelector('#actor-pills-container');
    const addSelect = containerEl.querySelector('#filter-actor-add');
    if (!container) return;

    const selectedActors = appState.selectedActors || [];
    const styleLabels = ['━━', '╌╌', '···'];
    const styles = ['solid', 'dashed', 'dotted'];

    container.innerHTML = selectedActors.map((name, idx) => `
      <span class="actor-pill" data-actor="${name}"
        style="display:inline-flex;align-items:center;gap:4px;background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;font-size:10px;font-weight:700;padding:3px 8px;border-radius:12px;">
        <span style="font-size:9px;opacity:0.7;" title="${styles[idx]}">${styleLabels[idx]}</span>
        ${name}
        <button class="actor-pill-remove" data-actor="${name}"
          style="background:none;border:none;color:#1E40AF;cursor:pointer;font-size:11px;padding:0;line-height:1;margin-left:2px;">×</button>
      </span>
    `).join('');

    // Rebind remove buttons
    container.querySelectorAll('.actor-pill-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const actorName = btn.dataset.actor;
        appState.selectedActors = (appState.selectedActors || []).filter(a => a !== actorName);
        // Re-enable option in dropdown
        if (addSelect) {
          const opt = addSelect.querySelector(`option[value="${actorName}"]`);
          if (opt) opt.disabled = false;
        }
        rebuildActorPills();
        renderRadarCharts();
        refreshEvaluationsFeed();
      });
    });

    // Update add select: reset to placeholder, disable limit if 3 reached
    if (addSelect) {
      addSelect.value = '';
      addSelect.disabled = selectedActors.length >= 3;
      addSelect.options[0].textContent = selectedActors.length >= 3
        ? '✓ Maximum 3 acteurs atteint'
        : '➕ Ajouter un acteur (max 3)';
    }
  }

  // Actor add dropdown
  const actorAddSelect = containerEl.querySelector('#filter-actor-add');
  if (actorAddSelect) {
    actorAddSelect.addEventListener('change', () => {
      const actorName = actorAddSelect.value;
      if (!actorName) return;
      const selectedActors = appState.selectedActors || [];
      if (selectedActors.length >= 3 || selectedActors.includes(actorName)) return;
      appState.selectedActors = [...selectedActors, actorName];
      // Disable option in dropdown
      const opt = actorAddSelect.querySelector(`option[value="${actorName}"]`);
      if (opt) opt.disabled = true;
      rebuildActorPills();
      renderRadarCharts();
      refreshEvaluationsFeed();
    });
  }

  // Attach Lightbox on initial load
  attachLightboxToImages(containerEl);
}
