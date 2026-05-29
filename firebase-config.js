// ╔══════════════════════════════════════════════════════════╗
// ║         FIREBASE CONFIG — BiznesApp v3.0                ║
// ║   Firestore + Storage + Auth (anonim)                   ║
// ╚══════════════════════════════════════════════════════════╝

// ─── Firebase loyiha sozlamalari ─────────────────────────────
// ⚠️  Quyidagi qiymatlarni Firebase Console dan oling:
//     console.firebase.google.com → Project Settings → General
const FIREBASE_CONFIG = {
  apiKey:            localStorage.getItem('fb_apiKey')            || "AIzaSyDEMO_ReplaceWithRealKey",
  authDomain:        localStorage.getItem('fb_authDomain')        || "biznesuchun.firebaseapp.com",
  projectId:         localStorage.getItem('fb_projectId')         || "biznesuchun",
  storageBucket:     localStorage.getItem('fb_storageBucket')     || "biznesuchun.appspot.com",
  messagingSenderId: localStorage.getItem('fb_messagingSenderId') || "000000000000",
  appId:             localStorage.getItem('fb_appId')             || "1:000000000000:web:000000000000",
};

// ─── Global holat ─────────────────────────────────────────────
window.FB_STATE = {
  ready:     false,
  uid:       null,
  error:     null,
  mode:      'offline', // 'online' | 'offline'
  listeners: [],        // Aktiv real-time listenerlar (unsubscribe uchun)
};

// ─── Firebase ob'ektlari ──────────────────────────────────────
window.fbApp  = null;
window.fbAuth = null;
window.fbDb   = null;   // Firestore
window.fbStorage = null;

// ─── SDK URL lar ─────────────────────────────────────────────
const FB_SDK = {
  app:       'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  auth:      'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  firestore: 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  storage:   'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
};

// ─── Skript yuklash helper ────────────────────────────────────
function _loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Script yuklanmadi: ' + src));
    document.head.appendChild(s);
  });
}

// ─── Firebase asosiy init ─────────────────────────────────────
async function initFirebase() {
  try {
    updateFbBadge('loading');

    // 1. SDK larni ketma-ket yuklash
    await _loadScript(FB_SDK.app);
    await _loadScript(FB_SDK.auth);
    await _loadScript(FB_SDK.firestore);
    await _loadScript(FB_SDK.storage);

    // 2. App init
    if (!firebase.apps.length) {
      window.fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      window.fbApp = firebase.apps[0];
    }

    window.fbAuth    = firebase.auth();
    window.fbDb      = firebase.firestore();
    window.fbStorage = firebase.storage();

    // 3. Offline persistence (telefon/kompyuter uchun)
    try {
      await window.fbDb.enablePersistence({ synchronizeTabs: true });
      console.log('✅ Offline persistence yoqildi');
    } catch (e) {
      if (e.code === 'failed-precondition') {
        console.warn('⚠️  Persistence: ko\'p tab ochiq');
      } else if (e.code === 'unimplemented') {
        console.warn('⚠️  Persistence bu brauzerda ishlamaydi');
      }
    }

    // 4. Anonim login
    await signInAnon();

    console.log('✅ Firebase tayyor. UID:', window.FB_STATE.uid);
    return true;

  } catch (err) {
    window.FB_STATE.error = err.message;
    window.FB_STATE.mode  = 'offline';
    console.error('❌ Firebase ulanmadi:', err.message);
    updateFbBadge('offline');
    showToast('Firebase ulanmadi — lokal rejimda ishlayapti', 'warning');
    return false;
  }
}

// ─── Anonim login ─────────────────────────────────────────────
async function signInAnon() {
  const user = await new Promise((resolve) => {
    const unsub = window.fbAuth.onAuthStateChanged(u => { unsub(); resolve(u); });
  });

  if (user) {
    window.FB_STATE.uid   = user.uid;
    window.FB_STATE.ready = true;
    window.FB_STATE.mode  = 'online';
    updateFbBadge('online');
    return user;
  }

  // Yangi anonim kirish
  const cred = await window.fbAuth.signInAnonymously();
  window.FB_STATE.uid   = cred.user.uid;
  window.FB_STATE.ready = true;
  window.FB_STATE.mode  = 'online';
  updateFbBadge('online');
  localStorage.setItem('fb_uid', cred.user.uid);
  return cred.user;
}

