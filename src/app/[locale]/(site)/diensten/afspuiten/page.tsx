import { ServicePage } from '@/components/site/ServicePage';
import { EditableText } from '@/components/cms/EditableText';
import { EditableImage } from '@/components/cms/EditableImage';
import { tariffRanges } from '@/lib/pricing-table';

const CMS_PAGE = 'diensten/afspuiten';

export default function AfspuitenPage() {
  return (
    <ServicePage
      cmsPage={CMS_PAGE}
      editableTitle={
        <EditableText
          blockKey="diensten.afspuiten.hero.title"
          page={CMS_PAGE}
          section="hero"
        >
          Romp professioneel afspuiten
        </EditableText>
      }
      editableDescription={
        <EditableText
          blockKey="diensten.afspuiten.hero.subtitle"
          page={CMS_PAGE}
          section="hero"
          type="long_text"
        >
          Direct na het kranen reinigen wij uw romp met hogedruk. Een propere romp betekent minder weerstand, langere antifouling-werking en een betere staat van uw schip.
        </EditableText>
      }
      editableHeroImage={
        <EditableImage
          blockKey="diensten.afspuiten.hero.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/boot-kranen.webp"
          alt="Romp afspuiten bij Krekelberg Nautic"
        />
      }
      adminProductSlug="afspuiten"
      catalogSlug="afspuiten"
      priceFootnote="Prijzen per lengteklasse, inclusief BTW. De definitieve prijs volgt uit de exacte lengte van uw boot."
      badge="Afspuiten / pressure washing"
      title="Romp professioneel afspuiten"
      subtitle="Direct na het kranen reinigen wij uw romp met hogedruk. Een propere romp betekent minder weerstand, langere antifouling-werking en een betere staat van uw schip."
      description="Onze afspuitinstallatie verwijdert algen, slib en aanslag tot diep in de structuur. Wij werken milieuvriendelijk met gefilterde afvoer. Optioneel breiden wij de service uit met inspectie van de rompzijden en advies voor antifouling."
      heroImage="/img/krek/boot-kranen.webp"
      inlineImage="/img/krek/werkzaamheden.webp"
      features={[
        { title: 'Direct na het kranen', desc: 'Vuil is dan nog niet uitgedroogd — het beste reinigingsresultaat.' },
        { title: 'Gefilterde afvoer', desc: 'Wij vangen aanslag op volgens milieuvergunning.' },
        { title: 'Optioneel rompinspectie', desc: 'Visuele check op blaarvorming en osmose.' },
        { title: 'Snel droog', desc: 'Klaar voor antifouling of stalling binnen 24 uur.' },
        { title: 'Vakkundig team', desc: 'Onze afspuiters werken al jaren met dezelfde schepen.' },
        { title: 'Alle scheepstypes', desc: 'Motor, zeil, sloep — wij stemmen druk en techniek af.' },
      ]}
      priceRanges={tariffRanges('afspuiten')}
      faqs={[
        { q: 'Hoe lang duurt het afspuiten?', a: 'Gemiddeld 15 tot 30 minuten, afhankelijk van lengte en mate van aanslag.' },
        { q: 'Kan ik het afspuiten combineren met andere diensten?', a: 'Ja, we raden aan het te combineren met kranen en eventueel antifouling. Vraag onze werf naar de mogelijkheden.' },
        { q: 'Wat gebeurt er met het opgevangen vuil?', a: 'Wij voeren dit af conform onze milieuvergunning bij een gecertificeerd afvalbedrijf.' },
        { q: 'Is de service ook in het hoogseizoen beschikbaar?', a: 'Ja, maar planning vol — boek minimaal 2 weken vooruit in maart-mei en oktober-november.' },
      ]}
    />
  );
}
