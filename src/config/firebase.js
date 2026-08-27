// Firebase SDK Integration — Real Auth + Firestore
// Project: perfect-net

// ── Firebase config ───────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyAWVAGYhQtNDoBL-YQ7RF9IOet8vtigav0",
  authDomain: "perfect-net.firebaseapp.com",
  projectId: "perfect-net",
  storageBucket: "perfect-net.firebasestorage.app",
  messagingSenderId: "213183884101"
};

// ── Dynamic Firebase SDK loader (works in WebView & browser) ──────────────────
let _app = null;
let _auth = null;
let _db = null;

async function getFirebaseModules() {
  if (_app) return { app: _app, auth: _auth, db: _db };

  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
            sendEmailVerification, onAuthStateChanged, signOut } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, getDocs, serverTimestamp } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    _app = initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _db = getFirestore(_app);

    // Expose individual functions on module-level references
    _auth._createUser = createUserWithEmailAndPassword;
    _auth._signIn = signInWithEmailAndPassword;
    _auth._sendVerification = sendEmailVerification;
    _auth._onAuthStateChanged = onAuthStateChanged;
    _auth._signOut = signOut;
    _db._doc = doc;
    _db._getDoc = getDoc;
    _db._setDoc = setDoc;
    _db._updateDoc = updateDoc;
    _db._addDoc = addDoc;
    _db._collection = collection;
    _db._getDocs = getDocs;
    _db._serverTimestamp = serverTimestamp;

    return { app: _app, auth: _auth, db: _db };
  } catch (e) {
    console.warn("Firebase SDK unavailable (offline?), falling back to localStorage.", e);
    return null;
  }
}


// ── Firebase Auth helpers ─────────────────────────────────────────────────────

/**
 * Register a new user with email + password.
 * Saves user profile to Firestore users/{uid}.
 * Sends email verification.
 * Returns { ok: true, user } or { ok: false, error }
 */
export async function firebaseRegister({ email, password, fullName, role }) {
  const modules = await getFirebaseModules();
  if (!modules) return { ok: false, error: "Connexion Firebase indisponible (hors ligne)." };

  const { auth, db } = modules;
  try {
    const cred = await auth._createUser(auth, email, password);
    const user = cred.user;

    // Send verification email
    await auth._sendVerification(user);

    // Save user profile to Firestore
    const userId = `#PRF-${Math.floor(10000 + Math.random() * 90000)}-TN`;
    const profileData = {
      uid: user.uid,
      name: fullName,
      email: email,
      role: role, // 'contributeur' or 'entreprise'
      userId: userId,
      status: "Active",
      expertRequested: false,
      expertApproved: false,
      emailVerified: false,
      registrationDate: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      createdAt: db._serverTimestamp()
    };

    await db._setDoc(db._doc(db, "users", user.uid), profileData);

    return { ok: true, user, profileData };
  } catch (e) {
    console.error("Registration error:", e);
    const msg = _authErrorToFrench(e.code);
    return { ok: false, error: msg };
  }
}

/**
 * Update existing user profile in Firestore (address, phone, age, etc.).
 */
export async function firestoreUpdateUserProfile(uid, updatedFields) {
  const modules = await getFirebaseModules();
  if (!modules) return;
  const { db } = modules;
  try {
    if (uid && db._setDoc && db._doc) {
      await db._setDoc(db._doc(db, "users", uid), updatedFields, { merge: true });
      console.log("User profile updated in Firestore.");
    }
  } catch (e) {
    console.warn("Could not save updated profile to Firestore:", e);
  }
}

/**
 * Fetch fresh user profile from Firestore users/{uid}.
 */
export async function firestoreGetUserProfile(uid) {
  const modules = await getFirebaseModules();
  if (!modules || !uid) return null;
  const { db } = modules;
  try {
    if (db._getDoc && db._doc) {
      const snap = await db._getDoc(db._doc(db, "users", uid));
      if (snap.exists()) return snap.data();
    }
  } catch (err) {
    console.warn("Could not fetch user profile from Firestore:", err);
  }
  return null;
}

/**
 * Sign in existing user.
 * Returns { ok: true, user, emailVerified } or { ok: false, error }
 */
