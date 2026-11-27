const clean = (path) => String(path || '').replace(/^\.?\//, '');

// The generated app runs in an opaque-origin iframe. External network access is
// denied by default; the user may explicitly opt into HTTPS resources per preview.
// No host storage, cookies, DOM, popups, form navigation or device permissions.
function createSandboxHead(allowNetwork) {
  const remote = allowNetwork ? " https:" : "";
  const policy = [
    "default-src 'none'",
    `script-src 'unsafe-inline'${remote}`,
    `style-src 'unsafe-inline'${remote}`,
    `img-src data: blob:${remote}`,
    `font-src data:${remote}`,
    `media-src data: blob:${remote}`,
    `connect-src ${allowNetwork ? "https:" : "'none'"}`,
    `frame-src ${allowNetwork ? "https:" : "'none'"}`,
    "form-action 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "worker-src 'none'",
    "manifest-src 'none'",
  ].join("; ");

  return `<meta http-equiv="Content-Security-Policy" content="${policy}">
<script>
(function () {
  function memoryStore() {
    var data = {};
    return {
      getItem: function (k) { k = String(k); return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[String(k)] = String(v); },
      removeItem: function (k) { delete data[String(k)]; },
      clear: function () { data = {}; },
      key: function (i) { var keys = Object.keys(data); return i < keys.length ? keys[i] : null; },
      get length() { return Object.keys(data).length; }
    };
  }
  function install(name) {
    try { window[name].getItem('__probe__'); return; } catch (e) {}
    try {
      var store = memoryStore();
      Object.defineProperty(window, name, { configurable: true, get: function () { return store; } });
    } catch (e) {}
  }
  install('localStorage');
  install('sessionStorage');
})();
</script>`;
}

function injectHead(html, allowNetwork) {
  const sandboxHead = createSandboxHead(allowNetwork);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>\n${sandboxHead}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html([^>]*)>/i, `<html$1>\n<head>${sandboxHead}</head>`);
  return `${sandboxHead}\n${html}`;
}

export function buildPreviewDoc(files, options = {}) {
  const list = (Array.isArray(files) ? files : []).filter((f) => f && f.path && typeof f.content === 'string');
  if (!list.length) return '';

  // A null-prototype map prevents special file names from mutating object prototypes.
  const byPath = Object.create(null);
  list.forEach((f) => {
    byPath[clean(f.path)] = f.content;
  });

  let html = byPath['index.html'];
  if (html === undefined) {
    const candidate = list.find((f) => /\.html?$/i.test(f.path));
    if (!candidate) return '';
    html = candidate.content;
  }

  html = html.replace(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (match, href) => {
    const css = byPath[clean(href)];
    return css !== undefined ? `<style>\n${css}\n</style>` : match;
  });

  html = html.replace(/<script([^>]*?)\ssrc=["']([^"']+)["']([^>]*)><\/script>/gi, (match, _pre, src) => {
    const js = byPath[clean(src)];
    return js !== undefined ? `<script>\n${js}\n</script>` : match;
  });

  return injectHead(html, options?.allowNetwork === true);
}

// Full-page preview for a new tab. The wrapper page is the studio's own markup;
// the generated app still runs inside a sandboxed iframe, so opening a preview
// in a new tab never gives generated code access to the app's origin.
export function buildStandaloneWrapper(files, options = {}) {
  const doc = buildPreviewDoc(files, options);
  if (!doc) return '';
  const escaped = doc.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>معاينة معزولة</title>
<style>html,body{margin:0;height:100%;background:#0b0b0e}iframe{border:0;width:100%;height:100%;display:block;background:#fff}</style>
</head><body><iframe title="معاينة معزولة" sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${escaped}"></iframe></body></html>`;
}

export function downloadHtml(files, name = 'app.html', options = {}) {
  const doc = buildPreviewDoc(files, options);
  if (!doc) return;
  const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}