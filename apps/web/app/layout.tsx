import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AnalyticsProvider } from '@/lib/analytics/useAnalyticsShortcut';

export const metadata: Metadata = {
  title: 'Laser Workshop Admin',
  description: 'Management app for the laser cutting workshop',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        {children}
        <AnalyticsProvider />
      </body>
    </html>
  );
}
