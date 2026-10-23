'use client';

import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core';
import nlLocale from '@fullcalendar/core/locales/nl';
import enLocale from '@fullcalendar/core/locales/en-gb';
import deLocale from '@fullcalendar/core/locales/de';
import frLocale from '@fullcalendar/core/locales/fr';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import type { EventDropArg, EventInput } from '@fullcalendar/core';
import { useIntl } from '@/i18n/IntlProvider';
import {
  fcViewName,
  formatLocalTime,
  localDateKey,
  type CalendarView,
  viewFromFc,
} from '@/lib/appointment-calendar';

const LOCALES = {
  nl: nlLocale,
  en: enLocale,
  de: deLocale,
  fr: frLocale,
};

export type SchedulerMove = {
  id: string;
  start: Date;
  end: Date;
  revert: () => void;
};

export type SchedulerSelection = {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

type Props = {
  events: EventInput[];
  view: CalendarView;
  date: string;
  onViewDateChange: (next: { view: CalendarView; date: string }) => void;
  onMove: (change: SchedulerMove) => void;
  onSelect: (selection: SchedulerSelection) => void;
  onEventClick: (id: string) => void;
};

function selectionFromRange(start: Date, end: Date): SchedulerSelection {
  const minutes = Math.max(30, Math.round((end.getTime() - start.getTime()) / 60000));
  const endTime = formatLocalTime(end);
  return {
    date: localDateKey(start),
    startTime: formatLocalTime(start),
    endTime: endTime === '00:00' ? '20:00' : endTime,
    durationMinutes: minutes,
  };
}

export function AppointmentScheduler({
  events,
  view,
  date,
  onViewDateChange,
  onMove,
  onSelect,
  onEventClick,
}: Props) {
  const { locale, t } = useIntl();
  const calendarRef = React.useRef<FullCalendar | null>(null);
  const skipSync = React.useRef(false);

  React.useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api || skipSync.current) return;
    const desired = fcViewName(view);
    const start = localDateKey(api.view.activeStart);
    const end = localDateKey(api.view.activeEnd);
    const coversDate = date >= start && date < end;
    if (api.view.type !== desired) {
      api.changeView(desired, date);
      return;
    }
    if (!coversDate || (view === 'day' && localDateKey(api.getDate()) !== date)) {
      api.gotoDate(date);
    }
  }, [view, date]);

  const publishRange = React.useCallback((arg: DatesSetArg) => {
    const nextView = viewFromFc(arg.view.type);
    const visibleStart = localDateKey(arg.start);
    const visibleEnd = localDateKey(arg.end);
    const anchor = date >= visibleStart && date < visibleEnd
      ? date
      : localDateKey(arg.view.currentStart);
    if (nextView === view && anchor === date) return;
    skipSync.current = true;
    onViewDateChange({ view: nextView, date: anchor });
    window.setTimeout(() => {
      skipSync.current = false;
    }, 0);
  }, [date, onViewDateChange, view]);

  const publishMove = (info: EventDropArg | EventResizeDoneArg) => {
    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) {
      info.revert();
      return;
    }
    onMove({
      id: info.event.id,
      start,
      end,
      revert: () => info.revert(),
    });
  };

  return (
    <div className="afspraken-calendar overflow-hidden rounded-xl border border-navy-100 bg-white">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={fcViewName(view)}
        initialDate={date}
        locales={[nlLocale, enLocale, deLocale, frLocale]}
        locale={LOCALES[locale as keyof typeof LOCALES] ?? nlLocale}
        firstDay={1}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridDay,timeGridWeek,dayGridMonth',
        }}
        buttonText={{
          today: t('planning.today'),
          month: t('planning.viewMonth'),
          week: t('planning.viewWeek'),
          day: t('planning.viewDay'),
        }}
        slotMinTime="07:00:00"
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        allDaySlot={false}
        nowIndicator
        expandRows
        height="auto"
        fixedWeekCount
        dayMaxEvents={4}
        navLinks
        editable
        eventDurationEditable
        eventOverlap={() => true}
        selectable
        selectMirror
        weekends
        events={events}
        datesSet={publishRange}
        eventDrop={publishMove}
        eventResize={publishMove}
        eventClick={(info: EventClickArg) => {
          info.jsEvent.preventDefault();
          onEventClick(info.event.id);
        }}
        select={(info) => {
          onSelect(selectionFromRange(info.start, info.end));
          info.view.calendar.unselect();
        }}
        dateClick={(info: DateClickArg) => {
          if (info.view.type !== 'dayGridMonth') return;
          onViewDateChange({ view: 'day', date: localDateKey(info.date) });
        }}
        eventDidMount={(info) => {
          info.el.setAttribute('title', info.event.title);
        }}
      />
    </div>
  );
}
