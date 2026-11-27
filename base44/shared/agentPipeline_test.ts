import {
  formatAgentPlan,
  inspectGeneratedProject,
  normalizeAgentMode,
  normalizeAgentPlan,
} from "./agentPipeline.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("agent mode defaults to fast and accepts deep", () => {
  assert(
    normalizeAgentMode(undefined) === "fast",
    "missing mode should be fast",
  );
  assert(
    normalizeAgentMode("unknown") === "fast",
    "unknown mode should be fast",
  );
  assert(normalizeAgentMode("deep") === "deep", "deep mode should be retained");
});

Deno.test("plan normalization bounds untrusted model output", () => {
  const plan = normalizeAgentPlan({
    goal: "Build a small storefront",
    steps: [
      "Inspect the request",
      "Create the page",
      "Verify local files",
      "4",
      "5",
      "6",
      "7",
    ],
    files: [{ path: "index.html", purpose: "Main entry" }, {
      path: "styles.css",
      purpose: "Styles",
    }],
    checks: ["Entry page exists"],
    risks: ["No payment provider configured"],
  });
  assert(plan.steps.length === 6, "plan steps must be capped at six");
  assert(plan.files.length === 2, "file plan should be normalized");
  assert(
    formatAgentPlan(plan).includes("index.html"),
    "formatted plan should include file targets",
  );
});

Deno.test("plan normalization rejects missing goal or steps", () => {
  let rejected = false;
  try {
    normalizeAgentPlan({ goal: "", steps: [] });
  } catch {
    rejected = true;
  }
  assert(rejected, "invalid plans must be rejected");
});

Deno.test("project inspection accepts a complete local HTML project", () => {
  const result = inspectGeneratedProject([
    {
      path: "index.html",
      content:
        '<link rel="stylesheet" href="css/styles.css"><script src="app.js"></script><img src="assets/logo.svg">',
    },
    {
      path: "css/styles.css",
      content: 'body { background: url("../assets/bg.svg"); }',
    },
    { path: "app.js", content: 'console.log("ready")' },
    { path: "assets/logo.svg", content: "<svg></svg>" },
    { path: "assets/bg.svg", content: "<svg></svg>" },
  ]);
  assert(result.errors.length === 0, "complete HTML entry should pass");
  assert(result.entrypoint === "index.html", "index.html should be preferred");
  assert(result.warnings.length === 0, "all local references should resolve");
  assert(result.runtime.kind === "static-html", "static app should use static runtime");
});

Deno.test("project inspection reports missing local assets but ignores external URLs", () => {
  const result = inspectGeneratedProject([
    {
      path: "index.html",
      content:
        '<script src="https://cdn.example.test/app.js"></script><img src="missing.png">',
    },
  ]);
  assert(result.errors.length === 0, "missing image should not block the build");
  assert(
    result.warnings.length === 1,
    "missing local asset should be reported once",
  );
  assert(
    result.warnings[0].includes("missing.png"),
    "warning should identify the missing asset",
  );
});

Deno.test("project inspection blocks missing local scripts and stylesheets", () => {
  const result = inspectGeneratedProject([{
    path: "index.html",
    content:
      '<link rel="stylesheet" href="styles.css"><script src="app.js"></script>',
  }]);
  assert(result.errors.length === 2, "missing critical resources should block readiness");
  assert(
    result.errors.some((item) => item.includes("styles.css")),
    "missing stylesheet should be identified",
  );
  assert(
    result.errors.some((item) => item.includes("app.js")),
    "missing script should be identified",
  );
});

Deno.test("project inspection rejects dependency-managed and framework projects", () => {
  const result = inspectGeneratedProject([
    { path: "index.html", content: '<div id="root"></div>' },
    { path: "package.json", content: '{"scripts":{"build":"vite build"},"dependencies":{"react":"*"}}' },
    { path: "src/main.jsx", content: 'import React from "react";' },
    { path: "vite.config.js", content: "export default {}" },
  ]);
  assert(result.runtime.kind === "requires-build", "framework project must require a build runtime");
  assert(result.errors.some((item) => item.includes("محرك بناء")), "build requirement should block ready status");
});

Deno.test("project inspection detects local ES modules and TypeScript files", () => {
  const result = inspectGeneratedProject([
    { path: "index.html", content: '<script src="app.js"></script>' },
    { path: "app.js", content: 'import { mount } from "./mount.js"; mount();' },
    { path: "mount.js", content: "export function mount() {}" },
    { path: "src/types.ts", content: "export type App = {};" },
  ]);
  assert(result.runtime.kind === "requires-build", "module or TS project must require build runtime");
  assert(result.errors.length > 0, "unsupported module runtime must not be marked ready");
});

Deno.test("project inspection blocks local module scripts and CSS imports", () => {
  const result = inspectGeneratedProject([
    {
      path: "index.html",
      content: '<script type="module" src="./main.js"></script>',
    },
    { path: "main.js", content: 'console.log("ready")' },
    { path: "styles.css", content: '@import "./tokens.css";' },
    { path: "tokens.css", content: ":root { --space: 1rem; }" },
  ]);
  assert(result.runtime.kind === "requires-build", "unsupported local modules should require a build runtime");
  assert(result.errors.length > 0, "unsupported module assets must block ready status");
});

Deno.test("project inspection rejects projects without an HTML entry", () => {
  const result = inspectGeneratedProject([{
    path: "app.js",
    content: "console.log('x')",
  }]);
  assert(
    result.errors.some((item) => item.includes("نقطة دخول")),
    "a JS-only project cannot be previewed by this runtime",
  );
});
