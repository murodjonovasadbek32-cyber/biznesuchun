// ╔══════════════════════════════════════════════════════════════╗
// ║   TREK.JS — Trek Raqam Nazorat v3.0                        ║
// ╚══════════════════════════════════════════════════════════════╝

const TREK_HOLATLAR = {
  kutilmoqda: { emoji: '⏳', nom: 'Kutilmoqda', color: '#6366f1', bg: '#eef2ff' },
  yolda:      { emoji: '🚢', nom: "Yo'lda",     color: '#F59E0B', bg: '#fffbeb' },
  bojxona:    { emoji: '🏛️', nom: 'Bojxonada', color: '#a855f7', bg: '#faf5ff' },
  omborda:    { emoji: '📦', nom: 'Omborda',    color: '#2563EB', bg: '#eff6ff' },
  yetkazildi: { emoji: '✅', nom: 'Yetkazildi', color: '#10B981', bg: '#ecfdf5' },
  bekor:      { emoji: '❌', nom: 'Bekor',       color: '#EF4444', bg: '#fef2f2' },
};

// ══════════════════════════════════════════════════════════════
//  STATISTIKA KARTOCHKALARI
// ══════════════════════════════════════════════════════════════
function renderTrekStats() {
  const treklar     = DB.get('treklar');
  const mahsulotlar = DB.get('mahsulotlar');

  const allTreklar = [
    ...treklar,
    ...mahsulotlar
      .filter(m => m.trek && !treklar.find(t => t.trek === m.trek))
      .map(m => ({ holat: m.trekHolat || 'kutilmoqda' })),
  ];

  const counts = {};
  allTreklar.forEach(t => { counts[t.holat] = (counts[t.holat]||0) + 1; });

  const el = document.getElementById('trek-stats');
  if (!el) return;

  el.innerHTML = Object.entries(TREK_HOLATLAR)
    .filter(([k]) => counts[k])
    .map(([k, v]) => `
      <div class="trek-stat-card" style="border-left:3px solid ${v.color}">
        <span class="trek-stat-emoji">${v.emoji}</span>
        <div>
          <div class="trek-stat-count" style="color:${v.color}">${counts[k]}</div>
          <div class="trek-stat-nom">${v.nom}</div>
        </div>
      </div>`).join('');
}

