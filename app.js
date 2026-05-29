// ===== MA'LUMOTLAR BOSHQARUVI =====

const DB = {
  get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

// ===== TELEGRAM BOT =====
const TG = {
  token: '8838693056:AAG0uZNDFcNGfAX4EiRKnhoDCZuzzhczaRo',

  getChatId() {
    return localStorage.getItem('tg_chat_id') || null;
  },

  async xabar(matn) {
    const chatId = this.getChatId();
    if (!chatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: matn,
          parse_mode: 'HTML',
        }),
      });
    } catch (e) {
      console.warn('TG xabar yuborilmadi:', e);
    }
  },

  // Chat ID ni botdan avtomatik olish
  async chatIdOl() {
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/getUpdates`);
      const data = await res.json();
      if (data.ok && data.result.length > 0) {
        const last = data.result[data.result.length - 1];
        const id = last.message?.chat?.id || last.channel_post?.chat?.id;
        if (id) {
          localStorage.setItem('tg_chat_id', id);
          return id;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  // Mahsulot qo'shildi xabari
  mahsulotQoshildi(m) {
    this.xabar(
      `📦 <b>Yangi Mahsulot Qo'shildi!</b>\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🏷 Nomi: <b>${m.nom}</b>\n` +
      `📂 Kategoriya: ${m.kat}\n` +
      `${m.trek ? `🔖 Trek: <code>${m.trek}</code>\n` : ''}` +
      `${m.xitoyNarx ? `💴 Yuan narxi: ¥${Number(m.xitoyNarx).toLocaleString()}\n` : ''}` +
      `💰 Sotuv narxi: <b>${formatMoney(m.sotuvNarx)}</b>\n` +
      `📦 Miqdor: <b>${m.miqdor} dona</b>\n` +
      `📅 ${today()}`
    );
  },

  // Mahsulot yangilandi xabari
  mahsulotYangilandi(m) {
    this.xabar(
      `✏️ <b>Mahsulot Yangilandi!</b>\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🏷 Nomi: <b>${m.nom}</b>\n` +
      `💰 Sotuv narxi: ${formatMoney(m.sotuvNarx)}\n` +
      `📦 Miqdor: <b>${m.miqdor} dona</b>\n` +
      `📅 ${today()}`
    );
  },

  // Yangi mijoz xabari
  mijozQoshildi(m) {
    this.xabar(
      `👤 <b>Yangi Mijoz Qo'shildi!</b>\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `👨 Ism: <b>${m.ism}</b>\n` +
      `📞 Telefon: <code>${m.tel}</code>\n` +
      `${m.manzil ? `📍 Manzil: ${m.manzil}\n` : ''}` +
      `📅 ${m.sana || today()}`
    );
  },

  // Yangi buyurtma xabari
  buyurtmaQoshildi(b) {
    const emoji = { yangi:'🆕', jarayonda:'⏳', yetkazildi:'✅', bekor:'❌' };
    const tolovEmoji = { naqd:'💵', karta:'💳', nasiya:'📝', uzum:'📱' };
    this.xabar(
      `🛒 <b>Yangi Buyurtma!</b>\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🔢 Buyurtma: <b>#${b.raqam}</b>\n` +
      `👨 Mijoz: ${b.mijozNom}\n` +
      `📦 Mahsulot: <b>${b.mahsulotNom}</b>\n` +
      `🔢 Miqdor: ${b.miqdor} dona\n` +
      `💰 Summa: <b>${formatMoney(b.summa)}</b>\n` +
      `${tolovEmoji[b.tolov]||'💳'} To'lov: ${b.tolov}\n` +
      `${emoji[b.holat]||'📋'} Holat: ${b.holat}\n` +
      `📅 ${b.sana}`
    );
  },

  // Buyurtma holati o'zgardi
  buyurtmaHolat(b, yangiHolat) {
    const emoji = { yangi:'🆕', jarayonda:'⏳', yetkazildi:'✅', bekor:'❌' };
    this.xabar(
      `🔄 <b>Buyurtma Holati O'zgardi!</b>\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🔢 №: <b>#${b.raqam}</b>\n` +
      `👨 Mijoz: ${b.mijozNom}\n` +
      `📦 Mahsulot: ${b.mahsulotNom}\n` +
      `${emoji[yangiHolat]||'📋'} Yangi holat: <b>${yangiHolat.toUpperCase()}</b>\n` +
      `💰 Summa: ${formatMoney(b.summa)}\n` +
      `📅 ${today()}`
    );
  },

  // Moliya tranzaksiyasi
  moliyaQoshildi(m) {
    const tur = m.tur === 'kirim' ? '💚 KIRIM' : '🔴 CHIQIM';
    this.xabar(
      `💳 <b>Yangi Tranzaksiya!</b>\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `${tur}: <b>${formatMoney(m.summa)}</b>\n` +
      `📝 ${m.tavsif}\n` +
      `📅 ${m.sana}`
    );
  },

  // Kam qolgan mahsulot ogohlantirish
  kamMahsulot(m) {
    this.xabar(
      `⚠️ <b>DIQQAT! Mahsulot Kam Qoldi!</b>\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `📦 Nomi: <b>${m.nom}</b>\n` +
      `🔴 Qoldiq: <b>${m.miqdor} dona</b>\n` +
      `📉 Minimal: ${m.min || 5} dona\n` +
      `⚡ Zudlik bilan tovar buyurtma qiling!\n` +
      `📅 ${today()}`
    );
  },
};

