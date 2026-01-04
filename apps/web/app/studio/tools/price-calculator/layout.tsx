'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@app/i18n';

export default function PriceCalculatorToolLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();

  const navItems = [
    { href: '/studio/tools/price-calculator/dashboard', label: t('nav.dashboard') },
    { href: '/studio/tools/price-calculator/orders', label: t('nav.orders') },
    { href: '/studio/tools/price-calculator/customers', label: t('nav.customers') },
    { href: '/studio/tools/price-calculator/materials', label: t('nav.materials') },
    { href: '/studio/tools/price-calculator/offcuts', label: t('nav.offcuts') },
    { href: '/studio/tools/price-calculator/templates', label: t('nav.templates') },
    { href: '/studio/tools/price-calculator/template-products', label: t('nav.template_products') },
    { href: '/studio/tools/price-calculator/sales-channels', label: t('nav.sales_channels') },
    { href: '/studio/tools/price-calculator/today-queue', label: t('nav.today_queue') },
    { href: '/studio/tools/price-calculator/seasons', label: t('nav.seasons_batches') },
    { href: '/studio/tools/price-calculator/pricing', label: t('nav.pricing') },
    { href: '/studio/tools/price-calculator/quotes', label: t('nav.quotes') },
    { href: '/studio/tools/price-calculator/tutorial', label: t('nav.tutorial') },
  ];

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="hidden w-56 flex-col border-r border-slate-800 bg-slate-900/80 p-4 md:flex">
        <div className="mb-6 text-lg font-semibold tracking-tight">Price Calculator</div>
        <nav className="space-y-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 hover:bg-slate-800 ${
                pathname === item.href ? 'bg-slate-800 text-sky-400' : 'text-slate-300'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-slate-950 px-4 py-4 md:px-6 md:py-6">{children}</main>
    </div>
  );
}
