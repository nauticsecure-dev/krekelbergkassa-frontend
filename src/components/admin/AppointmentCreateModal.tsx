'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { appointmentsService, boatsService, calendarService, customersService, usersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import type { AdminUser, Boat, BoatLocation, Customer } from '@/lib/api-types';

const SERVICES: { code: string; labelKey: string }[] = [
  { code: 'kraan', labelKey: 'planning.serviceCrane' },
  { code: 'afspuiten', labelKey: 'planning.serviceWash' },
  { code: 'stalling', labelKey: 'planning.serviceStorage' },
  { code: 'winterberging', labelKey: 'planning.serviceWinter' },
];

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
  const { push } = useToast();
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [boatId, setBoatId] = React.useState('');
  const [serviceCode, setServiceCode] = React.useState('kraan');
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
    async () => (open ? customersService.list({ search: debouncedSearch || undefined, per_page: 50 }) : { data: [] }),
    { immediate: false }
  );
  const boatsQuery = useQuery<{ data: Boat[] }>(
    [open, customerId],
    async () => (open && customerId ? boatsService.list({ customer_id: customerId, per_page: 100 }) : { data: [] }),
    { immediate: false }
  );
  const locationsQuery = useQuery<BoatLocation[]>(
    [open],
    async () => (open ? calendarService.locations() : []),
    { immediate: false }
  );
  const staffQuery = useQuery<{ data: AdminUser[] }>(
    [open],
    async () => (open ? usersService.list({ per_page: 100 }) : { data: [] }),
    { immediate: false }
  );

  React.useEffect(() => {
    if (!open) return;
    setCustomerSearch('');
    setCustomerId('');
    setBoatId('');
    setServiceCode('kraan');
    setDate(defaultDate);
    setStartTime(defaultStart.slice(0, 5) || '09:00');
    setDuration(String(defaultDuration || 60));
    setLocationId('');
    setAssignee('');
    setConflicts(null);
    void customersQuery.refetch();
    void locationsQuery.refetch();
    void staffQuery.refetch();
    // Defaults are applied only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (open) void customersQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  React.useEffect(() => {
    if (open && customerId) void boatsQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, open]);

  React.useEffect(() => {
    setConflicts(null);
  }, [date, startTime, duration, locationId, serviceCode]);

  const create = useMutation(appointmentsService.create);
  const customers = customersQuery.data?.data ?? [];
  const boats = boatsQuery.data?.data ?? [];
  const locations = locationsQuery.data ?? [];
  const staff = (staffQuery.data?.data ?? []).filter((user) =>
    ['staff', 'admin', 'manager'].includes(user.role)
  );
  const hasConflicts = (conflicts?.length ?? 0) > 0;
  const canSubmit = Boolean(customerId && boatId && date && startTime && serviceCode);

  const submit = async () => {
    if (!canSubmit) return;
    const location = locations.find((item) => item.id === locationId);
    const durationMinutes = Number(duration) || 60;
    if (conflicts === null) {
      setChecking(true);
      try {
        const res = await appointmentsService.checkConflicts({
          date,
          start_time: startTime.slice(0, 5),
          duration_minutes: durationMinutes,
          location_id: locationId || null,
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
    <Modal open={open} onClose={onClose} size="lg" className="p-6">
      <h3 className="font-display text-xl text-navy-900">{t('planning.createTitle')}</h3>
      <p className="mt-1 text-sm text-navy-500">{t('planning.createSubtitle')}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldCustomer')}</span>
          <input
            className="input-base mb-2"
            value={customerSearch}
            placeholder={t('adminNew.common.search')}
            onChange={(event) => setCustomerSearch(event.target.value)}
          />
          <select
            className="input-base w-full"
            value={customerId}
            onChange={(event) => {
              setCustomerId(event.target.value);
              setBoatId('');
            }}
          >
            <option value="">{t('planning.selectPlaceholder')}</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldBoat')}</span>
          <select className="input-base w-full" value={boatId} onChange={(event) => setBoatId(event.target.value)}>
            <option value="">{t('planning.selectPlaceholder')}</option>
            {boats.map((boat) => (
              <option key={boat.id} value={boat.id}>{boat.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldService')}</span>
          <select className="input-base w-full" value={serviceCode} onChange={(event) => setServiceCode(event.target.value)}>
            {SERVICES.map((service) => (
              <option key={service.code} value={service.code}>{t(service.labelKey)}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldLocation')}</span>
          <select className="input-base w-full" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            <option value="">{t('planning.selectPlaceholder')}</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.code}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-navy-700">{t('planning.fieldAssignee')}</span>
          <select className="input-base w-full" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
            <option value="">{t('planning.unassigned')}</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>
        <Input label={t('planning.fieldDate')} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input label={t('planning.fieldStartTime')} type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        <Input
          label={t('planning.fieldDuration')}
          type="number"
          min={15}
          step={15}
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </div>
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
