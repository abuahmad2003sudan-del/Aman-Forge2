import { FileCode2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FileTree({ files, activePath, dirtyPaths, onSelect }) {
  return (
    <div className="w-[150px] shrink-0 overflow-y-auto border-l border-border/60 bg-card/30 py-2">
      <p className="px-2.5 pb-1.5 text-[9.5px] tracking-wider text-muted-foreground/60">الملفات</p>
      {files.map((f) => {
        const dirty = dirtyPaths.includes(f.path);
        return (
          <button
            key={f.path}
            type="button"
            onClick={() => onSelect(f.path)}
            aria-current={f.path === activePath ? 'true' : undefined}
            className={cn(
              'flex w-full items-center gap-1.5 px-2.5 py-1.5 text-start text-[11px] transition-colors',
              f.path === activePath
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
            )}
          >
            <FileCode2 className="h-3 w-3 shrink-0 opacity-70" />
            <span className="truncate" dir="ltr">
              {f.path}
            </span>
            {dirty && <span className="ms-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="تعديل غير محفوظ" />}
          </button>
        );
      })}
    </div>
  );
}