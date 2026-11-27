import {
  sanitizeProjectFiles,
} from "./projectFiles.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(operation: () => unknown, message: string): void {
  let rejected = false;
  try {
    operation();
  } catch {
    rejected = true;
  }
  assert(rejected, message);
}

Deno.test("project file sanitizer normalizes extension languages", () => {
  const files = sanitizeProjectFiles([
    { path: "index.html", content: "<main>ready</main>" },
    { path: "src/app.ts", content: "export const ready = true;" },
    { path: "notes.unknown", content: "hello", language: "custom-mode" },
  ]);

  assert(files.length === 3, "all safe files should be retained");
  assert(files[0].language === "html", "HTML language should be inferred");
  assert(files[1].language === "typescript", "TypeScript language should be inferred");
  assert(files[2].language === "custom-mode", "valid supplied language should be preserved");
});

Deno.test("project file sanitizer accepts safe nested and Unicode paths", () => {
  const files = sanitizeProjectFiles([
    { path: "src/components/بطاقة-المنتج.jsx", content: "export default 1;" },
    { path: "assets/@brand+mark.svg", content: "<svg/>" },
  ]);

  assert(files.length === 2, "safe Unicode and scoped-style paths should be accepted");
});

Deno.test("project file sanitizer rejects traversal and absolute paths", () => {
  for (const path of [
    "../secrets.txt",
    "src/../../secrets.txt",
    "/etc/passwd",
    "C:/Windows/win.ini",
    "src\\..\\secrets.txt",
  ]) {
    assertThrows(
      () => sanitizeProjectFiles([{ path, content: "x" }]),
      `unsafe path should be rejected: ${path}`,
    );
  }
});

Deno.test("project file sanitizer rejects environment and reserved paths", () => {
  for (const path of [
    ".env",
    ".env.local",
    "config/.env.production",
    "node_modules/react/index.js",
    "src/__proto__/polluted.js",
    "src/constructor.js",
    "src/.git/config",
  ]) {
    assertThrows(
      () => sanitizeProjectFiles([{ path, content: "x" }]),
      `reserved path should be rejected: ${path}`,
    );
  }
});

Deno.test("project file sanitizer rejects duplicate paths", () => {
  assertThrows(
    () => sanitizeProjectFiles([
      { path: "src/app.js", content: "first" },
      { path: "src/app.js", content: "second" },
    ]),
    "duplicate paths must not silently overwrite one another",
  );
});

Deno.test("project file sanitizer enforces file count, per-file, and total limits", () => {
  assertThrows(
    () => sanitizeProjectFiles([
      { path: "a.js", content: "a" },
      { path: "b.js", content: "b" },
    ], { maxFiles: 1 }),
    "file count limit must be enforced",
  );

  assertThrows(
    () => sanitizeProjectFiles([
      { path: "large.js", content: "12345" },
    ], { maxFileChars: 4 }),
    "per-file size limit must be enforced",
  );

  assertThrows(
    () => sanitizeProjectFiles([
      { path: "a.js", content: "123" },
      { path: "b.js", content: "456" },
    ], { maxTotalChars: 5 }),
    "total project size limit must be enforced",
  );
});

Deno.test("project file sanitizer rejects malformed entries and non-string contents", () => {
  assertThrows(
    () => sanitizeProjectFiles({ path: "app.js", content: "x" }),
    "non-array input must be rejected",
  );
  assertThrows(
    () => sanitizeProjectFiles([{ path: "app.js", content: 123 }]),
    "non-string file content must be rejected",
  );
  assertThrows(
    () => sanitizeProjectFiles([null]),
    "null file entries must be rejected",
  );
});
