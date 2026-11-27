const clean = (path) => String(path || '').replace(/^\.?\//, '');

function isExternalReference(reference) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(String(reference || '').trim());
}

// Resolve a generated-project reference against the file that contains it.
// References are never allowed to escape the generated project's root.
function resolveLocalPath(sourcePath, reference) {
  const raw = String(reference || '').trim();
  if (!raw || isExternalReference(raw)) return null;

  const pathOnly = raw.split(/[?#]/, 1)[0];
  if (!pathOnly) return null;

  const segments = pathOnly.startsWith('/')
    ? []
    : clean(sourcePath).split('/').slice(0, -1);

  for (const segment of pathOnly.replace(/^\/+/, '').split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (!segments.length) return null;
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.length ? segments.join('/') : null;
}

function svgDataUrl(path, content) {
  if (!/\.svg$/i.test(path)) return null;
  if (typeof content !== 'string' || !/<svg(?:\s|>)/i.test(content)) return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
}

function resolveSvgAsset(byPath, sourcePath, reference) {
  const path = resolveLocalPath(sourcePath, reference);
  if (!path || !Object.prototype.hasOwnProperty.call(byPath, path)) return null;
  return svgDataUrl(path, byPath[path]);
}

function inlineCssAssets(css, stylesheetPath, byPath) {
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, _quote, reference) => {
    const dataUrl = resolveSvgAsset(byPath, stylesheetPath, reference);
    return dataUrl ? `url("${dataUrl}")` : match;
  });
}

function inlineHtmlSvgAssets(html, entryPath, byPath) {
  return html.replace(/<(?:img|source|video|audio|track)\b[^>]*>/gi, (tag) => {
    return tag.replace(/\b(src|poster)\s*=\s*(["'])(.*?)\2/gi, (attribute, name, quote, reference) => {
      const dataUrl = resolveSvgAsset(byPath, entryPath, reference);
      return dataUrl ? `${name}=${quote}${dataUrl}${quote}` : attribute;
    });
  });
}

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
  const list = (Array.isArray(files) ? files : []).filter((file) =>
    file && file.path && typeof file.content === 'string'
  );
  if (!list.length) return '';

  // A null-prototype map prevents special file names from mutating object prototypes.
  const byPath = Object.create(null);
  list.forEach((file) => {
    byPath[clean(file.path)] = file.content;
  });

  let entryPath = 'index.html';
  let html = byPath[entryPath];
  if (html === undefined) {
    const candidate = list.find((file) => /\.html?$/i.test(file.path));
    if (!candidate) return '';
    entryPath = clean(candidate.path);
    html = candidate.content;
  }

  html = html.replace(/<link\b[^>]*href=["']([^"']+\.css(?:[?#][^"']*)?)["'][^>]*>/gi, (match, href) => {
    const stylesheetPath = resolveLocalPath(entryPath, href);
    const css = stylesheetPath ? byPath[stylesheetPath] : undefined;
    if (css === undefined) return match;
    return `<style>\n${inlineCssAssets(css, stylesheetPath, byPath)}\n</style>`;
  });

  html = html.replace(/<script([^>]*?)\ssrc=["']([^"']+)["']([^>]*)><\/script>/gi, (match, _pre, src) => {
    const scriptPath = resolveLocalPath(entryPath, src);
    const js = scriptPath ? byPath[scriptPath] : undefined;
    return js !== undefined ? `<script>\n${js}\n</script>` : match;
  });

  html = inlineHtmlSvgAssets(html, entryPath, byPath);
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
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
