// ╔══════════════════════════════════════════════════════════════╗
// ║   APP.JS — Asosiy boshqaruv v3.0                           ║
// ║   Dashboard, Nav, Modal, Toast, Dark mode, Scheduler       ║
// ╚══════════════════════════════════════════════════════════════╝

// ══════════════════════════════════════════════════════════════
//  YORDAMCHI FUNKSIYALAR
// ══════════════════════════════════════════════════════════════
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function formatMoney(n) {
  if (n === undefined || n === null || n === '') return '0 so\'m';
  return Number(n).toLocaleString('uz-UZ') + ' so\'m';
}
function formatNum(n) {
  return Number(n || 0).toLocaleString('uz-UZ');
}


// ══════════════════════════════════════════════════════════════
//  NAVIGATSIYA
// ══════════════════════════════════════════════════════════════
const PAGE_TITLES = {
  dashboard:  'Bosh sahifa',
  mahsulot:   'Mahsulot / Ombor',
  mijoz:      'Mijozlar',
  buyurtma:   'Buyurtmalar',
  moliya:     'Moliya',
  hisobot:    'Hisobotlar',
  trek:       'Trek Nazorat',
  kalkulator: 'Kalkulyator',
  xodim:      'Xodimlar',
};

let _currentPage = 'dashboard';

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const pageEl = document.getElementById('page-' + name);
  if (!pageEl) return;
  pageEl.classList.add('active');
  _currentPage = name;

  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = PAGE_TITLES[name] || name;

  document.querySelectorAll(`.nav-link[data-page="${name}"]`).forEach(l => l.classList.add('active'));

  if (window.innerWidth <= 768) closeSidebarMobile();

  // Page render
  const renders = {
    dashboard:  () => renderDashboard(),
    mahsulot:   () => renderMahsulot(),
    mijoz:      () => renderMijoz(),
    buyurtma:   () => renderBuyurtma(),
    moliya:     () => renderMoliya(),
    hisobot:    () => renderHisobot(),
    trek:       () => { renderTrekStats(); renderTreklar(); },
    xodim:      () => { renderXodimlar(); renderRollar(); },
    kalkulator: () => { hisoblaNarx(); hisoblaUzumFoyda(); },
  };
  if (renders[name]) renders[name]();
}

// ══════════════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════════════
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeSidebarMobile() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ══════════════════════════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════════════════════════
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); el.setAttribute('aria-hidden','false'); }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); el.setAttribute('aria-hidden','true'); }
}
// ESC bilan yopish
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-bg.open').forEach(m => m.classList.remove('open'));
  }
});


// ══════════════════════════════════════════════════════════════
//  TOAST XABARLARI
// ══════════════════════════════════════════════════════════════
let _toastTimer = null;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  t.className = `toast toast-${type} show`;
  t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ══════════════════════════════════════════════════════════════
