// ===== MIJOZLAR MODULI =====

function renderMijoz(filter = '') {
  const mijozlar = DB.get('mijozlar');
  const buyurtmalar = DB.get('buyurtmalar');
  const tbody = document.getElementById('mijoz-tbody');

  const list = filter
    ? mijozlar.filter(m =>
        m.ism.toLowerCase().includes(filter.toLowerCase()) ||
        (m.tel && m.tel.includes(filter))
      )
    : mijozlar;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Mijoz yo'q. Yangi qo'shing!</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((m, i) => {
    // Mijozning jami xaridi
    const jamiXarid = buyurtmalar
      .filter(b => b.mijozId === m.id && b.holat === 'yetkazildi')
      .reduce((s, b) => s + Number(b.summa), 0);

    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${m.ism}</strong>${m.izoh ? `<br><small style="color:#94a3b8">${m.izoh}</small>` : ''}</td>
        <td><a href="tel:${m.tel}" style="color:var(--primary)">${m.tel}</a></td>
        <td>${m.manzil || '—'}</td>
        <td>${formatMoney(jamiXarid)}</td>
        <td>${formatDate(m.sana)}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editMijoz('${m.id}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteMijoz('${m.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function filterMijoz() {
  const val = document.getElementById('mijoz-search').value;
  renderMijoz(val);
}

function openMijozModal() {
  document.getElementById('mijoz-modal-title').textContent = 'Yangi mijoz';
  document.getElementById('mj-id').value = '';
  document.getElementById('mj-ism').value = '';
  document.getElementById('mj-tel').value = '';
  document.getElementById('mj-manzil').value = '';
  document.getElementById('mj-izoh').value = '';
  openModal('mijoz-modal');
}

function editMijoz(id) {
  const mijozlar = DB.get('mijozlar');
  const m = mijozlar.find(x => x.id === id);
  if (!m) return;

  document.getElementById('mijoz-modal-title').textContent = 'Mijozni tahrirlash';
  document.getElementById('mj-id').value = m.id;
  document.getElementById('mj-ism').value = m.ism;
  document.getElementById('mj-tel').value = m.tel;
  document.getElementById('mj-manzil').value = m.manzil || '';
  document.getElementById('mj-izoh').value = m.izoh || '';
  openModal('mijoz-modal');
}

function saveMijoz() {
  const ism = document.getElementById('mj-ism').value.trim();
  const tel = document.getElementById('mj-tel').value.trim();
  const manzil = document.getElementById('mj-manzil').value.trim();
  const izoh = document.getElementById('mj-izoh').value.trim();

  if (!ism || !tel) {
    showToast('Ism va telefon majburiy!', 'error');
    return;
  }

  const mijozlar = DB.get('mijozlar');
  const id = document.getElementById('mj-id').value;

  if (id) {
    const idx = mijozlar.findIndex(x => x.id === id);
    mijozlar[idx] = { ...mijozlar[idx], ism, tel, manzil, izoh };
    showToast('Mijoz yangilandi!');
  } else {
    mijozlar.push({ id: genId(), ism, tel, manzil, izoh, sana: today() });
    showToast('Yangi mijoz qo\'shildi!');
  }

  DB.set('mijozlar', mijozlar);
  closeModal('mijoz-modal');
  renderMijoz();
}

function deleteMijoz(id) {
  if (!confirm('Ushbu mijozni o\'chirasizmi?')) return;
  let mijozlar = DB.get('mijozlar');
  mijozlar = mijozlar.filter(m => m.id !== id);
  DB.set('mijozlar', mijozlar);
  showToast('Mijoz o\'chirildi!');
  renderMijoz();
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('[onclick="openModal(\'mijoz-modal\')"]');
  if (btn) btn.setAttribute('onclick', 'openMijozModal()');
});