// ─── Firebase sozlamalarni saqlash ────────────────────────────
function saveFirebaseConfig(cfg) {
  Object.entries(cfg).forEach(([k, v]) => localStorage.setItem('fb_' + k, v));
  FIREBASE_CONFIG.apiKey            = cfg.apiKey            || FIREBASE_CONFIG.apiKey;
  FIREBASE_CONFIG.authDomain        = cfg.authDomain        || FIREBASE_CONFIG.authDomain;
  FIREBASE_CONFIG.projectId         = cfg.projectId         || FIREBASE_CONFIG.projectId;
  FIREBASE_CONFIG.storageBucket     = cfg.storageBucket     || FIREBASE_CONFIG.storageBucket;
  FIREBASE_CONFIG.messagingSenderId = cfg.messagingSenderId || FIREBASE_CONFIG.messagingSenderId;
  FIREBASE_CONFIG.appId             = cfg.appId             || FIREBASE_CONFIG.appId;
}

// ─── Foydalanuvchi PATH (har bir user o'z datasi) ─────────────
function userPath(collection) {
  const uid = window.FB_STATE.uid || 'demo';
  return `users/${uid}/${collection}`;
}

// ─── Badge yangilash ─────────────────────────────────────────
function updateFbBadge(state) {
  const badge = document.getElementById('fb-status-badge');
  if (!badge) return;
  const map = {
    loading: { text: '⏳ Ulanmoqda', bg: '#fef3c7', color: '#92400e' },
    online:  { text: '☁️ Bulut',     bg: '#d1fae5', color: '#065f46' },
    offline: { text: '💾 Lokal',     bg: '#fee2e2', color: '#991b1b' },
  };
  const s = map[state] || map.offline;
  badge.textContent       = s.text;
  badge.style.background  = s.bg;
  badge.style.color       = s.color;
  badge.title = state === 'online'
    ? `UID: ${window.FB_STATE.uid}`
    : 'Firebase ulanmagan';
}

// ─── Eksport / Import modal ────────────────────────────────────
function openFirebaseModal() {
  document.getElementById('fb-apikey-input').value    = localStorage.getItem('fb_apiKey')    || '';
  document.getElementById('fb-project-input').value   = localStorage.getItem('fb_projectId') || '';
  document.getElementById('fb-storage-input').value   = localStorage.getItem('fb_storageBucket') || '';
  document.getElementById('fb-appid-input').value     = localStorage.getItem('fb_appId')     || '';
  document.getElementById('fb-uid-display').textContent = window.FB_STATE.uid || 'Ulanmagan';
  openModal('firebase-modal');
}

async function saveFirebaseConfigUI() {
  const cfg = {
    apiKey:        document.getElementById('fb-apikey-input').value.trim(),
    projectId:     document.getElementById('fb-project-input').value.trim(),
    storageBucket: document.getElementById('fb-storage-input').value.trim() ||
                   document.getElementById('fb-project-input').value.trim() + '.appspot.com',
    authDomain:    document.getElementById('fb-project-input').value.trim() + '.firebaseapp.com',
    appId:         document.getElementById('fb-appid-input').value.trim(),
  };
  if (!cfg.apiKey || !cfg.projectId) {
    showToast('API Key va Project ID majburiy!', 'error'); return;
  }
  saveFirebaseConfig(cfg);
  closeModal('firebase-modal');
  showToast('Firebase sozlamalari saqlandi. Sahifani yangilang!', 'success');
}

async function exportAllToFirebase() {
  if (!window.FB_STATE.ready) { showToast('Firebase ulanmagan!', 'error'); return; }
  const keys = ['mahsulotlar','mijozlar','buyurtmalar','moliyalar','treklar','xodimlar'];
  let n = 0;
  for (const key of keys) {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    for (const item of arr) {
      await window.fbDb.doc(`${userPath(key)}/${item.id}`).set(item);
      n++;
    }
  }
  showToast(`✅ ${n} ta yozuv Firebase ga yuklandi!`);
}

async function importAllFromFirebase() {
  if (!window.FB_STATE.ready) { showToast('Firebase ulanmagan!', 'error'); return; }
  const keys = ['mahsulotlar','mijozlar','buyurtmalar','moliyalar','treklar','xodimlar'];
  let n = 0;
  for (const key of keys) {
    const snap = await window.fbDb.collection(userPath(key)).get();
    const arr = snap.docs.map(d => d.data());
    localStorage.setItem(key, JSON.stringify(arr));
    n += arr.length;
  }
  showToast(`✅ ${n} ta yozuv Firebase dan yuklandi!`);
  renderDashboard();
}