//  DARK MODE
// ══════════════════════════════════════════════════════════════
function initDarkMode() {
  const saved = localStorage.getItem('dark_mode');
  if (saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    const btn = document.getElementById('dark-mode-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>';
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('dark_mode', String(!isDark));
  const btn = document.getElementById('dark-mode-btn');
  if (btn) btn.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
}

// ══════════════════════════════════════════════════════════════
//  ANIMATSIYALI COUNTER
// ══════════════════════════════════════════════════════════════
function animateCounter(el, target, duration = 800) {
  if (!el) return;
  const start = performance.now();
  const from  = parseInt(el.textContent) || 0;
  const step  = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const val = Math.round(from + (target - from) * _easeOut(t));
    el.textContent = formatNum(val);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = formatNum(target);
  };
  requestAnimationFrame(step);
}
function _easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
function renderDashboard() {
  const mahsulotlar = DB.get('mahsulotlar');
  const mijozlar    = DB.get('mijozlar');
  const buyurtmalar = DB.get('buyurtmalar');
  const moliyalar   = DB.get('moliyalar');

  // Stat kartochkalar — animatsiya bilan
  animateCounter(document.getElementById('stat-mahsulot'), mahsulotlar.length);
  animateCounter(document.getElementById('stat-mijoz'),    mijozlar.length);
  animateCounter(document.getElementById('stat-buyurtma'), buyurtmalar.length);

  const kirim  = moliyalar.filter(m=>m.tur==='kirim').reduce((s,m)=>s+Number(m.summa),0);
  const chiqim = moliyalar.filter(m=>m.tur==='chiqim').reduce((s,m)=>s+Number(m.summa),0);
  const foyda  = kirim - chiqim;
  const foydaEl = document.getElementById('stat-foyda');
  if (foydaEl) foydaEl.textContent = formatMoney(foyda);

  // Bugungi stats
  const todayStr = today();
  const bugunB   = buyurtmalar.filter(b => b.sana === todayStr);
  const bugunM   = moliyalar.filter(m => m.sana === todayStr);
  const bugunKirim = bugunM.filter(m=>m.tur==='kirim').reduce((s,m)=>s+Number(m.summa),0);

  animateCounter(document.getElementById('stat-bugun-buyurtma'), bugunB.length);
  const bugunKirimEl = document.getElementById('stat-bugun-kirim');
  if (bugunKirimEl) bugunKirimEl.textContent = formatMoney(bugunKirim);

  // Kam qolgan mahsulotlar
  const kam   = mahsulotlar.filter(m => Number(m.miqdor) > 0 && Number(m.miqdor) <= Number(m.min||5));
  const kamEl = document.getElementById('kam-mahsulot-list');
  if (kamEl) {
    kamEl.innerHTML = kam.length === 0
      ? '<div class="empty-state-sm"><i class="fas fa-check-circle" style="color:#10B981"></i> Hammasi yetarli</div>'
      : kam.slice(0,6).map(m => `
          <div class="dash-list-item warning-item">
            <div class="dli-left">
              ${m.rasm ? `<img src="${m.rasm}" class="dli-img" />` : '<div class="dli-img-empty"><i class="fas fa-box"></i></div>'}
              <span class="dli-nom">${m.nom}</span>
            </div>
            <span class="badge badge-yellow">⚠ ${m.miqdor} dona</span>
          </div>`).join('');
  }

  // So'nggi buyurtmalar
  const songi   = [...buyurtmalar].sort((a,b)=>new Date(b.sana)-new Date(a.sana)).slice(0,6);
  const songiEl = document.getElementById('songi-buyurtma-list');
  if (songiEl) {
    const HOLAT = { yangi:'badge-blue', jarayonda:'badge-yellow', yetkazildi:'badge-green', bekor:'badge-red' };
    songiEl.innerHTML = songi.length === 0
      ? '<div class="empty-state-sm"><i class="fas fa-inbox"></i> Buyurtma yo\'q</div>'
      : songi.map(b => `
          <div class="dash-list-item">
            <div class="dli-left">
              <span class="dli-raqam">#${b.raqam||'—'}</span>
              <div>
                <span class="dli-nom">${b.mijozNom||'—'}</span>
                <span class="dli-sub">${b.mahsulotNom||'—'}</span>
              </div>
            </div>
            <div class="dli-right">
              <strong class="dli-summa">${formatMoney(b.summa)}</strong>
              <span class="badge ${HOLAT[b.holat]||'badge-blue'}">${b.holat}</span>
            </div>
          </div>`).join('');
  }

  // Top mahsulotlar
  _renderTopMahsulotlar(buyurtmalar);
}


function _renderTopMahsulotlar(buyurtmalar) {
  const topEl = document.getElementById('top-mahsulot-dash');
  if (!topEl) return;
  const counts = {};
  buyurtmalar.forEach(b => {
    if (!b.mahsulotNom) return;
    counts[b.mahsulotNom] = (counts[b.mahsulotNom]||0) + Number(b.miqdor||1);
  });
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const max  = top[0]?.[1] || 1;

  topEl.innerHTML = top.length === 0
    ? '<div class="empty-state-sm"><i class="fas fa-chart-bar"></i> Ma\'lumot yo\'q</div>'
    : top.map(([nom, cnt], i) => `
        <div class="top-item">
          <div class="top-item-head">
            <span class="top-rank">${i+1}</span>
            <span class="top-nom">${nom}</span>
            <span class="top-cnt">${cnt} dona</span>
          </div>
          <div class="top-bar-bg">
            <div class="top-bar-fill" style="width:${(cnt/max*100).toFixed(0)}%"></div>
          </div>
        </div>`).join('');
}

// ══════════════════════════════════════════════════════════════
//  MIJOZ MODULI
// ══════════════════════════════════════════════════════════════
function renderMijoz(filter = '') {
  const mijozlar = DB.get('mijozlar');
  const buyurtmalar = DB.get('buyurtmalar');
  const tbody = document.getElementById('mijoz-tbody');
  if (!tbody) return;

  let list = filter
    ? mijozlar.filter(m =>
        (m.ism||'').toLowerCase().includes(filter.toLowerCase()) ||
        (m.tel||'').includes(filter)
      )
    : mijozlar;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="tbl-empty">
      <div class="empty-state"><span class="empty-icon">👥</span><p>Mijoz yo'q</p></div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((m, i) => {
    const xaridlar = buyurtmalar.filter(b => b.mijozId === m.id);
    const jami     = xaridlar.reduce((s,b) => s+Number(b.summa||0), 0);
    return `<tr>
      <td class="td-num">${i+1}</td>
      <td><div class="mijoz-avatar">${(m.ism||'?').charAt(0).toUpperCase()}</div></td>
      <td><strong>${m.ism}</strong>${m.izoh?`<br><small class="text-muted">${m.izoh}</small>`:''}</td>
      <td>${m.tel||'—'}</td>
      <td>${m.manzil||'<span class="text-muted">—</span>'}</td>
      <td><strong>${formatMoney(jami)}</strong><br><small class="text-muted">${xaridlar.length} ta xarid</small></td>
      <td>${formatDate(m.sana)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" onclick="editMijoz('${m.id}')"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-del" onclick="deleteMijoz('${m.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterMijoz() {
  renderMijoz(document.getElementById('mijoz-search')?.value || '');
}

function openMijozModal() {
  document.getElementById('mijoz-modal-title').textContent = 'Yangi mijoz';
  document.getElementById('mj-id').value = '';
  ['mj-ism','mj-tel','mj-manzil','mj-izoh'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  openModal('mijoz-modal');
}

function editMijoz(id) {
  const m = DB.get('mijozlar').find(x => x.id === id);
  if (!m) return;
  document.getElementById('mijoz-modal-title').textContent = 'Mijozni tahrirlash';
  document.getElementById('mj-id').value      = m.id;
  document.getElementById('mj-ism').value     = m.ism  || '';
  document.getElementById('mj-tel').value     = m.tel  || '';
  document.getElementById('mj-manzil').value  = m.manzil || '';
  document.getElementById('mj-izoh').value    = m.izoh || '';
  openModal('mijoz-modal');
}

function saveMijoz() {
  const ism = document.getElementById('mj-ism').value.trim();
  const tel = document.getElementById('mj-tel').value.trim();
  if (!ism || !tel) { showToast('Ism va telefon majburiy!', 'error'); return; }

  const mijozlar = DB.get('mijozlar');
  const id = document.getElementById('mj-id').value;
  const data = {
    id: id || genId(),
    ism, tel,
    manzil: document.getElementById('mj-manzil').value.trim(),
    izoh:   document.getElementById('mj-izoh').value.trim(),
    sana:   today(),
    createdAt: new Date().toISOString(),
  };

  if (id) {
    const idx = mijozlar.findIndex(x => x.id === id);
    mijozlar[idx] = { ...mijozlar[idx], ...data };
    showToast('Mijoz yangilandi!');
  } else {
    mijozlar.push(data);
    showToast('✅ Yangi mijoz qo\'shildi!');
    TG.mijozQoshildi(data);
  }

  DB.set('mijozlar', mijozlar);
  closeModal('mijoz-modal');
  renderMijoz();
}

function deleteMijoz(id) {
  if (!confirm('Mijozni o\'chirasizmi?')) return;
  DB.delete('mijozlar', id);
  showToast('Mijoz o\'chirildi');
  renderMijoz();
}


// ══════════════════════════════════════════════════════════════
//  BUYURTMA MODULI
// ══════════════════════════════════════════════════════════════
function renderBuyurtma(filter = '') {
  const buyurtmalar = DB.get('buyurtmalar');
  const tbody = document.getElementById('buyurtma-tbody');
  if (!tbody) return;

  let list = filter ? buyurtmalar.filter(b => b.holat === filter) : buyurtmalar;
  list = [...list].sort((a,b)=>new Date(b.sana)-new Date(a.sana));

  const HOLAT = { yangi:'badge-blue', jarayonda:'badge-yellow', yetkazildi:'badge-green', bekor:'badge-red' };
  const HOLAT_EMOJI = { yangi:'🆕', jarayonda:'⏳', yetkazildi:'✅', bekor:'❌' };

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="tbl-empty">
      <div class="empty-state"><span class="empty-icon">🛒</span><p>Buyurtma yo'q</p></div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((b, i) => `
    <tr>
      <td class="td-num">${i+1}</td>
      <td><strong class="order-num">#${b.raqam||'—'}</strong></td>
      <td>${b.mijozNom||'—'}</td>
      <td>${b.mahsulotNom||'—'}</td>
      <td>${b.miqdor} dona</td>
      <td><strong class="price-text">${formatMoney(b.summa)}</strong></td>
      <td>
        <select class="holat-select ${HOLAT[b.holat]||''}" onchange="changeHolat('${b.id}',this.value)">
          ${['yangi','jarayonda','yetkazildi','bekor'].map(h=>
            `<option value="${h}" ${b.holat===h?'selected':''}>${HOLAT_EMOJI[h]} ${h}</option>`
          ).join('')}
        </select>
      </td>
      <td>${formatDate(b.sana)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" onclick="editBuyurtma('${b.id}')"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-del" onclick="deleteBuyurtma('${b.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function filterBuyurtma() {
  renderBuyurtma(document.getElementById('buyurtma-filter')?.value || '');
}

function changeHolat(id, newHolat) {
  const buyurtmalar = DB.get('buyurtmalar');
  const idx = buyurtmalar.findIndex(b => b.id === id);
  if (idx === -1) return;
  const b = buyurtmalar[idx];
  buyurtmalar[idx].holat = newHolat;
  DB.set('buyurtmalar', buyurtmalar);
  showToast('Holat yangilandi!');
  TG.buyurtmaHolat(b, newHolat);

  if (newHolat === 'yetkazildi') {
    const moliyalar = DB.get('moliyalar');
    moliyalar.push({ id:genId(), tur:'kirim', tavsif:`Sotuv: ${b.mahsulotNom} #${b.raqam}`, summa:b.summa, sana:today(), createdAt:new Date().toISOString() });
    DB.set('moliyalar', moliyalar);
  }
  renderBuyurtma(document.getElementById('buyurtma-filter')?.value || '');
}

function openBuyurtmaModal() {
  _fillBuyurtmaSelects();
  document.getElementById('buyurtma-modal-title').textContent = 'Yangi buyurtma';
  document.getElementById('b-id').value = '';
  ['b-miqdor','b-summa','b-izoh'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('b-miqdor').value = '1';
  document.getElementById('b-holat').value  = 'yangi';
  document.getElementById('b-tolov').value  = 'naqd';
  openModal('buyurtma-modal');
}

function _fillBuyurtmaSelects() {
  const mijozlar    = DB.get('mijozlar');
  const mahsulotlar = DB.get('mahsulotlar');

  document.getElementById('b-mijoz').innerHTML =
    '<option value="">Mijoz tanlang</option>' +
    mijozlar.map(m=>`<option value="${m.id}">${m.ism} — ${m.tel}</option>`).join('');

  document.getElementById('b-mahsulot').innerHTML =
    '<option value="">Mahsulot tanlang</option>' +
    mahsulotlar.filter(m=>Number(m.miqdor)>0)
      .map(m=>`<option value="${m.id}" data-narx="${m.sotuvNarx}">${m.nom} (${m.miqdor} dona)</option>`).join('');
}

function updateBuyurtmaNarx() {
  const sel  = document.getElementById('b-mahsulot');
  const opt  = sel.options[sel.selectedIndex];
  const narx = Number(opt?.dataset?.narx || 0);
  const miqdor = Number(document.getElementById('b-miqdor').value) || 1;
  document.getElementById('b-summa').value = narx * miqdor;
}

function editBuyurtma(id) {
  _fillBuyurtmaSelects();
  const b = DB.get('buyurtmalar').find(x=>x.id===id);
  if (!b) return;
  document.getElementById('buyurtma-modal-title').textContent = 'Buyurtmani tahrirlash';
  document.getElementById('b-id').value       = b.id;
  document.getElementById('b-mijoz').value    = b.mijozId;
  document.getElementById('b-mahsulot').value = b.mahsulotId;
  document.getElementById('b-miqdor').value   = b.miqdor;
  document.getElementById('b-summa').value    = b.summa;
  document.getElementById('b-holat').value    = b.holat;
  document.getElementById('b-tolov').value    = b.tolov || 'naqd';
  document.getElementById('b-izoh').value     = b.izoh || '';
  openModal('buyurtma-modal');
}

function saveBuyurtma() {
  const mijozId    = document.getElementById('b-mijoz').value;
  const mahsulotId = document.getElementById('b-mahsulot').value;
  const miqdor     = Number(document.getElementById('b-miqdor').value);
  const summa      = document.getElementById('b-summa').value;

  if (!mijozId || !mahsulotId || !miqdor || !summa) {
    showToast('Barcha majburiy maydonlarni to\'ldiring!', 'error'); return;
  }

  const mijozlar    = DB.get('mijozlar');
  const mahsulotlar = DB.get('mahsulotlar');
  const buyurtmalar = DB.get('buyurtmalar');
  const mijoz       = mijozlar.find(m=>m.id===mijozId);
  const mahsulot    = mahsulotlar.find(m=>m.id===mahsulotId);
  const id          = document.getElementById('b-id').value;
  const holat       = document.getElementById('b-holat').value;

  if (!id) {
    const mIdx = mahsulotlar.findIndex(m=>m.id===mahsulotId);
    if (mIdx !== -1) {
      if (Number(mahsulotlar[mIdx].miqdor) < miqdor) {
        showToast('Omborda yetarli mahsulot yo\'q!', 'error'); return;
      }
      mahsulotlar[mIdx].miqdor = Number(mahsulotlar[mIdx].miqdor) - miqdor;
      if (Number(mahsulotlar[mIdx].miqdor) <= Number(mahsulotlar[mIdx].min||5)) {
        TG.kamMahsulot(mahsulotlar[mIdx]);
      }
    }
    DB.set('mahsulotlar', mahsulotlar);

    const raqam = String(buyurtmalar.length+1).padStart(4,'0');
    const yangi = { id:genId(), raqam, mijozId, mijozNom:mijoz?.ism||'', mahsulotId, mahsulotNom:mahsulot?.nom||'',
      miqdor, summa, holat, tolov:document.getElementById('b-tolov').value,
      izoh:document.getElementById('b-izoh').value.trim(), sana:today(), createdAt:new Date().toISOString() };
    buyurtmalar.push(yangi);
    TG.buyurtmaQoshildi(yangi);
    showToast('✅ Yangi buyurtma qo\'shildi!');
  } else {
    const idx = buyurtmalar.findIndex(b=>b.id===id);
    buyurtmalar[idx] = { ...buyurtmalar[idx], mijozId, mijozNom:mijoz?.ism||'',
      mahsulotId, mahsulotNom:mahsulot?.nom||'', miqdor, summa, holat,
      tolov:document.getElementById('b-tolov').value, izoh:document.getElementById('b-izoh').value.trim() };
    showToast('Buyurtma yangilandi!');
  }

  DB.set('buyurtmalar', buyurtmalar);
  closeModal('buyurtma-modal');
  renderBuyurtma();
  renderDashboard();
}

function deleteBuyurtma(id) {
  if (!confirm('Buyurtmani o\'chirasizmi?')) return;
  DB.delete('buyurtmalar', id);
  showToast('Buyurtma o\'chirildi');
  renderBuyurtma();
}


// ══════════════════════════════════════════════════════════════
//  MOLIYA MODULI
// ══════════════════════════════════════════════════════════════
function renderMoliya(filter = '') {
  const moliyalar = DB.get('moliyalar');
  const tbody = document.getElementById('moliya-tbody');
  if (!tbody) return;

  let list = filter ? moliyalar.filter(m=>m.tur===filter) : moliyalar;
  list = [...list].sort((a,b)=>new Date(b.sana)-new Date(a.sana));

  const kirim  = moliyalar.filter(m=>m.tur==='kirim').reduce((s,m)=>s+Number(m.summa),0);
  const chiqim = moliyalar.filter(m=>m.tur==='chiqim').reduce((s,m)=>s+Number(m.summa),0);

  const setEl = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setEl('jami-kirim', formatMoney(kirim));
  setEl('jami-chiqim', formatMoney(chiqim));
  setEl('sof-foyda', formatMoney(kirim-chiqim));
  const foydaEl = document.getElementById('sof-foyda');
  if (foydaEl) foydaEl.style.color = (kirim-chiqim) >= 0 ? '#10B981' : '#EF4444';

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="tbl-empty">
      <div class="empty-state"><span class="empty-icon">💳</span><p>Tranzaksiya yo'q</p></div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((m,i) => `
    <tr>
      <td class="td-num">${i+1}</td>
      <td>${formatDate(m.sana)}</td>
      <td><span class="badge ${m.tur==='kirim'?'badge-green':'badge-red'}">${m.tur==='kirim'?'↑ Kirim':'↓ Chiqim'}</span></td>
      <td>${m.tavsif||'—'}</td>
      <td><strong style="color:${m.tur==='kirim'?'#10B981':'#EF4444'}">${formatMoney(m.summa)}</strong></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" onclick="editMoliya('${m.id}')"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-del" onclick="deleteMoliya('${m.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function filterMoliya() {
  renderMoliya(document.getElementById('moliya-filter')?.value||'');
}

function openMoliyaModal() {
  document.getElementById('moliya-modal-title').textContent = 'Yangi tranzaksiya';
  document.getElementById('mo-id').value     = '';
  document.getElementById('mo-tur').value    = 'kirim';
  document.getElementById('mo-summa').value  = '';
  document.getElementById('mo-tavsif').value = '';
  document.getElementById('mo-sana').value   = today();
  openModal('moliya-modal');
}

function editMoliya(id) {
  const m = DB.get('moliyalar').find(x=>x.id===id);
  if (!m) return;
  document.getElementById('moliya-modal-title').textContent = 'Tahrirlash';
  document.getElementById('mo-id').value     = m.id;
  document.getElementById('mo-tur').value    = m.tur;
  document.getElementById('mo-summa').value  = m.summa;
  document.getElementById('mo-tavsif').value = m.tavsif;
  document.getElementById('mo-sana').value   = m.sana;
  openModal('moliya-modal');
}

function saveMoliya() {
  const tur    = document.getElementById('mo-tur').value;
  const summa  = document.getElementById('mo-summa').value;
  const tavsif = document.getElementById('mo-tavsif').value.trim();
  const sana   = document.getElementById('mo-sana').value || today();

  if (!summa || !tavsif) { showToast('Summa va tavsif majburiy!', 'error'); return; }

  const moliyalar = DB.get('moliyalar');
  const id = document.getElementById('mo-id').value;
  const data = { id:id||genId(), tur, summa:Number(summa), tavsif, sana, createdAt:new Date().toISOString() };

  if (id) {
    const idx = moliyalar.findIndex(x=>x.id===id);
    moliyalar[idx] = data;
    showToast('Tranzaksiya yangilandi!');
  } else {
    moliyalar.push(data);
    showToast('✅ Tranzaksiya qo\'shildi!');
    TG.moliyaQoshildi(data);
  }

  DB.set('moliyalar', moliyalar);
  closeModal('moliya-modal');
  renderMoliya();
  renderDashboard();
}

function deleteMoliya(id) {
  if (!confirm('O\'chirasizmi?')) return;
  DB.delete('moliyalar', id);
  showToast('O\'chirildi');
  renderMoliya();
  renderDashboard();
}


// ══════════════════════════════════════════════════════════════
//  HISOBOT MODULI
// ══════════════════════════════════════════════════════════════
function getDateRange(davr) {
  const now=new Date(), start=new Date();
  if (davr==='kun')   { start.setHours(0,0,0,0); }
  else if (davr==='hafta') { const d=now.getDay(); start.setDate(now.getDate()-d+(d===0?-6:1)); start.setHours(0,0,0,0); }
  else if (davr==='oy')  { start.setDate(1); start.setHours(0,0,0,0); }
  else if (davr==='yil') { start.setMonth(0,1); start.setHours(0,0,0,0); }
  return { start, end: now };
}

function inRange(dateStr, range) {
  const d=new Date(dateStr); return d>=range.start && d<=range.end;
}

function renderHisobot() {
  const davr = document.getElementById('hisobot-davr')?.value || 'oy';
  const range = getDateRange(davr);

  const buyurtmalar = DB.get('buyurtmalar').filter(b=>inRange(b.sana,range));
  const moliyalar   = DB.get('moliyalar').filter(m=>inRange(m.sana,range));

  const kirim  = moliyalar.filter(m=>m.tur==='kirim').reduce((s,m)=>s+Number(m.summa),0);
  const chiqim = moliyalar.filter(m=>m.tur==='chiqim').reduce((s,m)=>s+Number(m.summa),0);
  const foyda  = kirim - chiqim;

  const setEl = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  setEl('h-buyurtma', buyurtmalar.length);
  setEl('h-kirim',    formatMoney(kirim));
  setEl('h-chiqim',   formatMoney(chiqim));
  setEl('h-foyda',    formatMoney(foyda));

  const foydaEl = document.getElementById('h-foyda');
  if (foydaEl) foydaEl.style.color = foyda>=0 ? '#10B981' : '#EF4444';

  // Top mahsulotlar
  const mCounts = {};
  buyurtmalar.forEach(b => { if(b.mahsulotNom) mCounts[b.mahsulotNom]=(mCounts[b.mahsulotNom]||0)+Number(b.miqdor||1); });
  const topM = Object.entries(mCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const topMEl = document.getElementById('top-mahsulot');
  if (topMEl) topMEl.innerHTML = topM.length===0
    ? '<p class="empty">Ma\'lumot yo\'q</p>'
    : topM.map(([nom,cnt],i)=>`
        <div class="top-list-item">
          <span><span class="top-num">${i+1}</span>${nom}</span>
          <strong>${cnt} dona</strong>
        </div>`).join('');

  // Top mijozlar
  const mjCounts = {};
  buyurtmalar.forEach(b => { if(b.mijozNom) mjCounts[b.mijozNom]=(mjCounts[b.mijozNom]||0)+Number(b.summa||0); });
  const topMj = Object.entries(mjCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const topMjEl = document.getElementById('top-mijoz');
  if (topMjEl) topMjEl.innerHTML = topMj.length===0
    ? '<p class="empty">Ma\'lumot yo\'q</p>'
    : topMj.map(([nom,summa],i)=>`
        <div class="top-list-item">
          <span><span class="top-num">${i+1}</span>${nom}</span>
          <strong>${formatMoney(summa)}</strong>
        </div>`).join('');
}

// ══════════════════════════════════════════════════════════════
//  XODIMLAR TIZIMI (soddalashtirilgan)
// ══════════════════════════════════════════════════════════════
const ROLLAR = {
  admin:    { nom:'Admin',    emoji:'👑', color:'#2563EB', bg:'#eff6ff', sahifalar:['dashboard','mahsulot','mijoz','buyurtma','moliya','hisobot','trek','kalkulator','xodim'] },
  menejer:  { nom:'Menejer',  emoji:'💼', color:'#10B981', bg:'#ecfdf5', sahifalar:['dashboard','mahsulot','mijoz','buyurtma','hisobot','trek','kalkulator'] },
  omborchi: { nom:'Omborchi', emoji:'📦', color:'#F59E0B', bg:'#fffbeb', sahifalar:['dashboard','mahsulot','trek'] },
  operator: { nom:'Operator', emoji:'🖥️', color:'#6366f1', bg:'#eef2ff', sahifalar:['dashboard','buyurtma','mijoz'] },
};

let _currentXodim = null;

function renderXodimlar(filter='') {
  const xodimlar = DB.get('xodimlar');
  const tbody = document.getElementById('xodim-tbody');
  if (!tbody) return;
  const list = filter ? xodimlar.filter(x=>(x.ism||'').toLowerCase().includes(filter.toLowerCase())) : xodimlar;
  tbody.innerHTML = list.map((x,i) => {
    const r = ROLLAR[x.rol]||{emoji:'👤',nom:x.rol,color:'#64748b',bg:'#f1f5f9'};
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${x.ism}</strong></td>
      <td><span class="rol-badge" style="background:${r.bg};color:${r.color}">${r.emoji} ${r.nom}</span></td>
      <td>${x.tel||'—'}</td>
      <td><span style="color:#94a3b8">${x.parol?'••••••':'Parolsiz'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon btn-edit" onclick="editXodim('${x.id}')"><i class="fas fa-pen"></i></button>
          <button class="btn-icon btn-del" onclick="deleteXodim('${x.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" class="tbl-empty"><div class="empty-state"><span class="empty-icon">👥</span><p>Xodim yo'q</p></div></td></tr>`;
}

function renderRollar() {
  const el = document.getElementById('rollar-grid');
  if (!el) return;
  el.innerHTML = Object.entries(ROLLAR).map(([k,r])=>`
    <div class="rol-card" style="border-left:3px solid ${r.color}">
      <div style="font-size:1.8rem">${r.emoji}</div>
      <div>
        <strong style="color:${r.color}">${r.nom}</strong>
        <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:3px">
          ${r.sahifalar.map(s=>`<span class="rol-page-chip">${s}</span>`).join('')}
        </div>
      </div>
    </div>`).join('');
}

function filterXodimlar() { renderXodimlar(document.getElementById('xodim-search')?.value||''); }

function openXodimModal() {
  document.getElementById('xd-modal-title').textContent='Yangi xodim';
  ['xd-id','xd-ism','xd-tel','xd-parol'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('xd-rol').value='operator';
  openModal('xodim-modal');
}

function editXodim(id) {
  const x=DB.get('xodimlar').find(xd=>xd.id===id); if(!x) return;
  document.getElementById('xd-modal-title').textContent='Xodimni tahrirlash';
  document.getElementById('xd-id').value=x.id; document.getElementById('xd-ism').value=x.ism;
  document.getElementById('xd-rol').value=x.rol; document.getElementById('xd-tel').value=x.tel||'';
  document.getElementById('xd-parol').value=x.parol||'';
  openModal('xodim-modal');
}

function saveXodim() {
  const ism=document.getElementById('xd-ism').value.trim();
  const rol=document.getElementById('xd-rol').value;
  if(!ism||!rol){showToast('Ism va rol majburiy!','error');return;}
  const xodimlar=DB.get('xodimlar');
  const id=document.getElementById('xd-id').value;
  const data={id:id||genId(),ism,rol,tel:document.getElementById('xd-tel').value.trim(),parol:document.getElementById('xd-parol').value.trim(),sana:today()};
  if(id){const idx=xodimlar.findIndex(x=>x.id===id);xodimlar[idx]={...xodimlar[idx],...data};showToast('Xodim yangilandi!');}
  else{xodimlar.push(data);showToast('✅ Xodim qo\'shildi!');}
  DB.set('xodimlar',xodimlar); closeModal('xodim-modal'); renderXodimlar();
}

function deleteXodim(id) {
  const xodimlar=DB.get('xodimlar');
  if(xodimlar.find(x=>x.id===id)?.rol==='admin'&&xodimlar.filter(x=>x.rol==='admin').length===1){showToast('Oxirgi adminni o\'chirib bo\'lmaydi!','error');return;}
  if(!confirm('O\'chirasizmi?'))return;
  DB.delete('xodimlar',id); renderXodimlar();
}

function createDefaultAdmin() {
  const xodimlar=DB.get('xodimlar');
  if(!xodimlar.some(x=>x.rol==='admin')){
    xodimlar.push({id:genId(),ism:'Admin',rol:'admin',tel:'',parol:'admin123',sana:today()});
    DB.set('xodimlar',xodimlar);
  }
}

function showLoginScreen() { openModal('login-modal'); _fillLoginSelect(); }

function _fillLoginSelect() {
  const sel=document.getElementById('login-xodim-sel'); if(!sel)return;
  const xodimlar=DB.get('xodimlar');
  sel.innerHTML='<option value="">Tanlang...</option>'+
    xodimlar.map(x=>{const r=ROLLAR[x.rol];return `<option value="${x.id}">${r?.emoji||''} ${x.ism}</option>`;}).join('');
}

function xodimLogin() {
  const id=document.getElementById('login-xodim-sel').value;
  const parol=document.getElementById('login-parol').value;
  const err=document.getElementById('login-xato');
  if(!id){err.textContent='Xodimni tanlang!';return;}
  const x=DB.get('xodimlar').find(xd=>xd.id===id);
  if(!x){err.textContent='Topilmadi!';return;}
  if(x.parol&&x.parol!==parol){err.textContent='❌ Parol noto\'g\'ri!';return;}
  _currentXodim=x; localStorage.setItem('current_xodim',JSON.stringify(x));
  closeModal('login-modal');
  _applyRolPermissions(x.rol);
  showToast(`${ROLLAR[x.rol]?.emoji||''} Xush kelibsiz, ${x.ism}!`);
  _updateUserBadge(x);
}

function logoutXodim() {
  if(!confirm('Tizimdan chiqasizmi?'))return;
  localStorage.removeItem('current_xodim'); _currentXodim=null;
  document.querySelectorAll('.nav-link[data-page]').forEach(l=>l.style.display='');
  const badge=document.getElementById('user-badge'); if(badge) badge.style.display='none';
  showToast('Tizimdan chiqildi');
}

function _applyRolPermissions(rol) {
  const r=ROLLAR[rol]; if(!r) return;
  document.querySelectorAll('.nav-link[data-page]').forEach(l=>{
    const p=l.dataset.page; l.style.display=(p&&!r.sahifalar.includes(p))?'none':'';
  });
}

function _updateUserBadge(x) {
  const badge=document.getElementById('user-badge'); if(!badge)return;
  const r=ROLLAR[x.rol];
  badge.innerHTML=`${r?.emoji||'👤'} ${x.ism}`;
  badge.style.cssText=`display:inline-flex;align-items:center;gap:0.3rem;padding:0.4rem 0.75rem;border-radius:20px;font-size:0.82rem;font-weight:600;background:${r?.bg||'#f1f5f9'};color:${r?.color||'#64748b'}`;
}


// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Dark mode
  initDarkMode();

  // Sana
  const d = new Date();
  const dateEl = document.getElementById('currentDate');
  if (dateEl) dateEl.textContent = d.toLocaleDateString('uz-UZ', { weekday:'short', day:'numeric', month:'long', year:'numeric' });

  // Default admin
  createDefaultAdmin();

  // Avvalgi xodimni tiklash
  const savedXodim = localStorage.getItem('current_xodim');
  if (savedXodim) {
    try {
      const x = JSON.parse(savedXodim);
      _currentXodim = x;
      _applyRolPermissions(x.rol);
      _updateUserBadge(x);
    } catch {}
  }

  // Dashboard render
  renderDashboard();

  // URL parametr tekshirish (QR skan linki)
  if (typeof checkProductUrlParam === 'function') checkProductUrlParam();

  // Firebase init (background)
  if (typeof initFirebase === 'function') {
    initFirebase().then(ok => {
      if (ok && typeof setupRealTimeListeners === 'function') {
        setupRealTimeListeners();
      }
    });
  }

  // Kunlik hisobot scheduler
  if (typeof startKunlikHisobotScheduler === 'function') {
    startKunlikHisobotScheduler();
  }

  // Telegram default chat ID
  if (!localStorage.getItem('tg_chat_id')) {
    localStorage.setItem('tg_chat_id', '6946915342');
  }
});
