// ╔══════════════════════════════════════════════════════════════╗
// ║   KALKULATOR.JS — Narx + Uzum Market Foyda v3.0            ║
// ╚══════════════════════════════════════════════════════════════╝

// ─── Joriy kurs (default) ─────────────────────────────────────
let _kurs = Number(localStorage.getItem('yuan_kurs') || 1820);

// ══════════════════════════════════════════════════════════════
//  NARX KALKULYATORI
//  Yuan × kurs + kargo + komissiya + reklama + marja = Sotuv narxi
// ══════════════════════════════════════════════════════════════
function hisoblaNarx() {
  const yuan     = parseFloat(document.getElementById('k-yuan')?.value)       || 0;
  const kurs     = parseFloat(document.getElementById('k-kurs')?.value)       || _kurs;
  const kargo    = parseFloat(document.getElementById('k-kargo')?.value)      || 0;
  const kom      = parseFloat(document.getElementById('k-komissiya')?.value)  || 0;
  const reklama  = parseFloat(document.getElementById('k-reklama')?.value)    || 0;
  const marja    = parseFloat(document.getElementById('k-marja')?.value)      || 20;
  const miqdor   = Math.max(1, parseInt(document.getElementById('k-miqdor')?.value) || 1);

  // Hisoblash
  const xitoy     = yuan * kurs;
  const kargo1    = kargo / miqdor;
  const tannarx   = xitoy + kargo1;
  const komSom    = tannarx * (kom / 100);
  const rekSom    = reklama / miqdor;
  const totalXar  = tannarx + komSom + rekSom;
  const sotuvNarx = totalXar * (1 + marja / 100);
  const yaxlit    = Math.ceil(sotuvNarx / 1000) * 1000;
  const foyda     = yaxlit - totalXar;
  const roi       = totalXar > 0 ? ((foyda / totalXar) * 100).toFixed(1) : 0;

  // Kursni saqlash
  localStorage.setItem('yuan_kurs', kurs);
  _kurs = kurs;

  // Natijalar
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('k-xitoy-narx',   formatMoney(xitoy));
  set('k-kargo-har',    formatMoney(kargo1));
  set('k-tannarx',      formatMoney(tannarx));
  set('k-komissiya-som',formatMoney(komSom));
  set('k-reklama-som',  formatMoney(rekSom));
  set('k-jami-xarajat', formatMoney(totalXar));
  set('k-sotuv-narx',   formatMoney(sotuvNarx));
  set('k-yaxlitlangan', formatMoney(yaxlit));
  set('k-foyda',        formatMoney(foyda));
  set('k-foyda-foiz',   `${roi}% ROI`);

  // Marjani ko'rsatish
  const marjaEl = document.getElementById('k-marja-val');
  if (marjaEl) marjaEl.textContent = marja + '%';

  // Progress bar
  const bar = document.getElementById('k-profit-bar');
  if (bar) {
    const pct = Math.min(Math.max(roi, 0), 100);
    bar.style.width      = pct + '%';
    bar.style.background = roi > 30 ? '#10B981' : roi > 15 ? '#F59E0B' : '#EF4444';
  }

  const resultInput = document.getElementById('k-sotuv-result');
  if (resultInput) resultInput.value = yaxlit;

  return yaxlit;
}

function narxMahsulotgaKopir() {
  const narx = hisoblaNarx();
  const inp  = document.getElementById('m-sotuv-narx');
  if (inp) {
    inp.value = narx;
    // Yuan narxini ham ko'chirish
    const yuan = document.getElementById('k-yuan')?.value;
    const mYuan = document.getElementById('m-xitoy-narx');
    if (yuan && mYuan) mYuan.value = yuan;
    showToast(`✅ Narx ko'chirildi: ${formatMoney(narx)}`);
    closeModal('kalkulator-modal');
  } else {
    showToast('Avval mahsulot formasini oching!', 'error');
  }
}

function narxUlashish() {
  const narx = hisoblaNarx();
  const yuan = document.getElementById('k-yuan')?.value || 0;
  const kurs = document.getElementById('k-kurs')?.value || _kurs;
  TG.xabar(
    `💰 <b>Narx Hisob-kitobi</b>\n\n` +
    `¥${yuan} × ${Number(kurs).toLocaleString()} so'm\n` +
    `Sotuv narxi: <b>${formatMoney(narx)}</b>\n\n` +
    `📅 ${today()}`
  );
  showToast('Telegram ga yuborildi!');
}

function openKalkulatorModal() {
  const yuan = document.getElementById('m-xitoy-narx')?.value;
  if (yuan) {
    const el = document.getElementById('k-yuan');
    if (el) el.value = yuan;
  }
  openModal('kalkulator-modal');
  setTimeout(hisoblaNarx, 50);
}

