import registry from './admin-enums.json';

type Variables = Record<string, string | number>;
type Translate = (key: string, variables?: Variables) => string;

/** Only registered keys can reach the translator, even for API-supplied values. */
export function tEnum(t: Translate, family: keyof typeof registry, value: unknown, variables?: Variables): string {
  const raw = String(value ?? '');
  const member = raw.startsWith(`${family}.`) ? raw.slice(family.length + 1) : raw;
  const keys: Record<string, string> = registry[family];
  if (Object.prototype.hasOwnProperty.call(keys, member)) return t(keys[member], variables);
  return typeof variables?.defaultValue === 'string' ? variables.defaultValue : raw;
}
