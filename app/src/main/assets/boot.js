/* HesabYar Android — bootstrap: load reused CommonJS modules in the WebView. */
(function () {
  'use strict';
  function loadText(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('load ' + url + ' -> ' + r.status); return r.text(); }); }

  var FS_STUB = { existsSync: function () { return true; }, mkdirSync: function () {}, writeFileSync: function () {}, readFileSync: function () { return new Uint8Array(); } };
  var PATH_STUB = { join: function () { return Array.prototype.slice.call(arguments).join('/'); } };
  function evalModule(code, deps) {
    var module = { exports: {} };
    var require = function (n) {
      if (deps && Object.prototype.hasOwnProperty.call(deps, n)) return deps[n];
      if (n === 'fs') return FS_STUB;
      if (n === 'path') return PATH_STUB;
      return {};
    };
    var fn = new Function('module', 'exports', 'require', code + '\n//# sourceURL=' + ((deps && deps.__name) || 'mod') + '.js');
    fn(module, module.exports, require);
    return module.exports;
  }

  // ---- persistence bridge: native Android if present, else localStorage (browser test) ----
  function b64ToBytes(b64) { if (!b64) return null; var bin = atob(b64), len = bin.length, out = new Uint8Array(len); for (var i = 0; i < len; i++) out[i] = bin.charCodeAt(i); return out; }
  function bytesToB64(bytes) { var bin = '', chunk = 0x8000; for (var i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)); return btoa(bin); }
  var persistence;
  if (window.HesabYar && window.HesabYar.loadDb) {
    persistence = {
      load: function () { try { return b64ToBytes(window.HesabYar.loadDb()); } catch (e) { return null; } },
      save: function (bytes) { try { window.HesabYar.saveDb(bytesToB64(bytes)); } catch (e) {} }
    };
  } else {
    persistence = {
      load: function () { try { return b64ToBytes(localStorage.getItem('hesabyar_db') || ''); } catch (e) { return null; } },
      save: function (bytes) { try { localStorage.setItem('hesabyar_db', bytesToB64(bytes)); } catch (e) {} }
    };
  }
  window.__persistence = persistence;

  Promise.all([loadText('/util.js'), loadText('/db-web.js'), loadText('/core.js'), loadText('/sync.js'), loadText('/app.js')])
    .then(function (codes) {
      var U = evalModule(codes[0], { __name: 'util' });
      var DB = evalModule(codes[1], { './util': U, __name: 'db' });
      window.HPA_U = U; window.HPA_DB = DB;
      return DB.init(persistence).then(function () {
        var CORE = evalModule(codes[2], { './db': DB, './util': U, __name: 'core' });
        var SYNC = evalModule(codes[3], { './db': DB, './util': U, __name: 'sync' });
        var APP = evalModule(codes[4], { './db': DB, './util': U, './core': CORE, './sync': SYNC, __name: 'app' });
        window.HPA_CORE = CORE; window.HPA_SYNC = SYNC;
        APP.start();
      });
    })
    .catch(function (e) {
      var root = document.getElementById('hpa-root');
      if (root) root.innerHTML = '<div style="padding:30px;font-family:Tahoma;color:#dc2626;direction:rtl">خطا در بارگذاری برنامه:<br>' + (e && e.message ? e.message : e) + '</div>';
      if (window.console) console.error(e);
    });
})();
