// ===== FIREBASE INTEGRATSIYASI =====
// Firebase v9 (compat mode) - localStorage bilan sinxronlash

// Firebase SDK
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDemo_ReplaceWithYourKey",
  authDomain: "biznesuchun.firebaseapp.com",
  projectId: "biznesuchun",
  storageBucket: "biznesuchun.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// ===== FIREBASE HOLATI =====
let firebaseReady = false;
let db_firestore = null;
let auth_firebase = null;
let currentUser = null;

// Firebase ulanish holati
const FB_STATUS = {
  connected: false,
  userId: null,
  error: null,
};

// ===== FIREBASE YUKLASH =====
async function initFirebase() {
  try {
    // Firebase SDKlarini dinamik yuklash
    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js');
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    db_firestore = firebase.firestore();
    auth_firebase = firebase.auth();

    // Anonim login
    await auth_firebase.signInAnonymously();
    const user = await new Promise(resolve => auth_firebase.onAuthStateChanged(resolve));

    if (user) {
      currentUser = user;
      FB_STATUS.connected = true;
      FB_STATUS.userId = user.uid;
      localStorage.setItem('fb_uid', user.uid);
      console.log('✅ Firebase ulandi. UID:', user.uid);
      updateFBStatusBadge(true);
      // LocalStorage dan Firebase ga sinxronlash
      await syncLocalToFirebase();
    }

  } catch (e) {
    FB_STATUS.error = e.message;
    FB_STATUS.connected = false;
    console.warn('⚠️ Firebase ulanmadi, localStorage ishlatilmoqda:', e.message);
    updateFBStatusBadge(false);
  }
}

// ===== SKRIPT YUKLASH =====
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ===== FIREBASE STATUS BADGE =====
function updateFBStatusBadge(connected) {
  const badge = document.getElementById('fb-status-badge');
  if (!badge) return;
  if (connected) {
    badge.innerHTML = '☁️ Bulut';
    badge.title = 'Firebase ulandi';
    badge.style.background = '#dcfce7';
    badge.style.color = '#15803d';
  } else {
    badge.innerHTML = '💾 Lokal';
    badge.title = 'Faqat lokal saqlash';
    badge.style.background = '#ffedd5';
    badge.style.color = '#9a3412';
  }
}

