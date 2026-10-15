/** Explicit bilingual copy; only validated UI preferences persist. Pricing always comes from code. */
(function (global) {
  'use strict';
  const STORAGE_KEY = 'd5-pricing-beta-202611';
  const defaults = () => ({lang:'zh', billing:'monthly', audience:'personal'});
  function sanitize(value) {
    const next = defaults();
    if (!value || value.dataRevision !== global.D5Data.DATA_REVISION) return next;
    if (['zh','en'].includes(value.lang)) next.lang = value.lang;
    if (['monthly','annual'].includes(value.billing)) next.billing = value.billing;
    if (['personal','team'].includes(value.audience)) next.audience = value.audience;
    return next;
  }
  function load() {
    try { return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch (_) { return defaults(); }
  }
  function save(state) {
    const preferences = sanitize({dataRevision:global.D5Data.DATA_REVISION, ...state});
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({dataRevision:global.D5Data.DATA_REVISION, ...preferences})); }
    catch (_) { /* The page also works when browser storage is unavailable. */ }
  }
  global.D5Preferences = Object.freeze({STORAGE_KEY, load, save, defaults});
})(window);
