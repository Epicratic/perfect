// Onboarding Module for Business Accounts
import { locationData } from '../data/locations.js';
import { sectorData } from '../data/sectors.js';
import { translations as allTranslations } from '../data/translations.js';
import { firestoreUpdateUserProfile } from '../config/firebase.js';

export function renderOnboardingView(appState = {}, translations = allTranslations) {
  const lang = appState.lang || 'fr';
  const t = (translations && translations[lang]) ? translations[lang] : (allTranslations[lang] || allTranslations.fr);
  const user = appState.currentUser || {};

  const countryOptionsHTML = locationData.map(c => `
    <option value="${c.code}" ${c.code === 'TN' ? 'selected' : ''}>${c.flag} ${c.names[lang] || c.names.fr}</option>
  `).join('');

  const macroSectorsHTML = sectorData.macroSectors.map(ms => `
    <option value="${ms}">${(t.sectors && t.sectors[ms]) || ms}</option>
  `).join('');

  return `
    <div style="max-width: 500px; margin: 20px auto; padding: 20px;">
      <div class="card" style="padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 36px; margin-bottom: 8px;">🏢</div>
          <h2 style="font-size: 20px; font-weight: 800; color: #002B49; margin-bottom: 6px;">
            Configuration du compte Entreprise
          </h2>
          <p style="font-size: 12px; color: #64748B;">
            Bienvenue ${user.name || ''} ! Veuillez préciser les caractéristiques de votre établissement avant d'accéder au portail.
          </p>
        </div>

        <form id="onboarding-form">
          <!-- 1. Enterprise Name -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">Nom de l'Entreprise / Établissement *</label>
            <input type="text" id="onb-name" class="form-control" value="${user.name || ''}" placeholder="ex: Pharmacie Centrale Mahdia" required />
          </div>

          <!-- 2. Country -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">${t.countryLabel || 'Pays'} *</label>
            <select id="onb-country" class="form-control" required>
              ${countryOptionsHTML}
            </select>
          </div>

          <!-- 3. Region / Governorate -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">${t.regionLabel || 'Région / Gouvernorat'} *</label>
            <select id="onb-region" class="form-control" required>
              <option value="">${t.selectRegion || '-- Sélectionner une Région --'}</option>
            </select>
          </div>

          <!-- 4. Delegation / Locality -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">${t.localitiesLabel || 'Localité / Délégation'} *</label>
            <select id="onb-locality" class="form-control" required disabled>
              <option value="">${t.selectLocality || '-- Sélectionner une Localité --'}</option>
            </select>
          </div>

          <!-- 5. Macro Sector -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">${t.macroSectorLabel || 'Macro-Secteur'} *</label>
            <select id="onb-macro-sector" class="form-control" required>
              <option value="">${t.selectMacroSector || '-- Sélectionner un Macro-Secteur --'}</option>
              ${macroSectorsHTML}
            </select>
          </div>

          <!-- 6. Meso Sector -->
          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label">${t.mesoSectorLabel || 'Méso-Secteur'} *</label>
            <select id="onb-meso-sector" class="form-control" required disabled>
              <option value="">${t.selectMesoSector || '-- Sélectionner un Méso-Secteur --'}</option>
            </select>
          </div>

          <button type="submit" id="onb-submit-btn" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; font-size: 14px;">
            Enregistrer et continuer ➔
          </button>
        </form>
      </div>
    </div>
  `;
}

