export type AgentMode = "fast" | "deep";

export type AgentPlan = {
  goal: string;
  steps: string[];
  files: Array<{ path: string; purpose: string }>;
  checks: string[];
  risks: string[];
};

export type RuntimeCompatibility = {
  kind: "static-html" | "requires-build";
  reasons: string[];
};

export type ProjectInspection = {
  errors: string[];
  warnings: string[];
  entrypoint: string | null;
  fileCount: number;
  totalChars: number;
  runtime: RuntimeCompatibility;
};

function text(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringList(value: unknown, limit: number, maxLength = 240): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => text(item, maxLength))
    .filter(Boolean)
    .slice(0, limit);
}

export function normalizeAgentMode(value: unknown): AgentMode {
  return value === "deep" ? "deep" : "fast";
}

export function normalizeAgentPlan(raw: unknown): AgentPlan {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("لم يرجع الوكيل خطة تنفيذ صالحة.");
  }

  const source = raw as Record<string, unknown>;
  const goal = text(source.goal, 500);
  const steps = stringList(source.steps, 6, 240);
  const files = Array.isArray(source.files)
    ? source.files
      .slice(0, 12)
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return null;
        }
        const entry = item as Record<string, unknown>;
        const path = text(entry.path, 180);
        const purpose = text(entry.purpose, 220);
        return path && purpose ? { path, purpose } : null;
      })
      .filter((item): item is { path: string; purpose: string } =>
        Boolean(item)
      )
    : [];

  if (!goal || !steps.length) {
    throw new Error(
      "خطة الوكيل ناقصة: يلزم تحديد الهدف وخطوة تنفيذ واحدة على الأقل.",
    );
  }

  return {
    goal,
    steps,
    files,
    checks: stringList(source.checks, 6, 180),
    risks: stringList(source.risks, 4, 180),
  };
}

function isExternalReference(value: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value);
}

