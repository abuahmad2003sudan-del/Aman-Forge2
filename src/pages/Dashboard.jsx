import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  ArrowLeft, ArrowUpLeft, Blocks, Check, Code2,
  Eye, FolderKanban, Layers3, Loader2, Plus, Sparkles, WandSparkles,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import ProjectCard from '@/components/ProjectCard';
import MotionPreviewCard from '@/components/MotionPreviewCard';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { sessionKey } from '@/lib/session';
import { getActive } from '@/lib/aiKeys';
import { providerById } from '@/lib/providers';

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
  const composerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError('');
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
