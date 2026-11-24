import type { ContentBlock } from './CmsProvider';

/** Stable discovery attributes; unknown metadata stays explicit until loaded. */
export function fieldSource(key: string, locale: string, block: ContentBlock | null, canEdit: boolean) {
  const source = block?.source;
  const product = /^catalog\.(product|product_group)\.([a-f0-9-]{36})\.(title|tagline|desc)$/.exec(key);
  const fields: Record<string, string> = { title: 'name_by_locale', tagline: 'short_description_by_locale', desc: 'long_description_by_locale' };
  const productField = product ? product[1] === 'product_group' && product[3] === 'desc' ? 'description_by_locale' : fields[product[3]] : undefined;
  return {
    'data-cms-key': key, 'data-cms-locale': locale,
    'data-cms-field-id': source?.field_id ?? (product ? `${product[1]}.${product[2]}.${productField}` : `content_block.${key}`),
    'data-cms-record-id': source?.record_id ?? product?.[2] ?? 'uncreated',
    'data-cms-field': source?.field ?? productField ?? 'value_by_locale',
    'data-cms-source': source?.source_type ?? (product ? product[1] : 'content_block'),
    'data-cms-publication': source?.publication_state ?? (product ? 'published' : 'uncreated'),
    'data-cms-version': source?.version ?? (product ? 'unloaded' : 'uncreated'),
    'data-cms-permission': source?.permissions.edit ?? 'cms.manage',
    'data-cms-can-edit': String(canEdit),
  };
}
