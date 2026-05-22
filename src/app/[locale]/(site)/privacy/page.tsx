import { LegalPage } from '@/components/site/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage
      badge="Privacyverklaring"
      title="Hoe wij omgaan met uw gegevens"
      subtitle="Wij gaan zorgvuldig om met de persoonsgegevens van onze klanten en zakelijke partners. Lees hieronder hoe wij dat doen."
      updatedOn="15 mei 2026"
      sections={[
        {
          heading: 'Verwerkingsverantwoordelijke',
          body: [
            'Krekelberg Nautic B.V., gevestigd aan de Havenstraat 12 te Roermond, is verwerkingsverantwoordelijke voor de verwerking van persoonsgegevens zoals beschreven in deze privacyverklaring.',
          ],
        },
        {
          heading: 'Welke gegevens verwerken wij',
          body: [
            'Wij verwerken uw contactgegevens, bootgegevens, betaalinformatie en eventuele documenten die u uploadt in het klantportaal. Daarnaast slaan wij interacties op zoals afspraken, facturen en supportberichten.',
          ],
        },
        {
          heading: 'Grondslagen voor verwerking',
          body: [
            'Wij verwerken gegevens om uitvoering te geven aan de overeenkomst (artikel 6 lid 1 sub b AVG), om te voldoen aan wettelijke verplichtingen (sub c) en op basis van een gerechtvaardigd belang om onze diensten te verbeteren (sub f).',
          ],
        },
        {
          heading: 'Bewaartermijnen',
          body: [
            'Facturatiegegevens bewaren wij minimaal 7 jaar conform fiscale wetgeving. Overige persoonsgegevens worden bewaard zolang als nodig is voor de aangegeven doeleinden of de wettelijke bewaartermijn.',
          ],
        },
        {
          heading: 'Uw rechten',
          body: [
            'U heeft het recht uw gegevens in te zien, te corrigeren of te laten verwijderen. Stuur ons hiervoor een verzoek via privacy@krekelberg-nautic.nl. Wij reageren binnen vier weken.',
          ],
        },
        {
          heading: 'Contact',
          body: [
            'Heeft u vragen over deze privacyverklaring of klachten over hoe wij omgaan met uw gegevens, neem dan contact op via privacy@krekelberg-nautic.nl of bel 0475 32 22 75.',
          ],
        },
      ]}
    />
  );
}
