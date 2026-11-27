import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Loader2, Lock, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'أضِف وضعاً ليلياً',
  'حسّن تصميم الشاشة الرئيسية',
  'أضف نموذج تواصل مع تحقق من المدخلات',
  'أضف حفظاً محلياً للبيانات',
];

export default function ChatPanel({
  messages,
  busy,
  error,
  onSend,
  onRetry,
  canRetry = false,
  hasFiles,
  configured = false,
  providerLabel = '',
  secretName = '',
  agentMode = 'fast',
  onAgentModeChange = (nextMode) => { void nextMode; },
}) {
  const [value, setValue] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, error]);

  function submit() {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue('');
  }

  return (
    <div className="flex h-[70vh] flex-col lg:h-full">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
        <span className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          محادثة البناء
        </span>
        <span className="text-[10.5px] text-muted-foreground/70">{messages.length} رسالة</span>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="محادثة البناء"
        className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && !busy && (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/30 px-4 py-6 text-center">
            <p className="text-[12.5px] font-medium">
              {hasFiles ? 'اطلب أي تعديل على تطبيقك' : 'ابدأ بوصف ما تريد بناءه'}
            </p>
            <p className="mx-auto mt-1 max-w-[260px] text-[11.5px] leading-relaxed text-muted-foreground">
              {hasFiles
                ? 'مثال: أضف صفحة تسعير بثلاث خطط، وحوّل الأزرار إلى لون مميز.'
                : 'اكتب الفكرة بلغتك العادية، وسيولّد نواة الملفات ويعاينها فوراً.'}
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-start' : 'justify-end')}>
            <div
              className={cn(
                'max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed',
                m.role === 'user'
                  ? 'rounded-tr-sm bg-primary text-primary-foreground'
                  : 'rounded-tl-sm border border-border/70 bg-card text-foreground/90',
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-end">
            <div
              role="status"
              className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border/70 bg-card px-3.5 py-2.5 text-[12px] text-muted-foreground"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              {agentMode === 'deep' ? 'نواة يخطط وينفذ…' : 'نواة يكتب الكود…'}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-[11.5px] leading-relaxed text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="flex-1">
              <span>{error}</span>
              {canRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={busy}
                  className="mt-1.5 flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[10.5px] transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  إعادة المحاولة بنفس الطلب
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 p-3">
        {!configured && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10.5px] leading-relaxed text-amber-200">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              لم يُضبط مفتاح API لمزوّد {providerLabel} بعد — أضِف السر{' '}
              <span className="code-font" dir="ltr">
                {secretName}
              </span>{' '}
              من صفحة الأسرار في لوحة التطبيق، ثم أعد المحاولة.
            </span>
          </div>
        )}
        {configured && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[.05] px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            <Lock className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span>السر موجود على الخادم. لم نرسل طلب اختبار مدفوع؛ صلاحية المفتاح والموديل لا تتأكد إلا عند تنفيذ بناء فعلي.</span>
          </div>
        )}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/30 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-medium">نمط الوكيل</p>
            <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted-foreground">
              {agentMode === 'deep'
                ? 'تخطيط مستقل ثم تنفيذ وفحص بنية الملفات · استدعاء إضافي للموديل وقد يزيد التكلفة.'
                : 'تنفيذ مباشر باستدعاء واحد للموديل.'}
            </p>
          </div>
          <div role="group" aria-label="اختيار نمط البناء" className="flex shrink-0 items-center rounded-lg border border-border/70 p-0.5">
            <button
              type="button"
              onClick={() => onAgentModeChange('fast')}
              disabled={busy}
              aria-pressed={agentMode === 'fast'}
              className={cn('rounded-md px-2.5 py-1.5 text-[10px] transition-colors disabled:opacity-50', agentMode === 'fast' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              سريع
            </button>
            <button
              type="button"
              onClick={() => onAgentModeChange('deep')}
              disabled={busy}
              aria-pressed={agentMode === 'deep'}
              className={cn('rounded-md px-2.5 py-1.5 text-[10px] transition-colors disabled:opacity-50', agentMode === 'deep' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              متعمّق
            </button>
          </div>
        </div>

        {hasFiles && (
          <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSend(s)}
                disabled={busy || !configured}
                className="shrink-0 rounded-full border border-border/70 px-2.5 py-1 text-[10.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border/80 bg-card/60 p-1.5 focus-within:border-primary/40">
          <textarea
            value={value}
            aria-label={hasFiles ? 'اطلب تعديلاً على التطبيق' : 'صف التطبيق الذي تريد بناءه'}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder={hasFiles ? 'اطلب تعديلاً…' : 'صف تطبيقك…'}
            className="w-full resize-none bg-transparent px-2 py-1.5 text-[12.5px] leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <div className="flex items-center justify-between px-1 pb-0.5">
            <span className="text-[10px] text-muted-foreground/60">Enter للإرسال · Shift+Enter لسطر جديد</span>
            <Button
              size="sm"
              onClick={submit}
              disabled={!value.trim() || busy || !configured}
              className="h-7 gap-1.5 rounded-lg px-2.5 text-[11.5px]"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeft className="h-3.5 w-3.5" />}
              إرسال
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}