export function attachOnboardingEvents(containerEl, appStateOrCb, translationsOrCb, onCompleteCallback) {
  let appState = {};
  let translations = allTranslations;
  let onDone = null;

  if (typeof appStateOrCb === 'function') {
    onDone = appStateOrCb;
  } else {
    appState = appStateOrCb || {};
    if (typeof translationsOrCb === 'function') {
      onDone = translationsOrCb;
    } else {
      translations = translationsOrCb || allTranslations;
      onDone = onCompleteCallback;
    }
  }

  const lang = appState.lang || 'fr';
  const t = (translations && translations[lang]) ? translations[lang] : (allTranslations[lang] || allTranslations.fr);

  const countrySelect = containerEl.querySelector('#onb-country');
  const regionSelect = containerEl.querySelector('#onb-region');
  const localitySelect = containerEl.querySelector('#onb-locality');
  const macroSelect = containerEl.querySelector('#onb-macro-sector');
  const mesoSelect = containerEl.querySelector('#onb-meso-sector');
  const form = containerEl.querySelector('#onboarding-form');

  if (!countrySelect || !regionSelect || !localitySelect || !macroSelect || !mesoSelect || !form) {
    return;
  }

  let currentCountryObj = locationData.find(c => c.code === (countrySelect.value || 'TN')) || locationData[0];

  function updateRegions() {
    const code = countrySelect.value || 'TN';
    currentCountryObj = locationData.find(c => c.code === code) || locationData[0];
    localitySelect.disabled = true;
    localitySelect.innerHTML = `<option value="">${t.selectLocality || '-- Sélectionner une Localité --'}</option>`;

    if (currentCountryObj && currentCountryObj.regions && currentCountryObj.regions.length > 0) {
      regionSelect.disabled = false;
      regionSelect.innerHTML = `<option value="">${t.selectRegion || '-- Sélectionner une Région --'}</option>` + currentCountryObj.regions.map(r => `
        <option value="${r.id}">${(r.names && (r.names[lang] || r.names.fr)) || r.id}</option>
      `).join('');
    } else {
      regionSelect.disabled = true;
      regionSelect.innerHTML = `<option value="">${t.selectRegion || '-- Sélectionner une Région --'}</option>`;
    }
  }

  // Initial region populate
  updateRegions();

  countrySelect.addEventListener('change', updateRegions);

  regionSelect.addEventListener('change', () => {
    const regionId = regionSelect.value;
    if (currentCountryObj && currentCountryObj.regions) {
      const regionObj = currentCountryObj.regions.find(r => r.id === regionId);
      if (regionObj && regionObj.localities && regionObj.localities.length > 0) {
        localitySelect.disabled = false;
        localitySelect.innerHTML = `<option value="">${t.selectLocality || '-- Sélectionner une Localité --'}</option>` + regionObj.localities.map(loc => `
          <option value="${loc}">${loc}</option>
        `).join('');
      } else {
        localitySelect.disabled = true;
        localitySelect.innerHTML = `<option value="">${t.selectLocality || '-- Sélectionner une Localité --'}</option>`;
      }
    }
  });

  macroSelect.addEventListener('change', () => {
    const macroVal = macroSelect.value;
    const mesos = (sectorData.mesoSectors && sectorData.mesoSectors[macroVal]) || [];
    if (mesos.length > 0) {
      mesoSelect.disabled = false;
      mesoSelect.innerHTML = `<option value="">${t.selectMesoSector || '-- Sélectionner un Méso-Secteur --'}</option>` + mesos.map(m => `
        <option value="${m.id}">${(m.names && (m.names[lang] || m.names.fr)) || m.id}</option>
      `).join('');
    } else {
      mesoSelect.disabled = true;
      mesoSelect.innerHTML = `<option value="">${t.selectMesoSector || '-- Sélectionner un Méso-Secteur --'}</option>`;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = containerEl.querySelector('#onb-submit-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Enregistrement...";
    }

    const businessProfile = {
      actorName: (containerEl.querySelector('#onb-name') ? containerEl.querySelector('#onb-name').value : '').trim(),
      country: countrySelect.value,
      region: regionSelect.value,
      locality: localitySelect.value,
      macroSector: macroSelect.value,
      mesoSector: mesoSelect.value
    };

    if (!appState.currentUser) appState.currentUser = {};
    appState.currentUser.businessProfile = businessProfile;
    appState.currentUser.onboardingComplete = true;

    const uid = appState.currentUser.uid || appState.currentUser.id;
    if (uid) {
      try {
        await firestoreUpdateUserProfile(uid, {
          businessProfile: businessProfile,
          onboardingComplete: true
        });
      } catch (err) {
        console.warn("Error updating user profile in Firestore:", err);
      }
    }

    if (onDone) onDone(appState.currentUser);
  });
}

