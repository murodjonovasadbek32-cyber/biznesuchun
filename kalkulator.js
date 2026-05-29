// ===== NARX KALKULYATORI & UZUM MARKET FOYDA KALKULYATORI =====

// ===== NARX KALKULYATORI =====
// Formula: Yuan × kurs + kargo + komissiya + reklama = Sotuv narxi

function renderNarxKalkulator() {
  hisoblaNarx();
}

function hisoblaNarx() {
  const yuan = parseFloat(document.getElementById('k-yuan')?.value) || 0;
  const kurs = parseFloat(document.getElementById('k-kurs')?.value) || 1820;
  const kargo = parseFloat(document.getElementById('k-kargo')?.value) || 0;
  const komissiya = parseFloat(document.getElementById('k-komissiya')?.value) || 0;
  const reklama = parseFloat(document.getElementById('k-reklama')?.value) || 0;
  const marja = parseFloat(document.getElementById('k-marja')?.value) || 20;
  const miqdor = parseFloat(document.getElementById('k-miqdor')?.value) || 1;

  const xitoyNarx = yuan * kurs;
  const kargoHar = kargo / miqdor;
  const tannarx = xitoyNarx + kargoHar;
  const komissiyaSom = tannarx * (komissiya / 100);
  const reklamaSom = reklama;
  const xarajatlar = tannarx + komissiyaSom + reklamaSom;
  const sotuvNarx = xarajatlar * (1 + marja / 100);
  const sofFoyda = sotuvNarx - xarajatlar;
  const yaxlitlangan = Math.ceil(sotuvNarx / 1000) * 1000;

  // Natijalarni ko'rsatish
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal('k-xitoy-narx', formatMoney(xitoyNarx));
  setVal('k-kargo-har', formatMoney(kargoHar));
  setVal('k-tannarx', formatMoney(tannarx));
  setVal('k-komissiya-som', formatMoney(komissiyaSom));
  setVal('k-reklama-som', formatMoney(reklamaSom));
  setVal('k-jami-xarajat', formatMoney(xarajatlar));
  setVal('k-sotuv-narx', formatMoney(sotuvNarx));
  setVal('k-yaxlitlangan', formatMoney(yaxlitlangan));
  setVal('k-foyda', formatMoney(sofFoyda));
  setVal('k-foyda-foiz', `${marja}%`);

  // Sotuv narxi inputga yozish
  const sotuvInput = document.getElementById('k-sotuv-result');
  if (sotuvInput) sotuvInput.value = Math.round(yaxlitlangan);

  // Progress bar
  const profitPercent = xarajatlar > 0 ? Math.min((sofFoyda / xarajatlar) * 100, 100) : 0;
  const bar = document.getElementById('k-profit-bar');
  if (bar) {
    bar.style.width = profitPercent + '%';
    bar.style.background = profitPercent > 30 ? '#22c55e' : profitPercent > 15 ? '#f97316' : '#ef4444';
  }

  // Savdo narxini mahsulot modaliga ko'chirish
  return Math.round(yaxlitlangan);
}

function narxMahsulotgaKopir() {
  const narx = hisoblaNarx();
  if (!narx) return;
  const input = document.getElementById('m-sotuv-narx');
  if (input) {
    input.value = narx;
    showToast('✅ Narx mahsulot formasiga ko\'chirildi!');
    closeModal('kalkulator-modal');
    openModal('mahsulot-modal');
  } else {
    showToast('Avval mahsulot formasini oching!', 'error');
  }
}

function narxUlashish() {
  const yuan = document.getElementById('k-yuan')?.value || 0;
  const kurs = document.getElementById('k-kurs')?.value || 1820;
  const narx = hisoblaNarx();
  const matn =
    `💰 Narx hisob-kitobi:\n\n` +
    `Yuan: ¥${yuan} × ${Number(kurs).toLocaleString()} so'm\n` +
    `Sotuv narxi: ${formatMoney(narx)}\n\n` +
    `BiznesApp tomonidan hisoblandi`;
  TG.xabar(matn);
  showToast('Telegram ga yuborildi!');
}

// ===== UZUM MARKET FOYDA KALKULYATORI =====
// Har sotuvda: Sotuv narxi - Uzum komissiyasi - Logistika - Reklama = Sof foyda

