// ===== QR SKANER MODULI =====
// html5-qrcode kutubxonasi ishlatiladi

let html5QrScanner = null;
let scannerActive = false;

// ===== SKANER MODALNI OCHISH =====
function openScanner() {
  document.getElementById('scanner-modal').classList.add('open');
  document.getElementById('scan-result-box').style.display = 'none';
  document.getElementById('scan-manual-input').value = '';
  startScanner();
}

// ===== SKANER MODALNI YOPISH =====
function closeScanner() {
  stopScanner();
  document.getElementById('scanner-modal').classList.remove('open');
}

// ===== SKANER ISHGA TUSHIRISH =====
function startScanner() {
  if (scannerActive) return;

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    showTorchButtonIfSupported: true,
  };

  html5QrScanner = new Html5Qrcode('qr-reader');

  html5QrScanner.start(
    { facingMode: 'environment' }, // Orqa kamera
    config,
    onScanSuccess,
    onScanError
  ).then(() => {
    scannerActive = true;
    document.getElementById('scan-status').textContent = '📷 Kamera tayyor — QR kodni ko\'rsating';
    document.getElementById('scan-status').className = 'scan-status active';
  }).catch(err => {
    console.error('Kamera xatosi:', err);
    document.getElementById('scan-status').textContent = '❌ Kamera ochilmadi. Qo\'lda kiriting.';
    document.getElementById('scan-status').className = 'scan-status error';
    document.getElementById('manual-section').style.display = 'block';
  });
}

// ===== SKANER TO'XTATISH =====
function stopScanner() {
  if (html5QrScanner && scannerActive) {
    html5QrScanner.stop().then(() => {
      html5QrScanner.clear();
      scannerActive = false;
    }).catch(err => console.warn('Skaner to\'xtatishda xatolik:', err));
  }
}

// ===== MUVAFFAQIYATLI SKAN =====
function onScanSuccess(decodedText) {
  stopScanner();

  // Vibro (mobil uchun)
  if (navigator.vibrate) navigator.vibrate(200);

  try {
    const data = JSON.parse(decodedText);
    if (!data.nom || !data.som) {
      showScanError('Bu QR kod bizning formatda emas!');
      return;
    }
    showScanResult(data);
  } catch (e) {
    showScanError('QR kod o\'qildi, lekin format noto\'g\'ri!');
    console.error(e);
  }
}

// ===== SKANER XATOSI (log sifatida, foydalanuvchiga ko'rsatilmaydi) =====
function onScanError(error) {
  // Doimiy xato loglarni yashiramiz
}

// ===== SCAN NATIJASINI KO'RSATISH =====
function showScanResult(data) {
  document.getElementById('scan-status').textContent = '✅ QR kod muvaffaqiyatli o\'qildi!';
  document.getElementById('scan-status').className = 'scan-status success';

  const box = document.getElementById('scan-result-box');
  box.style.display = 'block';

  // Rasm
  const rasmEl = document.getElementById('scan-rasm');
  const rasmsiz = document.getElementById('scan-rasmsiz');

  // Rasmni QR history dan qidirish
  const history = JSON.parse(localStorage.getItem('qr_history') || '[]');
  const historyItem = history.find(h => h.id === data.id);
  const rasm = historyItem?.rasm || null;

  if (rasm) {
    rasmEl.src = rasm;
    rasmEl.style.display = 'block';
    rasmsiz.style.display = 'none';
  } else {
    rasmEl.style.display = 'none';
    rasmsiz.style.display = 'flex';
  }

  // Ma'lumotlar
  document.getElementById('scan-nom').textContent = data.nom || '—';
  document.getElementById('scan-kat').textContent = data.kat || '—';
  document.getElementById('scan-trek').textContent = data.trek || '—';
  document.getElementById('scan-yuan').textContent = data.yuan ? `¥${Number(data.yuan).toLocaleString()}` : '—';
  document.getElementById('scan-usd').textContent = data.usd ? `$${Number(data.usd).toLocaleString()}` : '—';
  document.getElementById('scan-som').textContent = data.som ? formatMoneyS(data.som) : '—';
  document.getElementById('scan-miqdor').textContent = data.miqdor ? `${data.miqdor} dona` : '—';
  document.getElementById('scan-sana').textContent = data.sana ? formatDateS(data.sana) : '—';

  // Saqlash tugmasiga data biriktirish
  document.getElementById('btn-scan-saqlash').onclick = () => scanMahsulotSaqlash(data, rasm);
  document.getElementById('btn-scan-qayta').onclick = () => {
    box.style.display = 'none';
    startScanner();
  };
}

// ===== SCAN XATOSINI KO'RSATISH =====
function showScanError(msg) {
  document.getElementById('scan-status').textContent = '❌ ' + msg;
  document.getElementById('scan-status').className = 'scan-status error';
  document.getElementById('manual-section').style.display = 'block';
  setTimeout(() => startScanner(), 2000);
}

// ===== QO'LDA JSON KIRITISH =====
function manualScan() {
  const val = document.getElementById('scan-manual-input').value.trim();
  if (!val) {
    showToast('Matn kiriting!', 'error');
    return;
  }
  try {
    const data = JSON.parse(val);
    if (!data.nom) throw new Error('nom yo\'q');
    onScanSuccess(val);
  } catch (e) {
    showToast('Noto\'g\'ri format!', 'error');
  }
}

// ===== SKAN QR DAN MAHSULOT SAQLASH =====
function scanMahsulotSaqlash(data, rasm) {
  // mahsulot.js dagi qrMahsulotQabul funksiyasini chaqiramiz
  const natija = qrMahsulotQabul(data, rasm);

  // ✅ Telegram botga xabar — QR skan orqali
  const tgMatn = natija.yangi
    ? `📱 <b>QR Skan — Yangi Mahsulot!</b>\n\n` +
      `🏷 Nomi: <b>${data.nom}</b>\n` +
      `📂 Kategoriya: ${data.kat || '—'}\n` +
      `${data.trek ? `🔖 Trek: <code>${data.trek}</code>\n` : ''}` +
      `💴 Yuan narxi: ¥${Number(data.yuan || 0).toLocaleString()}\n` +
      `💰 Sotuv narxi: ${Number(data.som || 0).toLocaleString()} so'm\n` +
      `📦 Qo'shilgan miqdor: ${data.miqdor} dona\n` +
      `📅 Sana: ${data.sana || today()}`
    : `📱 <b>QR Skan — Mahsulot Yangilandi!</b>\n\n` +
      `🏷 Nomi: <b>${natija.nom}</b>\n` +
      `📦 Yangi jami miqdor: <b>${natija.miqdor} dona</b>\n` +
      `➕ Qo'shildi: ${data.miqdor} dona\n` +
      `💰 Sotuv narxi: ${Number(data.som || 0).toLocaleString()} so'm\n` +
      `📅 Sana: ${today()}`;

  // app.js dagi TG obyektini ishlatamiz
  if (typeof TG !== 'undefined') {
    TG.xabar(tgMatn);
  }

  if (natija.yangi) {
    showToast(`✅ Yangi mahsulot qo'shildi: ${natija.nom}`);
  } else {
    showToast(`✅ "${natija.nom}" yangilandi! Miqdor: ${natija.miqdor} dona`);
  }

  closeScanner();

  // Mahsulot sahifasiga o'tish va render
  showPage('mahsulot');
  renderMahsulot();
}

// ===== YORDAMCHI FUNKSIYALAR =====
function formatMoneyS(n) {
  if (!n) return '—';
  return Number(n).toLocaleString('uz-UZ') + ' so\'m';
}

function formatDateS(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
