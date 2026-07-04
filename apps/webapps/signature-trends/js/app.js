(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  // Presets are entirely user-authored and stored locally — nothing is
  // pre-populated or shipped in this file. Save the terms/geo/category/
  // dates on any panel with "+ Save Active Panel as Preset" and they'll
  // show up in the dropdown next time, the same way the Reader's save
  // slots work.
  // ═══════════════════════════════════════════════════════════════════
  const PRESETS_KEY = 'feisttech_trends_presets';

  function getPresets() {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function savePresets(list) {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function exportPresets() {
    const presets = getPresets();
    if (presets.length === 0) { alert('No presets saved yet — nothing to export.'); return; }
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signature-trends-presets.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function validateImportedPreset(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (typeof raw.name !== 'string' || !raw.name.trim()) return null;
    if (!Array.isArray(raw.termGroups)) return null;

    const termGroups = raw.termGroups
      .map(g => ({
        label: (g && typeof g.label === 'string') ? g.label : 'Terms',
        terms: (g && Array.isArray(g.terms))
          ? g.terms.filter(t => typeof t === 'string' && t.trim()).slice(0, MAX_TERMS)
          : []
      }))
      .filter(g => g.terms.length > 0);
    if (termGroups.length === 0) return null;

    const geo = typeof raw.geo === 'string' ? raw.geo : '';
    const geoMatch = GEO_DATA.find(g => g.code === geo);
    const cat = (typeof raw.cat === 'string' || typeof raw.cat === 'number') ? String(raw.cat) : '0';
    const catMatch = CATEGORY_DATA.find(c => c.code === cat);

    return {
      id: 'preset_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      name: raw.name.trim(),
      createdAt: Date.now(),
      termGroups,
      geo,
      geoLabel: typeof raw.geoLabel === 'string' ? raw.geoLabel : (geoMatch ? geoMatch.label : (geo || 'Worldwide')),
      cat,
      catLabel: typeof raw.catLabel === 'string' ? raw.catLabel : (catMatch ? catMatch.label : 'All categories'),
      gprop: typeof raw.gprop === 'string' ? raw.gprop : '',
      startDate: typeof raw.startDate === 'string' ? raw.startDate : '',
      endDate: typeof raw.endDate === 'string' ? raw.endDate : ''
    };
  }

  function importPresetsFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); }
      catch (e) { alert('That file is not valid JSON. Check Help for the expected format.'); return; }
      const list = Array.isArray(data) ? data : [data];
      const valid = list.map(validateImportedPreset).filter(Boolean);
      if (valid.length === 0) { alert('No valid presets found in that file. Check Help for the expected format.'); return; }
      const presets = getPresets();
      valid.forEach(p => presets.unshift(p));
      savePresets(presets);
      populatePresetSelect();
      alert(`Imported ${valid.length} preset${valid.length === 1 ? '' : 's'}.`);
    };
    reader.onerror = () => alert('Could not read that file.');
    reader.readAsText(file);
  }

  function loadFileToPanel(file, panel) {
    if (!panel) { alert('No panel found — hover a panel before choosing a file.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); }
      catch (e) { alert('That file is not valid JSON. Check Help for the expected format.'); return; }
      const list = Array.isArray(data) ? data : [data];
      const preset = list.map(validateImportedPreset).find(Boolean);
      if (!preset) { alert('That file doesn\'t match the expected preset format. Check Help for the expected format.'); return; }
      applyPresetToPanel(panel, preset, preset.termGroups[0].terms);
      panel.style.transition = 'box-shadow 0.2s';
      panel.style.boxShadow = '0 0 0 3px rgba(111,174,127,0.4)';
      setTimeout(() => panel.style.boxShadow = '', 900);
    };
    reader.onerror = () => alert('Could not read that file.');
    reader.readAsText(file);
  }

  // Full official Google Trends location + category lists, loaded from
  // js/geo-data.js and js/category-data.js.
  const GEO_DATA = (window.SIGTRENDS_GEOS || []).map(g => ({ code: g.code, label: g.label }));
  const CATEGORY_DATA = (window.SIGTRENDS_CATEGORIES || []).map(c => ({ code: String(c.id), label: c.label }));

  const TYPES = [
    ['', 'Web Search'],
    ['news', 'News'],
    ['images', 'Images'],
    ['froogle', 'Shopping'],
    ['youtube', 'YouTube'],
  ];

  const MAX_TERMS = 5;
  const PANEL_COUNT = 5;
  const MAX_COMBO_RESULTS = 40;

  let currentPreset = null;

  function optionsHtml(list, selected) {
    return list.map(([v, l]) =>
      `<option value="${v}" ${v === selected ? 'selected' : ''}>${l}</option>`
    ).join('');
  }

  // "Active panel" is whichever panel the mouse is currently over, falling
  // back to whichever panel was last focused/clicked into — hover alone
  // breaks the moment the mouse moves to click a preset-bar button, which
  // sits outside every .panel element.
  let lastFocusedPanel = null;
  document.addEventListener('focusin', e => {
    const panel = e.target.closest && e.target.closest('.panel');
    if (panel) lastFocusedPanel = panel;
  });
  document.addEventListener('mousedown', e => {
    const panel = e.target.closest && e.target.closest('.panel');
    if (panel) lastFocusedPanel = panel;
  });

  function activePanel() {
    return document.querySelector('.panel:hover') || lastFocusedPanel || document.querySelector('.panel');
  }

  // ── Searchable combobox (location + category pickers) ──
  function createCombobox({ input, hiddenInput, list, data, allowCustom, onChange }) {
    let filtered = [];

    function render(query) {
      const q = query.trim().toLowerCase();
      filtered = (q
        ? data.filter(d => d.label.toLowerCase().includes(q))
        : data
      ).slice(0, MAX_COMBO_RESULTS);

      list.innerHTML = '';
      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'combo-empty';
        empty.textContent = allowCustom ? 'No match — press Enter to use the typed code as-is.' : 'No match.';
        list.appendChild(empty);
      } else {
        filtered.forEach(item => {
          const opt = document.createElement('div');
          opt.className = 'combo-option';
          opt.textContent = item.label;
          opt.addEventListener('mousedown', e => { e.preventDefault(); select(item); });
          list.appendChild(opt);
        });
      }
      list.hidden = false;
    }

    function select(item) {
      input.value = item.label;
      hiddenInput.value = item.code;
      list.hidden = true;
      if (onChange) onChange(item.code, item.label);
    }

    input.addEventListener('focus', () => render(input.value));
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('blur', () => setTimeout(() => { list.hidden = true; }, 120));
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { list.hidden = true; return; }
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const typed = input.value.trim();
      const exact = filtered.find(f => f.label.toLowerCase() === typed.toLowerCase());
      if (exact) select(exact);
      else if (filtered.length > 0) select(filtered[0]);
      else if (allowCustom && typed) select({ code: typed, label: typed });
    });

    return {
      setValue(code, label) {
        hiddenInput.value = code || '';
        input.value = label || '';
      }
    };
  }

  // ── Preset dropdown ──
  function populatePresetSelect() {
    const sel = document.getElementById('presetSelect');
    const presets = getPresets();
    sel.innerHTML = presets.length
      ? '<option value="">— Select a preset —</option>'
      : '<option value="">— No presets saved yet —</option>';
    presets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }

  function updatePresetInfo() {
    const infoDiv = document.getElementById('presetInfo');
    const termSel = document.getElementById('presetTermSelector');
    if (!currentPreset) {
      infoDiv.innerHTML = '';
      if (termSel) termSel.style.display = 'none';
      return;
    }
    const termCount = currentPreset.termGroups.reduce((n, g) => n + g.terms.length, 0);
    infoDiv.innerHTML = `
      <strong>${currentPreset.name}</strong><br>
      ${currentPreset.termGroups.length} term group${currentPreset.termGroups.length === 1 ? '' : 's'} · ${termCount} term${termCount === 1 ? '' : 's'} · saved ${new Date(currentPreset.createdAt).toLocaleDateString()}
    `;
    if (termSel && currentPreset.termGroups.length > 1) {
      termSel.style.display = 'block';
      populatePresetTermCheckboxes();
    } else if (termSel) {
      termSel.style.display = 'none';
    }
  }

  function populatePresetTermCheckboxes() {
    const container = document.getElementById('presetTermCheckboxes');
    if (!container || !currentPreset) return;
    container.innerHTML = '';
    const allTerms = new Set();
    currentPreset.termGroups.forEach(g => g.terms.forEach(t => allTerms.add(t)));
    allTerms.forEach(term => {
      const label = document.createElement('label');
      label.style.cssText = 'display:flex; align-items:center; gap:4px; font-size:0.72rem; cursor:pointer; white-space:nowrap;';
      label.innerHTML = `
        <input type="checkbox" value="${term.replace(/"/g, '&quot;')}" checked>
        <span>${term}</span>
      `;
      container.appendChild(label);
    });
  }

  function addSelectedPresetTermsToActivePanel() {
    if (!currentPreset) return;
    const panel = activePanel();
    if (!panel) { alert('No active panel found.'); return; }
    const checked = Array.from(document.querySelectorAll('#presetTermCheckboxes input:checked')).map(i => i.value);
    if (checked.length === 0) { alert('No terms selected.'); return; }
    const list = panel.querySelector('.termsList');
    const currentCount = list.children.length;
    checked.slice(0, MAX_TERMS - currentCount).forEach(t => {
      const exists = Array.from(list.querySelectorAll('.termInput')).some(inp => inp.value.trim() === t);
      if (!exists) addTermRow(panel, t);
    });
    savePanelState(panel);
  }

  // ── Save / load / delete presets ──
  function saveActivePanelAsPreset() {
    const panel = activePanel();
    if (!panel) return;
    const terms = Array.from(panel.querySelectorAll('.termInput')).map(i => i.value.trim()).filter(Boolean);
    if (terms.length === 0) { alert('Add at least one term to this panel before saving it as a preset.'); return; }
    const name = prompt('Name this preset:', '');
    if (!name || !name.trim()) return;

    const preset = {
      id: 'preset_' + Date.now().toString(36),
      name: name.trim(),
      createdAt: Date.now(),
      termGroups: [{ label: 'Terms', terms }],
      geo: panel.querySelector('.geoValue').value,
      geoLabel: panel.querySelector('.geoInput').value,
      cat: panel.querySelector('.catValue').value,
      catLabel: panel.querySelector('.catInput').value,
      gprop: panel.querySelector('.typeSelect').value,
      startDate: panel.querySelector('.startDate').value.trim(),
      endDate: panel.querySelector('.endDate').value.trim()
    };
    const presets = getPresets();
    presets.unshift(preset);
    savePresets(presets);
    populatePresetSelect();
    document.getElementById('presetSelect').value = preset.id;
    currentPreset = preset;
    updatePresetInfo();
  }

  function deleteCurrentPreset() {
    if (!currentPreset) { alert('Select a preset to delete first.'); return; }
    if (!confirm(`Delete preset "${currentPreset.name}"?`)) return;
    const presets = getPresets().filter(p => p.id !== currentPreset.id);
    savePresets(presets);
    currentPreset = null;
    populatePresetSelect();
    updatePresetInfo();
  }

  function applyPresetToPanel(panel, preset, terms) {
    const list = panel.querySelector('.termsList');
    list.innerHTML = '';
    terms.forEach(t => addTermRow(panel, t));

    if (preset.geo !== undefined) {
      panel.querySelector('.geoValue').value = preset.geo;
      panel.querySelector('.geoInput').value = preset.geoLabel || preset.geo || '';
    }
    if (preset.cat !== undefined) {
      panel.querySelector('.catValue').value = preset.cat;
      panel.querySelector('.catInput').value = preset.catLabel || 'All categories';
    }
    if (preset.gprop !== undefined) panel.querySelector('.typeSelect').value = preset.gprop;
    if (preset.startDate) panel.querySelector('.startDate').value = preset.startDate;
    if (preset.endDate) panel.querySelector('.endDate').value = preset.endDate;
    savePanelState(panel);
  }

  function loadPresetIntoActivePanel() {
    if (!currentPreset) { alert('Select a preset first.'); return; }
    const panel = activePanel();
    if (!panel) return;
    applyPresetToPanel(panel, currentPreset, currentPreset.termGroups[0].terms);
    panel.style.transition = 'box-shadow 0.2s';
    panel.style.boxShadow = '0 0 0 3px rgba(111,174,127,0.4)';
    setTimeout(() => panel.style.boxShadow = '', 900);
  }

  function loadPresetAcrossAllPanels() {
    if (!currentPreset) { alert('Select a preset first.'); return; }
    const panels = Array.from(document.querySelectorAll('.panel'));
    panels.forEach(p => {
      p.querySelector('.termsList').innerHTML = '';
      p.querySelector('.startDate').value = '';
      p.querySelector('.endDate').value = '';
    });

    let panelIdx = 0;
    currentPreset.termGroups.forEach(group => {
      if (panelIdx >= panels.length) return;
      applyPresetToPanel(panels[panelIdx], currentPreset, group.terms.slice(0, MAX_TERMS));
      panelIdx++;
    });

    while (panelIdx < panels.length) {
      addTermRow(panels[panelIdx]);
      panelIdx++;
    }
  }

  // ── Panel state persistence (per-panel, independent of presets) ──
  function getPanelKey(panel) {
    return `feisttech_signature_panel_${panel.dataset.index}`;
  }

  function savePanelState(panel) {
    const terms = Array.from(panel.querySelectorAll('.termInput')).map(i => i.value.trim()).filter(Boolean);
    const state = {
      terms,
      geo: panel.querySelector('.geoValue').value,
      geoLabel: panel.querySelector('.geoInput').value,
      cat: panel.querySelector('.catValue').value,
      catLabel: panel.querySelector('.catInput').value,
      gprop: panel.querySelector('.typeSelect').value,
      startDate: panel.querySelector('.startDate').value.trim(),
      endDate: panel.querySelector('.endDate').value.trim()
    };
    try { localStorage.setItem(getPanelKey(panel), JSON.stringify(state)); } catch(e){}
  }

  function restorePanelState(panel) {
    try {
      const saved = localStorage.getItem(getPanelKey(panel));
      if (!saved) return false;
      const state = JSON.parse(saved);
      panel.querySelector('.geoValue').value = state.geo || '';
      panel.querySelector('.geoInput').value = state.geoLabel || '';
      panel.querySelector('.catValue').value = state.cat || '0';
      panel.querySelector('.catInput').value = state.catLabel || 'All categories';
      panel.querySelector('.typeSelect').value = state.gprop || '';
      panel.querySelector('.startDate').value = state.startDate || '';
      panel.querySelector('.endDate').value = state.endDate || '';
      const list = panel.querySelector('.termsList');
      list.innerHTML = '';
      if (state.terms && state.terms.length > 0) {
        state.terms.forEach(t => addTermRow(panel, t));
      } else {
        addTermRow(panel);
      }
      return true;
    } catch(e) { return false; }
  }

  function addTermRow(panel, value = '') {
    const list = panel.querySelector('.termsList');
    if (list.children.length >= MAX_TERMS) return;
    const row = document.createElement('div');
    row.className = 'termGroup';
    row.innerHTML = `
      <input type="text" class="termInput" placeholder="exact phrase term" value="${value.replace(/"/g, '&quot;')}">
      <button class="removeTerm" type="button" title="Remove">×</button>
    `;
    const removeBtn = row.querySelector('.removeTerm');
    removeBtn.addEventListener('click', () => {
      row.remove();
      savePanelState(panel);
    });
    list.appendChild(row);
    const input = row.querySelector('.termInput');
    input.addEventListener('input', () => savePanelState(panel));
  }

  function setupDateInput(input, panel) {
    input.addEventListener('input', () => {
      let val = input.value.replace(/[^0-9]/g, '').slice(0, 8);
      if (val.length > 4) val = val.slice(0,4) + '-' + val.slice(4);
      if (val.length > 7) val = val.slice(0,7) + '-' + val.slice(7);
      if (input.value !== val) {
        input.value = val;
      }
      savePanelState(panel);
    });
  }

  function applyDatePreset(panel, preset, baseDate = null) {
    const startIn = panel.querySelector('.startDate');
    const endIn = panel.querySelector('.endDate');
    let end = baseDate ? new Date(baseDate) : new Date();
    let start = new Date(end.getTime());
    if (preset === '7d') start.setDate(start.getDate() - 7);
    else if (preset === '30d') start.setDate(start.getDate() - 30);
    else if (preset === '90d') start.setDate(start.getDate() - 90);
    else if (preset === '6mo') start.setMonth(start.getMonth() - 6);
    else if (preset === '1y') start.setFullYear(start.getFullYear() - 1);
    else if (preset === 'saved' && currentPreset && currentPreset.startDate) {
      startIn.value = currentPreset.startDate;
      endIn.value = currentPreset.endDate || '';
      savePanelState(panel);
      return;
    }
    const fmt = d => d.toISOString().slice(0,10);
    startIn.value = fmt(start);
    endIn.value = fmt(end);
    savePanelState(panel);
  }

  function buildPanel(index) {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.dataset.index = index;
    panel.innerHTML = `
      <div class="panel-title">Panel ${index + 1}</div>
      <div class="termsList"></div>
      <button class="addTerm" type="button">+ term</button>

      <div class="formRow" style="margin-top:0.6rem">
        <div class="combo geoCombo">
          <input type="text" class="combo-input geoInput" placeholder="Location — type to search" autocomplete="off">
          <input type="hidden" class="geoValue" value="">
          <div class="combo-list" hidden></div>
        </div>
        <div class="combo catCombo">
          <input type="text" class="combo-input catInput" placeholder="Category (optional)" autocomplete="off" value="All categories">
          <input type="hidden" class="catValue" value="0">
          <div class="combo-list" hidden></div>
        </div>
        <select class="typeSelect">${optionsHtml(TYPES, '')}</select>
      </div>

      <div class="formRow dateRow">
        <input type="text" class="startDate" placeholder="start YYYY-MM-DD" inputmode="numeric">
        <input type="text" class="endDate" placeholder="end YYYY-MM-DD" inputmode="numeric">
      </div>

      <div class="presets">
        <span>Quick:</span>
        <button type="button" class="presetBtn" data-preset="7d">7d</button>
        <button type="button" class="presetBtn" data-preset="30d">30d</button>
        <button type="button" class="presetBtn" data-preset="90d">90d</button>
        <button type="button" class="presetBtn" data-preset="6mo">6mo</button>
        <button type="button" class="presetBtn" data-preset="saved">Saved preset's window</button>
        <button type="button" class="clearDates" style="margin-left:0.4rem; font-size:0.62rem; padding:2px 6px; border-color:color-mix(in srgb, var(--hot) 40%, transparent); color:var(--hot);">Clear dates</button>
      </div>

      <div class="panelControls">
        <button class="load" type="button">Load</button>
        <button class="clear" type="button">Clear Embed</button>
      </div>

      <div class="embedHost"><span class="placeholder">No data loaded yet.<br>Enter terms or load a saved preset.</span></div>
      <div class="hint">Exact phrase matching · Max 5 terms per panel</div>
    `;
    return panel;
  }

  function wirePanel(panel) {
    const geoCombo = createCombobox({
      input: panel.querySelector('.geoInput'),
      hiddenInput: panel.querySelector('.geoValue'),
      list: panel.querySelector('.geoCombo .combo-list'),
      data: GEO_DATA,
      allowCustom: true,
      onChange: () => savePanelState(panel)
    });
    const catCombo = createCombobox({
      input: panel.querySelector('.catInput'),
      hiddenInput: panel.querySelector('.catValue'),
      list: panel.querySelector('.catCombo .combo-list'),
      data: CATEGORY_DATA,
      allowCustom: false,
      onChange: () => savePanelState(panel)
    });
    panel._geoCombo = geoCombo;
    panel._catCombo = catCombo;

    restorePanelState(panel);
    const list = panel.querySelector('.termsList');
    if (list.children.length === 0) addTermRow(panel);
    if (!panel.querySelector('.catInput').value) panel.querySelector('.catInput').value = 'All categories';

    panel.addEventListener('input', e => {
      if (e.target.classList.contains('termInput') || e.target.classList.contains('startDate') || e.target.classList.contains('endDate')) {
        savePanelState(panel);
      }
    });
    panel.addEventListener('change', e => {
      if (e.target.classList.contains('typeSelect')) savePanelState(panel);
    });

    panel.querySelector('.addTerm').addEventListener('click', () => {
      addTermRow(panel);
      savePanelState(panel);
    });

    setupDateInput(panel.querySelector('.startDate'), panel);
    setupDateInput(panel.querySelector('.endDate'), panel);

    panel.querySelectorAll('.presetBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyDatePreset(panel, btn.dataset.preset);
      });
    });
    panel.querySelector('.clearDates').addEventListener('click', () => {
      panel.querySelector('.startDate').value = '';
      panel.querySelector('.endDate').value = '';
      savePanelState(panel);
    });

    panel.querySelector('.load').addEventListener('click', () => loadPanel(panel));
    panel.querySelector('.clear').addEventListener('click', () => {
      const host = panel.querySelector('.embedHost');
      host.innerHTML = '<span class="placeholder">Embed cleared.</span>';
    });
  }

  function loadPanel(panel) {
    const terms = Array.from(panel.querySelectorAll('.termInput'))
      .map(i => i.value.trim()).filter(Boolean).slice(0, MAX_TERMS);
    if (terms.length === 0) { alert('Enter at least one term.'); return; }

    const geo = panel.querySelector('.geoValue').value;
    const cat = parseInt(panel.querySelector('.catValue').value, 10) || 0;
    const gprop = panel.querySelector('.typeSelect').value;
    const start = panel.querySelector('.startDate').value.trim();
    const end = panel.querySelector('.endDate').value.trim();
    const time = (start && end) ? `${start} ${end}` : undefined;

    const host = panel.querySelector('.embedHost');
    const hostId = `embed-host-${panel.dataset.index}-${Date.now()}`;

    const exploreQuery =
      `q=${terms.map(t => encodeURIComponent(`"${t}"`)).join(',')}` +
      (gprop ? `&gprop=${encodeURIComponent(gprop)}` : '') +
      (cat ? `&cat=${cat}` : '') +
      (time ? `&date=${encodeURIComponent(time)}` : '') +
      (geo ? `&geo=${encodeURIComponent(geo)}` : '') +
      `&hl=en-US`;
    const fullUrl = `https://trends.google.com/trends/explore?${exploreQuery}`;

    host.innerHTML = `
      <div style="padding:0.6rem; background:var(--bg); border-radius:6px; margin-bottom:0.5rem; font-size:0.72rem;">
        <div style="color:var(--ink-dim); margin-bottom:0.25rem;">Full Google Trends URL (copy or open with all params):</div>
        <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
          <a href="${fullUrl}" target="_blank" class="trendLink" style="flex:1; word-break:break-all;">${fullUrl}</a>
          <button type="button" class="copyBtn" data-url="${fullUrl}">⎘ Copy URL</button>
        </div>
      </div>
      <div id="${hostId}"><div class="placeholder">Attempting to load embedded chart…<br>If it fails, use the URL above.</div></div>
    `;

    const copyBtn = host.querySelector('.copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const url = copyBtn.dataset.url;
        navigator.clipboard.writeText(url).then(() => {
          const orig = copyBtn.textContent;
          copyBtn.textContent = '✓ Copied';
          setTimeout(() => copyBtn.textContent = orig, 1200);
        }).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
          copyBtn.textContent = '✓ Copied'; setTimeout(() => copyBtn.textContent = '⎘ Copy', 1200);
        });
      });
    }

    const comparisonItem = terms.map(t => {
      const item = { keyword: t, geo: geo || '' };
      if (time) item.time = time;
      return item;
    });

    if (!window.trends || !window.trends.embed) {
      const embedDiv = host.querySelector(`#${hostId}`);
      if (embedDiv) embedDiv.innerHTML = `<span class="placeholder">Embed script not ready.<br>Use the full URL above (it contains every parameter).</span>`;
      return;
    }

    try {
      window.trends.embed.renderExploreWidget('TIMESERIES', {
        comparisonItem, category: cat, property: gprop || ''
      }, {
        exploreQuery,
        guestPath: 'https://trends.google.com:443/trends/embed/',
        embedTarget: hostId
      });
    } catch (e) {
      const embedDiv = host.querySelector(`#${hostId}`);
      if (embedDiv) embedDiv.innerHTML = `<span class="placeholder">Widget error: ${e.message}<br>Use the full URL above.</span>`;
      return;
    }

    savePanelState(panel);
  }

  function init() {
    populatePresetSelect();

    const container = document.getElementById('panelContainer');
    for (let i = 0; i < PANEL_COUNT; i++) {
      const panel = buildPanel(i);
      container.appendChild(panel);
      wirePanel(panel);
    }

    document.getElementById('presetSelect').addEventListener('change', (e) => {
      const presets = getPresets();
      currentPreset = presets.find(p => p.id === e.target.value) || null;
      updatePresetInfo();
    });
    document.getElementById('btnLoadPreset').addEventListener('click', loadPresetIntoActivePanel);
    document.getElementById('btnLoadFullPreset').addEventListener('click', loadPresetAcrossAllPanels);
    document.getElementById('btnSavePreset').addEventListener('click', saveActivePanelAsPreset);
    document.getElementById('btnDeletePreset').addEventListener('click', deleteCurrentPreset);

    const addTermsBtn = document.getElementById('btnAddSelectedTerms');
    if (addTermsBtn) addTermsBtn.addEventListener('click', addSelectedPresetTermsToActivePanel);

    document.getElementById('btnExportPresets').addEventListener('click', exportPresets);
    const importInput = document.getElementById('importFileInput');
    document.getElementById('btnImportPresets').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) importPresetsFromFile(file);
      e.target.value = '';
    });

    const loadInput = document.getElementById('loadFileInput');
    let loadTargetPanel = null;
    document.getElementById('btnLoadFromFile').addEventListener('click', () => {
      loadTargetPanel = activePanel();
      loadInput.click();
    });
    loadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) loadFileToPanel(file, loadTargetPanel);
      e.target.value = '';
    });

    const helpBtn = document.getElementById('btnHelp');
    const helpOverlay = document.getElementById('helpOverlay');
    const closeHelp = document.getElementById('btnCloseHelp');
    if (helpBtn && helpOverlay) {
      helpBtn.addEventListener('click', () => { helpOverlay.hidden = false; });
      closeHelp.addEventListener('click', () => { helpOverlay.hidden = true; });
      helpOverlay.addEventListener('click', (e) => { if (e.target === helpOverlay) helpOverlay.hidden = true; });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') helpOverlay.hidden = true; });
    }

    if (window.FeistTheme) FeistTheme.mount('#themeSwitcherMount');
  }

  init();
})();
