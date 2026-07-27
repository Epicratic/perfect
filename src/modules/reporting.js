// Reporting Form Module (Fiche de Reporting)

import { locationData } from '../data/locations.js';
import { sectorData } from '../data/sectors.js';
import { initialAppData } from '../data/mockData.js';

export function renderReportingView(appState, translations) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;

  // Countries Options
  const countryOptionsHTML = locationData.map(c => `
    <option value="${c.code}">${c.flag} ${c.names[lang] || c.names.fr}</option>
  `).join('');

  // Macro-Sectors Options
  const macroSectorsHTML = sectorData.macroSectors.map(ms => `
    <option value="${ms}">${t.sectors[ms] || ms}</option>
  `).join('');

  // Pillars Options
  const pillarsHTML = sectorData.pillars.map(p => `
    <option value="${p.id}">${t[p.key] || p.id}</option>
  `).join('');

  return `
    <div>
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #002B49;">${t.reportingTitle}</h2>
        <p style="font-size: 11px; color: #64748B;">${t.reportingSub}</p>
      </div>

      <form id="fiche-reporting-form">
        <!-- CARD 1: Localisation & Territoire -->
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-title" style="margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <span>📍</span> Localisation & Territoire
          </div>

          <!-- 1. Country Selection -->
          <div class="form-group">
            <label class="form-label">${t.countryLabel} *</label>
            <select id="form-country-select" class="form-control" required>
              <option value="">${t.selectCountry}</option>
              ${countryOptionsHTML}
            </select>
          </div>

          <!-- 2. Cascading Region / Governorate Selection -->
          <div class="form-group">
            <label class="form-label">${t.regionLabel} *</label>
            <select id="form-region-select" class="form-control" required disabled>
              <option value="">${t.selectRegion}</option>
            </select>
          </div>

          <!-- 3. Cascading Locality / Delegation Selection -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">${t.localitiesLabel} *</label>
            <select id="form-locality-select" class="form-control" required disabled>
              <option value="">${t.selectLocality}</option>
            </select>
          </div>
        </div>

        <!-- CARD 2: Secteur & Acteur -->
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-title" style="margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <span>🏢</span> Secteur & Acteur
          </div>

          <!-- 4. Macro-Sector Selection -->
          <div class="form-group">
            <label class="form-label">${t.macroSectorLabel} *</label>
            <select id="form-macro-sector-select" class="form-control" required>
              <option value="">${t.selectMacroSector}</option>
              ${macroSectorsHTML}
            </select>
          </div>

          <!-- 5. Cascading Meso-Sector Selection -->
          <div class="form-group">
            <label class="form-label">${t.mesoSectorLabel} *</label>
            <select id="form-meso-sector-select" class="form-control" required disabled>
              <option value="">${t.selectMesoSector}</option>
            </select>
          </div>

          <!-- 6. Enterprise / Organization Autocomplete Field -->
          <div class="form-group autocomplete-wrapper" style="margin-bottom: 0;">
            <label class="form-label">${t.enterpriseLabel} *</label>
            <div class="autocomplete-input-container">
              <input type="text" id="form-enterprise-input" class="form-control" placeholder="${t.enterEnterpriseName}" autocomplete="off" required style="padding-right: 36px;" />
              <span id="enterprise-check-icon" class="autocomplete-check-icon">✓</span>
            </div>
            
            <!-- Autocomplete Suggestion Dropdown -->
            <div id="enterprise-dropdown-list" class="autocomplete-dropdown-list"></div>

            <!-- New Entry Notice Badge -->
            <div id="new-entity-notice" class="new-entity-notice" style="display: none;">
              ℹ️ Nouvelle entrée : Cette structure n'a jamais été évaluée. Elle sera ajoutée à la base de données.
            </div>
          </div>
        </div>

        <!-- CARD 3: Évaluation de la Performance -->
        <div class="card">
          <div class="card-title" style="margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <span>⭐</span> Évaluation de la Performance
          </div>

          <!-- 7. Societal Performance Pillar -->
          <div class="form-group">
            <label class="form-label">${t.societalPillarLabel} *</label>
            <select id="form-pillar-select" class="form-control" required>
              <option value="">${t.selectPillar}</option>
              ${pillarsHTML}
            </select>
          </div>

          <!-- 8. Indicator Category -->
          <div class="form-group">
            <label class="form-label">${t.indicatorCategoryLabel} *</label>
            <select id="form-category-select" class="form-control" required disabled>
              <option value="">${t.selectCategory}</option>
            </select>
          </div>

          <!-- 9. Sub-Indicator Type -->
          <div class="form-group">
            <label class="form-label">${t.indicatorTypeLabel} *</label>
            <select id="form-type-select" class="form-control" required disabled>
              <option value="">${t.selectType}</option>
            </select>
          </div>

          <!-- 10. Star Rating Picker (Displayed ONLY for Social & Environmental) -->
          <div class="form-group" id="star-rating-wrapper" style="text-align: center;">
            <label class="form-label">${t.ratingScoreLabel} *</label>
            <div class="star-rating-selector" id="star-rating-picker">
              <span class="star-icon-btn selected" data-value="1">★</span>
              <span class="star-icon-btn selected" data-value="2">★</span>
              <span class="star-icon-btn selected" data-value="3">★</span>
              <span class="star-icon-btn selected" data-value="4">★</span>
              <span class="star-icon-btn" data-value="5">★</span>
            </div>
            <input type="hidden" id="form-rating-value" value="4" />
          </div>

          <!-- 11. Quantitative Inputs (Displayed ONLY for Economic Pillar) -->
          <div id="economic-values-wrapper" style="display: none; gap: 10px; margin-bottom: 14px;">
            <div style="flex: 1;">
              <label class="form-label">${t.currentValueLabel} *</label>
              <input type="number" id="form-current-val" class="form-control" placeholder="ex: 1200" />
            </div>
            <div style="flex: 1;">
              <label class="form-label">${t.potentialValueLabel} *</label>
              <input type="number" id="form-potential-val" class="form-control" placeholder="ex: 1500" />
            </div>
          </div>

          <!-- 12. Comment Field -->
          <div class="form-group">
            <label class="form-label">${t.commentsLabel}</label>
            <textarea id="form-comments" class="form-control" rows="3" placeholder="${t.commentsPlaceholder}"></textarea>
          </div>

          <!-- 13. File Attachment Dropzone -->
          <div class="form-group">
            <label class="form-label">${t.fileAttachmentLabel}</label>
            <div class="dropzone-box" id="file-dropzone">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" style="margin-bottom: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div style="font-size: 12px; font-weight: 600; color: #475569;">${t.dragDropText}</div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">${t.fileTypesNote}</div>
              <div id="file-name-display" style="font-size: 11px; font-weight: 700; color: #00A859; margin-top: 6px;"></div>
            </div>
            <input type="file" id="file-input-hidden" style="display: none;" />
          </div>

          <!-- Submit Button -->
          <button type="submit" class="btn btn-primary" style="margin-top: 10px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            ${t.submitFormBtn}
          </button>
        </div>
      </form>
    </div>
  `;
}

