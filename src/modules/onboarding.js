// Onboarding Module for Business Accounts
import { locationData } from '../data/locations.js';
import { sectorData } from '../data/sectors.js';
import { firestoreUpdateUserProfile } from '../config/firebase.js';

export function renderOnboardingView(appState, translations) {
  const lang = appState.lang || 'fr';
  const t = translations[lang] || translations.fr;
  const user = appState.currentUser || {};

  const countryOptionsHTML = locationData.map(c => `
    <option value="${c.code}" ${c.code === 'TN' ? 'selected' : ''}>${c.flag} ${c.names[lang] || c.names.fr}</option>
  `).join('');

  const macroSectorsHTML = sectorData.macroSectors.map(ms => `
    <option value="${ms}">${t.sectors[ms] || ms}</option>
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
            <label class="form-label">${t.countryLabel} *</label>
            <select id="onb-country" class="form-control" required>
              ${countryOptionsHTML}
            </select>
          </div>

          <!-- 3. Region / Governorate -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">${t.regionLabel} *</label>
            <select id="onb-region" class="form-control" required>
              <option value="">${t.selectRegion}</option>
            </select>
          </div>

          <!-- 4. Delegation / Locality -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">${t.localitiesLabel} *</label>
            <select id="onb-locality" class="form-control" required disabled>
              <option value="">${t.selectLocality}</option>
            </select>
          </div>

          <!-- 5. Macro Sector -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label">${t.macroSectorLabel} *</label>
            <select id="onb-macro-sector" class="form-control" required>
              <option value="">${t.selectMacroSector}</option>
              ${macroSectorsHTML}
            </select>
          </div>

          <!-- 6. Meso Sector -->
          <div class="form-group" style="margin-bottom: 20px;">
            <label class="form-label">${t.mesoSectorLabel} *</label>
            <select id="onb-meso-sector" class="form-control" required disabled>
              <option value="">${t.selectMesoSector}</option>
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

export function attachOnboardingEvents(containerEl, appState, translations, onCompleteCallback) {
  const lang = appState.lang || 'fr';
  const t = translations[lang] || translations.fr;

  const countrySelect = containerEl.querySelector('#onb-country');
  const regionSelect = containerEl.querySelector('#onb-region');
  const localitySelect = containerEl.querySelector('#onb-locality');
  const macroSelect = containerEl.querySelector('#onb-macro-sector');
  const mesoSelect = containerEl.querySelector('#onb-meso-sector');
  const form = containerEl.querySelector('#onboarding-form');

  let currentCountryObj = locationData.find(c => c.code === 'TN') || locationData[0];

  function updateRegions() {
    const code = countrySelect.value;
    currentCountryObj = locationData.find(c => c.code === code);
    localitySelect.disabled = true;
    localitySelect.innerHTML = `<option value="">${t.selectLocality}</option>`;

    if (currentCountryObj && currentCountryObj.regions) {
      regionSelect.disabled = false;
      regionSelect.innerHTML = `<option value="">${t.selectRegion}</option>` + currentCountryObj.regions.map(r => `
        <option value="${r.id}">${r.names[lang] || r.names.fr}</option>
      `).join('');
    } else {
      regionSelect.disabled = true;
      regionSelect.innerHTML = `<option value="">${t.selectRegion}</option>`;
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
        localitySelect.innerHTML = `<option value="">${t.selectLocality}</option>` + regionObj.localities.map(loc => `
          <option value="${loc}">${loc}</option>
        `).join('');
      } else {
        localitySelect.disabled = true;
        localitySelect.innerHTML = `<option value="">${t.selectLocality}</option>`;
      }
    }
  });

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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = containerEl.querySelector('#onb-submit-btn');
    btn.disabled = true;
    btn.textContent = "Enregistrement...";

    const businessProfile = {
      actorName: containerEl.querySelector('#onb-name').value.trim(),
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
      await firestoreUpdateUserProfile(uid, {
        businessProfile: businessProfile,
        onboardingComplete: true
      });
    }

    if (onCompleteCallback) onCompleteCallback();
  });
}