// ══════════════════════════════════════════════════════════════
//  TREK JADVAL
// ══════════════════════════════════════════════════════════════
function renderTreklar(filter = '') {
  const treklar     = DB.get('treklar');
  const mahsulotlar = DB.get('mahsulotlar');

  const allTreklar = [
    ...treklar,
    ...mahsulotlar
      .filter(m => m.trek && !treklar.find(t => t.trek === m.trek))
      .map(m => ({
        id: 'auto_' + m.id,
        trek: m.trek,
        mahsulotNom: m.nom,
        mahsulotId:  m.id,
        holat:       m.trekHolat || 'kutilmoqda',
        sana:        m.sana,
        yangilangan: m.trekYangilangan || m.sana,
        izoh:        m.trekIzoh || '',
      })),
  ];

  const tbody = document.getElementById('trek-tbody');
  if (!tbody) return;

  let list = filter
    ? allTreklar.filter(t =>
        (t.trek||'').toLowerCase().includes(filter.toLowerCase()) ||
        (t.mahsulotNom||'').toLowerCase().includes(filter.toLowerCase())
      )
    : allTreklar;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="tbl-empty">
      <div class="empty-state"><span class="empty-icon">🚢</span>
      <p>Trek raqam yo'q</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((t, i) => {
    const h = TREK_HOLATLAR[t.holat] || TREK_HOLATLAR.kutilmoqda;
    const otherHolatlar = Object.entries(TREK_HOLATLAR).filter(([k]) => k !== t.holat);

    return `<tr>
      <td class="td-num">${i+1}</td>
      <td><code class="trek-code">${t.trek}</code>${t.izoh?`<br><small class="text-muted">${t.izoh}</small>`:''}</td>
      <td>${t.mahsulotNom || '<span class="text-muted">—</span>'}</td>
      <td>
        <span class="trek-badge" style="background:${h.bg};color:${h.color}">
          ${h.emoji} ${h.nom}
        </span>
      </td>
      <td class="text-muted">${formatDate(t.yangilangan||t.sana)}</td>
      <td>
        <div class="trek-actions">
          ${otherHolatlar.map(([k,v])=>`
            <button class="btn-trek-holat" style="background:${v.bg};color:${v.color};border:1px solid ${v.color}30"
              onclick="trekHolatOzgartir('${t.id}','${t.mahsulotId||''}','${k}')"
              title="${v.nom}">${v.emoji}</button>
          `).join('')}
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
//  HOLAT O'ZGARTIRISH
// ══════════════════════════════════════════════════════════════
async function trekHolatOzgartir(trekId, mahsulotId, yangiHolat) {
  const h = TREK_HOLATLAR[yangiHolat];

  if (mahsulotId) {
    const mahsulotlar = DB.get('mahsulotlar');
    const idx = mahsulotlar.findIndex(m => m.id === mahsulotId);
    if (idx !== -1) {
      mahsulotlar[idx].trekHolat       = yangiHolat;
      mahsulotlar[idx].trekYangilangan = today();
      DB.set('mahsulotlar', mahsulotlar);
    }
  }

  if (!trekId.startsWith('auto_')) {
    const treklar = DB.get('treklar');
    const idx = treklar.findIndex(t => t.id === trekId);
    if (idx !== -1) {
      treklar[idx].holat       = yangiHolat;
      treklar[idx].yangilangan = today();
      DB.set('treklar', treklar);
    }
  }

  showToast(`${h.emoji} Trek: ${h.nom}`);

  // TG xabar
  const treklar     = DB.get('treklar');
  const mahsulotlar = DB.get('mahsulotlar');
  const trek        = treklar.find(t => t.id === trekId);
  const mahsulot    = mahsulotlar.find(m => m.id === mahsulotId);
  TG.trekHolat(
    mahsulot?.trek || trek?.trek || trekId,
    mahsulot?.nom  || trek?.mahsulotNom,
    yangiHolat
  );

  renderTrekStats();
  renderTreklar(document.getElementById('trek-search')?.value || '');
}

// ══════════════════════════════════════════════════════════════
//  TREK QO'SHISH MODAL
// ══════════════════════════════════════════════════════════════
function openTrekModal() {
  document.getElementById('tr-trek').value  = '';
  document.getElementById('tr-holat').value = 'kutilmoqda';
  document.getElementById('tr-izoh').value  = '';

  const mahsulotlar = DB.get('mahsulotlar');
  const sel = document.getElementById('tr-mahsulot');
  sel.innerHTML = '<option value="">— Ixtiyoriy —</option>' +
    mahsulotlar.map(m => `<option value="${m.id}">${m.nom}</option>`).join('');

  openModal('trek-modal');
}

function saveTrek() {
  const trek = document.getElementById('tr-trek').value.trim();
  if (!trek) { showToast('Trek raqamini kiriting!', 'error'); return; }

  const mahsulotId = document.getElementById('tr-mahsulot').value;
  const holat      = document.getElementById('tr-holat').value;
  const izoh       = document.getElementById('tr-izoh').value.trim();

  const mahsulotlar = DB.get('mahsulotlar');
  const mahsulot    = mahsulotlar.find(m => m.id === mahsulotId);

  if (mahsulotId) {
    const idx = mahsulotlar.findIndex(m => m.id === mahsulotId);
    if (idx !== -1) {
      mahsulotlar[idx].trek            = trek;
      mahsulotlar[idx].trekHolat       = holat;
      mahsulotlar[idx].trekYangilangan = today();
      DB.set('mahsulotlar', mahsulotlar);
    }
  }

  const treklar = DB.get('treklar');
  treklar.push({
    id: genId(), trek, mahsulotId,
    mahsulotNom: mahsulot?.nom || '',
    holat, izoh, sana: today(), yangilangan: today(),
    createdAt: new Date().toISOString(),
  });
  DB.set('treklar', treklar);

  showToast('✅ Trek qo\'shildi!');
  closeModal('trek-modal');
  TG.trekHolat(trek, mahsulot?.nom, holat);
  renderTrekStats();
  renderTreklar();
}

function filterTreklar() {
  renderTreklar(document.getElementById('trek-search')?.value || '');
}
