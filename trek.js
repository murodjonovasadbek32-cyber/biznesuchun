// ===== TREK RAQAM HOLAT NAZORATI =====

const TREK_HOLATLAR = {
  kutilmoqda: { emoji: '⏳', nom: 'Kutilmoqda', rang: '#6c63ff', bg: '#ede9fe' },
  yolda: { emoji: '🚢', nom: "Yo'lda", rang: '#f97316', bg: '#ffedd5' },
  bojxona: { emoji: '🏛️', nom: 'Bojxonada', rang: '#a855f7', bg: '#f3e8ff' },
  omborda: { emoji: '📦', nom: 'Omborda', rang: '#3b82f6', bg: '#dbeafe' },
  yetkazildi: { emoji: '✅', nom: 'Yetkazildi', rang: '#22c55e', bg: '#dcfce7' },
  bekor: { emoji: '❌', nom: 'Bekor', rang: '#ef4444', bg: '#fee2e2' },
};

// ===== TREK JADVALINI RENDER QILISH =====
function renderTreklar(filter = '') {
  const mahsulotlar = DB.get('mahsulotlar');
  const treklar = DB.get('treklar');

  // Mahsulotlardan trek ma'lumotlarini birlashtirish
  const allTreklar = [
    ...treklar,
    ...mahsulotlar
      .filter(m => m.trek && !treklar.find(t => t.trek === m.trek))
      .map(m => ({
        id: 'auto_' + m.id,
        trek: m.trek,
        mahsulotNom: m.nom,
        mahsulotId: m.id,
        holat: m.trekHolat || 'kutilmoqda',
        sana: m.sana,
        yangilangan: m.trekYangilangan || m.sana,
        izoh: m.trekIzoh || '',
      }))
  ];

  const tbody = document.getElementById('trek-tbody');
  if (!tbody) return;

  const list = filter
    ? allTreklar.filter(t =>
        t.trek?.toLowerCase().includes(filter.toLowerCase()) ||
        t.mahsulotNom?.toLowerCase().includes(filter.toLowerCase())
      )
    : allTreklar;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Trek raqam yo'q</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((t, i) => {
    const h = TREK_HOLATLAR[t.holat] || TREK_HOLATLAR.kutilmoqda;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <code class="trek-code">${t.trek}</code>
          ${t.izoh ? `<br><small style="color:#94a3b8">${t.izoh}</small>` : ''}
        </td>
        <td>${t.mahsulotNom || '—'}</td>
        <td>
          <span class="trek-holat-badge" style="background:${h.bg};color:${h.rang}">
            ${h.emoji} ${h.nom}
          </span>
        </td>
        <td>${formatDate(t.yangilangan || t.sana)}</td>
        <td>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${Object.entries(TREK_HOLATLAR).map(([key, val]) =>
              key !== t.holat
                ? `<button class="btn btn-sm" style="padding:0.2rem 0.5rem;font-size:0.72rem;background:${val.bg};color:${val.rang};border:1px solid ${val.rang}20"
                    onclick="trekHolatOzgartir('${t.id}','${t.mahsulotId || ''}','${key}')">
                    ${val.emoji}
                  </button>`
                : ''
            ).join('')}
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ===== TREK HOLAT O'ZGARTIRISH =====
function trekHolatOzgartir(trekId, mahsulotId, yangiHolat) {
  const h = TREK_HOLATLAR[yangiHolat];

  // Mahsulotni yangilash
  if (mahsulotId) {
    const mahsulotlar = DB.get('mahsulotlar');
    const idx = mahsulotlar.findIndex(m => m.id === mahsulotId);
    if (idx !== -1) {
      mahsulotlar[idx].trekHolat = yangiHolat;
      mahsulotlar[idx].trekYangilangan = today();
      DB.set('mahsulotlar', mahsulotlar);
    }
  }

  // Trek jadvalini yangilash
  if (!trekId.startsWith('auto_')) {
    const treklar = DB.get('treklar');
    const idx = treklar.findIndex(t => t.id === trekId);
    if (idx !== -1) {
      treklar[idx].holat = yangiHolat;
      treklar[idx].yangilangan = today();
      DB.set('treklar', treklar);
    }
  }

  showToast(`${h.emoji} Trek holati: ${h.nom}`);

  // Telegram xabar
  const treklar = DB.get('treklar');
  const trek = treklar.find(t => t.id === trekId);
  const mahsulotlar = DB.get('mahsulotlar');
  const mahsulot = mahsulotlar.find(m => m.id === mahsulotId);

  TG.xabar(
    `🔄 <b>Trek Holati O'zgardi!</b>\n\n` +
    `🔖 Trek: <code>${mahsulot?.trek || trek?.trek || trekId}</code>\n` +
    `📦 Mahsulot: ${mahsulot?.nom || trek?.mahsulotNom || '—'}\n` +
    `${h.emoji} Yangi holat: <b>${h.nom}</b>\n` +
    `📅 Sana: ${today()}`
  );

  renderTreklar(document.getElementById('trek-search')?.value || '');
}

// ===== YANGI TREK QO'SHISH =====
function openTrekModal() {
  document.getElementById('tr-trek').value = '';
  document.getElementById('tr-mahsulot').value = '';
  document.getElementById('tr-holat').value = 'kutilmoqda';
  document.getElementById('tr-izoh').value = '';

  // Mahsulotlar listini to'ldirish
  const mahsulotlar = DB.get('mahsulotlar');
  const sel = document.getElementById('tr-mahsulot');
  sel.innerHTML = '<option value="">Mahsulot tanlang (ixtiyoriy)</option>' +
    mahsulotlar.map(m => `<option value="${m.id}">${m.nom}</option>`).join('');

  openModal('trek-modal');
}

function saveTrek() {
  const trek = document.getElementById('tr-trek').value.trim();
  const mahsulotId = document.getElementById('tr-mahsulot').value;
  const holat = document.getElementById('tr-holat').value;
  const izoh = document.getElementById('tr-izoh').value.trim();

  if (!trek) {
    showToast('Trek raqamini kiriting!', 'error');
    return;
  }

  const mahsulotlar = DB.get('mahsulotlar');
  const mahsulot = mahsulotlar.find(m => m.id === mahsulotId);

  const treklar = DB.get('treklar');
  const yangi = {
    id: genId(),
    trek,
    mahsulotId,
    mahsulotNom: mahsulot?.nom || '',
    holat,
    izoh,
    sana: today(),
    yangilangan: today(),
  };

  // Mahsulotga ham trek holatini yoz
  if (mahsulotId) {
    const idx = mahsulotlar.findIndex(m => m.id === mahsulotId);
    if (idx !== -1) {
      mahsulotlar[idx].trek = trek;
      mahsulotlar[idx].trekHolat = holat;
      mahsulotlar[idx].trekYangilangan = today();
      DB.set('mahsulotlar', mahsulotlar);
    }
  }

  treklar.push(yangi);
  DB.set('treklar', treklar);

  showToast('Trek qo\'shildi!');
  closeModal('trek-modal');
  renderTreklar();

  // Telegram
  TG.xabar(
    `🔖 <b>Yangi Trek Qo'shildi!</b>\n\n` +
    `Trek: <code>${trek}</code>\n` +
    `Mahsulot: ${mahsulot?.nom || '—'}\n` +
    `${TREK_HOLATLAR[holat].emoji} Holat: ${TREK_HOLATLAR[holat].nom}\n` +
    `📅 Sana: ${today()}`
  );
}

// ===== TREK FILTER =====
function filterTreklar() {
  const val = document.getElementById('trek-search')?.value || '';
  renderTreklar(val);
}

// ===== TREK HOLAT STATISTIKASI =====
function renderTrekStats() {
  const mahsulotlar = DB.get('mahsulotlar');
  const treklar = DB.get('treklar');

  const allTreklar = [
    ...treklar,
    ...mahsulotlar.filter(m => m.trek && !treklar.find(t => t.trek === m.trek))
      .map(m => ({ holat: m.trekHolat || 'kutilmoqda' }))
  ];

  const statsEl = document.getElementById('trek-stats');
  if (!statsEl) return;

  const counts = {};
  allTreklar.forEach(t => {
    counts[t.holat] = (counts[t.holat] || 0) + 1;
  });

  statsEl.innerHTML = Object.entries(TREK_HOLATLAR).map(([key, val]) => {
    const count = counts[key] || 0;
    if (count === 0) return '';
    return `
      <div class="trek-stat-item" style="background:${val.bg}">
        <span style="font-size:1.4rem">${val.emoji}</span>
        <div>
          <div style="font-weight:700;color:${val.rang};font-size:1.2rem">${count}</div>
          <div style="font-size:0.78rem;color:#64748b">${val.nom}</div>
        </div>
      </div>`;
  }).join('');
}
