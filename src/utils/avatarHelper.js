/**
 * Avatar & Verification resolution and rendering helpers for PerfECT evaluation cards.
 */

/**
 * Resolves the author's avatar URL or base64 image for an evaluation item.
 * Checks:
 * 1. item.authorAvatarUrl / item.authorPhoto / item.authorAvatar
 * 2. Current logged in user (if email or name matches)
 * 3. All registered users list in appState.allUsers (if email or name matches)
 * 4. Falls back to null if no photo is configured
 */
export function getAuthorAvatarUrl(item, appState) {
  if (!item) return null;
  if (item.authorAvatarUrl && typeof item.authorAvatarUrl === 'string' && item.authorAvatarUrl.trim()) {
    return item.authorAvatarUrl.trim();
  }
  if (item.authorPhoto && typeof item.authorPhoto === 'string' && item.authorPhoto.trim()) {
    return item.authorPhoto.trim();
  }
  if (item.authorAvatar && typeof item.authorAvatar === 'string' && (item.authorAvatar.startsWith('data:') || item.authorAvatar.startsWith('http'))) {
    return item.authorAvatar.trim();
  }

  const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  const authorEmail = norm(item.authorEmail || item.email || '');
  const authorName = norm(item.authorName || item.author || '');

  // 1. Match against currentUser
  const curUser = appState && appState.currentUser;
  if (curUser) {
    const curEmail = norm(curUser.email || '');
    const curName = norm(curUser.name || curUser.displayName || '');
    if ((authorEmail && curEmail && authorEmail === curEmail) || (authorName && curName && (authorName === curName || authorName.includes(curName) || curName.includes(authorName)))) {
      if (curUser.avatarBase64) return curUser.avatarBase64;
      if (curUser.photoURL) return curUser.photoURL;
    }
  }

  // 2. Match against allUsers list
  const allUsers = (appState && appState.allUsers) || (appState && appState.data && appState.data.allUsers) || (appState && appState.data && appState.data.adminStats && appState.data.adminStats.contributors) || [];
  if (Array.isArray(allUsers) && allUsers.length > 0) {
    const matched = allUsers.find(u => {
      if (!u) return false;
      const uEmail = norm(u.email || '');
      if (authorEmail && uEmail && authorEmail === uEmail) return true;
      const uName = norm(u.name || u.displayName || u.fullName || '');
      if (authorName && uName && (authorName === uName || authorName.includes(uName) || uName.includes(authorName))) return true;
      return false;
    });
    if (matched && (matched.avatarBase64 || matched.photoURL)) {
      return matched.avatarBase64 || matched.photoURL;
    }
  }

  return null;
}

/**
 * Checks whether the author of an evaluation item has a verified account (isVerified === true).
 */
export function isAuthorVerified(item, appState) {
  if (!item) return false;
  // 1. If explicitly marked verified on the item itself
  if (item.authorIsVerified === true || item.isVerified === true) return true;

  const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  const authorEmail = norm(item.authorEmail || item.email || '');
  const authorName = norm(item.authorName || item.author || '');

  // 1. Check currentUser
  const curUser = appState && appState.currentUser;
  if (curUser) {
    const curEmail = norm(curUser.email || '');
    const curName = norm(curUser.name || curUser.displayName || '');
    if ((authorEmail && curEmail && authorEmail === curEmail) || (authorName && curName && (authorName === curName || authorName.includes(curName) || curName.includes(authorName)))) {
      if (curUser.isVerified) return true;
    }
  }

  // 2. Check allUsers list
  const allUsers = (appState && appState.allUsers) || (appState && appState.data && appState.data.allUsers) || (appState && appState.data && appState.data.adminStats && appState.data.adminStats.contributors) || [];
  if (Array.isArray(allUsers) && allUsers.length > 0) {
    const matched = allUsers.find(u => {
      if (!u) return false;
      const uEmail = norm(u.email || '');
      if (authorEmail && uEmail && authorEmail === uEmail) return true;
      const uName = norm(u.name || u.displayName || u.fullName || '');
      if (authorName && uName && (authorName === uName || authorName.includes(uName) || uName.includes(authorName))) return true;
      return false;
    });
    if (matched && Boolean(matched.isVerified)) {
      return true;
    }
  }

  return false;
}

/**
 * Renders the green 9-pointed verified star badge with a white checkmark.
 */
export function renderAuthorVerifiedBadgeHTML(item, appState) {
  if (!isAuthorVerified(item, appState)) return '';
  return `
    <span class="author-verified-badge" title="Compte vérifié ✓" style="display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; margin-left: 4px; flex-shrink: 0; cursor: help;">
      <svg width="15" height="15" viewBox="0 0 24 24" style="flex-shrink: 0; display: block;">
        <polygon points="12,1.5 14.9,4 18.8,4 19.4,7.8 22.3,10.2 20.4,13.5 21.1,17.3 17.5,18.5 15.6,21.9 12,20.5 8.4,21.9 6.5,18.5 2.9,17.3 3.6,13.5 1.7,10.2 4.6,7.8 5.2,4 9.1,4" fill="#00A859" />
        <polyline points="8,12 11,15 16.5,9" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  `;
}

/**
 * Renders the author avatar circle HTML.
 * If avatar URL is present, renders a circular <img> with fallback to initials on error.
 * If not present, renders the standard initials circle.
 */
export function renderAuthorAvatarHTML(item, appState, defaultInitials = 'U', fallbackBg = '#002B49', fallbackColor = '#FFFFFF') {
  const avatarUrl = getAuthorAvatarUrl(item, appState);
  const initials = item.authorInitials || defaultInitials;
  const bg = item.authorAvatarBg || fallbackBg;
  const color = item.authorAvatarColor || fallbackColor;
  const authorName = item.authorName || item.author || 'Utilisateur';

  if (avatarUrl) {
    return `
      <div class="rating-user-avatar-circle" style="background: ${bg}; color: ${color}; position: relative; overflow: hidden;" title="${authorName}">
        <img src="${avatarUrl}" alt="${authorName}" class="rating-user-avatar-img" onerror="this.onerror=null; this.style.display='none'; this.parentElement.textContent='${initials}';" />
      </div>
    `;
  }

  return `
    <div class="rating-user-avatar-circle" style="background: ${bg}; color: ${color};">
      ${initials}
    </div>
  `;
}
