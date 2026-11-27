import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  ArrowLeft, ArrowUpLeft, Blocks, Check, Code2,
  Activity, Eye, FolderKanban, Layers3, Loader2, Plus, Sparkles, WandSparkles,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import ProjectCard from '@/components/ProjectCard';
import MotionPreviewCard from '@/components/MotionPreviewCard';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { sessionKey } from '@/lib/session';
import { getActive } from '@/lib/aiKeys';
import { providerById } from '@/lib/providers';
import { groupUsageByProvider, summarizeUsageLogs } from '@/lib/usageSummary';

const SUGGESTIONS = [
  'منصة تجارة إلكترونية فاخرة مع لوحة تحكم متكاملة',
  'موقع شركة سينمائي بتجربة تمرير تفاعلية',
  'نظام SaaS لإدارة العملاء والعمليات',
];

const SHOWCASES = [
  {
    title: 'Cinematic Commerce',
    type: 'DIGITAL FLAGSHIP',
    caption: 'OBJECT / 001',
    description: 'تجربة تجارة رقمية تُعامل المنتج كقطعة فنية، لا كبطاقة داخل متجر.',
    video: 'https://media.base44.com/videos/public/6af0b5fbbe40907131e42442/c7039f8af_forge-commerce.mp4',
    poster: 'https://media.base44.com/images/public/6af0b5fbbe40907131e42442/503e73590_forge-commerce.webp',
  },
  {
    title: 'Atelier — Motion Lab',
    type: 'INTERACTIVE 3D',
    caption: 'MOTION / 002',
    description: 'لغة بصرية حركية تجمع الشكل والعمق والإيقاع في مشهد واحد.',
    video: 'https://media.base44.com/videos/public/6af0b5fbbe40907131e42442/247981de6_forge-atelier.mp4',
    poster: 'https://media.base44.com/images/public/6af0b5fbbe40907131e42442/f9eb4fac0_forge-atelier.webp',
  },
  {
    title: 'Signal Intelligence',
    type: 'DATA EXPERIENCE',
    caption: 'SYSTEM / 003',
    description: 'لوحة معلومات حيّة، واضحة، ومبنية حول الإشارة الأهم لا حول الزخرفة.',
    video: 'https://media.base44.com/videos/public/6af0b5fbbe40907131e42442/0af553e5f_forge-signal.mp4',
    poster: 'https://media.base44.com/images/public/6af0b5fbbe40907131e42442/335ff983c_forge-signal.webp',
  },
];

