'use client';

import * as React from 'react';
import { ImagePlus, ScanLine } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AdminSelect } from '@/components/admin/AdminUi';
import { BarcodeScannerModal } from '@/components/admin/BarcodeScannerModal';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { productsService, productGroupsService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { getApiErrorMessage } from '@/lib/api-error';
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
  productId,
}: {
  form: ProductFormState;
  onChange: (next: ProductFormState) => void;
  isEdit?: boolean;
  /** Existing product id — enables image upload (needs an id to POST to). */
  productId?: string;
}) {
  const { t, locale } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const priceExclCents = eurosToCents(form.price_excl_vat);
  const vatRate = Number(form.vat_rate) || 21;
  const priceInclCents = calcPriceInclCents(priceExclCents, vatRate);

  const set = (patch: Partial<ProductFormState>) => onChange({ ...form, ...patch });

  const groups = useQuery(['product-groups-form'], () => productGroupsService.list({ per_page: 100 }));
  const groupRows = (groups.data as { data?: Array<Record<string, unknown>> })?.data
    ?? (Array.isArray(groups.data) ? (groups.data as Array<Record<string, unknown>>) : []);

  const [showScanner, setShowScanner] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const onUploadFile = async (file: File | undefined) => {
    if (!file || !productId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await productsService.uploadImage(productId, fd);
      const url = res.image_url ?? res.product?.image_url;
      if (url) set({ image_url: url });
      push({ tone: 'success', title: t('adminNew.products.ai.uploaded') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    } finally {
      setUploading(false);
    }
  };

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
          <Input
            label={t('adminNew.products.fields.slug', { defaultValue: 'Slug (service-pagina)' })}
            value={form.slug}
            onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            placeholder="bijv. afspuiten"
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.products.fields.productGroup', { defaultValue: 'Productgroep' })}
            </label>
            <AdminSelect value={form.product_group_id} onChange={(v) => set({ product_group_id: v })}>
              <option value="">{t('adminNew.products.fields.productGroupNone', { defaultValue: 'Geen groep' })}</option>
              {groupRows.map((g) => (
                <option key={String(g.id)} value={String(g.id)}>
                  {String(g.name)} {g.code ? `(${String(g.code)})` : ''}
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
        {/* Trello #86: purchase cost + stock tracking */}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Input
            label={t('adminNew.products.fields.costPrice')}
            inputMode="decimal"
            value={form.cost_price}
            onChange={(e) => set({ cost_price: e.target.value })}
            placeholder="0,00"
          />
          <Input
            label={t('adminNew.products.fields.stockQuantity')}
            inputMode="numeric"
            value={form.stock_quantity}
            onChange={(e) => set({ stock_quantity: e.target.value })}
            placeholder="0"
          />
          <Input
            label={t('adminNew.products.fields.stockMinimum')}
            inputMode="numeric"
            value={form.stock_minimum}
            onChange={(e) => set({ stock_minimum: e.target.value })}
            placeholder="0"
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-navy-400">
          {t('adminNew.products.sections.pos')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.products.fields.barcode')}
            </label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  value={form.barcode}
                  onChange={(e) => set({ barcode: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                leftIcon={<ScanLine className="h-4 w-4" />}
                onClick={() => setShowScanner(true)}
              >
                {t('adminNew.products.fields.scanBarcode')}
              </Button>
            </div>
          </div>
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
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {t('adminNew.products.fields.imageUrl')}
            </label>
            <div className="flex items-start gap-3">
              {form.image_url ? (
                <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-navy-100 bg-sand-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                </span>
              ) : null}
              <div className="flex-1 space-y-2">
                <Input
                  value={form.image_url}
                  onChange={(e) => set({ image_url: e.target.value })}
                  placeholder="https://"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void onUploadFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<ImagePlus className="h-4 w-4" />}
                  disabled={!productId || uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? t('adminNew.products.ai.uploading') : t('adminNew.products.fields.uploadImage')}
                </Button>
                {!productId ? (
                  <p className="text-xs text-navy-400">{t('adminNew.products.fields.uploadHint')}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-navy-400">
          {t('adminNew.products.sections.visibility', { defaultValue: 'Zichtbaarheid' })}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            ['show_in_kassa', 'adminNew.products.fields.showInKassa', 'Tonen in kassa'],
            ['show_in_public', 'adminNew.products.fields.showInPublic', 'Tonen op website'],
            ['show_in_calculator', 'adminNew.products.fields.showInCalculator', 'Tonen in calculator'],
            ['show_in_booking', 'adminNew.products.fields.showInBooking', 'Tonen bij boekingen'],
          ] as [keyof typeof form, string, string][]).map(([field, key, fallback]) => (
            <label key={field} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form[field] as boolean}
                onChange={(e) => set({ [field]: e.target.checked })}
              />
              {t(key, { defaultValue: fallback })}
            </label>
          ))}
        </div>
      </section>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />
        {t('adminNew.products.active')}
      </label>

      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onDetected={(code) => {
          set({ barcode: code });
          setShowScanner(false);
          push({ tone: 'success', title: t('adminNew.products.fields.barcodeScanned', { code }) });
        }}
      />
    </div>
  );
}
