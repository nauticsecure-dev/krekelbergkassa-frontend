import { LegalPage } from '@/components/site/LegalPage';

export default function CookiesPage() {
  return (
    <LegalPage
      badge="Cookies"
      title="Cookieverklaring"
      subtitle="Wij gebruiken cookies om uw ervaring te verbeteren. Hieronder leest u welke en waarom."
      updatedOn="15 mei 2026"
      sections={[
        {
          heading: 'Wat zijn cookies?',
          body: [
            'Cookies zijn kleine tekstbestandjes die websites opslaan in uw browser. Wij gebruiken ze om uw voorkeuren te onthouden en om het bezoek aan onze website te analyseren.',
          ],
        },
        {
          heading: 'Functionele cookies',
          body: [
            'Onmisbare cookies waarmee bijvoorbeeld uw taalkeuze (krek_locale) en sessie (krek_session) worden onthouden. Voor deze cookies vragen wij geen toestemming.',
          ],
        },
        {
          heading: 'Analytische cookies',
          body: [
            'Wij gebruiken privacyvriendelijke analytics om geanonimiseerd bezoek te meten. Geen profiling, geen verkoop van data.',
          ],
        },
        {
          heading: 'Marketing cookies',
          body: [
            'Wij plaatsen geen tracking-cookies van derde partijen zonder uw expliciete toestemming via de cookiebanner.',
          ],
        },
        {
          heading: 'Cookies beheren',
          body: [
            'U kunt cookies op elk moment beheren via de instellingen van uw browser. Het verwijderen van functionele cookies kan onderdelen van het portaal beïnvloeden.',
          ],
        },
      ]}
    />
  );
}