export function attachReportingEvents(containerEl, appState, translations, onSubmitCallback) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;

  const countrySelect = containerEl.querySelector('#form-country-select');
  const regionSelect = containerEl.querySelector('#form-region-select');
  const localitySelect = containerEl.querySelector('#form-locality-select');
  const macroSelect = containerEl.querySelector('#form-macro-sector-select');
  const mesoSelect = containerEl.querySelector('#form-meso-sector-select');
  const pillarSelect = containerEl.querySelector('#form-pillar-select');
  const categorySelect = containerEl.querySelector('#form-category-select');
  const typeSelect = containerEl.querySelector('#form-type-select');

  const starRatingWrapper = containerEl.querySelector('#star-rating-wrapper');
  const economicValuesWrapper = containerEl.querySelector('#economic-values-wrapper');

  const enterpriseInput = containerEl.querySelector('#form-enterprise-input');
  const dropdownList = containerEl.querySelector('#enterprise-dropdown-list');
  const checkIcon = containerEl.querySelector('#enterprise-check-icon');
  const newNotice = containerEl.querySelector('#new-entity-notice');

  // List of registered actors for autocompletion
  const knownActors = (appState.data.topActors || initialAppData.topActors).map(a => a.name);

  let currentSelectedCountryObj = null;

  // Country Change -> Update Regions
  countrySelect.addEventListener('change', () => {
    const code = countrySelect.value;
    currentSelectedCountryObj = locationData.find(c => c.code === code);

    // Reset Localities
    localitySelect.disabled = true;
    localitySelect.innerHTML = `<option value="">${t.selectLocality}</option>`;

    if (currentSelectedCountryObj && currentSelectedCountryObj.regions) {
      regionSelect.disabled = false;
      regionSelect.innerHTML = `<option value="">${t.selectRegion}</option>` + currentSelectedCountryObj.regions.map(r => `
        <option value="${r.id}">${r.names[lang] || r.names.fr}</option>
      `).join('');
    } else {
      regionSelect.disabled = true;
      regionSelect.innerHTML = `<option value="">${t.selectRegion}</option>`;
    }
  });

  // Region Change -> Update Dependent Localities / Delegations
  regionSelect.addEventListener('change', () => {
    const regionId = regionSelect.value;
    if (currentSelectedCountryObj && currentSelectedCountryObj.regions) {
      const regionObj = currentSelectedCountryObj.regions.find(r => r.id === regionId);
      if (regionObj && regionObj.localities && regionObj.localities.length > 0) {
        localitySelect.disabled = false;
        localitySelect.innerHTML = `<option value="">${t.selectLocality}</option>` + regionObj.localities.map(loc => `
          <option value="${loc}">${loc}</option>
        `).join('');
      } else {
        localitySelect.disabled = true;
        localitySelect.innerHTML = `<option value="">${t.selectLocality}</option>`;
      }
    }
  });

  // Macro-Sector Change -> Update Meso-Sectors
  macroSelect.addEventListener('change', () => {
    const macroVal = macroSelect.value;
    const mesos = sectorData.mesoSectors[macroVal] || [];
    if (mesos.length > 0) {
      mesoSelect.disabled = false;
      mesoSelect.innerHTML = `<option value="">${t.selectMesoSector}</option>` + mesos.map(m => `
        <option value="${m.id}">${m.names[lang] || m.names.fr || m.id}</option>
      `).join('');
    } else {
      mesoSelect.disabled = true;
      mesoSelect.innerHTML = `<option value="">${t.selectMesoSector}</option>`;
    }
  });

  // Enterprise Name Autocomplete & Validation Logic
  enterpriseInput.addEventListener('input', () => {
    const query = enterpriseInput.value.trim().toLowerCase();
    
    if (!query) {
      dropdownList.classList.remove('active');
      checkIcon.classList.remove('active');
      newNotice.style.display = 'none';
      return;
    }

    const matches = knownActors.filter(name => name.toLowerCase().includes(query));

    if (matches.length > 0) {
      dropdownList.innerHTML = matches.map(m => `
        <div class="autocomplete-item" data-name="${m}">${m}</div>
      `).join('');
      dropdownList.classList.add('active');

      const exactMatch = knownActors.find(name => name.toLowerCase() === query);
      if (exactMatch) {
        checkIcon.classList.add('active');
        newNotice.style.display = 'none';
      } else {
        checkIcon.classList.add('active');
        newNotice.style.display = 'flex';
      }
    } else {
      dropdownList.classList.remove('active');
      checkIcon.classList.add('active');
      newNotice.style.display = 'flex';
    }
  });

  dropdownList.addEventListener('click', (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (item) {
      const selectedName = item.getAttribute('data-name');
      enterpriseInput.value = selectedName;
      dropdownList.classList.remove('active');
      checkIcon.classList.add('active');
      newNotice.style.display = 'none';
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrapper')) {
      dropdownList.classList.remove('active');
    }
  });

  // Pillar Change -> Dynamic conditional display (Economic vs Social/Environmental)
  pillarSelect.addEventListener('change', () => {
    const pillarVal = pillarSelect.value;

    if (pillarVal === 'Economic') {
      // Show Quantitative Text Inputs, Hide Star Rating Bar
      economicValuesWrapper.style.display = 'flex';
      starRatingWrapper.style.display = 'none';
    } else {
      // Show Star Rating Bar, Hide Quantitative Text Inputs
      starRatingWrapper.style.display = 'block';
      economicValuesWrapper.style.display = 'none';
    }

    // Update Categories dropdown
    const categories = sectorData.indicatorCategories[pillarVal] || [];
    if (categories.length > 0) {
      categorySelect.disabled = false;
      categorySelect.innerHTML = `<option value="">${t.selectCategory}</option>` + categories.map(cat => `
        <option value="${cat}">${t.indicators[cat] || cat}</option>
      `).join('');
    } else {
      categorySelect.disabled = true;
      categorySelect.innerHTML = `<option value="">${t.selectCategory}</option>`;
    }

    // Reset Sub-Indicators
    typeSelect.disabled = true;
    typeSelect.innerHTML = `<option value="">${t.selectType}</option>`;
  });

  // Category Change -> Update Types (Sous-Indicateurs translate dynamically)
  categorySelect.addEventListener('change', () => {
    const catVal = categorySelect.value;
    const types = sectorData.indicatorTypes[catVal] || [];
    if (types.length > 0) {
      typeSelect.disabled = false;
      typeSelect.innerHTML = `<option value="">${t.selectType}</option>` + types.map(tp => `
        <option value="${tp}">${t.subIndicators[tp] || tp}</option>
      `).join('');
    } else {
      typeSelect.disabled = true;
      typeSelect.innerHTML = `<option value="">${t.selectType}</option>`;
    }
  });

  // Highly Interactive Star Rating Picker (Hover + Click)
  const starPicker = containerEl.querySelector('#star-rating-picker');
  const ratingInput = containerEl.querySelector('#form-rating-value');
  const stars = starPicker.querySelectorAll('.star-icon-btn');

  function updateStarsDisplay(ratingVal) {
    stars.forEach((st, idx) => {
      if (idx < ratingVal) {
        st.classList.add('selected');
      } else {
        st.classList.remove('selected');
      }
    });
  }

  stars.forEach((s, index) => {
    // Hover over star
    s.addEventListener('mouseenter', () => {
      const hoverVal = index + 1;
      stars.forEach((st, idx) => {
        if (idx < hoverVal) st.classList.add('hover-active');
        else st.classList.remove('hover-active');
      });
    });

    // Leave star container
    s.addEventListener('mouseleave', () => {
      stars.forEach(st => st.classList.remove('hover-active'));
    });

    // Click to lock rating
    s.addEventListener('click', () => {
      const selectedVal = index + 1;
      ratingInput.value = selectedVal;
      updateStarsDisplay(selectedVal);
    });
  });

  starPicker.addEventListener('mouseleave', () => {
    const currentVal = parseInt(ratingInput.value) || 0;
    updateStarsDisplay(currentVal);
  });

  // File Dropzone
  const dropzone = containerEl.querySelector('#file-dropzone');
  const hiddenFileInput = containerEl.querySelector('#file-input-hidden');
  const fileNameDisplay = containerEl.querySelector('#file-name-display');

  dropzone.addEventListener('click', () => hiddenFileInput.click());

  hiddenFileInput.addEventListener('change', () => {
    if (hiddenFileInput.files.length > 0) {
      fileNameDisplay.textContent = "📄 " + hiddenFileInput.files[0].name;
    }
  });

  // Form Submit
  const form = containerEl.querySelector('#fiche-reporting-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newEvaluation = {
      id: "eval-" + Date.now(),
      country: countrySelect.value,
      region: regionSelect.value,
      locality: localitySelect.value,
      macroSector: macroSelect.value,
      mesoSector: mesoSelect.value,
      actorName: enterpriseInput.value,
      pillar: pillarSelect.value,
      category: categorySelect.value,
      type: typeSelect.value,
      rating: pillarSelect.value === 'Economic' ? 4.0 : parseFloat(ratingInput.value),
      currentValue: parseFloat(containerEl.querySelector('#form-current-val').value) || null,
      potentialValue: parseFloat(containerEl.querySelector('#form-potential-val').value) || null,
      comment: containerEl.querySelector('#form-comments').value,
      author: appState.data.userProfile.name,
      date: new Date().toISOString().split('T')[0],
      status: "Verified"
    };

    if (onSubmitCallback) onSubmitCallback(newEvaluation);
  });
}
