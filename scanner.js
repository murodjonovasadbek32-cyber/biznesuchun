// ╔══════════════════════════════════════════════════════════════╗
// ║   SCANNER.JS — QR Skaner v3.0                              ║
// ║   html5-qrcode + Web Audio API ovoz + Debounce             ║
// ╚══════════════════════════════════════════════════════════════╝

// ─── Holat ────────────────────────────────────────────────────
let _scanner       = null;
let _scanActive    = false;
let _lastScanned   = null;      // Qayta skan oldini olish
let _lastScanTime  = 0;
let _soundEnabled  = true;
let _audioCtx      = null;
const SCAN_COOLDOWN = 2500;     // ms — bir xil QR qayta skan bo'lmasin

// ─── Web Audio API sozlash ────────────────────────────────────
function _initAudio() {
  if (_audioCtx) return;
  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('[Audio] Web Audio API ishlamaydi:', e.message);
  }
}

// ─── Muvaffaqiyat ovozi: "tiin" signal ───────────────────────
function playSuccessSound() {
  if (!_soundEnabled) return;
  _initAudio();
  if (!_audioCtx) return;

  try {
    // Oscillator bilan "beep" ovozi
    const osc  = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();

    osc.connect(gain);
    gain.connect(_audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, _audioCtx.currentTime);      // C6
    osc.frequency.setValueAtTime(1318.5, _audioCtx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.35, _audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.3);

    osc.start(_audioCtx.currentTime);
    osc.stop(_audioCtx.currentTime + 0.3);
  } catch (e) {
    console.warn('[Audio] ovoz xatosi:', e.message);
  }
}

// ─── Xato ovozi ───────────────────────────────────────────────
function playErrorSound() {
  if (!_soundEnabled) return;
  _initAudio();
  if (!_audioCtx) return;

  try {
    const osc  = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain);
    gain.connect(_audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, _audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, _audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.25);
    osc.start(_audioCtx.currentTime);
    osc.stop(_audioCtx.currentTime + 0.25);
  } catch (e) {}
}

// ──────────────────────────────────────────────────────────────
//  SKANER MODALNI OCHISH
// ──────────────────────────────────────────────────────────────
function openScanner() {
  // Audio kontekstni foydalanuvchi gesture orqali aktivlashtirish
  _initAudio();
  if (_audioCtx?.state === 'suspended') {
    _audioCtx.resume();
  }

  const modal = document.getElementById('scanner-modal');
  modal.classList.add('open');
  document.getElementById('scan-result-box').style.display = 'none';
  document.getElementById('scan-status').className = 'scan-status';
  document.getElementById('scan-status').textContent = '📷 Kamera yoqilmoqda...';

  _lastScanned = null;
  _startScanner();
}

function closeScanner() {
  _stopScanner();
  document.getElementById('scanner-modal').classList.remove('open');
}

// ──────────────────────────────────────────────────────────────
//  SKANER ISHGA TUSHIRISH
// ──────────────────────────────────────────────────────────────
function _startScanner() {
  if (_scanActive) return;

  const config = {
    fps: 15,
    qrbox: (w, h) => {
      const s = Math.min(w, h) * 0.72;
      return { width: Math.round(s), height: Math.round(s) };
    },
    aspectRatio: 1.0,
    showTorchButtonIfSupported: true,
    showZoomSliderIfSupported:  true,
    defaultZoomValueIfSupported: 2,
    rememberLastUsedCamera: true,
    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
  };

  _scanner = new Html5Qrcode('qr-reader', {
    verbose: false,
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
  });

  _scanner.start(
    { facingMode: 'environment' },
    config,
    _onScanSuccess,
    _onScanError
  )
  .then(() => {
    _scanActive = true;
    _setScanStatus('active', '📷 Tayyor — QR kodni ko\'rsating');
  })
  .catch(err => {
    console.error('[Scanner] kamera xatosi:', err);
    _setScanStatus('error', '❌ Kamera ochilmadi');
    document.getElementById('manual-section').style.display = 'flex';
    playErrorSound();
  });
}

// ──────────────────────────────────────────────────────────────
//  SKANER TO'XTATISH
// ──────────────────────────────────────────────────────────────
function _stopScanner() {
  if (_scanner && _scanActive) {
    _scanner.stop()
      .then(() => { _scanner.clear(); _scanActive = false; _scanner = null; })
      .catch(() => { _scanActive = false; _scanner = null; });
  }
}

