'use client';
import { useIntl } from '@/i18n/IntlProvider';
import { ServicePage } from '@/components/site/ServicePage';
import { EditableText } from '@/components/cms/EditableText';
import { EditableImage } from '@/components/cms/EditableImage';

const CMS_PAGE = 'diensten/afspuiten';

export default function AfspuitenPage() {
  const { t } = useIntl();
  return (
    <ServicePage
      cmsPage={CMS_PAGE}
      editableTitle={
        <EditableText
          blockKey="diensten.afspuiten.hero.title"
          page={CMS_PAGE}
          section="hero"
        >
          {t('globalUx.serviceDetails.afspuiten.heroTitle')}</EditableText>
      }
      editableDescription={
        <EditableText
          blockKey="diensten.afspuiten.hero.subtitle"
          page={CMS_PAGE}
          section="hero"
          type="long_text"
        >
          {t('globalUx.serviceDetails.afspuiten.heroSubtitle')}</EditableText>
      }
      editableHeroImage={
        <EditableImage defaultStyle={{gradient:'right',gradient_start:.85,gradient_middle:0.65,gradient_end:.3}}
          blockKey="diensten.afspuiten.hero.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/boot-kranen.webp"
          alt={t('globalUx.serviceDetails.afspuiten.heroTitle')}
        />
      }
      adminProductSlug="afspuiten"
      catalogSlug="afspuiten"
      catalogServiceCode="AFSPUITEN"
      priceFootnote={t('globalUx.serviceDetails.afspuiten.priceFootnote')}
      badge={t('globalUx.serviceDetails.afspuiten.badge')}
      title={t('globalUx.serviceDetails.afspuiten.heroTitle')}
      subtitle={t('globalUx.serviceDetails.afspuiten.heroSubtitle')}
      description={t('globalUx.serviceDetails.afspuiten.description')}
      heroImage="/img/krek/boot-kranen.webp"
      inlineImage="/img/krek/werkzaamheden.webp"
      features={[
        { title: t('globalUx.serviceDetails.afspuiten.feature1Title'), desc: t('globalUx.serviceDetails.afspuiten.feature1Description') },
        { title: t('globalUx.serviceDetails.afspuiten.feature2Title'), desc: t('globalUx.serviceDetails.afspuiten.feature2Description') },
        { title: t('globalUx.serviceDetails.afspuiten.feature3Title'), desc: t('globalUx.serviceDetails.afspuiten.feature3Description') },
        { title: t('globalUx.serviceDetails.afspuiten.feature4Title'), desc: t('globalUx.serviceDetails.afspuiten.feature4Description') },
        { title: t('globalUx.serviceDetails.afspuiten.feature5Title'), desc: t('globalUx.serviceDetails.afspuiten.feature5Description') },
        { title: t('globalUx.serviceDetails.afspuiten.feature6Title'), desc: t('globalUx.serviceDetails.afspuiten.feature6Description') },
      ]}
      faqs={[
        { q: t('globalUx.serviceDetails.afspuiten.faq1Question'), a: t('globalUx.serviceDetails.afspuiten.faq1Answer') },
        { q: t('globalUx.serviceDetails.afspuiten.faq2Question'), a: t('globalUx.serviceDetails.afspuiten.faq2Answer') },
        { q: t('globalUx.serviceDetails.afspuiten.faq3Question'), a: t('globalUx.serviceDetails.afspuiten.faq3Answer') },
        { q: t('globalUx.serviceDetails.afspuiten.faq4Question'), a: t('globalUx.serviceDetails.afspuiten.faq4Answer') },
      ]}
    />
  );
}
