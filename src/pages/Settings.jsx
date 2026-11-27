import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CircleSlash, Loader2, Lock, RefreshCw } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROVIDERS, providerById } from '@/lib/providers';
import { getActive, setActive } from '@/lib/aiKeys';
import useProviderStatus from '@/hooks/useProviderStatus';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { statuses, loadingStatus, refreshStatus } = useProviderStatus();
  const [active, setActiveState] = useState(getActive());
  const [models, setModels] = useState(() => {
    const initial = {};
    PROVIDERS.forEach((p) => {
      initial[p.id] = p.models[0];
    });
    const current = getActive();
    initial[current.provider] = current.model;
    return initial;
  });

  function persistModel(providerId, model) {
    setModels((m) => ({ ...m, [providerId]: model }));
    if (active.provider === providerId) {
      setActive(providerId, model);
      setActiveState({ provider: providerId, model });
    }
  }

  function chooseActive(providerId) {
    const model = models[providerId] || providerById(providerId).models[0];
    setActive(providerId, model);
    setActiveState({ provider: providerId, model });
  }


  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          المشاريع
        </Link>

        <div className="mt-5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-primary" />
          اعتماد المزوّدين
        </div>
        <h1 className="mt-3 text-[26px] font-semibold tracking-tight">اتصالات المزوّدين</h1>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
          مفاتيح API لا تُدخل في هذه الواجهة أو المحادثة ولا تُخزَّن في المتصفح. أضفها كأسرار مُدارة على
          المنصّة؛ ويقرأها الخادم وحده عند تنفيذ البناء.
        </p>

        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-3 text-[11.5px] leading-relaxed text-foreground/80">
          <p className="flex items-center gap-1.5 font-medium">
            <Lock className="h-3.5 w-3.5 text-primary" />
            كيف يُربط المزوّد؟
          </p>
          <p className="mt-1.5 text-muted-foreground">
            من لوحة التطبيق: صفحة <span className="text-foreground">الأسرار (Secrets)</span> ← «Add Secret»،
            ويكون اسم السر مطابقاً تماماً للاسم المذكور في بطاقة المزوّد. لن يُقرأ المفتاح من المتصفح أو من
            الرسائل، ولن يظهر في السجلات.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/[.06] px-3.5 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
          <strong>تنبيه مهم:</strong> الحالة أدناه تتحقق من وجود اسم السر على المنصّة فقط. لا ترسل طلباً تجريبياً إلى مزوّد الذكاء الاصطناعي، ولا تستهلك رصيد API؛ لذلك لا تثبت أن المفتاح صالح أو أن الموديل متاح.
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-[11.5px] text-muted-foreground">
            {loadingStatus ? 'جارٍ فحص إعداد الأسرار…' : 'فحص إعداد الأسرار من الخادم'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStatus}
            disabled={loadingStatus}
            className="h-8 gap-1.5 rounded-lg border-border/80 px-2.5 text-[11px]"
          >
            {loadingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            تحديث الحالة
          </Button>
        </div>

        <div className="mt-3 space-y-3">
          {PROVIDERS.map((p) => {
            const isActive = active.provider === p.id;
            const configured = statuses[p.id] === true;
            return (
              <div
                key={p.id}
                className={cn(
                  'rounded-2xl border bg-card/50 p-4 transition-colors',
                  isActive ? 'border-primary/40' : 'border-border/70',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid h-8 w-8 place-items-center rounded-lg text-[12px] font-semibold text-black"
                      style={{ backgroundColor: p.accent }}
                    >
                      {p.name.slice(0, 1)}
                    </span>
                    <div>
                      <p className="flex items-center gap-2 text-[13px] font-medium">
                        {p.name}
                        {isActive && (
                          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9.5px] text-primary">
                            المستخدم للبناء
                          </span>
                        )}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground">{p.hint}</p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
                      configured
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/80 bg-secondary/60 text-muted-foreground',
                    )}
                  >
                    {configured ? <Check className="h-3 w-3" /> : <CircleSlash className="h-3 w-3" />}
                    {configured ? 'السر محفوظ' : 'السر غير مضبوط'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-border/70 bg-background/50 px-2 py-1 code-font text-[10px] text-muted-foreground" dir="ltr">
                    {p.secret}
                  </span>
                  <a
                    href={p.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                  >
                    احصل على مفتاح
                  </a>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10.5px] text-muted-foreground">الموديل</span>
                  <Input
                    list={`models-${p.id}`}
                    value={models[p.id] || ''}
                    onChange={(e) => persistModel(p.id, e.target.value)}
                    className="code-font h-8 w-[220px] border-border/70 bg-background/50 text-[11px]"
                    dir="ltr"
                  />
                  <datalist id={`models-${p.id}`}>
                    {p.models.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>

                  {!isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => chooseActive(p.id)}
                      className="h-8 rounded-lg border-border/80 px-2.5 text-[11px]"
                    >
                      استخدمه للبناء
                    </Button>
                  )}

                  {configured && (
                    <span className="text-[10.5px] text-primary">مفتاح API موجود على الخادم؛ لم تُختبر صلاحيته.</span>
                  )}
                </div>

                {!configured && (
                  <p className="mt-2 text-[10.5px] text-muted-foreground">
                    لن يعمل البناء مع هذا المزوّد حتى تضيف السر <span className="code-font" dir="ltr">{p.secret}</span> من لوحة أسرار التطبيق.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <section className="mt-8 rounded-2xl border border-border/70 bg-card/35 p-4 sm:p-5">
          <h2 className="text-[13px] font-semibold">مفاتيح API ليست اشتراكات أدوات البرمجة</h2>
          <p className="mt-2 text-[11.5px] leading-6 text-muted-foreground">
            AMAN FORGE يتصل بمزوّدي النماذج عبر مفاتيح API رسمية. اشتراك GitHub Copilot أو Claude Code لا يتحول تلقائياً إلى مفتاح API ولا يُستخدم هنا بديلاً عنه. أما VS Code فهو محرر برمجي، وليس مزوّد نموذج بحد ذاته. أي دعم لهذه المنتجات يحتاج تكاملاً مستقلاً وموثقاً.
          </p>
        </section>

        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          المزوّد المختار للبناء: {providerById(active.provider).name} · {active.model}
          {statuses[active.provider] ? ' (السر موجود؛ الصلاحية غير مؤكدة)' : ' (السر غير مضبوط)'}
        </p>
      </div>
    </AppShell>
  );
}