export async function firebaseLogin({ email, password }) {
  const modules = await getFirebaseModules();
  if (!modules) return { ok: false, error: "Connexion Firebase indisponible (hors ligne)." };

  const { auth, db } = modules;
  try {
    const cred = await auth._signIn(auth, email, password);
    const user = cred.user;
    let profileData = null;
    try {
      if (db._getDoc) {
        const snap = await db._getDoc(db._doc(db, "users", user.uid));
        if (snap.exists()) profileData = snap.data();
      }
    } catch (err) {
      console.warn("Could not fetch user profile from Firestore:", err);
    }
    return { ok: true, user, profileData, emailVerified: user.emailVerified };
  } catch (e) {
    console.error("Login error:", e);
    return { ok: false, error: _authErrorToFrench(e.code) };
  }
}

/**
 * Sign out current user.
 */
export async function firebaseSignOut() {
  const modules = await getFirebaseModules();
  if (!modules) return;
  const { auth } = modules;
  try { await auth._signOut(auth); } catch (e) { console.warn("Signout error:", e); }
}

/**
 * Save a new evaluation to Firestore evaluations collection.
 */
export async function firestoreSaveEvaluation(arg1, arg2) {
  const evalData = (arg2 && typeof arg2 === 'object') ? arg2 : arg1;
  const modules = await getFirebaseModules();
  if (!modules) { console.warn("Firestore unavailable, evaluation saved locally only."); return; }
  const { db } = modules;
  try {
    const docRef = await db._addDoc(db._collection(db, "evaluations"), {
      ...evalData,
      createdAt: db._serverTimestamp()
    });
    console.log("Evaluation saved to Firestore with ID:", docRef && docRef.id);
    return docRef ? docRef.id : ("eval-" + Date.now());
  } catch (e) {
    console.error("Firestore save evaluation error:", e);
    return ("eval-" + Date.now());
  }
}

/**
 * Load all evaluations for a given country from Firestore.
 * Returns array of evaluation objects or [] on failure.
 */
export async function firestoreLoadEvaluations(country) {
  const modules = await getFirebaseModules();
  if (!modules) return [];
  const { db } = modules;
  try {
    const { getDocs, query } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(db._collection(db, "evaluations"));
    const snapshot = await getDocs(q);
    const evals = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      // Extract Firestore Timestamp createdAt as both raw seconds (for sorting) and formatted string (for display)
      let createdAtSeconds = 0;
      let createdAtDisplay = '';
      if (d.createdAt && typeof d.createdAt.seconds === 'number') {
        createdAtSeconds = d.createdAt.seconds;
        const dt = new Date(d.createdAt.seconds * 1000);
        createdAtDisplay = dt.toLocaleString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } else if (d.isoDate || d.date) {
        const dt = new Date(d.isoDate || d.date);
        if (!isNaN(dt)) {
          createdAtSeconds = Math.floor(dt.getTime() / 1000);
          createdAtDisplay = dt.toLocaleString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      }
      evals.push({
        id: docSnap.id,
        country: d.country || country || 'TN',
        region: d.region || '',
        locality: d.locality || '',
        authorName: d.authorName || d.author || 'Anonyme',
        authorInitials: d.authorInitials || (d.authorName || d.author || 'A').substring(0, 2).toUpperCase(),
        authorAvatarBg: d.authorAvatarBg || '#002B49',
        authorAvatarColor: d.authorAvatarColor || '#FFFFFF',
        targetEntity: d.targetEntity || d.actorName || d.entity || 'Structure Publique',
        sectorName: d.sectorName || d.macroSector || d.sector || 'Gouvernance',
        macroSector: d.macroSector || d.sectorName || d.sector || 'Gouvernance',
        mesoSector: d.mesoSector || d.subSector || '',
        subSector: d.subSector || d.mesoSector || '',
        pillar: d.pillar || d.societalPillar || 'Social',
        societalPillar: d.societalPillar || d.pillar || 'Social',
        category: d.category || d.indicatorCategory || '',
        indicatorCategory: d.indicatorCategory || d.category || '',
        type: d.type || d.indicatorType || d.kpi || '',
        indicatorType: d.indicatorType || d.type || d.kpi || '',
        kpi: d.kpi || d.type || d.indicatorType || '',
        rating: parseFloat(d.rating || d.score || 0),
        comment: d.comment || '',
        location: (d.locality && d.region)
          ? `${d.locality}, ${d.region}, ${d.country || country || 'TN'}`
          : (d.locality ? `${d.locality}, ${d.country || country || 'TN'}` : (d.region ? `${d.region}, ${d.country || country || 'TN'}` : (d.location || (d.country || country || 'TN')))),
        timeAgo: createdAtDisplay || _computeTimeAgo(d.isoDate || d.date) || d.timeAgo || 'Récemment',
        isoDate: d.isoDate || d.date || null,
        createdAt: d.createdAt || null,
        createdAtSeconds: createdAtSeconds,
        authorEmail: d.authorEmail || d.email || '',
        isTerritoryRating: d.isTerritoryRating || false,
        attachmentName: d.attachmentName || null,
        attachmentBase64: d.attachmentBase64 || d.photoUrl || null,
        photoUrl: d.photoUrl || d.attachmentBase64 || null,
        workflowStep: parseInt(d.workflowStep || d.step || 0),
        workflowUpdatedBy: d.workflowUpdatedBy || '',
        workflowUpdatedAt: d.workflowUpdatedAt || null
      });
    });
    console.log(`Loaded ${evals.length} total evaluations from Firestore.`);
    return evals;
  } catch (e) {
    console.error("Firestore load evaluations error:", e);
    return [];
  }
}