function formatProjectDate(date) {
  if (!date) return 'مشروع محفوظ';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'مشروع محفوظ';
  return formatDistanceToNow(parsed, { addSuffix: true, locale: ar });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [usageLogs, setUsageLogs] = useState([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState('');
  const composerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError('');
    setUsageLoading(true);
    setUsageError('');
    // Usage rows are already owner-scoped by BuildLog RLS. This dashboard reads
    // only the latest 100 provider-reported usage records; it is not a billing
    // ledger or a lifetime total.
    base44.entities.BuildLog.filter(
      { usage_source: 'provider' },
      { sort: '-created_date', limit: 100 },
    )
      .then((page) => { if (alive) setUsageLogs(page.items || []); })
      .catch(() => {
        if (alive) setUsageError('تعذّر تحميل ملخص الاستخدام الآن.');
      })
      .finally(() => { if (alive) setUsageLoading(false); });

    // Project RLS already scopes this query to the signed-in owner. Do not
    // filter by a browser-local session key: that hid projects on other devices.
    base44.entities.Project.filter({}, { sort: '-updated_date', limit: 24 })
      .then((page) => { if (alive) setProjects(page.items || []); })
      .catch(() => {
        if (alive) setLoadError('تعذّر تحميل مشاريع حسابك الآن. أعد المحاولة؛ لم تُحذف بياناتك.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadToken]);

  async function createProject() {
    const text = prompt.trim();
    if (!text || creating) return;
    setCreating(true);
    setError('');
    try {
      const active = getActive();
      const project = await base44.entities.Project.create({
        title: text.split('\n')[0].slice(0, 70),
        description: text.slice(0, 300),
        initial_prompt: text,
        session_key: sessionKey(),
        provider: active.provider,
        model: active.model,
        status: 'draft',
        version: 0,
        files: [],
      });
      navigate(`/project/${project.id}`);
    } catch {
      setError('تعذّر إنشاء المشروع. تحقّق من الاتصال ثم أعد المحاولة.');
      setCreating(false);
    }
  }

  const active = getActive();
  const provider = providerById(active.provider);
  const usageSummary = summarizeUsageLogs(usageLogs);
  const usageBreakdown = groupUsageByProvider(usageLogs, 4);
  const formatUsage = (value) => value === null ? '—' : value.toLocaleString('en-US');

  return (
    <AppShell wide>
      <div className="forge-dashboard relative isolate overflow-hidden">
        <div className="forge-atmosphere" aria-hidden="true" />
        <div className="forge-grid-plane" aria-hidden="true" />

        <section className="forge-hero mx-auto max-w-[1600px] px-5 pb-14 pt-9 sm:px-8 lg:pb-20 lg:pt-14">
          <div className="forge-hero-topline">
            <div className="forge-eyebrow"><span className="forge-eyebrow-mark"><Sparkles size={13} /></span> PRIVATE AI BUILD ENVIRONMENT</div>
            <div className="forge-system-state"><span /> SYSTEM READY <span className="forge-state-divider">/</span> WORKSPACE 01</div>
          </div>

          <div className="grid items-center gap-10 pt-9 lg:grid-cols-[.92fr_1.08fr] lg:gap-14 lg:pt-12">
            <div className="forge-hero-copy">
              <p className="forge-kicker">IDEA → ENGINEERING → PRODUCT</p>
              <h1 className="forge-display-title">
                لا تكتفِ<br />
                <span>بوصف فكرتك.</span>
                <br />
                ابنِها.
              </h1>
              <p className="forge-hero-description">
                مساحة عمل واحدة لتحويل الفكرة إلى منتج حقيقي — ملفات قابلة للتعديل، معاينة مباشرة، وذكاء اصطناعي يعمل داخل سير بناء واضح.
              </p>
              <div className="forge-proof-row">
                <div><span className="forge-proof-icon"><Code2 size={15} /></span><span><strong>REAL CODE</strong><small>ملفات فعلية</small></span></div>
                <div><span className="forge-proof-icon"><Eye size={15} /></span><span><strong>LIVE PREVIEW</strong><small>معاينة مباشرة</small></span></div>
                <div><span className="forge-proof-icon"><Layers3 size={15} /></span><span><strong>VERSIONED</strong><small>نسخ محفوظة</small></span></div>
              </div>
            </div>

            <div className="forge-composer-wrap">
              <div className="forge-composer-orbit" aria-hidden="true" />
              <div className="forge-composer">
                <div className="forge-composer-header">
                  <div className="flex items-center gap-3">
                    <span className="forge-composer-icon"><WandSparkles size={18} /></span>
                    <div>
                      <p className="forge-composer-title">مساحة إنشاء جديدة</p>
                      <p className="forge-composer-subtitle">ابدأ بالنتيجة التي تريد بناءها</p>
                    </div>
                  </div>
                  <span className="forge-composer-index">BUILD / 001</span>
                </div>

                <label htmlFor="project-prompt" className="sr-only">وصف المشروع</label>
                <textarea
                  id="project-prompt"
                  ref={composerRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      createProject();
                    }
                  }}
                  rows={5}
                  placeholder="صف المنتج الذي تريد إطلاقه…\nما المشكلة التي يحلّها؟ وكيف يجب أن يعمل؟"
                  className="forge-prompt-input"
                />

                <div className="forge-suggestions">
                  <span className="forge-suggestions-label">ابدأ من مسار:</span>
                  {SUGGESTIONS.map((suggestion, index) => (
                    <button
                      type="button"
                      key={suggestion}
                      className="forge-suggestion"
                      onClick={() => { setPrompt(suggestion); composerRef.current?.focus(); }}
                    >
                      <span>0{index + 1}</span>{suggestion}
                    </button>
                  ))}
                </div>

                <div className="forge-composer-footer">
                  <div className="forge-model-status">
                    <span className="forge-model-dot" />
                    <span>{provider.name}</span>
                    <span className="forge-footer-divider">/</span>
                    <code>{active.model}</code>
                  </div>
                  <Button
                    onClick={createProject}
                    disabled={!prompt.trim() || creating}
                    className="forge-create-button"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>ابدأ البناء</span><ArrowLeft className="h-4 w-4" /></>}
                  </Button>
                </div>
                {error && <p role="alert" className="forge-create-error">{error}</p>}
                <div className="forge-composer-footnote"><Check size={12} /> مشروعك يُحفظ داخل مساحة العمل مع سجل نسخه وملفاته</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-5 pb-9 sm:px-8">
          <div className="grid gap-5 rounded-2xl border border-white/[.09] bg-white/[.025] px-5 py-5 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:px-7">
            <div>
              <p className="forge-section-kicker">AI USAGE <span>— RECENT RECORDS</span></p>
              <h2 className="mt-2 text-[19px] font-medium text-[#edf2e8]">استهلاك المزوّدين</h2>
              <p className="mt-2 max-w-[440px] text-[11px] leading-6 text-[#a8b7a5]/65">
                أحدث 100 سجل استهلاك أبلغ بها المزوّد. هذه أعداد رموز فعلية عند توفرها، وليست تقديراً للتكلفة أو فاتورة بالدولار.
              </p>
              {usageError && <p role="status" className="mt-2 text-[10px] text-amber-200/80">{usageError}</p>}
            </div>
            {usageLoading ? (
              <div className="flex min-h-24 items-center justify-center gap-2 text-[11px] text-[#9eab9b]/70">
                <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل سجلات الاستخدام…
              </div>
            ) : usageError ? (
              <div className="flex min-h-24 items-center justify-center text-[11px] text-[#9eab9b]/60">
                بيانات الاستخدام غير متاحة حالياً.
              </div>
            ) : usageSummary.calls === 0 ? (
              <div className="flex min-h-24 items-center justify-center gap-2 text-[11px] text-[#9eab9b]/60">
                <Activity size={16} /> ستظهر القياسات بعد أول استدعاء يعيد بيانات الرموز.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/[.07] bg-black/20 px-3 py-3">
                    <span className="text-[9px] text-[#9eab9b]/60">استدعاءات موثّقة</span>
                    <strong className="mt-2 block text-[21px] font-medium tabular-nums text-[#e7eee2]">{formatUsage(usageSummary.calls)}</strong>
                  </div>
                  <div className="rounded-xl border border-white/[.07] bg-black/20 px-3 py-3">
                    <span className="text-[9px] text-[#9eab9b]/60">رموز الإدخال</span>
                    <strong className="mt-2 block text-[21px] font-medium tabular-nums text-[#e7eee2]">{formatUsage(usageSummary.inputTokens)}</strong>
                  </div>
                  <div className="rounded-xl border border-white/[.07] bg-black/20 px-3 py-3">
                    <span className="text-[9px] text-[#9eab9b]/60">رموز الإخراج</span>
                    <strong className="mt-2 block text-[21px] font-medium tabular-nums text-[#e7eee2]">{formatUsage(usageSummary.outputTokens)}</strong>
                  </div>
                  <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.045] px-3 py-3">
                    <span className="text-[9px] text-emerald-100/55">الإجمالي المبلّغ</span>
                    <strong className="mt-2 block text-[21px] font-medium tabular-nums text-emerald-100">{formatUsage(usageSummary.totalTokens)}</strong>
                    <span className="mt-1 block text-[8px] text-emerald-100/40">{formatUsage(usageSummary.totalReportedCalls)} سجل بإجمالي متاح</span>
                  </div>
                </div>
                {usageBreakdown.length > 0 && (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {usageBreakdown.map((item) => (
                      <div key={item.provider + item.model} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/[.06] bg-black/15 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-medium text-[#dce6d7]">{item.provider}</p>
                          <p className="truncate text-[9px] text-[#9eab9b]/55" dir="auto">{item.model} · {formatUsage(item.calls)} استدعاء</p>
                        </div>
                        <div className="shrink-0 text-left">
                          <span className="block text-[9px] text-[#9eab9b]/55">الإجمالي المعروف</span>
                          <strong className="text-[12px] font-medium tabular-nums text-emerald-100">{formatUsage(item.totalTokens)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-5 pb-16 sm:px-8 lg:pb-20">
          <div className="forge-section-heading">
            <div>
              <p className="forge-section-kicker">SELECTED MOTION STUDIES <span>— 01 / 03</span></p>
              <h2>شاهد ما يمكن بناؤه.</h2>
              <p>ثلاث دراسات فيديو فعلية تُظهر مستوى الإخراج البصري داخل بيئة FORGE.</p>
            </div>
            <span className="forge-section-meta"><span /> MP4 / H.264 <span className="forge-section-meta-divider">·</span> ON-DEMAND</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SHOWCASES.map((item, index) => <MotionPreviewCard key={item.title} item={item} index={index} />)}
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-5 pb-14 sm:px-8">
          <Link to="/studio/integrations" className="forge-stack-banner group">
            <span className="forge-stack-icon"><Blocks size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="forge-stack-kicker">CONNECTED CREATIVE STACK</span>
              <span className="forge-stack-title">منظومة الأدوات والتكاملات</span>
              <span className="forge-stack-description">Codex · Figma · Vercel · FastAPI · n8n · xAPI · LinkupAPI</span>
            </span>
            <span className="forge-stack-action">استكشف المنظومة <ArrowUpLeft size={17} /></span>
          </Link>
        </section>

        <section className="mx-auto max-w-[1600px] px-5 pb-24 sm:px-8">
          <div className="forge-project-heading">
            <div>
              <p className="forge-section-kicker">YOUR WORKSPACE <span>— ARCHIVE</span></p>
              <h2>المشاريع</h2>
              <p>{projects.length ? `${projects.length} مشروع محفوظ في حسابك` : loadError ? 'تعذّر تحديث أرشيف المشاريع.' : 'كل مشروع يحتفظ بملفاته ونسخه وسجل بنائه.'}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => { composerRef.current?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="forge-new-project-button"
            >
              <Plus size={15} /> مشروع جديد
            </Button>
          </div>
          {loadError && (
            <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-4 py-3 text-[11px] text-amber-100/80">
              <span>{loadError}</span>
              <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="rounded-lg border border-amber-300/25 px-3 py-1.5 text-[10px] transition-colors hover:bg-amber-300/10">إعادة المحاولة</button>
            </div>
          )}
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[.025]" />)}
            </div>
          ) : projects.length === 0 ? (
            loadError ? null : (
              <div className="forge-empty-state">
                <FolderKanban size={24} />
                <p>مساحة العمل جاهزة لأول مشروع.</p>
                <span>ابدأ من محرّك الإنشاء في الأعلى.</span>
              </div>
            )
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={{
                    ...project,
                    name: project.title || project.name || project.initial_prompt?.split('\n')[0],
                    updated: formatProjectDate(project.updated_date),
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
