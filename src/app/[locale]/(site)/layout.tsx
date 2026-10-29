import Script from 'next/script';
import { Header } from '@/components/site/Header';
import { PublicCmsRoute } from '@/components/cms/PublicCmsRoute';
import { Footer } from '@/components/site/Footer';
import { PublicJourneyTracker } from '@/components/site/PublicJourneyTracker';

export default function PublicSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Script
        id="answer24-webchat"
        src="https://app.answer24.nl/webchat.js"
        data-key="01m49vdm4na4e8erpv71hwvez9"
        strategy="afterInteractive"
      />
      <PublicCmsRoute />
      <PublicJourneyTracker />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
