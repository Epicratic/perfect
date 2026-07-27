// General Dashboard Module (Tableau Général)

import { renderGaugeMeter } from '../components/gauge.js';
import { locationData } from '../data/locations.js';
import { initialAppData } from '../data/mockData.js';

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

  const currentCountryCode = appState.selectedCountry || "SN";
  const selectedCountryObj = locationData.find(c => c.code === currentCountryCode) || locationData[0];

  // Country Dropdown Options HTML
  const countryOptionsHTML = locationData.map(c => `
    <option value="${c.code}" ${c.code === currentCountryCode ? 'selected' : ''}>${c.flag} ${c.names[lang] || c.names.fr}</option>
  `).join('');

  // 1. CARD 1: Indice National Gauge Meter
  const gaugeHTML = renderGaugeMeter(
    data.overallScore, 
    data.maxScore, 
    t.scoreStatusGood, 
    t.indiceNationalTitle, 
    data.ratingsCount || 1248, 
    t.basedOnRatings
  );

  // 2. CARD 2: Indice Sociétal (Vertical Bar Chart Histogram for 3 Pillars)
  const pillarsData = [
    { label: t.pillarEconomic, score: data.pillarScores.Economic },
    { label: t.pillarSocial, score: data.pillarScores.Social },
    { label: t.pillarEnvironmental, score: data.pillarScores.Environmental }
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

  // 3. CARD 3: Indice Sectoriel (Vertical Bar Chart Histogram for 7 Macro-Sectors in FULL)
  const sectorsData = [
    { id: "Governance", l1: "Gouvernance", l2: "", score: data.sectorScores.Governance || 4.2 },
    { id: "SecurityDefense", l1: "Sécurité &", l2: "Défense", score: data.sectorScores.SecurityDefense || 4.6 },
    { id: "HealthHygiene", l1: "Santé &", l2: "Hygiène", score: data.sectorScores.HealthHygiene || 3.4 },
    { id: "InstructionCulture", l1: "Instruction &", l2: "Culture", score: data.sectorScores.InstructionCulture || 3.8 },
    { id: "FoodFinance", l1: "Alimentation &", l2: "Finance", score: data.sectorScores.FoodFinance || 4.1 },
    { id: "HousingTourism", l1: "Logement &", l2: "Tourisme", score: data.sectorScores.HousingTourism || 4.5 },
    { id: "TransportTelco", l1: "Transport &", l2: "Télécoms", score: data.sectorScores.TransportTelco || 3.7 }
  ];

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
  const regionsData = selectedCountryObj.regions.map(r => ({
    name: r.names[lang] || r.names.fr,
    score: r.performance || 3.8
  }));

  const regionBarsHTML = regionsData.map(r => {
    const widthPercent = (r.score / 5.0) * 100;
    const color = getScoreColor(r.score);
    return `
      <div class="h-bar-item">
        <div class="h-bar-info">
          <span>${r.name}</span>
          <span style="color: ${color}; font-weight: 800;">${r.score.toFixed(1)} / 5.0</span>
        </div>
        <div class="h-bar-track">
          <div class="h-bar-fill" style="width: ${widthPercent}%; background: ${color};"></div>
        </div>
      </div>
    `;
  }).join('');

  // 5. CARD 5: Top 10 Acteurs Horizontal Carousel
  const top10Actors = (data.topActors && data.topActors.length > 0) ? data.topActors : initialAppData.topActors;
  const top10CarouselHTML = top10Actors.map(actor => `
    <div class="actor-carousel-card action-actor-item" data-actor-id="${actor.id}">
      <span class="actor-rank-badge">#${actor.rank}</span>
      <img src="${actor.avatarUrl}" alt="${actor.name}" class="actor-carousel-avatar" />
      <div class="actor-carousel-name">${actor.name}</div>
      <div class="actor-carousel-sector">${t.sectors[actor.sector] || actor.sector}</div>
      <div style="background: #E6F7EF; color: ${getScoreColor(actor.score)}; font-weight: 800; font-size: 11px; padding: 4px 8px; border-radius: 8px;">★ ${actor.score.toFixed(1)}</div>
    </div>
  `).join('');

  // 6. CARD 6: Dernières Évaluations (50 Nouveaux)
  const recentEvals = (data.recentEvaluations && data.recentEvaluations.length > 0) ? data.recentEvaluations : initialAppData.recentEvaluations;
  const recentRatingsHTML = recentEvals.map(rev => `
    <div class="recent-rating-item action-rating-item" data-author-name="${rev.authorName}">
      <div class="rating-user-avatar-circle" style="background: ${rev.authorAvatarBg}; color: ${rev.authorAvatarColor};">
        ${rev.authorInitials}
      </div>
      <div style="flex: 1;">
        <div style="font-size: 13px; font-weight: 700; color: #1E293B;">
          <span>${rev.authorName}</span>
          <span style="color: #94A3B8; font-weight: 400;"> • </span>
          <span style="color: #00A859; font-weight: 600;">${rev.targetEntity}</span>
        </div>
        <div class="rating-stars-gold">${renderStarRating(rev.rating)}</div>
        <div class="rating-comment-quote">"${rev.comment}"</div>
        <div class="rating-meta-footer">
          <span>📍 ${rev.location}</span>
          <span>🕒 ${rev.timeAgo}</span>
        </div>
      </div>
    </div>
  `).join('');

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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div class="card-title" style="text-align: left;">${t.indiceTerritorialTitle}</div>
          <div class="badge badge-info">${selectedCountryObj.flag} ${selectedCountryObj.names[lang] || selectedCountryObj.names.fr}</div>
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

export function attachDashboardEvents(containerEl, onNavigate, onCountryChange) {
  // Country Dropdown Change Listener
  const countrySelect = containerEl.querySelector('#dashboard-country-select');
  if (countrySelect) {
    countrySelect.addEventListener('change', (e) => {
      if (onCountryChange) onCountryChange(e.target.value);
    });
  }

  // Top 10 Actor Carousel Cards Click Listener -> Navigates to User Profile
  const actorCards = containerEl.querySelectorAll('.action-actor-item');
  actorCards.forEach(card => {
    card.addEventListener('click', () => {
      onNavigate('profiles');
    });
  });

  // Recent Ratings Items Click Listener -> Navigates to Contributor Profile
  const ratingItems = containerEl.querySelectorAll('.action-rating-item');
  ratingItems.forEach(item => {
    item.addEventListener('click', () => {
      onNavigate('profiles');
    });
  });
}
