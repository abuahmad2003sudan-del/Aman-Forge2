import { Link } from 'react-router-dom';
import { ArrowUpLeft, Clock3, FileCode2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS = {
  draft: { label: 'مسودة', dot: 'bg-white/35', tone: 'neutral' },
  building: { label: 'قيد البناء', dot: 'bg-primary', tone: 'active' },
  ready: { label: 'جاهز', dot: 'bg-emerald-400', tone: 'success' },
  error: { label: 'يحتاج مراجعة', dot: 'bg-destructive', tone: 'danger' },
};

export default function ProjectCard({ project }) {
  const status = STATUS[project.status] || STATUS.draft;
  const displayName = (project.name || project.title || project.initial_prompt?.split('\n')[0] || 'مشروع جديد').trim();
  const description = project.description || project.initial_prompt || 'مساحة عمل محفوظة وجاهزة للمتابعة.';
  const fileCount = Array.isArray(project.files) ? project.files.length : 0;

  const inner = (
    <div className="forge-project-card group">
      <div className="forge-project-card-top">
        <span className="forge-project-card-code">FORGE / PROJECT</span>
        <span className={cn('forge-project-status', `status-${status.tone}`)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
          {status.label}
        </span>
      </div>
      <h3 className="forge-project-name">{displayName}</h3>
      <p className="forge-project-description">{description}</p>
      <div className="forge-project-card-bottom">
        <div className="forge-project-facts">
          <span><Clock3 size={12} />{project.updated || 'مشروع محفوظ'}</span>
          <span><FileCode2 size={12} />{fileCount} ملف</span>
        </div>
        <span className="forge-project-open">فتح الاستوديو <ArrowUpLeft size={15} /></span>
      </div>
      <span className="forge-project-edge" aria-hidden="true" />
    </div>
  );

  if (!project.id) return <div className="h-full opacity-80">{inner}</div>;
  return <Link to={`/project/${project.id}`} className="block h-full" aria-label={`فتح مشروع ${displayName}`}>{inner}</Link>;
}
