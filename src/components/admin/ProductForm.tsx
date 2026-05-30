'use client';

import * as React from 'react';
import { Input } from '@/components/ui/Input';
import { AdminSelect } from '@/components/admin/AdminUi';
import { useIntl } from '@/i18n/IntlProvider';
import {
  EMPTY_PRODUCT_FORM,
  PRODUCT_CATEGORIES,
  SERVICE_CODES,
  type ProductFormState,
  calcPriceInclCents,
  eurosToCents,
} from '@/lib/products';
import { formatCurrency } from '@/lib/format';

export { EMPTY_PRODUCT_FORM, type ProductFormState };

export function ProductForm({
  form,
  onChange,
  isEdit,
}: {
  form: ProductFormState;
  onChange: (next: ProductFormState) => void;
  isEdit?: boolean;
}) {
  const { t, locale } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const priceExclCents = eurosToCents(form.price_excl_vat);
  const vatRate = Number(form.vat_rate) || 21;
  const priceInclCents = calcPriceInclCents(priceExclCents, vatRate);

  const set = (patch: Partial<ProductFormState>) => onChange({ ...form, ...patch });

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-navy-400">
          {t('adminNew.products.sections.identity')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('adminNew.products.columns.code')}
            value={form.code}
            onChange={(e) => set({ code: e.target.value })}
            required
            disabled={isEdit}
          />
          <Input
            label={t('adminNew.products.columns.name')}
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            required
          />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.products.fields.description')}
            </label>
            <textarea
              className="input-base min-h-24 w-full"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder={t('adminNew.products.fields.descriptionPlaceholder')}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-navy-400">
          {t('adminNew.products.sections.classification')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.products.columns.category')}
            </label>
            <AdminSelect value={form.category} onChange={(v) => set({ category: v })}>
              <option value="">{t('adminNew.products.fields.categoryNone')}</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`adminNew.products.categories.${cat}`)}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.products.fields.serviceCode')}
            </label>
            <AdminSelect value={form.service_code} onChange={(v) => set({ service_code: v })}>
              <option value="">{t('adminNew.products.fields.serviceCodeNone')}</option>
              {SERVICE_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </AdminSelect>
          </div>
          <Input
            label={t('adminNew.products.fields.tags')}
            value={form.tags}
            onChange={(e) => set({ tags: e.target.value })}
            placeholder={t('adminNew.products.fields.tagsPlaceholder')}
          />
          <Input
            label={t('adminNew.products.fields.aliases')}
            value={form.aliases}
            onChange={(e) => set({ aliases: e.target.value })}
            placeholder={t('adminNew.products.fields.aliasesPlaceholder')}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-navy-400">
          {t('adminNew.products.sections.pricing')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label={t('adminNew.products.fields.priceExcl')}
            inputMode="decimal"
            value={form.price_excl_vat}
            onChange={(e) => set({ price_excl_vat: e.target.value })}
            required
          />
          <Input
            label={t('adminNew.products.columns.vat')}
            inputMode="decimal"
            value={form.vat_rate}
            onChange={(e) => set({ vat_rate: e.target.value })}
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.products.fields.priceIncl')}
            </label>
            <div className="input-base flex items-center bg-sand-50 text-navy-700">
              {formatCurrency(priceInclCents / 100, dateLocale)}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-navy-400">
          {t('adminNew.products.sections.pos')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('adminNew.products.fields.barcode')}
            value={form.barcode}
            onChange={(e) => set({ barcode: e.target.value })}
          />
          <Input
            label={t('adminNew.products.fields.searchCode')}
            value={form.search_code}
            onChange={(e) => set({ search_code: e.target.value })}
          />
          <Input
            label={t('adminNew.products.fields.sku')}
            value={form.sku}
            onChange={(e) => set({ sku: e.target.value })}
          />
          <Input
            label={t('adminNew.products.fields.supplier')}
            value={form.supplier}
            onChange={(e) => set({ supplier: e.target.value })}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.products.fields.color')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={(e) => set({ color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-navy-100"
              />
              <Input value={form.color} onChange={(e) => set({ color: e.target.value })} />
            </div>
          </div>
          <Input
            label={t('adminNew.products.fields.imageUrl')}
            value={form.image_url}
            onChange={(e) => set({ image_url: e.target.value })}
            placeholder="https://"
          />
        </div>
      </section>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
        {t('adminNew.products.active')}
      </label>
    </div>
  );
}
