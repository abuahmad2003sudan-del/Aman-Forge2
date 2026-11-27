import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  callModel,
  parseJsonReply,
  PROVIDERS,
  resolveApiKey,
} from "../../shared/aiProviders.ts";
import { sanitizeProjectFiles } from "../../shared/projectFiles.ts";
import {
  formatAgentPlan,
  formatProjectInspection,
  inspectGeneratedProject,
  normalizeAgentMode,
  normalizeAgentPlan,
} from "../../shared/agentPipeline.ts";

const SYSTEM =
  `You are Nawah, an elite front-end engineer that turns descriptions into complete, production-quality web apps.

OUTPUT FORMAT — reply with a single JSON object and nothing else:
{"summary":"one short paragraph in the user's language describing what you built or changed","files":[{"path":"index.html","content":"<full file>","language":"html"}],"notes":["2-4 short next-step ideas in the user's language"]}

HARD RULES
1. Vanilla HTML + CSS + JavaScript only. No build step, no npm, no bundler, no bundler syntax.
2. index.html must reference styles.css and app.js with relative paths, e.g. <link rel="stylesheet" href="styles.css"> and <script src="app.js"></script>.
3. Tailwind via CDN is allowed (<script src="https://cdn.tailwindcss.com"></script>). Otherwise write hand-crafted CSS. Never rely on a framework that needs compiling.
4. React/Vue only if the user explicitly asks, loaded from a CDN (esm.sh) — never JSX without a compiler; use React.createElement or template strings.
5. The app must actually WORK: every button does something, forms validate and respond, state is handled, data persists in localStorage where it makes sense. No dead links, no "coming soon", no lorem ipsum.
6. Design like a world-class product designer: refined typography (Google Fonts allowed), generous whitespace, real content, tasteful motion, fully responsive from 360px up, accessible contrast and focus states.
7. Images: CSS gradients, inline SVG, or https://images.unsplash.com URLs. Never invent local image files.
8. Language: if the user writes Arabic, the app UI is Arabic with <html lang="ar" dir="rtl">. Otherwise match the user's language.
9. When editing an existing app: keep everything that already works, apply only the requested change, and return the COMPLETE new content of every file you touched. Never return diffs, never use "..." or "/* unchanged */" placeholders. Files you did not change may be omitted from the array.
10. Keep each file focused and readable; prefer 2-4 files over one huge file.`;

const PLAN_SYSTEM = `You are the planning stage of Nawah, a senior software engineer. Produce a concise implementation plan for the requested web app change.

Return exactly one JSON object and no markdown, with these fields: goal, steps, files (each with path and purpose), checks, and risks.

Rules:
- This is a plan, not hidden reasoning. Never reveal chain-of-thought.
- Maximum 6 actionable steps, 12 target files, 6 checks, and 4 risks.
- Respect the existing project and avoid unnecessary rewrites.
- This product currently generates static HTML, CSS and JavaScript. Do not propose npm install, package scripts, a Node server, terminal execution, deployment, or external account authorization.
- Never request API keys, passwords, tokens, or private data.
- Match the language of the user. Keep the plan specific, testable and short.`;

function filesToContext(files) {
  if (!files || !files.length) return "";
  let budget = 60000;
  const blocks = [];
  for (const f of files) {
    if (budget <= 0) break;
    const body = f.content.length > budget
      ? f.content.slice(0, budget)
      : f.content;
    budget -= body.length;
    blocks.push(`--- ${f.path} ---\n${body}`);
  }
  return blocks.join("\n\n");
}

