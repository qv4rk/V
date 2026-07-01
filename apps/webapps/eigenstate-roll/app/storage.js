/* ─────────────────────────────────────────────────────────────
   EIGENSTATE ROLL — Local grimoire (history / library)
   Every reading persists to localStorage; nothing leaves the device
   unless the user explicitly exports or shares it.
   ───────────────────────────────────────────────────────────── */

window.ER = window.ER || {};

(function (ER) {
  'use strict';

  const KEY = 'eigenstate-roll:readings:v1';

  function loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('Eigenstate Roll: could not read local grimoire', e);
      return [];
    }
  }

  function saveAll(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr));
      return true;
    } catch (e) {
      console.warn('Eigenstate Roll: could not persist local grimoire', e);
      return false;
    }
  }

  function uid() {
    return 'er_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  ER.storage = {
    list() {
      return loadAll().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },
    get(id) {
      return loadAll().find(r => r.id === id) || null;
    },
    save(reading) {
      const all = loadAll();
      const record = Object.assign({ id: uid(), createdAt: Date.now() }, reading);
      all.push(record);
      saveAll(all);
      return record;
    },
    update(id, patch) {
      const all = loadAll();
      const idx = all.findIndex(r => r.id === id);
      if (idx === -1) return null;
      all[idx] = Object.assign({}, all[idx], patch);
      saveAll(all);
      return all[idx];
    },
    remove(id) {
      const all = loadAll().filter(r => r.id !== id);
      saveAll(all);
    },
    clear() {
      saveAll([]);
    },
    search(query) {
      const q = (query || '').toLowerCase().trim();
      if (!q) return this.list();
      return this.list().filter(r =>
        (r.clientName || '').toLowerCase().includes(q) ||
        (r.question || '').toLowerCase().includes(q) ||
        (r.headline || '').toLowerCase().includes(q)
      );
    }
  };

})(window.ER);