// ──────────────────────────────────────────────────────────────
//  MUVAFFAQIYATLI SKAN
// ──────────────────────────────────────────────────────────────
async function _onScanSuccess(decodedText) {
  const now = Date.now();

  // Debounce: bir xil QR qayta skan bo'lmasin
  if (decodedText === _lastScanned && (now - _lastScanTime) < SCAN_COOLDOWN) return;
  _lastScanned  = decodedText;
  _lastScanTime = now;

  _stopScanner();
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

  _setScanStatus('loading', '⏳ Ma\'lumotlar yuklanmoqda...');

  try {
    // URL parametridan product ID ni ajratish
    let productId = null;

    // 1. URL format: ...?product=abc123
    try {
      const url  = new URL(decodedText);
      productId  = url.searchParams.get('product');
    } catch {}

    // 2. To'g'ridan ID bo'lishi ham mumkin
    if (!productId && !decodedText.includes('://')) {
      productId = decodedText.trim();
    }

    if (!productId) {
      throw new Error('Mahsulot ID topilmadi: ' + decodedText);
    }

    // mahsulot.js dan qrMahsulotQabul chaqirish
    const natija = await qrMahsulotQabul(productId);

    if (natija.topilmadi) {
      _setScanStatus('warning', `⚠️ Mahsulot topilmadi (ID: ${productId.slice(0,8)}...)`);
      playErrorSound();
      _showScanResultUnknown(productId);
      return;
    }

    // ✅ Muvaffaqiyat
    playSuccessSound();
    _setScanStatus('success', '✅ Mahsulot omborga qo\'shildi!');
    _showScanResult(natija);

  } catch (err) {
    console.error('[Scanner] xatolik:', err);
    playErrorSound();
    _setScanStatus('error', '❌ ' + err.message);
    setTimeout(() => _startScanner(), 2500);
  }
}

function _onScanError() {
  // Doimiy "scan failed" loglarini yashirish — normal holat
}

// ──────────────────────────────────────────────────────────────
//  NATIJANI KO'RSATISH
// ──────────────────────────────────────────────────────────────
function _showScanResult(natija) {
  const box = document.getElementById('scan-result-box');
  box.style.display = 'block';

  // Rasm
  const rasmEl = document.getElementById('scan-rasm');
  if (natija.rasm) {
    rasmEl.src = natija.rasm;
    rasmEl.style.display = 'block';
  } else {
    rasmEl.style.display = 'none';
  }

  document.getElementById('scan-nom').textContent    = natija.nom || '—';
  document.getElementById('scan-miqdor').textContent = `${natija.miqdor} dona`;
  document.getElementById('scan-yangi').textContent  = natija.yangi ? '🆕 Yangi qo\'shildi' : '♻️ Mavjud yangilandi';
  document.getElementById('scan-yangi').className    = natija.yangi ? 'scan-tag new' : 'scan-tag updated';

  document.getElementById('btn-scan-qayta').onclick = () => {
    box.style.display = 'none';
    _lastScanned = null;
    _startScanner();
  };
  document.getElementById('btn-scan-yopish').onclick = () => closeScanner();
}

function _showScanResultUnknown(productId) {
  const box = document.getElementById('scan-result-box');
  box.style.display = 'block';
  document.getElementById('scan-rasm').style.display = 'none';
  document.getElementById('scan-nom').textContent    = 'Noma\'lum mahsulot';
  document.getElementById('scan-miqdor').textContent = '—';
  document.getElementById('scan-yangi').textContent  = '❓ Tizimda yo\'q';
  document.getElementById('scan-yangi').className    = 'scan-tag error';

  document.getElementById('btn-scan-qayta').onclick = () => {
    box.style.display = 'none';
    _lastScanned = null;
    _startScanner();
  };
  document.getElementById('btn-scan-yopish').onclick = () => closeScanner();
}

// ──────────────────────────────────────────────────────────────
//  QO'LDA PRODUCT ID KIRITISH
// ──────────────────────────────────────────────────────────────
async function manualScan() {
  const val = document.getElementById('scan-manual-input').value.trim();
  if (!val) { showToast('Product ID yoki URL kiriting!', 'error'); return; }
  await _onScanSuccess(val);
}

// ──────────────────────────────────────────────────────────────
//  STATUS KO'RSATISH
// ──────────────────────────────────────────────────────────────
function _setScanStatus(type, text) {
  const el = document.getElementById('scan-status');
  el.textContent = text;
  el.className   = `scan-status ${type}`;
}

// ──────────────────────────────────────────────────────────────
//  OVOZ TOGGLE
// ──────────────────────────────────────────────────────────────
function toggleScanSound() {
  _soundEnabled = !_soundEnabled;
  const btn = document.getElementById('sound-toggle-btn');
  if (btn) {
    btn.innerHTML = _soundEnabled
      ? '<i class="fas fa-volume-up"></i>'
      : '<i class="fas fa-volume-mute"></i>';
    btn.title = _soundEnabled ? 'Ovozni o\'chirish' : 'Ovozni yoqish';
  }
  showToast(_soundEnabled ? '🔊 Ovoz yoqildi' : '🔇 Ovoz o\'chirildi');
}
