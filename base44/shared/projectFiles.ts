export type ProjectFile = {
  path: string;
  content: string;
  language: string;
};

type FileLimits = {
  maxFiles?: number;
  maxFileChars?: number;
  maxTotalChars?: number;
};

const RESERVED_SEGMENTS = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "tostring",
  "valueof",
  "hasownproperty",
  "isprototypeof",
  "propertyisenumerable",
  "tolocalestring",
  ".git",
  ".agents",
  "node_modules",
]);

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  html: "html",
  htm: "html",
  css: "css",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "tsx",
  jsx: "jsx",
  json: "json",
  svg: "xml",
  md: "markdown",
  txt: "text",
};

function validatePath(value: unknown): string {
  if (typeof value !== "string") throw new Error("مسار أحد الملفات غير صالح.");
  const raw = value.trim();

  if (
    !raw ||
    raw.length > 180 ||
    raw.startsWith("/") ||
    raw.includes("\\") ||
    /^[a-zA-Z]:/.test(raw) ||
    /[\u0000-\u001f\u007f]/.test(raw)
  ) {
    throw new Error("مسار ملف غير آمن أو طويل أكثر من اللازم.");
  }

  const path = raw.replace(/^(?:\.\/)+/, "");
  const segments = path.split("/");

  if (
    !path ||
    path.length > 180 ||
    segments.some((segment) => {
      const lower = segment.toLowerCase();
      return (
        !segment ||
        segment === "." ||
        segment === ".." ||
        !/^[\p{L}\p{N}._@+-]+$/u.test(segment) ||
        RESERVED_SEGMENTS.has(lower) ||
        lower.startsWith(".env")
      );
    })
  ) {
    throw new Error("يحتوي مسار الملف على جزء غير مسموح به.");
  }

  return path;
}

export function sanitizeProjectFiles(
  raw: unknown,
  limits: FileLimits = {},
): ProjectFile[] {
  if (!Array.isArray(raw)) throw new Error("قائمة ملفات المشروع غير صالحة.");

  const maxFiles = limits.maxFiles ?? 80;
  const maxFileChars = limits.maxFileChars ?? 220_000;
  const maxTotalChars = limits.maxTotalChars ?? 1_500_000;

  if (raw.length > maxFiles) {
    throw new Error(`عدد الملفات يتجاوز الحد المسموح (${maxFiles}).`);
  }

  const seen = new Set<string>();
  let totalChars = 0;

  return raw.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`بيانات الملف رقم ${index + 1} غير صالحة.`);
    }

    const file = entry as Record<string, unknown>;
    const path = validatePath(file.path);
    if (seen.has(path)) throw new Error(`مسار الملف مكرر: ${path}`);
    seen.add(path);

    if (typeof file.content !== "string") {
      throw new Error(`محتوى الملف غير صالح: ${path}`);
    }
    if (file.content.length > maxFileChars) {
      throw new Error(`الملف أكبر من الحد المسموح: ${path}`);
    }

    totalChars += file.content.length;
    if (totalChars > maxTotalChars) {
      throw new Error("إجمالي حجم ملفات المشروع يتجاوز الحد المسموح.");
    }

    const extension = path.split(".").pop()?.toLowerCase() || "";
    const suppliedLanguage = typeof file.language === "string" &&
        file.language.length <= 32 &&
        /^[a-zA-Z0-9#+._-]+$/.test(file.language)
      ? file.language
      : "";

    return {
      path,
      content: file.content,
      language: suppliedLanguage || LANGUAGE_BY_EXTENSION[extension] || "text",
    };
  });
}
