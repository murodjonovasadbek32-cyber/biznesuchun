// ===== BUYURTMALAR MODULI =====

function renderBuyurtma(filter = '') {
  const buyurtmalar = DB.get('buyurtmalar');
  const tbody = document.getElementById('buyurtma-tbody');

  const list = filter
    ? buyurtmalar.filter(b => b.holat === filter)
    : buyurtmalar;

  const sorted = [...list].sort((a, b) => new Date(b.sana) - new Date(a.sana));

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">Buyurtma yo'q!</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map((b, i) => {
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>#${b.raqam}</strong></td>
        <td>${b.mijozNom || '—'}</td>
        <td>${b.mahsulotNom || '—'}</td>
        <td>${b.miqdor} dona</td>
        <td><strong>${formatMoney(b.summa)}</strong></td>
        <td>
          <select class="badge badge-${b.holat}" style="border:none;background:inherit;cursor:pointer;font-size:0.78rem;padding:0.25rem 0.5rem;border-radius:20px;"
            onchange="changeHolat('${b.id}', this.value)">
            <option value="yangi" ${b.holat === 'yangi' ? 'selected' : ''}>Yangi</option>
            <option value="jarayonda" ${b.holat === 'jarayonda' ? 'selected' : ''}>Jarayonda</option>
            <option value="yetkazildi" ${b.holat === 'yetkazildi' ? 'selected' : ''}>Yetkazildi</option>
            <option value="bekor" ${b.holat === 'bekor' ? 'selected' : ''}>Bekor</option>
          </select>
        </td>
        <td>${formatDate(b.sana)}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="chekChiqar('${b.id}')" title="Chek chiqarish">
            <i class="fas fa-receipt"></i>
          </button>
          <button class="btn btn-sm btn-secondary" onclick="editBuyurtma('${b.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteBuyurtma('${b.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function filterBuyurtma() {
  const val = document.getElementById('buyurtma-filter').value;
  renderBuyurtma(val);
}

function changeHolat(id, newHolat) {
  const buyurtmalar = DB.get('buyurtmalar');
  const idx = buyurtmalar.findIndex(b => b.id === id);
  if (idx === -1) return;
  const b = buyurtmalar[idx];
  buyurtmalar[idx].holat = newHolat;
  DB.set('buyurtmalar', buyurtmalar);
  showToast('Holat yangilandi!');

  // Telegram xabar
  TG.buyurtmaHolat(b, newHolat);

  // Yetkazildi bo'lsa moliyaga kirim qo'sh
  if (newHolat === 'yetkazildi') {
    const moliyalar = DB.get('moliyalar');
    moliyalar.push({
      id: genId(),
      tur: 'kirim',
      tavsif: `Sotuv: ${b.mahsulotNom} (${b.miqdor} dona) — #${b.raqam}`,
      summa: b.summa,
      sana: today(),
    });
    DB.set('moliyalar', moliyalar);
  }

  renderBuyurtma(document.getElementById('buyurtma-filter').value);
}

function openBuyurtmaModal() {
  // Mijoz va mahsulotlar ro'yxatini yuklash
  fillBuyurtmaSelects();

  document.getElementById('buyurtma-modal-title').textContent = 'Yangi buyurtma';
  document.getElementById('b-id').value = '';
  document.getElementById('b-miqdor').value = 1;
  document.getElementById('b-summa').value = '';
  document.getElementById('b-holat').value = 'yangi';
  document.getElementById('b-tolov').value = 'naqd';
  document.getElementById('b-izoh').value = '';
  openModal('buyurtma-modal');
}

function fillBuyurtmaSelects() {
  const mijozlar = DB.get('mijozlar');
  const mahsulotlar = DB.get('mahsulotlar');

  const mijozSel = document.getElementById('b-mijoz');
  mijozSel.innerHTML = '<option value="">Mijoz tanlang</option>' +
    mijozlar.map(m => `<option value="${m.id}">${m.ism} – ${m.tel}</option>`).join('');

  const mahsulotSel = document.getElementById('b-mahsulot');
  mahsulotSel.innerHTML = '<option value="">Mahsulot tanlang</option>' +
    mahsulotlar.filter(m => Number(m.miqdor) > 0)
      .map(m => `<option value="${m.id}" data-narx="${m.sotuvNarx}">${m.nom} (${m.miqdor} dona)</option>`).join('');
}

