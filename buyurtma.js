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