// ===== UNIVERSAL DB (Firebase + localStorage) =====
const CloudDB = {
  // Ma'lumot olish
  async get(key) {
    if (FB_STATUS.connected && db_firestore && currentUser) {
      try {
        const snapshot = await db_firestore
          .collection('users')
          .doc(currentUser.uid)
          .collection(key)
          .get();
        if (!snapshot.empty) {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Localga ham yozib qo'y (offline uchun)
          localStorage.setItem(key, JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.warn('Firebase get error:', e);
      }
    }
    // Fallback: localStorage
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  // Ma'lumot saqlash (butun kolleksiya)
  async set(key, arr) {
    // LocalStoragega yoz
    localStorage.setItem(key, JSON.stringify(arr));

    // Firebase ga yoz
    if (FB_STATUS.connected && db_firestore && currentUser) {
      try {
        const batch = db_firestore.batch();
        const collRef = db_firestore
          .collection('users')
          .doc(currentUser.uid)
          .collection(key);

        // Eski hujjatlarni o'chirish
        const oldDocs = await collRef.get();
        oldDocs.docs.forEach(doc => batch.delete(doc.ref));

        // Yangilarini qo'shish
        arr.forEach(item => {
          const docRef = collRef.doc(item.id || genId());
          batch.set(docRef, item);
        });

        await batch.commit();
      } catch (e) {
        console.warn('Firebase set error:', e);
      }
    }
  },

  // Bitta element qo'shish
  async add(key, item) {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr.push(item);
    await this.set(key, arr);
    return arr;
  },

  // Bitta element yangilash
  async update(key, id, updates) {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = arr.findIndex(x => x.id === id);
    if (idx !== -1) {
      arr[idx] = { ...arr[idx], ...updates };
      await this.set(key, arr);
    }
    return arr;
  },

  // Bitta element o'chirish
  async delete(key, id) {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = arr.filter(x => x.id !== id);
    await this.set(key, filtered);
    return filtered;
  },
};

// ===== LOCAL → FIREBASE SINXRONLASH =====
async function syncLocalToFirebase() {
  if (!FB_STATUS.connected) return;

  const keys = ['mahsulotlar', 'mijozlar', 'buyurtmalar', 'moliyalar'];
  let synced = 0;

  for (const key of keys) {
    const localData = JSON.parse(localStorage.getItem(key) || '[]');
    if (localData.length > 0) {
      try {
        const fbSnapshot = await db_firestore
          .collection('users')
          .doc(currentUser.uid)
          .collection(key)
          .get();

        if (fbSnapshot.empty) {
          // Firebase bo'sh bo'lsa, localdan yuklash
          await CloudDB.set(key, localData);
          synced++;
          console.log(`✅ ${key}: ${localData.length} ta yozuv Firebase ga yuklandi`);
        } else {
          // Firebase da ma'lumot bor, lokalga yukla
          const fbData = fbSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          localStorage.setItem(key, JSON.stringify(fbData));
          console.log(`✅ ${key}: ${fbData.length} ta yozuv Firebase dan yuklandi`);
        }
      } catch (e) {
        console.warn(`Firebase sync error for ${key}:`, e);
      }
    }
  }

  if (synced > 0) {
    showToast(`☁️ ${synced} ta jadval Firebase ga saqlandi!`);
  } else {
    showToast('☁️ Ma\'lumotlar bulutdan yuklandi!');
  }

  // Sahifani yangilash
  renderDashboard();
}

// ===== FIREBASE EKSPORT =====
async function exportToFirebase() {
  if (!FB_STATUS.connected) {
    showToast('Firebase ulanmagan!', 'error');
    return;
  }
  const keys = ['mahsulotlar', 'mijozlar', 'buyurtmalar', 'moliyalar'];
  for (const key of keys) {
    const localData = JSON.parse(localStorage.getItem(key) || '[]');
    await CloudDB.set(key, localData);
  }
  showToast('✅ Barcha ma\'lumotlar bulutga saqlandi!');
}

// ===== FIREBASE IMPORT =====
async function importFromFirebase() {
  if (!FB_STATUS.connected) {
    showToast('Firebase ulanmagan!', 'error');
    return;
  }
  await syncLocalToFirebase();
  renderDashboard();
  showToast('✅ Ma\'lumotlar bulutdan yuklandi!');
}

// ===== DB ni CloudDB ga bog'lash (app.js DB override) =====
// Bu funksiya app.js yuklangandan keyin chaqiriladi
function upgradDBtoCloud() {
  // DB.get va DB.set ni CloudDB bilan almashtirish
  // Lekin async muammosi bor, shuning uchun localStorage asosida saqlaymiz
  // Firebase sinxron ishlaydi background da
  const origSet = DB.set.bind(DB);
  DB.set = function(key, val) {
    origSet(key, val);
    // Firebase ga asinxron saqlash
    if (FB_STATUS.connected) {
      CloudDB.set(key, val).catch(e => console.warn('BG Firebase sync:', e));
    }
  };
  console.log('✅ DB → CloudDB ko\'prik ulandi');
}

// ===== FIREBASE ULASH MODAL =====
function openFirebaseModal() {
  const modal = document.getElementById('firebase-modal');
  if (modal) {
    const uid = localStorage.getItem('fb_uid') || 'Ulanmagan';
    document.getElementById('fb-uid-display').textContent = uid;
    document.getElementById('fb-project-input').value =
      localStorage.getItem('fb_project_id') || '';
    document.getElementById('fb-apikey-input').value =
      localStorage.getItem('fb_api_key') || '';
    openModal('firebase-modal');
  }
}

function saveFirebaseConfig() {
  const projectId = document.getElementById('fb-project-input').value.trim();
  const apiKey = document.getElementById('fb-apikey-input').value.trim();

  if (!projectId || !apiKey) {
    showToast('Barcha maydonlarni to\'ldiring!', 'error');
    return;
  }

  localStorage.setItem('fb_project_id', projectId);
  localStorage.setItem('fb_api_key', apiKey);

  // Konfigni yangilash
  FIREBASE_CONFIG.projectId = projectId;
  FIREBASE_CONFIG.apiKey = apiKey;
  FIREBASE_CONFIG.authDomain = `${projectId}.firebaseapp.com`;
  FIREBASE_CONFIG.storageBucket = `${projectId}.appspot.com`;

  showToast('Firebase sozlamalari saqlandi! Sahifani yangilang.');
  closeModal('firebase-modal');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Firebase ni yuklash (ixtiyoriy — config to'g'ri bo'lsa ishlaydi)
  const savedApiKey = localStorage.getItem('fb_api_key');
  const savedProjectId = localStorage.getItem('fb_project_id');

  if (savedApiKey && savedProjectId) {
    FIREBASE_CONFIG.apiKey = savedApiKey;
    FIREBASE_CONFIG.projectId = savedProjectId;
    FIREBASE_CONFIG.authDomain = `${savedProjectId}.firebaseapp.com`;
    FIREBASE_CONFIG.storageBucket = `${savedProjectId}.appspot.com`;
    // initFirebase(); // Faqat real config bilan yoqing
  }

  // DB ni kuchaytirish
  setTimeout(upgradDBtoCloud, 100);
});