function updateBuyurtmaNarx() {
  const sel = document.getElementById('b-mahsulot');
  const opt = sel.options[sel.selectedIndex];
  const narx = opt?.dataset?.narx || 0;
  const miqdor = Number(document.getElementById('b-miqdor').value) || 1;
  document.getElementById('b-summa').value = Number(narx) * miqdor;
}

function editBuyurtma(id) {
  fillBuyurtmaSelects();
  const buyurtmalar = DB.get('buyurtmalar');
  const b = buyurtmalar.find(x => x.id === id);
  if (!b) return;

  document.getElementById('buyurtma-modal-title').textContent = 'Buyurtmani tahrirlash';
  document.getElementById('b-id').value = b.id;
  document.getElementById('b-mijoz').value = b.mijozId;
  document.getElementById('b-mahsulot').value = b.mahsulotId;
  document.getElementById('b-miqdor').value = b.miqdor;
  document.getElementById('b-summa').value = b.summa;
  document.getElementById('b-holat').value = b.holat;
  document.getElementById('b-tolov').value = b.tolov || 'naqd';
  document.getElementById('b-izoh').value = b.izoh || '';
  openModal('buyurtma-modal');
}

function saveBuyurtma() {
  const mijozId = document.getElementById('b-mijoz').value;
  const mahsulotId = document.getElementById('b-mahsulot').value;
  const miqdor = Number(document.getElementById('b-miqdor').value);
  const summa = document.getElementById('b-summa').value;
  const holat = document.getElementById('b-holat').value;
  const tolov = document.getElementById('b-tolov').value;
  const izoh = document.getElementById('b-izoh').value.trim();

  if (!mijozId || !mahsulotId || !miqdor || !summa) {
    showToast('Barcha majburiy maydonlarni to\'ldiring!', 'error');
    return;
  }

  const mijozlar = DB.get('mijozlar');
  const mahsulotlar = DB.get('mahsulotlar');
  const buyurtmalar = DB.get('buyurtmalar');

  const mijoz = mijozlar.find(m => m.id === mijozId);
  const mahsulot = mahsulotlar.find(m => m.id === mahsulotId);

  const id = document.getElementById('b-id').value;

  if (id) {
    // Tahrirlash – eski miqdorni qaytarish
    const idx = buyurtmalar.findIndex(b => b.id === id);
    const eski = buyurtmalar[idx];

    // Eski mahsulot omborini tiklash
    const mIdx = mahsulotlar.findIndex(m => m.id === eski.mahsulotId);
    if (mIdx !== -1) mahsulotlar[mIdx].miqdor = Number(mahsulotlar[mIdx].miqdor) + Number(eski.miqdor);

    buyurtmalar[idx] = {
      ...eski,
      mijozId, mijozNom: mijoz?.ism || '',
      mahsulotId, mahsulotNom: mahsulot?.nom || '',
      miqdor, summa, holat, tolov, izoh,
    };
    showToast('Buyurtma yangilandi!');
  } else {
    // Yangi buyurtma – ombordan kamaytirish
    const mIdx = mahsulotlar.findIndex(m => m.id === mahsulotId);
    if (mIdx !== -1) {
      if (Number(mahsulotlar[mIdx].miqdor) < miqdor) {
        showToast('Omborда yetarli mahsulot yo\'q!', 'error');
        return;
      }
      mahsulotlar[mIdx].miqdor = Number(mahsulotlar[mIdx].miqdor) - miqdor;

      // Kam qolgan bo'lsa ogohlantirish
      if (Number(mahsulotlar[mIdx].miqdor) <= Number(mahsulotlar[mIdx].min || 5)) {
        TG.kamMahsulot(mahsulotlar[mIdx]);
      }
    }

    // Buyurtma raqami
    const raqam = String(buyurtmalar.length + 1).padStart(4, '0');

    const yangi = {
      id: genId(),
      raqam,
      mijozId, mijozNom: mijoz?.ism || '',
      mahsulotId, mahsulotNom: mahsulot?.nom || '',
      miqdor, summa, holat, tolov, izoh,
      sana: today(),
    };
    buyurtmalar.push(yangi);

    // Telegram xabar
    TG.buyurtmaQoshildi(yangi);

    // Moliyaga avtomatik kirim qo'shish (yetkazildi holati bo'lsa)
    if (holat === 'yetkazildi') {
      const moliyalar = DB.get('moliyalar');
      moliyalar.push({
        id: genId(),
        tur: 'kirim',
        tavsif: `Sotuv: ${mahsulot?.nom || ''} (${miqdor} dona)`,
        summa: summa,
        sana: today(),
      });
      DB.set('moliyalar', moliyalar);
    }

    showToast('Yangi buyurtma qo\'shildi!');
  }

  DB.set('mahsulotlar', mahsulotlar);
  DB.set('buyurtmalar', buyurtmalar);
  closeModal('buyurtma-modal');
  renderBuyurtma();
}

