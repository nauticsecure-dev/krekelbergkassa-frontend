'use client';
import { useIntl } from '@/i18n/IntlProvider';
import { ServicePage } from '@/components/site/ServicePage';
import { EditableText } from '@/components/cms/EditableText';
import { EditableImage } from '@/components/cms/EditableImage';

const CMS_PAGE = 'diensten/weekje-op-wal';

export default function WeekjeOpWalPage() {
  const { t } = useIntl();
  return (
    <ServicePage
      cmsPage={CMS_PAGE}
      editableTitle={
        <EditableText
          blockKey="diensten.weekje-op-wal.hero.title"
          page={CMS_PAGE}
          section="hero"
        >
          {t('globalUx.serviceDetails.weekje_op_wal.heroTitle')}</EditableText>
      }
      editableDescription={
        <EditableText
          blockKey="diensten.weekje-op-wal.hero.subtitle"
          page={CMS_PAGE}
          section="hero"
          type="long_text"
        >
          {t('globalUx.serviceDetails.weekje_op_wal.heroSubtitle')}</EditableText>
      }
      editableHeroImage={
        <EditableImage defaultStyle={{gradient:'right',gradient_start:.85,gradient_middle:0.65,gradient_end:.3}}
          blockKey="diensten.weekje-op-wal.hero.image"
          page={CMS_PAGE}
          fallbackSrc="/img/krek/werkzaamheden.webp"
          alt={t('globalUx.serviceDetails.weekje_op_wal.heroTitle')}
        />
      }
      badge={t('globalUx.serviceDetails.weekje_op_wal.heroTitle')}
      catalogSlug="weekje-op-wal"
      catalogServiceCode="WEEK-OP-WAL"
      title={t('globalUx.serviceDetails.weekje_op_wal.heroTitle')}
      subtitle={t('globalUx.serviceDetails.weekje_op_wal.heroSubtitle')}
      description={t('globalUx.serviceDetails.weekje_op_wal.description')}
      heroImage="/img/krek/werkzaamheden.webp"
      inlineImage="/img/krek/werf-hero.webp"
      priceFootnote={t('globalUx.serviceDetails.weekje_op_wal.priceFootnote')}
      features={[
        { title: t('globalUx.serviceDetails.weekje_op_wal.feature1Title'), desc: t('globalUx.serviceDetails.weekje_op_wal.feature1Description') },
        { title: t('globalUx.serviceDetails.weekje_op_wal.feature2Title'), desc: t('globalUx.serviceDetails.weekje_op_wal.feature2Description') },
        { title: t('globalUx.serviceDetails.weekje_op_wal.feature3Title'), desc: t('globalUx.serviceDetails.weekje_op_wal.feature3Description') },
        { title: t('globalUx.serviceDetails.weekje_op_wal.feature4Title'), desc: t('globalUx.serviceDetails.weekje_op_wal.feature4Description') },
        { title: t('globalUx.serviceDetails.weekje_op_wal.feature5Title'), desc: t('globalUx.serviceDetails.weekje_op_wal.feature5Description') },
        { title: t('globalUx.serviceDetails.weekje_op_wal.feature6Title'), desc: t('globalUx.serviceDetails.weekje_op_wal.feature6Description') },
      ]}
      faqs={[
        { q: t('globalUx.serviceDetails.weekje_op_wal.faq1Question'), a: t('globalUx.serviceDetails.weekje_op_wal.faq1Answer') },
        { q: t('globalUx.serviceDetails.weekje_op_wal.faq2Question'), a: t('globalUx.serviceDetails.weekje_op_wal.faq2Answer') },
        { q: t('globalUx.serviceDetails.weekje_op_wal.faq3Question'), a: t('globalUx.serviceDetails.weekje_op_wal.faq3Answer') },
        { q: t('globalUx.serviceDetails.weekje_op_wal.faq4Question'), a: t('globalUx.serviceDetails.weekje_op_wal.faq4Answer') },
      ]}
    />
  );
}
