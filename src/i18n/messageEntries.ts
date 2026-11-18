export function messageEntries(dictionary: Record<string, unknown>, prefix = ''): [string, string][] {
  return Object.entries(dictionary).flatMap(([key, value]) => {
    const name = prefix + key;
    if (typeof value === 'string') return [[name, value]];
    return value && typeof value === 'object' ? messageEntries(value as Record<string, unknown>, name + '.') : [];
  });
}
