// ===== XODIMLAR TIZIMI (ROLES & AUTH) =====

const ROLLAR = {
  admin: {
    nom: 'Admin',
    emoji: '👑',
    rang: '#6c63ff',
    bg: '#ede9fe',
    sahifalar: ['dashboard', 'mahsulot', 'mijoz', 'buyurtma', 'moliya', 'hisobot', 'trek', 'xodim', 'kalkulator'],
    amallar: ['all'],
  },
  menejer: {
    nom: 'Menejer',
    emoji: '💼',
    rang: '#3b82f6',
    bg: '#dbeafe',
    sahifalar: ['dashboard', 'mahsulot', 'mijoz', 'buyurtma', 'hisobot', 'trek', 'kalkulator'],
    amallar: ['view', 'add', 'edit'],
  },
  omborchi: {
    nom: 'Omborchi',
    emoji: '📦',
    rang: '#f97316',
    bg: '#ffedd5',
    sahifalar: ['dashboard', 'mahsulot', 'trek'],
    amallar: ['view', 'add', 'edit'],
  },
  operator: {
    nom: 'Operator',
    emoji: '🖥️',
    rang: '#22c55e',
    bg: '#dcfce7',
    sahifalar: ['dashboard', 'buyurtma', 'mijoz'],
    amallar: ['view', 'add'],
  },
};

// ===== JORIY FOYDALANUVCHI =====
let currentXodim = null;

function getCurrentXodim() {
  const saved = localStorage.getItem('current_xodim');
  if (saved) {
    currentXodim = JSON.parse(saved);
    return currentXodim;
  }
  return null;
}

function setCurrentXodim(xodim) {
  currentXodim = xodim;
  localStorage.setItem('current_xodim', JSON.stringify(xodim));
}

function logoutXodim() {
  if (!confirm('Tizimdan chiqasizmi?')) return;
  localStorage.removeItem('current_xodim');
  currentXodim = null;
  showLoginScreen();
}

// ===== LOGIN EKRANI =====
function showLoginScreen() {
  const loginModal = document.getElementById('login-modal');
  if (loginModal) {
    // Xodimlar listini yuklash
    const xodimlar = DB.get('xodimlar');
    const sel = document.getElementById('login-xodim-sel');
    if (sel) {
      sel.innerHTML = '<option value="">Tanlang...</option>' +
        xodimlar.map(x => {
          const rol = ROLLAR[x.rol];
          return `<option value="${x.id}">${rol?.emoji || ''} ${x.ism} (${rol?.nom || x.rol})</option>`;
        }).join('');
    }
    document.getElementById('login-parol').value = '';
    document.getElementById('login-xato').textContent = '';
    loginModal.classList.add('open');
  }
}

function xodimLogin() {
  const xodimId = document.getElementById('login-xodim-sel').value;
  const parol = document.getElementById('login-parol').value;
  const xatoEl = document.getElementById('login-xato');

  if (!xodimId) {
    xatoEl.textContent = 'Xodimni tanlang!';
    return;
  }

  const xodimlar = DB.get('xodimlar');
  const xodim = xodimlar.find(x => x.id === xodimId);

  if (!xodim) {
    xatoEl.textContent = 'Xodim topilmadi!';
    return;
  }

  if (xodim.parol && xodim.parol !== parol) {
    xatoEl.textContent = '❌ Parol noto\'g\'ri!';
    return;
  }

  // Login muvaffaqiyatli
  setCurrentXodim(xodim);
  document.getElementById('login-modal').classList.remove('open');
  applyRolPermissions(xodim.rol);
  showToast(`${ROLLAR[xodim.rol]?.emoji || ''} Xush kelibsiz, ${xodim.ism}!`);
  updateUserBadge(xodim);
}

// ===== ROL RUXSATLARINI QOLLASH =====
function applyRolPermissions(rol) {
  const rolInfo = ROLLAR[rol];
  if (!rolInfo) return;

  // Sidebar linklar
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const page = link.dataset.page;
    if (page && !rolInfo.sahifalar.includes(page)) {
      link.style.display = 'none';
    } else {
      link.style.display = '';
    }
  });

  // Moliya sahifasini yashirish (operator va omborchi uchun)
  if (!rolInfo.sahifalar.includes('moliya')) {
    document.querySelector('.nav-link[onclick*="moliya"]')?.style && (document.querySelector('.nav-link[onclick*="moliya"]').style.display = 'none');
  }

  // Qo'shish/o'chirish tugmalarini yashirish
  if (!rolInfo.amallar.includes('all') && !rolInfo.amallar.includes('add')) {
    document.querySelectorAll('.btn-primary[onclick*="open"], .btn-danger').forEach(btn => {
      btn.style.display = 'none';
    });
  }

  // Admin panelni ko'rsatish/yashirish
  const adminLink = document.querySelector('.nav-link[onclick*="xodim"]');
  if (adminLink) {
    adminLink.style.display = rol === 'admin' ? '' : 'none';
  }
}

// ===== USER BADGE =====
function updateUserBadge(xodim) {
  const badge = document.getElementById('user-badge');
  if (!badge) return;
  const rol = ROLLAR[xodim.rol];
  badge.innerHTML = `${rol?.emoji || '👤'} ${xodim.ism}`;
  badge.title = rol?.nom || xodim.rol;
  badge.style.background = rol?.bg || '#f1f5f9';
  badge.style.color = rol?.rang || '#64748b';
  badge.style.display = 'inline-flex';
}