// ===== NAVIGATSIYA =====
const pageTitles = {
  dashboard: 'Bosh sahifa',
  mahsulot: 'Mahsulot / Ombor',
  mijoz: 'Mijozlar',
  buyurtma: 'Buyurtmalar',
  moliya: 'Moliya',
  uzum: '📊 Uzum Foyda Kalkulyatori',
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

  if (window.innerWidth <= 768) closeSidebarMobile();

  if (name === 'dashboard') renderDashboard();
  if (name === 'mahsulot')  renderMahsulot();
  if (name === 'mijoz')     renderMijoz();
  if (name === 'buyurtma')  renderBuyurtma();
  if (name === 'moliya')    renderMoliya();
  if (name === 'hisobot')   renderHisobot();
}

// ===== UZUM MARKET FOYDA KALKULYATORI =====
function uzumHisob() {
  const sotuv    = parseFloat(document.getElementById('uz-sotuv').value)    || 0;
  const tannarx  = parseFloat(document.getElementById('uz-tannarx').value)  || 0;
  const komPct   = parseFloat(document.getElementById('uz-komissiya').value)|| 15;
  const logistika= parseFloat(document.getElementById('uz-logistika').value)|| 15000;
  const reklama  = parseFloat(document.getElementById('uz-reklama').value)  || 0;
  const qadoq    = parseFloat(document.getElementById('uz-qadoq').value)    || 0;

  if (sotuv <= 0) return;

  const komSumma  = Math.round(sotuv * komPct / 100);
  const jami_sarif= komSumma + logistika + reklama + qadoq + tannarx;
  const foyda     = sotuv - jami_sarif;
  const marja     = sotuv > 0 ? ((foyda / sotuv) * 100).toFixed(1) : 0;

  document.getElementById('uzum-natija').style.display = 'block';
  document.getElementById('uz-r-sotuv').textContent     = formatMoney(sotuv);
  document.getElementById('uz-r-komissiya').textContent = `- ${formatMoney(komSumma)} (${komPct}%)`;
  document.getElementById('uz-r-logistika').textContent = `- ${formatMoney(logistika)}`;
  document.getElementById('uz-r-reklama').textContent   = reklama > 0 ? `- ${formatMoney(reklama)}` : '—';
  document.getElementById('uz-r-qadoq').textContent     = qadoq > 0 ? `- ${formatMoney(qadoq)}` : '—';
  document.getElementById('uz-r-tannarx').textContent   = `- ${formatMoney(tannarx)}`;
  document.getElementById('uz-r-foyda').textContent     = formatMoney(foyda);
  document.getElementById('uz-r-marja').textContent     = `${marja}%`;

  // Rang: yashil/sariq/qizil
  const foydaRow = document.getElementById('uz-foyda-row');
  const foydaVal = document.getElementById('uz-r-foyda');
  if (foyda > 0) {
    foydaRow.style.background = '#dcfce7';
    foydaVal.style.color = '#16a34a';
  } else if (foyda === 0) {
    foydaRow.style.background = '#fef9c3';
    foydaVal.style.color = '#ca8a04';
  } else {
    foydaRow.style.background = '#fee2e2';
    foydaVal.style.color = '#dc2626';
  }

  // Foyda metri
  const pct = Math.max(0, Math.min(100, parseFloat(marja)));
  document.getElementById('foyda-bar').style.width = pct + '%';
  document.getElementById('foyda-bar').style.background =
    pct > 20 ? '#22c55e' : pct > 10 ? '#f97316' : '#ef4444';
  document.getElementById('foyda-meter-label').textContent = `${marja}%`;

  // Maslahat
  const maslahat = document.getElementById('uzum-maslahat');
  if (foyda < 0) {
    maslahat.innerHTML = `❌ <b>Zarar!</b> Sotuv narxini oshiring yoki xarajatlarni kamaytiring.`;
    maslahat.style.background = '#fee2e2';
    maslahat.style.color = '#dc2626';
  } else if (parseFloat(marja) < 10) {
    maslahat.innerHTML = `⚠️ <b>Past rentabellik!</b> Marja 10% dan kam. Narxni oshirish tavsiya etiladi.`;
    maslahat.style.background = '#fff7ed';
    maslahat.style.color = '#ea580c';
  } else {
    maslahat.innerHTML = `✅ <b>Yaxshi!</b> Har sotuvda ${formatMoney(foyda)} foyda olasiz (${marja}% marja).`;
    maslahat.style.background = '#dcfce7';
    maslahat.style.color = '#15803d';
  }
  maslahat.style.display = 'block';
}

