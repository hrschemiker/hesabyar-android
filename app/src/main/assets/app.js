/* HesabYar Android — SPA router over the reused server-render core.
   Navigation uses full page reloads (like the desktop server) so hpa.js runs
   fresh each time => pixel/behaviour-identical to the mobile website. */
'use strict';
var CORE = require('./core');
var DB = require('./db');
var U = require('./util');
var SYNC = require('./sync');
var TOKEN = 'android';

function parseQuery() {
  var q = {}, s = location.search.replace(/^\?/, '');
  if (!s) return q;
  s.split('&').forEach(function (p) { if (!p) return; var i = p.indexOf('='); var k = decodeURIComponent(i < 0 ? p : p.slice(0, i)); var v = i < 0 ? '' : decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); q[k] = v; });
  return q;
}
function qs(obj) { return Object.keys(obj).filter(function (k) { return obj[k] !== undefined && obj[k] !== null && obj[k] !== ''; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); }).join('&'); }
function go(query) { location.assign('index.html' + (Object.keys(query).length ? '?' + qs(query) : '')); }
function goTab(tab, extra) { var q = { hpa_tab: tab }; if (extra) for (var k in extra) q[k] = extra[k]; go(q); }

function runEnhancers() {
  // load hpa.js fresh, then fire DOMContentLoaded so its enhancers initialise once
  var old = document.getElementById('hpa-enhancers'); if (old) old.remove();
  var s = document.createElement('script'); s.id = 'hpa-enhancers'; s.src = '/assets/js/hpa.js?_=' + Date.now();
  s.onload = function () { try { document.dispatchEvent(new Event('DOMContentLoaded')); } catch (e) {} };
  document.body.appendChild(s);
}
function render() {
  var query = parseQuery();
  CORE.setContext(query, TOKEN);
  var tab = query.hpa_tab || 'dashboard';
  var html = CORE.renderTab(tab);
  document.getElementById('hpa-root').innerHTML = html;
  runEnhancers();
}

// ---- PDF / file helpers ----
function exportPdf(name, html) {
  if (window.HesabYar && window.HesabYar.exportPdf) { window.HesabYar.exportPdf(name, html); return; }
  var w = window.open('', '_blank'); if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}
function downloadText(name, content, mime) {
  if (window.HesabYar && window.HesabYar.saveText) { window.HesabYar.saveText(name, content); return; }
  var blob = new Blob([content], { type: mime || 'application/octet-stream' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

// ---- action dispatch ----
var SYNC_ACTIONS = { hpa_save_sync: 'saveAndLogin', hpa_sync_test: 'test', hpa_sync_pull: 'pull', hpa_sync_push: 'push', hpa_sync_full: 'full' };
function dispatchAction(action, post) {
  CORE.setContext(post, TOKEN);
  if (action === 'hpa_export_backup') { downloadText('hesabyar-backup-' + U.today_gregorian().replace(/-/g, '') + '.json', JSON.stringify(CORE.export_backup_json(), null, 2), 'application/json'); return Promise.resolve(null); }
  if (action === 'hpa_archive_pdf' || action === 'hpa_archive_report') { exportPdf('archive-' + (post.id || ''), CORE.render_archive_report(post.id)); return Promise.resolve(null); }
  if (action === 'hpa_fetch_rates') { return SYNC.full(true).then(function () { DB.save(); goTab('rates', { hpa_msg: 'saved' }); }); }
  if (SYNC_ACTIONS[action]) {
    return Promise.resolve(SYNC[SYNC_ACTIONS[action]](post)).then(function () { DB.save(); goTab('settings', { hpa_msg: 'saved' }); });
  }
  var tab = CORE.handleAction(action, post, {}); // files not uploaded from phone in v1
  DB.save();
  try { localStorage.setItem('hpa_dirty', '1'); } catch (e) {} // mark for background push on next load
  goTab(tab, { hpa_msg: 'saved' });
  return Promise.resolve(tab);
}

function hrefQuery(href) { var q = {}, i = href.indexOf('?'); if (i < 0) return q; href.slice(i + 1).split('&').forEach(function (p) { var j = p.indexOf('='); var k = decodeURIComponent(j < 0 ? p : p.slice(0, j)); var v = j < 0 ? '' : decodeURIComponent(p.slice(j + 1).replace(/\+/g, ' ')); q[k] = v; }); return q; }

function onClick(e) {
  if (e.defaultPrevented) return; // respect inline confirm() that cancelled
  var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
  if (!a) return;
  var href = a.getAttribute('href') || '';
  if (/^https?:\/\//i.test(href) && href.indexOf('appassets') < 0) return; // external -> let it open
  if (href.indexOf('/archive-report') === 0 || href.indexOf('/action?action=hpa_archive') > -1) { e.preventDefault(); var q = hrefQuery(href); exportPdf('archive-' + (q.id || ''), CORE.render_archive_report(q.id)); return; }
  if (href.indexOf('/action') === 0) { e.preventDefault(); dispatchAction(hrefQuery(href).action, hrefQuery(href)); return; }
  if (href.indexOf('hpa_tab=') > -1 || href.charAt(0) === '/' || href.charAt(0) === '?' || href.indexOf('index.html') === 0) {
    // internal navigation (may include #anchor) -> full reload with the query
    e.preventDefault();
    var hash = ''; var hp = href.indexOf('#'); if (hp > -1) { hash = href.slice(hp); href = href.slice(0, hp); }
    var query = hrefQuery(href);
    location.assign('index.html' + (Object.keys(query).length ? '?' + qs(query) : '') + hash);
    return;
  }
}
function onSubmit(e) {
  var form = e.target; if (!form || form.tagName !== 'FORM') return;
  e.preventDefault();
  var fd = new FormData(form); var post = {};
  fd.forEach(function (v, k) { if (typeof v === 'string') post[k] = v; }); // skip File entries (no receipt upload on phone in v1)
  if (post.action) { dispatchAction(post.action, post); return; }
  // GET filter/search form -> navigate with its fields
  go(post);
}

// ---- background sync (data flows phone <-> site <-> desktop, invisibly) ----
// Runs on every screen load. If a local change was just made ('dirty'), it pushes
// immediately; otherwise it only pulls at most once every 45s to stay light.
// The dirty flag lives in localStorage, so a change made before the app was closed
// mid-sync is still pushed on the next open (pull first, then push — full sync).
function backgroundSync() {
  var s = SYNC.getSync();
  if (!s.enabled || !s.token) return;
  var dirty = false; try { dirty = localStorage.getItem('hpa_dirty') === '1'; } catch (e) {}
  var now = Date.now(); var last = 0;
  try { last = parseInt(sessionStorage.getItem('hpa_last_sync') || '0', 10); } catch (e) {}
  if (!dirty && (now - last) < 45000) return;
  try { sessionStorage.setItem('hpa_last_sync', String(now)); } catch (e) {}
  SYNC.autoSync().then(function (res) { DB.save(); if (res && res.ok) { try { localStorage.removeItem('hpa_dirty'); } catch (e) {} } }).catch(function () {});
}

function start() {
  render();
  document.addEventListener('click', onClick, false);
  document.addEventListener('submit', onSubmit, false);
  window.addEventListener('online', function () { try { sessionStorage.removeItem('hpa_last_sync'); } catch (e) {} backgroundSync(); });
  setTimeout(backgroundSync, 800);
}

module.exports = { start: start };
