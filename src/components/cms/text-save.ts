type Values = Partial<Record<string, string>>;

/** Reject partial provider output before any translated values enter the draft. */
export function validateTranslations(response: unknown, targets: string[]): Record<string, string> {
  const translations = (response as { translations?: unknown } | null)?.translations;
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    throw new Error('Invalid translation response');
  }
  const result: Record<string, string> = {};
  for (const target of targets) {
    const value = Object.prototype.hasOwnProperty.call(translations, target)
      ? (translations as Record<string, unknown>)[target] : undefined;
    if (typeof value !== 'string' || !value.trim()) throw new Error('Incomplete translation response');
    result[target] = value;
  }
  return result;
}

/** Translation failure permits a source-only save; save failure always rejects. */
export async function saveTextDraft({ values, base, source, locales, autoTranslate, translate, save, onTranslated }: {
  values: Values;
  base: Values;
  source: string;
  locales: readonly string[];
  autoTranslate: boolean;
  translate: (payload: { text: string; source_locale: string; target_locales: string[] }) => Promise<unknown>;
  save: (values: Values) => Promise<void>;
  onTranslated: (values: Values) => void;
}): Promise<'unchanged' | 'saved' | 'translated' | 'translationFailed' | 'translationFailedUnchanged'> {
  let draft = { ...values };
  let outcome: 'saved' | 'translated' | 'translationFailed' = 'saved';
  // Preserve explicitly entered translations; update every remaining language.
  const targets = locales.filter((tag) => tag !== source && draft[tag] === base[tag]);
  if (autoTranslate && draft[source]?.trim() && targets.length) {
    try {
      const result = validateTranslations(await translate({
        text: draft[source]!, source_locale: source, target_locales: targets,
      }), targets);
      draft = { ...draft, ...result };
      onTranslated(draft);
      outcome = 'translated';
    } catch {
      outcome = 'translationFailed';
    }
  }
  const changed: Values = {};
  for (const tag of locales) {
    if ((draft[tag] ?? '') !== (base[tag] ?? '')) changed[tag] = draft[tag] ?? '';
  }
  if (!Object.keys(changed).length) return outcome === 'translationFailed' ? 'translationFailedUnchanged' : 'unchanged';
  await save(changed);
  return outcome;
}
