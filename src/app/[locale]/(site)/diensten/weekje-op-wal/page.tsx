import { ServicePage } from '@/components/site/ServicePage';
import { EditableText } from '@/components/cms/EditableText';
import { EditableImage } from '@/components/cms/EditableImage';

const CMS_PAGE = 'diensten/weekje-op-wal';

export default function WeekjeOpWalPage() {
  return (
    <ServicePage
      cmsPage={CMS_PAGE}
      editableTitle={
        <EditableText
          blockKey="diensten.weekje-op-wal.hero.title"
          page={CMS_PAGE}
          section="hero"
        >
          Weekje op wal
        </EditableText>
      }
      editableDescription={
        <EditableText
          blockKey="diensten.weekje-op-wal.hero.subtitle"
          page={CMS_PAGE}
          section="hero"
          type="long_text"
        >
          Haal uw boot uit het water en neem een week de tijd voor onderhoud op onze werf. We bespreken vooraf de planning en mogelijkheden voor uw schip.
        </EditableText>
      }
      editableHeroImage={
        <EditableImage
          blockKey="diensten.weekje-op-wal.hero.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/werkzaamheden.webp"
          alt="Boot op de werf voor onderhoud"
        />
      }
      badge="Weekje op wal"
      catalogSlug="weekje-op-wal"
      catalogServiceCode="WEEK-OP-WAL"
      title="Weekje op wal"
      subtitle="Haal uw boot uit het water en neem een week de tijd voor onderhoud op onze werf. We bespreken vooraf de planning en mogelijkheden voor uw schip."
      description="Met een weekje op wal heeft u rustig de tijd om aan uw boot te werken. Bespreek met ons de gewenste periode, het kranen en de faciliteiten die u nodig heeft. Onze werf biedt mogelijkheden voor zelfwerkzaamheden en hulp van onze monteurs op afspraak."
      heroImage="/img/krek/werkzaamheden.webp"
      inlineImage="/img/krek/werf-hero.webp"
      priceFootnote="Tarieven per lengteklasse, inclusief BTW. Neem contact op voor beschikbaarheid en afspraken over de inhoud van het arrangement."
      features={[
        { title: 'Een week op de wal', desc: 'Plan tijd om uw boot rustig onder handen te nemen.' },
        { title: 'Onderhoud op uw tempo', desc: 'Bespreek vooraf welke werkzaamheden u wilt uitvoeren.' },
        { title: 'Werffaciliteiten', desc: 'Vraag naar de beschikbare werkruimtes, stroom en water.' },
        { title: 'Hulp op afspraak', desc: 'Bespreek vooraf of onze monteurs u kunnen ondersteunen.' },
        { title: 'Planning in overleg', desc: 'Stem de gewenste periode en het kranen met ons af.' },
        { title: 'Prijs op lengteklasse', desc: 'Bekijk de indicatieve tarieven op basis van de lengte van uw boot.' },
      ]}
      faqs={[
        { q: 'Hoe reserveer ik een weekje op wal?', a: 'Neem contact met ons op om de gewenste periode en de planning van het kranen te bespreken.' },
        { q: 'Kan ik zelf werkzaamheden uitvoeren?', a: 'Ja, zelfwerkzaamheden zijn mogelijk binnen de werfvoorwaarden. Bespreek vooraf welke faciliteiten u nodig heeft.' },
        { q: 'Kan ik hulp krijgen van een monteur?', a: 'Onze monteurs kunnen op afspraak ondersteunen. Neem vooraf contact op om de mogelijkheden te bespreken.' },
        { q: 'Hoe wordt het tarief bepaald?', a: 'Het tarief is afhankelijk van de lengteklasse van uw boot. De getoonde tarieven zijn indicatief; neem contact op voor de afspraken en beschikbaarheid.' },
      ]}
    />
  );
}
