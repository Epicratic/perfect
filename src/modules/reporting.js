// Reporting Form Module (Fiche de Reporting)

import { locationData } from '../data/locations.js';
import { sectorData } from '../data/sectors.js';
import { initialAppData } from '../data/mockData.js';
import { compressImageFile } from '../utils/imageCompressor.js';

export function renderReportingView(appState, translations) {
  const lang = appState.lang;
  const t = translations[lang] || translations.fr;
  const user = appState.currentUser || {};
  const isBusiness = user.role && user.role.toLowerCase().includes('entreprise');

  // Check expert approval status
  const contributors = (appState.data && appState.data.adminStats && appState.data.adminStats.contributors) || [];
  const currentUserId = user.id || user.uid || appState.currentUserId;
  const currentContrib = contributors.find(c => c.id === currentUserId || (user.email && c.email === user.email));
  const isExpertApproved = (currentContrib && currentContrib.expertApproved) || user.expertApproved === true;

  const bProfile = user.businessProfile || {};

  // Countries Options
  const countryOptionsHTML = locationData.map(c => `
    <option value="${c.code}" ${isBusiness && bProfile.country === c.code ? 'selected' : ''}>${c.flag} ${c.names[lang] || c.names.fr}</option>
  `).join('');

  // Macro-Sectors Options
  const macroSectorsHTML = sectorData.macroSectors.map(ms => `
    <option value="${ms}" ${isBusiness && bProfile.macroSector === ms ? 'selected' : ''}>${t.sectors[ms] || ms}</option>
  `).join('');

  // Pillars Options - Filtered by role
  let pillarsToRender = sectorData.pillars;
  if (isBusiness) {
    // Business can ONLY evaluate Economic performance for their own entity
    pillarsToRender = sectorData.pillars.filter(p => p.id === 'Economic');
  }

  const pillarsHTML = pillarsToRender.map(p => `
    <option value="${p.id}">${t[p.key] || p.id}</option>
  `).join('');

  return `
    <div>
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 18px; font-weight: 800; color: #002B49;">${t.reportingTitle}</h2>
        <p style="font-size: 11px; color: #64748B;">${t.reportingSub}</p>
      </div>

      ${isBusiness ? `
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; padding: 10px 14px; border-radius: 10px; font-size: 12px; margin-bottom: 14px; font-weight: 600;">
          🏢 <strong>Compte Entreprise :</strong> Vos caractéristiques (territoire, secteur, établissement) sont pré-remplies et verrouillées. Vous pouvez uniquement renseigner la performance économique de votre propre structure.
        </div>
      ` : ''}

      ${isExpertApproved ? `
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; padding: 10px 14px; border-radius: 10px; font-size: 12px; margin-bottom: 14px; font-weight: 600;">
          ⭐ <strong>Contributeur Expert Autorisé :</strong> Vous avez l'autorisation d'émettre des évaluations sur les 3 piliers (Économique, Social, Environnemental) à l'échelle d'un territoire entier.
        </div>
      ` : ''}

      <form id="fiche-reporting-form">
        <!-- CARD 1: Localisation & Territoire -->
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-title" style="margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <span>📍</span> Localisation & Territoire
          </div>

          <!-- 1. Country Selection -->
          <div class="form-group">
            <label class="form-label">${t.countryLabel} *</label>
            <select id="form-country-select" class="form-control" required ${isBusiness ? 'disabled' : ''}>
              <option value="">${t.selectCountry}</option>
              ${countryOptionsHTML}
            </select>
          </div>

          <!-- 2. Cascading Region / Governorate Selection -->
          <div class="form-group">
            <label class="form-label">${t.regionLabel} *</label>
            <select id="form-region-select" class="form-control" required ${isBusiness ? 'disabled' : 'disabled'}>
              <option value="">${t.selectRegion}</option>
            </select>
          </div>

          <!-- 3. Cascading Locality / Delegation Selection -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">${t.localitiesLabel} *</label>
            <select id="form-locality-select" class="form-control" required ${isBusiness ? 'disabled' : 'disabled'}>
              <option value="">${t.selectLocality}</option>
            </select>
          </div>
        </div>

        <!-- CARD 2: Secteur & Acteur -->
        <div class="card" style="margin-bottom: 16px;">
          <div class="card-title" style="margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <span>🏢</span> Secteur & Acteur
          </div>

          ${isExpertApproved ? `
            <div class="form-group" style="background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 10px; border-radius: 8px; margin-bottom: 12px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #002B49; cursor: pointer;">
                <input type="checkbox" id="form-territory-rating-check" style="width: 16px; height: 16px;" />
                📍 Évaluation à l'échelle du territoire (sans cibler un acteur spécifique)
              </label>
              <div style="font-size: 10px; color: #64748B; margin-top: 4px; margin-left: 24px;">
                Cocher cette case pour émettre une évaluation globale sur tout le territoire sélectionné (bypasse les moyennes des opérateurs).
              </div>
            </div>
          ` : ''}

          <!-- 4. Macro-Sector Selection -->
          <div class="form-group">
            <label class="form-label">${t.macroSectorLabel} *</label>
            <select id="form-macro-sector-select" class="form-control" required ${isBusiness ? 'disabled' : ''}>
              <option value="">${t.selectMacroSector}</option>
              ${macroSectorsHTML}
            </select>
          </div>

          <!-- 5. Cascading Meso-Sector Selection -->
          <div class="form-group">
            <label class="form-label">${t.mesoSectorLabel} *</label>
            <select id="form-meso-sector-select" class="form-control" required ${isBusiness ? 'disabled' : 'disabled'}>
              <option value="">${t.selectMesoSector}</option>
            </select>
          </div>

          <!-- 6. Enterprise / Organization Autocomplete Field -->
          <div class="form-group autocomplete-wrapper" id="enterprise-input-group" style="margin-bottom: 0;">
            <label class="form-label">${t.enterpriseLabel} *</label>
            <div class="autocomplete-input-container">
              <input type="text" id="form-enterprise-input" class="form-control" 
                placeholder="${t.enterEnterpriseName}" autocomplete="off" required style="padding-right: 36px;" 
                value="${isBusiness ? (bProfile.actorName || user.name || '') : ''}" 
                ${isBusiness ? 'readonly' : ''} />
              <span id="enterprise-check-icon" class="autocomplete-check-icon ${isBusiness ? 'active' : ''}">✓</span>
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

          <!-- Warning banner for unauthorized users attempting economic ratings -->
          <div id="unauthorized-economic-warning" style="display: none; background: #FEF2F2; border: 1px solid #FCA5A5; color: #991B1B; padding: 10px 14px; border-radius: 10px; font-size: 12px; margin-bottom: 14px; font-weight: 600;">
            ⛔ <strong>Accès restreint :</strong> L'évaluation de la performance économique est réservée aux contributeurs experts autorisés ou aux entreprises pour leur propre fiche. Rendez-vous sur votre profil pour cliquer sur "Devenir contributeur expert".
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
            <label class="form-label">${t.fileAttachmentLabel || "Photo ou Justificatif (Optionnel)"}</label>
            <div class="dropzone-box" id="file-dropzone" style="cursor: pointer; padding: 18px 14px; text-align: center; border: 2px dashed #CBD5E1; border-radius: 14px; background: #F8FAFC; transition: all 0.2s;">
              <div style="font-size: 28px; margin-bottom: 4px;">📷</div>
              <div style="font-size: 12px; font-weight: 700; color: #002B49;">${t.dragDropText || "Cliquez pour uploader une photo ou un document"}</div>
              <div style="font-size: 10px; color: #94A3B8; margin-top: 2px; margin-bottom: 8px;">${t.fileTypesNote || "JPG, PNG, PDF jusqu'à 10 Mo"}</div>
              <button type="button" id="btn-browse-reporting-file" style="background: #002B49; color: white; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; padding: 6px 14px; cursor: pointer;">
                📁 Choisir un fichier / Prendre photo
              </button>
              <div id="file-preview-container" style="display:none; margin-top: 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 8px; text-align: center;">
                <img id="file-thumb-preview" src="" style="max-height: 80px; max-width: 100%; border-radius: 6px; margin-bottom: 4px; display: none;" />
                <div id="file-name-display" style="font-size: 11px; font-weight: 700; color: #166534;"></div>
                <button type="button" id="btn-remove-attachment" style="background: none; border: none; font-size: 10.5px; color: #DC2626; text-decoration: underline; cursor: pointer; margin-top: 4px;">✕ Retirer le fichier</button>
              </div>
            </div>
            <input type="file" id="file-input-hidden" accept="image/*,.pdf,.doc,.docx" style="display: none;" />
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
  const user = appState.currentUser || {};
  const isBusiness = user.role && user.role.toLowerCase().includes('entreprise');

  const contributors = (appState.data && appState.data.adminStats && appState.data.adminStats.contributors) || [];
  const currentUserId = user.id || user.uid || appState.currentUserId;
  const currentContrib = contributors.find(c => c.id === currentUserId || (user.email && c.email === user.email));
  const isExpertApproved = (currentContrib && currentContrib.expertApproved) || user.expertApproved === true;

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
  const unauthorizedWarning = containerEl.querySelector('#unauthorized-economic-warning');
  const territoryCheck = containerEl.querySelector('#form-territory-rating-check');
  const enterpriseGroup = containerEl.querySelector('#enterprise-input-group');

  const enterpriseInput = containerEl.querySelector('#form-enterprise-input');
  const dropdownList = containerEl.querySelector('#enterprise-dropdown-list');
  const checkIcon = containerEl.querySelector('#enterprise-check-icon');
  const newNotice = containerEl.querySelector('#new-entity-notice');

  // List of registered actors for autocompletion — from real Firestore evaluations only
  const realEvalsForAuto = (appState.data && appState.data.recentEvaluations) ? appState.data.recentEvaluations : [];
  const knownActors = [...new Set(
    realEvalsForAuto.map(e => (e.targetEntity || e.actorName || e.entity || '').trim()).filter(Boolean)
  )].sort();

  let currentSelectedCountryObj = null;

  // Country Change -> Update Regions
  function updateRegions(selectedRegionId = '') {
    const code = countrySelect.value;
    currentSelectedCountryObj = locationData.find(c => c.code === code);

    // Reset Localities
    localitySelect.disabled = true;
    localitySelect.innerHTML = `<option value="">${t.selectLocality}</option>`;

    if (currentSelectedCountryObj && currentSelectedCountryObj.regions) {
      regionSelect.disabled = isBusiness ? true : false;
      regionSelect.innerHTML = `<option value="">${t.selectRegion}</option>` + currentSelectedCountryObj.regions.map(r => `
        <option value="${r.id}" ${r.id === selectedRegionId ? 'selected' : ''}>${r.names[lang] || r.names.fr}</option>
      `).join('');
    } else {
      regionSelect.disabled = true;
      regionSelect.innerHTML = `<option value="">${t.selectRegion}</option>`;
    }
  }

  function updateLocalities(regionId, selectedLocality = '') {
    if (currentSelectedCountryObj && currentSelectedCountryObj.regions) {
      const regionObj = currentSelectedCountryObj.regions.find(r => r.id === regionId);
      if (regionObj && regionObj.localities && regionObj.localities.length > 0) {
        localitySelect.disabled = isBusiness ? true : false;
        localitySelect.innerHTML = `<option value="">${t.selectLocality}</option>` + regionObj.localities.map(loc => `
          <option value="${loc}" ${loc === selectedLocality ? 'selected' : ''}>${loc}</option>
        `).join('');
      } else {
        localitySelect.disabled = true;
        localitySelect.innerHTML = `<option value="">${t.selectLocality}</option>`;
      }
    }
  }

  function updateMesoSectors(macroVal, selectedMesoId = '') {
    const mesos = sectorData.mesoSectors[macroVal] || [];
    if (mesos.length > 0) {
      mesoSelect.disabled = isBusiness ? true : false;
      mesoSelect.innerHTML = `<option value="">${t.selectMesoSector}</option>` + mesos.map(m => `
        <option value="${m.id}" ${m.id === selectedMesoId ? 'selected' : ''}>${m.names[lang] || m.names.fr || m.id}</option>
      `).join('');
    } else {
      mesoSelect.disabled = true;
      mesoSelect.innerHTML = `<option value="">${t.selectMesoSector}</option>`;
    }
  }

  // Pre-fill business profile if business account
  if (isBusiness && user.businessProfile) {
    const bp = user.businessProfile;
    countrySelect.value = bp.country || 'TN';
    updateRegions(bp.region);
    updateLocalities(bp.region, bp.locality);
    macroSelect.value = bp.macroSector || '';
    updateMesoSectors(bp.macroSector, bp.mesoSector);
  } else {
    // Initial region update for normal users
    updateRegions();
  }

  countrySelect.addEventListener('change', () => updateRegions());

  regionSelect.addEventListener('change', () => {
    updateLocalities(regionSelect.value);
  });

  macroSelect.addEventListener('change', () => {
    updateMesoSectors(macroSelect.value);
  });

  // Territory rating checkbox toggle for authorized experts
  if (territoryCheck) {
    territoryCheck.addEventListener('change', () => {
      if (territoryCheck.checked) {
        enterpriseInput.required = false;
        enterpriseInput.value = "Échelle Territoriale";
        enterpriseInput.disabled = true;
        if (checkIcon) checkIcon.classList.add('active');
        if (newNotice) newNotice.style.display = 'none';
      } else {
        enterpriseInput.required = true;
        enterpriseInput.value = "";
        enterpriseInput.disabled = false;
        if (checkIcon) checkIcon.classList.remove('active');
      }
    });
  }

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

  // Pillar Change -> Dynamic conditional display & Access Control Enforcement
  pillarSelect.addEventListener('change', () => {
    const pillarVal = pillarSelect.value;

    // Check if user is allowed to select Economic
    if (pillarVal === 'Economic' && !isExpertApproved && !isBusiness) {
      if (unauthorizedWarning) unauthorizedWarning.style.display = 'block';
      pillarSelect.value = '';
      economicValuesWrapper.style.display = 'none';
      starRatingWrapper.style.display = 'none';
      categorySelect.disabled = true;
      categorySelect.innerHTML = `<option value="">${t.selectCategory}</option>`;
      typeSelect.disabled = true;
      typeSelect.innerHTML = `<option value="">${t.selectType}</option>`;
      return;
    } else {
      if (unauthorizedWarning) unauthorizedWarning.style.display = 'none';
    }

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

  // File Dropzone & Attachment Handling
  const dropzone = containerEl.querySelector('#file-dropzone');
  const btnBrowseFile = containerEl.querySelector('#btn-browse-reporting-file');
  const hiddenFileInput = containerEl.querySelector('#file-input-hidden');
  const previewContainer = containerEl.querySelector('#file-preview-container');
  const fileNameDisplay = containerEl.querySelector('#file-name-display');
  const thumbPreview = containerEl.querySelector('#file-thumb-preview');
  const btnRemoveAttachment = containerEl.querySelector('#btn-remove-attachment');

  let attachedFileBase64 = null;
  let attachedFileName = null;

  const triggerAttachmentPicker = (e) => {
    if (e) e.stopPropagation();
    if (hiddenFileInput) hiddenFileInput.click();
  };

  if (dropzone) dropzone.addEventListener('click', triggerAttachmentPicker);
  if (btnBrowseFile) btnBrowseFile.addEventListener('click', triggerAttachmentPicker);

  if (hiddenFileInput) {
    hiddenFileInput.addEventListener('change', async () => {
      const file = hiddenFileInput.files && hiddenFileInput.files[0];
      if (file) {
        attachedFileName = file.name;
        if (previewContainer) previewContainer.style.display = 'block';
        if (fileNameDisplay) fileNameDisplay.textContent = `⏳ Traitement de ${file.name}...`;

        try {
          const res = await compressImageFile(file, 900, 900, 0.75);
          if (res && res.dataUrl) {
            attachedFileBase64 = res.dataUrl;
            if (fileNameDisplay) fileNameDisplay.textContent = `📄 ${file.name} (${(res.dataUrl.length / 1024).toFixed(0)} Ko)`;
            if (res.isImage && thumbPreview) {
              thumbPreview.src = res.dataUrl;
              thumbPreview.style.display = 'inline-block';
            } else if (thumbPreview) {
              thumbPreview.style.display = 'none';
            }
          }
        } catch (err) {
          console.warn("Attachment compression error:", err);
          if (fileNameDisplay) fileNameDisplay.textContent = `📄 ${file.name}`;
        }
      }
    });
  }

  if (btnRemoveAttachment) {
    btnRemoveAttachment.addEventListener('click', (e) => {
      e.stopPropagation();
      attachedFileBase64 = null;
      attachedFileName = null;
      if (hiddenFileInput) hiddenFileInput.value = '';
      if (previewContainer) previewContainer.style.display = 'none';
      if (thumbPreview) {
        thumbPreview.src = '';
        thumbPreview.style.display = 'none';
      }
    });
  }

  // Form Submit
  const form = containerEl.querySelector('#fiche-reporting-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const chosenPillar = pillarSelect.value || "Social";

    // Strict security check: block unauthorized economic rating
    if (chosenPillar === 'Economic' && !isExpertApproved && !isBusiness) {
      if (unauthorizedWarning) unauthorizedWarning.style.display = 'block';
      alert("L'évaluation de la performance économique est réservée aux contributeurs experts autorisés.");
      return;
    }

    const isTerritoryRating = (territoryCheck && territoryCheck.checked) || false;
    const authorName = user.name || (appState.data && appState.data.userProfile ? appState.data.userProfile.name : "Contributeur");
    const authorEmail = user.email || "";
    const initials = authorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "C";
    const selectedCountry = countrySelect.value || "TN";
    
    let actorName = isTerritoryRating ? "Échelle Territoriale" : (enterpriseInput.value || "Structure Publique");
    if (isBusiness && user.businessProfile && user.businessProfile.actorName) {
      actorName = user.businessProfile.actorName;
    }

    const macroSector = macroSelect.value || "Gouvernance";

    const curVal = parseFloat(containerEl.querySelector('#form-current-val')?.value);
    const potVal = parseFloat(containerEl.querySelector('#form-potential-val')?.value);
    let computedRating = parseFloat(ratingInput.value || 4.0);

    if (chosenPillar === 'Economic') {
      if (curVal > 0 && potVal > 0) {
        computedRating = Math.min(5.0, Math.max(1.0, Math.round((curVal / potVal) * 50) / 10));
      } else {
        computedRating = 4.0;
      }
    }

    const newEvaluation = {
      id: "eval-" + Date.now(),
      country: selectedCountry,
      region: regionSelect.value || "",
      locality: localitySelect.value || "",
      macroSector: macroSector,
      mesoSector: mesoSelect.value || "",
      sectorName: macroSector,
      sector: macroSector,
      actorName: actorName,
      targetEntity: actorName,
      pillar: chosenPillar,
      societalPillar: chosenPillar,
      category: categorySelect.value || "",
      type: typeSelect.value || "",
      rating: computedRating,
      currentValue: curVal || null,
      potentialValue: potVal || null,
      comment: containerEl.querySelector('#form-comments')?.value || "Évaluation partagée.",
      author: authorName,
      authorName: authorName,
      authorEmail: authorEmail,
      authorInitials: initials,
      authorAvatarBg: "#002B49",
      authorAvatarColor: "#FFFFFF",
      location: (localitySelect.value && regionSelect.value)
        ? `${localitySelect.value}, ${regionSelect.value}, ${selectedCountry}`
        : (localitySelect.value ? `${localitySelect.value}, ${selectedCountry}` : (regionSelect.value ? `${regionSelect.value}, ${selectedCountry}` : selectedCountry)),
      timeAgo: "À l'instant",
      createdAtSeconds: Math.floor(Date.now() / 1000),
      isoDate: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      status: "Verified",
      isTerritoryRating: isTerritoryRating,
      isExpertRating: isExpertApproved,
      attachmentName: attachedFileName || null,
      attachmentBase64: attachedFileBase64 || null,
      photoUrl: attachedFileBase64 || null
    };

    // Show Confirmation Modal Sequence
    showReportingSuccessModal(newEvaluation, () => {
      if (onSubmitCallback) onSubmitCallback(newEvaluation);
    });
  });
}

function showReportingSuccessModal(newEval, onDone) {
  const modal = document.createElement('div');
  modal.id = 'reporting-success-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
    z-index: 99999; display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fadeIn 0.3s ease;
  `;

  modal.innerHTML = `
    <div style="background: white; border-radius: 20px; padding: 24px 20px; width: 100%; max-width: 360px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: #DCFCE7; color: #15803D; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 14px auto;">
        ✓
      </div>
      <h3 style="font-size: 17px; font-weight: 800; color: #002B49; margin-bottom: 6px;">Évaluation Enregistrée !</h3>
      <p style="font-size: 11.5px; color: #64748B; margin-bottom: 16px; line-height: 1.4;">
        Votre évaluation concernant <strong>${newEval.actorName || 'la structure'}</strong> a été enregistrée avec succès.
      </p>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px; margin-bottom: 18px; text-align: left; font-size: 11px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:#64748B;">Secteur :</span>
          <span style="font-weight:700; color:#002B49;">${newEval.macroSector}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:#64748B;">Pilier :</span>
          <span style="font-weight:700; color:#00A859;">${newEval.pillar}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:#64748B;">Note attribuée :</span>
          <span style="font-weight:800; color:#002B49;">⭐ ${newEval.rating.toFixed(1)} / 5</span>
        </div>
        ${newEval.attachmentName ? `
          <div style="display:flex; justify-content:space-between; padding-top:4px; border-top:1px dashed #E2E8F0; margin-top:4px;">
            <span style="color:#64748B;">Pièce jointe :</span>
            <span style="font-weight:700; color:#2563EB;">📷 ${newEval.attachmentName}</span>
          </div>
        ` : ''}
      </div>

      <button id="btn-confirm-and-redirect" class="btn btn-primary" style="width: 100%; padding: 11px; font-size: 13px; font-weight: 700; background: #002B49; border-color: #002B49; cursor: pointer;">
        Consulter sur le Tableau Général →
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const confirmBtn = modal.querySelector('#btn-confirm-and-redirect');
  confirmBtn.addEventListener('click', () => {
    modal.remove();
    if (onDone) onDone();
  });
}
