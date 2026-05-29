// ╔══════════════════════════════════════════════════════════════╗
// ║   TELEGRAM.JS — Bot API v3.0                               ║
// ║   sendMessage + sendPhoto + kunlik hisobot                 ║
// ╚══════════════════════════════════════════════════════════════╝

const TG = {
  token:  '8838693056:AAG0uZNDFcNGfAX4EiRKnhoDCZuzzhczaRo',
  _queue: [],
  _sending: false,

  // ─── Chat ID ─────────────────────────────────────────────────
  getChatId() {
    return localStorage.getItem('tg_chat_id') || '6946915342';
  },

  // ─── MATN XABAR ──────────────────────────────────────────────
  async xabar(matn) {
    const chatId = this.getChatId();
    if (!chatId) return;
    return this._send('sendMessage', {
      chat_id:    chatId,
      text:       matn,
      parse_mode: 'HTML',
    });
  },

  // ─── RASM + MATN XABAR ───────────────────────────────────────
  async rasmXabar(rasmUrl, caption) {
    const chatId = this.getChatId();
    if (!chatId) return;

    // Rasm URL mavjud bo'lsa sendPhoto, aks holda sendMessage
    if (rasmUrl && rasmUrl.startsWith('https://')) {
      return this._send('sendPhoto', {
        chat_id:    chatId,
        photo:      rasmUrl,
        caption:    caption,
        parse_mode: 'HTML',
      });
    }
    // Base64 yoki yo'q bo'lsa — oddiy matn
    return this.xabar(caption);
  },

  // ─── CORE SEND (Queue bilan) ──────────────────────────────────
  async _send(method, body) {
    this._queue.push({ method, body });
    if (!this._sending) this._processQueue();
  },

  async _processQueue() {
    if (this._sending || this._queue.length === 0) return;
    this._sending = true;

    while (this._queue.length > 0) {
      const { method, body } = this._queue.shift();
      try {
        const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.ok) console.warn(`[TG] ${method} xatosi:`, data.description);
      } catch (e) {
        console.warn('[TG] yuborilmadi:', e.message);
      }
      // Rate limit: 1 xabar / 0.5s
      await new Promise(r => setTimeout(r, 500));
    }
    this._sending = false;
  },

  // ─── MAHSULOT QO'SHILDI ───────────────────────────────────────
  mahsulotQoshildi(m) {
    const caption =
      `📦 <b>Yangi Mahsulot Qo'shildi!</b>\n\n` +
      `📝 Nomi: <b>${m.nom}</b>\n` +
      `🔢 SKU: ${m.sku || '—'}\n` +
      `📂 Kategoriya: ${m.kat || '—'}\n` +
      `${m.trek ? `🚚 Trek: <code>${m.trek}</code>\n` : ''}` +
      `${m.barcode ? `📊 Barcode: <code>${m.barcode}</code>\n` : ''}` +
      `💴 Yuan: ${m.xitoyNarx ? `¥${Number(m.xitoyNarx).toLocaleString()}` : '—'}\n` +
      `💰 Narxi: <b>${formatMoney(m.sotuvNarx)}</b>\n` +
      `📦 Miqdori: <b>${m.miqdor} dona</b>\n` +
      `📅 Sana: ${m.sana || today()}\n\n` +
      `✅ Ombor muvaffaqiyatli yangilandi.`;

    const rasm = m.rasmlar?.[0] || m.rasm;
    this.rasmXabar(rasm, caption);
  },

  // ─── MAHSULOT YANGILANDI ──────────────────────────────────────
  mahsulotYangilandi(yangi, eski) {
    const caption =
      `✏️ <b>Mahsulot Yangilandi!</b>\n\n` +
      `📝 Nomi: <b>${yangi.nom}</b>\n` +
      `📦 Miqdor: <b>${yangi.miqdor} dona</b>` +
      (eski && eski.miqdor !== yangi.miqdor ? ` (oldin: ${eski.miqdor})` : '') + `\n` +
      `💰 Narxi: <b>${formatMoney(yangi.sotuvNarx)}</b>` +
      (eski && eski.sotuvNarx !== yangi.sotuvNarx ? ` (oldin: ${formatMoney(eski.sotuvNarx)})` : '') + `\n` +
      `📅 ${today()}`;

    const rasm = yangi.rasmlar?.[0] || yangi.rasm;
    this.rasmXabar(rasm, caption);
  },

  // ─── QR SKAN ─────────────────────────────────────────────────
  qrSkanXabar(m, yangiMiqdor) {
    const caption =
      `📱 <b>QR Skan — Ombor Yangilandi!</b>\n\n` +
      `📝 <b>${m.nom}</b>\n` +
      `📦 Soni: <b>${yangiMiqdor} ta</b>\n` +
      `💰 Narxi: ${formatMoney(m.sotuvNarx)}\n` +
      `${m.trek ? `🚚 Trek: ${m.trek}\n` : ''}` +
      `\n✅ Ombor muvaffaqiyatli yangilandi.`;

    const rasm = m.rasmlar?.[0] || m.rasm;
    this.rasmXabar(rasm, caption);
  },

  // ─── KAM MAHSULOT ────────────────────────────────────────────
  kamMahsulot(m) {
    const caption =
      `⚠️ <b>Mahsulot Tugayapti!</b>\n\n` +
      `📝 Nomi: <b>${m.nom}</b>\n` +
      `📦 Qoldiq: <b>${m.miqdor} dona</b>\n` +
      `📉 Minimal: ${m.min || 5} dona\n` +
      `📅 Sana: ${today()}\n\n` +
      `🛒 Iltimos, zaxirani to'ldiring!`;

    const rasm = m.rasmlar?.[0] || m.rasm;
    this.rasmXabar(rasm, caption);
  },

  // ─── YANGI BUYURTMA ──────────────────────────────────────────
  buyurtmaQoshildi(b) {
    const holatEmoji = { yangi:'🆕', jarayonda:'⏳', yetkazildi:'✅', bekor:'❌' };
    this.xabar(
      `🛒 <b>Yangi Buyurtma!</b>\n\n` +
      `🔢 №: <b>#${b.raqam}</b>\n` +
      `👤 Mijoz: ${b.mijozNom}\n` +
      `📦 Mahsulot: ${b.mahsulotNom}\n` +
      `🔢 Miqdor: ${b.miqdor} dona\n` +
      `💰 Summa: <b>${formatMoney(b.summa)}</b>\n` +
      `💳 To'lov: ${b.tolov}\n` +
      `${holatEmoji[b.holat]||'📋'} Holat: ${b.holat}\n` +
      `📅 Sana: ${b.sana}`
    );
  },

  // ─── BUYURTMA HOLATI ─────────────────────────────────────────
  buyurtmaHolat(b, yangiHolat) {
    const holatEmoji = { yangi:'🆕', jarayonda:'⏳', yetkazildi:'✅', bekor:'❌' };
    this.xabar(
      `🔄 <b>Buyurtma Holati O'zgardi!</b>\n\n` +
      `🔢 №: <b>#${b.raqam}</b>\n` +
      `👤 Mijoz: ${b.mijozNom}\n` +
      `📦 Mahsulot: ${b.mahsulotNom}\n` +
      `${holatEmoji[yangiHolat]||'📋'} Yangi holat: <b>${yangiHolat}</b>\n` +
      `💰 Summa: ${formatMoney(b.summa)}`
    );
  },

  // ─── MIJOZ ───────────────────────────────────────────────────
  mijozQoshildi(m) {
    this.xabar(
      `👤 <b>Yangi Mijoz!</b>\n\n` +
      `👨 Ism: <b>${m.ism}</b>\n` +
      `📞 Telefon: ${m.tel}\n` +
      `${m.manzil ? `📍 Manzil: ${m.manzil}\n` : ''}` +
      `📅 Sana: ${m.sana || today()}`
    );
  },

  // ─── MOLIYA ──────────────────────────────────────────────────
  moliyaQoshildi(t) {
    this.xabar(
      `💳 <b>Yangi Tranzaksiya!</b>\n\n` +
      `${t.tur==='kirim' ? '💚 Kirim' : '🔴 Chiqim'}: <b>${formatMoney(t.summa)}</b>\n` +
      `📝 Tavsif: ${t.tavsif}\n` +
      `📅 Sana: ${t.sana}`
    );
  },

  // ─── TREK HOLAT ──────────────────────────────────────────────
  trekHolat(trek, mahsulotNom, yangiHolat) {
    const HOLAT_EMOJI = {
      kutilmoqda:'⏳', yolda:'🚢', bojxona:'🏛️', omborda:'📦', yetkazildi:'✅', bekor:'❌'
    };
    this.xabar(
      `🔄 <b>Trek Holati O'zgardi!</b>\n\n` +
      `🔖 Trek: <code>${trek}</code>\n` +
      `📦 Mahsulot: ${mahsulotNom || '—'}\n` +
      `${HOLAT_EMOJI[yangiHolat]||'📋'} Yangi holat: <b>${yangiHolat}</b>\n` +
      `📅 ${today()}`
    );
  },

  // ─── KUNLIK HISOBOT ──────────────────────────────────────────
  async kunlikHisobot() {
    const buyurtmalar = DB.get('buyurtmalar');
    const moliyalar   = DB.get('moliyalar');
    const mahsulotlar = DB.get('mahsulotlar');
    const todayStr    = today();

    const bugunB = buyurtmalar.filter(b => b.sana === todayStr);
    const bugunM = moliyalar.filter(m => m.sana === todayStr);

    const kirim  = bugunM.filter(m => m.tur === 'kirim').reduce((s,m) => s+Number(m.summa), 0);
    const chiqim = bugunM.filter(m => m.tur === 'chiqim').reduce((s,m) => s+Number(m.summa), 0);
    const foyda  = kirim - chiqim;

    const kamlar = mahsulotlar.filter(m => Number(m.miqdor)>0 && Number(m.miqdor)<=Number(m.min||5));

    const matn =
      `📊 <b>Kunlik Hisobot</b>\n` +
      `📅 ${new Date().toLocaleDateString('uz-UZ',{day:'numeric',month:'long',year:'numeric'})}\n\n` +
      `🛒 <b>Buyurtmalar:</b> ${bugunB.length} ta\n` +
      `  ✅ Yetkazildi: ${bugunB.filter(b=>b.holat==='yetkazildi').length}\n` +
      `  ⏳ Jarayonda: ${bugunB.filter(b=>b.holat==='jarayonda').length}\n` +
      `  🆕 Yangi: ${bugunB.filter(b=>b.holat==='yangi').length}\n\n` +
      `💰 <b>Moliya:</b>\n` +
      `  📈 Sotuv: <b>${formatMoney(kirim)}</b>\n` +
      `  📉 Chiqim: ${formatMoney(chiqim)}\n` +
      `  💵 Sof foyda: <b>${formatMoney(foyda)}</b>\n` +
      (kamlar.length > 0
        ? `\n⚠️ <b>Kam qolgan (${kamlar.length} ta):</b>\n` +
          kamlar.slice(0,5).map(m=>`  • ${m.nom}: ${m.miqdor} dona`).join('\n')
        : `\n✅ Barcha mahsulotlar yetarli`);

    await this.xabar(matn);
    localStorage.setItem('last_hisobot_date', todayStr);
  },

  // ─── CHAT ID AVTOMATIK OLISH ──────────────────────────────────
  async chatIdOl() {
    try {
      const r    = await fetch(`https://api.telegram.org/bot${this.token}/getUpdates`);
      const data = await r.json();
      if (data.ok && data.result.length > 0) {
        const last = data.result[data.result.length - 1];
        const id   = last.message?.chat?.id || last.channel_post?.chat?.id;
        if (id) { localStorage.setItem('tg_chat_id', String(id)); return id; }
      }
    } catch {}
    return null;
  },
};

