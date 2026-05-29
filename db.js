// ╔══════════════════════════════════════════════════════════════╗
// ║   DB.js — Firestore + localStorage fallback                 ║
// ║   Real-time listeners, CRUD, Offline support                ║
// ╚══════════════════════════════════════════════════════════════╝

const DB = {

  // ──────────────────────────────────────────────────────────────
  // ASOSIY O'QISH (localStorage dan — tezkor va offline)
  // ──────────────────────────────────────────────────────────────
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
  },

  // ──────────────────────────────────────────────────────────────
  // ASOSIY YOZISH (localStorage + Firestore asinxron)
  // ──────────────────────────────────────────────────────────────
  set(key, arr) {
    // 1. Darhol localStorage ga yoz (tez)
    localStorage.setItem(key, JSON.stringify(arr));

    // 2. Background da Firebase ga sinxronla
    if (window.FB_STATE?.ready && window.fbDb) {
      this._syncToFirestore(key, arr).catch(e =>
        console.warn(`[DB] Firestore sync xatosi (${key}):`, e.message)
      );
    }
  },

  // ──────────────────────────────────────────────────────────────
  // BITTA HUJJAT QO'SHISH
  // ──────────────────────────────────────────────────────────────
  async add(key, item) {
    const arr = this.get(key);
    arr.push(item);
    this.set(key, arr);

    // Firestore ga to'g'ridan saqlash
    if (window.FB_STATE?.ready && window.fbDb) {
      try {
        await window.fbDb.doc(`${userPath(key)}/${item.id}`).set(item);
      } catch (e) {
        console.warn(`[DB.add] ${key}/${item.id}:`, e.message);
      }
    }
    return item;
  },

  // ──────────────────────────────────────────────────────────────
  // BITTA HUJJAT YANGILASH
  // ──────────────────────────────────────────────────────────────
  async update(key, id, changes) {
    const arr = this.get(key);
    const idx = arr.findIndex(x => x.id === id);
    if (idx === -1) return null;

    const updated = { ...arr[idx], ...changes, updatedAt: new Date().toISOString() };
    arr[idx] = updated;
    this.set(key, arr);

    if (window.FB_STATE?.ready && window.fbDb) {
      try {
        await window.fbDb.doc(`${userPath(key)}/${id}`).update({
          ...changes,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.warn(`[DB.update] ${key}/${id}:`, e.message);
      }
    }
    return updated;
  },

  // ──────────────────────────────────────────────────────────────
  // BITTA HUJJAT O'CHIRISH
  // ──────────────────────────────────────────────────────────────
  async delete(key, id) {
    const arr = this.get(key).filter(x => x.id !== id);
    this.set(key, arr);

    if (window.FB_STATE?.ready && window.fbDb) {
      try {
        await window.fbDb.doc(`${userPath(key)}/${id}`).delete();
      } catch (e) {
        console.warn(`[DB.delete] ${key}/${id}:`, e.message);
      }
    }
  },

  // ──────────────────────────────────────────────────────────────
  // FIRESTORE → localStorage SINXRONLASH (batch)
  // ──────────────────────────────────────────────────────────────
  async _syncToFirestore(key, arr) {
    if (!window.FB_STATE?.ready || !window.fbDb) return;

    const colRef = window.fbDb.collection(userPath(key));

    // Batch write (max 500 hujjat bir vaqtda)
    const CHUNK = 400;
    for (let i = 0; i < arr.length; i += CHUNK) {
      const batch = window.fbDb.batch();
      arr.slice(i, i + CHUNK).forEach(item => {
        const ref = colRef.doc(item.id);
        batch.set(ref, item, { merge: true });
      });
      await batch.commit();
    }
  },

  // ──────────────────────────────────────────────────────────────
  // REAL-TIME LISTENER — Firestore → localStorage → UI
  // ──────────────────────────────────────────────────────────────
  listen(key, callback) {
    if (!window.FB_STATE?.ready || !window.fbDb) {
      // Offline: bir martali callback
      callback(this.get(key));
      return () => {};
    }

    const unsubscribe = window.fbDb
      .collection(userPath(key))
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          const arr = snap.docs.map(d => d.data());
          // localStorage ni yangilash
          localStorage.setItem(key, JSON.stringify(arr));
          callback(arr);
        },
        err => {
          console.warn(`[DB.listen] ${key} xatosi:`, err.message);
          callback(this.get(key));
        }
      );

    // Listenerlarni saqlash (cleanup uchun)
    window.FB_STATE.listeners.push(unsubscribe);
    return unsubscribe;
  },

  // ──────────────────────────────────────────────────────────────
  // BARCHA LISTENERLARNI TO'XTATISH
  // ──────────────────────────────────────────────────────────────
  stopAll() {
    window.FB_STATE.listeners.forEach(fn => fn());
    window.FB_STATE.listeners = [];
  },

  // ──────────────────────────────────────────────────────────────
  // FIRESTORE DAN TO'LIQ YUKLAB OLISH
  // ──────────────────────────────────────────────────────────────
  async fetchOnce(key) {
    if (!window.FB_STATE?.ready || !window.fbDb) return this.get(key);

    try {
      const snap = await window.fbDb.collection(userPath(key)).get();
      const arr  = snap.docs.map(d => d.data());
      localStorage.setItem(key, JSON.stringify(arr));
      return arr;
    } catch (e) {
      console.warn(`[DB.fetchOnce] ${key}:`, e.message);
      return this.get(key);
    }
  },

  // ──────────────────────────────────────────────────────────────
  // BITTA HUJJAT OLISH (ID bo'yicha)
  // ──────────────────────────────────────────────────────────────
  async getById(key, id) {
    // Avval localdan
    const local = this.get(key).find(x => x.id === id);
    if (local) return local;

    // Keyin Firestore dan
    if (window.FB_STATE?.ready && window.fbDb) {
      try {
        const doc = await window.fbDb.doc(`${userPath(key)}/${id}`).get();
        if (doc.exists) return doc.data();
      } catch (e) {
        console.warn(`[DB.getById] ${key}/${id}:`, e.message);
      }
    }
    return null;
  },

  // ──────────────────────────────────────────────────────────────
  // MAHSULOT URL'I (QR uchun)
  // ──────────────────────────────────────────────────────────────
  getProductUrl(id) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?product=${id}`;
  },
};

// ──────────────────────────────────────────────────────────────
// REAL-TIME LISTENERS SETUP (sahifa yuklanganda)
// ──────────────────────────────────────────────────────────────
function setupRealTimeListeners() {
  if (!window.FB_STATE?.ready) return;

  console.log('🔄 Real-time listenerlar yoqilmoqda...');

  // Mahsulotlar real-time
  DB.listen('mahsulotlar', (arr) => {
    const currentPage = document.querySelector('.page.active')?.id;
    if (currentPage === 'page-mahsulot') renderMahsulot();
    if (currentPage === 'page-dashboard') renderDashboard();
    // Kam mahsulot tekshirish
    arr.forEach(m => {
      if (Number(m.miqdor) > 0 && Number(m.miqdor) <= Number(m.min || 5)) {
        const warned = sessionStorage.getItem('warned_' + m.id);
        if (!warned) {
          sessionStorage.setItem('warned_' + m.id, '1');
          TG.kamMahsulot(m);
        }
      }
    });
  });

  // Buyurtmalar real-time
  DB.listen('buyurtmalar', (arr) => {
    const currentPage = document.querySelector('.page.active')?.id;
    if (currentPage === 'page-buyurtma') renderBuyurtma();
    if (currentPage === 'page-dashboard') renderDashboard();
  });

  // Moliya real-time
  DB.listen('moliyalar', (arr) => {
    const currentPage = document.querySelector('.page.active')?.id;
    if (currentPage === 'page-moliya') renderMoliya();
    if (currentPage === 'page-dashboard') renderDashboard();
  });

  // Mijozlar real-time
  DB.listen('mijozlar', () => {
    const currentPage = document.querySelector('.page.active')?.id;
    if (currentPage === 'page-mijoz') renderMijoz();
  });

  console.log('✅ Real-time listenerlar faol');
}
