import type { Product } from './api-types';

export const PRODUCT_CATEGORIES = ['stalling', 'repair', 'retail', 'other'] as const;

export const SERVICE_CODES = [
  'stalling',
  'kranen',
  'afspuiten',
  'stroom',
  'winterstalling',
  'zomerstalling',
] as const;

export function productPriceExclEuros(product: Pick<Product, 'price_excl_vat_euros' | 'price_excl_vat'>) {
  if (product.price_excl_vat_euros != null && product.price_excl_vat_euros > 0) {
    return product.price_excl_vat_euros;
  }
  if (product.price_excl_vat != null) return product.price_excl_vat / 100;
  return 0;
}

export function productPriceInclEuros(product: Pick<Product, 'price_incl_vat_euros' | 'price_incl_vat'>) {
  if (product.price_incl_vat_euros != null && product.price_incl_vat_euros > 0) {
    return product.price_incl_vat_euros;
  }
  if (product.price_incl_vat != null) return product.price_incl_vat / 100;
  return 0;
}

export function eurosToCents(value: string | number): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function calcPriceInclCents(priceExclCents: number, vatRate: number) {
  return Math.round(priceExclCents * (1 + vatRate / 100));
}

export function parseTagsInput(value: string): string[] | null {
  const tags = value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length ? tags : null;
}

export function tagsToInput(tags?: string[] | null) {
  return tags?.join(', ') ?? '';
}

export interface ProductFormState {
  code: string;
  name: string;
  description: string;
  category: string;
  service_code: string;
  vat_rate: string;
  price_excl_vat: string;
  active: boolean;
  barcode: string;
  search_code: string;
  sku: string;
  supplier: string;
  color: string;
  image_url: string;
  tags: string;
  aliases: string;
  product_group_id: string;
}

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  code: '',
  name: '',
  description: '',
  category: '',
  service_code: '',
  vat_rate: '21',
  price_excl_vat: '',
  active: true,
  barcode: '',
  search_code: '',
  sku: '',
  supplier: '',
  color: '#2563EB',
  image_url: '',
  tags: '',
  aliases: '',
  product_group_id: '',
};

export function productToForm(product: Product): ProductFormState {
  return {
    code: product.code,
    name: product.name,
    description: product.description ?? '',
    category: product.category ?? '',
    service_code: product.service_code ?? '',
    vat_rate: String(product.vat_rate ?? '21'),
    price_excl_vat: String(productPriceExclEuros(product)),
    active: product.active,
    barcode: product.barcode ?? '',
    search_code: product.search_code ?? '',
    sku: product.sku ?? '',
    supplier: product.supplier ?? '',
    color: product.color ?? product.group?.color ?? '#2563EB',
    image_url: product.image_url ?? '',
    tags: tagsToInput(product.tags),
    aliases: tagsToInput(product.aliases),
    product_group_id: product.product_group_id ?? '',
  };
}

export function formToPayload(form: ProductFormState): Record<string, unknown> {
  const priceExclCents = eurosToCents(form.price_excl_vat);
  const vatRate = Number(form.vat_rate) || 21;

  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    category: form.category.trim() || null,
    service_code: form.service_code.trim() || null,
    vat_rate: form.vat_rate,
    price_excl_vat: priceExclCents,
    price_incl_vat: calcPriceInclCents(priceExclCents, vatRate),
    active: form.active,
    barcode: form.barcode.trim() || null,
    search_code: form.search_code.trim() || null,
    sku: form.sku.trim() || null,
    supplier: form.supplier.trim() || null,
    color: form.color.trim() || null,
    image_url: form.image_url.trim() || null,
    tags: parseTagsInput(form.tags),
    aliases: parseTagsInput(form.aliases),
    product_group_id: form.product_group_id.trim() || null,
  };
}
