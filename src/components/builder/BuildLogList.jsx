import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CheckCircle2, Terminal, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { summarizeUsageLogs } from '@/lib/usageSummary';

function duration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n < 1000 ? `${Math.round(n)} م.ث` : `${(n / 1000).toFixed(1)} ث`;
}

function tokenCount(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n.toLocaleString('en-US') : '';
}

function usageSummary(log) {
  if (log.usage_source !== 'provider') return '';
  const input = tokenCount(log.input_tokens);
  const output = tokenCount(log.output_tokens);
  const total = tokenCount(log.total_tokens);
  if (!input && !output && !total) return '';
  return [
    input ? `إدخال ${input}` : '',
    output ? `إخراج ${output}` : '',
    total ? `الإجمالي ${total} token` : '',
  ].filter(Boolean).join(' · ');
}

export default function BuildLogList({ logs }) {
  const usageTotals = summarizeUsageLogs(logs);
  const formatTokens = (value) => value === null ? '—' : value.toLocaleString('en-US');

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
      {usageTotals.calls > 0 && (
        <section aria-label="استهلاك الذكاء الاصطناعي لهذا المشروع" className="border-b border-border/60 bg-emerald-300/[.035] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10.5px] font-medium text-emerald-100/85">استهلاك هذا المشروع</p>
            <span className="text-[9px] text-muted-foreground/60">من السجلات المعروضة · حتى 40 سجل</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <span className="block text-[9px] text-muted-foreground/60">استدعاءات مبلّغ عنها</span>
              <strong className="mt-1 block text-[15px] font-medium tabular-nums text-foreground">{formatTokens(usageTotals.calls)}</strong>
            </div>
            <div>
              <span className="block text-[9px] text-muted-foreground/60">إدخال</span>
              <strong className="mt-1 block text-[15px] font-medium tabular-nums text-foreground">{formatTokens(usageTotals.inputTokens)}</strong>
            </div>
            <div>
              <span className="block text-[9px] text-muted-foreground/60">إخراج</span>
              <strong className="mt-1 block text-[15px] font-medium tabular-nums text-foreground">{formatTokens(usageTotals.outputTokens)}</strong>
            </div>
            <div>
              <span className="block text-[9px] text-emerald-100/55">إجمالي معروف</span>
              <strong className="mt-1 block text-[15px] font-medium tabular-nums text-emerald-100">{formatTokens(usageTotals.totalTokens)}</strong>
            </div>
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground/50">بيانات المزوّد فقط؛ ليست سعراً أو فاتورة. الحقول غير المتاحة لا تُقدّر.</p>
        </section>
      )}
      <div className="divide-y divide-border/50">
        {logs.map((log) => {
          const ok = log.status === 'success';
          const Icon = ok ? CheckCircle2 : XCircle;
          const usage = usageSummary(log);
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
                {usage && (
                  <p className="mt-1 text-[10px] text-emerald-300/80" dir="auto">
                    {usage}
                  </p>
                )}
                {log.request_id && (
                  <p className="mt-0.5 truncate text-[9px] text-muted-foreground/45" dir="ltr">
                    Ref: {String(log.request_id).slice(0, 64)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}