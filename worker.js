// ===== WORKER.JS - QR GENERATSIYA VA LOGIKA =====

let currentRasmBase64 = null;
let currentQRData = null;

// ===== TELEGRAM BOT (WORKER) =====
const TG_TOKEN = '8838693056:AAG0uZNDFcNGfAX4EiRKnhoDCZuzzhczaRo';

async function tgWorkerXabar(matn) {
  try {
    // Chat ID ni localStorage dan olish
    const chatId = localStorage.getItem('tg_chat_id');
    if (!chatId) return; // Chat ID yo'q bo'lsa o'tkazib yuborish
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: matn, parse_mode: 'HTML' }),
    });
  } catch (e) {
    console.warn('Telegram xabar yuborilmadi:', e);
  }
}

// ===== TOAST =====
function wToast(msg, type = 'success') {
  const t = document.getElementById('w-toast');
  t.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== RASM YUKLASH =====
function rasmYukla(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    wToast('Rasm 5MB dan kichik bo\'lsin!', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    currentRasmBase64 = e.target.result;

    const preview = document.getElementById('rasm-preview');
    const wrap = document.getElementById('rasm-preview-wrap');
    const zone = document.getElementById('rasm-zone');

    preview.src = currentRasmBase64;
    preview.style.display = 'block';
    wrap.style.display = 'none';
    zone.classList.add('has-image');

    wToast('Rasm yuklandi!');
  };
  reader.readAsDataURL(file);
}

// ===== NARX HISOBLASH — YUAN → SO'M AVTO =====
function hisoblaSom() {
  const yuan = parseFloat(document.getElementById('w-yuan').value) || 0;
  const kurs = parseFloat(document.getElementById('w-kurs').value) || 350;

  if (yuan > 0 && kurs > 0) {
    const tannarx = Math.round(yuan * kurs);

    // ✅ Sotuv narxiga avtomatik 20% marja qo'shib yozish (foydalanuvchi o'zgartirishi mumkin)
    const sotuvInput = document.getElementById('w-som');
    if (!sotuvInput.value || sotuvInput.dataset.auto === 'true') {
      const avtoSotuv = Math.round(tannarx * 1.2 / 1000) * 1000; // 20% marja, 1000 ga yaxlitlash
      sotuvInput.value = avtoSotuv;
      sotuvInput.dataset.auto = 'true';
    }

    const som = parseFloat(document.getElementById('w-som').value) || 0;
    const foyda = som - tannarx;

    const box = document.getElementById('hisob-box');
    box.style.display = 'block';

    document.getElementById('h-yuan').textContent = `¥${yuan.toLocaleString()}`;
    document.getElementById('h-kurs').textContent = `1¥ = ${kurs.toLocaleString()} so'm`;
    document.getElementById('h-tannarx').textContent = formatMoney(tannarx);
    document.getElementById('h-sotuv').textContent = som > 0 ? formatMoney(som) : '—';
    document.getElementById('h-foyda').textContent = som > 0
      ? `${formatMoney(foyda)} (${((foyda / tannarx) * 100).toFixed(1)}%)`
      : '—';
  }
}

// Sotuv narxi qo'lda o'zgartirilsa avto flagni olib tashlash
function sotuvOzgardi() {
  document.getElementById('w-som').dataset.auto = 'false';
  hisoblaSom();
}

function formatMoney(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('uz-UZ') + ' so\'m';
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ===== QR KOD YARATISH =====
function qrYarat() {
  const nom = document.getElementById('w-nom').value.trim();
  const kat = document.getElementById('w-kat').value;
  const trek = document.getElementById('w-trek').value.trim();
  const yuan = document.getElementById('w-yuan').value;
  const usd = document.getElementById('w-usd').value;
  const som = document.getElementById('w-som').value;
  const kurs = document.getElementById('w-kurs').value || '350';
  const miqdor = document.getElementById('w-miqdor').value;
  const min = document.getElementById('w-min').value || '5';
  const izoh = document.getElementById('w-izoh').value.trim();

  // Validatsiya
  if (!nom) { wToast('Mahsulot nomini kiriting!', 'error'); document.getElementById('w-nom').focus(); return; }
  if (!kat) { wToast('Kategoriyani tanlang!', 'error'); document.getElementById('w-kat').focus(); return; }
  if (!yuan) { wToast('Yuan narxini kiriting!', 'error'); document.getElementById('w-yuan').focus(); return; }
  if (!som) { wToast('Sotuv narxini kiriting!', 'error'); document.getElementById('w-som').focus(); return; }
  if (!miqdor) { wToast('Miqdorni kiriting!', 'error'); document.getElementById('w-miqdor').focus(); return; }

  // QR data obyekti
  const qrData = {
    id: genId(),
    nom,
    kat,
    trek: trek || ('TRK-' + Date.now().toString().slice(-8)),
    yuan: parseFloat(yuan),
    usd: parseFloat(usd) || null,
    som: parseFloat(som),
    kurs: parseFloat(kurs),
    miqdor: parseInt(miqdor),
    min: parseInt(min),
    izoh,
    rasm: currentRasmBase64 || null,
    sana: today(),
    source: 'qr',
  };

  currentQRData = qrData;

  // QR div tozalash
  const qrDiv = document.getElementById('qr-code-div');
  qrDiv.innerHTML = '';

  // QR ichiga faqat id va asosiy ma'lumot (rasm kirmaydi - juda katta bo'ladi)
  const qrPayload = {
    id: qrData.id,
    nom: qrData.nom,
    kat: qrData.kat,
    trek: qrData.trek,
    yuan: qrData.yuan,
    usd: qrData.usd,
    som: qrData.som,
    kurs: qrData.kurs,
    miqdor: qrData.miqdor,
    min: qrData.min,
    izoh: qrData.izoh,
    sana: qrData.sana,
    source: 'qr',
  };

  // LocalStorage ga rasm bilan birga saqlash (skaner bu yerdan oladi)
  saqlashQRHistory(qrData);

  // QR Code yaratish
  try {
    new QRCode(qrDiv, {
      text: JSON.stringify(qrPayload),
      width: 200,
      height: 200,
      colorDark: '#1e1b4b',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (e) {
    wToast('QR yaratishda xatolik!', 'error');
    console.error(e);
    return;
  }

  // Info ko'rsatish
  document.getElementById('qr-nom').textContent = nom;
  document.getElementById('qr-kat').textContent = kat;
  document.getElementById('qr-trek').textContent = qrData.trek;
  document.getElementById('qr-yuan').textContent = `¥${parseFloat(yuan).toLocaleString()}`;
  document.getElementById('qr-som').textContent = formatMoney(som);
  document.getElementById('qr-miqdor').textContent = `${miqdor} dona`;

  // Forma yashirish, natija ko'rsatish
  document.getElementById('forma-card').style.display = 'none';
  document.getElementById('qr-card').style.display = 'block';

  wToast('QR kod muvaffaqiyatli yaratildi!');
  renderHistory();

  // ✅ Telegram botga xabar yuborish
  const tannarx = parseFloat(yuan) * parseFloat(kurs || 350);
  const foyda = parseFloat(som) - tannarx;
  const tgMatn =
    `📦 <b>Yangi QR Yaratildi!</b>\n\n` +
    `🏷 Nomi: <b>${nom}</b>\n` +
    `📂 Kategoriya: ${kat}\n` +
    `🔖 Trek: <code>${qrData.trek}</code>\n` +
    `💴 Yuan narxi: ¥${parseFloat(yuan).toLocaleString()}\n` +
    `💱 Kurs: 1¥ = ${parseFloat(kurs).toLocaleString()} so'm\n` +
    `💸 Tannarx: ${formatMoney(tannarx)}\n` +
    `💰 Sotuv narxi: ${formatMoney(som)}\n` +
    `📈 Foyda: ${formatMoney(foyda)}\n` +
    `📦 Miqdor: ${miqdor} dona\n` +
    `📅 Sana: ${today()}`;
  tgWorkerXabar(tgMatn);
}

// ===== QR HISTORY SAQLASH =====
function saqlashQRHistory(data) {
  let history = JSON.parse(localStorage.getItem('qr_history') || '[]');
  // Agar id mavjud bo'lsa yangilash
  const idx = history.findIndex(h => h.id === data.id);
  if (idx !== -1) {
    history[idx] = data;
  } else {
    history.unshift(data); // Yangi qo'shish - boshiga
  }
  // Oxirgi 50 ta saqlansin
  history = history.slice(0, 50);
  localStorage.setItem('qr_history', JSON.stringify(history));
}

// ===== HISTORY RENDER =====
function renderHistory() {
  const history = JSON.parse(localStorage.getItem('qr_history') || '[]');
  const el = document.getElementById('qr-history-list');

  if (history.length === 0) {
    el.innerHTML = '<p class="empty-text">Hali QR kod yaratilmagan</p>';
    return;
  }

  el.innerHTML = history.map(item => `
    <div class="history-item">
      ${item.rasm
        ? `<img class="history-thumb" src="${item.rasm}" alt="${item.nom}" />`
        : `<div class="history-thumb-placeholder">📦</div>`
      }
      <div class="history-info">
        <div class="history-nom">${item.nom}</div>
        <div class="history-meta">
          ${item.kat} &bull; ¥${item.yuan?.toLocaleString() || '—'} &bull; ${formatMoney(item.som)} &bull; ${item.miqdor} dona
          ${item.trek ? `<br>Trek: <strong>${item.trek}</strong>` : ''}
          &bull; ${formatDate(item.sana)}
        </div>
      </div>
      <div class="history-actions">
        <button class="btn-sm-icon btn-edit" onclick="qaytaYukla('${item.id}')" title="Qayta yuklash">
          <i class="fas fa-redo"></i>
        </button>
        <button class="btn-sm-icon btn-del" onclick="historyOchir('${item.id}')" title="O'chirish">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// ===== HISTORY DAN QAYTA YUKLASH =====
function qaytaYukla(id) {
  const history = JSON.parse(localStorage.getItem('qr_history') || '[]');
  const item = history.find(h => h.id === id);
  if (!item) return;

  document.getElementById('w-nom').value = item.nom || '';
  document.getElementById('w-kat').value = item.kat || '';
  document.getElementById('w-trek').value = item.trek || '';
  document.getElementById('w-yuan').value = item.yuan || '';
  document.getElementById('w-usd').value = item.usd || '';
  document.getElementById('w-som').value = item.som || '';
  document.getElementById('w-kurs').value = item.kurs || '350';
  document.getElementById('w-miqdor').value = item.miqdor || '';
  document.getElementById('w-min').value = item.min || '';
  document.getElementById('w-izoh').value = item.izoh || '';

  if (item.rasm) {
    currentRasmBase64 = item.rasm;
    const preview = document.getElementById('rasm-preview');
    const wrap = document.getElementById('rasm-preview-wrap');
    const zone = document.getElementById('rasm-zone');
    preview.src = item.rasm;
    preview.style.display = 'block';
    wrap.style.display = 'none';
    zone.classList.add('has-image');
  }

  hisoblaSom();

  document.getElementById('forma-card').style.display = 'block';
  document.getElementById('qr-card').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
  wToast('Ma\'lumotlar yuklandi, tahrirlang!');
}

// ===== HISTORY O'CHIRISH =====
function historyOchir(id) {
  if (!confirm('Bu yozuvni o\'chirasizmi?')) return;
  let history = JSON.parse(localStorage.getItem('qr_history') || '[]');
  history = history.filter(h => h.id !== id);
  localStorage.setItem('qr_history', JSON.stringify(history));
  renderHistory();
  wToast('O\'chirildi!');
}

// ===== CHOP ETISH =====
function qrChopEt() {
  if (!currentQRData) return;

  const printArea = document.getElementById('print-area');
  const printQR = document.getElementById('print-qr');
  printQR.innerHTML = '';

  new QRCode(printQR, {
    text: JSON.stringify({
      id: currentQRData.id,
      nom: currentQRData.nom,
      kat: currentQRData.kat,
      trek: currentQRData.trek,
      yuan: currentQRData.yuan,
      usd: currentQRData.usd,
      som: currentQRData.som,
      kurs: currentQRData.kurs,
      miqdor: currentQRData.miqdor,
      min: currentQRData.min,
      izoh: currentQRData.izoh,
      sana: currentQRData.sana,
      source: 'qr',
    }),
    width: 120,
    height: 120,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M,
  });

  document.getElementById('print-nom').textContent = currentQRData.nom;
  document.getElementById('print-trek').textContent = `Trek: ${currentQRData.trek}`;
  document.getElementById('print-narx').textContent = `¥${currentQRData.yuan} | ${formatMoney(currentQRData.som)}`;

  setTimeout(() => window.print(), 300);
}

// ===== PNG SAQLASH =====
function qrSaqlash() {
  const canvas = document.querySelector('#qr-code-div canvas');
  if (!canvas) {
    wToast('QR kod topilmadi!', 'error');
    return;
  }

  const link = document.createElement('a');
  link.download = `QR_${currentQRData?.nom || 'mahsulot'}_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  wToast('QR kod saqlandi!');
}

// ===== YANGI TOVAR =====
function yangisi() {
  // Formani tozalash
  document.getElementById('w-nom').value = '';
  document.getElementById('w-kat').value = '';
  document.getElementById('w-trek').value = '';
  document.getElementById('w-yuan').value = '';
  document.getElementById('w-usd').value = '';
  document.getElementById('w-som').value = '';
  document.getElementById('w-kurs').value = '350';
  document.getElementById('w-miqdor').value = '';
  document.getElementById('w-min').value = '';
  document.getElementById('w-izoh').value = '';

  // Rasmni tozalash
  currentRasmBase64 = null;
  const preview = document.getElementById('rasm-preview');
  const wrap = document.getElementById('rasm-preview-wrap');
  const zone = document.getElementById('rasm-zone');
  preview.style.display = 'none';
  preview.src = '';
  wrap.style.display = 'block';
  zone.classList.remove('has-image');

  // Hisob boxni yashirish
  document.getElementById('hisob-box').style.display = 'none';

  currentQRData = null;

  document.getElementById('forma-card').style.display = 'block';
  document.getElementById('qr-card').style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderHistory();

  // Enter tugmasi bilan yuborish
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) qrYarat();
  });
});
