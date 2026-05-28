// ===== MOLIYA MODULI =====

function renderMoliya(filter = '') {
  const moliyalar = DB.get('moliyalar');
  const tbody = document.getElementById('moliya-tbody');

  const list = filter
    ? moliyalar.filter(m => m.tur === filter)
    : moliyalar;

  const sorted = [...list].sort((a, b) => new Date(b.sana) - new Date(a.sana));

  // Umumiy hisob
  const kirim = moliyalar.filter(m => m.tur === 'kirim').reduce((s, m) => s + Number(m.summa), 0);
  const chiqim = moliyalar.filter(m => m.tur === 'chiqim').reduce((s, m) => s + Number(m.summa), 0);

  document.getElementById('jami-kirim').textContent = formatMoney(kirim);
  document.getElementById('jami-chiqim').textContent = formatMoney(chiqim);
  document.getElementById('sof-foyda').textContent = formatMoney(kirim - chiqim);

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Tranzaksiya yo'q!</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${formatDate(m.sana)}</td>
      <td><span class="badge badge-${m.tur}">${m.tur === 'kirim' ? '⬆ Kirim' : '⬇ Chiqim'}</span></td>
      <td>${m.tavsif}</td>
      <td><strong style="color:${m.tur === 'kirim' ? 'var(--green)' : 'var(--red)'}">${formatMoney(m.summa)}</strong></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editMoliya('${m.id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteMoliya('${m.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function filterMoliya() {
  const val = document.getElementById('moliya-filter').value;
  renderMoliya(val);
}

function openMoliyaModal() {
  document.getElementById('moliya-modal-title').textContent = 'Yangi tranzaksiya';
  document.getElementById('mo-id').value = '';
  document.getElementById('mo-tur').value = 'kirim';
  document.getElementById('mo-summa').value = '';
  document.getElementById('mo-tavsif').value = '';
  document.getElementById('mo-sana').value = today();
  openModal('moliya-modal');
}

function editMoliya(id) {
  const moliyalar = DB.get('moliyalar');
  const m = moliyalar.find(x => x.id === id);
  if (!m) return;

  document.getElementById('moliya-modal-title').textContent = 'Tranzaksiyani tahrirlash';
  document.getElementById('mo-id').value = m.id;
  document.getElementById('mo-tur').value = m.tur;
  document.getElementById('mo-summa').value = m.summa;
  document.getElementById('mo-tavsif').value = m.tavsif;
  document.getElementById('mo-sana').value = m.sana;
  openModal('moliya-modal');
}

function saveMoliya() {
  const tur = document.getElementById('mo-tur').value;
  const summa = document.getElementById('mo-summa').value;
  const tavsif = document.getElementById('mo-tavsif').value.trim();
  const sana = document.getElementById('mo-sana').value || today();

  if (!summa || !tavsif) {
    showToast('Summa va tavsif majburiy!', 'error');
    return;
  }

  const moliyalar = DB.get('moliyalar');
  const id = document.getElementById('mo-id').value;

  if (id) {
    const idx = moliyalar.findIndex(x => x.id === id);
    moliyalar[idx] = { id, tur, summa, tavsif, sana };
    showToast('Tranzaksiya yangilandi!');
  } else {
    const yangi = { id: genId(), tur, summa, tavsif, sana };
    moliyalar.push(yangi);
    showToast('Tranzaksiya qo\'shildi!');
    TG.moliyaQoshildi(yangi);
  }

  DB.set('moliyalar', moliyalar);
  closeModal('moliya-modal');
  renderMoliya();
}

function deleteMoliya(id) {
  if (!confirm('Bu tranzaksiyani o\'chirasizmi?')) return;
  let moliyalar = DB.get('moliyalar');
  moliyalar = moliyalar.filter(m => m.id !== id);
  DB.set('moliyalar', moliyalar);
  showToast('Tranzaksiya o\'chirildi!');
  renderMoliya();
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('[onclick="openModal(\'moliya-modal\')"]');
  if (btn) btn.setAttribute('onclick', 'openMoliyaModal()');

  // Sana defaultini o'rnatish
  const sanaInput = document.getElementById('mo-sana');
  if (sanaInput) sanaInput.value = today();
});
