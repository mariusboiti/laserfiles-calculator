'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getToolTitleKey } from '@/lib/studio/navigation/studioNav';
 import { useLanguage } from '@/app/(app)/i18n';
 import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export type StudioBreadcrumbsProps = {
  toolSlug?: string;
};

export function StudioBreadcrumbs({ toolSlug }: StudioBreadcrumbsProps) {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const t = (key: string) => getStudioTranslation(locale as any, key);

  const breadcrumbs: { label: string; href?: string }[] = [
    { label: t('breadcrumbs.studio'), href: '/studio/dashboard' },
  ];

  if (pathname.startsWith('/studio/tools')) {
    breadcrumbs.push({ label: t('nav.tools'), href: '/studio/tools' });
    
    if (toolSlug) {
      const toolTitleKey = getToolTitleKey(toolSlug);
      breadcrumbs.push({ label: t(toolTitleKey) });
    }
  } else if (pathname.startsWith('/studio/help')) {
    breadcrumbs.push({ label: t('nav.help') });
  } else if (pathname.startsWith('/studio/account')) {
    breadcrumbs.push({ label: t('nav.account') });
  } else if (pathname === '/studio/dashboard') {
    breadcrumbs.push({ label: t('nav.dashboard') });
  }

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav aria-label={t('a11y.breadcrumb')} className="flex items-center gap-2 text-sm">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="text-slate-400 transition-colors hover:text-slate-200"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-slate-200' : 'text-slate-400'}>
                {crumb.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