/**
 * Load evaluations submitted by a specific user (by email).
 * Returns array of evaluation objects or [] on failure.
 */
export async function firestoreLoadUserEvaluations(userEmail, userName = '') {
  const modules = await getFirebaseModules();
  if (!modules) return [];
  const { db } = modules;
  if (!userEmail) return [];
  try {
    const { getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    // Strictly filter by authorEmail so new users with 0 ratings see an empty history
    const q = query(db._collection(db, "evaluations"), where('authorEmail', '==', userEmail));
    const snapshot = await getDocs(q);
    const evals = [];

    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      // Extract Firestore Timestamp createdAt for sorting and display
      let createdAtSeconds = 0;
      let createdAtDisplay = '';
      if (d.createdAt && typeof d.createdAt.seconds === 'number') {
        createdAtSeconds = d.createdAt.seconds;
        const dt = new Date(d.createdAt.seconds * 1000);
        createdAtDisplay = dt.toLocaleString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } else if (d.isoDate || d.date) {
        const dt = new Date(d.isoDate || d.date);
        if (!isNaN(dt)) {
          createdAtSeconds = Math.floor(dt.getTime() / 1000);
          createdAtDisplay = dt.toLocaleString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
      }
      const isoDate = d.isoDate || d.date || null;
      evals.push({
        id: docSnap.id,
        country: d.country || 'TN',
        region: d.region || '',
        locality: d.locality || '',
        authorName: d.authorName || d.author || 'Moi',
        authorInitials: d.authorInitials || (d.authorName || d.author || 'M').substring(0, 2).toUpperCase(),
        authorAvatarBg: d.authorAvatarBg || '#002B49',
        authorAvatarColor: d.authorAvatarColor || '#FFFFFF',
        targetEntity: d.targetEntity || d.actorName || d.entity || 'Structure Publique',
        actorName: d.actorName || d.targetEntity || d.entity || 'Structure Publique',
        sectorName: d.sectorName || d.macroSector || d.sector || 'Gouvernance',
        macroSector: d.macroSector || d.sectorName || d.sector || 'Gouvernance',
        mesoSector: d.mesoSector || d.subSector || '',
        subSector: d.subSector || d.mesoSector || '',
        pillar: d.pillar || d.societalPillar || 'Social',
        societalPillar: d.societalPillar || d.pillar || 'Social',
        category: d.category || d.indicatorCategory || '',
        indicatorCategory: d.indicatorCategory || d.category || '',
        type: d.type || d.indicatorType || d.kpi || '',
        indicatorType: d.indicatorType || d.type || d.kpi || '',
        kpi: d.kpi || d.type || d.indicatorType || '',
        rating: parseFloat(d.rating || d.score || 0),
        comment: d.comment || '',
        location: (d.locality && d.region)
          ? `${d.locality}, ${d.region}, ${d.country || 'TN'}`
          : (d.locality ? `${d.locality}, ${d.country || 'TN'}` : (d.region ? `${d.region}, ${d.country || 'TN'}` : (d.location || (d.country || 'TN')))),
        timeAgo: createdAtDisplay || _computeTimeAgo(isoDate) || d.timeAgo || 'Récemment',
        isoDate: isoDate,
        createdAt: d.createdAt || null,
        createdAtSeconds: createdAtSeconds,
        authorEmail: d.authorEmail || d.email || '',
        isTerritoryRating: d.isTerritoryRating || false,
        isExpertRating: d.isExpertRating || false,
        attachmentName: d.attachmentName || null,
        attachmentBase64: d.attachmentBase64 || d.photoUrl || null,
        photoUrl: d.photoUrl || d.attachmentBase64 || null,
        workflowStep: parseInt(d.workflowStep || d.step || 0),
        workflowUpdatedBy: d.workflowUpdatedBy || '',
        workflowUpdatedAt: d.workflowUpdatedAt || null
      });
    });
    console.log(`Loaded ${evals.length} evaluations for ${userEmail} from Firestore.`);
    return evals;
  } catch (e) {
    console.error("Firestore load user evaluations error:", e);
    return [];
  }
}

