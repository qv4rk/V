(function () {
  'use strict';

  // Reading Room lives 4 directories deep (apps/webapps/tts/reader/); the
  // PDF path passed to it must therefore be relative to THAT location, not
  // to this page, hence the "../../../../hoffect/..." prefix below.
  const READER_URL = '../apps/webapps/tts/reader/index.html';
  const READER_RELATIVE_PDF_PREFIX = '../../../../hoffect/research/';

  function readerLink(pdfRelativePath, title) {
    const pdfParam = encodeURIComponent(READER_RELATIVE_PDF_PREFIX + pdfRelativePath);
    return `${READER_URL}?pdf=${pdfParam}&title=${encodeURIComponent(title)}`;
  }

  function buildCard(paper) {
    const card = document.createElement('div');
    card.className = 'hf-paper-card';
    const doiLink = paper.doiUrl
      ? `<a href="${paper.doiUrl}" target="_blank" rel="noopener">DOI / Source ↗</a>`
      : '';
    card.innerHTML = `
      <span class="hf-paper-type">${paper.type || ''}</span>
      <h3 class="hf-paper-title">${paper.title}</h3>
      <div class="hf-paper-authors">${paper.authors}</div>
      <div class="hf-paper-cite">${paper.citation}</div>
      <div class="hf-paper-actions">
        <a class="hf-primary" href="${readerLink(paper.file, paper.title)}">🔊 Read Aloud</a>
        <a href="research/${paper.file}" target="_blank" rel="noopener">📄 View PDF</a>
        ${doiLink}
      </div>
    `;
    return card;
  }

  fetch('research/manifest.json')
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => {
      const grid = document.getElementById('libraryGrid');
      grid.innerHTML = '';
      (data.papers || []).forEach(paper => grid.appendChild(buildCard(paper)));
      if (!(data.papers || []).length) {
        grid.innerHTML = '<p class="hf-loading">No papers catalogued yet.</p>';
      }
    })
    .catch(err => {
      const grid = document.getElementById('libraryGrid');
      grid.innerHTML = `<p class="hf-loading">Could not load the research library manifest: ${err.message}</p>`;
    });
})();
