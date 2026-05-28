// ===== MAHSULOT / OMBOR MODULI =====

let mCurrentRasm = null; // Modal uchun joriy rasm

// ===== RENDER =====
function renderMahsulot(filter = '') {
  const mahsulotlar = DB.get('mahsulotlar');
  const tbody = document.getElementById('mahsulot-tbody');

  const list = filter
    ? mahsulotlar.filter(m =>
        m.nom.toLowerCase().includes(filter.toLowerCase()) ||
        (m.kat && m.kat.toLowerCase().includes(filter.toLowerCase())) ||
        (m.trek && m.trek.toLowerCase().includes(filter.toLowerCase()))
      )
    : mahsulotlar;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty">Mahsulot yo'q. Yangi qo'shing yoki QR skan qiling!</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((m, i) => {
    const miqdor = Number(m.miqdor);
    const min = Number(m.min || 5);

    // Holat badge
    let holatBadge = '';
    if (miqdor === 0) holatBadge = '<span class="badge badge-bekor">Tugagan</span>';
    else if (miqdor <= min) holatBadge = '<span class="badge badge-ogohlantirish">⚠ Kam</span>';
    else holatBadge = '<span class="badge badge-ok">✓ Yetarli</span>';

    // Rasm
    const rasmHtml = m.rasm
      ? `<img src="${m.rasm}" class="mahsulot-thumb" alt="${m.nom}" onclick="rasmKattalashtir('${m.id}')" style="cursor:pointer" />`
      : `<div class="mahsulot-thumb-placeholder">📦</div>`;

    // Trek badge
    const trekHtml = m.trek
      ? `<span class="trek-badge"><i class="fas fa-barcode"></i>${m.trek}</span>`
      : '<span style="color:#cbd5e1">—</span>';

    // Yuan narxi
    const yuanHtml = m.xitoyNarx
      ? `<span>¥${Number(m.xitoyNarx).toLocaleString()}</span>`
      : '<span style="color:#cbd5e1">—</span>';

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${rasmHtml}</td>
        <td>
          <strong>${m.nom}</strong>
          ${m.izoh ? `<br><small style="color:#94a3b8">${m.izoh}</small>` : ''}
          ${m.source === 'qr' ? '<br><span style="font-size:0.72rem;color:#6c63ff"><i class="fas fa-qrcode"></i> QR</span>' : ''}
        </td>
        <td>${m.kat}</td>
        <td>${trekHtml}</td>
        <td>${yuanHtml}</td>
        <td>${formatMoney(m.sotuvNarx)}</td>
        <td>
          <strong style="font-size:1rem">${miqdor}</strong>
          <span style="font-size:0.78rem;color:#94a3b8"> dona</span>
        </td>
        <td>${holatBadge}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editMahsulot('${m.id}')" title="Tahrirlash">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteMahsulot('${m.id}')" title="O'chirish">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

// ===== FILTER =====
function filterMahsulot() {
  const val = document.getElementById('mahsulot-search').value;
  renderMahsulot(val);
}

// ===== MODAL OCHISH (YANGI) =====
function openMahsulotModal() {
  document.getElementById('mahsulot-modal-title').textContent = 'Yangi mahsulot';
  document.getElementById('m-id').value = '';
  document.getElementById('m-nom').value = '';
  document.getElementById('m-kat').value = '';
  document.getElementById('m-trek').value = '';
  document.getElementById('m-xitoy-narx').value = '';
  document.getElementById('m-sotuv-narx').value = '';
  document.getElementById('m-miqdor').value = '';
  document.getElementById('m-min').value = '';
  document.getElementById('m-izoh').value = '';
  mRasmTozala();
  openModal('mahsulot-modal');
}

// ===== MODAL OCHISH (TAHRIRLASH) =====
function editMahsulot(id) {
  const mahsulotlar = DB.get('mahsulotlar');
  const m = mahsulotlar.find(x => x.id === id);
  if (!m) return;

  document.getElementById('mahsulot-modal-title').textContent = 'Mahsulotni tahrirlash';
  document.getElementById('m-id').value = m.id;
  document.getElementById('m-nom').value = m.nom;
  document.getElementById('m-kat').value = m.kat;
  document.getElementById('m-trek').value = m.trek || '';
  document.getElementById('m-xitoy-narx').value = m.xitoyNarx || '';
  document.getElementById('m-sotuv-narx').value = m.sotuvNarx;
  document.getElementById('m-miqdor').value = m.miqdor;
  document.getElementById('m-min').value = m.min || '';
  document.getElementById('m-izoh').value = m.izoh || '';

  // Rasmni yuklash
  if (m.rasm) {
    mCurrentRasm = m.rasm;
    const preview = document.getElementById('m-rasm-preview');
    const wrap = document.getElementById('m-rasm-preview-wrap');
    const zone = document.getElementById('m-rasm-zone');
    preview.src = m.rasm;
    preview.style.display = 'block';
    wrap.style.display = 'none';
    zone.classList.add('has-image');
  } else {
    mRasmTozala();
  }

  openModal('mahsulot-modal');
}

// ===== RASM YUKLASH (MODAL) =====
function mRasmYukla(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('Rasm 5MB dan kichik bo\'lsin!', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    mCurrentRasm = e.target.result;
    const preview = document.getElementById('m-rasm-preview');
    const wrap = document.getElementById('m-rasm-preview-wrap');
    const zone = document.getElementById('m-rasm-zone');
    preview.src = mCurrentRasm;
    preview.style.display = 'block';
    wrap.style.display = 'none';
    zone.classList.add('has-image');
    showToast('Rasm yuklandi!');
  };
  reader.readAsDataURL(file);
}

// ===== RASMNI TOZALASH =====
function mRasmTozala() {
  mCurrentRasm = null;
  const preview = document.getElementById('m-rasm-preview');
  const wrap = document.getElementById('m-rasm-preview-wrap');
  const zone = document.getElementById('m-rasm-zone');
  if (preview) { preview.style.display = 'none'; preview.src = ''; }
  if (wrap) wrap.style.display = 'flex';
  if (zone) zone.classList.remove('has-image');
}

// ===== RASMNI KATTALASHTIRISH =====
function rasmKattalashtir(id) {
  const mahsulotlar = DB.get('mahsulotlar');
  const m = mahsulotlar.find(x => x.id === id);
  if (!m || !m.rasm) return;

  // Vaqtinchalik overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.85);
    z-index:9999;display:flex;align-items:center;justify-content:center;
    cursor:pointer;padding:1rem;
  `;
  overlay.onclick = () => document.body.removeChild(overlay);

  const img = document.createElement('img');
  img.src = m.rasm;
  img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain';

  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

// ===== SAQLASH =====
function saveMahsulot() {
  const nom = document.getElementById('m-nom').value.trim();
  const kat = document.getElementById('m-kat').value;
  const trek = document.getElementById('m-trek').value.trim();
  const xitoyNarx = document.getElementById('m-xitoy-narx').value;
  const sotuvNarx = document.getElementById('m-sotuv-narx').value;
  const miqdor = document.getElementById('m-miqdor').value;
  const min = document.getElementById('m-min').value || 5;
  const izoh = document.getElementById('m-izoh').value.trim();

  if (!nom || !kat || !sotuvNarx || miqdor === '') {
    showToast('Nom, kategoriya, sotuv narxi va miqdor majburiy!', 'error');
    return;
  }

  const mahsulotlar = DB.get('mahsulotlar');
  const id = document.getElementById('m-id').value;

  if (id) {
    const idx = mahsulotlar.findIndex(x => x.id === id);
    mahsulotlar[idx] = {
      ...mahsulotlar[idx],
      nom, kat, trek, xitoyNarx,
      sotuvNarx, miqdor, min, izoh,
      rasm: mCurrentRasm || mahsulotlar[idx].rasm || null,
    };
    showToast('Mahsulot yangilandi!');
  } else {
    mahsulotlar.push({
      id: genId(),
      nom, kat, trek, xitoyNarx,
      sotuvNarx, miqdor, min, izoh,
      rasm: mCurrentRasm || null,
      sana: today(),
      source: 'manual',
    });
    showToast('Yangi mahsulot qo\'shildi!');
  }

  DB.set('mahsulotlar', mahsulotlar);
  closeModal('mahsulot-modal');
  mRasmTozala();
  renderMahsulot();
}

// ===== O'CHIRISH =====
function deleteMahsulot(id) {
  if (!confirm('Ushbu mahsulotni o\'chirasizmi?')) return;
  let mahsulotlar = DB.get('mahsulotlar');
  mahsulotlar = mahsulotlar.filter(m => m.id !== id);
  DB.set('mahsulotlar', mahsulotlar);
  showToast('Mahsulot o\'chirildi!');
  renderMahsulot();
}

// ===== QR DAN MAHSULOT QABUL QILISH =====
// scanner.js dan chaqiriladi — bu funksiya mahsulotni DB ga yozadi
function qrMahsulotQabul(data, rasm) {
  const mahsulotlar = DB.get('mahsulotlar');

  const mavjud = mahsulotlar.find(m =>
    (data.trek && m.trek && m.trek === data.trek) ||
    (m.nom === data.nom && m.kat === data.kat)
  );

  if (mavjud) {
    const idx = mahsulotlar.findIndex(m => m.id === mavjud.id);
    const yangiMiqdor = Number(mavjud.miqdor) + Number(data.miqdor || 1);
    mahsulotlar[idx] = {
      ...mavjud,
      xitoyNarx: data.yuan ?? mavjud.xitoyNarx,
      sotuvNarx: data.som ?? mavjud.sotuvNarx,
      miqdor: yangiMiqdor,
      trek: data.trek || mavjud.trek,
      rasm: rasm || mavjud.rasm || null,
      source: 'qr',
    };
    DB.set('mahsulotlar', mahsulotlar);
    return { yangi: false, miqdor: yangiMiqdor, nom: mavjud.nom };
  } else {
    const yangi = {
      id: data.id || genId(),
      nom: data.nom,
      kat: data.kat || 'Boshqa',
      trek: data.trek || '',
      xitoyNarx: data.yuan || 0,
      usd: data.usd || null,
      sotuvNarx: data.som || 0,
      kurs: data.kurs || 350,
      miqdor: data.miqdor || 1,
      min: data.min || 5,
      izoh: data.izoh || '',
      rasm: rasm || null,
      sana: data.sana || today(),
      source: 'qr',
    };
    mahsulotlar.push(yangi);
    DB.set('mahsulotlar', mahsulotlar);
    return { yangi: true, nom: data.nom };
  }
}
