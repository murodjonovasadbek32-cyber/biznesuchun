// ╔══════════════════════════════════════════════════════════════╗
// ║   EXPORT.JS — PDF va Excel eksport v3.0                    ║
// ╚══════════════════════════════════════════════════════════════╝

// ──────────────────────────────────────────────────────────────
//  EXCEL EKSPORT (SheetJS / CSV fallback)
// ──────────────────────────────────────────────────────────────
async function exportExcel(type = 'mahsulotlar') {
  const data = DB.get(type);
  if (data.length === 0) { showToast('Ma\'lumot yo\'q!', 'warning'); return; }

  // SheetJS mavjud bo'lsa
  if (typeof XLSX !== 'undefined') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.map(row => {
      // Rasmlarni base64 dan qisqartirish
      const clean = { ...row };
      if (clean.rasm && clean.rasm.startsWith('data:')) clean.rasm = '[rasm bor]';
      if (clean.rasmlar) clean.rasmlar = clean.rasmlar.map(u => u.startsWith('data:') ? '[rasm]' : u).join(', ');
      return clean;
    }));
    XLSX.utils.book_append_sheet(wb, ws, type);
    XLSX.writeFile(wb, `BiznesApp_${type}_${today()}.xlsx`);
    showToast('✅ Excel yuklandi!');
  } else {
    // CSV fallback
    _downloadCSV(data, `BiznesApp_${type}_${today()}.csv`);
    showToast('✅ CSV yuklandi!');
  }
}

