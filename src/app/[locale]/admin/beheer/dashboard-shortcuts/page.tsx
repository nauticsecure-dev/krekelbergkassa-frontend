'use client';
import { SearchSelect } from '@/components/ui/SearchSelect';

import * as React from 'react';
import { Star } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminContent, AdminSectionCard } from '@/components/admin/AdminUi';
import { ErrorState, LoadingState } from '@/components/admin/DataState';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@/lib/hooks/useAsync';
import { dashboardShortcutsService, type DashboardShortcut } from '@/lib/services';
import { adminRouteCatalog } from '@/config/admin-routes';
import { useIntl } from '@/i18n/IntlProvider';

const ROLES = ['super_admin', 'admin', 'employee', 'finance'] as const;
const ICONS = ['Star', 'CreditCard', 'Warehouse', 'FileText', 'Calculator', 'Receipt'];
const LOCALES = ['nl', 'en', 'de', 'fr'] as const;

export default function DashboardShortcutsPage() {
  const { t } = useIntl();
  const query = useQuery([], () => dashboardShortcutsService.manage());
  const [rows, setRows] = React.useState<DashboardShortcut[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await action(); } catch (err) { setError(getApiErrorMessage(err)); } finally { setBusy(false); }
  }
  const [savingId, setSavingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (query.data?.data) setRows(query.data.data);
  }, [query.data]);

  const routes = query.data?.routes?.length
    ? query.data.routes
    : adminRouteCatalog.map((entry) => entry.key);

  function patchRow(id: string, patch: Partial<DashboardShortcut>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function save(row: DashboardShortcut) {
    setSavingId(row.id);
    setNotice(null);
    try {
      const saved = await dashboardShortcutsService.update(row.id, {
        key: row.key,
        route_key: row.route_key,
        custom_url: row.custom_url || null,
        icon: row.icon,
        labels: row.labels,
        role_names: row.role_names && row.role_names.length > 0 ? row.role_names : null,
        sort_order: row.sort_order,
        active: row.active,
      });
      patchRow(row.id, saved.data);
      setNotice(t('adminNew.shortcuts.saved'));
    } finally {
      setSavingId(null);
    }
  }

  async function createShortcut() {
    const created = await dashboardShortcutsService.create({
      key: `shortcut-${Date.now().toString(36)}`,
      route_key: 'admin.kassa.index',
      icon: 'Star',
      labels: { nl: 'Nieuw', en: 'New', de: 'Neu', fr: 'Nouveau' },
      role_names: null,
      active: true,
      sort_order: rows.length,
    });
    setRows((current) => [...current, created.data]);
  }

  async function remove(id: string) {
    await dashboardShortcutsService.remove(id);
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...rows];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    const result = await dashboardShortcutsService.reorder(next.map((row) => row.id));
    setRows(result.data);
  }

  async function reset() {
    const result = await dashboardShortcutsService.reset();
    setRows(result.data);
    setNotice(t('adminNew.shortcuts.saved'));
  }

  return (
    <>
      <AdminPageHeader title={t('adminNew.shortcuts.title')} subtitle={t('adminNew.shortcuts.subtitle')} />
      <AdminContent>
        {error ? <ErrorState message={error} /> : null}
        {query.loading ? <LoadingState label={t('adminNew.common.loading')} /> : null}
        {query.error && query.errorStatus !== 403 ? <ErrorState message={query.error} onRetry={() => void query.refetch().catch(() => undefined)} /> : null}
        {query.errorStatus === 403 ? (
          <AdminSectionCard title={t('adminNew.shortcuts.title')} icon={Star}>
            <p className="text-sm text-navy-600">{t('adminNew.shortcuts.forbidden')}</p>
          </AdminSectionCard>
        ) : (
          <AdminSectionCard
            title={t('adminNew.shortcuts.title')}
            icon={Star}
            description={notice ?? undefined}
            action={
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={busy || query.loading || !!query.error} onClick={() => void perform(reset)}>
                  {t('adminNew.shortcuts.reset')}
                </Button>
                <Button type="button" variant="gold" disabled={busy || query.loading || !!query.error} onClick={() => void perform(createShortcut)}>
                  {t('adminNew.shortcuts.create')}
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              {rows.map((row, index) => (
                <form
                  key={row.id}
                  className="rounded-xl border border-navy-100 p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void perform(() => save(row));
                  }}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={busy || index === 0} onClick={() => void perform(() => move(index, -1))} aria-label={t('adminNew.shortcuts.moveUp')}>
                      {t('adminNew.shortcuts.moveUp')}
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={busy || index === rows.length - 1} onClick={() => void perform(() => move(index, 1))} aria-label={t('adminNew.shortcuts.moveDown')}>
                      {t('adminNew.shortcuts.moveDown')}
                    </Button>
                    <label className="ml-auto flex items-center gap-2 text-sm text-navy-700">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => patchRow(row.id, { active: event.target.checked })}
                      />
                      {t('adminNew.shortcuts.active')}
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-navy-700">
                      {t('adminNew.shortcuts.key')}
                      <input className="input-base mt-1 w-full" value={row.key} onChange={(event) => patchRow(row.id, { key: event.target.value })} />
                    </label>
                    <label className="text-sm text-navy-700">
                      {t('adminNew.shortcuts.route')}
                      <SearchSelect className="input-base mt-1 w-full" value={row.route_key} onChange={(event) => patchRow(row.id, { route_key: event.target.value })}>
                        {routes.map((routeKey) => (
                          <option key={routeKey} value={routeKey}>{routeKey}</option>
                        ))}
                      </SearchSelect>
                    </label>
                    <label className="text-sm text-navy-700">
                      {t('adminNew.shortcuts.label')}
                      <SearchSelect className="input-base mt-1 w-full" value={row.icon} onChange={(event) => patchRow(row.id, { icon: event.target.value })}>
                        {ICONS.map((icon) => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </SearchSelect>
                    </label>
                    {LOCALES.map((code) => (
                      <label key={code} className="text-sm text-navy-700">
                        {t('adminNew.shortcuts.label')} ({code})
                        <input
                          className="input-base mt-1 w-full"
                          value={row.labels?.[code] ?? ''}
                          onChange={(event) => patchRow(row.id, { labels: { ...row.labels, [code]: event.target.value } })}
                        />
                      </label>
                    ))}
                  </div>
                  <fieldset className="mt-3">
                    <legend className="text-sm text-navy-700">{t('adminNew.shortcuts.roles')}</legend>
                    <p className="mb-2 text-xs text-navy-500">{t('adminNew.shortcuts.allRoles')}</p>
                    <div className="flex flex-wrap gap-3">
                      {ROLES.map((role) => (
                        <label key={role} className="flex items-center gap-2 text-sm text-navy-700">
                          <input
                            type="checkbox"
                            checked={row.role_names?.includes(role) ?? false}
                            onChange={(event) => {
                              const current = row.role_names ?? [];
                              patchRow(row.id, {
                                role_names: event.target.checked
                                  ? [...current, role]
                                  : current.filter((item) => item !== role),
                              });
                            }}
                          />
                          {role}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-navy-600">{t('adminNew.shortcuts.advanced')}</summary>
                    <label className="mt-2 block text-sm text-navy-700">
                      {t('adminNew.shortcuts.customUrl')}
                      <input
                        className="input-base mt-1 w-full"
                        value={row.custom_url ?? ''}
                        placeholder="/admin/kassa"
                        onChange={(event) => patchRow(row.id, { custom_url: event.target.value || null })}
                      />
                    </label>
                  </details>
                  <div className="mt-3 flex gap-2">
                    <Button type="submit" variant="gold" disabled={busy || savingId === row.id}>
                      {t('adminNew.shortcuts.save')}
                    </Button>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => void perform(() => remove(row.id))}>
                      {t('admin.common.delete', { defaultValue: 'Verwijderen' })}
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </AdminSectionCard>
        )}
      </AdminContent>
    </>
  );
}
