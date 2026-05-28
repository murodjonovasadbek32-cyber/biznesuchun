// ===== HISOBOTLAR MODULI =====

function getDateRange(davr) {
  const now = new Date();
  const start = new Date();

  if (davr === 'kun') {
    start.setHours(0, 0, 0, 0);
  } else if (davr === 'hafta') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
  } else if (davr === 'oy') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (davr === 'yil') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end: now };
}

function inRange(dateStr, range) {
  const d = new Date(dateStr);
  return d >= range.start && d <= range.end;
}

function renderHisobot() {
  const davr = document.getElementById('hisobot-davr').value;
  const range = getDateRange(davr);

  const buyurtmalar = DB.get('buyurtmalar');
  const moliyalar = DB.get('moliyalar');

  // Statistika
  const filteredBuyurtma = buyurtmalar.filter(b => inRange(b.sana, range));
  const filteredMoliya = moliyalar.filter(m => inRange(m.sana, range));

  const kirim = filteredMoliya.filter(m => m.tur === 'kirim').reduce((s, m) => s + Number(m.summa), 0);
  const chiqim = filteredMoliya.filter(m => m.tur === 'chiqim').reduce((s, m) => s + Number(m.summa), 0);

  document.getElementById('h-buyurtma').textContent = filteredBuyurtma.length;
  document.getElementById('h-kirim').textContent = formatMoney(kirim);
  document.getElementById('h-chiqim').textContent = formatMoney(chiqim);
  document.getElementById('h-foyda').textContent = formatMoney(kirim - chiqim);

  // Top mahsulotlar
  const mahsulotHisobi = {};
  filteredBuyurtma.forEach(b => {
    if (!b.mahsulotNom) return;
    if (!mahsulotHisobi[b.mahsulotNom]) mahsulotHisobi[b.mahsulotNom] = 0;
    mahsulotHisobi[b.mahsulotNom] += Number(b.miqdor);
  });

  const topMahsulot = Object.entries(mahsulotHisobi)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topMEl = document.getElementById('top-mahsulot');
  if (topMahsulot.length === 0) {
    topMEl.innerHTML = '<p class="empty">Ma\'lumot yo\'q</p>';
  } else {
    topMEl.innerHTML = topMahsulot.map(([nom, miqdor], i) =>
      `<div class="top-list-item">
        <span><span class="top-num">${i + 1}</span>${nom}</span>
        <span><strong>${miqdor}</strong> dona</span>
      </div>`
    ).join('');
  }

  // Top mijozlar
  const mijozHisobi = {};
  filteredBuyurtma.forEach(b => {
    if (!b.mijozNom) return;
    if (!mijozHisobi[b.mijozNom]) mijozHisobi[b.mijozNom] = 0;
    mijozHisobi[b.mijozNom] += Number(b.summa);
  });

  const topMijoz = Object.entries(mijozHisobi)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topMijEl = document.getElementById('top-mijoz');
  if (topMijoz.length === 0) {
    topMijEl.innerHTML = '<p class="empty">Ma\'lumot yo\'q</p>';
  } else {
    topMijEl.innerHTML = topMijoz.map(([nom, summa], i) =>
      `<div class="top-list-item">
        <span><span class="top-num">${i + 1}</span>${nom}</span>
        <span><strong>${formatMoney(summa)}</strong></span>
      </div>`
    ).join('');
  }
}
