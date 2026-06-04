import { ServicePage } from '@/components/site/ServicePage';

export default function ZelfWerkenPage() {
  return (
    <ServicePage
      adminProductSlug="zelf-werken"
      badge="Zelf werken aan uw boot"
      title="Werk zelf op de werf"
      subtitle="Combineer onze faciliteiten met uw eigen vakmanschap. Onze werf is uitgerust voor zelf-doe schippers met werkruimtes, gereedschap en advies."
      description="U mag zelfstandig werken aan uw eigen schip op onze werf binnen de werfvoorwaarden. Wij stellen werkruimtes, stroom en water beschikbaar; onze monteurs zijn paraat voor vragen of specialistisch werk. Externe monteurs zijn welkom mits aangemeld."
      heroImage="/img/krek/werf-hero.webp"
      inlineImage="/img/krek/halverhuur.webp"
      features={[
        { title: 'Werkruimtes met stroom', desc: 'Verlichte plekken met stopcontacten 230V.' },
        { title: 'Water & perslucht', desc: 'Beschikbaar op vaste tappunten.' },
        { title: 'Hijswerktuig op afspraak', desc: 'Onze 30-tons kraan voor zware onderdelen.' },
        { title: 'Externe monteurs welkom', desc: 'Met geldige WA-verzekering en VCA.' },
        { title: 'Materiaal-shop', desc: 'Schroeven, verf, lijmen en olie ter plekke.' },
        { title: 'Toiletten & koffie', desc: 'Voorzieningen voor lange werkdagen.' },
      ]}
      priceRanges={[
        { label: 'Dagticket', price: '€ 15', note: 'Per persoon per dag' },
        { label: 'Weekticket', price: '€ 60', note: '7 aaneengesloten dagen' },
        { label: 'Maandticket', price: '€ 195', note: 'Voor uitgebreide refits' },
        { label: 'Werkbank huur', price: '€ 25', note: 'Per dag, incl. licht' },
        { label: 'Kraan op afspraak', price: '€ 95', note: 'Per beurt, max 20 min' },
        { label: 'Externe monteur', price: '€ 35', note: 'Aanmelddag, eenmalig' },
      ]}
      faqs={[
        { q: 'Welke werkzaamheden mag ik zelf uitvoeren?', a: 'Onderhoud, schilderen, polijsten en kleine reparaties. Voor laswerk en accu/gas-installaties geldt aanmelding vooraf.' },
        { q: 'Mag ik mijn eigen monteur meenemen?', a: 'Ja, mits hij/zij een WA-verzekering en geldige VCA kan tonen. Aanmelden via de receptie.' },
        { q: 'Zijn er specifieke regels?', a: 'Afzettingen en milieuregels gelden altijd. Geen open vuur, geen vuil afval op de grond, en eindig met opgeruimde werkplek.' },
        { q: 'Kan ik onderdelen laten bezorgen?', a: 'Ja, leveranciers kunnen direct op de werf afleveren. Wij melden u via SMS zodra het pakket binnen is.' },
      ]}
    />
  );
}
