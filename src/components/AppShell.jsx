import { Link, useLocation } from 'react-router-dom';
import { Blocks, FolderClosed, KeyRound, LogOut } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'المشاريع', short: 'المشاريع', to: '/', icon: FolderClosed },
  { label: 'التكاملات', short: 'التكاملات', to: '/studio/integrations', icon: Blocks },
  { label: 'مزودو الذكاء', short: 'الذكاء', to: '/studio/settings', icon: KeyRound },
];

export default function AppShell({ children, wide = false }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const initials = user?.full_name?.trim()?.slice(0, 1) || user?.email?.trim()?.slice(0, 1)?.toUpperCase() || 'A';

  const navLink = (item, mobile = false) => {
    const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={cn(
          mobile ? 'forge-mobile-nav-link' : 'forge-nav-link',
          active && 'is-active',
        )}
      >
        <Icon size={mobile ? 15 : 14} strokeWidth={active ? 2.2 : 1.8} />
        <span>{mobile ? item.short : item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-[12px] focus:font-medium focus:text-primary-foreground">تخطَّ إلى المحتوى</a>
      <header className="forge-app-header sticky top-0 z-40">
        <div className={cn('forge-header-inner mx-auto px-4 sm:px-7', wide ? 'max-w-[1800px]' : 'max-w-6xl')}>
          <div className="flex min-w-0 items-center gap-7">
            <Link to="/" aria-label="AMAN FORGE — المشاريع" className="forge-brand">
              <span className="forge-brand-mark"><BrandMark size={38} /></span>
              <span className="forge-brand-copy">
                <span className="forge-brand-name">AMAN <b>FORGE</b></span>
                <span className="forge-brand-descriptor">INTELLIGENCE WORKSPACE</span>
              </span>
            </Link>
            <nav aria-label="التنقل الرئيسي" className="forge-desktop-nav">
              {NAV.map((item) => navLink(item))}
            </nav>
          </div>
          <div className="forge-header-actions">
            <div className="forge-header-status"><span /> PRIVATE WORKSPACE</div>
            {user?.email && (
              <span className="forge-user-email" title={user.email}>{user.email}</span>
            )}
            <span className="forge-user-avatar" aria-hidden="true">{initials}</span>
            <button type="button" onClick={() => logout()} aria-label="تسجيل الخروج" title="تسجيل الخروج" className="forge-logout">
              <LogOut size={15} />
            </button>
          </div>
        </div>
        <nav aria-label="التنقل السريع" className="forge-mobile-nav">
          {NAV.map((item) => navLink(item, true))}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="focus:outline-none">{children}</main>
      <footer className="forge-footer">
        <span>AMAN FORGE</span>
        <span>BUILT FOR WHAT'S NEXT</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}
