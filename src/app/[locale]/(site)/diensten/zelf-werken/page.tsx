import { ServicePage } from '@/components/site/ServicePage';
import { EditableText } from '@/components/cms/EditableText';
import { EditableImage } from '@/components/cms/EditableImage';

const CMS_PAGE = 'diensten/zelf-werken';

export default function ZelfWerkenPage() {
  return (
    <ServicePage
      cmsPage={CMS_PAGE}
      editableTitle={
        <EditableText
          blockKey="diensten.zelf-werken.hero.title"
          page={CMS_PAGE}
          section="hero"
        >
          Werk zelf op de werf
        </EditableText>
      }
      editableDescription={
        <EditableText
          blockKey="diensten.zelf-werken.hero.subtitle"
          page={CMS_PAGE}
          section="hero"
          type="long_text"
        >
          Combineer onze faciliteiten met uw eigen vakmanschap. Onze werf is uitgerust voor zelf-doe schippers met werkruimtes, gereedschap en advies.
        </EditableText>
      }
      editableHeroImage={
        <EditableImage
          blockKey="diensten.zelf-werken.hero.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/werf-hero.webp"
          alt="Zelf werken op de werf bij Krekelberg Nautic"
        />
      }
      adminProductSlug="zelf-werken"
      catalogSlug="zelf-werken"
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
      faqs={[
        { q: 'Welke werkzaamheden mag ik zelf uitvoeren?', a: 'Onderhoud, schilderen, polijsten en kleine reparaties. Voor laswerk en accu/gas-installaties geldt aanmelding vooraf.' },
        { q: 'Mag ik mijn eigen monteur meenemen?', a: 'Ja, mits hij/zij een WA-verzekering en geldige VCA kan tonen. Aanmelden via de receptie.' },
        { q: 'Zijn er specifieke regels?', a: 'Afzettingen en milieuregels gelden altijd. Geen open vuur, geen vuil afval op de grond, en eindig met opgeruimde werkplek.' },
        { q: 'Kan ik onderdelen laten bezorgen?', a: 'Ja, leveranciers kunnen direct op de werf afleveren. Wij melden u via SMS zodra het pakket binnen is.' },
      ]}
    />
  );
}
