import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { PublicJourneyTracker } from '@/components/site/PublicJourneyTracker';

export default function PublicSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicJourneyTracker />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
