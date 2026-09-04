/* ─────────────────────────────────────────────────────────────
   LEATHER-BOUND READER SKIN — pagination + page-turn engine.

   Deliberately built as an additive layer on top of the existing
   reader.js engine rather than a fork of it: the actual <h2>/<p>
   elements reader.js already parses, indexes into `segments[]`, and
   wires with click-to-seek handlers are MOVED (never cloned) into
   per-page "leaf" containers here. That means every existing handler
   and DOM reference in reader.js keeps working unmodified -- this
   file only decides which of those same nodes are visible, and in
   what order they flip past.

   Switching back to the standard skin moves every node back to its
   exact original parent + position, recorded before the first move.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var SKIN_KEY = 'feisttech-reader-skin';
  var TURN_MS = 620; // must match the CSS transition duration

  var state = {
    skin: 'standard',
    moveLog: [],       // [{node, parent, next}] in move order, for exact restore
    pages: [],          // [{leaf, inner, els: [nodes on this page]}]
    current: 0,
    bookEl: null,
    turning: false
  };

  function getSkin() {
    try { return localStorage.getItem(SKIN_KEY) || 'standard'; }
    catch (e) { return 'standard'; }
  }

  function persist(skin) {
    try { localStorage.setItem(SKIN_KEY, skin); } catch (e) {}
  }

  function setSkin(skin) {
    if (skin !== 'leather' && skin !== 'standard') return;
    if (state.skin === skin) return;
    state.skin = skin;
    persist(skin);
    document.documentElement.setAttribute('data-reader-skin', skin);
    if (skin === 'leather') paginate();
    else teardown();
    document.dispatchEvent(new CustomEvent('feisttech-skin-change', { detail: { skin: skin } }));
  }

  function toggle() { setSkin(state.skin === 'leather' ? 'standard' : 'leather'); }

  function restoreMovedNodes() {
    // Same restore used by teardown(): put every moved node back where it
    // came from, in reverse move order so each `next` sibling is still
    // valid. When the caller is "a fresh article just loaded", the
    // recorded parents are the OLD article's now-detached wrapper
    // elements -- reinserting into a detached subtree is a harmless
    // no-op on the live page, so this is always safe to call first.
    for (var i = state.moveLog.length - 1; i >= 0; i--) {
      var m = state.moveLog[i];
      if (m.parent) m.parent.insertBefore(m.node, m.next);
    }
    state.moveLog = [];
  }

  // Rebuild pagination from scratch -- called whenever new article content
  // is loaded into #storyContainer, or the viewport actually changes size,
  // while the leather skin is on. Tries to keep showing whichever segment
  // was on screen before the rebuild (a real resize/rotation shouldn't
  // silently kick the reader back to page 1).
  function refresh() {
    if (state.skin !== 'leather') return;
    var anchor = (state.pages[state.current] && state.pages[state.current].els[0]) || null;
    restoreMovedNodes();     // #storyContainer must hold real flow elements
                              // again before flowElements() can find any
    teardownLeaves();
    paginate();
    if (anchor) {
      for (var i = 0; i < state.pages.length; i++) {
        if (state.pages[i].els.indexOf(anchor) !== -1) { state.current = i; showPageInstant(i); break; }
      }
    }
  }

  function flowElements(container) {
    // Top-level flow nodes in document order: each chapter's heading,
    // then its paragraphs. Matches exactly what reader.js's
    // processContent()/populateChapters() already query.
    return Array.prototype.slice.call(
      container.querySelectorAll('.chapter > h2, .chapter-content > p')
    );
  }

  function buildBookShell() {
    var container = document.querySelector('.container');
    if (!container) return null;
    var book = document.createElement('div');
    book.className = 'leather-book';
    book.id = 'leatherBook';

    var controls = document.createElement('div');
    controls.className = 'leather-controls';
    controls.innerHTML =
      '<button type="button" data-leather-prev>&#9664; PREV PAGE</button>' +
      '<span data-leather-folio-label>&mdash;</span>' +
      '<button type="button" data-leather-next>NEXT PAGE &#9654;</button>';
    book.appendChild(controls);

    var prevZone = document.createElement('button');
    prevZone.className = 'leather-turn-zone prev';
    prevZone.setAttribute('aria-label', 'Previous page');
    prevZone.type = 'button';
    var nextZone = document.createElement('button');
    nextZone.className = 'leather-turn-zone next';
    nextZone.setAttribute('aria-label', 'Next page');
    nextZone.type = 'button';
    book.appendChild(prevZone);
    book.appendChild(nextZone);

    controls.querySelector('[data-leather-prev]').addEventListener('click', prevPage);
    controls.querySelector('[data-leather-next]').addEventListener('click', nextPage);
    prevZone.addEventListener('click', prevPage);
    nextZone.addEventListener('click', nextPage);

    container.appendChild(book);
    return book;
  }

  function makeLeaf(idx) {
    var leaf = document.createElement('div');
    leaf.className = 'leather-leaf';
    leaf.hidden = true;
    var inner = document.createElement('div');
    inner.className = 'leather-leaf-inner';
    leaf.appendChild(inner);
    var folio = document.createElement('div');
    folio.className = 'leather-folio';
    leaf.appendChild(folio);
    return { leaf: leaf, inner: inner, folio: folio, els: [] };
  }

  function paginate() {
    var source = document.getElementById('storyContainer');
    if (!source) return;
    var els = flowElements(source);
    if (!els.length) return;

    source.classList.add('leather-source');

    // Record each node's exact original position before touching anything,
    // so a later switch back to the standard skin can restore it precisely.
    els.forEach(function (el) {
      state.moveLog.push({ node: el, parent: el.parentNode, next: el.nextSibling });
    });

    var book = buildBookShell();
    if (!book) return;
    state.bookEl = book;

    // A hidden leaf, sized exactly like a real page, gives an accurate
    // content-area budget to paginate against (padding, font clamp()s,
    // and the book's own responsive width all affect this).
    var probe = makeLeaf(-1);
    probe.leaf.hidden = false;
    probe.leaf.style.visibility = 'hidden';
    probe.leaf.style.pointerEvents = 'none';
    book.appendChild(probe.leaf);
    var budget = probe.inner.clientHeight;
    book.removeChild(probe.leaf);
    if (!budget || budget < 80) budget = 480; // sane fallback if measurement fails

    // Move every node into that same probe inner (still off-DOM-visible)
    // one at a time, tracking cumulative height, to decide page breaks.
    // A new chapter heading always starts a fresh page.
    probe.leaf.hidden = false;
    probe.leaf.style.visibility = 'hidden';
    book.appendChild(probe.leaf);

    var pages = [];
    var current = { els: [] };
    var runningHeight = 0;

    function closeCurrent() {
      if (current.els.length) pages.push(current);
      current = { els: [] };
      runningHeight = 0;
    }

    els.forEach(function (el) {
      var isHeading = el.tagName === 'H2';
      if (isHeading && current.els.length) closeCurrent();
      probe.inner.appendChild(el);
      var h = el.offsetHeight + parseFloat(getComputedStyle(el).marginBottom || 0);
      if (runningHeight + h > budget && current.els.length) {
        closeCurrent();
      }
      current.els.push(el);
      runningHeight += h;
    });
    closeCurrent();
    book.removeChild(probe.leaf);

    // Now distribute the grouped elements into their real per-page leaves.
    state.pages = pages.map(function (group, idx) {
      var page = makeLeaf(idx);
      group.els.forEach(function (el) { page.inner.appendChild(el); });
      page.folio.textContent = (idx + 1) + ' / ' + pages.length;
      page.els = group.els;
      book.appendChild(page.leaf);
      return page;
    });

    state.current = 0;
    showPageInstant(0);
  }

  function showPageInstant(idx) {
    state.pages.forEach(function (p, i) {
      p.leaf.hidden = i !== idx;
      p.leaf.style.zIndex = i === idx ? '2' : '1';
      p.leaf.classList.remove('turning-next', 'turning-prev', 'incoming');
    });
    updateControls();
  }

  function updateControls() {
    if (!state.bookEl) return;
    var prevBtn = state.bookEl.querySelector('[data-leather-prev]');
    var nextBtn = state.bookEl.querySelector('[data-leather-next]');
    var label = state.bookEl.querySelector('[data-leather-folio-label]');
    if (prevBtn) prevBtn.disabled = state.current <= 0;
    if (nextBtn) nextBtn.disabled = state.current >= state.pages.length - 1;
    if (label) label.textContent = (state.current + 1) + ' / ' + state.pages.length;
    var prevZone = state.bookEl.querySelector('.leather-turn-zone.prev');
    var nextZone = state.bookEl.querySelector('.leather-turn-zone.next');
    if (prevZone) prevZone.disabled = state.current <= 0;
    if (nextZone) nextZone.disabled = state.current >= state.pages.length - 1;
  }

  function turnTo(idx, dir) {
    if (state.turning || idx < 0 || idx >= state.pages.length || idx === state.current) return;
    state.turning = true;
    var outgoing = state.pages[state.current];
    var incoming = state.pages[idx];
    incoming.leaf.hidden = false;
    incoming.leaf.style.zIndex = '1';
    outgoing.leaf.style.zIndex = '2';
    // Force layout before adding the transition class so it actually animates.
    void outgoing.leaf.offsetHeight;
    outgoing.leaf.classList.add(dir > 0 ? 'turning-next' : 'turning-prev');
    setTimeout(function () {
      outgoing.leaf.hidden = true;
      outgoing.leaf.classList.remove('turning-next', 'turning-prev');
      state.current = idx;
      state.turning = false;
      showPageInstant(state.current);
    }, TURN_MS);
  }

  function nextPage() { turnTo(state.current + 1, 1); }
  function prevPage() { turnTo(state.current - 1, -1); }

  // Called by reader.js's highlight() when TTS playback (or a chapter
  // jump) moves to a segment that may be on a different page than the
  // one currently showing.
  function gotoSegment(seg) {
    if (state.skin !== 'leather' || !seg || !seg.element) return;
    var idx = -1;
    for (var i = 0; i < state.pages.length; i++) {
      if (state.pages[i].els.indexOf(seg.element) !== -1) { idx = i; break; }
    }
    if (idx === -1 || idx === state.current) return;
    turnTo(idx, idx > state.current ? 1 : -1);
  }

  function teardownLeaves() {
    if (state.bookEl && state.bookEl.parentNode) state.bookEl.parentNode.removeChild(state.bookEl);
    state.bookEl = null;
    state.pages = [];
    state.current = 0;
    state.turning = false;
  }

  function teardown() {
    restoreMovedNodes();
    teardownLeaves();
    var source = document.getElementById('storyContainer');
    if (source) source.classList.remove('leather-source');
  }

  // Mobile browsers fire `resize` when the address bar collapses or
  // expands during an ordinary scroll -- that changes innerHeight, not
  // width, dozens of times a second while scrolling. Rebuilding the whole
  // paginated book on every one of those (rather than on an actual resize
  // or rotation) was what made pages intermittently collapse mid-scroll.
  // Only react to real width changes, and debounce so a drag-resize on
  // desktop doesn't rebuild on every intermediate frame either.
  var lastWidth = window.innerWidth;
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    if (state.skin !== 'leather') return;
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refresh, 250);
  });

  window.LeatherSkin = {
    getSkin: getSkin,
    setSkin: setSkin,
    toggle: toggle,
    refresh: refresh,
    nextPage: nextPage,
    prevPage: prevPage,
    gotoSegment: gotoSegment
  };

  function syncToggleLabel() {
    var btn = document.getElementById('leatherSkinToggle');
    if (btn) btn.textContent = '📖 Leather-Bound Skin: ' + (state.skin === 'leather' ? 'On' : 'Off');
  }
  document.addEventListener('feisttech-skin-change', syncToggleLabel);
  document.addEventListener('DOMContentLoaded', syncToggleLabel);

  // Apply a previously-saved choice as soon as this script runs (it's
  // loaded after reader.js's initial empty-state render, before any
  // article is loaded, so there's nothing to paginate yet -- refresh()
  // runs for real the first time loadArticleIntoReader/initReader fires).
  var saved = getSkin();
  state.skin = saved;
  document.documentElement.setAttribute('data-reader-skin', saved);
})();
