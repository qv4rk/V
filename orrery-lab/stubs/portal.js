/* Harness stub: keep layer iframes from calling the live site portal. */
window.FTPortal = {
  go: function () {},
  from: function () { return {}; },
  time: function () { return new Date(); },
  ready: function () { return true; },
  arrived: false
};