function _downloadCSV(arr, filename) {
  if (!arr.length) return;
  const keys  = Object.keys(arr[0]).filter(k => k !== 'rasm' && k !== 'rasmlar');
  const header = keys.join(',');
  const rows   = arr.map(row =>
    keys.map(k => {
      const v = String(row[k] ?? '').replace(/"/g, '""');
      return `"${v}"`;
    }).join(',')
  );
  const csv    = '\uFEFF' + [header, ...rows].join('\n');
  const blob   = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link   = document.createElement('a');
  link.href    = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ──────────────────────────────────────────────────────────────
//  PDF EKSPORT (html2pdf / print fallback)
// ──────────────────────────────────────────────────────────────
async function exportPDF(type = 'mahsulotlar') {
  const data = DB.get(type);
  if (data.length === 0) { showToast('Ma\'lumot yo\'q!', 'warning'); return; }

  // html2pdf mavjud bo'lsa
  if (typeof html2pdf !== 'undefined') {
    const html = _buildPDFHtml(type, data);
    const tmp  = document.createElement('div');
    tmp.innerHTML = html;
    document.body.appendChild(tmp);

    await html2pdf().set({
      margin:      [10, 10, 10, 10],
      filename:    `BiznesApp_${type}_${today()}.pdf`,
      image:       { type: 'jpeg', quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF:       { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).from(tmp).save();

    document.body.removeChild(tmp);
    showToast('✅ PDF yuklandi!');
  } else {
    // Print fallback
    _printTable(type, data);
  }
}

function _buildPDFHtml(type, data) {
  const TITLES = {
    mahsulotlar: 'Mahsulotlar / Ombor',
    buyurtmalar: 'Buyurtmalar',
    moliyalar:   'Moliya',
    mijozlar:    'Mijozlar',
  };
  const title = TITLES[type] || type;

  const COLS = {
    mahsulotlar: ['nom','sku','kat','trek','sotuvNarx','miqdor','sana'],
    buyurtmalar: ['raqam','mijozNom','mahsulotNom','miqdor','summa','holat','sana'],
    moliyalar:   ['sana','tur','tavsif','summa'],
    mijozlar:    ['ism','tel','manzil','sana'],
  };
  const cols = COLS[type] || Object.keys(data[0]).filter(k => !['rasm','rasmlar','id'].includes(k));

  const header = cols.map(c => `<th>${c}</th>`).join('');
  const rows   = data.map(row =>
    '<tr>' + cols.map(c => `<td>${row[c] ?? '—'}</td>`).join('') + '</tr>'
  ).join('');

  return `
    <div style="font-family:sans-serif;padding:20px">
      <h2 style="color:#2563EB;margin-bottom:4px">BiznesApp — ${title}</h2>
      <p style="color:#64748b;font-size:12px;margin-bottom:16px">Sana: ${new Date().toLocaleDateString('uz-UZ')} | Jami: ${data.length} ta</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#2563EB;color:white">${header}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function _printTable(type, data) {
  const html = _buildPDFHtml(type, data);
  const win  = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>BiznesApp Export</title>
    <style>
      body { font-family: sans-serif; }
      table { width:100%; border-collapse:collapse; }
      th,td { border:1px solid #ddd; padding:6px 10px; }
      th { background:#2563EB; color:white; }
      tr:nth-child(even){background:#f8fafc}
    </style>
    </head><body>${html}
    <script>window.print(); window.close();<\/script>
    </body></html>`);
}

// ──────────────────────────────────────────────────────────────
//  HISOBOT PDF
// ──────────────────────────────────────────────────────────────
async function exportHisobotPDF() {
  const davr = document.getElementById('hisobot-davr')?.value || 'oy';
  const { start, end } = getDateRange(davr);

  const buyurtmalar = DB.get('buyurtmalar').filter(b => inRange(b.sana, {start,end}));
  const moliyalar   = DB.get('moliyalar').filter(m => inRange(m.sana, {start,end}));

  const kirim  = moliyalar.filter(m=>m.tur==='kirim').reduce((s,m)=>s+Number(m.summa),0);
  const chiqim = moliyalar.filter(m=>m.tur==='chiqim').reduce((s,m)=>s+Number(m.summa),0);

  const html = `
    <div style="font-family:sans-serif;padding:24px;max-width:800px">
      <h2 style="color:#2563EB">📊 BiznesApp Hisobot</h2>
      <p style="color:#64748b">${start.toLocaleDateString('uz-UZ')} — ${end.toLocaleDateString('uz-UZ')}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:16px 0">
        <div style="background:#eff6ff;border-radius:8px;padding:12px">
          <div style="color:#2563EB;font-size:10px">BUYURTMALAR</div>
          <div style="font-size:24px;font-weight:700">${buyurtmalar.length}</div>
        </div>
        <div style="background:#ecfdf5;border-radius:8px;padding:12px">
          <div style="color:#10B981;font-size:10px">KIRIM</div>
          <div style="font-size:18px;font-weight:700">${Number(kirim).toLocaleString()} so'm</div>
        </div>
        <div style="background:${kirim-chiqim>=0?'#ecfdf5':'#fef2f2'};border-radius:8px;padding:12px">
          <div style="color:${kirim-chiqim>=0?'#10B981':'#EF4444'};font-size:10px">SOF FOYDA</div>
          <div style="font-size:18px;font-weight:700">${Number(kirim-chiqim).toLocaleString()} so'm</div>
        </div>
      </div>
      <h3 style="margin-top:20px">Buyurtmalar</h3>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px">
        <thead><tr style="background:#2563EB;color:white">
          <th style="padding:6px">№</th><th>Mijoz</th><th>Mahsulot</th>
          <th>Miqdor</th><th>Summa</th><th>Holat</th><th>Sana</th>
        </tr></thead>
        <tbody>${buyurtmalar.map((b,i)=>`
          <tr style="background:${i%2?'#f8fafc':'white'}">
            <td style="padding:5px 6px">#${b.raqam}</td>
            <td>${b.mijozNom||'—'}</td><td>${b.mahsulotNom||'—'}</td>
            <td>${b.miqdor}</td><td>${Number(b.summa).toLocaleString()}</td>
            <td>${b.holat}</td><td>${b.sana}</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>`;

  if (typeof html2pdf !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = html;
    document.body.appendChild(el);
    await html2pdf().set({
      filename: `Hisobot_${today()}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit:'mm', format:'a4', orientation:'portrait' },
    }).from(el).save();
    document.body.removeChild(el);
    showToast('✅ Hisobot PDF yuklandi!');
  } else {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><body>${html}
      <script>window.print();<\/script></body></html>`);
  }
}

// ──────────────────────────────────────────────────────────────
//  EKSPORT MODAL OCHISH
// ──────────────────────────────────────────────────────────────
function openExportModal() {
  openModal('export-modal');
}

async function runExport(format, type) {
  closeModal('export-modal');
  showToast('⏳ Eksport qilinmoqda...');
  if (format === 'excel') await exportExcel(type);
  if (format === 'pdf')   await exportPDF(type);
  if (format === 'csv')   _downloadCSV(DB.get(type), `BiznesApp_${type}_${today()}.csv`);
}
