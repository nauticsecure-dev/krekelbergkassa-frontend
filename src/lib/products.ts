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
  slug: string;
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
  // Trello #86: purchase cost + stock tracking
  cost_price: string;
  stock_quantity: string;
  stock_minimum: string;
  // Visibility flags
  show_in_kassa: boolean;
  show_in_public: boolean;
  show_in_calculator: boolean;
  show_in_booking: boolean;
}

export const EMPTY_PRODUCT_FORM: ProductFormState = {
  code: '',
  slug: '',
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
  cost_price: '',
  stock_quantity: '',
  stock_minimum: '',
  show_in_kassa: true,
  show_in_public: false,
  show_in_calculator: false,
  show_in_booking: false,
};

export function productCostEuros(product: Product): number {
  const raw = product as unknown as Record<string, unknown>;
  const euros = raw.cost_price_euros;
  if (typeof euros === 'number' && euros > 0) return euros;
  if (typeof euros === 'string' && Number(euros) > 0) return Number(euros);
  const cents = raw.cost_price;
  if (typeof cents === 'number' && cents > 0) return cents / 100;
  if (typeof cents === 'string' && Number(cents) > 0) return Number(cents) / 100;
  return 0;
}

export function productToForm(product: Product): ProductFormState {
  const raw = product as unknown as Record<string, unknown>;
  const cost = productCostEuros(product);
  const stockQty = raw.stock_quantity;
  const stockMin = raw.stock_minimum;
  return {
    code: product.code,
    slug: String(raw.slug ?? ''),
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
    cost_price: cost ? String(cost) : '',
    stock_quantity: stockQty == null ? '' : String(stockQty),
    stock_minimum: stockMin == null ? '' : String(stockMin),
    show_in_kassa: (raw.show_in_kassa as boolean) ?? true,
    show_in_public: (raw.show_in_public as boolean) ?? false,
    show_in_calculator: (raw.show_in_calculator as boolean) ?? false,
    show_in_booking: (raw.show_in_booking as boolean) ?? false,
  };
}

export function formToPayload(form: ProductFormState): Record<string, unknown> {
  const priceExclCents = eurosToCents(form.price_excl_vat);
  const vatRate = Number(form.vat_rate) || 21;

  return {
    code: form.code.trim(),
    slug: form.slug.trim() || null,
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
    show_in_kassa: form.show_in_kassa,
    show_in_public: form.show_in_public,
    show_in_calculator: form.show_in_calculator,
    show_in_booking: form.show_in_booking,
    // Trello #86: cost price sent in cents (mirrors price_excl_vat); stock as ints.
    cost_price: form.cost_price.trim() === '' ? null : eurosToCents(form.cost_price),
    stock_quantity: form.stock_quantity.trim() === '' ? null : Math.round(Number(form.stock_quantity.replace(',', '.'))),
    stock_minimum: form.stock_minimum.trim() === '' ? null : Math.round(Number(form.stock_minimum.replace(',', '.'))),
  };
}
