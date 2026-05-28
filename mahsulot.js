// ===== MAHSULOT / OMBOR MODULI =====

function renderMahsulot(filter = '') {
  const mahsulotlar = DB.get('mahsulotlar');
  const tbody = document.getElementById('mahsulot-tbody');

  const list = filter
    ? mahsulotlar.filter(m =>
        m.nom.toLowerCase().includes(filter.toLowerCase()) ||
        m.kat.toLowerCase().includes(filter.toLowerCase())
      )
    : mahsulotlar;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">Mahsulot yo'q. Yangi qo'shing!</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((m, i) => {
    const miqdor = Number(m.miqdor);
    const min = Number(m.min || 5);
    let holatBadge = '';
    if (miqdor === 0) holatBadge = '<span class="badge badge-bekor">Tugagan</span>';
    else if (miqdor <= min) holatBadge = '<span class="badge badge-ogohlantirish">Kam</span>';
    else holatBadge = '<span class="badge badge-ok">Yetarli</span>';

    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${m.nom}</strong></td>
        <td>${m.kat}</td>
        <td>$${Number(m.xitoyNarx).toLocaleString()}</td>
        <td>${formatMoney(m.sotuvNarx)}</td>
        <td><strong>${miqdor}</strong> dona</td>
        <td>${holatBadge}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editMahsulot('${m.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteMahsulot('${m.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function filterMahsulot() {
  const val = document.getElementById('mahsulot-search').value;
  renderMahsulot(val);
}

function openMahsulotModal() {
  document.getElementById('mahsulot-modal-title').textContent = 'Yangi mahsulot';
  document.getElementById('m-id').value = '';
  document.getElementById('m-nom').value = '';
  document.getElementById('m-kat').value = '';
  document.getElementById('m-xitoy-narx').value = '';
  document.getElementById('m-sotuv-narx').value = '';
  document.getElementById('m-miqdor').value = '';
  document.getElementById('m-min').value = '';
  document.getElementById('m-izoh').value = '';
  openModal('mahsulot-modal');
}

function editMahsulot(id) {
  const mahsulotlar = DB.get('mahsulotlar');
  const m = mahsulotlar.find(x => x.id === id);
  if (!m) return;

  document.getElementById('mahsulot-modal-title').textContent = 'Mahsulotni tahrirlash';
  document.getElementById('m-id').value = m.id;
  document.getElementById('m-nom').value = m.nom;
  document.getElementById('m-kat').value = m.kat;
  document.getElementById('m-xitoy-narx').value = m.xitoyNarx;
  document.getElementById('m-sotuv-narx').value = m.sotuvNarx;
  document.getElementById('m-miqdor').value = m.miqdor;
  document.getElementById('m-min').value = m.min || '';
  document.getElementById('m-izoh').value = m.izoh || '';
  openModal('mahsulot-modal');
}

function saveMahsulot() {
  const nom = document.getElementById('m-nom').value.trim();
  const kat = document.getElementById('m-kat').value;
  const xitoyNarx = document.getElementById('m-xitoy-narx').value;
  const sotuvNarx = document.getElementById('m-sotuv-narx').value;
  const miqdor = document.getElementById('m-miqdor').value;
  const min = document.getElementById('m-min').value || 5;
  const izoh = document.getElementById('m-izoh').value.trim();

  if (!nom || !kat || !xitoyNarx || !sotuvNarx || miqdor === '') {
    showToast('Majburiy maydonlarni to\'ldiring!', 'error');
    return;
  }

  const mahsulotlar = DB.get('mahsulotlar');
  const id = document.getElementById('m-id').value;

  if (id) {
    // Tahrirlash
    const idx = mahsulotlar.findIndex(x => x.id === id);
    mahsulotlar[idx] = { id, nom, kat, xitoyNarx, sotuvNarx, miqdor, min, izoh };
    showToast('Mahsulot yangilandi!');
  } else {
    // Yangi
    mahsulotlar.push({ id: genId(), nom, kat, xitoyNarx, sotuvNarx, miqdor, min, izoh });
    showToast('Yangi mahsulot qo\'shildi!');
  }

  DB.set('mahsulotlar', mahsulotlar);
  closeModal('mahsulot-modal');
  renderMahsulot();
}

function deleteMahsulot(id) {
  if (!confirm('Ushbu mahsulotni o\'chirasizmi?')) return;
  let mahsulotlar = DB.get('mahsulotlar');
  mahsulotlar = mahsulotlar.filter(m => m.id !== id);
  DB.set('mahsulotlar', mahsulotlar);
  showToast('Mahsulot o\'chirildi!');
  renderMahsulot();
}

// Modal ochish tugmasi bilan bog'lash
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('[onclick="openModal(\'mahsulot-modal\')"]');
  if (btn) btn.setAttribute('onclick', 'openMahsulotModal()');
});
