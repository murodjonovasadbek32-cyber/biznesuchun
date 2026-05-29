// ╔══════════════════════════════════════════════════════════════╗
// ║   MAHSULOT.JS — Ombor boshqaruvi v3.0                      ║
// ║   Firebase Storage rasm + Firestore + QR qabul             ║
// ╚══════════════════════════════════════════════════════════════╝

// ─── Holat ────────────────────────────────────────────────────
let _mCurrentImages   = [];   // { file, url, storageRef } massivi
let _mEditId          = null; // Tahrirlash rejimidagi ID
let _mExistingImages  = [];   // Tahrirlashda mavjud rasmlar

// ─── KATEGORIYALAR ─────────────────────────────────────────────
const KATEGORIYALAR = [
  'Televizor','Telefon','Laptop','Muzlatgich',
  'Kir yuvish mashinasi','Konditsioner','Uy texnikasi',
  'Kiyim','Poyabzal','Parfumeriya','Oziq-ovqat','Boshqa'
];

// ══════════════════════════════════════════════════════════════
//  RENDER — jadval
// ══════════════════════════════════════════════════════════════
function renderMahsulot(filter = '') {
  const mahsulotlar = DB.get('mahsulotlar');
  const tbody = document.getElementById('mahsulot-tbody');
  if (!tbody) return;

  let list = filter
    ? mahsulotlar.filter(m =>
        (m.nom||'').toLowerCase().includes(filter.toLowerCase()) ||
        (m.sku||'').toLowerCase().includes(filter.toLowerCase()) ||
        (m.trek||'').toLowerCase().includes(filter.toLowerCase()) ||
        (m.kat||'').toLowerCase().includes(filter.toLowerCase())
      )
    : mahsulotlar;

  // Holat filter
  const holatFilter = document.getElementById('mahsulot-holat-filter')?.value;
  if (holatFilter === 'kam')    list = list.filter(m => Number(m.miqdor) > 0 && Number(m.miqdor) <= Number(m.min||5));
  if (holatFilter === 'tugagan') list = list.filter(m => Number(m.miqdor) === 0);
  if (holatFilter === 'yetarli') list = list.filter(m => Number(m.miqdor) > Number(m.min||5));

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="tbl-empty">
      <div class="empty-state"><span class="empty-icon">📦</span>
      <p>Mahsulot topilmadi</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((m, i) => {
    const miqdor = Number(m.miqdor);
    const min    = Number(m.min || 5);

    let holatClass, holatText;
    if (miqdor === 0)        { holatClass = 'badge-red';    holatText = '● Tugagan'; }
    else if (miqdor <= min)  { holatClass = 'badge-yellow'; holatText = '● Kam'; }
    else                     { holatClass = 'badge-green';  holatText = '● Yetarli'; }

    const img = (m.rasmlar?.[0] || m.rasm)
      ? `<img src="${m.rasmlar?.[0] || m.rasm}" class="prod-thumb" onclick="openImageViewer('${m.id}')" />`
      : `<div class="prod-thumb-empty"><i class="fas fa-box"></i></div>`;

    const trekHtml = m.trek
      ? `<span class="mono-badge"><i class="fas fa-barcode"></i> ${m.trek}</span>`
      : '<span class="text-muted">—</span>';

    const skuHtml = m.sku
      ? `<span class="sku-text">${m.sku}</span>`
      : '<span class="text-muted">—</span>';

    return `<tr class="prod-row" data-id="${m.id}">
      <td class="td-num">${i + 1}</td>
      <td class="td-img">${img}</td>
      <td class="td-nom">
        <div class="prod-nom-wrap">
          <strong class="prod-nom">${m.nom}</strong>
          ${skuHtml}
          ${m.izoh ? `<span class="prod-izoh">${m.izoh.slice(0,40)}${m.izoh.length>40?'…':''}</span>` : ''}
          ${m.source==='qr' ? '<span class="qr-source-tag"><i class="fas fa-qrcode"></i> QR</span>' : ''}
        </div>
      </td>
      <td class="td-kat"><span class="kat-chip">${m.kat||'—'}</span></td>
      <td class="td-trek">${trekHtml}</td>
      <td class="td-yuan">${m.xitoyNarx ? `<span class="yuan-text">¥${Number(m.xitoyNarx).toLocaleString()}</span>` : '<span class="text-muted">—</span>'}</td>
      <td class="td-narx"><strong class="price-text">${formatMoney(m.sotuvNarx)}</strong></td>
      <td class="td-miqdor">
        <div class="miqdor-wrap">
          <button class="miqdor-btn minus" onclick="miqdorOzgartir('${m.id}',-1)">−</button>
          <strong class="miqdor-val">${miqdor}</strong>
          <button class="miqdor-btn plus" onclick="miqdorOzgartir('${m.id}',1)">+</button>
        </div>
      </td>
      <td class="td-holat"><span class="badge ${holatClass}">${holatText}</span></td>
      <td class="td-sana">${formatDate(m.sana)}</td>
      <td class="td-actions">
        <div class="action-btns">
          <button class="btn-icon btn-edit" onclick="editMahsulot('${m.id}')" title="Tahrirlash">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn-icon btn-qr-gen" onclick="generateQR('${m.id}')" title="QR yaratish">
            <i class="fas fa-qrcode"></i>
          </button>
          <button class="btn-icon btn-del" onclick="deleteMahsulot('${m.id}')" title="O'chirish">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterMahsulot() {
  const val = document.getElementById('mahsulot-search')?.value || '';
  renderMahsulot(val);
}

// ══════════════════════════════════════════════════════════════
//  MODAL OCHISH
// ══════════════════════════════════════════════════════════════
function openMahsulotModal() {
  _mEditId = null;
  _mCurrentImages = [];
  _mExistingImages = [];

  document.getElementById('mahsulot-modal-title').textContent = 'Yangi mahsulot';
  document.getElementById('m-id').value = '';
  document.getElementById('m-nom').value = '';
  document.getElementById('m-sku').value = '';
  document.getElementById('m-kat').value = '';
  document.getElementById('m-trek').value = '';
  document.getElementById('m-barcode').value = '';
  document.getElementById('m-xitoy-narx').value = '';
  document.getElementById('m-sotuv-narx').value = '';
  document.getElementById('m-miqdor').value = '';
  document.getElementById('m-min').value = '5';
  document.getElementById('m-izoh').value = '';
  document.getElementById('m-ombor-holat').value = 'mavjud';

  _renderImagePreviews();
  openModal('mahsulot-modal');
}

function editMahsulot(id) {
  const mahsulotlar = DB.get('mahsulotlar');
  const m = mahsulotlar.find(x => x.id === id);
  if (!m) return;

  _mEditId = id;
  _mCurrentImages = [];
  _mExistingImages = m.rasmlar || (m.rasm ? [m.rasm] : []);

  document.getElementById('mahsulot-modal-title').textContent = 'Mahsulotni tahrirlash';
  document.getElementById('m-id').value         = m.id;
  document.getElementById('m-nom').value        = m.nom || '';
  document.getElementById('m-sku').value        = m.sku || '';
  document.getElementById('m-kat').value        = m.kat || '';
  document.getElementById('m-trek').value       = m.trek || '';
  document.getElementById('m-barcode').value    = m.barcode || '';
  document.getElementById('m-xitoy-narx').value = m.xitoyNarx || '';
  document.getElementById('m-sotuv-narx').value = m.sotuvNarx || '';
  document.getElementById('m-miqdor').value     = m.miqdor || '';
  document.getElementById('m-min').value        = m.min || '5';
  document.getElementById('m-izoh').value       = m.izoh || '';
  document.getElementById('m-ombor-holat').value = m.omborHolat || 'mavjud';

  _renderImagePreviews();
  openModal('mahsulot-modal');
}

// ══════════════════════════════════════════════════════════════
//  RASM BOSHQARUVI
// ══════════════════════════════════════════════════════════════
function mRasmYukla(event) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    if (file.size > 10 * 1024 * 1024) {
      showToast(`${file.name} — 10MB dan katta!`, 'error'); return;
    }
    if (_mCurrentImages.length + _mExistingImages.length >= 5) {
      showToast('Maksimal 5 ta rasm!', 'warning'); return;
    }

    // Siqish va preview
    _compressImage(file, 800, 0.82).then(compressed => {
      _mCurrentImages.push({ file, url: compressed, name: file.name });
      _renderImagePreviews();
    });
  });
  event.target.value = ''; // Reset
}

function _compressImage(file, maxW, quality) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function _renderImagePreviews() {
  const wrap = document.getElementById('m-images-preview');
  if (!wrap) return;

  const allImages = [
    ..._mExistingImages.map(url => ({ url, existing: true })),
    ..._mCurrentImages.map(o  => ({ url: o.url, existing: false, idx: _mCurrentImages.indexOf(o) })),
  ];

  wrap.innerHTML = allImages.map((img, i) => `
    <div class="img-preview-item" data-i="${i}">
      <img src="${img.url}" alt="Rasm ${i+1}" />
      ${i === 0 ? '<span class="img-main-badge">Asosiy</span>' : ''}
      <button class="img-del-btn" onclick="_removeImage(${i},${img.existing})">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('') + `
    <label class="img-add-btn" for="m-rasm-input">
      <i class="fas fa-plus"></i>
      <span>${allImages.length === 0 ? 'Rasm qo\'shish' : ''}</span>
    </label>`;
}

function _removeImage(i, isExisting) {
  if (isExisting) {
    _mExistingImages.splice(i, 1);
  } else {
    const newIdx = i - _mExistingImages.length;
    _mCurrentImages.splice(newIdx, 1);
  }
  _renderImagePreviews();
}

// ══════════════════════════════════════════════════════════════
//  FIREBASE STORAGE GA RASM YUKLASH
// ══════════════════════════════════════════════════════════════
async function _uploadImages(mahsulotId) {
  const urls = [..._mExistingImages]; // Mavjud URL larni saqlash

  if (_mCurrentImages.length === 0) return urls;

  // Firebase Storage mavjud bo'lsa
  if (window.FB_STATE?.ready && window.fbStorage) {
    for (const imgObj of _mCurrentImages) {
      try {
        const path = `products/${window.FB_STATE.uid}/${mahsulotId}/${Date.now()}_${imgObj.name}`;
        const ref  = window.fbStorage.ref(path);

        // Base64 dan blob
        const blob = await fetch(imgObj.url).then(r => r.blob());
        await ref.put(blob, { contentType: 'image/jpeg' });
        const downloadUrl = await ref.getDownloadURL();
        urls.push(downloadUrl);
      } catch (e) {
        // Storage ishlamasa base64 ni saqlash
        console.warn('[Storage] yuklash xatosi, base64 saqlanadi:', e.message);
        urls.push(imgObj.url);
      }
    }
  } else {
    // Offline: base64 saqla
    _mCurrentImages.forEach(o => urls.push(o.url));
  }

  return urls;
}

// ══════════════════════════════════════════════════════════════
//  SAQLASH
// ══════════════════════════════════════════════════════════════
async function saveMahsulot() {
  const nom       = document.getElementById('m-nom').value.trim();
  const kat       = document.getElementById('m-kat').value;
  const sotuvNarx = document.getElementById('m-sotuv-narx').value;
  const miqdor    = document.getElementById('m-miqdor').value;

  if (!nom || !kat || !sotuvNarx || miqdor === '') {
    showToast('Nom, kategoriya, narx va miqdor majburiy!', 'error'); return;
  }

  const saveBtn = document.querySelector('#mahsulot-modal .btn-save');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saqlanmoqda...'; }

  try {
    const id = _mEditId || genId();

    // Rasmlarni yuklash
    const rasmlar = await _uploadImages(id);

    const data = {
      id,
      nom,
      sku:        document.getElementById('m-sku').value.trim(),
      kat,
      trek:       document.getElementById('m-trek').value.trim(),
      barcode:    document.getElementById('m-barcode').value.trim(),
      xitoyNarx:  Number(document.getElementById('m-xitoy-narx').value) || 0,
      sotuvNarx:  Number(sotuvNarx),
      miqdor:     Number(miqdor),
      min:        Number(document.getElementById('m-min').value) || 5,
      izoh:       document.getElementById('m-izoh').value.trim(),
      omborHolat: document.getElementById('m-ombor-holat').value,
      rasmlar,
      rasm:       rasmlar[0] || null,
      updatedAt:  new Date().toISOString(),
    };

    const mahsulotlar = DB.get('mahsulotlar');

    if (_mEditId) {
      const idx = mahsulotlar.findIndex(x => x.id === _mEditId);
      const eski = mahsulotlar[idx];
      mahsulotlar[idx] = { ...eski, ...data };
      DB.set('mahsulotlar', mahsulotlar);
      showToast('✅ Mahsulot yangilandi!');
      TG.mahsulotYangilandi(mahsulotlar[idx], eski);
    } else {
      data.sana      = today();
      data.createdAt = new Date().toISOString();
      data.source    = 'manual';
      mahsulotlar.push(data);
      DB.set('mahsulotlar', mahsulotlar);
      showToast('✅ Yangi mahsulot qo\'shildi!');
      TG.mahsulotQoshildi(data);
    }

    // Kam mahsulot tekshirish
    if (data.miqdor > 0 && data.miqdor <= data.min) {
      TG.kamMahsulot(data);
    }

    closeModal('mahsulot-modal');
    _mCurrentImages = []; _mExistingImages = [];
    renderMahsulot();
    renderDashboard();

  } catch (e) {
    showToast('Xatolik: ' + e.message, 'error');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> Saqlash'; }
  }
}

// ══════════════════════════════════════════════════════════════
//  O'CHIRISH
// ══════════════════════════════════════════════════════════════
async function deleteMahsulot(id) {
  if (!confirm('Ushbu mahsulotni o\'chirasizmi? Bu amalni qaytarib bo\'lmaydi!')) return;

  // Storage dan rasmlarni o'chirish
  const m = DB.get('mahsulotlar').find(x => x.id === id);
  if (m?.rasmlar && window.FB_STATE?.ready && window.fbStorage) {
    for (const url of m.rasmlar) {
      if (url.startsWith('https://firebasestorage.googleapis.com')) {
        try { await window.fbStorage.refFromURL(url).delete(); } catch {}
      }
    }
  }

  await DB.delete('mahsulotlar', id);
  showToast('🗑️ Mahsulot o\'chirildi');
  renderMahsulot();
  renderDashboard();
}

// ══════════════════════════════════════════════════════════════
//  MIQDOR TEZKOR O'ZGARTIRISH
// ══════════════════════════════════════════════════════════════
async function miqdorOzgartir(id, delta) {
  const mahsulotlar = DB.get('mahsulotlar');
  const idx = mahsulotlar.findIndex(x => x.id === id);
  if (idx === -1) return;

  const yangi = Math.max(0, Number(mahsulotlar[idx].miqdor) + delta);
  mahsulotlar[idx].miqdor = yangi;
  DB.set('mahsulotlar', mahsulotlar);

  // Jadvalda animatsiya
  const row = document.querySelector(`tr[data-id="${id}"]`);
  if (row) {
    row.classList.add('row-flash');
    setTimeout(() => row.classList.remove('row-flash'), 400);
    row.querySelector('.miqdor-val').textContent = yangi;
  }

  // Kam qoldi ogohlantirish
  const m = mahsulotlar[idx];
  if (yangi > 0 && yangi <= Number(m.min||5)) {
    TG.kamMahsulot(m);
  }
}

// ══════════════════════════════════════════════════════════════
//  QR KOD YARATISH
// ══════════════════════════════════════════════════════════════
function generateQR(id) {
  const mahsulotlar = DB.get('mahsulotlar');
  const m = mahsulotlar.find(x => x.id === id);
  if (!m) return;

  // QR ichida faqat URL (product ID bilan)
  const qrUrl = DB.getProductUrl(id);

  const modal = document.getElementById('qr-generate-modal');
  document.getElementById('qr-gen-nom').textContent = m.nom;
  document.getElementById('qr-gen-id').textContent  = id;
  document.getElementById('qr-gen-url').textContent = qrUrl;

  const container = document.getElementById('qr-gen-canvas');
  container.innerHTML = '';

  // QRCode kutubxonasi
  if (typeof QRCode !== 'undefined') {
    new QRCode(container, {
      text: qrUrl,
      width: 220, height: 220,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });
  } else {
    // Fallback: QR API
    container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}&margin=10" style="border-radius:8px" />`;
  }

  openModal('qr-generate-modal');
}

function downloadQR() {
  const canvas = document.querySelector('#qr-gen-canvas canvas');
  const nom = document.getElementById('qr-gen-nom').textContent;
  if (!canvas) {
    const img = document.querySelector('#qr-gen-canvas img');
    if (img) {
      const a = document.createElement('a');
      a.href = img.src; a.download = `QR_${nom}.png`; a.click();
    }
    return;
  }
  const a = document.createElement('a');
  a.download = `QR_${nom}.png`;
  a.href = canvas.toDataURL();
  a.click();
}

function printQR() {
  const canvas = document.querySelector('#qr-gen-canvas canvas');
  const nom    = document.getElementById('qr-gen-nom').textContent;
  const src    = canvas ? canvas.toDataURL() : document.querySelector('#qr-gen-canvas img')?.src;
  if (!src) return;

  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>QR: ${nom}</title>
    <style>body{display:flex;flex-direction:column;align-items:center;font-family:sans-serif;padding:2rem}
    img{width:200px;height:200px}h3{margin-top:1rem;font-size:1rem}</style>
    </head><body>
    <img src="${src}" />
    <h3>${nom}</h3>
    <script>window.print(); window.close();<\/script>
    </body></html>`);
}

// ══════════════════════════════════════════════════════════════
//  RASM VIEWER
// ══════════════════════════════════════════════════════════════
function openImageViewer(id) {
  const m = DB.get('mahsulotlar').find(x => x.id === id);
  if (!m) return;
  const imgs = m.rasmlar || (m.rasm ? [m.rasm] : []);
  if (!imgs.length) return;

  let cur = 0;
  const overlay = document.createElement('div');
  overlay.className = 'img-viewer-overlay';
  overlay.innerHTML = `
    <button class="iv-close" onclick="this.closest('.img-viewer-overlay').remove()">
      <i class="fas fa-times"></i>
    </button>
    <button class="iv-prev" onclick="_ivNav(-1)" ${imgs.length<=1?'style="display:none"':''}>
      <i class="fas fa-chevron-left"></i>
    </button>
    <div class="iv-img-wrap">
      <img id="iv-img" src="${imgs[0]}" />
      <div class="iv-counter" id="iv-counter">${imgs.length > 1 ? `1 / ${imgs.length}` : ''}</div>
    </div>
    <button class="iv-next" onclick="_ivNav(1)" ${imgs.length<=1?'style="display:none"':''}>
      <i class="fas fa-chevron-right"></i>
    </button>`;

  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);

  window._ivNav = (d) => {
    cur = (cur + d + imgs.length) % imgs.length;
    document.getElementById('iv-img').src = imgs[cur];
    document.getElementById('iv-counter').textContent = `${cur+1} / ${imgs.length}`;
  };
}

// ══════════════════════════════════════════════════════════════
//  QR DAN MAHSULOT QABUL QILISH (scanner.js chaqiradi)
// ══════════════════════════════════════════════════════════════
async function qrMahsulotQabul(productId) {
  // Firestore dan mahsulot ma'lumotlarini olish
  let m = await DB.getById('mahsulotlar', productId);

  if (!m) {
    return { topilmadi: true, id: productId };
  }

  // Mavjud mahsulot — miqdorni oshirish
  const yangiMiqdor = Number(m.miqdor) + 1;
  await DB.update('mahsulotlar', productId, { miqdor: yangiMiqdor });

  // Telegram rasm bilan xabar
  TG.qrSkanXabar(m, yangiMiqdor);

  renderMahsulot();
  return { yangi: false, nom: m.nom, miqdor: yangiMiqdor, rasm: m.rasm || m.rasmlar?.[0] };
}

// ══════════════════════════════════════════════════════════════
//  URL PARAMETRIDAN MAHSULOT OCHISH
// ══════════════════════════════════════════════════════════════
async function checkProductUrlParam() {
  const params = new URLSearchParams(window.location.search);
  const pid    = params.get('product');
  if (!pid) return;

  const m = await DB.getById('mahsulotlar', pid);
  if (!m) {
    showToast('Mahsulot topilmadi: ' + pid, 'warning'); return;
  }
  editMahsulot(pid);
}