/**
 * Update workflow stage (1-5, or 0) for an evaluation.
 * Uses only pre-cached Firebase functions (no secondary dynamic imports).
 */
export async function firestoreUpdateEvaluationWorkflow(evalId, workflowStep, updaterEmail = '', targetEntity = '', clientName = '') {
  const stepNum = parseInt(workflowStep) || 0;
  const modules = await getFirebaseModules();
  if (!modules) { console.warn('[WF] Firebase modules not available'); return false; }
  const { db } = modules;

  if (!db._setDoc || !db._doc || !db._getDocs || !db._collection) {
    console.warn('[WF] Required Firestore functions not cached on db');
    return false;
  }

  const updateData = {
    workflowStep: stepNum,
    workflowUpdatedBy: updaterEmail || '',
    workflowUpdatedAt: new Date().toISOString()
  };

  let updated = false;

  // ── Step 1: Direct update by evalId (if it's a real Firestore doc ID) ──
  const isSyntheticId = !evalId || evalId.startsWith('ent-eval-') || evalId.startsWith('uh-') || evalId.startsWith('eval-');
  if (!isSyntheticId) {
    try {
      const docRef = db._doc(db, 'evaluations', evalId);
      await db._setDoc(docRef, updateData, { merge: true });
      console.log(`[WF] Direct setDoc OK → doc ${evalId} workflowStep=${stepNum}`);
      updated = true;
    } catch (err) {
      console.warn(`[WF] Direct setDoc failed for ${evalId}:`, String(err));
    }
  }

  // ── Step 2: Fallback – scan collection and match by entity/author ──
  // This handles cases where evalId is synthetic or direct update failed.
  try {
    const norm = (s) => !s ? '' : String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const tNorm = norm(targetEntity);
    const cNorm = norm(clientName);

    const colRef = db._collection(db, 'evaluations');
    const snapshot = await db._getDocs(colRef);

    const updatePromises = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      const dTarget = norm(d.targetEntity || d.actorName || d.entity || '');
      const dAuthor = norm(d.authorName || d.author || '');

      const isExactId = docSnap.id === evalId;
      const isEntityMatch = tNorm && dTarget && (dTarget === tNorm || dTarget.includes(tNorm) || tNorm.includes(dTarget));
      const isAuthorMatch = !cNorm || (dAuthor && (dAuthor === cNorm || dAuthor.includes(cNorm) || cNorm.includes(dAuthor)));

      if (isExactId || (isEntityMatch && isAuthorMatch)) {
        const ref = db._doc(db, 'evaluations', docSnap.id);
        updatePromises.push(
          db._setDoc(ref, updateData, { merge: true })
            .then(() => { console.log(`[WF] Fallback setDoc OK → doc ${docSnap.id} workflowStep=${stepNum}`); updated = true; })
            .catch(e => console.warn(`[WF] Fallback setDoc failed for ${docSnap.id}:`, String(e)))
        );
      }
    });

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    } else if (!updated) {
      console.warn(`[WF] No matching Firestore doc found for evalId=${evalId} entity=${targetEntity} author=${clientName}`);
    }
  } catch (scanErr) {
    console.warn('[WF] Collection scan error:', String(scanErr));
  }

  return updated;
}


/**
 * Load all registered users from Firestore users collection (for admin panel).
 * Returns array of user profile objects.
 */