function resolveLocalReference(
  sourcePath: string,
  reference: string,
): string | null {
  const clean = reference.trim().replace(/\\/g, "/").split(/[?#]/, 1)[0];
  if (!clean || isExternalReference(clean) || clean.endsWith("/")) return null;

  const base = clean.startsWith("/") ? [] : sourcePath.split("/").slice(0, -1);
  const segments = clean.replace(/^\/+/, "").split("/");
  const resolved = [...base];

  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!resolved.length) return null;
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  return resolved.join("/") || null;
}

function detectBuildRuntime(
  files: Array<{ path: string; content: string }>,
): string[] {
  const reasons = new Set<string>();
  const buildManagedExtension = /\.(?:ts|tsx|jsx|vue|svelte|astro|mjs|cjs)$/i;
  const buildConfig = /(?:^|\/)(?:vite|next|webpack|rollup|astro|nuxt|svelte|angular|parcel|rspack|babel|postcss|tailwind)\.config\.[^/]+$/i;
  const lockfile = /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|npm-shrinkwrap\.json)$/i;

  for (const file of files) {
    const path = file.path.replace(/\\/g, "/");
    const lowerPath = path.toLowerCase();

    if (lowerPath === "package.json" || lowerPath.endsWith("/package.json")) {
      reasons.add("package.json وإدارة اعتماديات Node");
    }
    if (lowerPath === "tsconfig.json" || lowerPath.endsWith("/tsconfig.json")) {
      reasons.add("إعداد TypeScript يحتاج خطوة تحويل");
    }
    if (buildManagedExtension.test(path)) {
      reasons.add(`ملف ${path} يحتاج محوّلاً أو bundler`);
    }
    if (buildConfig.test(path)) {
      reasons.add(`إعداد بناء ${path}`);
    }
    if (lockfile.test(path)) {
      reasons.add(`ملف قفل اعتماديات ${path}`);
    }

    if (/\.css$/i.test(path)) {
      const hasLocalImport = /@import\s+(?:url\()?\s*["'](?:\.\.?\/|\/)[^"']+["']/i.test(file.content);
      if (hasLocalImport) {
        reasons.add(`@import CSS محلي في ${path} يحتاج معالجة أصول غير متاحة`);
      }
    }

    if (/\.(?:js|mjs|cjs)$/i.test(path)) {
      const hasModuleSyntax =
        /^\s*import\s+(?:[\s\S]*?\s+from\s+)?["'][^"']+["']/m.test(file.content) ||
        /^\s*export\s+(?:\*|\{|default|const|let|var|function|class)[\s\S]*?\s+from\s+["'][^"']+["']/m.test(file.content) ||
        /\bimport\s*\(\s*["'][^"']+["']\s*\)/.test(file.content);
      if (hasModuleSyntax) {
        reasons.add(`وحدات JavaScript في ${path} تحتاج محمّل modules أو bundler`);
      }
    }

    if (/\.html?$/i.test(path)) {
      const scriptTags = file.content.match(/<script\b[^>]*>/gi) || [];
      for (const tag of scriptTags) {
        const type = tag.match(/\btype\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase();
        const src = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2] || "";
        if (type === "module" && src && !isExternalReference(src)) {
          reasons.add(`script type="module" محلي في ${path} لا يُحمّل بأمان في المعاينة الحالية`);
        }
      }
    }
  }

  return Array.from(reasons).slice(0, 8);
}

function inspectLocalReferences(
  files: Array<{ path: string; content: string }>,
  paths: Set<string>,
  errors: string[],
  warnings: string[],
): void {
  const missingCritical = new Set<string>();
  const missingAssets = new Set<string>();

  for (const file of files) {
    if (/\.html?$/i.test(file.path)) {
      const scriptTags = file.content.match(/<script\b[^>]*>/gi) || [];
      for (const tag of scriptTags) {
        const reference = tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2] || "";
        const target = resolveLocalReference(file.path, reference);
        if (target && !paths.has(target)) {
          missingCritical.add(`${file.path} → ${target}`);
        }
      }

      const linkTags = file.content.match(/<link\b[^>]*>/gi) || [];
      for (const tag of linkTags) {
        const rel = tag.match(/\brel\s*=\s*(["'])(.*?)\1/i)?.[2] || "";
        if (!rel.toLowerCase().split(/\s+/).includes("stylesheet")) continue;
        const reference = tag.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2] || "";
        const target = resolveLocalReference(file.path, reference);
        if (target && !paths.has(target)) {
          missingCritical.add(`${file.path} → ${target}`);
        }
      }

      const assetTags = file.content.match(/<(?:img|source|audio|video|track)\b[^>]*>/gi) || [];
      for (const tag of assetTags) {
        const reference =
          tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2] ||
          tag.match(/\bposter\s*=\s*(["'])(.*?)\1/i)?.[2] ||
          "";
        const target = resolveLocalReference(file.path, reference);
        if (target && !paths.has(target)) {
          missingAssets.add(`${file.path} → ${target}`);
        }
      }
    }

    if (/\.css$/i.test(file.path)) {
      const pattern = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(file.content)) !== null) {
        const target = resolveLocalReference(file.path, match[2] || "");
        if (target && !paths.has(target)) {
          missingAssets.add(`${file.path} → ${target}`);
        }
      }

      const imports = file.content.match(/@import\s+(?:url\()?\s*(["'])(.*?)\1/gi) || [];
      for (const statement of imports) {
        const reference = statement.match(/["'](.*?)["']/)?.[1] || "";
        const target = resolveLocalReference(file.path, reference);
        if (target && !paths.has(target)) {
          missingCritical.add(`${file.path} → ${target}`);
        } else if (target) {
          missingCritical.add(`${file.path} → @import ${target} (غير مدعوم في المعاينة الثابتة)`);
        }
      }
    }
  }

  for (const item of missingCritical) {
    errors.push(`مرجع تشغيل أساسي غير قابل للحل: ${item}`);
  }
  for (const item of missingAssets) {
    warnings.push(item);
  }
}

export function inspectGeneratedProject(
  files: Array<{ path: string; content: string }>,
): ProjectInspection {
  const errors: string[] = [];
  const warnings: string[] = [];
  const list = Array.isArray(files) ? files : [];
  const paths = new Set(list.map((file) => file.path));
  const entry = list.find((file) => file.path === "index.html") ||
    list.find((file) => /\.html?$/i.test(file.path)) ||
    null;
  const totalChars = list.reduce((sum, file) => sum + file.content.length, 0);
  const runtimeReasons = detectBuildRuntime(list);
  const runtime: RuntimeCompatibility = {
    kind: runtimeReasons.length ? "requires-build" : "static-html",
    reasons: runtimeReasons,
  };

  if (!list.length) errors.push("لا توجد ملفات في المشروع.");
  if (!entry) {
    errors.push("لا توجد صفحة HTML يمكن استخدامها كنقطة دخول للمعاينة.");
  }

  if (runtime.kind === "requires-build") {
    errors.push(
      "هذا المشروع يحتاج محرك بناء واعتماديات غير متاحة في معاينة AMAN الحالية: " +
        runtime.reasons.slice(0, 3).join("؛ ") +
        ". لن يُعلَن جاهزاً أو تُعرض معاينة مضللة.",
    );
  }

  inspectLocalReferences(list, paths, errors, warnings);

  return {
    errors: Array.from(new Set(errors)).slice(0, 20),
    warnings: Array.from(new Set(warnings)).slice(0, 20),
    entrypoint: entry?.path || null,
    fileCount: list.length,
    totalChars,
    runtime,
  };
}

export function formatAgentPlan(plan: AgentPlan): string {
  const lines = [
    `الهدف: ${plan.goal}`,
    "خطوات التنفيذ:",
    ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
  ];

  if (plan.files.length) {
    lines.push("الملفات المستهدفة:");
    for (const file of plan.files) {
      lines.push(`• ${file.path}: ${file.purpose}`);
    }
  }
  if (plan.checks.length) {
    lines.push("معايير التحقق:", ...plan.checks.map((item) => `• ${item}`));
  }
  if (plan.risks.length) {
    lines.push("ملاحظات:", ...plan.risks.map((item) => `• ${item}`));
  }

  return lines.join("\n").slice(0, 2400);
}

export function formatProjectInspection(result: ProjectInspection): string {
  const runtimeLabel = result.runtime.kind === "static-html"
    ? "متوافق مع معاينة HTML الثابتة"
    : "يتطلب محرك بناء غير متاح حالياً";
  const base =
    `تم فحص ${result.fileCount} ملفاً (${result.totalChars} حرفاً). نقطة الدخول: ${
      result.entrypoint || "غير محددة"
    }. حالة التشغيل: ${runtimeLabel}.`;
  if (!result.warnings.length) return `${base} لم تُكتشف مراجع أصول محلية مفقودة.`;
  return `${base} مراجع أصول تحتاج مراجعة (${result.warnings.length}): ${
    result.warnings.slice(0, 5).join("؛ ")
  }`;
}
