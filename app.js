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
      `📦 <b>Yangi Mahsulot Qo'shildi!</b>\n\n` +
      `🏷 Nomi: <b>${m.nom}</b>\n` +
      `📂 Kategoriya: ${m.kat}\n` +
      `${m.trek ? `🔖 Trek: <code>${m.trek}</code>\n` : ''}` +
      `${m.xitoyNarx ? `💴 Yuan narxi: ¥${Number(m.xitoyNarx).toLocaleString()}\n` : ''}` +
      `💰 Sotuv narxi: ${formatMoney(m.sotuvNarx)}\n` +
      `📦 Miqdor: ${m.miqdor} dona\n` +
      `📅 Sana: ${m.sana || today()}`
    );
  },

  // Mahsulot yangilandi xabari
  mahsulotYangilandi(m) {
    this.xabar(
      `✏️ <b>Mahsulot Yangilandi!</b>\n\n` +
      `🏷 Nomi: <b>${m.nom}</b>\n` +
      `💰 Sotuv narxi: ${formatMoney(m.sotuvNarx)}\n` +
      `📦 Miqdor: ${m.miqdor} dona`
    );
  },

  // Yangi mijoz xabari
  mijozQoshildi(m) {
    this.xabar(
      `👤 <b>Yangi Mijoz!</b>\n\n` +
      `👨 Ism: <b>${m.ism}</b>\n` +
      `📞 Telefon: ${m.tel}\n` +
      `${m.manzil ? `📍 Manzil: ${m.manzil}\n` : ''}` +
      `📅 Sana: ${m.sana || today()}`
    );
  },

  // Yangi buyurtma xabari
  buyurtmaQoshildi(b) {
    const holatEmoji = { yangi: '🆕', jarayonda: '⏳', yetkazildi: '✅', bekor: '❌' };
    this.xabar(
      `🛒 <b>Yangi Buyurtma!</b>\n\n` +
      `🔢 №: <b>#${b.raqam}</b>\n` +
      `👨 Mijoz: ${b.mijozNom}\n` +
      `📦 Mahsulot: ${b.mahsulotNom}\n` +
      `🔢 Miqdor: ${b.miqdor} dona\n` +
      `💰 Summa: <b>${formatMoney(b.summa)}</b>\n` +
      `💳 To'lov: ${b.tolov}\n` +
      `${holatEmoji[b.holat] || '📋'} Holat: ${b.holat}\n` +
      `📅 Sana: ${b.sana}`
    );
  },

  // Buyurtma holati o'zgardi
  buyurtmaHolat(b, yangiHolat) {
    const holatEmoji = { yangi: '🆕', jarayonda: '⏳', yetkazildi: '✅', bekor: '❌' };
    this.xabar(
      `🔄 <b>Buyurtma Holati O'zgardi!</b>\n\n` +
      `🔢 №: <b>#${b.raqam}</b>\n` +
      `👨 Mijoz: ${b.mijozNom}\n` +
      `📦 Mahsulot: ${b.mahsulotNom}\n` +
      `${holatEmoji[yangiHolat] || '📋'} Yangi holat: <b>${yangiHolat}</b>\n` +
      `💰 Summa: ${formatMoney(b.summa)}`
    );
  },

  // Moliya tranzaksiyasi
  moliyaQoshildi(m) {
    const tur = m.tur === 'kirim' ? '💚 Kirim' : '🔴 Chiqim';
    this.xabar(
      `💳 <b>Yangi Tranzaksiya!</b>\n\n` +
      `${tur}: <b>${formatMoney(m.summa)}</b>\n` +
      `📝 Tavsif: ${m.tavsif}\n` +
      `📅 Sana: ${m.sana}`
    );
  },

  // Kam qolgan mahsulot ogohlantirish
  kamMahsulot(m) {
    this.xabar(
      `⚠️ <b>Mahsulot Tugayapti!</b>\n\n` +
      `📦 Nomi: <b>${m.nom}</b>\n` +
      `🔢 Qoldiq: <b>${m.miqdor} dona</b>\n` +
      `📉 Minimal: ${m.min || 5} dona\n` +
      `📅 Sana: ${today()}`
    );
  },

  // Kunlik hisobot
  async kunlikHisobot() {
    const buyurtmalar = DB.get('buyurtmalar');
    const moliyalar = DB.get('moliyalar');
    const today_str = today();

    const bugunBuyurtmalar = buyurtmalar.filter(b => b.sana === today_str);
    const bugunMoliya = moliyalar.filter(m => m.sana === today_str);

    const kirim = bugunMoliya.filter(m => m.tur === 'kirim').reduce((s, m) => s + Number(m.summa), 0);
    const chiqim = bugunMoliya.filter(m => m.tur === 'chiqim').reduce((s, m) => s + Number(m.summa), 0);
    const foyda = kirim - chiqim;

    const yetkazildi = bugunBuyurtmalar.filter(b => b.holat === 'yetkazildi').length;
    const yangi = bugunBuyurtmalar.filter(b => b.holat === 'yangi').length;
    const jarayonda = bugunBuyurtmalar.filter(b => b.holat === 'jarayonda').length;

    // Kam qolgan mahsulotlar soni
    const mahsulotlar = DB.get('mahsulotlar');
    const kamMahsulotlar = mahsulotlar.filter(m => Number(m.miqdor) <= Number(m.min || 5));

    await this.xabar(
      `📊 <b>Kunlik Hisobot</b>\n` +
      `📅 ${new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n` +
      `🛒 <b>Buyurtmalar:</b> ${bugunBuyurtmalar.length} ta\n` +
      `  ✅ Yetkazildi: ${yetkazildi}\n` +
      `  ⏳ Jarayonda: ${jarayonda}\n` +
      `  🆕 Yangi: ${yangi}\n\n` +
      `💰 <b>Moliya:</b>\n` +
      `  📈 Sotuv: ${formatMoney(kirim)}\n` +
      `  📉 Chiqim: ${formatMoney(chiqim)}\n` +
      `  💵 Sof foyda: <b>${formatMoney(foyda)}</b>\n` +
      (kamMahsulotlar.length > 0
        ? `\n⚠️ <b>Kam qolgan mahsulotlar:</b> ${kamMahsulotlar.length} ta\n` +
          kamMahsulotlar.slice(0, 3).map(m => `  • ${m.nom}: ${m.miqdor} dona`).join('\n')
        : `\n✅ Barcha mahsulotlar yetarli`)
    );
  },

  // Xush kelibsiz xabari
  salomlashish() {
    const vaqt = new Date().getHours();
    const salom = vaqt < 12 ? 'Xayrli tong' : vaqt < 18 ? 'Xayrli kun' : 'Xayrli kech';
    this.xabar(
      `${vaqt < 12 ? '🌅' : vaqt < 18 ? '☀️' : '🌙'} <b>${salom}!</b>\n\n` +
      `BiznesApp tizimi ishga tushdi.\n` +
      `📅 ${new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}`
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
  hisobot: 'Hisobotlar',
  trek: '🚢 Trek Nazorat',
  kalkulator: '🧮 Kalkulyator',
  xodim: '👥 Xodimlar Tizimi',
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
  if (name === 'trek') { renderTrekStats(); renderTreklar(); }
  if (name === 'xodim') { renderXodimlar(); renderRollar(); }
  if (name === 'kalkulator') { hisoblaNarx(); hisoblaUzumFoyda(); }
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

  // Telegram Chat ID avtomatik olish
  tgChatIdYukla();

  // Kunlik hisobot scheduler (har kuni 21:00 da)
  startKunlikHisobotScheduler();
});

// ===== KUNLIK HISOBOT SCHEDULER =====
function startKunlikHisobotScheduler() {
  function millisecondsUntil(hour, minute = 0) {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target - now;
  }

  function scheduleHisobot() {
    const msUntil21 = millisecondsUntil(21, 0);
    console.log(`⏰ Kunlik hisobot ${Math.round(msUntil21/3600000)} soatdan so'ng yuboriladi`);
    setTimeout(async () => {
      await TG.kunlikHisobot();
      localStorage.setItem('last_hisobot_date', today());
      // Ertasiga ham rejalashtirish
      scheduleHisobot();
    }, msUntil21);
  }

  // Bugun yuborilmagan bo'lsa, schedulerni ishga tushir
  const lastDate = localStorage.getItem('last_hisobot_date');
  if (lastDate !== today()) {
    scheduleHisobot();
  } else {
    // Ertasiga rejalashtir
    scheduleHisobot();
  }
}

// ===== QOLGAN FUNKSIYALAR =====
// Kunlik hisobotni hozir yuborish (test uchun)
async function kunlikHisobotYuborish() {
  await TG.kunlikHisobot();
  localStorage.setItem('last_hisobot_date', today());
  showToast('✅ Kunlik hisobot Telegram ga yuborildi!');
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