// ══════════════════════════════════════════════════════════════
//  UZUM MARKET FOYDA KALKULYATORI
// ══════════════════════════════════════════════════════════════
function hisoblaUzumFoyda() {
  const sotuv   = parseFloat(document.getElementById('u-sotuv-narx')?.value)    || 0;
  const uzum    = parseFloat(document.getElementById('u-uzum-komissiya')?.value) || 15;
  const log     = parseFloat(document.getElementById('u-logistika')?.value)      || 0;
  const rek     = parseFloat(document.getElementById('u-reklama')?.value)        || 0;
  const tan     = parseFloat(document.getElementById('u-tannarx')?.value)        || 0;
  const miqdor  = Math.max(1, parseInt(document.getElementById('u-miqdor')?.value) || 1);

  const uzumSom  = sotuv * (uzum / 100);
  const foyda1   = sotuv - uzumSom - log - rek - tan;
  const foydaJami = foyda1 * miqdor;
  const jamiXar  = uzumSom + log + rek + tan;
  const roi      = sotuv > 0 ? ((foyda1 / sotuv) * 100).toFixed(1) : 0;

  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set('u-komissiya-som', formatMoney(uzumSom));
  set('u-jami-xarajat',  formatMoney(jamiXar));
  set('u-foyda-1ta',     formatMoney(foyda1));
  set('u-foyda-jami',    formatMoney(foydaJami));
  set('u-foyda-foiz',    `${roi}%`);

  const foydaEl = document.getElementById('u-foyda-1ta');
  if (foydaEl) foydaEl.style.color = foyda1 >= 0 ? '#10B981' : '#EF4444';

  // Diagramma
  if (sotuv > 0) {
    const tanP = (tan/sotuv*100).toFixed(1);
    const komP = (uzumSom/sotuv*100).toFixed(1);
    const logP = (log/sotuv*100).toFixed(1);
    const rekP = (rek/sotuv*100).toFixed(1);
    const foyP = Math.max(0,(foyda1/sotuv*100)).toFixed(1);

    const chart = document.getElementById('u-chart');
    if (chart) {
      chart.innerHTML = `
        <div class="u-chart-bar">
          <div style="width:${tanP}%;background:#6366f1" title="Tannarx ${tanP}%"></div>
          <div style="width:${komP}%;background:#EF4444" title="Komissiya ${komP}%"></div>
          <div style="width:${logP}%;background:#F59E0B" title="Logistika ${logP}%"></div>
          <div style="width:${rekP}%;background:#a855f7" title="Reklama ${rekP}%"></div>
          <div style="width:${foyP}%;background:#10B981" title="Foyda ${foyP}%"></div>
        </div>
        <div class="u-chart-legend">
          <span><span style="background:#6366f1"></span>Tannarx ${tanP}%</span>
          <span><span style="background:#EF4444"></span>Komissiya ${komP}%</span>
          <span><span style="background:#F59E0B"></span>Logistika ${logP}%</span>
          <span><span style="background:#a855f7"></span>Reklama ${rekP}%</span>
          <span><span style="background:#10B981"></span>Foyda ${foyP}%</span>
        </div>`;
    }
  }

  return { foyda1, foydaJami, roi };
}

function uzumNatijaTgYuborish() {
  const r   = hisoblaUzumFoyda();
  const sotuv  = document.getElementById('u-sotuv-narx')?.value || 0;
  const miqdor = document.getElementById('u-miqdor')?.value || 1;
  TG.xabar(
    `📊 <b>Uzum Market Foyda Hisobi</b>\n\n` +
    `💰 Sotuv narxi: ${formatMoney(sotuv)}\n` +
    `📦 Miqdor: ${miqdor} dona\n\n` +
    `💵 1 ta foyda: <b>${formatMoney(r.foyda1)}</b>\n` +
    `💰 Jami foyda: <b>${formatMoney(r.foydaJami)}</b>\n` +
    `📈 ROI: ${r.roi}%\n\n` +
    `📅 ${today()}`
  );
  showToast('Telegram ga yuborildi!');
}

function openUzumModal() {
  openModal('uzum-modal');
  setTimeout(hisoblaUzumFoyda, 50);
}

function switchKalkTab(tab, btn) {
  document.querySelectorAll('.kalk-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('kalk-narx-tab').style.display = tab === 'narx' ? '' : 'none';
  document.getElementById('kalk-uzum-tab').style.display = tab === 'uzum' ? '' : 'none';
  if (tab === 'narx') hisoblaNarx();
  if (tab === 'uzum') hisoblaUzumFoyda();
}
