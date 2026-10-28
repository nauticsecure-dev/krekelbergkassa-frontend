/** A successful empty configuration is authoritative; defaults are only for failures. */
export function dashboardShortcutRows<T>(response: { data: T[] } | null | undefined, failed: boolean, defaults: readonly T[]): readonly T[] {
  return response?.data ?? (failed ? defaults : []);
}
