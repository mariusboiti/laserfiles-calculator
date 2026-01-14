import { studioTools } from '../tools/registry';

export type StudioNavItem = {
  label: string;
  href: string;
  match?: 'prefix' | 'exact';
};

export const STUDIO_NAV: StudioNavItem[] = [
  { label: 'Dashboard', href: '/studio/dashboard', match: 'exact' },
  { label: 'Tools', href: '/studio/tools', match: 'prefix' },
  { label: 'Pricing', href: '/studio/pricing', match: 'exact' },
  { label: 'Help', href: '/studio/help', match: 'prefix' },
  { label: 'Account', href: '/studio/account', match: 'exact' },
];

export function isActivePath(pathname: string, item: StudioNavItem): boolean {
  if (item.match === 'exact') return pathname === item.href;
  return pathname.startsWith(item.href);
}

export function getToolMeta(slug: string): { titleKey: string; descriptionKey: string } | null {
  const tool = studioTools.find((t) => t.slug === slug);
  if (!tool) return null;
  return {
    titleKey: tool.titleKey,
    descriptionKey: tool.descriptionKey,
  };
}

export function getToolTitleKey(slug: string): string {
  const meta = getToolMeta(slug);
  return meta?.titleKey || slug;
}
