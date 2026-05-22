import type { Metadata, Viewport } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import { RegisterSW } from '@/components/pwa/RegisterSW';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Krekelberg Nautic — Jachtwerf in Roermond',
    template: '%s · Krekelberg Nautic',
  },
  description:
    'Jachtwerf, stalling en jachtmakelaar in Roermond. Kranen, afspuiten, winterstalling en verkoop van uw boot.',
  applicationName: 'Krekelberg Nautic',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Krekelberg',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f1b2a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen bg-sand-50 font-sans text-navy-900 antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
