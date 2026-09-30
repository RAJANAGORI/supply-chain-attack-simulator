import './globals.css';
import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono, Syne } from 'next/font/google';
import { RouteWarmup } from '@/components/RouteWarmup';
import { Sidebar } from '@/components/Sidebar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { THEME_BOOTSTRAP_SCRIPT } from '@/lib/theme';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SCAS — Control Center',
  description: 'Supply Chain Attack Simulator dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${syne.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#2f27ce" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <RouteWarmup />
          <Sidebar />
          <div className="pl-[var(--scas-sidebar-w,15rem)] transition-[padding] duration-200 ease-out">
            <main className="mx-auto max-w-6xl px-6 py-8 lg:px-10 lg:py-10">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