// ===== XODIMLAR SAHIFASI RENDER =====
function renderXodimlar(filter = '') {
  const xodimlar = DB.get('xodimlar');
  const tbody = document.getElementById('xodim-tbody');
  if (!tbody) return;

  const list = filter
    ? xodimlar.filter(x => x.ism.toLowerCase().includes(filter.toLowerCase()))
    : xodimlar;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Xodim yo'q. Admin qo'shing!</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((x, i) => {
    const rol = ROLLAR[x.rol] || { emoji: '👤', nom: x.rol, bg: '#f1f5f9', rang: '#64748b' };
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${x.ism}</strong></td>
        <td>
          <span style="background:${rol.bg};color:${rol.rang};padding:0.25rem 0.6rem;border-radius:20px;font-size:0.8rem">
            ${rol.emoji} ${rol.nom}
          </span>
        </td>
        <td>${x.tel || '—'}</td>
        <td>
          <span style="font-size:0.78rem;color:#94a3b8">${x.parol ? '●●●●●●' : 'Parolsiz'}</span>
        </td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editXodim('${x.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteXodim('${x.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

// ===== XODIM QO'SHISH MODAL =====
function openXodimModal() {
  document.getElementById('xd-modal-title').textContent = 'Yangi xodim';
  document.getElementById('xd-id').value = '';
  document.getElementById('xd-ism').value = '';
  document.getElementById('xd-rol').value = 'operator';
  document.getElementById('xd-tel').value = '';
  document.getElementById('xd-parol').value = '';
  openModal('xodim-modal');
}

function editXodim(id) {
  const xodimlar = DB.get('xodimlar');
  const x = xodimlar.find(xd => xd.id === id);
  if (!x) return;

  document.getElementById('xd-modal-title').textContent = 'Xodimni tahrirlash';
  document.getElementById('xd-id').value = x.id;
  document.getElementById('xd-ism').value = x.ism;
  document.getElementById('xd-rol').value = x.rol;
  document.getElementById('xd-tel').value = x.tel || '';
  document.getElementById('xd-parol').value = x.parol || '';
  openModal('xodim-modal');
}

function saveXodim() {
  const ism = document.getElementById('xd-ism').value.trim();
  const rol = document.getElementById('xd-rol').value;
  const tel = document.getElementById('xd-tel').value.trim();
  const parol = document.getElementById('xd-parol').value.trim();

  if (!ism || !rol) {
    showToast('Ism va rol majburiy!', 'error');
    return;
  }

  const xodimlar = DB.get('xodimlar');
  const id = document.getElementById('xd-id').value;

  if (id) {
    const idx = xodimlar.findIndex(x => x.id === id);
    xodimlar[idx] = { ...xodimlar[idx], ism, rol, tel, parol };
    showToast('Xodim yangilandi!');
  } else {
    xodimlar.push({ id: genId(), ism, rol, tel, parol, sana: today() });
    showToast('Xodim qo\'shildi!');
  }

  DB.set('xodimlar', xodimlar);
  closeModal('xodim-modal');
  renderXodimlar();
}

function deleteXodim(id) {
  const xodimlar = DB.get('xodimlar');

  // Adminni o'chirishdan himoya
  const x = xodimlar.find(xd => xd.id === id);
  if (x?.rol === 'admin' && xodimlar.filter(xd => xd.rol === 'admin').length === 1) {
    showToast('Oxirgi admin o\'chirilmaydi!', 'error');
    return;
  }

  if (!confirm('Xodimni o\'chirasizmi?')) return;
  const yangi = xodimlar.filter(xd => xd.id !== id);
  DB.set('xodimlar', yangi);
  showToast('Xodim o\'chirildi!');
  renderXodimlar();
}

function filterXodimlar() {
  const val = document.getElementById('xodim-search')?.value || '';
  renderXodimlar(val);
}

// ===== ROLLAR SAHIFASIDA KO'RSATISH =====
function renderRollar() {
  const el = document.getElementById('rollar-grid');
  if (!el) return;

  el.innerHTML = Object.entries(ROLLAR).map(([key, rol]) => `
    <div class="rol-card" style="border-left:4px solid ${rol.rang}">
      <div style="font-size:2rem">${rol.emoji}</div>
      <div>
        <strong style="color:${rol.rang}">${rol.nom}</strong>
        <div style="font-size:0.8rem;color:#64748b;margin-top:4px">
          ${rol.sahifalar.map(s => `<span style="background:#f1f5f9;border-radius:4px;padding:2px 6px;margin:2px;display:inline-block;font-size:0.72rem">${s}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

// ===== DEFAULT ADMIN YARATISH =====
function createDefaultAdmin() {
  const xodimlar = DB.get('xodimlar');
  const adminBor = xodimlar.some(x => x.rol === 'admin');

  if (!adminBor) {
    xodimlar.push({
      id: genId(),
      ism: 'Admin',
      rol: 'admin',
      tel: '',
      parol: 'admin123',
      sana: today(),
    });
    DB.set('xodimlar', xodimlar);
    console.log('✅ Default admin yaratildi: admin / admin123');
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  createDefaultAdmin();

  const xodim = getCurrentXodim();
  if (xodim) {
    applyRolPermissions(xodim.rol);
    updateUserBadge(xodim);
  }
  // Login ekranini YOQMASLIK - majburiy login kerak bo'lmasa
  // Faqat xodim tizimi sahifasi ochilganda ishlaydi
});