export async function firestoreLoadAllUsers() {
  const modules = await getFirebaseModules();
  if (!modules) return [];
  const { db } = modules;
  try {
    const { getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snapshot = await getDocs(db._collection(db, 'users'));
    const users = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      users.push({
        id: d.uid || docSnap.id,
        uid: d.uid || docSnap.id,
        name: d.name || d.fullName || d.displayName || 'Utilisateur',
        email: d.email || '',
        role: d.role || 'contributeur',
        status: d.status || 'Active',
        userId: d.userId || '',
        expertRequested: d.expertRequested || false,
        expertApproved: d.expertApproved || false,
        registrationDate: d.registrationDate || '',
        emailVerified: d.emailVerified || false,
        businessProfile: d.businessProfile || null,
        onboardingComplete: d.onboardingComplete || false,
        isVerified: d.isVerified || false,
        verificationPending: d.verificationPending || false,
        avatarBase64: d.avatarBase64 || d.photoURL || null,
        photoURL: d.photoURL || d.avatarBase64 || null,
        idDocBase64: d.idDocBase64 || null,
        idDocName: d.idDocName || null,
        idDocType: d.idDocType || null,
        idDocDate: d.idDocDate || null
      });
    });
    console.log(`Loaded ${users.length} users from Firestore.`);
    return users;
  } catch (e) {
    console.error('Firestore load all users error:', e);
    return [];
  }
}

/**
 * Load conversations involving a user (by email).
 */
