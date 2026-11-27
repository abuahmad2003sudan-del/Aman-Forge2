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


test("preview resolves nested stylesheet and script paths relative to the HTML entry", () => {
  const nested = [
    {
      path: "pages/index.html",
      content: '<!doctype html><html><head><link rel="stylesheet" href="../styles/site.css?v=2"></head><body><script src="../scripts/app.js?v=3"></script></body></html>',
    },
    {
      path: "styles/site.css",
      content: ".page { color: white; }",
    },
    {
      path: "scripts/app.js",
      content: 'window.nestedPreview = "ready";',
    },
  ];

  const doc = buildPreviewDoc(nested);
  assert.match(doc, /\.page \{ color: white; \}/);
  assert.match(doc, /window\.nestedPreview = "ready"/);
  assert.doesNotMatch(doc, /href="\.\.\/styles\/site\.css/);
  assert.doesNotMatch(doc, /src="\.\.\/scripts\/app\.js/);
});

test("preview inlines project-local SVG files in HTML and CSS", () => {
  const nested = [
    {
      path: "pages/index.html",
      content: '<html><head><link rel="stylesheet" href="../styles/site.css"></head><body><img alt="Logo" src="../assets/logo.svg"></body></html>',
    },
    {
      path: "styles/site.css",
      content: '.brand { background-image: url("../assets/logo.svg"); }',
    },
    {
      path: "assets/logo.svg",
      content: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10z"/></svg>',
    },
  ];

  const doc = buildPreviewDoc(nested);
  const inlineSvg = "data:image/svg+xml;charset=utf-8,%3Csvg";
  assert.ok(doc.includes(inlineSvg), "local SVG should be converted to a data URL");
  assert.equal((doc.match(/data:image\/svg\+xml;charset=utf-8,/g) || []).length, 2);
  assert.doesNotMatch(doc, /src="\.\.\/assets\/logo\.svg"/);
  assert.doesNotMatch(doc, /url\(["']?\.\.\/assets\/logo\.svg/);
});

test("preview resolves root-relative local references from the project root", () => {
  const rootFiles = [
    {
      path: "index.html",
      content: '<html><body><script src="/scripts/app.js"></script><img src="/assets/icon.svg"></body></html>',
    },
    { path: "scripts/app.js", content: 'window.rootPreview = true;' },
    { path: "assets/icon.svg", content: "<svg><circle cx=\"5\" cy=\"5\" r=\"4\"/></svg>" },
  ];

  const doc = buildPreviewDoc(rootFiles);
  assert.match(doc, /window\.rootPreview = true/);
  assert.match(doc, /data:image\/svg\+xml;charset=utf-8,/);
});

test("preview does not resolve local references that escape the project root", () => {
  const unsafe = [
    {
      path: "pages/index.html",
      content: '<html><body><img src="../../../outside/logo.svg"><img src="https://cdn.example.test/logo.svg"></body></html>',
    },
    {
      path: "outside/logo.svg",
      content: "<svg><circle r=\"2\"/></svg>",
    },
  ];

  const doc = buildPreviewDoc(unsafe);
  assert.match(doc, /src="\.\.\/\.\.\/\.\.\/outside\/logo\.svg"/);
  assert.match(doc, /src="https:\/\/cdn\.example\.test\/logo\.svg"/);
  assert.doesNotMatch(doc, /data:image\/svg\+xml;charset=utf-8,/);
});
