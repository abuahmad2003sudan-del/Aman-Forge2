import { useMemo, useState } from 'react';
import { Archive, Code2, Download, ExternalLink, Eye, Globe, History, Monitor, RotateCw, Smartphone, Terminal } from 'lucide-react';
import PreviewFrame from './PreviewFrame';
import CodeViewer from './CodeViewer';
import VersionList from './VersionList';
import BuildLogList from './BuildLogList';
import SandboxNotes from './SandboxNotes';
import { buildPreviewDoc, buildStandaloneWrapper, downloadHtml } from '@/lib/preview';
import { createProjectZip } from '@/lib/zipExport';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'preview', label: 'معاينة', icon: Eye },
  { id: 'code', label: 'الكود', icon: Code2 },
  { id: 'versions', label: 'النسخ', icon: History },
  { id: 'logs', label: 'السجل', icon: Terminal },
];

export default function WorkspacePane({ project, versions, logs = [], busy, onRestore, onSaveFiles }) {
  const [tab, setTab] = useState('preview');
  const [device, setDevice] = useState('desktop');
  const [nonce, setNonce] = useState(0);
  const [networkEnabled, setNetworkEnabled] = useState(false);
  const [zipError, setZipError] = useState('');

  const doc = useMemo(
    () => buildPreviewDoc(project?.files, { allowNetwork: networkEnabled }),
    [project?.files, networkEnabled],
  );
  const files = project?.files || [];

  function openTab() {
    const wrapper = buildStandaloneWrapper(files, { allowNetwork: networkEnabled });
    if (!wrapper) return;
    const blob = new Blob([wrapper], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  }

  function downloadZip() {
    setZipError('');
    try {
      const blob = createProjectZip(files, project?.title || project?.name || 'AMAN FORGE', project?.version ?? 0);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${String(project?.title || project?.name || 'project').slice(0, 80)}-v${project?.version ?? 0}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) {
      setZipError(error?.message || 'تعذّر تجهيز ملف ZIP.');
    }
  }


  return (
    <div className="flex h-[70vh] flex-col bg-background lg:h-full">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div role="tablist" aria-label="أوضاع مساحة العمل" className="flex items-center gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="workspace-panel"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] transition-colors',
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {t.id === 'code' && files.length > 0 && (
                  <span className="rounded bg-background/60 px-1 text-[9.5px]">{files.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {tab === 'preview' && (
          <div className="flex items-center gap-1">
            <SandboxNotes networkEnabled={networkEnabled} />
            <button
              type="button"
              onClick={() => {
                setNetworkEnabled((value) => !value);
                setNonce((value) => value + 1);
              }}
              aria-pressed={networkEnabled}
              aria-label={networkEnabled ? 'إيقاف الشبكة الخارجية' : 'السماح بموارد واتصالات HTTPS الخارجية'}
              title={networkEnabled ? 'إيقاف الشبكة الخارجية' : 'السماح بموارد واتصالات HTTPS الخارجية'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[9.5px] transition-colors',
                networkEnabled
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                  : 'border-emerald-400/20 bg-emerald-400/[.05] text-emerald-300',
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden 2xl:inline">{networkEnabled ? 'HTTPS مفعّل' : 'الشبكة محجوبة'}</span>
            </button>
            <div className="flex items-center rounded-lg border border-border/70 p-0.5">
              <button
                type="button"
                onClick={() => setDevice('desktop')}
                aria-pressed={device === 'desktop'}
                aria-label="عرض سطح المكتب"
                className={cn('rounded-md p-1', device === 'desktop' ? 'bg-secondary text-foreground' : 'text-muted-foreground')}
                title="سطح المكتب"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDevice('mobile')}
                aria-pressed={device === 'mobile'}
                aria-label="عرض الهاتف"
                className={cn('rounded-md p-1', device === 'mobile' ? 'bg-secondary text-foreground' : 'text-muted-foreground')}
                title="الهاتف"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              aria-label="إعادة تحميل المعاينة"
              className="rounded-lg border border-border/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              title="إعادة التحميل"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={openTab}
              disabled={!doc}
              aria-label="فتح المعاينة في نافذة جديدة"
              className="rounded-lg border border-border/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              title="فتح في نافذة"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => downloadHtml(files, `${project?.title || 'app'}.html`, { allowNetwork: networkEnabled })}
              disabled={!doc}
              aria-label="تنزيل التطبيق كملف HTML"
              className="rounded-lg border border-border/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              title="تنزيل HTML"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={downloadZip}
              disabled={!files.length}
              aria-label="تصدير جميع ملفات المشروع ZIP"
              className="rounded-lg border border-primary/25 bg-primary/5 p-1.5 text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
              title="تصدير المشروع ZIP"
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {zipError && tab === 'preview' && <p role="alert" className="border-b border-border/60 px-3 py-1.5 text-[10.5px] text-destructive">{zipError}</p>}
      <div id="workspace-panel" role="tabpanel" aria-label="مساحة العمل" className="relative min-h-0 flex-1">
        {tab === 'preview' && <PreviewFrame doc={doc} device={device} nonce={nonce} busy={busy} />}
        {tab === 'code' && <CodeViewer files={files} onSave={onSaveFiles} busy={busy} />}
        {tab === 'versions' && (
          <VersionList versions={versions} current={project?.version || 0} onRestore={onRestore} busy={busy} />
        )}
        {tab === 'logs' && <BuildLogList logs={logs} />}
      </div>
    </div>
  );
}