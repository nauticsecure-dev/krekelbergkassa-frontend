'use client';
import { SearchSelect } from '@/components/ui/SearchSelect';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { appointmentsService, boatsService, customersService, serviceCatalogService } from '@/lib/services';
import { usePermission } from '@/lib/permissions';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import type { Boat, Customer } from '@/lib/api-types';

type Props = {
  open: boolean;
  defaultDate: string;
  defaultStart: string;
  defaultDuration: number;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
};

export function AppointmentCreateModal({
  open,
  defaultDate,
  defaultStart,
  defaultDuration,
  onClose,
  onCreated,
}: Props) {
  const { t } = useIntl();
  const { can } = usePermission();
  const canManage = can('planning.manage');
  const { push } = useToast();
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [boatId, setBoatId] = React.useState('');
  const [serviceCode, setServiceCode] = React.useState('');
  const [date, setDate] = React.useState(defaultDate);
  const [startTime, setStartTime] = React.useState(defaultStart);
  const [duration, setDuration] = React.useState(String(defaultDuration || 60));
  const [locationId, setLocationId] = React.useState('');
  const [assignee, setAssignee] = React.useState('');
  const [conflicts, setConflicts] = React.useState<Array<Record<string, unknown>> | null>(null);
  const [checking, setChecking] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(customerSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [customerSearch]);

  const customersQuery = useQuery<{ data: Customer[] }>(
    [open, debouncedSearch],
    async () => (open ? customersService.list({ search: debouncedSearch || undefined, per_page: 50 }) : { data: [] })
  );
  const boatsQuery = useQuery<{ data: Boat[] }>(
    [open, customerId],
    async () => (open && customerId ? boatsService.list({ customer_id: customerId, per_page: 100 }) : { data: [] })
  );
  const optionsQuery = useQuery([open, canManage], () => open && canManage ? appointmentsService.options() : Promise.resolve({ locations: [], employees: [] }));
  const catalogQuery = useQuery([open, canManage], () => open && canManage ? serviceCatalogService.services() : Promise.resolve({ services: [] }));
  const services = Array.from(new Map((catalogQuery.data?.services ?? [])
    .filter((service) => service.visibility?.booking)
    .map((service) => [service.service_code || service.code, service])).values());
  const selectedService = services.find((service) => (service.service_code || service.code) === serviceCode);

  React.useEffect(() => {
    if (!open) return;
    setCustomerSearch('');
    setCustomerId('');
    setSelectedCustomer(null);
    setBoatId('');
    setServiceCode('');
    setDate(defaultDate);
    setStartTime(defaultStart.slice(0, 5) || '09:00');
    setDuration(String(defaultDuration || 60));
    setLocationId('');
    setAssignee('');
    setConflicts(null);
    // Defaults are applied only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    setConflicts(null);
  }, [date, startTime, duration, locationId, serviceCode]);

  const create = useMutation(appointmentsService.create);
  const customerResults = customersQuery.data?.data ?? [];
  const customers = selectedCustomer && !customerResults.some((customer) => customer.id === selectedCustomer.id)
    ? [selectedCustomer, ...customerResults] : customerResults;
  // A previous customer's response must never remain selectable during a new lookup.
  const boats = (boatsQuery.data?.data ?? []).filter((boat) => boat.customer_id === customerId);
  const locations = optionsQuery.data?.locations ?? [];
  const staff = optionsQuery.data?.employees ?? [];
  const hasConflicts = (conflicts?.length ?? 0) > 0;
  const canSubmit = Boolean(canManage && customerId && boats.some((boat) => boat.id === boatId)
    && !boatsQuery.loading && !boatsQuery.error && date && startTime && selectedService
    && Number.isInteger(Number(duration)) && Number(duration) >= 15 && Number(duration) <= 1440);

  const submit = async () => {
    if (!canSubmit) return;
    const boat = boats.find((item) => item.id === boatId);
    const location = locations.find((item) => locationId ? item.id === locationId : item.code === boat?.location_code);
    const durationMinutes = Number(duration) || 60;
    if (conflicts === null) {
      setChecking(true);
      try {
        const res = await appointmentsService.checkConflicts({
          date,
          start_time: startTime.slice(0, 5),
          duration_minutes: durationMinutes,
        });
        setConflicts(res.conflicts ?? []);
        if (res.has_conflicts) {
          setChecking(false);
          return;
        }
      } catch (err) {
        setChecking(false);
        push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) });
        return;
      }
      setChecking(false);
    } else if (hasConflicts) {
      return;
    }

    try {
      await create.mutate({
        customer_id: customerId,
        boat_id: boatId,
        service_codes: [serviceCode],
        date,
        start_time: startTime.slice(0, 5),
        duration_minutes: durationMinutes,
        location_code: location?.code || null,
        assigned_to_user_id: assignee || null,
      });
      push({ tone: 'success', title: t('planning.created') });
      await onCreated();
      onClose();
    } catch (err) {
      push({ tone: 'error', title: t('planning.actionFailed'), message: getApiErrorMessage(err) });
    }
  };

  return (
    <Modal open={open && canManage} onClose={onClose} size="lg" className="overflow-y-auto p-6">
      <h3 className="font-display text-xl text-navy-900">{t('planning.createTitle')}</h3>
      <p className="mt-1 text-sm text-navy-500">{t('planning.createSubtitle')}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldCustomer')}</span>
          <SearchSelect
            className="input-base w-full"
            aria-label={t('planning.fieldCustomer')}
            placeholder={t('planning.selectPlaceholder')}
            searchPlaceholder={t('adminNew.common.search')}
            onSearchChange={setCustomerSearch}
            loading={customersQuery.loading}
            error={customersQuery.error}
            value={customerId}
            onChange={(event) => {
              setCustomerId(event.target.value);
              setSelectedCustomer(customers.find((customer) => customer.id === event.target.value) ?? null);
              setBoatId('');
              boatsQuery.setData(null);
            }}
            options={customers.map((customer) => ({ value: customer.id, label: customer.name }))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldBoat')}</span>
          <SearchSelect className="input-base w-full" value={boatId} onChange={(event) => setBoatId(event.target.value)}
            aria-label={t('planning.fieldBoat')}
            disabled={!customerId || boatsQuery.loading}
            loading={boatsQuery.loading}
            error={boatsQuery.error}
            placeholder={!customerId ? t('planning.selectCustomerFirst') : boatsQuery.loading ? t('planning.loading') : t('planning.selectPlaceholder')}
            emptyLabel={t('planning.noCustomerBoats')}
            options={boats.map((boat) => ({ value: boat.id, label: boat.name }))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldService')}</span>
          <SearchSelect className="input-base w-full" value={serviceCode} onChange={(event) => setServiceCode(event.target.value)}>
            <option value="">{t('planning.selectPlaceholder')}</option>
            {services.map((service) => (
              <option key={service.code} value={service.service_code || service.code}>{service.name || service.code}</option>
            ))}
          </SearchSelect>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldLocation')}</span>
          <SearchSelect className="input-base w-full" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            <option value="">{t('planning.selectPlaceholder')}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.code}</option>
            ))}
          </SearchSelect>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldAssignee')}</span>
          <SearchSelect className="input-base w-full" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
            <option value="">{t('planning.unassigned')}</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </SearchSelect>
        </label>
        <Input label={t('planning.fieldDate')} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input label={t('planning.fieldStartTime')} type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        <Input
          label={t('planning.fieldDuration')}
          type="number"
          min={15}
          max={1440}
          step={15}
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </div>
      {catalogQuery.error || optionsQuery.error ? <p role="alert" className="mt-3 text-sm text-red-700">{catalogQuery.error || optionsQuery.error}</p> : null}
      {hasConflicts ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="font-semibold">{t('planning.conflictTitle')}</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {conflicts!.map((conflict, index) => {
              const time = String(conflict.start_time ?? '').slice(0, 5);
              const label = String(conflict.boat_name ?? conflict.customer_name ?? conflict.id ?? t('planning.appointment'));
              return <li key={String(conflict.id ?? index)}>{time ? `${time} · ` : ''}{label}</li>;
            })}
          </ul>
        </div>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{t('planning.cancel')}</Button>
        <Button
          variant="gold"
          onClick={() => void submit()}
          disabled={!canSubmit || checking || create.loading || hasConflicts}
        >
          {checking ? t('planning.checking') : t('planning.createConfirm')}
        </Button>
      </div>
    </Modal>
  );
}
