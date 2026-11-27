import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { sanitizeProjectFiles } from "../../shared/projectFiles.ts";

function responseError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default async function (req: Request): Promise<Response> {
  const startedAt = Date.now();

  try {
    const parsedBody: unknown = await req.json().catch(() => ({}));
    const body = isRecord(parsedBody) ? parsedBody : {};
    const { projectId, action } = body;

    if (typeof projectId !== "string" || !projectId.trim()) {
      return responseError("معرّف المشروع غير صالح.", 400);
    }
    if (action !== "save" && action !== "restore") {
      return responseError("عملية حفظ النسخة غير معروفة.", 400);
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return responseError("يجب تسجيل الدخول أولاً.", 401);

    // All reads and writes remain in the signed-in user's scope. Entity RLS
    // decides ownership; this function never elevates to a service role.
    const db = base44.entities;
    const project = await db.Project.get(projectId).catch(() => null);
    if (!project) {
      return responseError(
        "المشروع غير موجود أو لا تملك صلاحية الوصول إليه.",
        404,
      );
    }

    let files: ReturnType<typeof sanitizeProjectFiles>;
    let label = "";
    let summary = "";
    let provider = String(project.provider || "");
    let model = String(project.model || "");
    let restoredFrom: number | null = null;

    if (action === "restore") {
      if (typeof body.versionId !== "string" || !body.versionId.trim()) {
        return responseError("معرّف النسخة المطلوب استعادتها غير صالح.", 400);
      }

      const source = await db.Version.get(body.versionId).catch(() => null);
      if (!source || source.project_id !== projectId) {
        return responseError("النسخة غير موجودة ضمن هذا المشروع.", 404);
      }

      try {
        files = sanitizeProjectFiles(source.files);
      } catch (error) {
        return responseError(errorMessage(error, "ملفات النسخة غير صالحة."), 400);
      }

      restoredFrom = Number(source.number || 0);
      label = `استعادة النسخة ${restoredFrom}`.slice(0, 120);
      summary = `استُعيد محتوى النسخة ${restoredFrom} في نسخة جديدة مستقلة.`;
      provider = String(source.provider || provider);
      model = String(source.model || model);
    } else {
      try {
        files = sanitizeProjectFiles(body.files);
      } catch (error) {
        return responseError(errorMessage(error, "ملفات المشروع غير صالحة."), 400);
      }

      if (!files.length) return responseError("لا توجد ملفات لحفظها.", 400);
      label = String(body.label || "تعديل يدوي").trim().slice(0, 120) ||
        "تعديل يدوي";
      summary = "حُفظت تعديلات الملفات اليدوية كنسخة جديدة.";
    }

    // Derive the next number from both the project counter and saved history so
    // a restore can never reuse an older version number.
    const historyResult = await db.Version.filter(
      { project_id: projectId },
      { sort: "-number", limit: 80 },
    );
    const history = Array.isArray(historyResult)
      ? historyResult
      : historyResult?.items || [];
    const highestSaved = history.reduce(
      (max: number, item: any) => Math.max(max, Number(item.number || 0)),
      0,
    );
    const nextVersion = Math.max(Number(project.version || 0), highestSaved) +
      1;

    // Save the immutable snapshot first. If updating the project fails, remove
    // this new row as compensation so history does not advertise an unapplied state.
    const snapshot = await db.Version.create({
      project_id: projectId,
      session_key: project.session_key || "",
      number: nextVersion,
      label,
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
        version: nextVersion,
        provider,
        model,
      });
    } catch (error) {
      if (snapshot?.id) {
        await db.Version.delete(snapshot.id).catch(() => null);
      }
      throw error;
    }

    // Logs are best-effort: a logging outage must not turn a successful save
    // into a reported failure after the project and snapshot have committed.
    try {
      await db.BuildLog.create({
        project_id: projectId,
        session_key: project.session_key || "",
        status: "success",
        stage: action === "restore" ? "استعادة نسخة" : "حفظ يدوي",
        message: summary,
        prompt: label,
        provider,
        model,
        version: nextVersion,
        duration_ms: Date.now() - startedAt,
      });
    } catch (_) {
      // Keep the successful project operation successful.
    }

    return Response.json({
      ok: true,
      version: nextVersion,
      restoredFrom,
      fileCount: files.length,
      summary,
    });
  } catch (error) {
    return Response.json(
      { error: errorMessage(error, "تعذّر حفظ نسخة المشروع.") },
      { status: 500 },
    );
  }
}