export async function firestoreLoadUserConversations(userEmail) {
  if (!userEmail) return [];
  const modules = await getFirebaseModules();
  let firestoreConvs = [];
  if (modules) {
    const { db } = modules;
    try {
      const { getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const qClient = query(db._collection(db, "conversations"), where('clientEmail', '==', userEmail));
      const qEnt = query(db._collection(db, "conversations"), where('enterpriseEmail', '==', userEmail));
      const [snapClient, snapEnt] = await Promise.all([
        getDocs(qClient).catch(() => null),
        getDocs(qEnt).catch(() => null)
      ]);
      
      const convMap = new Map();
      const addSnap = (snap) => {
        if (snap) {
          snap.forEach(docSnap => {
            const d = docSnap.data();
            convMap.set(docSnap.id, { id: docSnap.id, ...d });
          });
        }
      };
      addSnap(snapClient);
      addSnap(snapEnt);
      firestoreConvs = Array.from(convMap.values());
    } catch (e) {
      console.warn("Firestore load conversations error, using local storage cache:", e);
    }
  }

  // Merge with local storage cache
  let localConvs = [];
  try {
    const raw = localStorage.getItem("PERFECT_CONVERSATIONS_V1");
    if (raw) localConvs = JSON.parse(raw);
  } catch (e) {}

  const mergedMap = new Map();
  localConvs.forEach(c => {
    if (c && (c.clientEmail === userEmail || c.enterpriseEmail === userEmail)) {
      mergedMap.set(c.id, c);
    }
  });
  firestoreConvs.forEach(c => {
    if (c) mergedMap.set(c.id, c);
  });

  const list = Array.from(mergedMap.values()).sort((a, b) => (b.lastUpdatedSeconds || 0) - (a.lastUpdatedSeconds || 0));
  return list;
}

/**
 * Send a message in a conversation (creates or updates the thread).
 */
export async function firestoreSendMessage({ evalId, enterpriseName, enterpriseEmail, clientName, clientEmail, senderRole, senderName, text }) {
  const now = new Date();
  const dateDisplay = now.toLocaleString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const seconds = Math.floor(now.getTime() / 1000);

  const cleanEntEmail = (enterpriseEmail || 'entreprise').trim().toLowerCase();
  const cleanCliEmail = (clientEmail || 'client').trim().toLowerCase();
  const convId = `conv_${evalId || 'direct'}_${cleanEntEmail}_${cleanCliEmail}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  const newMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderRole, // 'entreprise' or 'contributeur'
    senderName,
    text,
    dateDisplay,
    timestamp: now.toISOString(),
    createdAtSeconds: seconds
  };

  // 1. Update local storage
  let localConvs = [];
  try {
    const raw = localStorage.getItem("PERFECT_CONVERSATIONS_V1");
    if (raw) localConvs = JSON.parse(raw);
  } catch (e) {}

  let existing = localConvs.find(c => c.id === convId);
  if (existing) {
    existing.messages = existing.messages || [];
    existing.messages.push(newMsg);
    existing.lastMessage = text;
    existing.lastUpdatedSeconds = seconds;
    existing.lastUpdatedDisplay = dateDisplay;
    if (senderRole === 'entreprise') existing.unreadForClient = true;
    if (senderRole === 'contributeur') existing.unreadForEnterprise = true;
  } else {
    existing = {
      id: convId,
      evalId: evalId || '',
      enterpriseName: enterpriseName || 'Établissement',
      enterpriseEmail: enterpriseEmail || '',
      clientName: clientName || 'Client',
      clientEmail: clientEmail || '',
      messages: [newMsg],
      lastMessage: text,
      lastUpdatedSeconds: seconds,
      lastUpdatedDisplay: dateDisplay,
      unreadForClient: senderRole === 'entreprise',
      unreadForEnterprise: senderRole === 'contributeur'
    };
    localConvs.push(existing);
  }
  localStorage.setItem("PERFECT_CONVERSATIONS_V1", JSON.stringify(localConvs));

  // 2. Sync to Firestore
  const modules = await getFirebaseModules();
  if (modules) {
    const { db } = modules;
    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const docRef = doc(db, "conversations", convId);
      await setDoc(docRef, existing, { merge: true });
    } catch (e) {
      console.warn("Firestore save conversation error (offline fallback active):", e);
    }
  }

  return existing;
}

/**
 * Mark a conversation as read for the user.
 */
export async function firestoreMarkConversationRead(convId, userRole) {
  try {
    const raw = localStorage.getItem("PERFECT_CONVERSATIONS_V1");
    if (raw) {
      const localConvs = JSON.parse(raw);
      const conv = localConvs.find(c => c.id === convId);
      if (conv) {
        if (userRole === 'contributeur') conv.unreadForClient = false;
        if (userRole === 'entreprise') conv.unreadForEnterprise = false;
        localStorage.setItem("PERFECT_CONVERSATIONS_V1", JSON.stringify(localConvs));
      }
    }
  } catch (e) {}

  const modules = await getFirebaseModules();
  if (modules) {
    const { db } = modules;
    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const docRef = doc(db, "conversations", convId);
      const updateData = {};
      if (userRole === 'contributeur') updateData.unreadForClient = false;
      if (userRole === 'entreprise') updateData.unreadForEnterprise = false;
      await setDoc(docRef, updateData, { merge: true });
    } catch (e) {}
  }
}

/**
 * Save a workshop/event request to Firestore collection "workshop_requests" and local storage.
 */
export async function firestoreSaveWorkshopRequest(requestData) {
  const reqId = requestData.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const fullReq = {
    ...requestData,
    id: reqId,
    status: requestData.status || 'En attente',
    createdAt: requestData.createdAt || new Date().toISOString(),
    createdAtSeconds: requestData.createdAtSeconds || Math.floor(Date.now() / 1000),
    dateDisplay: requestData.dateDisplay || new Date().toLocaleString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  };

  // 1. Local storage cache
  try {
    const raw = localStorage.getItem("PERFECT_WORKSHOP_REQUESTS_V1");
    let localReqs = raw ? JSON.parse(raw) : [];
    localReqs = [fullReq, ...localReqs.filter(r => r.id !== reqId)];
    localStorage.setItem("PERFECT_WORKSHOP_REQUESTS_V1", JSON.stringify(localReqs));
  } catch (e) {}

  // 2. Firestore sync
  const modules = await getFirebaseModules();
  if (modules) {
    const { db } = modules;
    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const docRef = doc(db, "workshop_requests", reqId);
      await setDoc(docRef, fullReq, { merge: true });
      console.log('Workshop request saved to Firestore successfully:', reqId);
    } catch (e) {
      console.warn('Firestore workshop request save failed, stored locally:', e);
    }
  }
  return fullReq;
}

/**
 * Load all workshop/event requests from Firestore and local storage.
 */
export async function firestoreLoadWorkshopRequests() {
  let firestoreReqs = [];
  const modules = await getFirebaseModules();
  if (modules) {
    const { db } = modules;
    try {
      const { getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const snapshot = await getDocs(db._collection(db, "workshop_requests"));
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        firestoreReqs.push({ id: docSnap.id, ...d });
      });
    } catch (e) {
      console.warn('Firestore load workshop requests error:', e);
    }
  }

  // Merge with local storage
  let localReqs = [];
  try {
    const raw = localStorage.getItem("PERFECT_WORKSHOP_REQUESTS_V1");
    if (raw) localReqs = JSON.parse(raw);
  } catch (e) {}

  const mergedMap = new Map();
  localReqs.forEach(r => { if (r && r.id) mergedMap.set(r.id, r); });
  firestoreReqs.forEach(r => { if (r && r.id) mergedMap.set(r.id, r); });

  const list = Array.from(mergedMap.values()).sort((a, b) => (b.createdAtSeconds || 0) - (a.createdAtSeconds || 0));
  return list;
}

/**
 * Update the status of a workshop request (e.g. 'En attente' -> 'Traité').
 */
export async function firestoreUpdateWorkshopRequestStatus(requestId, newStatus) {
  // 1. Local storage
  try {
    const raw = localStorage.getItem("PERFECT_WORKSHOP_REQUESTS_V1");
    if (raw) {
      let localReqs = JSON.parse(raw);
      localReqs = localReqs.map(r => r.id === requestId ? { ...r, status: newStatus } : r);
      localStorage.setItem("PERFECT_WORKSHOP_REQUESTS_V1", JSON.stringify(localReqs));
    }
  } catch (e) {}

  // 2. Firestore
  const modules = await getFirebaseModules();
  if (modules) {
    const { db } = modules;
    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const docRef = doc(db, "workshop_requests", requestId);
      await setDoc(docRef, { status: newStatus }, { merge: true });
    } catch (e) {
      console.warn('Firestore update workshop status failed:', e);
    }
  }
}

/**
 * Compute a French relative time string from an ISO date string.
 */
function _computeTimeAgo(isoDate) {
  if (!isoDate) return null;
  try {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    if (isNaN(then)) return null;
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH   = Math.floor(diffMs / 3600000);
    const diffD   = Math.floor(diffMs / 86400000);
    const diffW   = Math.floor(diffD / 7);
    const diffM   = Math.floor(diffD / 30);
    if (diffMin < 2)  return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH   < 24) return `Il y a ${diffH} h`;
    if (diffD   === 1) return "Hier";
    if (diffD   < 7)  return `Il y a ${diffD} jours`;
    if (diffW   === 1) return "Il y a 1 semaine";
    if (diffW   < 5)  return `Il y a ${diffW} semaines`;
    if (diffM   === 1) return "Il y a 1 mois";
    return `Il y a ${diffM} mois`;
  } catch { return null; }
}

// ── French-language Firebase error messages ───────────────────────────────────
function _authErrorToFrench(code) {
  const map = {
    'auth/email-already-in-use': "Cette adresse email est déjà utilisée. Veuillez vous connecter.",
    'auth/invalid-email': "L'adresse email n'est pas valide.",
    'auth/weak-password': "Le mot de passe doit contenir au moins 6 caractères.",
    'auth/user-not-found': "Aucun compte trouvé avec cet email.",
    'auth/wrong-password': "Mot de passe incorrect.",
    'auth/too-many-requests': "Trop de tentatives. Veuillez réessayer plus tard.",
    'auth/network-request-failed': "Erreur réseau. Vérifiez votre connexion internet.",
    'auth/invalid-credential': "Email ou mot de passe incorrect."
  };
  return map[code] || `Erreur d'authentification (${code}).`;
}

// ── LocalStorage fallback engine (used for app state & offline) ───────────────
class StorageEngine {
  constructor() {
    this.storageKey = "PERFECT_NET_DATABASE_V1";
  }

  loadState(initialData) {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedContributors = (parsed.adminStats && parsed.adminStats.contributors)
          ? parsed.adminStats.contributors.filter(c => !c.id || !c.id.match(/^u[1-6]$/))
          : [];

        return {
          ...initialData,
          ...parsed,
          recentEvaluations: parsed.recentEvaluations || [],
          topActors: initialData.topActors,
          adminStats: {
            ...initialData.adminStats,
            ...(parsed.adminStats || {}),
            contributors: savedContributors
          }
        };
      }
    } catch (e) {
      console.warn("Could not access localStorage, using initial state.", e);
    }
    this.saveState(initialData);
    return initialData;
  }

  saveState(state) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }

  addEvaluation(stateOrEval, maybeEval) {
    let state = (maybeEval !== undefined && typeof stateOrEval === 'object') ? stateOrEval : (this.lastLoadedState || {});
    let newEval = (maybeEval !== undefined) ? maybeEval : stateOrEval;

    if (!newEval || typeof newEval !== 'object') {
      return state;
    }

    const updatedEvaluations = [newEval, ...(state.evaluations || [])];

    // Format item for recentEvaluations feed (dashboard/analytics cards)
    const authorName = newEval.authorName || newEval.author || "Contributeur";
    const initials = authorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "CN";
    const newRecentEval = {
      id: newEval.id || ("rev-" + Date.now()),
      country: newEval.country || "TN",
      region: newEval.region || "",
      locality: newEval.locality || "",
      authorName: authorName,
      authorInitials: initials,
      authorAvatarBg: "#002B49",
      authorAvatarColor: "#FFFFFF",
      targetEntity: newEval.actorName || newEval.targetEntity || "Acteur Public",
      actorName: newEval.actorName || newEval.targetEntity || "Acteur Public",
      sectorName: newEval.sectorName || newEval.macroSector || "Gouvernance",
      macroSector: newEval.macroSector || newEval.sectorName || "Gouvernance",
      mesoSector: newEval.mesoSector || newEval.subSector || "",
      subSector: newEval.subSector || newEval.mesoSector || "",
      pillar: newEval.pillar || newEval.societalPillar || "Social",
      societalPillar: newEval.societalPillar || newEval.pillar || "Social",
      category: newEval.category || newEval.indicatorCategory || "",
      indicatorCategory: newEval.indicatorCategory || newEval.category || "",
      type: newEval.type || newEval.indicatorType || newEval.kpi || "",
      indicatorType: newEval.indicatorType || newEval.type || newEval.kpi || "",
      kpi: newEval.kpi || newEval.type || newEval.indicatorType || "",
      rating: parseFloat(newEval.rating) || 4.0,
      comment: newEval.comment || "Évaluation transmise sur la plateforme.",
      location: (newEval.locality && newEval.region)
        ? `${newEval.locality}, ${newEval.region}, ${newEval.country || 'TN'}`
        : (newEval.locality ? `${newEval.locality}, ${newEval.country || 'TN'}` : (newEval.region ? `${newEval.region}, ${newEval.country || 'TN'}` : (newEval.location || (newEval.country || 'TN')))),
      timeAgo: "À l'instant",
      createdAtSeconds: Math.floor(Date.now() / 1000),
      attachmentName: newEval.attachmentName || null,
      photoUrl: newEval.photoUrl || newEval.attachmentBase64 || null
    };

    const updatedRecentEvaluations = [newRecentEval, ...(state.recentEvaluations || [])];

    // Recalculate average scores
    let totalScore = 0;
    let econSum = 0, econCount = 0;
    let socialSum = 0, socialCount = 0;
    let envSum = 0, envCount = 0;

    updatedEvaluations.forEach(ev => {
      totalScore += ev.rating;
      if (ev.pillar === "Economic") { econSum += ev.rating; econCount++; }
      if (ev.pillar === "Social") { socialSum += ev.rating; socialCount++; }
      if (ev.pillar === "Environmental") { envSum += ev.rating; envCount++; }
    });

    const newOverall = parseFloat((totalScore / updatedEvaluations.length).toFixed(1));
    const newPillars = {
      Economic: econCount ? parseFloat((econSum / econCount).toFixed(1)) : (state.pillarScores ? state.pillarScores.Economic : 4.0),
      Social: socialCount ? parseFloat((socialSum / socialCount).toFixed(1)) : (state.pillarScores ? state.pillarScores.Social : 4.2),
      Environmental: envCount ? parseFloat((envSum / envCount).toFixed(1)) : (state.pillarScores ? state.pillarScores.Environmental : 3.8)
    };

    const newState = {
      ...state,
      overallScore: newOverall,
      pillarScores: newPillars,
      evaluations: updatedEvaluations,
      recentEvaluations: updatedRecentEvaluations
    };

    this.saveState(newState);
    return newState;
  }
}

export const dbStorage = new StorageEngine();
