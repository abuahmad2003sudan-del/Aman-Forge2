import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Cpu, Loader2, Settings2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import ChatPanel from '@/components/builder/ChatPanel';
import WorkspacePane from '@/components/builder/WorkspacePane';
import { base44 } from '@/api/base44Client';
import { getActive } from '@/lib/aiKeys';
import { providerById } from '@/lib/providers';
import useProviderStatus from '@/hooks/useProviderStatus';

export default function Builder() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [versions, setVersions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [lastPrompt, setLastPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [agentMode, setAgentMode] = useState('fast');
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const autoRan = useRef(false);
  const { statuses, loadingStatus } = useProviderStatus();

  const reload = useCallback(async () => {
    const [m, v, l] = await Promise.all([
      base44.entities.Message.filter({ project_id: id }, { sort: 'created_date', limit: 200 }),
      base44.entities.Version.filter({ project_id: id }, { sort: '-number', limit: 40 }),
      base44.entities.BuildLog.filter({ project_id: id }, { sort: '-created_date', limit: 40 }),
    ]);
    setMessages(m.items || []);
    setVersions(v.items || []);
    setLogs(l.items || []);
  }, [id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const p = await base44.entities.Project.get(id).catch(() => null);
      if (!alive) return;
      if (!p) {
        setMissing(true);
        setLoading(false);
        return;
      }
      setProject(p);
      // A failed history load must not leave the workspace spinning forever.
      await reload().catch(() => {});
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, reload]);

  const send = useCallback(
    async (text) => {
      const prompt = (text || '').trim();
      if (!prompt || busy) return;
      const active = getActive();
      if (!statuses[active.provider]) {
        const p = providerById(active.provider);
        setError(`لم يُضبط مفتاح API لمزوّد ${p.name} بعد — أضِف السر ${p.secret} من صفحة الأسرار في لوحة التطبيق.`);
        return;
      }
      setError('');
      setBusy(true);
      setLastPrompt(prompt);
      setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: 'user', content: prompt }]);
      setProject((prev) => (prev ? { ...prev, status: 'building' } : prev));

      try {
        const res = await base44.functions.invoke('aiBuild', {
          projectId: id,
          prompt,
          provider: active.provider,
          model: active.model,
          agentMode,
          history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        });
        const data = res?.data || {};
        if (data.error) throw new Error(data.error);
        const updated = await base44.entities.Project.get(id);
        setProject(updated);
        setLastPrompt('');
        await reload();
      } catch (e) {
        const msg = e?.response?.data?.error || e?.message || 'حدث خطأ أثناء البناء';
        setError(msg);
        setProject((prev) => (prev ? { ...prev, status: 'error' } : prev));
        await reload().catch(() => {});
      } finally {
        setBusy(false);
      }
    },
    [agentMode, busy, id, messages, reload, statuses],
  );

  useEffect(() => {
    // Wait for the server-side provider check before deciding whether the first
    // build can run. Otherwise an initially empty status map could permanently
    // consume the one-shot auto-run before the credentials check has completed.
    if (loading || loadingStatus || !project || autoRan.current) return;

    if (messages.length > 0 || !project.initial_prompt || (project.files || []).length) {
      autoRan.current = true;
      return;
    }

    if (!statuses[getActive().provider]) return;

    autoRan.current = true;
    send(project.initial_prompt);
  }, [loading, loadingStatus, project, messages.length, send, statuses]);

  const restore = useCallback(
    async (version) => {
      if (busy) return;
      if (!version?.id) {
        setError('تعذّر تحديد النسخة المطلوب استعادتها.');
        return;
      }

      setError('');
      setBusy(true);
      try {
        const res = await base44.functions.invoke('commitProjectSnapshot', {
          projectId: id,
          action: 'restore',
          versionId: version.id,
        });
        const data = res?.data || {};
        if (data.error) throw new Error(data.error);

        setProject(await base44.entities.Project.get(id));
        await reload();
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || 'تعذّرت استعادة النسخة.');
      } finally {
        setBusy(false);
      }
    },
    [busy, id, reload],
  );

  // Manual saves and restores use the same server-side snapshot operation so
  // version numbers stay monotonic and the project never updates before its
  // immutable history row has been created.
  const saveFiles = useCallback(
    async (nextFiles, label) => {
      if (busy) throw new Error('هناك عملية أخرى قيد التنفيذ.');
      setError('');
      setBusy(true);
      try {
        const res = await base44.functions.invoke('commitProjectSnapshot', {
          projectId: id,
          action: 'save',
          files: nextFiles,
          label: label || 'تعديل يدوي',
        });
        const data = res?.data || {};
        if (data.error) throw new Error(data.error);

        setProject(await base44.entities.Project.get(id));
        await reload();
      } catch (e) {
        const message = e?.response?.data?.error || e?.message || 'تعذّر حفظ التعديلات.';
        setError(message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [busy, id, reload],
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (missing) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <p className="text-[15px] font-medium">هذا المشروع غير موجود</p>
          <p className="mt-2 text-[12.5px] text-muted-foreground">ربما حُذف أو أن الرابط غير صحيح.</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-[12.5px] hover:border-primary/40"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            عودة للمشاريع
          </Link>
        </div>
      </AppShell>
    );
  }

  const active = getActive();
  const provider = providerById(active.provider);
  const fileCount = (project.files || []).length;
  const displayMessages = messages.length === 0 && !fileCount && project.initial_prompt
    ? [{ id: `initial-${id}`, role: 'user', content: project.initial_prompt }]
    : messages;
  const retryPrompt = lastPrompt || (messages.length === 0 && !fileCount ? project.initial_prompt : '');

  return (
    <AppShell wide>
      <div className="mx-auto flex max-w-[1800px] flex-col lg:h-[calc(100vh-4rem)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              aria-label="عودة إلى المشاريع"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/80 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-[14px] font-semibold leading-tight">{project.title || project.name || project.initial_prompt?.split('\n')[0] || 'مشروع جديد'}</h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {project.version ? `النسخة ${project.version}` : 'لم يُبنَ بعد'} · {fileCount} ملف
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/studio/settings"
              className="flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Cpu className="h-3.5 w-3.5" />
              {provider.name} · {active.model}
              <Settings2 className="h-3 w-3 opacity-60" />
            </Link>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(330px,390px)_1fr]">
          <div className="order-2 min-h-0 border-t border-border/70 lg:order-1 lg:border-l lg:border-t-0">
            <ChatPanel
              messages={displayMessages}
              busy={busy}
              error={error}
              onSend={send}
              onRetry={() => send(retryPrompt)}
              canRetry={Boolean(retryPrompt) && statuses[active.provider] === true}
              hasFiles={fileCount > 0}
              configured={statuses[active.provider] === true}
              providerLabel={provider.name}
              secretName={provider.secret}
              agentMode={agentMode}
              onAgentModeChange={setAgentMode}
            />
          </div>
          <div className="order-1 min-h-0 lg:order-2">
            <WorkspacePane
              project={project}
              versions={versions}
              logs={logs}
              busy={busy}
              onRestore={restore}
              onSaveFiles={saveFiles}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}