export default async function (req) {
  let ctx: any = null;
  try {
    const body = await req.json().catch(() => ({}));
    // Credentials are resolved from platform secrets only — never from the request body.
    const { projectId, prompt, provider, model, history, agentMode: requestedAgentMode } = body || {};

    if (!projectId || typeof projectId !== "string") {
      return Response.json({ error: "projectId مطلوب" }, { status: 400 });
    }
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return Response.json({ error: "الوصف مطلوب" }, { status: 400 });
    }
    if (prompt.length > 8000) {
      return Response.json({ error: "الوصف طويل جداً" }, { status: 400 });
    }
    if (!provider || !model) {
      return Response.json({ error: "حدّد المزوّد والموديل أولاً" }, {
        status: 400,
      });
    }
    if (!PROVIDERS[provider]) {
      return Response.json({ error: "مزوّد غير مدعوم" }, { status: 400 });
    }
    const agentMode = normalizeAgentMode(requestedAgentMode);

    const base44 = createClientFromRequest(req);

    // Everything below runs as the calling user, never with the service role: the
    // entity access rules then decide what may be read and written, so a user can
    // never build into someone else's project and every message and version is
    // stamped with its true owner.
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) {
      return Response.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    const db = base44.entities;

    const project = await db.Project.get(projectId).catch(() => null);
    if (!project) {
      return Response.json({ error: "المشروع غير موجود" }, { status: 404 });
    }

    const startedAt = Date.now();
    ctx = { db, project, provider, model, prompt, startedAt };

    // One row per build attempt: the workspace then shows a real build log, and a
    // failure stays visible after a reload instead of vanishing with the toast.
    async function writeLog(fields: Record<string, any>) {
      try {
        await db.BuildLog.create({
          project_id: projectId,
          session_key: project.session_key || "",
          provider,
          model,
          prompt: String(prompt).trim().slice(0, 1500),
          duration_ms: Date.now() - startedAt,
          ...fields,
        });
      } catch (_) {
        // Logging must never break the build it is recording.
      }
    }

    const apiKey = resolveApiKey(provider);
    if (!apiKey) {
      await writeLog({
        status: "error",
        stage: "المزوّد",
        message: `مزوّد ${PROVIDERS[provider].label} غير مربوط: السر ${
          PROVIDERS[provider].secret
        } غير مضبوط.`,
      });
      return Response.json(
        {
          error: `مزوّد ${PROVIDERS[provider].label} غير مربوط بعد. أضِف السر ${
            PROVIDERS[provider].secret
          } من صفحة الأسرار في لوحة التطبيق، ثم أعد المحاولة.`,
          code: "provider_not_connected",
        },
        { status: 409 },
      );
    }

    // Persist the lifecycle transition only after a credential is confirmed.
    // Projects waiting for provider setup remain honest drafts, not stuck builds.
    await db.Project.update(projectId, { status: "building" });

    await db.Message.create({
      project_id: projectId,
      session_key: project.session_key || "",
      role: "user",
      content: prompt.trim(),
      provider,
      model,
    });

    const existing = sanitizeProjectFiles(
      Array.isArray(project.files) ? project.files : [],
    );
    const historyText = Array.isArray(history)
      ? history
        .slice(-6)
        .map((m) =>
          `${m.role === "assistant" ? "NAWAH" : "USER"}: ${
            String(m.content || "").slice(0, 600)
          }`
        )
        .join("\n")
      : "";

    // Deep mode is opt-in: it spends one additional provider call to create a
    // bounded execution plan before implementation. Fast mode keeps the existing
    // single-call cost profile.
    let plan: ReturnType<typeof normalizeAgentPlan> | null = null;
    if (agentMode === 'deep') {
      const planText = await callModel({
        provider,
        model,
        apiKey,
        system: PLAN_SYSTEM,
        maxTokens: 2048,
        messages: [{
          role: 'user',
          content: [
            `REQUEST:\n${prompt.trim()}`,
            historyText ? `RECENT CONVERSATION:\n${historyText}` : '',
            `CURRENT FILE PATHS:\n${existing.map((file) => file.path).slice(0, 40).join('\n') || '(new project)'}`,
          ].filter(Boolean).join('\n\n'),
        }],
      });
      plan = normalizeAgentPlan(parseJsonReply(planText));
      await writeLog({
        status: 'success',
        stage: 'خطة التنفيذ',
        message: formatAgentPlan(plan),
      });
    }

    const parts = [];
    if (existing.length) {
      parts.push(
        "CURRENT APP FILES (full contents):\n\n" + filesToContext(existing),
      );
      parts.push(
        "This is an edit request: return the complete updated contents of every file you change.",
      );
    } else {
      parts.push("This is a brand new app. Build it from scratch.");
    }
    if (historyText) parts.push("RECENT CONVERSATION:\n" + historyText);
    if (plan) {
      parts.push(
        "EXECUTION PLAN (follow this bounded plan while preserving the existing project):\n" +
          JSON.stringify(plan),
      );
    }
    parts.push("REQUEST:\n" + prompt.trim());

    const text = await callModel({
      provider,
      model,
      apiKey,
      system: SYSTEM,
      messages: [{ role: "user", content: parts.join("\n\n") }],
    });

    const parsed = parseJsonReply(text);
    const incoming = sanitizeProjectFiles(parsed.files, { maxFiles: 12 });
    if (!incoming.length) {
      throw new Error(
        "لم يرجع الموديل أي ملفات صالحة. أعد المحاولة أو غيّر الموديل.",
      );
    }

    const merged = new Map(existing.map((f) => [f.path, f]));
    for (const f of incoming) merged.set(f.path, f);
    const files = sanitizeProjectFiles(Array.from(merged.values()));
    const inspection = inspectGeneratedProject(files);
    if (inspection.errors.length) {
      throw new Error(inspection.errors.join(" "));
    }
    await writeLog({
      status: "success",
      stage: "فحص بنية الملفات",
      message: formatProjectInspection(inspection),
    });

    const historyResult = await db.Version.filter(
      { project_id: projectId },
      { sort: "-number", limit: 80 },
    );
    const savedVersions = Array.isArray(historyResult)
      ? historyResult
      : historyResult?.items || [];
    const highestSaved = savedVersions.reduce(
      (max: number, item: any) => Math.max(max, Number(item.number || 0)),
      0,
    );
    const version = Math.max(Number(project.version || 0), highestSaved) + 1;
    const summary = typeof parsed.summary === "string"
      ? parsed.summary.slice(0, 4000)
      : "تم تحديث التطبيق.";
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.filter((n) => typeof n === "string").slice(0, 4)
      : [];

    const snapshot = await db.Version.create({
      project_id: projectId,
      session_key: project.session_key || "",
      number: version,
      label: prompt.trim().slice(0, 120),
      summary,
      provider,
      model,
      files,
    });

    try {
      await db.Project.update(projectId, {
        files,
        summary,
        status: "ready",
        version,
        provider,
        model,
        description: (project.description || "").slice(0, 300),
      });
    } catch (error) {
      if (snapshot?.id) await db.Version.delete(snapshot.id).catch(() => null);
      throw error;
    }

    try {
      await db.Message.create({
        project_id: projectId,
        session_key: project.session_key || "",
        role: "assistant",
        content: plan
          ? `${summary}\n\n${formatAgentPlan(plan)}`.slice(0, 4000)
          : summary,
        provider,
        model,
      });
    } catch (_) {
      // The project and version are already committed; history sync is best-effort.
    }

    await writeLog({
      status: "success",
      stage: "بناء",
      message: summary,
      version,
    });

    return Response.json({
      files,
      summary,
      notes,
      version,
      agentMode,
      plan,
      inspection,
    });
  } catch (error) {
    if (ctx) {
      try {
        await ctx.db.Project.update(ctx.project.id, { status: "error" });
      } catch (_) {
        // Preserve the original build error if the status update also fails.
      }
      try {
        await ctx.db.BuildLog.create({
          project_id: ctx.project.id,
          session_key: ctx.project.session_key || "",
          status: "error",
          stage: "خطأ في التوليد",
          message: String(error?.message || "فشل التوليد").slice(0, 1500),
          prompt: String(ctx.prompt).trim().slice(0, 1500),
          provider: ctx.provider,
          model: ctx.model,
          version: Number(ctx.project.version || 0),
          duration_ms: Date.now() - ctx.startedAt,
        });
      } catch (_) {
        // Reporting the original failure matters more than the log row.
      }
    }
    return Response.json({ error: error?.message || "فشل التوليد" }, {
      status: 500,
    });
  }
}
