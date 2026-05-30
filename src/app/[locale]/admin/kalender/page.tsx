'use client';

import * as React from 'react';
import {
  CalendarClock,
  CalendarDays,
  MapPin,
  Plus,
  UtensilsCrossed,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
} from '@/components/admin/AdminUi';
import {
  ExceptionsStrip,
  LocationCardGrid,
  LunchTimeline,
  WeeklyHoursGrid,
} from '@/components/admin/CalendarAdminViews';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { calendarService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import type { BoatLocation } from '@/lib/api-types';
import { formatTimeRange, toTimeInputValue } from '@/lib/time';

type ModalKind = 'regular' | 'exception' | 'lunch' | 'location' | 'editLocation' | null;

export default function CalendarAdminPage() {
  const { t, locale } = useIntl();
  const { push } = useToast();
  const [modal, setModal] = React.useState<ModalKind>(null);
  const [editLocation, setEditLocation] = React.useState<BoatLocation | null>(null);

  const [regularForm, setRegularForm] = React.useState({
    day_of_week: '1',
    open_from: '08:00',
    open_until: '17:00',
    is_closed: false,
  });
  const [exceptionForm, setExceptionForm] = React.useState({
    date: '',
    open_from: '08:00',
    open_until: '17:00',
    is_closed: false,
    label: '',
  });
  const [lunchForm, setLunchForm] = React.useState({ from: '12:00', until: '13:00' });
  const [locationForm, setLocationForm] = React.useState({
    code: '',
    section: '',
    difficulty: 'easy',
    extra_minutes: '0',
    notes: '',
  });
  const [editForm, setEditForm] = React.useState({
    difficulty: 'easy',
    is_blocked: false,
    notes: '',
  });

  const calendar = useQuery([], () => calendarService.get());
  const locations = useQuery(['calendar-locations'], () => calendarService.locations());

  const setRegular = useMutation(calendarService.setRegular);
  const setException = useMutation(calendarService.setException);
  const setLunch = useMutation(calendarService.setLunch);
  const createLocation = useMutation(calendarService.createLocation);
  const updateLocation = useMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      calendarService.updateLocation(id, payload)
  );

  const refreshAll = async () => {
    await Promise.all([calendar.refetch(), locations.refetch()]);
  };

  React.useEffect(() => {
    const block = calendar.data?.lunch_block;
    if (block?.open_from && block?.open_until) {
      setLunchForm({
        from: toTimeInputValue(block.open_from),
        until: toTimeInputValue(block.open_until),
      });
    }
  }, [calendar.data?.lunch_block]);

  const onSetRegular = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setRegular.mutate({
        day_of_week: Number(regularForm.day_of_week),
        open_from: regularForm.is_closed ? null : regularForm.open_from,
        open_until: regularForm.is_closed ? null : regularForm.open_until,
        is_closed: regularForm.is_closed,
      });
      setModal(null);
      await refreshAll();
      push({ tone: 'success', title: t('adminNew.calendar.toasts.regularSaved') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onSetException = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dateIso = new Date(`${exceptionForm.date}T12:00:00`).toISOString();
      await setException.mutate({
        date: dateIso,
        open_from: exceptionForm.is_closed ? null : exceptionForm.open_from,
        open_until: exceptionForm.is_closed ? null : exceptionForm.open_until,
        is_closed: exceptionForm.is_closed,
        label: exceptionForm.label || null,
      });
      setModal(null);
      await refreshAll();
      push({ tone: 'success', title: t('adminNew.calendar.toasts.exceptionSaved') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onSetLunch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setLunch.mutate(lunchForm);
      setModal(null);
      await refreshAll();
      push({ tone: 'success', title: t('adminNew.calendar.toasts.lunchSaved') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLocation.mutate({
        code: locationForm.code,
        section: locationForm.section || null,
        difficulty: locationForm.difficulty,
        extra_minutes: Number(locationForm.extra_minutes),
        is_blocked: false,
        notes: locationForm.notes || null,
      });
      setModal(null);
      setLocationForm({ code: '', section: '', difficulty: 'easy', extra_minutes: '0', notes: '' });
      await locations.refetch();
      push({ tone: 'success', title: t('adminNew.calendar.toasts.locationCreated') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const openEditLocation = (row: BoatLocation) => {
    setEditLocation(row);
    setEditForm({
      difficulty: row.difficulty,
      is_blocked: row.is_blocked,
      notes: row.notes ?? '',
    });
    setModal('editLocation');
  };

  const onUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLocation) return;
    try {
      await updateLocation.mutate({
        id: editLocation.id,
        payload: {
          difficulty: editForm.difficulty,
          is_blocked: editForm.is_blocked,
          notes: editForm.notes || null,
        },
      });
      setModal(null);
      setEditLocation(null);
      await locations.refetch();
      push({ tone: 'success', title: t('adminNew.calendar.toasts.locationUpdated') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const dayLabel = (day: number | null) =>
    day == null ? '—' : t(`adminNew.calendar.days.${day}`);

  const regular = calendar.data?.regular_hours ?? [];
  const exceptions = calendar.data?.exceptions ?? [];
  const lunch = calendar.data?.lunch_block;
  const locationRows = locations.data ?? [];
  const todayDay = new Date().getDay();
  const openDays = regular.filter((r) => !r.is_closed).length;
  const blockedLocations = locationRows.filter((l) => l.is_blocked).length;
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const regularFormFromDay = (day: number) => {
    const row = regular.find((r) => r.day_of_week === day);
    if (!row) {
      return {
        day_of_week: String(day),
        open_from: '08:00',
        open_until: '17:00',
        is_closed: false,
      };
    }
    return {
      day_of_week: String(day),
      open_from: toTimeInputValue(row.open_from) || '08:00',
      open_until: toTimeInputValue(row.open_until) || '17:00',
      is_closed: row.is_closed,
    };
  };

  const openRegularModal = (day?: number) => {
    setRegularForm(regularFormFromDay(day ?? Number(regularForm.day_of_week)));
    setModal('regular');
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.calendar.title')}
        subtitle={t('adminNew.calendar.subtitle')}
        rightSlot={
          <Button
            variant="gold"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setModal('location')}
          >
            {t('adminNew.calendar.newLocation')}
          </Button>
        }
        stats={[
          {
            label: t('adminNew.calendar.metrics.openDays'),
            value: openDays,
            hint: t('adminNew.calendar.metrics.openDaysHint'),
            icon: CalendarDays,
            tone: 'marine',
            loading: calendar.loading,
          },
          {
            label: t('adminNew.calendar.exceptions'),
            value: exceptions.length,
            hint: t('adminNew.calendar.metrics.exceptionsHint'),
            icon: CalendarClock,
            tone: exceptions.length > 0 ? 'warning' : 'success',
            loading: calendar.loading,
          },
          {
            label: t('adminNew.calendar.lunch'),
            value: lunch ? formatTimeRange(lunch.open_from, lunch.open_until) : '—',
            hint: lunch ? t('adminNew.calendar.metrics.lunchSet') : t('adminNew.calendar.noLunch'),
            icon: UtensilsCrossed,
            tone: lunch ? 'gold' : 'navy',
            loading: calendar.loading,
          },
          {
            label: t('adminNew.calendar.locations'),
            value: locationRows.length,
            hint: t('adminNew.calendar.metrics.locationsHint', {
              blocked: String(blockedLocations),
            }),
            icon: MapPin,
            tone: blockedLocations > 0 ? 'warning' : 'success',
            loading: locations.loading,
          },
        ]}
      />
      <AdminContent>
        {calendar.loading ? (
          <LoadingState label={t('adminNew.calendar.loading')} />
        ) : calendar.error ? (
          <ErrorState message={calendar.error} onRetry={() => void calendar.refetch()} />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
              <AdminSectionCard
                title={t('adminNew.calendar.regularHours')}
                description={t('adminNew.calendar.weekOverview')}
                icon={CalendarDays}
                action={
                  <Button size="sm" variant="outline" onClick={() => openRegularModal()}>
                    {t('adminNew.calendar.actions.setRegular')}
                  </Button>
                }
              >
                {regular.length === 0 ? (
                  <EmptyState
                    title={t('adminNew.calendar.noRegular')}
                    message={t('adminNew.calendar.noRegularMessage')}
                  />
                ) : (
                  <WeeklyHoursGrid
                    regular={regular}
                    lunch={lunch ?? null}
                    dayLabel={dayLabel}
                    closedLabel={t('adminNew.calendar.closed')}
                    todayDay={todayDay}
                    todayLabel={t('adminNew.calendar.today')}
                    onDayClick={openRegularModal}
                  />
                )}
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.calendar.lunch')}
                description={t('adminNew.calendar.lunchModal.subtitle')}
                icon={UtensilsCrossed}
                action={
                  <Button size="sm" variant="outline" onClick={() => setModal('lunch')}>
                    {t('adminNew.calendar.actions.setLunch')}
                  </Button>
                }
              >
                <LunchTimeline
                  lunch={lunch ?? null}
                  closedLabel={t('adminNew.calendar.closed')}
                  noLunchLabel={t('adminNew.calendar.noLunch')}
                />
              </AdminSectionCard>
            </div>

            <AdminSectionCard
              title={t('adminNew.calendar.exceptions')}
              description={t('adminNew.calendar.exceptionsOverview')}
              icon={CalendarClock}
              action={
                <Button size="sm" variant="outline" onClick={() => setModal('exception')}>
                  {t('adminNew.calendar.actions.addException')}
                </Button>
              }
            >
              <ExceptionsStrip
                exceptions={exceptions}
                closedLabel={t('adminNew.calendar.closed')}
                openLabel={t('adminNew.calendar.open')}
                emptyTitle={t('adminNew.calendar.noExceptions')}
                emptyMessage={t('adminNew.calendar.noExceptionsMessage')}
                onAdd={() => setModal('exception')}
                addLabel={t('adminNew.calendar.actions.addException')}
                dateLocale={dateLocale}
              />
            </AdminSectionCard>

            <AdminSectionCard
              title={t('adminNew.calendar.locations')}
              description={t('adminNew.calendar.locationsOverview')}
              icon={MapPin}
              action={
                <Button
                  size="sm"
                  variant="gold"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setModal('location')}
                >
                  {t('adminNew.calendar.newLocation')}
                </Button>
              }
            >
              {locations.loading ? (
                <LoadingState label={t('adminNew.calendar.loadingLocations')} />
              ) : locationRows.length === 0 ? (
                <EmptyState
                  title={t('adminNew.calendar.noLocations')}
                  message={t('adminNew.calendar.noLocationsMessage')}
                />
              ) : (
                <LocationCardGrid
                  locations={locationRows}
                  onEdit={openEditLocation}
                  editLabel={t('adminNew.calendar.actions.edit')}
                  blockedLabel={t('adminNew.calendar.blocked')}
                  openLabel={t('adminNew.calendar.open')}
                />
              )}
            </AdminSectionCard>
          </div>
        )}
      </AdminContent>

      <Modal open={modal === 'regular'} onClose={() => setModal(null)}>
        <form onSubmit={onSetRegular}>
          <AdminModalHeader
            title={t('adminNew.calendar.regularModal.title')}
            subtitle={t('adminNew.calendar.regularModal.subtitle')}
          />
          <AdminModalBody>
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-navy-700">
                  {t('adminNew.calendar.fields.dayOfWeek')}
                </span>
                <select
                  className="input-base"
                  value={regularForm.day_of_week}
                  onChange={(e) => setRegularForm(regularFormFromDay(Number(e.target.value)))}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>
                      {dayLabel(d)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-navy-700">
                <input
                  type="checkbox"
                  checked={regularForm.is_closed}
                  onChange={(e) => setRegularForm({ ...regularForm, is_closed: e.target.checked })}
                />
                {t('adminNew.calendar.fields.closedDay')}
              </label>
              {!regularForm.is_closed ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t('adminNew.calendar.fields.openFrom')}
                    type="time"
                    value={regularForm.open_from}
                    onChange={(e) => setRegularForm({ ...regularForm, open_from: e.target.value })}
                    required
                  />
                  <Input
                    label={t('adminNew.calendar.fields.openUntil')}
                    type="time"
                    value={regularForm.open_until}
                    onChange={(e) => setRegularForm({ ...regularForm, open_until: e.target.value })}
                    required
                  />
                </div>
              ) : null}
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={setRegular.loading}>
              {setRegular.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <Modal open={modal === 'exception'} onClose={() => setModal(null)}>
        <form onSubmit={onSetException}>
          <AdminModalHeader
            title={t('adminNew.calendar.exceptionModal.title')}
            subtitle={t('adminNew.calendar.exceptionModal.subtitle')}
          />
          <AdminModalBody>
            <div className="space-y-4">
              <Input
                label={t('adminNew.calendar.fields.date')}
                type="date"
                value={exceptionForm.date}
                onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                required
              />
              <Input
                label={t('adminNew.calendar.fields.label')}
                value={exceptionForm.label}
                onChange={(e) => setExceptionForm({ ...exceptionForm, label: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-navy-700">
                <input
                  type="checkbox"
                  checked={exceptionForm.is_closed}
                  onChange={(e) =>
                    setExceptionForm({ ...exceptionForm, is_closed: e.target.checked })
                  }
                />
                {t('adminNew.calendar.fields.closedDay')}
              </label>
              {!exceptionForm.is_closed ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t('adminNew.calendar.fields.openFrom')}
                    type="time"
                    value={exceptionForm.open_from}
                    onChange={(e) =>
                      setExceptionForm({ ...exceptionForm, open_from: e.target.value })
                    }
                  />
                  <Input
                    label={t('adminNew.calendar.fields.openUntil')}
                    type="time"
                    value={exceptionForm.open_until}
                    onChange={(e) =>
                      setExceptionForm({ ...exceptionForm, open_until: e.target.value })
                    }
                  />
                </div>
              ) : null}
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={setException.loading}>
              {setException.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <Modal open={modal === 'lunch'} onClose={() => setModal(null)}>
        <form onSubmit={onSetLunch}>
          <AdminModalHeader
            title={t('adminNew.calendar.lunchModal.title')}
            subtitle={t('adminNew.calendar.lunchModal.subtitle')}
          />
          <AdminModalBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('adminNew.calendar.fields.openFrom')}
                type="time"
                value={lunchForm.from}
                onChange={(e) => setLunchForm({ ...lunchForm, from: e.target.value })}
                required
              />
              <Input
                label={t('adminNew.calendar.fields.openUntil')}
                type="time"
                value={lunchForm.until}
                onChange={(e) => setLunchForm({ ...lunchForm, until: e.target.value })}
                required
              />
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={setLunch.loading}>
              {setLunch.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <Modal open={modal === 'location'} onClose={() => setModal(null)}>
        <form onSubmit={onCreateLocation}>
          <AdminModalHeader
            title={t('adminNew.calendar.locationModal.title')}
            subtitle={t('adminNew.calendar.locationModal.subtitle')}
          />
          <AdminModalBody>
            <div className="space-y-4">
              <Input
                label={t('adminNew.calendar.columns.code')}
                value={locationForm.code}
                onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                required
              />
              <Input
                label={t('adminNew.calendar.columns.section')}
                value={locationForm.section}
                onChange={(e) => setLocationForm({ ...locationForm, section: e.target.value })}
              />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-navy-700">
                  {t('adminNew.calendar.columns.difficulty')}
                </span>
                <select
                  className="input-base"
                  value={locationForm.difficulty}
                  onChange={(e) => setLocationForm({ ...locationForm, difficulty: e.target.value })}
                >
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="difficult">difficult</option>
                  <option value="hall">hall</option>
                </select>
              </label>
              <Input
                label={t('adminNew.calendar.fields.extraMinutes')}
                inputMode="numeric"
                value={locationForm.extra_minutes}
                onChange={(e) =>
                  setLocationForm({ ...locationForm, extra_minutes: e.target.value })
                }
              />
              <Input
                label={t('adminNew.calendar.fields.notes')}
                value={locationForm.notes}
                onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })}
              />
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createLocation.loading}>
              {createLocation.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <Modal open={modal === 'editLocation'} onClose={() => setModal(null)}>
        <form onSubmit={onUpdateLocation}>
          <AdminModalHeader
            title={t('adminNew.calendar.editLocationModal.title')}
            subtitle={t('adminNew.calendar.editLocationModal.subtitle')}
          />
          <AdminModalBody>
            <div className="space-y-4">
              <div className="rounded-lg border border-navy-100 bg-sand-50/60 px-3 py-2 text-sm font-medium text-navy-800">
                {editLocation?.code}
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-navy-700">
                  {t('adminNew.calendar.columns.difficulty')}
                </span>
                <select
                  className="input-base"
                  value={editForm.difficulty}
                  onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                >
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="difficult">difficult</option>
                  <option value="hall">hall</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-navy-700">
                <input
                  type="checkbox"
                  checked={editForm.is_blocked}
                  onChange={(e) => setEditForm({ ...editForm, is_blocked: e.target.checked })}
                />
                {editForm.is_blocked
                  ? t('adminNew.calendar.blocked')
                  : t('adminNew.calendar.open')}
              </label>
              <Input
                label={t('adminNew.calendar.fields.notes')}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={updateLocation.loading}>
              {updateLocation.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
