import type { ContentBlock } from './CmsProvider';

/** Stable discovery attributes; unknown metadata stays explicit until loaded. */
export function fieldSource(key: string, locale: string, block: ContentBlock | null, canEdit: boolean) {
  const source = block?.source;
  return {
    'data-cms-key': key, 'data-cms-locale': locale,
    'data-cms-field-id': source?.field_id ?? `content_block.${key}`,
    'data-cms-record-id': source?.record_id ?? 'uncreated',
    'data-cms-field': source?.field ?? 'value_by_locale',
    'data-cms-source': source?.source_type ?? 'content_block',
    'data-cms-publication': source?.publication_state ?? 'uncreated',
    'data-cms-version': source?.version ?? 'uncreated',
    'data-cms-permission': source?.permissions.edit ?? 'cms.manage',
    'data-cms-can-edit': String(canEdit),
  };
}