// ─── Telegram sozlama modal funksiyalari ─────────────────────
function openTgSozlama() {
  document.getElementById('tg-chat-id-input').value = TG.getChatId();
  openModal('tg-modal');
}

function tgChatIdSaqlash() {
  const v = document.getElementById('tg-chat-id-input').value.trim();
  if (!v) { showToast('Chat ID kiriting!', 'error'); return; }
  localStorage.setItem('tg_chat_id', v);
  showToast('✅ Telegram Chat ID saqlandi!');
  closeModal('tg-modal');
}

async function tgTestXabar() {
  await TG.xabar('✅ <b>Test xabari!</b>\n\nBiznesApp Telegram botga ulandi! 🎉\n\n<i>Sana: ' + today() + '</i>');
  showToast('Test xabari yuborildi!');
}

async function tgAvtoChatId() {
  showToast('Chat ID olinmoqda...');
  const id = await TG.chatIdOl();
  if (id) {
    document.getElementById('tg-chat-id-input').value = id;
    showToast('✅ Chat ID topildi: ' + id);
  } else {
    showToast('Topilmadi. Botga /start yuboring!', 'error');
  }
}

async function kunlikHisobotYuborish() {
  await TG.kunlikHisobot();
  showToast('✅ Kunlik hisobot Telegram ga yuborildi!');
}

// ─── Har kuni 21:00 da avtomatik yuborish ────────────────────
function startKunlikHisobotScheduler() {
  function msUntil(h, m=0) {
    const now=new Date(), t=new Date();
    t.setHours(h,m,0,0);
    if (t<=now) t.setDate(t.getDate()+1);
    return t-now;
  }
  function schedule() {
    setTimeout(async () => {
      if (localStorage.getItem('last_hisobot_date') !== today()) {
        await TG.kunlikHisobot();
      }
      schedule();
    }, msUntil(21, 0));
  }
  schedule();
}