function deleteBuyurtma(id) {
  if (!confirm('Ushbu buyurtmani o\'chirasizmi?')) return;

  let buyurtmalar = DB.get('buyurtmalar');
  const b = buyurtmalar.find(x => x.id === id);

  // Omborga qaytarish
  if (b && b.holat !== 'yetkazildi') {
    const mahsulotlar = DB.get('mahsulotlar');
    const mIdx = mahsulotlar.findIndex(m => m.id === b.mahsulotId);
    if (mIdx !== -1) mahsulotlar[mIdx].miqdor = Number(mahsulotlar[mIdx].miqdor) + Number(b.miqdor);
    DB.set('mahsulotlar', mahsulotlar);
  }

  buyurtmalar = buyurtmalar.filter(x => x.id !== id);
  DB.set('buyurtmalar', buyurtmalar);
  showToast('Buyurtma o\'chirildi!');
  renderBuyurtma();
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('[onclick="openModal(\'buyurtma-modal\')"]');
  if (btn) btn.setAttribute('onclick', 'openBuyurtmaModal()');
});


// ===== CHEK CHIQARISH =====
function chekChiqar(id) {
  const buyurtmalar = DB.get('buyurtmalar');
  const b = buyurtmalar.find(x => x.id === id);
  if (!b) return;

  const mijozlar = DB.get('mijozlar');
  const mijoz = mijozlar.find(m => m.id === b.mijozId) || {};

  const tolovEmoji = { naqd: '💵 Naqd', karta: '💳 Karta', nasiya: '📝 Nasiya', uzum: '📱 Uzum Pay' };
  const holatEmoji = { yangi: '🆕', jarayonda: '⏳', yetkazildi: '✅', bekor: '❌' };

  const chekOyna = window.open('', '_blank', 'width=400,height=600');
  chekOyna.document.write(`
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8"/>
  <title>Chek #${b.raqam}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', monospace;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .chek {
      background: white;
      width: 320px;
      padding: 1.5rem 1.2rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      border: 1px solid #e2e8f0;
    }
    .chek-top {
      text-align: center;
      border-bottom: 2px dashed #e2e8f0;
      padding-bottom: 1rem;
      margin-bottom: 1rem;
    }
    .chek-logo { font-size: 1.8rem; margin-bottom: 4px; }
    .chek-nom { font-size: 1rem; font-weight: 700; color: #1e293b; }
    .chek-sub { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
    .chek-raqam {
      background: #6c63ff;
      color: white;
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.82rem;
      display: inline-block;
      margin-top: 0.5rem;
      font-weight: 600;
    }
    .chek-row {
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 0;
      font-size: 0.85rem;
      border-bottom: 1px dotted #f1f5f9;
    }
    .chek-row:last-child { border-bottom: none; }
    .chek-label { color: #64748b; }
    .chek-val { font-weight: 600; color: #1e293b; text-align: right; }
    .chek-total {
      background: #f0fdf4;
      border: 2px solid #22c55e;
      border-radius: 8px;
      padding: 0.75rem;
      text-align: center;
      margin: 1rem 0;
    }
    .chek-total-label { font-size: 0.8rem; color: #64748b; }
    .chek-total-sum { font-size: 1.4rem; font-weight: 700; color: #16a34a; }
    .chek-qr {
      text-align: center;
      margin: 1rem 0;
      padding: 1rem 0;
      border-top: 2px dashed #e2e8f0;
    }
    .chek-qr p { font-size: 0.72rem; color: #94a3b8; margin-top: 0.5rem; }
    .chek-bottom {
      text-align: center;
      font-size: 0.72rem;
      color: #94a3b8;
      border-top: 2px dashed #e2e8f0;
      padding-top: 0.75rem;
      margin-top: 0.5rem;
    }
    .holat-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 600;
      background: ${b.holat === 'yetkazildi' ? '#dcfce7' : b.holat === 'bekor' ? '#fee2e2' : '#dbeafe'};
      color: ${b.holat === 'yetkazildi' ? '#16a34a' : b.holat === 'bekor' ? '#dc2626' : '#2563eb'};
    }
    .print-btn {
      width: 100%;
      padding: 0.6rem;
      background: #6c63ff;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      cursor: pointer;
      margin-top: 1rem;
    }
    @media print {
      body { background: white; padding: 0; }
      .chek { box-shadow: none; border: none; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="chek">
    <!-- HEADER -->
    <div class="chek-top">
      <div class="chek-logo">🛒</div>
      <div class="chek-nom">Uzum Market Texnika</div>
      <div class="chek-sub">Rasmiy chek</div>
      <div class="chek-raqam">Buyurtma #${b.raqam}</div>
    </div>

    <!-- MIJOZ MA'LUMOTLARI -->
    <div style="margin-bottom:0.75rem">
      <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:0.4rem;font-weight:600;text-transform:uppercase">Mijoz</div>
      <div class="chek-row">
        <span class="chek-label">Ism:</span>
        <span class="chek-val">${b.mijozNom || '—'}</span>
      </div>
      ${mijoz.tel ? `<div class="chek-row"><span class="chek-label">Telefon:</span><span class="chek-val">${mijoz.tel}</span></div>` : ''}
    </div>

    <!-- BUYURTMA MA'LUMOTLARI -->
    <div style="margin-bottom:0.75rem">
      <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:0.4rem;font-weight:600;text-transform:uppercase">Buyurtma</div>
      <div class="chek-row">
        <span class="chek-label">Mahsulot:</span>
        <span class="chek-val">${b.mahsulotNom || '—'}</span>
      </div>
      <div class="chek-row">
        <span class="chek-label">Miqdor:</span>
        <span class="chek-val">${b.miqdor} dona</span>
      </div>
      <div class="chek-row">
        <span class="chek-label">To'lov:</span>
        <span class="chek-val">${tolovEmoji[b.tolov] || b.tolov}</span>
      </div>
      <div class="chek-row">
        <span class="chek-label">Holat:</span>
        <span class="chek-val"><span class="holat-badge">${holatEmoji[b.holat] || ''} ${b.holat}</span></span>
      </div>
      <div class="chek-row">
        <span class="chek-label">Sana:</span>
        <span class="chek-val">${b.sana}</span>
      </div>
      ${b.izoh ? `<div class="chek-row"><span class="chek-label">Izoh:</span><span class="chek-val">${b.izoh}</span></div>` : ''}
    </div>

    <!-- JAMI SUMMA -->
    <div class="chek-total">
      <div class="chek-total-label">JAMI TO'LOV</div>
      <div class="chek-total-sum">${Number(b.summa).toLocaleString('uz-UZ')} so'm</div>
    </div>

    <!-- QR KOD -->
    <div class="chek-qr">
      <div id="chek-qr-div"></div>
      <p>Buyurtma #${b.raqam} tasdiqlash QR kodi</p>
    </div>

    <!-- PASTKI QISM -->
    <div class="chek-bottom">
      <p>Uzum Market Texnika</p>
      <p>Xaridingiz uchun rahmat! 🙏</p>
      <p style="margin-top:4px">${new Date().toLocaleString('uz-UZ')}</p>
    </div>

    <button class="print-btn" onclick="window.print()">
      🖨️ Chek chiqarish
    </button>
  </div>

  <script>
    new QRCode(document.getElementById('chek-qr-div'), {
      text: JSON.stringify({ raqam: '${b.raqam}', mijoz: '${b.mijozNom}', summa: ${b.summa}, sana: '${b.sana}' }),
      width: 100, height: 100,
      colorDark: '#1e1b4b',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  <\/script>
</body>
</html>`);

  chekOyna.document.close();
}