function uzumTgYuborish() {
  const sotuv   = document.getElementById('uz-r-sotuv').textContent;
  const foyda   = document.getElementById('uz-r-foyda').textContent;
  const marja   = document.getElementById('uz-r-marja').textContent;
  const kom     = document.getElementById('uz-r-komissiya').textContent;
  const log     = document.getElementById('uz-r-logistika').textContent;
  const tannarx = document.getElementById('uz-r-tannarx').textContent;

  TG.xabar(
    `📊 <b>Uzum Market Foyda Hisobi</b>\n\n` +
    `💰 Sotuv narxi: ${sotuv}\n` +
    `🏷 Tannarx: ${tannarx}\n` +
    `📊 Uzum komissiyasi: ${kom}\n` +
    `🚚 Logistika: ${log}\n` +
    `──────────────\n` +
    `📈 Sof foyda: <b>${foyda}</b>\n` +
    `📊 Rentabellik: <b>${marja}</b>\n` +
    `📅 Sana: ${today()}`
  );
  showToast('Telegramga yuborildi!');
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
  const d = new Date();
  document.getElementById('currentDate').textContent =
    d.toLocaleDateString('uz-UZ', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  renderDashboard();
  tgChatIdYukla();
  kunlikHisobotTimer(); // ⏰ Har kuni 21:00 hisobot
});

// ===== KUNLIK AVTOMATIK HISOBOT (soat 21:00) =====
function kunlikHisobotTimer() {
  const tekshir = () => {
    const hozir = new Date();
    const soat  = hozir.getHours();
    const daqiqa= hozir.getMinutes();
    const oxirgi= localStorage.getItem('oxirgi_hisobot');
    const bugun = today();

    // Soat 21:00 da va bugun hali yuborilmagan bo'lsa
    if (soat === 21 && daqiqa === 0 && oxirgi !== bugun) {
      localStorage.setItem('oxirgi_hisobot', bugun);
      kunlikHisobotYuborish();
    }
  };

  // Har daqiqa tekshirish
  setInterval(tekshir, 60 * 1000);
  tekshir(); // Darhol ham tekshir (agar 21:00 bo'lsa)
}

