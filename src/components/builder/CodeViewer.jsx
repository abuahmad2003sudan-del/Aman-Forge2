import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileTree from './FileTree';
import CodeEditor from './CodeEditor';

export default function CodeViewer({ files, onSave, busy }) {
  const [activePath, setActivePath] = useState(files[0]?.path || '');
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!files.some((f) => f.path === activePath)) setActivePath(files[0]?.path || '');
    setDraft((prev) => {
      const next = {};
      let dropped = false;
      for (const [path, content] of Object.entries(prev)) {
        if (files.some((f) => f.path === path)) next[path] = content;
        else dropped = true;
      }
      return dropped ? next : prev;
    });
  }, [files, activePath]);

  const dirtyPaths = useMemo(
    () => Object.keys(draft).filter((path) => files.find((f) => f.path === path)?.content !== draft[path]),
    [draft, files],
  );

  if (!files.length) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[12px] text-muted-foreground">
        لم تُولَّد ملفات بعد.
      </div>
    );
  }

  const file = files.find((f) => f.path === activePath) || files[0];
  const value = draft[file.path] !== undefined ? draft[file.path] : file.content || '';

  async function save() {
    if (!dirtyPaths.length || saving || busy) return;
    setSaving(true);
    setError('');
    const nextFiles = files.map((f) => (draft[f.path] !== undefined ? { ...f, content: draft[f.path] } : f));
    try {
      await onSave(nextFiles, `تعديل يدوي · ${dirtyPaths.join('، ')}`.slice(0, 120));
      setDraft({});
    } catch {
      setError('تعذّر حفظ التعديلات. تحقق من الاتصال وأعد المحاولة.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          save();
        }
      }}
    >
      <div className="flex h-full min-h-0">
        <FileTree files={files} activePath={file.path} dirtyPaths={dirtyPaths} onSelect={setActivePath} />
        <CodeEditor
          file={file}
          value={value}
          dirty={dirtyPaths.includes(file.path)}
          onChange={(content) => setDraft((prev) => ({ ...prev, [file.path]: content }))}
        />
      </div>

      {(dirtyPaths.length > 0 || error) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-card/40 px-3 py-2">
          <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            {error ? (
              <>
                <AlertTriangle className="h-3 w-3 text-destructive" />
                <span className="text-destructive">{error}</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {dirtyPaths.length} ملف معدّل لم يُحفظ · الحفظ ينشئ نسخة جديدة
              </>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDraft({})}
              disabled={saving || !dirtyPaths.length}
              className="rounded-lg px-2 py-1 text-[10.5px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              تجاهل
            </button>
            <Button
              size="sm"
              onClick={save}
              disabled={saving || busy || !dirtyPaths.length}
              className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px]"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              حفظ التعديلات
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}