'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package, Plus } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminContent, AdminSectionCard } from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { ProductForm, EMPTY_PRODUCT_FORM } from '@/components/admin/ProductForm';
import { useMutation } from '@/lib/hooks/useAsync';
import { productsService } from '@/lib/services';
import { formToPayload } from '@/lib/products';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

export default function NewProductPage() {
  const { locale, t } = useIntl();
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = React.useState(EMPTY_PRODUCT_FORM);
  const createProduct = useMutation(productsService.create);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createProduct.mutate(formToPayload(form));
      push({ tone: 'success', title: t('adminNew.products.toasts.created') });
      router.push(`/${locale}/admin/producten/${created.id}`);
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.products.new')}
        subtitle={t('adminNew.products.createSubtitle')}
        rightSlot={
          <Link href={`/${locale}/admin/producten`}>
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t('adminNew.products.backToList')}
            </Button>
          </Link>
        }
      />
      <AdminContent>
        <form onSubmit={onSubmit}>
          <AdminSectionCard title={t('adminNew.products.new')} icon={Package}>
            <ProductForm form={form} onChange={setForm} />
            <div className="mt-6 flex justify-end gap-2 border-t border-navy-100 pt-4">
              <Link href={`/${locale}/admin/producten`}>
                <Button type="button" variant="ghost">
                  {t('adminNew.common.cancel')}
                </Button>
              </Link>
              <Button type="submit" variant="gold" leftIcon={<Plus className="h-4 w-4" />} disabled={createProduct.loading}>
                {t('adminNew.common.save')}
              </Button>
            </div>
          </AdminSectionCard>
        </form>
      </AdminContent>
    </>
  );
}
