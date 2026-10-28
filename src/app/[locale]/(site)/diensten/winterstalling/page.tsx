'use client';
import { useIntl } from '@/i18n/IntlProvider';
import { ServicePage } from '@/components/site/ServicePage';
import { EditableText } from '@/components/cms/EditableText';
import { EditableImage } from '@/components/cms/EditableImage';

const CMS_PAGE = 'diensten/winterstalling';

export default function WinterstallingPage() {
  const { t } = useIntl();
  return (
    <ServicePage
      cmsPage={CMS_PAGE}
      editableTitle={
        <EditableText
          blockKey="diensten.winterstalling.hero.title"
          page={CMS_PAGE}
          section="hero"
        >
          {t('globalUx.serviceDetails.winterstalling.heroTitle')}</EditableText>
      }
      editableDescription={
        <EditableText
          blockKey="diensten.winterstalling.hero.subtitle"
          page={CMS_PAGE}
          section="hero"
          type="long_text"
        >
          {t('globalUx.serviceDetails.winterstalling.heroSubtitle')}</EditableText>
      }
      editableHeroImage={
        <EditableImage defaultStyle={{gradient:'right',gradient_start:.85,gradient_middle:0.65,gradient_end:.3}}
          blockKey="diensten.winterstalling.hero.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/winterstalling.webp"
          alt={t('globalUx.serviceDetails.winterstalling.heroTitle')}
        />
      }
      adminProductSlug="STALL-WINTER"
      catalogSlug="winterstalling"
      catalogServiceCode="STALL-WINTER"
      priceFootnote={t('globalUx.serviceDetails.winterstalling.priceFootnote')}
      badge={t('globalUx.serviceDetails.winterstalling.badge')}
      title={t('globalUx.serviceDetails.winterstalling.heroTitle')}
      subtitle={t('globalUx.serviceDetails.winterstalling.heroSubtitle')}
      description={t('globalUx.serviceDetails.winterstalling.description')}
      heroImage="/img/krek/winterstalling.webp"
      inlineImage="/img/krek/winterberging.webp"
      features={[
        { title: t('globalUx.serviceDetails.winterstalling.feature1Title'), desc: t('globalUx.serviceDetails.winterstalling.feature1Description') },
        { title: t('globalUx.serviceDetails.winterstalling.feature2Title'), desc: t('globalUx.serviceDetails.winterstalling.feature2Description') },
        { title: t('globalUx.serviceDetails.winterstalling.feature3Title'), desc: t('globalUx.serviceDetails.winterstalling.feature3Description') },
        { title: t('globalUx.serviceDetails.winterstalling.feature4Title'), desc: t('globalUx.serviceDetails.winterstalling.feature4Description') },
        { title: t('globalUx.serviceDetails.winterstalling.feature5Title'), desc: t('globalUx.serviceDetails.winterstalling.feature5Description') },
        { title: t('globalUx.serviceDetails.winterstalling.feature6Title'), desc: t('globalUx.serviceDetails.winterstalling.feature6Description') },
      ]}
      faqs={[
        { q: t('globalUx.serviceDetails.winterstalling.faq1Question'), a: t('globalUx.serviceDetails.winterstalling.faq1Answer') },
        { q: t('globalUx.serviceDetails.winterstalling.faq2Question'), a: t('globalUx.serviceDetails.winterstalling.faq2Answer') },
        { q: t('globalUx.serviceDetails.winterstalling.faq3Question'), a: t('globalUx.serviceDetails.winterstalling.faq3Answer') },
        { q: t('globalUx.serviceDetails.winterstalling.faq4Question'), a: t('globalUx.serviceDetails.winterstalling.faq4Answer') },
      ]}
    />
  );
}
