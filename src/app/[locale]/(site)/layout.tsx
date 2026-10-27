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
      <PublicCmsRoute />
      <PublicJourneyTracker />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
