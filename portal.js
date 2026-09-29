/* FeistTech portals: the three map pages (Space, Globe & sky, Street map)
 * hand off to each other when you zoom past a threshold, carrying the same
 * moment in time and the same spot, with a short fade so the page load
 * reads as one continuous zoom.
 *
 *   FTPortal.go(url)      fade out, then load url
 *   FTPortal.time()       Date carried in ?t= (ms since 1970), or null
 */
(function () {
  var KEY = 'ft-portal';
  var veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483600;pointer-events:none;' +
    'opacity:0;transition:opacity .35s ease';
  function mount() { document.body.appendChild(veil); }
  document.body ? mount() : document.addEventListener('DOMContentLoaded', mount);

  // Arriving through a portal: start black, then fade the new view in.
  var arrived = false;
  try { arrived = sessionStorage.getItem(KEY) === '1'; sessionStorage.removeItem(KEY); } catch (e) {}
  if (arrived) {
    veil.style.transition = 'none';
    veil.style.opacity = '1';
    addEventListener('load', function () {
      setTimeout(function () { veil.style.transition = 'opacity .6s ease'; veil.style.opacity = '0'; }, 250);
    });
  }

  // A fresh gesture is needed after arriving: leftover scroll or pinch
  // momentum from the previous page shouldn't carry straight through this one.
  var readyAt = Infinity;
  addEventListener('load', function () { readyAt = performance.now() + (arrived ? 1600 : 400); });
  var quietUntil = 0;
  ['wheel', 'touchmove'].forEach(function (ev) {
    addEventListener(ev, function () {
      if (performance.now() < readyAt) quietUntil = performance.now() + 700;
    }, { passive: true, capture: true });
  });

  var going = false;
  window.FTPortal = {
    arrived: arrived,
    ready: function () { var n = performance.now(); return n > readyAt && n > quietUntil; },
    go: function (url) {
      if (going || !this.ready()) return;
      going = true;
      try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
      veil.style.opacity = '1';
      setTimeout(function () { location.href = url; }, 330);
    },
    time: function () {
      var t = new URLSearchParams(location.search).get('t');
      var d = t ? new Date(+t) : null;
      return d && !isNaN(d) ? d : null;
    }
  };
})();
