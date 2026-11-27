import assert from "node:assert/strict";
import test from "node:test";
import { buildPreviewDoc, buildStandaloneWrapper } from "./preview.js";

const files = [
  {
    path: "index.html",
    content: '<!doctype html><html><head><title>Preview test</title></head><body><script src="app.js"></script></body></html>',
  },
  {
    path: "app.js",
    content: 'window.previewTest = "ready";',
  },
];

test("preview denies external network access by default", () => {
  const doc = buildPreviewDoc(files);

  assert.match(doc, /default-src 'none'/);
  assert.match(doc, /script-src 'unsafe-inline'/);
  assert.match(doc, /connect-src 'none'/);
  assert.match(doc, /frame-src 'none'/);
  assert.match(doc, /form-action 'none'/);
  assert.doesNotMatch(doc, /connect-src https:/);
  assert.match(doc, /window\.previewTest = "ready"/);
});

test("explicit network opt-in permits HTTPS resources only", () => {
  const doc = buildPreviewDoc(files, { allowNetwork: true });

  assert.match(doc, /script-src 'unsafe-inline' https:/);
  assert.match(doc, /img-src data: blob: https:/);
  assert.match(doc, /font-src data: https:/);
  assert.match(doc, /connect-src https:/);
  assert.match(doc, /frame-src https:/);
  assert.doesNotMatch(doc, /connect-src http:/);
});

test("preview keeps storage in memory instead of exposing host storage", () => {
  const doc = buildPreviewDoc(files);

  assert.match(doc, /function memoryStore\(\)/);
  assert.match(doc, /install\('localStorage'\)/);
  assert.match(doc, /install\('sessionStorage'\)/);
});

test("standalone preview keeps the iframe opaque and blocks navigation surfaces", () => {
  const wrapper = buildStandaloneWrapper(files);

  assert.match(wrapper, /sandbox="allow-scripts"/);
  assert.doesNotMatch(wrapper, /allow-same-origin|allow-popups|allow-forms|allow-modals/);
  assert.match(wrapper, /connect-src &#39;none&#39;|connect-src 'none'/);
});

test("empty project does not produce a preview document", () => {
  assert.equal(buildPreviewDoc([]), "");
  assert.equal(buildStandaloneWrapper([]), "");
});