function hisoblaUzumFoyda() {
  const sotuvNarx = parseFloat(document.getElementById('u-sotuv-narx')?.value) || 0;
  const uzumKomissiya = parseFloat(document.getElementById('u-uzum-komissiya')?.value) || 15;
  const logistika = parseFloat(document.getElementById('u-logistika')?.value) || 0;
  const reklama = parseFloat(document.getElementById('u-reklama')?.value) || 0;
  const tannarx = parseFloat(document.getElementById('u-tannarx')?.value) || 0;
  const miqdor = parseInt(document.getElementById('u-miqdor')?.value) || 1;

  const uzumKomissiyaSom = sotuvNarx * (uzumKomissiya / 100);
  const jami1ta = sotuvNarx - uzumKomissiyaSom - logistika - reklama - tannarx;
  const jamiSotuv = jami1ta * miqdor;
  const jami_xarajat = uzumKomissiyaSom + logistika + reklama + tannarx;
  const foizFoyda = sotuvNarx > 0 ? ((jami1ta / sotuvNarx) * 100).toFixed(1) : 0;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal('u-komissiya-som', formatMoney(uzumKomissiyaSom));
  setVal('u-jami-xarajat', formatMoney(jami_xarajat));
  setVal('u-foyda-1ta', formatMoney(jami1ta));
  setVal('u-foyda-jami', formatMoney(jamiSotuv));
  setVal('u-foyda-foiz', `${foizFoyda}%`);

  // Rang
  const foydaEl = document.getElementById('u-foyda-1ta');
  if (foydaEl) {
    foydaEl.style.color = jami1ta > 0 ? '#22c55e' : '#ef4444';
  }

  // Diagramma
  if (sotuvNarx > 0) {
    const komPercent = (uzumKomissiyaSom / sotuvNarx) * 100;
    const logPercent = (logistika / sotuvNarx) * 100;
    const rekPercent = (reklama / sotuvNarx) * 100;
    const tanPercent = (tannarx / sotuvNarx) * 100;
    const foydaPercent = Math.max(0, (jami1ta / sotuvNarx) * 100);

    const chartEl = document.getElementById('u-chart');
    if (chartEl) {
      chartEl.innerHTML = `
        <div class="u-chart-bar">
          <div style="width:${tanPercent.toFixed(1)}%;background:#6c63ff;height:100%;border-radius:4px 0 0 4px" title="Tannarx: ${tanPercent.toFixed(1)}%"></div>
          <div style="width:${komPercent.toFixed(1)}%;background:#ef4444;height:100%" title="Komissiya: ${komPercent.toFixed(1)}%"></div>
          <div style="width:${logPercent.toFixed(1)}%;background:#f97316;height:100%" title="Logistika: ${logPercent.toFixed(1)}%"></div>
          <div style="width:${rekPercent.toFixed(1)}%;background:#a855f7;height:100%" title="Reklama: ${rekPercent.toFixed(1)}%"></div>
          <div style="width:${foydaPercent.toFixed(1)}%;background:#22c55e;height:100%;border-radius:0 4px 4px 0" title="Foyda: ${foydaPercent.toFixed(1)}%"></div>
        </div>
        <div class="u-chart-legend">
          <span><span style="background:#6c63ff"></span>Tannarx ${tanPercent.toFixed(0)}%</span>
          <span><span style="background:#ef4444"></span>Komissiya ${komPercent.toFixed(0)}%</span>
          <span><span style="background:#f97316"></span>Logistika ${logPercent.toFixed(0)}%</span>
          <span><span style="background:#a855f7"></span>Reklama ${rekPercent.toFixed(0)}%</span>
          <span><span style="background:#22c55e"></span>Foyda ${foydaPercent.toFixed(0)}%</span>
        </div>
      `;
    }
  }

  return { jami1ta, jamiSotuv, foizFoyda };
}

function uzumNatijaTgYuborish() {
  const result = hisoblaUzumFoyda();
  if (!result) return;
  const sotuvNarx = document.getElementById('u-sotuv-narx')?.value || 0;
  const miqdor = document.getElementById('u-miqdor')?.value || 1;
  const matn =
    `📊 <b>Uzum Market Foyda Hisobi</b>\n\n` +
    `💰 Sotuv narxi: ${formatMoney(sotuvNarx)}\n` +
    `📦 Miqdor: ${miqdor} dona\n\n` +
    `💵 1 ta foyda: <b>${formatMoney(result.jami1ta)}</b>\n` +
    `💰 Jami foyda: <b>${formatMoney(result.jamiSotuv)}</b>\n` +
    `📈 Foyda foizi: ${result.foizFoyda}%\n\n` +
    `📅 ${new Date().toLocaleDateString('uz-UZ')}`;
  TG.xabar(matn);
  showToast('Telegram ga yuborildi!');
}

// ===== MODALLARNI OCHISH =====
function openKalkulatorModal() {
  // Mahsulot formidagi yuan/kurs qiymatlarini olish
  const yuan = document.getElementById('m-xitoy-narx')?.value || '';
  if (yuan) document.getElementById('k-yuan').value = yuan;
  openModal('kalkulator-modal');
  hisoblaNarx();
}

function openUzumModal() {
  openModal('uzum-modal');
  hisoblaUzumFoyda();
}
