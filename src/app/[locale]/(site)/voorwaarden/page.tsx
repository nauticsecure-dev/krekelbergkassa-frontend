import { LegalPage } from '@/components/site/LegalPage';

export default function VoorwaardenPage() {
  return (
    <LegalPage
      badge="Algemene voorwaarden"
      title="Algemene voorwaarden"
      subtitle="De algemene voorwaarden van Krekelberg Nautic B.V., van toepassing op alle diensten en overeenkomsten."
      updatedOn="15 mei 2026"
      sections={[
        {
          heading: 'Toepasselijkheid',
          body: [
            'Deze algemene voorwaarden zijn van toepassing op alle aanbiedingen, offertes en overeenkomsten waarbij Krekelberg Nautic B.V. diensten verleent of producten levert.',
          ],
        },
        {
          heading: 'Aanbiedingen en offertes',
          body: [
            'Aanbiedingen zijn vrijblijvend en geldig gedurende 30 dagen, tenzij anders aangegeven. Online getoonde prijzen zijn indicatief en kunnen worden aangepast bij wezenlijke afwijkingen.',
          ],
        },
        {
          heading: 'Annulering kraanafspraken',
          body: [
            'Annulering tot 24 uur voor de afspraak is kosteloos. Daarna brengen wij 50% van de tarieven in rekening; bij no-show geldt het volledige tarief.',
          ],
        },
        {
          heading: 'Stallingscontracten',
          body: [
            'Stallingscontracten worden aangegaan voor een volledig seizoen. Tussentijdse opzegging is mogelijk tegen 30 dagen, restitutie naar rato.',
          ],
        },
        {
          heading: 'Aansprakelijkheid',
          body: [
            'Onze aansprakelijkheid is beperkt tot het bedrag van de factuur of het uit hoofde van onze aansprakelijkheidsverzekering uitgekeerde bedrag. Gevolgschade is uitgesloten.',
          ],
        },
        {
          heading: 'Geschillen',
          body: [
            'Op alle overeenkomsten is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter te Roermond.',
          ],
        },
      ]}
    />
  );
}
