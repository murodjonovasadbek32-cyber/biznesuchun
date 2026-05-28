// ===== MA'LUMOTLAR BOSHQARUVI =====

const DB = {
  get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

// ===== NAVIGATSIYA =====
const pageTitles = {
  dashboard: 'Bosh sahifa',
  mahsulot: 'Mahsulot / Ombor',
  mijoz: 'Mijozlar',
  buyurtma: 'Buyurtmalar',
  moliya: 'Moliya',
  hisobot: 'Hisobotlar',
};

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('pageTitle').textContent = pageTitles[name];

  const links = document.querySelectorAll('.nav-link');
  links.forEach(l => {
    if (l.getAttribute('onclick')?.includes(name)) l.classList.add('active');
  });

  // Mobildan keyin yoping
  if (window.innerWidth <= 768) closeSidebarMobile();

  // Sahifaga mos render
  if (name === 'dashboard') renderDashboard();
  if (name === 'mahsulot') renderMahsulot();
  if (name === 'mijoz') renderMijoz();
  if (name === 'buyurtma') renderBuyurtma();
  if (name === 'moliya') renderMoliya();
  if (name === 'hisobot') renderHisobot();
}

// ===== SIDEBAR =====
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSidebarMobile() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ===== MODAL =====
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ===== TOAST =====
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== SANA =====
function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(n) {
  if (!n) return '0 so\'m';
  return Number(n).toLocaleString('uz-UZ') + ' so\'m';
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ===== DASHBOARD =====
function renderDashboard() {
  const mahsulotlar = DB.get('mahsulotlar');
  const mijozlar = DB.get('mijozlar');
  const buyurtmalar = DB.get('buyurtmalar');
  const moliyalar = DB.get('moliyalar');

  document.getElementById('stat-mahsulot').textContent = mahsulotlar.length;
  document.getElementById('stat-mijoz').textContent = mijozlar.length;
  document.getElementById('stat-buyurtma').textContent = buyurtmalar.length;

  const kirim = moliyalar.filter(m => m.tur === 'kirim').reduce((s, m) => s + Number(m.summa), 0);
  const chiqim = moliyalar.filter(m => m.tur === 'chiqim').reduce((s, m) => s + Number(m.summa), 0);
  document.getElementById('stat-foyda').textContent = formatMoney(kirim - chiqim);

  // Kam qolgan mahsulotlar
  const kam = mahsulotlar.filter(m => Number(m.miqdor) <= Number(m.min || 5));
  const kamEl = document.getElementById('kam-mahsulot-list');
  if (kam.length === 0) {
    kamEl.innerHTML = '<p class="empty">Hammasi yetarli ✅</p>';
  } else {
    kamEl.innerHTML = kam.map(m =>
      `<div class="top-list-item">
        <span><span class="top-num">!</span>${m.nom}</span>
        <span class="badge badge-kam">${m.miqdor} dona</span>
      </div>`
    ).join('');
  }

  // So'nggi buyurtmalar
  const songi = [...buyurtmalar].sort((a, b) => new Date(b.sana) - new Date(a.sana)).slice(0, 5);
  const songiEl = document.getElementById('songi-buyurtma-list');
  if (songi.length === 0) {
    songiEl.innerHTML = '<p class="empty">Buyurtma yo\'q</p>';
  } else {
    songiEl.innerHTML = songi.map(b =>
      `<div class="top-list-item">
        <span>${b.mijozNom || 'Noma\'lum'} – ${b.mahsulotNom || ''}</span>
        <span class="badge badge-${b.holat}">${b.holat}</span>
      </div>`
    ).join('');
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Sana ko'rsatish
  const d = new Date();
  document.getElementById('currentDate').textContent =
    d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  renderDashboard();
});
