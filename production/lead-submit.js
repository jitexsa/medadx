/* Lead submission hook used by index.html.
   window.MEDADX_SUBMIT(type, payload, files) -> Promise<{ ref?: string }>
   type: "trading-account" | "quote" | "quick-quote"
   Resolve = success screen (uses res.ref as the reference number if provided). Reject = error alert. */
(function () {
  function hasFiles(files) {
    if (!files || typeof files !== 'object') return false;
    return Object.keys(files).some(function (k) { var v = files[k]; return v && (v instanceof Blob || (v.file instanceof Blob)); });
  }
  window.MEDADX_SUBMIT = function (type, payload, files) {
    var cfg = window.MEDADX_CONFIG || {};
    var meta = { type: type, submittedAt: new Date().toISOString(), page: location.href, referrer: document.referrer || null };
    if (!cfg.leadEndpoint) {
      console.warn('[Medad-X] leadEndpoint not set in config.js — submission simulated, nothing was sent.', meta, payload);
      return new Promise(function (r) { setTimeout(function () { r({}); }, 1200); });
    }
    var headers = Object.assign({ Accept: 'application/json' }, cfg.leadHeaders || {});
    var body;
    if (hasFiles(files)) {
      body = new FormData();
      body.append('meta', JSON.stringify(meta));
      body.append('payload', JSON.stringify(payload));
      Object.keys(files).forEach(function (k) { var v = files[k]; var f = v instanceof Blob ? v : v && v.file; if (f) body.append(k, f, f.name || k); });
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ meta: meta, payload: payload });
    }
    return fetch(cfg.leadEndpoint, { method: 'POST', headers: headers, body: body }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().catch(function () { return {}; });
    });
  };
})();
