import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VersionList({ versions, current, onRestore, busy }) {
  if (!versions.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <History className="h-5 w-5 text-muted-foreground" />
        <p className="text-[12.5px] font-medium">لا نسخ محفوظة بعد</p>
        <p className="max-w-[260px] text-[11.5px] leading-relaxed text-muted-foreground">
          كل عملية بناء تُحفظ كنسخة يمكنك الرجوع إليها في أي لحظة.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-border/50">
        {versions.map((v) => (
          <div key={v.id} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border/70 bg-card text-[10.5px] text-muted-foreground">
              v{v.number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium">{v.label || 'تحديث'}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{v.summary}</p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                {v.created_date
                  ? formatDistanceToNow(new Date(v.created_date), { addSuffix: true, locale: ar })
                  : ''}{' '}
                · {(v.files || []).length} ملف
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || v.number === current}
              onClick={() => onRestore(v)}
              className="h-7 shrink-0 gap-1 rounded-lg border-border/80 px-2 text-[10.5px]"
            >
              <RotateCcw className="h-3 w-3" />
              {v.number === current ? 'الحالية' : 'استعادة'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}