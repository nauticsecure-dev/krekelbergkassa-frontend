import { ServicePage } from '@/components/site/ServicePage';
import { tariffRanges } from '@/lib/pricing-table';

export default function WinterstallingPage() {
  return (
    <ServicePage
      adminProductSlug="winterberging"
      priceFootnote="Winterberging-tarief per lengteklasse, inclusief BTW (incl. 2× kranen en afspuiten). De definitieve prijs volgt uit de exacte lengte van uw boot."
      badge="Winterstalling"
      title="Veilige winterstalling"
      subtitle="Binnen- en buitenstalling op een verzekerd werfterrein, ruim 10.000 m² in Roermond. Wij behandelen uw schip alsof het ons eigen schip is."
      description="Krekelberg Nautic biedt winter- en zomerstalling met optionele winterklaar service. U bepaalt zelf of u tijdens de stalling werkzaamheden wilt uitvoeren of die aan onze monteurs overlaat. Verzekering en 24/7 cameratoezicht zijn standaard inbegrepen."
      heroImage="/img/krek/winterstalling.webp"
      inlineImage="/img/krek/winterberging.webp"
      features={[
        { title: 'Binnen- en buitenoptie', desc: 'Beide met overdekking voor mast en zonwering.' },
        { title: 'Verzekerd terrein', desc: 'Volledig verzekerde locatie met cameratoezicht.' },
        { title: 'Toegang tijdens openingstijden', desc: 'Werk zelf of bezoek uw boot wanneer u wilt.' },
        { title: 'Stroomaansluiting', desc: 'Optioneel beschikbaar op verzoek.' },
        { title: 'Onderhoud op locatie', desc: 'Externe monteurs welkom onder werfvoorwaarden.' },
        { title: 'Voor- en najaar combineren', desc: 'Kranen en afspuiten in één arrangement.' },
      ]}
      priceRanges={tariffRanges('winterberging')}
      faqs={[
        { q: 'Wanneer start het stallingsseizoen?', a: 'Winterstalling loopt van 1 november tot 30 april. Zomerstalling is mogelijk van 1 mei tot 31 oktober.' },
        { q: 'Kan ik tussentijds werkzaamheden uitvoeren?', a: 'Ja. Tijdens openingstijden bent u welkom op het werfterrein, met toegang tot werkruimtes en water/stroom.' },
        { q: 'Is mijn boot tijdens stalling verzekerd?', a: 'Ons werfterrein is verzekerd. Wij raden aan uw eigen casco-verzekering te behouden.' },
        { q: 'Hoe wordt mijn boot op de bok geplaatst?', a: 'Wij stellen per scheepstype de juiste bokken in. U ontvangt een foto van de plaatsing.' },
      ]}
    />
  );
}