async function kunlikHisobotYuborish() {
  const buyurtmalar = DB.get('buyurtmalar');
  const moliyalar   = DB.get('moliyalar');
  const mahsulotlar = DB.get('mahsulotlar');
  const bugun       = today();

  // Bugungi buyurtmalar
  const bugunBuyurtma = buyurtmalar.filter(b => b.sana === bugun);
  const bugunYetkazildi = bugunBuyurtma.filter(b => b.holat === 'yetkazildi');
  const bugunSotuv    = bugunYetkazildi.reduce((s, b) => s + Number(b.summa), 0);

  // Bugungi moliya
  const bugunKirim  = moliyalar.filter(m => m.sana === bugun && m.tur === 'kirim')
                               .reduce((s, m) => s + Number(m.summa), 0);
  const bugunChiqim = moliyalar.filter(m => m.sana === bugun && m.tur === 'chiqim')
                               .reduce((s, m) => s + Number(m.summa), 0);

  // Kam qolgan mahsulotlar
  const kamMahsulot = mahsulotlar.filter(m => Number(m.miqdor) <= Number(m.min || 5));

  const matn =
    `📊 <b>Kunlik Hisobot — ${bugun}</b>\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `🛒 Buyurtmalar: <b>${bugunBuyurtma.length} ta</b>\n` +
    `✅ Yetkazildi: <b>${bugunYetkazildi.length} ta</b>\n` +
    `💰 Sotuv: <b>${formatMoney(bugunSotuv)}</b>\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `💚 Kirim: ${formatMoney(bugunKirim)}\n` +
    `🔴 Chiqim: ${formatMoney(bugunChiqim)}\n` +
    `📈 Foyda: <b>${formatMoney(bugunKirim - bugunChiqim)}</b>\n` +
    `━━━━━━━━━━━━━━━━\n` +
    (kamMahsulot.length > 0
      ? `⚠️ Kam qolgan mahsulotlar: <b>${kamMahsulot.length} ta</b>\n` +
        kamMahsulot.slice(0, 3).map(m => `  • ${m.nom}: ${m.miqdor} dona`).join('\n') + '\n'
      : `✅ Barcha mahsulotlar yetarli\n`) +
    `━━━━━━━━━━━━━━━━\n` +
    `🌙 Yaxshi kechalar!`;

  await TG.xabar(matn);
}

// Qo'lda hisobot yuborish tugmasi
async function hisobotQolda() {
  await kunlikHisobotYuborish();
  showToast('📊 Hisobot Telegramga yuborildi!');
}

// ===== TELEGRAM CHAT ID AVTOMATIK OLISH =====
async function tgChatIdYukla() {
  // Default Chat ID — har doim o'rnatiladi
  const DEFAULT_CHAT_ID = '6946915342';
  if (!localStorage.getItem('tg_chat_id')) {
    localStorage.setItem('tg_chat_id', DEFAULT_CHAT_ID);
  }
}

// ===== TELEGRAM SOZLAMA MODALI =====
function openTgSozlama() {
  const chatId = localStorage.getItem('tg_chat_id') || '';
  const modal = document.getElementById('tg-modal');
  if (modal) {
    document.getElementById('tg-chat-id-input').value = chatId;
    openModal('tg-modal');
  }
}

function tgChatIdSaqlash() {
  const val = document.getElementById('tg-chat-id-input').value.trim();
  if (!val) { showToast('Chat ID kiriting!', 'error'); return; }
  localStorage.setItem('tg_chat_id', val);
  showToast('✅ Telegram Chat ID saqlandi!');
  closeModal('tg-modal');
}

async function tgTestXabar() {
  const chatId = localStorage.getItem('tg_chat_id');
  if (!chatId) { showToast('Avval Chat ID kiriting!', 'error'); return; }
  await TG.xabar('✅ <b>Test xabari!</b>\n\nBiznes dastur Telegram botga ulandi! 🎉');
  showToast('Test xabari yuborildi!');
}

async function tgAvtoChatId() {
  showToast('Bot dan Chat ID olinmoqda...');
  const id = await TG.chatIdOl();
  if (id) {
    document.getElementById('tg-chat-id-input').value = id;
    showToast('✅ Chat ID topildi: ' + id);
  } else {
    showToast('Chat ID topilmadi. Botga /start yuboring!', 'error');
  }
}
