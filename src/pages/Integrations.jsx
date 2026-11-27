import { useMemo, useState } from 'react';
import {
  ArrowUpLeft, Blocks, Code2, Database, ExternalLink,
  Globe2, Layers3, Link2, Search, ShieldCheck, Workflow, X,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { CONNECTOR_CATALOG, CATALOG_SNAPSHOT } from '@/lib/connectorCatalog';
import { cn } from '@/lib/utils';

const GROUPS = [
  'الكل',
  'التطوير والبنية',
  'البيانات والتحليلات',
  'العمل والتعاون',
  'التسويق والمحتوى',
  'التجارة والمال',
  'العمليات والخدمات',
];

function groupFor(type) {
  const dev = /^(github|gitlab|bitbucket|supabase|hugging_face|sentry|datadog|contentful)$/;
  const data = /^(googlebigquery|snowflake|databricks|google_analytics|google_search_console|posthog)$/;
  const collab = /^(googlecalendar|googledrive|gmail|googlesheets|googledocs|googleslides|googlemeet|googletasks|google_classroom|googleworkspace|slack|slackbot|notion|outlook|microsoft_teams|share_point|one_drive|one_note|excel|microsoft_graph|microsoft_word|microsoft_powerpoint|dropbox|box|airtable|miro)$/;
  const marketing = /^(linkedin|tiktok|instagram|facebook_pages|meta_ads|x|youtube|klaviyo|mailchimp|omnisend|gumroad)$/;
  const commerce = /^(quickbooks|square|freshbooks|moneybird|wave|polar|shippo|splitwise)$/;
  if (dev.test(type)) return 'التطوير والبنية';
  if (data.test(type)) return 'البيانات والتحليلات';
  if (collab.test(type)) return 'العمل والتعاون';
  if (marketing.test(type)) return 'التسويق والمحتوى';
  if (commerce.test(type)) return 'التجارة والمال';
  return 'العمليات والخدمات';
}

function modeLabel(mode) {
  if (mode === 'shared_only') return 'اتصال مشترك';
  if (mode === 'byo_shared_and_app_user') return 'BYO / مشترك';
  return 'OAuth للحساب';
}

function connectorInitials(name) {
  const words = String(name || '').replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return String(words[0] || 'IN').slice(0, 2).toUpperCase();
}

const GROUP_ICONS = {
  'التطوير والبنية': Code2,
  'البيانات والتحليلات': Database,
  'العمل والتعاون': Layers3,
  'التسويق والمحتوى': Globe2,
  'التجارة والمال': Blocks,
  'العمليات والخدمات': Workflow,
};

export default function Integrations() {
  const [group, setGroup] = useState('الكل');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const visible = useMemo(() => CONNECTOR_CATALOG.filter((item) => {
    const category = groupFor(item.type);
    const groupMatch = group === 'الكل' || category === group;
    const q = query.trim().toLocaleLowerCase();
    const searchMatch = !q || [item.name, item.type, item.description, category]
      .join(' ').toLocaleLowerCase().includes(q);
    return groupMatch && searchMatch;
  }), [group, query]);

  const connectedCount = CONNECTOR_CATALOG.filter((item) => item.connected).length;
  const availableCount = CONNECTOR_CATALOG.length - connectedCount;

  return (
    <AppShell wide>
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[540px] bg-[radial-gradient(ellipse_at_48%_0%,rgba(130,205,129,.12),transparent_65%)]" />
        <div className="mx-auto max-w-[1560px] px-4 pb-20 pt-8 sm:px-7 lg:px-10 lg:pt-12">
          <header className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(130deg,rgba(20,34,25,.94),rgba(9,14,11,.96)_58%,rgba(14,19,15,.94))] p-6 sm:p-9">
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-emerald-100/10" />
            <div className="pointer-events-none absolute -right-5 -top-14 h-56 w-56 rounded-full border border-emerald-100/[.07]" />
            <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
              <div className="max-w-3xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[.07] px-3 py-1.5 text-[9px] font-semibold tracking-[.2em] text-primary">
                  <Blocks className="h-3.5 w-3.5" /> FORGE / INTEGRATION FABRIC
                </div>
                <h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-5xl">شبّك أدواتك.<br/><span className="text-primary">لا تخلط الإتاحة بالاتصال.</span></h1>
                <p className="mt-5 max-w-2xl text-xs leading-7 text-white/55 sm:text-sm">
                  فهرس موصلات Base44 الرسمي الذي فُحص من التطبيق: 89 خدمة. هذه القائمة تثبت أن الموصل متاح في الكتالوج فقط؛ لا تعني أن حسابك منح الإذن أو أن AMAN يستطيع استخدامه الآن.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[350px]">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="font-mono text-3xl text-white">{CONNECTOR_CATALOG.length}</p>
                  <p className="mt-1 text-[10px] text-white/45">موصل في الكتالوج</p>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[.06] p-4">
                  <p className="font-mono text-3xl text-emerald-200">{connectedCount}</p>
                  <p className="mt-1 text-[10px] text-white/45">اتصال مُثبت حالياً</p>
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <span className="text-[10px] text-white/45">آخر فحص للكتالوج</span>
                  <span className="font-mono text-[10px] text-white/70">{CATALOG_SNAPSHOT}</span>
                </div>
              </div>
            </div>
            <div className="relative mt-7 flex flex-wrap items-center gap-2 border-t border-white/[.08] pt-5 text-[10px] text-white/45">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300"/> بيانات اعتماد الخادم فقط</span>
              <span className="text-white/20">/</span>
              <span>{availableCount} موصل غير مربوط</span>
              <span className="text-white/20">/</span>
              <span>لا تُخزّن المفاتيح في المتصفح</span>
            </div>
          </header>

          <section className="mt-7 rounded-2xl border border-white/10 bg-[#0c110e] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2" role="group" aria-label="تصنيف الموصلات">
                {GROUPS.map((item) => {
                  const Icon = GROUP_ICONS[item];
                  return (
                    <button key={item} type="button" onClick={() => setGroup(item)} aria-pressed={group === item}
                      className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] transition-colors',
                        group === item ? 'border-primary/35 bg-primary/10 text-primary' : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/80')}>
                      {Icon && <Icon className="h-3 w-3"/>}{item}
                    </button>
                  );
                })}
              </div>
              <label className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 lg:w-80">
                <Search className="h-3.5 w-3.5 text-white/35"/>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم الخدمة أو نوعها…"
                  aria-label="ابحث في موصلات Base44" className="w-full bg-transparent text-xs outline-none placeholder:text-white/30"/>
                {query && <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث"><X className="h-3.5 w-3.5 text-white/40"/></button>}
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/[.07] pt-3">
              <p className="text-[10px] text-white/45">يعرض {visible.length} من {CONNECTOR_CATALOG.length} خدمة</p>
              <p className="text-[9px] text-white/30">التصنيف لا يمنح صلاحية الوصول</p>
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => {
              const category = groupFor(item.type);
              const connected = item.connected;
              return (
                <article key={item.type} className="group flex min-w-0 flex-col rounded-2xl border border-white/[.09] bg-[#0d120f] p-4 transition-colors hover:border-emerald-200/20 hover:bg-[#101812]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-white/[.08] to-transparent font-mono text-xs font-semibold text-emerald-100/80">
                        {connectorInitials(item.name)}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-[12px] font-semibold text-white/90">{item.name}</h2>
                        <p className="mt-1 truncate font-mono text-[8px] text-white/30" dir="ltr">{item.type}</p>
                      </div>
                    </div>
                    <span className={cn('mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[8px]',
                      connected ? 'border-emerald-300/20 bg-emerald-300/[.07] text-emerald-200' : 'border-amber-200/15 bg-amber-100/[.04] text-amber-100/70')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-emerald-300' : 'bg-amber-200/60')}/>
                      {connected ? 'متصل' : 'غير متصل'}
                    </span>
                  </div>
                  <p className="mt-3 min-h-[48px] text-[10.5px] leading-6 text-white/48">{item.description}</p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-white/[.07] pt-3">
                    <span className="text-[9px] text-white/35">{category}</span>
                    <span className="rounded-full border border-white/10 bg-white/[.025] px-2 py-1 text-[8px] text-white/45">{modeLabel(item.mode)}</span>
                  </div>
                  <button type="button" onClick={() => setSelected(item)} className="mt-3 inline-flex items-center justify-between rounded-lg border border-white/[.08] px-3 py-2 text-[9px] text-white/55 transition-colors hover:border-primary/25 hover:text-primary">
                    تفاصيل الاتصال <ArrowUpLeft className="h-3 w-3"/>
                  </button>
                </article>
              );
            })}
          </section>

          {visible.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 py-16 text-center text-xs text-white/45">لا توجد نتائج مطابقة.</div>
          )}

          <section className="mt-9 grid gap-3 lg:grid-cols-2">
            <article className="rounded-2xl border border-emerald-200/15 bg-gradient-to-br from-emerald-200/[.06] to-transparent p-5">
              <div className="flex items-center gap-2 text-emerald-200"><ShieldCheck className="h-4 w-4"/><span className="text-[10px] font-semibold tracking-[.15em]">SECURE CONNECTION MODEL</span></div>
              <h2 className="mt-3 text-sm font-semibold">الاتصال يتم بموافقة منفصلة.</h2>
              <p className="mt-2 text-[10.5px] leading-6 text-white/50">موصلات OAuth تحتاج إعداداً وموافقة من حساب المالك داخل Base44. بعد الربط يمكن للدوال الخلفية استخدام رمز الوصول عبر connectors.getConnection؛ لا تنتقل الرموز إلى المتصفح.</p>
              <a href="https://app.base44.com/apps/6af0b5fbbe40907131e42442/editor/preview" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200/20 bg-emerald-200/[.06] px-3 py-2 text-[9px] text-emerald-100 hover:bg-emerald-200/[.1]">
                فتح محرر Base44 لإعداد الموصلات <ExternalLink className="h-3 w-3"/>
              </a>
            </article>
            <article className="rounded-2xl border border-white/10 bg-[#0d120f] p-5">
              <div className="flex items-center gap-2 text-sky-200"><Link2 className="h-4 w-4"/><span className="text-[10px] font-semibold tracking-[.15em]">EXTERNAL MCP SERVERS</span></div>
              <h2 className="mt-3 text-sm font-semibold">MCP ليس هو نفسه موصل OAuth.</h2>
              <p className="mt-2 text-[10.5px] leading-6 text-white/50">هذه الـ89 خدمة هي كتالوج موصلات Base44، وليست قائمة بكل خوادم MCP في العالم أو كل تطبيقات ChatGPT. لا يوجد حالياً خادم MCP خارجي مسجّل في AMAN؛ نحتاج طبقة مصادقة آمنة واكتشاف أدوات وخادم وسيط قبل وصف أي خادم بأنه متصل.</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[9px] text-white/45">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-200/70"/> لا توجد خوادم MCP خارجية مرتبطة
              </div>
            </article>
          </section>
        </div>
      </div>

      {selected && (
        <div
          role="presentation"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="connector-detail-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b110e] p-5 text-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="connector-detail-title" className="text-base font-semibold">{selected.name}</h2>
                <p className="mt-2 text-xs leading-6 text-white/45">{selected.description}</p>
              </div>
              <button type="button" autoFocus onClick={() => setSelected(null)} aria-label="إغلاق التفاصيل" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-white/60 hover:text-white">
                <X className="h-4 w-4"/>
              </button>
            </header>
            <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/[.025] p-4">
              <div className="flex items-center justify-between gap-3 text-[10px]">
                <span className="text-white/40">نوع الموصل</span>
                <code dir="ltr" className="text-white/75">{selected.type}</code>
              </div>
              <div className="flex items-center justify-between gap-3 text-[10px]">
                <span className="text-white/40">طريقة الاتصال</span>
                <span className="text-white/75">{modeLabel(selected.mode)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[10px]">
                <span className="text-white/40">الحالة عند آخر فحص</span>
                <span className={selected.connected ? 'text-emerald-200' : 'text-amber-100/75'}>{selected.connected ? 'متصل' : 'غير متصل'}</span>
              </div>
            </div>
            <p className="mt-4 text-[10px] leading-6 text-white/45">
              هذا الموصل متاح في كتالوج Base44، لكنه لم يكن متصلاً عند آخر فحص ({CATALOG_SNAPSHOT}). لم نطلب صلاحيات OAuth ولم نغيّر إعدادات حسابك.
            </p>
            <a href="https://app.base44.com/apps/6af0b5fbbe40907131e42442/editor/preview" target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2.5 text-[10px] text-primary">
              فتح محرر التطبيق <ExternalLink className="h-3 w-3"/>
            </a>
          </section>
        </div>
      )}
    </AppShell>
  );
}
