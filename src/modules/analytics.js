// Detailed Analytics & Exploration Module (Tableau Détaillé)

import { renderSVGMap, attachMapEvents } from '../components/svgMap.js';
import { renderRadarChartHTML, initRadarChart } from '../components/radar.js';
import { locationData } from '../data/locations.js';
import { sectorData } from '../data/sectors.js';
import { initialAppData } from '../data/mockData.js';
import { translations } from '../data/translations.js';

export function renderAnalyticsView(appState, translations) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;

  // Selected Country (Default 'SN')
  const selectedCountryCode = appState.selectedCountry || 'SN';
  const selectedCountryObj = locationData.find(c => c.code === selectedCountryCode) || locationData[0];
  const activeRegions = selectedCountryObj.regions || [];

  // Selected Region filter (supports multi-select)
  const selectedRegions = appState.selectedRegions || [];

  // Selected Localities (array, supports multi-select)
  const selectedLocalities = appState.selectedLocalities || [];

  // Find parent regions of all selected localities
  const allLocalitiesFlat = activeRegions.flatMap(r => r.localities || []);
  const localityParentRegions = selectedLocalities.length > 0
    ? [...new Set(selectedLocalities.map(loc =>
        activeRegions.find(r => (r.localities || []).includes(loc))
      ).filter(Boolean))]
    : [];

  // Resolve which region to use for the territorial table:
  // - If localities selected: use their parent region (first one if multiple)
  // - If single region selected: use that region
  const singleParentRegion = localityParentRegions.length === 1 ? localityParentRegions[0] : null;
  const singleSelectedRegion = selectedRegions.length === 1
    ? activeRegions.find(r => r.id === selectedRegions[0])
    : null;
  const resolvedRegionObj = singleParentRegion || singleSelectedRegion || null;

  // Determine territorial table items
  const isShowingLocalities = !!resolvedRegionObj;
  const territorialItems = isShowingLocalities
    ? (resolvedRegionObj.localities || []).map((loc, i) => ({
        name: loc,
        score: (3.5 + ((resolvedRegionObj.performance || 3.5) - 3.5) * 0.8 + (Math.sin(i * 1.7) * 0.4)).toFixed(1),
        trend: Math.sin(i * 2.3) > 0 ? '+' : '-',
        delta: (Math.abs(Math.sin(i * 2.3)) * 0.4 + 0.05).toFixed(1)
      }))
    : activeRegions.map(r => ({
        name: r.names[lang] || r.names.fr,
        score: (r.performance || 3.5).toFixed(1),
        trend: (r.performance || 3.5) >= 3.8 ? '+' : '-',
        delta: ((Math.abs(r.performance - 3.5) * 0.3) + 0.05).toFixed(1)
      }));

  const tableSubtitle = isShowingLocalities
    ? `Localités de ${resolvedRegionObj.names[lang] || resolvedRegionObj.names.fr}`
    : `Toutes les régions — ${selectedCountryObj.names[lang] || selectedCountryObj.names.fr}`;

  // Sectoral chart curves data
  // Priority: localities > regions > national average
  const macroSectorsDef = [
    { id: 'Governance',          l1: 'Gouvernance',     l2: '' },
    { id: 'SecurityDefense',     l1: 'Sécurité &',      l2: 'Défense' },
    { id: 'HealthHygiene',       l1: 'Santé &',         l2: 'Hygiène' },
    { id: 'InstructionCulture',  l1: 'Instruction &',   l2: 'Culture' },
    { id: 'FoodFinance',         l1: 'Alimentation &',  l2: 'Finance' },
    { id: 'HousingTourism',      l1: 'Logement &',      l2: 'Tourisme' },
    { id: 'TransportTelco',      l1: 'Transport &',     l2: 'Télécoms' }
  ];

  function seededScore(seed) {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return 2.0 + (x - Math.floor(x)) * 3.0;
  }

  const chartPalette = [
    '#00A859','#002B49','#FF9F43','#3B82F6','#EA5455',
    '#8B5CF6','#06B6D4','#F59E0B','#10B981','#EF4444',
    '#6366F1','#84CC16'
  ];

  // Build chart curves
  let chartCurves = [];
  if (selectedLocalities.length > 0) {
    // One curve per selected locality
    chartCurves = selectedLocalities.map((loc, tIdx) => {
      const locIdx = allLocalitiesFlat.indexOf(loc);
      return {
        name: loc,
        color: chartPalette[tIdx % chartPalette.length],
        scores: macroSectorsDef.map((_, sIdx) => seededScore(locIdx * 100 + sIdx))
      };
    });
  } else if (selectedRegions.length > 0) {
    // One curve per selected region
    chartCurves = selectedRegions.map((rId, tIdx) => {
      const rObj = activeRegions.find(r => r.id === rId);
      const rName = rObj ? (rObj.names[lang] || rObj.names.fr) : rId;
      const rIdx = activeRegions.findIndex(r => r.id === rId);
      return {
        name: rName,
        color: chartPalette[tIdx % chartPalette.length],
        scores: macroSectorsDef.map((_, sIdx) => seededScore(rIdx * 100 + sIdx))
      };
    });
  } else {
    // National average
    const countryName = selectedCountryObj.names[lang] || selectedCountryObj.names.fr;
    chartCurves = [{
      name: `Moy. nationale — ${countryName}`,
      color: chartPalette[0],
      scores: macroSectorsDef.map((_, sIdx) => {
        const total = activeRegions.reduce((sum, _, rIdx) => sum + seededScore(rIdx * 100 + sIdx), 0);
        return activeRegions.length > 0 ? total / activeRegions.length : 3.5;
      })
    }];
  }

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
    // No region selected: show all localities of the country
    return allLocalitiesFlat;
  })();

  // Selected Macro Sector
  const selectedMacro = appState.selectedMacro || 'Governance';
  const activeMesoSectors = sectorData.mesoSectors[selectedMacro] || [];

  // Selected Pillar
  const selectedPillar = appState.selectedPillar || 'Social';
  const activeCategories = sectorData.indicatorCategories[selectedPillar] || [];

  // Selected Indicator Category
  const selectedCategory = appState.selectedCategory || activeCategories[0] || 'Facility';
  const activeSubTypes = sectorData.indicatorTypes[selectedCategory] || [];

  // Render SVG Map for active country
  const mapHTML = renderSVGMap(selectedCountryCode);

  // Triple Radar Charts HTML
  const econRadarHTML = renderRadarChartHTML('radar-canvas-econ', 'ÉCONOMIQUE');
  const socialRadarHTML = renderRadarChartHTML('radar-canvas-social', 'SOCIAL');
  const envRadarHTML = renderRadarChartHTML('radar-canvas-env', 'ENVIRONNEMENTAL');

  // Recent Ratings Items HTML (Card 6)
  const recentRatingsHTML = (appState.data.recentEvaluations || initialAppData.recentEvaluations).slice(0, 3).map(rev => `
    <div class="recent-rating-item">
      <div class="rating-user-avatar-circle" style="background: ${rev.bgColor}; color: ${rev.color};">
        ${rev.initials}
      </div>
      <div style="flex: 1;">
        <div style="font-size: 12px; font-weight: 700; color: #002B49;">
          ${rev.author} <span style="font-weight: 400; color: #64748B;">a noté</span> <span style="color: #00A859; font-weight: 800;">${rev.targetEntity}</span>
        </div>
        <div class="rating-stars-gold">
          ${'★'.repeat(Math.round(rev.rating))}${'☆'.repeat(5 - Math.round(rev.rating))}
          <span style="font-size: 11px; font-weight: 800; color: #002B49; margin-left: 4px;">${rev.rating.toFixed(1)}</span>
        </div>
        <div class="rating-comment-quote">"${rev.comment}"</div>
        <div class="rating-meta-footer">
          <span>📍 ${rev.location}</span>
          <span>⏱️ ${rev.timeAgo}</span>
        </div>
      </div>
    </div>
  `).join('');

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

          <!-- 10. Acteurs Pill -->
          <div>
            <select id="filter-actor-select" class="slicer-pill-select">
              <option value="ALL">Acteurs: Tous</option>
              ${(appState.data.topActors || initialAppData.topActors).map(a => `
                <option value="${a.name}">${a.name}</option>
              `).join('')}
            </select>
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
                const scoreColor = score >= 4.0 ? '#00A859' : score >= 3.5 ? '#FF9F43' : '#EA5455';
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
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">${isShowingLocalities ? `Localités de ${selectedRegionObj.names[lang] || selectedRegionObj.names.fr}` : `Toutes les régions — ${selectedCountryObj.names[lang] || selectedCountryObj.names.fr}`}</div>
          </div>
          <span style="font-size: 9px; background: #F1F5F9; color: #475569; padding: 2px 7px; border-radius: 10px; font-weight: 700;">${territorialItems.length} territoire${territorialItems.length > 1 ? 's' : ''}</span>
        </div>

        ${(() => {
          const W = 300, H = 170;
          const padL = 24, padR = 8, padT = 10, padB = 60; // padB large for rotated labels
          const chartW = W - padL - padR;
          const chartH = H - padT - padB;
          const nSec = macroSectorsDef.length;
          const xStep = chartW / (nSec - 1);

          function yPos(score) { return padT + chartH - ((score / 5) * chartH); }
          function xPos(i) { return padL + i * xStep; }

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
          const xGuides = macroSectorsDef.map((_, i) =>
            `<line x1="${xPos(i).toFixed(1)}" y1="${padT}" x2="${xPos(i).toFixed(1)}" y2="${(padT + chartH).toFixed(1)}" stroke="#F1F5F9" stroke-width="0.5"/>`
          ).join('');

          // X axis labels: single line, rotated -45°
          const xLabels = macroSectorsDef.map((sec, i) => {
            const x = xPos(i);
            const y = padT + chartH + 8;
            const label = sec.l1 + (sec.l2 ? ' ' + sec.l2 : '');
            return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="6.5" fill="#475569" text-anchor="end" font-weight="600" transform="rotate(-45, ${x.toFixed(1)}, ${y.toFixed(1)})">${label}</text>`;
          }).join('');

          // Curves
          const curveSVG = chartCurves.map(curve => {
            const pts = curve.scores.map((s, i) => ({ x: xPos(i), y: yPos(s) }));
            const d = pts.map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`)).join(' ');
            const dotsSVG = pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${curve.color}"/>`).join('');
            return `<path d="${d}" fill="none" stroke="${curve.color}" stroke-width="2" stroke-linejoin="round"/>${dotsSVG}`;
          }).join('');

          // Legend (like dashboard: colored circle + full name + score range)
          const legendHTML = chartCurves.map(curve => {
            const avgScore = (curve.scores.reduce((a, b) => a + b, 0) / curve.scores.length).toFixed(1);
            const scoreColor = parseFloat(avgScore) >= 4.0 ? '#00A859' : parseFloat(avgScore) >= 3.0 ? '#FF9F43' : '#EA5455';
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
        <div class="card-title" style="margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
          <span style="color: #00A859;">✳️</span> Analyse Radar
        </div>
        <p style="font-size: 10.5px; color: #64748B; margin-bottom: 14px;">Évaluation par axe d'impact sociétal</p>

        <div class="radar-charts-grid">
          ${econRadarHTML}
          ${socialRadarHTML}
          ${envRadarHTML}
        </div>

        <div style="display: flex; justify-content: center; gap: 16px; margin-top: 10px; font-size: 10px; font-weight: 600;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; background: #00A859; border-radius: 50%;"></span>
            <span>Score</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="width: 12px; height: 2px; border-top: 1px dashed #64748B;"></span>
            <span>Moyenne</span>
          </div>
        </div>
      </div>

      <!-- CARD 6: Dernières Évaluations Feed -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div class="card-title">Dernières Évaluations</div>
          <button class="btn btn-outline" style="width: auto; padding: 2px 8px; font-size: 10px;">Filtres</button>
        </div>

        <div>
          ${recentRatingsHTML}
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: compute all filter-dependent card data from appState
// ─────────────────────────────────────────────────────────────────────────────
function computeFilterState(appState, lang) {
  const selectedCountryCode = appState.selectedCountry || 'SN';
  const selectedCountryObj = locationData.find(c => c.code === selectedCountryCode) || locationData[0];
  const activeRegions = selectedCountryObj.regions || [];
  const allLocalitiesFlat = activeRegions.flatMap(r => r.localities || []);

  const selectedRegions = appState.selectedRegions || [];
  const selectedLocalities = appState.selectedLocalities || [];

  // Find parent regions of selected localities (for territorial table)
  const localityParentRegions = selectedLocalities.length > 0
    ? [...new Set(selectedLocalities.map(loc =>
        activeRegions.find(r => (r.localities || []).includes(loc))
      ).filter(Boolean))]
    : [];

  // Resolve region for territorial table
  const singleParentRegion = localityParentRegions.length === 1 ? localityParentRegions[0] : null;
  const singleSelectedRegion = selectedRegions.length === 1
    ? activeRegions.find(r => r.id === selectedRegions[0])
    : null;
  const resolvedRegionObj = singleParentRegion || singleSelectedRegion || null;

  const isShowingLocalities = !!resolvedRegionObj;
  const territorialItems = isShowingLocalities
    ? (resolvedRegionObj.localities || []).map((loc, i) => ({
        name: loc,
        score: (3.5 + ((resolvedRegionObj.performance || 3.5) - 3.5) * 0.8 + (Math.sin(i * 1.7) * 0.4)).toFixed(1),
        trend: Math.sin(i * 2.3) > 0 ? '+' : '-',
        delta: (Math.abs(Math.sin(i * 2.3)) * 0.4 + 0.05).toFixed(1)
      }))
    : activeRegions.map(r => ({
        name: r.names[lang] || r.names.fr,
        score: (r.performance || 3.5).toFixed(1),
        trend: (r.performance || 3.5) >= 3.8 ? '+' : '-',
        delta: ((Math.abs(r.performance - 3.5) * 0.3) + 0.05).toFixed(1)
      }));

  const tableSubtitle = isShowingLocalities
    ? `Localités de ${resolvedRegionObj.names[lang] || resolvedRegionObj.names.fr}`
    : `Toutes les régions — ${selectedCountryObj.names[lang] || selectedCountryObj.names.fr}`;

  // Sectoral chart curves (priority: localities > regions > national)
  const macroSectorsDef = [
    { id: 'Governance',          l1: 'Gouvernance',     l2: '' },
    { id: 'SecurityDefense',     l1: 'Sécurité &',      l2: 'Défense' },
    { id: 'HealthHygiene',       l1: 'Santé &',         l2: 'Hygiène' },
    { id: 'InstructionCulture',  l1: 'Instruction &',   l2: 'Culture' },
    { id: 'FoodFinance',         l1: 'Alimentation &',  l2: 'Finance' },
    { id: 'HousingTourism',      l1: 'Logement &',      l2: 'Tourisme' },
    { id: 'TransportTelco',      l1: 'Transport &',     l2: 'Télécoms' }
  ];

  function seededScore(seed) {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return 2.0 + (x - Math.floor(x)) * 3.0;
  }

  const chartPalette = ['#00A859','#002B49','#FF9F43','#3B82F6','#EA5455','#8B5CF6','#06B6D4','#F59E0B','#10B981','#EF4444','#6366F1','#84CC16'];

  let chartCurves = [];
  if (selectedLocalities.length > 0) {
    // One curve per selected locality
    chartCurves = selectedLocalities.map((loc, tIdx) => {
      const locIdx = allLocalitiesFlat.indexOf(loc);
      return { name: loc, color: chartPalette[tIdx % chartPalette.length], scores: macroSectorsDef.map((_, sIdx) => seededScore(locIdx * 100 + sIdx)) };
    });
  } else if (selectedRegions.length > 0) {
    // One curve per selected region
    chartCurves = selectedRegions.map((rId, tIdx) => {
      const rObj = activeRegions.find(r => r.id === rId);
      const rName = rObj ? (rObj.names[lang] || rObj.names.fr) : rId;
      const rIdx = activeRegions.findIndex(r => r.id === rId);
      return { name: rName, color: chartPalette[tIdx % chartPalette.length], scores: macroSectorsDef.map((_, sIdx) => seededScore(rIdx * 100 + sIdx)) };
    });
  } else {
    const countryName = selectedCountryObj.names[lang] || selectedCountryObj.names.fr;
    chartCurves = [{ name: `Moy. nationale — ${countryName}`, color: chartPalette[0], scores: macroSectorsDef.map((_, sIdx) => { const total = activeRegions.reduce((sum, _, rIdx) => sum + seededScore(rIdx * 100 + sIdx), 0); return activeRegions.length > 0 ? total / activeRegions.length : 3.5; }) }];
  }

  return { isShowingLocalities, territorialItems, tableSubtitle, macroSectorsDef, chartCurves };
}

// ─────────────────────────────────────────────────────────────────────────────
// Partial DOM update: refreshes only the two data-driven cards + locality list
// ─────────────────────────────────────────────────────────────────────────────
function refreshFilteredCards(containerEl, appState, lang) {
  const { isShowingLocalities, territorialItems, tableSubtitle, macroSectorsDef, chartCurves } = computeFilterState(appState, lang);
  const selectedLocality = appState.selectedLocality || 'ALL';

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
              const scoreColor = score >= 4.0 ? '#00A859' : score >= 3.5 ? '#FF9F43' : '#EA5455';
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
    const nSec = macroSectorsDef.length;
    const xStep = chartW / (nSec - 1);
    const yPos = s => padT + chartH - ((s / 5) * chartH);
    const xPos = i => padL + i * xStep;

    const yGrids = [5, 4, 3, 2, 1].map(v => {
      const y = yPos(v).toFixed(1);
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E2E8F0" stroke-width="0.6"/><text x="${(padL-3).toFixed(1)}" y="${(parseFloat(y)+2.5).toFixed(1)}" font-size="6.5" fill="#94A3B8" text-anchor="end">${v}</text>`;
    }).join('');
    const xBase = `<line x1="${padL}" y1="${(padT+chartH).toFixed(1)}" x2="${W-padR}" y2="${(padT+chartH).toFixed(1)}" stroke="#CBD5E1" stroke-width="1.5"/>`;
    const xGuides = macroSectorsDef.map((_, i) => `<line x1="${xPos(i).toFixed(1)}" y1="${padT}" x2="${xPos(i).toFixed(1)}" y2="${(padT+chartH).toFixed(1)}" stroke="#F1F5F9" stroke-width="0.5"/>`).join('');
    const xLabels = macroSectorsDef.map((sec, i) => {
      const x = xPos(i);
      const y = padT + chartH + 8;
      const label = sec.l1 + (sec.l2 ? ' ' + sec.l2 : '');
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="6.5" fill="#475569" text-anchor="end" font-weight="600" transform="rotate(-45, ${x.toFixed(1)}, ${y.toFixed(1)})">${label}</text>`;
    }).join('');
    const curveSVG = chartCurves.map(curve => {
      const pts = curve.scores.map((s, i) => ({ x: xPos(i), y: yPos(s) }));
      const d = pts.map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`)).join(' ');
      return `<path d="${d}" fill="none" stroke="${curve.color}" stroke-width="2" stroke-linejoin="round"/>${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${curve.color}"/>`).join('')}`;
    }).join('');
    const legendHTML = chartCurves.map(curve => {
      const avg = (curve.scores.reduce((a, b) => a + b, 0) / curve.scores.length).toFixed(1);
      const scoreColor = parseFloat(avg) >= 4.0 ? '#00A859' : parseFloat(avg) >= 3.0 ? '#FF9F43' : '#EA5455';
      return `<div style="display:flex;align-items:center;gap:5px;padding:5px 8px;background:#F8FAFC;border-radius:8px;"><span style="width:10px;height:10px;border-radius:50%;background:${curve.color};flex-shrink:0;"></span><span style="font-size:10px;color:#1E293B;font-weight:600;flex:1;">${curve.name}</span><span style="font-size:10px;font-weight:800;color:${scoreColor};">${avg}</span></div>`;
    }).join('');

    // Subtitle based on current selection
    const selLocalities = appState.selectedLocalities || [];
    const selRegions = appState.selectedRegions || [];
    let sectoralSubtitle = 'Moyenne nationale';
    if (selLocalities.length === 1) sectoralSubtitle = `Localité : ${selLocalities[0]}`;
    else if (selLocalities.length > 1) sectoralSubtitle = `${selLocalities.length} localités comparées`;
    else if (selRegions.length === 1) sectoralSubtitle = `1 région sélectionnée`;
    else if (selRegions.length > 1) sectoralSubtitle = `${selRegions.length} régions comparées`;

    sectoralCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div class="card-title">Performances Sectorielles</div>
          <div style="font-size:10px;color:#64748B;margin-top:2px;">${sectoralSubtitle}</div>
        </div>
        <span class="badge badge-info">7 Secteurs</span>
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

  // Country Change -> Immediately update region/locality dropdowns, then re-render map
  countrySelect.addEventListener('change', () => {
    const code = countrySelect.value;
    appState.selectedCountry = code;
    // Update dependent dropdowns immediately (no full re-render needed for these)
    updateRegionDropdown(code);
    // Trigger full re-render to update the SVG map and table
    if (onStateChangeCallback) onStateChangeCallback();
  });

  // Region Multi-Select Change -> Updates Localités dropdown AND refreshes cards
  regionSelect.addEventListener('change', () => {
    const code = countrySelect.value;
    const countryObj = locationData.find(c => c.code === code);

    // Collect all selected region IDs from the multi-select
    const selectedOpts = Array.from(regionSelect.selectedOptions).map(o => o.value);
    appState.selectedRegions = selectedOpts;
    // Reset locality selections when region changes
    appState.selectedLocalities = [];

    // Update locality dropdown based on selected region(s) (pure multi-select, no ALL option)
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
      localitySelect.innerHTML = locs.map(loc => `<option value="${loc}">${loc}</option>`).join('');
    }

    // Partial DOM refresh (no full app re-render needed)
    refreshFilteredCards(containerEl, appState, lang);
  });

  // Locality Multi-Select Change -> Updates appState.selectedLocalities and refreshes cards
  if (localitySelect) {
    localitySelect.addEventListener('change', () => {
      const selectedLocs = Array.from(localitySelect.selectedOptions).map(o => o.value);
      appState.selectedLocalities = selectedLocs;
      // Partial DOM refresh
      refreshFilteredCards(containerEl, appState, lang);
    });
  }

  // Macro-Sector Change -> Updates Méso-Secteur dropdown
  macroSelect.addEventListener('change', () => {
    const macroVal = macroSelect.value;
    appState.selectedMacro = macroVal;
    const mesos = sectorData.mesoSectors[macroVal] || [];
    mesoSelect.innerHTML = `<option value="ALL">Méso-Secteur: Tous</option>` + mesos.map(m => `
      <option value="${m.id}">${m.names[lang] || m.names.fr || m.id}</option>
    `).join('');
  });

  // Pillar Change -> Updates Indicateur dropdown
  pillarSelect.addEventListener('change', () => {
    const pillarVal = pillarSelect.value;
    appState.selectedPillar = pillarVal;
    const categories = sectorData.indicatorCategories[pillarVal] || [];
    indicatorSelect.innerHTML = `<option value="ALL">Indicateur: Tous</option>` + categories.map(cat => `
      <option value="${cat}">${t.indicators[cat] || cat}</option>
    `).join('');
    subIndicatorSelect.innerHTML = `<option value="ALL">Sous-Indicateur: Tous</option>`;
  });

  // Indicator Change -> Updates Sous-Indicateur dropdown
  indicatorSelect.addEventListener('change', () => {
    const catVal = indicatorSelect.value;
    appState.selectedCategory = catVal;
    const types = sectorData.indicatorTypes[catVal] || [];
    subIndicatorSelect.innerHTML = `<option value="ALL">Sous-Indicateur: Tous</option>` + types.map(tp => `
      <option value="${tp}">${t.subIndicators[tp] || tp}</option>
    `).join('');
  });

  // Reset Filters Button
  const resetBtn = containerEl.querySelector('#btn-reset-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      appState.selectedCountry = 'SN';
      appState.selectedMacro = 'Governance';
      appState.selectedPillar = 'Social';
      if (onStateChangeCallback) onStateChangeCallback();
    });
  }

  // Attach SVG Map Events
  attachMapEvents(containerEl, (regionId, regionName) => {
    console.log(`Territoire sélectionné: ${regionName} (${regionId})`);
  });

  // Initialize 3 Spider Radar Charts
  setTimeout(() => {
    initRadarChart('radar-canvas-econ', 'Économique', ['Investissement', 'Emplois', 'Valeur Ajoutée'], [4.8, 4.2, 4.5], '#00A859');
    initRadarChart('radar-canvas-social', 'Social', ['Équipements', 'Personnel', 'Programmes'], [3.9, 3.5, 4.1], '#FF9F43');
    initRadarChart('radar-canvas-env', 'Environnemental', ['Pollution', 'Ressources', 'Résilience'], [3.6, 4.0, 3.8], '#00A8FF');
  }, 100);
}
