import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CheckCircle2, Terminal, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function duration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n < 1000 ? `${Math.round(n)} م.ث` : `${(n / 1000).toFixed(1)} ث`;
}

export default function BuildLogList({ logs }) {
  if (!logs.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <Terminal className="h-5 w-5 text-muted-foreground" />
        <p className="text-[12.5px] font-medium">لا سجل بعد</p>
        <p className="max-w-[280px] text-[11.5px] leading-relaxed text-muted-foreground">
          كل عملية بناء تُسجَّل هنا بنتيجتها ومدّتها، بما فيها الأخطاء — لتعرف ما حدث بالضبط.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-border/50">
        {logs.map((log) => {
          const ok = log.status === 'success';
          const Icon = ok ? CheckCircle2 : XCircle;
          return (
            <div key={log.id} className="flex items-start gap-2.5 px-4 py-2.5">
              <Icon
                className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', ok ? 'text-emerald-400' : 'text-destructive')}
                aria-label={ok ? 'نجح' : 'فشل'}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11.5px] font-medium">
                    {log.stage || (ok ? 'بناء' : 'خطأ')}
                    {ok && log.version ? ` · النسخة ${log.version}` : ''}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground/70" dir="auto">
                    {log.duration_ms ? `${duration(log.duration_ms)} · ` : ''}
                    {log.created_date
                      ? formatDistanceToNow(new Date(log.created_date), { addSuffix: true, locale: ar })
                      : ''}
                  </span>
                </div>
                {log.message && (
                  <p
                    className={cn(
                      'mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed',
                      ok ? 'line-clamp-2 text-muted-foreground' : 'text-destructive',
                    )}
                  >
                    {log.message}
                  </p>
                )}
                <p className="mt-1 truncate text-[10px] text-muted-foreground/60" dir="auto">
                  {[log.provider, log.model].filter(Boolean).join(' · ')}
                  {log.prompt ? ` · ${log.prompt}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}