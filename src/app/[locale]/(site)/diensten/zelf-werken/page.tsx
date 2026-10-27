'use client';
import { useIntl } from '@/i18n/IntlProvider';
import { ServicePage } from '@/components/site/ServicePage';
import { EditableText } from '@/components/cms/EditableText';
import { EditableImage } from '@/components/cms/EditableImage';

const CMS_PAGE = 'diensten/zelf-werken';

export default function ZelfWerkenPage() {
  const { t } = useIntl();
  return (
    <ServicePage
      cmsPage={CMS_PAGE}
      editableTitle={
        <EditableText
          blockKey="diensten.zelf-werken.hero.title"
          page={CMS_PAGE}
          section="hero"
        >
          {t('globalUx.serviceDetails.zelf_werken.heroTitle')}</EditableText>
      }
      editableDescription={
        <EditableText
          blockKey="diensten.zelf-werken.hero.subtitle"
          page={CMS_PAGE}
          section="hero"
          type="long_text"
        >
          {t('globalUx.serviceDetails.zelf_werken.heroSubtitle')}</EditableText>
      }
      editableHeroImage={
        <EditableImage defaultStyle={{gradient:'right',gradient_start:.85,gradient_middle:0.65,gradient_end:.3}}
          blockKey="diensten.zelf-werken.hero.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/werf-hero.webp"
          alt={t('globalUx.serviceDetails.zelf_werken.heroTitle')}
        />
      }
      adminProductSlug="zelf-werken"
      catalogSlug="zelf-werken"
      badge={t('globalUx.serviceDetails.zelf_werken.badge')}
      title={t('globalUx.serviceDetails.zelf_werken.heroTitle')}
      subtitle={t('globalUx.serviceDetails.zelf_werken.heroSubtitle')}
      description={t('globalUx.serviceDetails.zelf_werken.description')}
      heroImage="/img/krek/werf-hero.webp"
      inlineImage="/img/krek/halverhuur.webp"
      features={[
        { title: t('globalUx.serviceDetails.zelf_werken.feature1Title'), desc: t('globalUx.serviceDetails.zelf_werken.feature1Description') },
        { title: t('globalUx.serviceDetails.zelf_werken.feature2Title'), desc: t('globalUx.serviceDetails.zelf_werken.feature2Description') },
        { title: t('globalUx.serviceDetails.zelf_werken.feature3Title'), desc: t('globalUx.serviceDetails.zelf_werken.feature3Description') },
        { title: t('globalUx.serviceDetails.zelf_werken.feature4Title'), desc: t('globalUx.serviceDetails.zelf_werken.feature4Description') },
        { title: t('globalUx.serviceDetails.zelf_werken.feature5Title'), desc: t('globalUx.serviceDetails.zelf_werken.feature5Description') },
        { title: t('globalUx.serviceDetails.zelf_werken.feature6Title'), desc: t('globalUx.serviceDetails.zelf_werken.feature6Description') },
      ]}
      faqs={[
        { q: t('globalUx.serviceDetails.zelf_werken.faq1Question'), a: t('globalUx.serviceDetails.zelf_werken.faq1Answer') },
        { q: t('globalUx.serviceDetails.zelf_werken.faq2Question'), a: t('globalUx.serviceDetails.zelf_werken.faq2Answer') },
        { q: t('globalUx.serviceDetails.zelf_werken.faq3Question'), a: t('globalUx.serviceDetails.zelf_werken.faq3Answer') },
        { q: t('globalUx.serviceDetails.zelf_werken.faq4Question'), a: t('globalUx.serviceDetails.zelf_werken.faq4Answer') },
      ]}
    />
  );
}
