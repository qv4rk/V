/* ─────────────────────────────────────────────────────────────
   EIGENSTATE ROLL — PDF export
   Builds a multi-page, illustrated reading using jsPDF (loaded from
   CDN in index.html as window.jspdf.jsPDF). Cover, summary, one page
   per facet (full text + quantum overlay + cultural echo), the Vector
   Map, private notes, and a footer on every page.
   ───────────────────────────────────────────────────────────── */

window.ER = window.ER || {};

(function (ER) {
  'use strict';

  const INK = [200, 210, 224];
  const DIM = [110, 118, 138];
  const CYAN = [0, 200, 220];
  const MAGENTA = [150, 30, 200];
  const BG = [7, 7, 16];

  function svgToPngDataUrl(svgEl, w, h) {
    return new Promise((resolve, reject) => {
      const clone = svgEl.cloneNode(true);
      clone.setAttribute('width', w);
      clone.setAttribute('height', h);
      const xml = new XMLSerializer().serializeToString(clone);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#07070f';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;base64,' + svg64;
    });
  }

  function pageChrome(doc, pageW, pageH) {
    doc.setFillColor(...BG);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setDrawColor(...CYAN);
    doc.setLineWidth(0.3);
    doc.rect(6, 6, pageW - 12, pageH - 12);
    doc.setFontSize(7);
    doc.setTextColor(...DIM);
    doc.text('FEISTTECH · EIGENSTATE ROLL', 10, pageH - 8);
    doc.text('THE THREADS ARE LISTENING', pageW - 10, pageH - 8, { align: 'right' });
  }

  function wrapText(doc, text, x, y, maxWidth, lineHeight) {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  ER.exportPdf = async function (reading, uiRefs) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF engine is still loading — try again in a moment.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    /* ── Cover ── */
    pageChrome(doc, W, H);
    doc.setDrawColor(...MAGENTA);
    for (let r = 20; r < 90; r += 14) {
      doc.setLineWidth(0.2);
      doc.circle(W / 2, 60, r * 0.28, 'S');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(...CYAN);
    doc.text('EIGENSTATE ROLL', W / 2, 66, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...DIM);
    doc.text('Quantum Dicemancy for the Modern Seeker', W / 2, 74, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(...INK);
    let y = 110;
    doc.setFont('helvetica', 'bold'); doc.text('Seeker', W / 2, y, { align: 'center' }); doc.setFont('helvetica', 'normal');
    y += 6; doc.text(reading.clientName || 'Anonymous Seeker', W / 2, y, { align: 'center' });
    y += 10;
    doc.setFont('helvetica', 'bold'); doc.text('Session Intent', W / 2, y, { align: 'center' }); doc.setFont('helvetica', 'normal');
    y += 6;
    y = wrapText(doc, reading.question || '(no question recorded)', W / 2 - 70, y, 140, 5.5);
    y += 6;
    doc.setFont('helvetica', 'bold'); doc.text('Date', W / 2, y, { align: 'center' }); doc.setFont('helvetica', 'normal');
    y += 6; doc.text(reading.dateStr || new Date().toLocaleDateString(), W / 2, y, { align: 'center' });

    if (reading.headline) {
      doc.setFontSize(13);
      doc.setTextColor(...MAGENTA);
      wrapText(doc, `"${reading.headline}"`, W / 2 - 75, H - 46, 150, 6);
    }

    /* ── Summary ── */
    doc.addPage();
    pageChrome(doc, W, H);
    doc.setFontSize(18); doc.setTextColor(...CYAN); doc.setFont('helvetica', 'bold');
    doc.text('The Summary Grid', 14, 20);
    doc.setFont('helvetica', 'normal');
    let sy = 30;
    const order = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
    order.forEach((key) => {
      const def = ER.DICE_DEFINITIONS[key];
      const val = reading.rolls[key];
      const face = def.faces[val];
      if (!face) return;
      doc.setDrawColor(...DIM); doc.setLineWidth(0.15);
      doc.line(14, sy + 2, W - 14, sy + 2);
      doc.setFontSize(11); doc.setTextColor(...CYAN);
      doc.text(`${def.label} — d${def.sides} rolled ${val}`, 14, sy + 8);
      doc.setFontSize(10); doc.setTextColor(...INK);
      doc.text(`${face.name}${face.keyword ? ' · ' + face.keyword : ''}`, 14, sy + 14);
      sy = wrapText(doc, face.text, 14, sy + 20, W - 28, 5) + 4;
      if (sy > H - 30) { doc.addPage(); pageChrome(doc, W, H); sy = 20; }
    });

    /* ── Per-facet detail pages ── */
    for (const key of order) {
      const def = ER.DICE_DEFINITIONS[key];
      const val = reading.rolls[key];
      const face = def.faces[val];
      if (!face) continue;
      doc.addPage();
      pageChrome(doc, W, H);
      doc.setFontSize(20); doc.setTextColor(...CYAN); doc.setFont('helvetica', 'bold');
      doc.text(`${def.label} — ${face.name}`, 14, 22);
      doc.setFontSize(11); doc.setTextColor(...DIM); doc.setFont('helvetica', 'normal');
      doc.text(`d${def.sides} rolled ${val} · ${face.keyword || ''}`, 14, 29);

      let py = 40;
      doc.setFontSize(10); doc.setTextColor(...INK);
      py = wrapText(doc, face.text, 14, py, W - 28, 5.4) + 8;

      doc.setFontSize(11); doc.setTextColor(...MAGENTA); doc.setFont('helvetica', 'bold');
      doc.text('Quantum Vector Overlay', 14, py); py += 6;
      doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(...INK);
      py = wrapText(doc, face.overlay, 14, py, W - 28, 5.4) + 8;

      if (face.echo) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...CYAN);
        doc.text('Cultural Echo', 14, py); py += 6;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...DIM);
        const termLine = (face.echo.terms || []).map(t => `${t.script} (${t.translit}, ${t.lang})`).join('  ·  ');
        if (termLine) py = wrapText(doc, termLine, 14, py, W - 28, 5) + 4;
        doc.setFontSize(10); doc.setTextColor(...INK);
        py = wrapText(doc, face.echo.note, 14, py, W - 28, 5.2) + 4;
      }
    }

    /* ── Vector Map ── */
    if (uiRefs && uiRefs.loshuSvg && uiRefs.templumSvg) {
      try {
        const [loshuPng, templumPng] = await Promise.all([
          svgToPngDataUrl(uiRefs.loshuSvg, 600, 600),
          svgToPngDataUrl(uiRefs.templumSvg, 600, 600)
        ]);
        doc.addPage();
        pageChrome(doc, W, H);
        doc.setFontSize(18); doc.setTextColor(...CYAN); doc.setFont('helvetica', 'bold');
        doc.text('The Living Vector Map', 14, 20);
        doc.addImage(loshuPng, 'PNG', 14, 28, 85, 85);
        doc.addImage(templumPng, 'PNG', 110, 28, 85, 85);
        doc.setFontSize(9); doc.setTextColor(...DIM); doc.setFont('helvetica', 'normal');
        doc.text('Lo Shu Square', 56, 118, { align: 'center' });
        doc.text('Etruscan Templum', 152, 118, { align: 'center' });
      } catch (e) {
        console.warn('Eigenstate Roll: vector map rasterization skipped', e);
      }
    }

    /* ── Notes ── */
    doc.addPage();
    pageChrome(doc, W, H);
    doc.setFontSize(18); doc.setTextColor(...CYAN); doc.setFont('helvetica', 'bold');
    doc.text('Private Notes', 14, 20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...INK);
    wrapText(doc, reading.notes || '(no notes recorded for this session)', 14, 32, W - 28, 5.4);

    const filenameSafe = (reading.clientName || 'seeker').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    doc.save(`eigenstate-roll-${filenameSafe}-${(reading.dateStr || '').replace(/[^0-9a-z]+/gi, '-') || 'reading'}.pdf`);
  };

})(window.ER);
