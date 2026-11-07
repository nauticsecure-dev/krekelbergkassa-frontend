'use client';

import Link from 'next/link';
import { usePermission } from '@/lib/permissions';
import { YardQuickPhoto } from './YardQuickPhoto';
import { YardDailyPlan } from './YardDailyPlan';
import { Expand, Minus, Plus, Redo2, Undo2, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { api, type ApiError } from '@/lib/api';
import { control, YardHistory, yardEndpoint, type Page } from './YardHistory';
import { YardMoves } from './YardMoves';
import { YardPhotoSessions, useYardPhotoCopy } from './YardPhotoSessions';

type Point = { x: number; y: number };
type Position = Point & { rotation: number; scale: number; location_code?: string | null };
type Placement = { actual: Position | null; planned: (Position & { appointment_id?: string; task_id?: string }) | null; previous: Position | null; presence: 'arrived' | 'departed' | null; version: number };
type Zone = Point & { name: string; type: 'building' | 'restricted' | 'route'; width: number; height: number };
type Boat = {
  id: string; name: string; registration_number: string | null; customer: { id: string; name: string } | null;
  length_cm: number | null; width_cm: number | null; location_code: string | null; photo_url: string | null;
  storage: { id: string; type: string; start_date: string; end_date: string } | null;
  statuses: Record<string, string>; placement: Placement;
  services?: string[];
  move_job?: { date: string; assignee_id?: string; state: string; due_at: string };
};
type Yard = {
  width: number; height: number; can_edit: boolean; can_publish: boolean;
  can_plan: boolean; can_execute: boolean;
  can_manage_photos: boolean;
  can_view_daily_plan?: boolean;
  background: (Point & { width: number; height: number; version: number; published_at?: string; zones?: Zone[] }) | null;
  boats: Page<Boat>;
};
type Draft = { id: string; position: Position; group?: { id: string; position: Position; version: number }[] };
type Operation = 'move_now' | 'arrive' | 'depart' | 'place' | 'plan' | 'replan' | 'assign' | 'complete' | 'remove' | 'restore' | 'cancel_plan';
type MoveChoice = 'now' | 'today' | 'tomorrow' | 'next';
type MoveOptions = {
  assigned_to_user_id: string | null;
  choices: Record<MoveChoice, string | null>;
  current: { due_at: string | null; duration: number; equipment: string; reason: string; priority: string; instructions: string } | null;
};

function yardInputTime(value: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(value)).replace(' ', 'T');
}

const statuses: Record<string, { label: string; color: string; route?: (id: string) => string }> = {
  storage: { label: 'Stalling', color: '#4ade80', route: (id) => `stalling/${id}` },
  planning: { label: 'Kraan / Planning', color: '#60a5fa', route: (id) => `afspraken?appointment_id=${id}` },
  maintenance: { label: 'Onderhoud', color: '#fb923c', route: (id) => `werkorders/${id}` },
  sale: { label: 'Te koop', color: '#c084fc', route: (id) => `stalling/${id}` },
  move: { label: 'Verplaatsen', color: '#facc15' },
  action: { label: 'Actie vereist', color: '#f87171', route: (id) => `afspraken?appointment_id=${id}` },
  idle: { label: 'Geen actieve werkzaamheden', color: '#94a3b8' },
};

const dimensions = (boat: Boat) => boat.length_cm && boat.width_cm
  ? `${boat.length_cm / 100} × ${boat.width_cm / 100} m` : 'Afmetingen ontbreken';
function describePosition(position: Position | null) {
  if (!position) return 'Geen plaatsing';
  return [position.location_code, `${position.x.toFixed(1)} m / ${position.y.toFixed(1)} m`, `${Math.round(position.rotation)}°`].filter(Boolean).join(' · ');
}

const statusKeys = (boat: Boat) => Object.keys(boat.statuses).length ? Object.keys(boat.statuses) : ['idle'];
const dateFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' });
function yardDay(offset: number) {
  const day = new Date(dateFormat.format(new Date()) + 'T12:00:00Z');
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

function onYardDate(value: string | undefined, filter: string) {
  if (!filter) return true;
  if (!value) return false;
  if (filter !== 'week') return value === filter;
  const weekday = new Date(yardDay(0) + 'T12:00:00Z').getUTCDay();
  const monday = 7 - (weekday + 6) % 7;
  return value >= yardDay(monday) && value <= yardDay(monday + 6);
}

const initialView = { x: 0, y: 0, scale: 1 };
const panel = 'rounded-xl border border-slate-700 bg-slate-900/80 p-4';

function zoomAt(view: typeof initialView, multiplier: number, anchor: Point) {
  const scale = Math.min(12, Math.max(0.5, view.scale * multiplier));
  const ratio = scale / view.scale;
  return { scale, x: anchor.x + (view.x - anchor.x) * ratio, y: anchor.y + (view.y - anchor.y) * ratio };
}

function errorMessage(error: ApiError) {
  const payload = error.data as { errors?: Record<string, string[]> } | undefined;
  return Object.values(payload?.errors ?? {}).flat().join(' ') || error.message || 'De aanvraag is mislukt.';
}

export default function YardCanvas({ locale }: { locale: string }) {
  const photoCopy = useYardPhotoCopy();
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const space = useRef(false);
  const touches = useRef(new Map<number, Point>());
  const [expanded, setExpanded] = useState(false);
  const [help, setHelp] = useState(false);
  const [locked, setLocked] = useState(false);
  const [guides, setGuides] = useState(false);
  const { can } = usePermission();
  const [menu, setMenu] = useState<{ boat: Boat; x?: number; y?: number }>();
  const [photo, setPhoto] = useState<Boat>();
  const [dailyPlan, setDailyPlan] = useState(false);
  const [conflict, setConflict] = useState<Placement['actual']>();
  const [quickTask, setQuickTask] = useState<Boat>();
  const gesture = useRef<{ start: Point; origin: Point; draft?: Draft; boat?: Boat; originalDraft?: Draft; rotation?: boolean; moved?: boolean } | null>(null);
  const moveDialog = useRef<HTMLDialogElement>(null);
  const confirmation = useRef<{ payload: string; key: string }>();
  const saving = useRef(false);
  const moveOptionsRequest = useRef(0);
  const mapFrame = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number>();
  const [yard, setYard] = useState<Yard>();
  const [placed, setPlaced] = useState<Boat[]>([]);
  const [results, setResults] = useState<Page<Boat>>();
  const [search, setSearch] = useState('');
  const [length, setLength] = useState('');
  const [storage, setStorage] = useState('');
  const [site, setSite] = useState('');
  const [resultPage, setResultPage] = useState(1);
  const [selected, setSelected] = useState<Boat>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hover, setHover] = useState<Boat>();
  const [view, setView] = useState(initialView);
  const [tab, setTab] = useState('Werfcanvas');
  const initialTabResolved = useRef(false);
  const [detail, setDetail] = useState('Overzicht');
  const [drawer, setDrawer] = useState(true);
  const [status, setStatus] = useState('');
  const [service, setService] = useState('');
  const [zone, setZone] = useState('');
  const [employee, setEmployee] = useState('');
  const [date, setDate] = useState('');
  const [positionMode, setPositionMode] = useState('both');
  const [showStatus, setShowStatus] = useState(true);
  const [arrows, setArrows] = useState(true);
  const [labels, setLabels] = useState(true);
  const [plans, setPlans] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [picker, setPicker] = useState(true);
  const [unplaced, setUnplaced] = useState<Page<Boat>>();
  const [unplacedPage, setUnplacedPage] = useState(1);
  const [unplacedError, setUnplacedError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loadedAt, setLoadedAt] = useState<Date>();
  const [editingMap, setEditingMap] = useState(false);
  const [background, setBackground] = useState('');
  const [preview, setPreview] = useState('');
  const [preparedBackground, setPreparedBackground] = useState<File>();
  const [alignment, setAlignment] = useState({ x: 0, y: 0, width: 120, height: 90 });
  const [zoneText, setZoneText] = useState('[]');
  const [draft, setDraft] = useState<Draft>();
  const [undo, setUndo] = useState<(Draft | undefined)[]>([]);
  const [redo, setRedo] = useState<(Draft | undefined)[]>([]);
  const [reason, setReason] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assignee, setAssignee] = useState('');
  const [equipment, setEquipment] = useState('');
  const [duration, setDuration] = useState('30');
  const [priority, setPriority] = useState('normal');
  const [instructions, setInstructions] = useState('');
  const [quickMove, setQuickMove] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [rememberAssignee, setRememberAssignee] = useState(false);
  const [offsetStart, setOffsetStart] = useState<string>();
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  const [linkAppointment, setLinkAppointment] = useState(false);
  const [warnings, setWarnings] = useState<string[]>();
  const [scheduleWarnings, setScheduleWarnings] = useState<string[]>([]);
  const location = draft?.position.location_code ?? '';
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const admin = `/${locale}/admin`;

  useEffect(() => {
    if (quickMove && !moveDialog.current?.open) moveDialog.current?.showModal();
  }, [quickMove]);

  useEffect(() => {
    if (window.location.hash === '#verplaatsingen') setTab('Verplaatsingen');
  }, []);

  useEffect(() => {
    if (!yard?.can_plan) return;
    let active = true;
    api<typeof assignees>(`${yardEndpoint}/move-assignees`)
      .then((rows) => { if (active) setAssignees(rows); })
      .catch((err) => { if (active) setError(errorMessage(err)); });
    return () => { active = false; };
  }, [yard?.can_plan]);

  useEffect(() => {
    let active = true;
    async function load() {
      const first = await api<Yard>(yardEndpoint, { query: { placed: 1 } });
      const rows = [...first.boats.data];
      for (let page = 2; page <= first.boats.last_page && active; page++) {
        const next = await api<Yard>(yardEndpoint, { query: { placed: 1, page } });
        rows.push(...next.boats.data);
      }
      if (active) {
        if (!initialTabResolved.current) {
          initialTabResolved.current = true;
          if (first.can_execute && !first.can_plan && !window.location.hash && window.matchMedia('(max-width: 767px)').matches) {
            setTab('Mijn werk vandaag');
          }
        }
        setYard(first);
        setPlaced(rows);
        setLoadedAt(new Date());
        setSelected((previous) => rows.find((boat) => boat.id === previous?.id) ?? previous);
      }
    }
    load().catch((err) => { if (active) setError(errorMessage(err)); });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    if (tab !== 'Werfcanvas') return;
    let active = true;
    setUnplacedError('');
    api<Yard>(yardEndpoint, { query: { placed: 0, page: unplacedPage } })
      .then((result) => { if (active) setUnplaced(result.boats); })
      .catch((err) => { if (active) setUnplacedError(errorMessage(err)); });
    return () => { active = false; };
  }, [revision, unplacedPage, retry, tab]);

  useEffect(() => {
    if (tab !== 'Botenlijst' && !search.trim()) return;
    let active = true;
    setResults(undefined);
    setSearchError('');
    const timer = window.setTimeout(() => {
      api<Yard>(yardEndpoint, { query: {
        search, page: resultPage,
        length_cm: tab === 'Botenlijst' ? length : undefined,
        storage: tab === 'Botenlijst' ? storage : undefined,
        placed: tab === 'Botenlijst' ? (site === 'unplaced-arrival' ? 0 : site) : undefined,
        presence: tab === 'Botenlijst' && site === 'unplaced-arrival' ? 'arrived' : undefined,
      } })
        .then((result) => { if (active) setResults(result.boats); })
        .catch((err) => { if (active) setSearchError(errorMessage(err)); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, length, storage, site, resultPage, tab, revision, retry]);

  useEffect(() => {
    setWarnings(undefined);
    setScheduleWarnings([]);
    if (!draft) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api<{ warnings: string[]; schedule_warnings?: string[] }>(`${yardEndpoint}/placements/${draft.id}/check`, {
        method: 'POST', body: {
          position: { ...draft.position, location_code: location || null },
          ...(quickMove && dueAt ? { due_at: offsetStart ?? dueAt, assigned_to_user_id: assignee || null, duration_minutes: Number(duration), equipment } : {}),
        },
      }).then((result) => {
        if (active) {
          setWarnings(result.warnings);
          setScheduleWarnings(result.schedule_warnings ?? []);
        }
      })
        .catch((err) => { if (active) setWarnings([errorMessage(err)]); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [draft, location, quickMove, dueAt, offsetStart, assignee, duration, equipment]);

  const imageVersion = yard?.background?.version;
  useEffect(() => {
    if (!imageVersion) return;
    let active = true;
    let url = '';
    api<Blob>(`${yardEndpoint}/background/${imageVersion}`).then((blob) => {
      if (active) {
        url = URL.createObjectURL(blob);
        setBackground(url);
      }
    }).catch((err) => { if (active) setError(errorMessage(err)); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [imageVersion]);

  useEffect(() => {
    if (!draft && !editingMap) return;
    const navigation = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.target === '_blank' || link.hasAttribute('download') || link.pathname === window.location.pathname) return;
      if (!window.confirm('Niet-opgeslagen wijzigingen verlaten?')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', navigation, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', navigation, true);
    };
  }, [draft, editingMap]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (gesture.current || !event.deltaY) return;
      const matrix = element.getScreenCTM();
      if (!matrix) return;
      const anchor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      setView((current) => zoomAt(current, event.deltaY < 0 ? 1.12 : 1 / 1.12, anchor));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    const observer = new ResizeObserver(() => { gesture.current = null; touches.current.clear(); });
    observer.observe(element);
    return () => { element.removeEventListener('wheel', wheel); observer.disconnect(); };
  }, [yard, tab]);

  useEffect(() => {
    const change = () => {
      if (document.fullscreenElement !== root.current) setExpanded(false);
    };
    const blur = () => { space.current = false; };
    document.addEventListener('fullscreenchange', change);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('fullscreenchange', change);
      window.removeEventListener('blur', blur);
    };
  }, []);

  useEffect(() => {
    if (!expanded || !root.current) return;
    const inert: HTMLElement[] = [];
    let branch: HTMLElement | null = root.current;
    while (branch && branch !== document.body) {
      for (const sibling of Array.from(branch.parentElement?.children ?? [])) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.inert) {
          sibling.inert = true;
          inert.push(sibling);
        }
      }
      branch = branch.parentElement;
    }
    return () => { inert.forEach((element) => { element.inert = false; }); };
  }, [expanded]);

  async function toggleFullscreen() {
    if (expanded) {
      try {
        if (document.fullscreenElement === root.current) await document.exitFullscreen();
      } catch {
        // The browser can handle Escape before this handler runs.
      } finally { setExpanded(false); }
      return;
    }
    setExpanded(true);
    try {
      await root.current?.requestFullscreen?.();
    } catch {
      // The fixed workspace stays active when native fullscreen is denied.
    }
    fullscreenButton.current?.focus();
  }

  function showHover(boat: Boat) {
    window.clearTimeout(hoverTimer.current);
    setHover(boat);
  }

  function hideHover() {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHover(undefined), 300);
  }

  function choose(boat: Boat, focus = false, multiple = false) {
    if (draft && draft.id !== boat.id) return;
    if (selected?.id !== boat.id) {
      setUndo([]); setRedo([]); setDetail('Overzicht'); setQuickTask(undefined);
    }
    setSelected(boat);
    const ids = multiple ? (selectedIds.includes(boat.id) ? selectedIds.filter((id) => id !== boat.id) : [...selectedIds, boat.id]) : [boat.id];
    setSelectedIds(ids);
    if (!ids.includes(boat.id)) setSelected(placed.find((item) => item.id === ids.at(-1)));
    setDrawer(true);
    if (focus && boat.placement.actual && yard) {
      const { x, y } = boat.placement.actual;
      setView({ x: yard.width / 2 - x * 2.5, y: yard.height / 2 - y * 2.5, scale: 2.5 });
    }
  }

  function edit(next: Draft | undefined) {
    setUndo((items) => [...items.slice(-99), draft]);
    setRedo([]);
    setDraft(next);
  }

  function resetDraft() {
    moveOptionsRequest.current++;
    confirmation.current = undefined;
    setQuickMove(false);
    setLoadingOptions(false);
    setRememberAssignee(false);
    setOffsetStart(undefined);
    setConflict(undefined);
    setDraft(undefined);
    setUndo([]);
    setRedo([]);
    setReason('');
    setLinkAppointment(false);
    setAssignee('');
    setDueAt('');
    setEquipment('');
    setDuration('30');
    setPriority('normal');
    setInstructions('');
  }

  async function loadMoveOptions(boat: Boat, choice?: MoveChoice) {
    const request = ++moveOptionsRequest.current;
    setLoadingOptions(true);
    setError('');
    try {
      const options = await api<MoveOptions>(`${yardEndpoint}/placements/${boat.id}/move-options`, {
        query: choice ? { assigned_to_user_id: assignee || 'none', duration_minutes: Number(duration), equipment } : undefined,
      });
      if (request !== moveOptionsRequest.current) return;
      if (!choice) {
        setAssignee(options.assigned_to_user_id ?? '');
        if (options.current) {
          setDuration(String(options.current.duration));
          setEquipment(options.current.equipment);
          setReason(options.current.reason);
          setPriority(options.current.priority);
          setInstructions(options.current.instructions);
        }
      }
      const start = choice ? options.choices[choice] : options.current?.due_at ?? options.choices.next;
      if (start) {
        setDueAt(yardInputTime(start));
        setOffsetStart(start);
      } else {
        setError('Geen beschikbaar tijdstip voor deze keuze. Kies een andere datum of pas de details aan.');
      }
    } catch (err) {
      if (request === moveOptionsRequest.current) setError(errorMessage(err as ApiError));
    } finally {
      if (request === moveOptionsRequest.current) setLoadingOptions(false);
    }
  }

  function openQuickMove(boat: Boat) {
    setHover(undefined);
    setNotice('');
    setQuickMove(true);
    if (!dueAt) void loadMoveOptions(boat);
  }

  function pointer(event: PointerEvent<SVGElement>): Point {
    const matrix = svg.current?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
  }

  function start(event: PointerEvent<SVGElement>, boat?: Boat, position?: Position, rotation = false) {
    if (event.button !== 0 || busy || (boat && draft && draft.id !== boat.id && !space.current)) return;
    if (space.current) {
      event.stopPropagation();
      boat = undefined;
      position = undefined;
    }
    if (boat) {
      event.stopPropagation();
      if (!draft?.group?.length) choose(boat, false, event.shiftKey);
      if (locked || !yard?.can_edit || event.shiftKey || !position || (boat.placement.actual && !yard.can_plan)
        || (boat.placement.planned && !['planned', 'assigned'].includes(boat.move_job?.state ?? ''))) return;
    }
    svg.current?.setPointerCapture(event.pointerId);
    if (event.pointerType === 'mouse' && !rotation) svg.current?.focus({ preventScroll: true });
    gesture.current = { start: pointer(event), origin: view, boat, originalDraft: draft, draft: boat && position ? { id: boat.id, position: { ...position, location_code: position.location_code ?? boat.location_code }, group: draft?.group } : undefined, rotation };
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    if (touches.current.size === 2 && touches.current.has(event.pointerId)) {
      const before = [...touches.current.values()];
      const point = pointer(event);
      touches.current.set(event.pointerId, point);
      const after = [...touches.current.values()];
      const distance = ([a, b]: Point[]) => Math.hypot(a.x - b.x, a.y - b.y);
      if (distance(before) > 0) {
        const anchor = { x: (after[0].x + after[1].x) / 2, y: (after[0].y + after[1].y) / 2 };
        setView((current) => zoomAt(current, distance(after) / distance(before), anchor));
      }
      return;
    }
    if (touches.current.has(event.pointerId)) touches.current.set(event.pointerId, pointer(event));
    const drag = gesture.current;
    if (!drag || !yard) return;
    const point = pointer(event);
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) < 0.25) return;
    if (!drag.moved && drag.draft) {
      setUndo((items) => [...items.slice(-99), draft]);
      setRedo([]);
    }
    drag.moved = true;
    if (!drag.draft) {
      setView({ ...view, x: drag.origin.x + dx, y: drag.origin.y + dy });
      return;
    }
    const original = drag.draft.position;
    const position = drag.rotation ? {
      ...original,
      rotation: (Math.atan2((point.y - view.y) / view.scale - original.y, (point.x - view.x) / view.scale - original.x) * 180 / Math.PI + 360) % 360,
    } : {
      ...original,
      x: Math.max(0, Math.min(yard.width, original.x + dx / view.scale)),
      y: Math.max(0, Math.min(yard.height, original.y + dy / view.scale)),
    };
    setDraft({ ...drag.draft, position });
  }

  function zoom(multiplier: number) {
    if (!yard) return;
    setView((current) => zoomAt(current, multiplier, { x: yard.width / 2, y: yard.height / 2 }));
  }

  async function save(operation: Operation) {
    if (!selected || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    setConflict(undefined);
    try {
      const endpoint = `${yardEndpoint}/placements/${selected.id}`;
      if (operation === 'plan' && draft?.group?.length && selected.placement.actual) {
        await api(yardEndpoint + '/group-moves', { method: 'POST', body: {
          due_at: dueAt, assigned_to_user_id: assignee || null, equipment, duration_minutes: Number(duration),
          priority, instructions, reason,
          moves: [
            { id: selected.id, version: selected.placement.version, position: { ...draft.position, location_code: location || null } },
            ...groupPositions(draft, selected.placement.actual),
          ],
        } });
        resetDraft(); setNotice('Groepsverplaatsingen gepland.'); setRevision((value) => value + 1);
        return;
      }
      const planning = operation === 'plan' || operation === 'replan';
      const body = { operation, version: selected.placement.version, reason,
          confirmed: ['arrive', 'depart', 'complete', 'move_now'].includes(operation) ? true : undefined,
          due_at: planning ? offsetStart ?? dueAt : undefined,
          assigned_to_user_id: planning || operation === 'assign' ? assignee || null : undefined,
          equipment: planning ? equipment : undefined,
          duration_minutes: planning ? Number(duration) : undefined,
          priority: planning ? priority : undefined,
          instructions: planning ? instructions : undefined,
          remember_assignee: planning && quickMove ? rememberAssignee : undefined,
          appointment_id: operation === 'plan' && linkAppointment ? selected.statuses.planning : undefined,
          position: (planning || ['place', 'move_now'].includes(operation)) && draft?.id === selected.id ? { ...draft.position, location_code: location || null } : undefined };
      const payload = JSON.stringify(body);
      if (planning && quickMove && confirmation.current?.payload !== payload && globalThis.crypto?.randomUUID) {
        confirmation.current = { payload, key: globalThis.crypto.randomUUID() };
      }
      const placement = await api<Placement>(operation === 'move_now' ? endpoint + '/move-now' : endpoint, {
        method: operation === 'move_now' ? 'POST' : 'PATCH',
        body: { ...body, idempotency_key: planning && quickMove ? confirmation.current?.key : undefined },
      });
      const updated = { ...selected, placement };
      setSelected(updated);
      setPlaced((boats) => [...boats.filter((boat) => boat.id !== updated.id), ...(placement.actual ? [updated] : [])]);
      resetDraft();
      setNotice(planning ? 'Verplaatsing ingepland.' : 'Wijziging opgeslagen.');
      setRevision((value) => value + 1);
    } catch (err) {
      const failure = err as ApiError;
      if (failure.status === 409) setConflict((failure.data as { placement?: Placement })?.placement?.actual);
      setError(errorMessage(failure));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function undoEdit() {
    if (!undo.length || busy) return;
    setRedo([...redo, draft]);
    setDraft(undo.at(-1));
    setUndo(undo.slice(0, -1));
  }

  function redoEdit() {
    const next = redo.at(-1);
    if (!redo.length || busy || (next && next.id !== selected?.id)) return;
    setUndo([...undo, draft]);
    setDraft(next);
    setRedo(redo.slice(0, -1));
  }

  function groupPositions(item: Draft, actual: Position) {
    return item.group?.map((member) => ({
      id: member.id, version: member.version, position: {
        ...member.position, location_code: null,
        x: member.position.x + item.position.x - actual.x,
        y: member.position.y + item.position.y - actual.y,
      },
    })) ?? [];
  }

  function beginMove(boat: Boat, grouped = false) {
    if (draft || !boat.placement.actual || boat.placement.planned || locked || busy) return;
    const group = grouped ? placed.filter((member) => member.id !== boat.id && selectedIds.includes(member.id))
      .flatMap((member) => member.placement.actual && !member.placement.planned
        ? [{ id: member.id, position: member.placement.actual, version: member.placement.version }] : []) : [];
    if (grouped && (group.length !== selectedIds.length - 1 || group.length > 19)) {
      setError('Selecteer maximaal 20 geplaatste boten zonder actieve verplaatsing.');
      return;
    }
    if (!grouped) choose(boat);
    edit({ id: boat.id, position: { ...boat.placement.actual, location_code: boat.placement.actual.location_code ?? boat.location_code }, group });
  }

  function removePlacement() {
    if (yard?.can_edit && !draft && !busy && selected?.placement.actual && !selected.placement.planned &&
      window.confirm('Boot van de werfkaart verwijderen?')) void save('remove');
  }

  function saveDraft() {
    if (!draft || busy || !selected || conflict !== undefined) return;
    if (!selected.placement.actual) void save('place');
    else if (!draft.group?.length) openQuickMove(selected);
    else if (dueAt && Number(duration) >= 1 && Number(duration) <= 720) void save('plan');
    else setDrawer(true);
  }

  function placeDraft(boat: Boat, point?: Point) {
    if (!yard?.can_edit || draft || busy || locked || boat.placement.actual || boat.placement.presence === 'departed') return;
    if (boat.placement.presence !== 'arrived' && !boat.placement.previous &&
      !window.confirm(`De aankomst van ${boat.name} is onbevestigd. Wil je een kaartplaatsing voorbereiden?`)) return;
    choose(boat);
    edit({ id: boat.id, position: { ...(point ?? { x: yard.width / 2, y: yard.height / 2 }), rotation: 0, scale: 1, location_code: boat.location_code } });
    if (!point) setView(initialView);
  }

  function resetView() {
    setView(initialView);
    setHover(undefined);
    if (!draft) { setSelected(undefined); setSelectedIds([]); }
  }

  const mapImage = preview ? alignment : yard?.background;
  const matches = (boat: Boat) => {
    const keys = statusKeys(boat);
    const job = boat.move_job;
    const point = boat.placement.actual;
    return (!status || (status === 'present' ? !!point || boat.placement.presence === 'arrived' : status === 'unplaced' ? !point : keys.includes(status))) &&
      (!service || (boat.services ?? keys).includes(service)) &&
      (!zone || (point?.location_code ?? boat.location_code) === zone ||
        (point && yard?.background?.zones?.some((area) => area.name === zone && point.x >= area.x &&
          point.x <= area.x + area.width && point.y >= area.y && point.y <= area.y + area.height))) &&
      (!employee || (job?.assignee_id === employee && onYardDate(job.date, date)));
  };
  const visible = placed.filter((boat) => matches(boat) && (positionMode !== 'planned' ||
    (boat.placement.planned && onYardDate(boat.move_job?.date, date)) || boat.id === draft?.id));
  const mapCount = visible.length;
  const groupDestinations = draft && selected?.placement.actual ? groupPositions(draft, selected.placement.actual) : [];
  const zones = [...new Set([...(yard?.background?.zones?.map((area) => area.name) ?? []),
    ...placed.map((boat) => boat.placement.actual?.location_code ?? boat.location_code).filter((code): code is string => !!code)])].sort();
  if (draft && selected && !visible.some((boat) => boat.id === draft.id)) visible.push(selected);
  const front = visible.findIndex((boat) => boat.id === selected?.id);
  if (front !== -1) visible.push(...visible.splice(front, 1));
  const showResults = tab === 'Botenlijst' || !!search.trim();
  const canNavigate = () => !draft && !editingMap || window.confirm('Niet-opgeslagen wijzigingen verlaten?');
  const filterClass = `${control} min-w-0 2xl:max-w-28`;
  const filterControls = <>
    <select aria-label="Status" className={filterClass} value={status} onChange={(event) => { setStatus(event.target.value); if (event.target.value === 'unplaced') { setPicker(true); setDrawer(true); } }}>
      <option value="">Status</option><option value="present">Aanwezig</option><option value="unplaced">Zonder locatie</option>
      {Object.entries(statuses).map(([key, entry]) => <option key={key} value={key}>{entry.label}</option>)}
    </select>
    <select aria-label="Dienst" className={filterClass} value={service} onChange={(event) => setService(event.target.value)}>
      <option value="">Dienst</option><option value="storage">Stalling</option><option value="planning">Kraan</option><option value="washing">Afspuiten</option>
      <option value="maintenance">Onderhoud</option><option value="sale">Makelaardij</option>
    </select>
    <select aria-label="Zone" className={filterClass} value={zone} onChange={(event) => setZone(event.target.value)}>
      <option value="">Zone</option>{zones.map((name) => <option key={name}>{name}</option>)}
    </select>
    {!!assignees.length && <select aria-label="Medewerker filter" className={filterClass} value={employee} onChange={(event) => setEmployee(event.target.value)}>
      <option value="">Medewerker</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select>}
    <details className="relative"><summary className={control} title="Datum">{date ? (date === 'week' ? 'Volgende week' : date) : 'Datum'}</summary>
      <div className={`${panel} absolute right-0 z-30 grid gap-1`}>
        {[['', 'Alle datums'], [yardDay(0), 'Vandaag'], [yardDay(1), 'Morgen'], ['week', 'Volgende week']].map(([value, name]) =>
          <button key={name} className={control} onClick={() => setDate(value)}>{name}</button>)}
        <input className={control} aria-label="Eigen datum" type="date" value={date === 'week' ? '' : date} onChange={(event) => setDate(event.target.value)} />
        <select className={control} aria-label="Positieweergave" value={positionMode} onChange={(event) => setPositionMode(event.target.value)}>
          <option value="both">Beide</option><option value="current">Huidig</option><option value="planned">Gepland</option>
        </select>
      </div>
    </details>
    <button className={`${control} whitespace-nowrap`} onClick={() => {
      setStatus(''); setService(''); setZone(''); setEmployee(''); setDate(''); setSearch(''); setResultPage(1); setPositionMode('both');
      if (!draft) { setSelected(undefined); setSelectedIds([]); }
    }}>Wis filters</button>
  </>;
  const secondaryControls = <>
    <button className={`${control} whitespace-nowrap`} onClick={() => setView(initialView)}>Pas in</button>
    <details className="relative"><summary className={control}>Lagen</summary>
      <div className={`${panel} absolute right-0 z-30 grid w-48 gap-2 text-sm`}>
        <label><input type="checkbox" checked={labels} onChange={(event) => setLabels(event.target.checked)} /> Bootlabels</label>
        <label><input type="checkbox" checked={showStatus} onChange={(event) => setShowStatus(event.target.checked)} /> Statuscirkels</label>
        <label><input type="checkbox" checked={plans} onChange={(event) => setPlans(event.target.checked)} /> Geplande posities</label>
        <label><input type="checkbox" checked={arrows} onChange={(event) => setArrows(event.target.checked)} /> Bewegingspijlen</label>
        <label><input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} /> Uitlijnraster</label>
        <label><input type="checkbox" checked={showZones} onChange={(event) => setShowZones(event.target.checked)} /> Werfgrenzen en zones</label>
      </div>
    </details>
    <details className="relative"><summary className={control} title="Kaartacties">⋯</summary>
      <div className={`${panel} absolute right-0 z-30 grid w-52 gap-1`}>
        <div className="flex gap-1 sm:hidden">
          <button className={control} aria-label="Uitzoomen" onClick={() => zoom(.8)}>−</button>
          <output className="self-center text-xs">{Math.round(view.scale * 100)}%</output>
          <button className={control} aria-label="Inzoomen" onClick={() => zoom(1.25)}>+</button>
        </div>
        <button className={control} onClick={resetView}>Herstel weergave</button>
        <button className={control} disabled={!selected?.placement.actual} onClick={() => selected && choose(selected, true)}>Zoom naar selectie</button>
        {yard?.can_plan && yard.can_edit && selected?.placement.actual && selectedIds.length > 1 && !draft && !locked &&
          <button className={control} onClick={() => beginMove(selected, true)}>Groepsverplaatsing voorstellen</button>}
        <button className={control} aria-pressed={locked} onClick={() => setLocked(!locked)}>{locked ? 'Plaatsingen ontgrendelen' : 'Plaatsingen vergrendelen'}</button>
        {yard?.can_view_daily_plan && <button className={control} onClick={() => setDailyPlan(true)}>Dagplanning afdrukken</button>}
        <button className={control} onClick={() => setHelp(!help)}>Sneltoetsen</button>
      </div>
    </details>
  </>;

  return <section ref={root} aria-label="Werfcanvas"
    className={`bg-[#07192b] p-2 text-white ${expanded ? 'fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col gap-2 overflow-hidden' : 'relative min-h-[70vh] space-y-3 rounded-2xl sm:p-4'}`}
    onKeyUp={(event) => { if (event.code === 'Space') space.current = false; }}
    onKeyDown={(event) => {
      const target = event.target as Element;
      if (target.closest('dialog')) return;
      if (event.key === 'Escape') {
        if (menu) setMenu(undefined);
        else if (photo) setPhoto(undefined);
        else if (dailyPlan) setDailyPlan(false);
        else if (help) setHelp(false);
        else if (expanded) void toggleFullscreen();
        else if (draft) resetDraft();
        else { setSelected(undefined); setSelectedIds([]); }
        return;
      }
      if (tab !== 'Werfcanvas' || target.closest('input, textarea, select, [contenteditable]') || event.defaultPrevented) return;
      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;
      if (command && ['z', 'y', 's'].includes(key)) {
        event.preventDefault();
        if (key === 's') saveDraft();
        else if (key === 'y' || event.shiftKey) redoEdit();
        else undoEdit();
      } else if (!command && !event.altKey) {
        if (key === '+' || key === '=') zoom(1.25);
        else if (key === '-') zoom(0.8);
        else if (key === '0') setView(initialView);
        else if (key === '?') setHelp(!help);
        else if (['delete', 'backspace'].includes(key)) removePlacement();
        else if (event.code === 'Space' && target.closest('svg')) space.current = true;
        else if (key.startsWith('arrow') && target.closest('svg') && !locked && !busy && yard?.can_edit && selected &&
          !selected.placement.planned && (draft || (yard.can_plan && selected.placement.actual))) {
          const origin = draft?.position ?? (selected.placement.actual && { ...selected.placement.actual, location_code: selected.placement.actual.location_code ?? selected.location_code });
          if (origin) {
            const step = event.shiftKey ? 1 : 0.1;
            const x = Math.max(0, Math.min(yard.width, origin.x + (key === 'arrowright' ? step : key === 'arrowleft' ? -step : 0)));
            const y = Math.max(0, Math.min(yard.height, origin.y + (key === 'arrowdown' ? step : key === 'arrowup' ? -step : 0)));
            edit({ id: selected.id, group: draft?.group, position: { ...origin, x, y } });
          }
        } else return;
        event.preventDefault();
      }
    }}> 
    {!expanded && <><header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold sm:text-3xl">Werfcanvas — Operationele werfplanning</h1>
        <p className="text-sm text-slate-300">Beheer boten, verplaatsingen en historie op één werfplattegrond.</p></div>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg bg-[#efd092] px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={!yard?.can_edit || !!draft || busy} onClick={() => { setPicker(true); setDrawer(true); setTab('Werfcanvas'); }}>+ Boot plaatsen</button>
        <button className={control} disabled={locked || !yard?.can_edit || !yard.can_plan || !selected?.placement.actual || !!selected.placement.planned || !!draft || busy} onClick={() => {
          if (!selected?.placement.actual) return;
          beginMove(selected); setTab('Werfcanvas');
        }}>+ Verplaatsing</button>
        <button className={control} disabled={!yard?.can_publish || busy} onClick={() => {
          setEditingMap(!editingMap); setPreview(''); setPreparedBackground(undefined);
          if (yard?.background) setAlignment(yard.background);
          setZoneText(JSON.stringify(yard?.background?.zones ?? [], null, 2));
          setTab('Werfcanvas');
        }}>Kaart bewerken</button>
      </div>
    </header>
    <nav aria-label="Werfweergaven" className="flex flex-wrap gap-2">
      {yard?.can_manage_photos && <button className={control} aria-pressed={tab === 'photos'} onClick={() => { if (canNavigate()) setTab('photos'); }}>{photoCopy('title')}</button>}
      {['Werfcanvas', 'Botenlijst', ...(yard?.can_execute ? ['Verplaatsingen', 'Mijn werk vandaag'] : []), 'Historie'].map((name) => <button key={name} className={`${control} ${tab === name ? '!bg-blue-800' : ''}`} aria-pressed={tab === name} onClick={() => { if (name === tab || canNavigate()) { setTab(name); setResultPage(1); } }}>{name}</button>)}
      {[['Taken', 'taken'], ['Planning', 'planning']].map(([name, route]) => <Link key={route} className={control} href={`${admin}/${route}`}>{name}</Link>)}
    </nav></>}
    {error && <div role="alert" className="flex flex-wrap items-center gap-2 rounded bg-red-950 p-3 text-sm">
      <span>{error}</span><button className={control} onClick={() => {
        if (draft && !window.confirm('Concept wissen en kaart vernieuwen?')) return;
        resetDraft(); setError(''); setRevision((value) => value + 1);
      }}>Vernieuwen</button>
    </div>}
    {notice && <p role="status" className="text-sm text-green-300">{notice}</p>}
    {yard?.can_manage_photos && tab === 'photos' && <YardPhotoSessions onPublish={yard.can_publish ? (file) => {
      setPreparedBackground(file);
      setPreview(URL.createObjectURL(file));
      setAlignment(yard.background ?? { x: 0, y: 0, width: yard.width, height: yard.height });
      setZoneText(JSON.stringify(yard.background?.zones ?? [], null, 2));
      setEditingMap(true);
      setTab('Werfcanvas');
    } : undefined} />}
    {yard?.can_execute && (tab === 'Verplaatsingen' || tab === 'Mijn werk vandaag') &&
      <YardMoves key={tab} mine={tab === 'Mijn werk vandaag'} onChange={() => setRevision((value) => value + 1)} />}
    {!yard && !error && <p role="status">Werfcanvas laden…</p>}
    {editingMap && tab === 'Werfcanvas' && <form className={`${panel} ${expanded ? 'hidden' : 'flex'} flex-wrap items-end gap-3`} onSubmit={async (event) => {
      event.preventDefault();
      const body = new FormData(event.currentTarget);
      if (preparedBackground) body.set('image', preparedBackground);
      body.set('version', String(imageVersion ?? 0));
      setBusy(true); setError('');
      try {
        await api(yardEndpoint + '/background', { method: 'POST', body });
        setEditingMap(false); setPreview(''); setPreparedBackground(undefined); setRevision((value) => value + 1);
      } catch (err) { setError(errorMessage(err as ApiError)); }
      finally { setBusy(false); }
    }}>
      <label className="grid gap-1 text-sm">Luchtfoto<input name="image" type="file" accept="image/png,image/jpeg,image/webp" required={!preparedBackground} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) setPreparedBackground(undefined);
        setPreview(file ? URL.createObjectURL(file) : preparedBackground ? URL.createObjectURL(preparedBackground) : '');
      }} />{preparedBackground?.name}</label>
      {(['x', 'y', 'width', 'height'] as const).map((field) => <label key={field} className="grid text-xs">
        {{ x: 'X (m)', y: 'Y (m)', width: 'Breedte (m)', height: 'Hoogte (m)' }[field]}
        <input name={field} className={`${control} w-24`} type="number" step="0.01" value={alignment[field]} required onChange={(event) => setAlignment({ ...alignment, [field]: Number(event.target.value) })} />
      </label>)}
      <label className="text-sm"><input type="checkbox" name="calibrated" value="1" required /> Uitlijning gecontroleerd</label>
      <details className={control}><summary>Werfzones</summary>
        <label className="mt-2 grid gap-1 text-xs">Zones in meters (JSON)
          <textarea className="rounded bg-slate-800 p-2" name="zones" rows={4} value={zoneText} onChange={(event) => setZoneText(event.target.value)} />
        </label>
        <p className="mt-1 max-w-64 text-xs">Per zone zijn name, type (building, restricted of route), x, y, width en height vereist.</p>
      </details>
      <button className={control} disabled={busy}>Publiceren</button>
    </form>}
    {tab === 'Historie' ? <YardHistory locale={locale} revision={revision} /> : (tab === 'Werfcanvas' || tab === 'Botenlijst') && <>
      <div className="relative z-20 flex min-w-0 shrink-0 items-center gap-1.5" role="group" aria-label="Werfcanvas werkbalk">
        <input className={`${control} min-w-0 flex-1 2xl:min-w-36`} maxLength={120} aria-label="Zoek boot, klant, registratie of referentie" placeholder="Zoek boot, eigenaar, registratie…" value={search} onChange={(event) => {
          setSearch(event.target.value); setResultPage(1);
          if (!event.target.value && !draft) { setSelected(undefined); setSelectedIds([]); }
        }} />
        {tab === 'Werfcanvas' && <>
          <div className="hidden items-center gap-1 2xl:flex">{filterControls}</div>
          <details className="relative shrink-0 2xl:hidden"><summary className={control} title="Meer filters en kaartbediening">Meer<span className="hidden sm:inline"> filters</span></summary>
            <div className={`${panel} absolute right-0 top-full z-30 grid w-56 gap-2 shadow-xl`}>
              {filterControls}
              <div className="flex flex-wrap gap-1">{secondaryControls}</div>
            </div>
          </details>
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <button className={control} title="Uitzoomen" aria-label="Uitzoomen" disabled={view.scale <= .5} onClick={() => zoom(.8)}><Minus size={15} /></button>
            <output aria-label="Zoomniveau" className="px-1 text-xs tabular-nums">{Math.round(view.scale * 100)}%</output>
            <button className={control} title="Inzoomen" aria-label="Inzoomen" disabled={view.scale >= 12} onClick={() => zoom(1.25)}><Plus size={15} /></button>
          </div>
          <div className="hidden shrink-0 items-center gap-1 2xl:flex">{secondaryControls}</div>
          <button className={`${control} hidden md:inline-flex`} title="Ongedaan maken" aria-label="Ongedaan maken" disabled={!undo.length || busy} onClick={undoEdit}><Undo2 size={15} /></button>
          <button className={`${control} hidden md:inline-flex`} title="Opnieuw" aria-label="Opnieuw" disabled={!redo.length || busy} onClick={redoEdit}><Redo2 size={15} /></button>
          <button className={`${control} shrink-0 !bg-blue-800`} disabled={!draft || busy || conflict !== undefined} onClick={saveDraft}>Opslaan{draft && ' •'}</button>
          <button ref={fullscreenButton} className={`${control} flex shrink-0 items-center gap-1`} title={expanded ? 'Volledig scherm sluiten' : 'Volledig scherm'}
            aria-label={expanded ? 'Volledig scherm sluiten' : 'Volledig scherm'} aria-pressed={expanded} onClick={() => void toggleFullscreen()}>
            {expanded ? <X size={16} /> : <Expand size={16} />}
          </button>
        </>}
      </div>
      {showResults && <section aria-label="Zoekresultaten" className={`${panel} shrink-0 space-y-2 ${expanded ? 'max-h-[28dvh] overflow-auto' : ''}`}>
        {tab === 'Botenlijst' && <div className="flex flex-wrap items-center gap-2">
          <strong>Botenlijst</strong>
          <input aria-label="Lengte in centimeter" placeholder="Lengte (cm)" type="number" min={1} className={`${control} w-32`} value={length} onChange={(event) => { setLength(event.target.value); setResultPage(1); }} />
          <select aria-label="Stallingsstatus" className={control} value={storage} onChange={(event) => { setStorage(event.target.value); setResultPage(1); }}>
            <option value="">Alle stallingsstatussen</option><option value="active">Actieve stalling</option><option value="inactive">Geen actieve stalling</option>
            <option value="winter">Winterstalling</option><option value="summer">Zomerstalling</option>
          </select>
          <select aria-label="Plaatsingsstatus" className={control} value={site} onChange={(event) => { setSite(event.target.value); setResultPage(1); }}>
            <option value="">Alle boten</option><option value="1">Op werfkaart</option><option value="0">Zonder plaatsing</option>
            <option value="unplaced-arrival">Aangekomen — Nog plaatsen</option>
          </select>
        </div>}
        {searchError && <p role="alert">{searchError} <button className={control} onClick={() => setRetry(retry + 1)}>Opnieuw proberen</button></p>}
        {!results && !searchError && <p role="status">Boten laden…</p>}
        {results && !results.data.some((boat) => tab === 'Botenlijst' || (matches(boat) && onYardDate(boat.move_job?.date, date))) && <p>Geen boten gevonden op deze pagina.</p>}
        <ul className="max-h-56 divide-y divide-slate-700 overflow-y-auto">
          {results?.data.filter((boat) => tab === 'Botenlijst' || (matches(boat) && onYardDate(boat.move_job?.date, date))).map((boat) => <li key={boat.id}>
            <button className="w-full px-2 py-2 text-left hover:bg-slate-800 disabled:opacity-50" disabled={!!draft && draft.id !== boat.id} onClick={() => {
              choose(boat, true); setTab('Werfcanvas'); setSearch('');
              if (!boat.placement.actual) setPicker(true);
            }}><BoatIdentity boat={boat} compact /></button>
          </li>)}
        </ul>
        {results && results.last_page > 1 && <div className="flex items-center gap-2">
          <button className={control} disabled={resultPage <= 1} onClick={() => setResultPage(resultPage - 1)}>Vorige</button>
          <span>{resultPage} / {results.last_page}</span>
          <button className={control} disabled={resultPage >= results.last_page} onClick={() => setResultPage(resultPage + 1)}>Volgende</button>
        </div>}
      </section>}
      {yard && tab === 'Werfcanvas' && <div className={`relative grid min-h-0 gap-2 ${expanded ? 'flex-1' : ''} ${drawer ? 'lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]' : ''}`}>
        <div ref={mapFrame} className="relative min-h-0 overflow-hidden rounded-xl border border-slate-600 bg-[#172f33]"
          onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-yard-boat')) event.preventDefault(); }}
          onDrop={(event) => {
            const boat = unplaced?.data.find((row) => row.id === event.dataTransfer.getData('application/x-yard-boat'));
            const matrix = svg.current?.getScreenCTM();
            if (!boat || !matrix) return;
            event.preventDefault();
            const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
            const x = (point.x - view.x) / view.scale;
            const y = (point.y - view.y) / view.scale;
            if (x >= 0 && y >= 0 && x <= yard.width && y <= yard.height) placeDraft(boat, { x, y });
          }}>
          <button className={`${control} absolute right-2 top-2 z-10`} aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>
            {drawer ? 'Paneel sluiten' : 'Boten en details'}
          </button>
          {selected && <button className={`${control} absolute right-2 top-14 z-10 lg:hidden`} aria-label="Acties voor geselecteerde boot"
            onClick={() => setMenu(menu ? undefined : { boat: selected })}>⋯</button>}
          <svg ref={svg} tabIndex={0} aria-label="Interactieve werfkaart"
            className={`block w-full touch-none select-none ${expanded ? 'h-full' : 'h-[min(74dvh,65vw)] min-h-[340px]'}`}
            viewBox={`0 0 ${yard.width} ${yard.height}`}
            onPointerDownCapture={(event) => {
              if (event.pointerType !== 'touch') return;
              touches.current.set(event.pointerId, pointer(event));
              if (touches.current.size > 1) {
                gesture.current = null;
                svg.current?.setPointerCapture(event.pointerId);
                event.stopPropagation();
              }
            }}
            onPointerDown={(event) => { setMenu(undefined); start(event); }} onPointerMove={move}
            onPointerUp={(event) => {
              touches.current.delete(event.pointerId);
              const drag = gesture.current;
              gesture.current = null;
              if (drag?.moved && !drag.rotation && !drag.draft?.group?.length && drag.boat?.placement.actual) openQuickMove(drag.boat);
            }}
            onPointerCancel={(event) => {
              touches.current.delete(event.pointerId);
              const drag = gesture.current;
              gesture.current = null;
              if (drag?.moved && drag.draft) setDraft(drag.originalDraft);
            }}>
            <defs>
              <pattern id="yard-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 H 0 V 5" fill="none" stroke="#77908c" strokeWidth=".17" /></pattern>
              <marker id="yard-arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M 0 0 L 4 2 L 0 4 Z" fill="#facc15" stroke="none" /></marker>
            </defs>
            <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
              <rect width={yard.width} height={yard.height} fill="url(#yard-grid)" />
              {mapImage && (preview || background) && <image href={preview || background} x={mapImage.x} y={mapImage.y} width={mapImage.width} height={mapImage.height} preserveAspectRatio="none" />}
              {guides && mapImage && <rect width={yard.width} height={yard.height} fill="url(#yard-grid)" pointerEvents="none" />}
              {showZones && <rect width={yard.width} height={yard.height} fill="none" stroke="#f1d28f" strokeWidth=".28" strokeDasharray="1 1" />}
              {showZones && yard.background?.zones?.map((zone, index) => <rect key={index} x={zone.x} y={zone.y} width={zone.width} height={zone.height}
                fill={zone.type === 'route' ? '#facc15' : '#f87171'} fillOpacity=".17"
                stroke={zone.type === 'route' ? '#facc15' : '#f87171'} strokeWidth=".22"><title>{zone.name}</title></rect>)}
              {visible.map((boat) => {
                const draftPosition = draft?.id === boat.id ? draft.position : groupDestinations.find((member) => member.id === boat.id)?.position ?? null;
                const position = boat.placement.actual ?? draftPosition;
                if (!position) return null;
                const length = (boat.length_cm || 700) / 100 * position.scale;
                const width = (boat.width_cm || 250) / 100 * position.scale;
                const planned = draftPosition && boat.placement.actual ? draftPosition : onYardDate(boat.move_job?.date, date) ? boat.placement.planned : null;
                const showActual = positionMode !== 'planned' || !!draftPosition;
                const hull = `M ${-length / 2} ${-width * .36} Q ${length * .2} ${-width * .65} ${length / 2} 0 Q ${length * .2} ${width * .65} ${-length / 2} ${width * .36} Z`;
                const highlighted = selectedIds.includes(boat.id);
                return <g key={boat.id}>
                  {planned && (plans || draftPosition) && (positionMode !== 'current' || draftPosition) && <g pointerEvents="none" stroke="#facc15" strokeWidth=".28" strokeDasharray=".7 .45" fill="none">
                    {arrows && showActual && <line x1={position.x} y1={position.y} x2={planned.x} y2={planned.y} markerEnd="url(#yard-arrow)" />}
                    <path transform={`translate(${planned.x} ${planned.y}) rotate(${planned.rotation}) scale(${planned.scale / position.scale})`} d={hull}
                      fill="#facc15" fillOpacity=".18" pointerEvents="all"
                      onPointerDown={(event) => start(event, boat, planned)}
                      {...(!showActual ? {
                        role: 'button', tabIndex: 0, 'aria-label': `Geplande positie · ${boat.name}`,
                        onClick: () => choose(boat),
                        onKeyDown: (event: React.KeyboardEvent) => { if (event.key === 'Enter') choose(boat); },
                      } : {})} />
                  </g>}
                  {showActual && <g transform={`translate(${position.x} ${position.y})`}>
                    <g role="button" tabIndex={0} aria-label={boat.name} aria-pressed={highlighted} className="cursor-grab"
                      onFocus={() => showHover(boat)} onBlur={hideHover}
                      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); choose(boat, true, event.shiftKey); } }}
                      onDoubleClick={() => choose(boat, true)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        if (draft && draft.id !== boat.id) return;
                        const bounds = mapFrame.current?.getBoundingClientRect();
                        choose(boat); setHover(undefined);
                        setMenu({ boat, x: bounds ? Math.max(8, Math.min(event.clientX - bounds.left, bounds.width - 232)) : 8,
                          y: bounds ? Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - 300)) : 8 });
                      }}
                      onPointerEnter={(event) => { if (event.pointerType === 'mouse') showHover(boat); }}
                      onPointerLeave={hideHover}
                      onPointerDown={(event) => start(event, boat, draftPosition ?? boat.placement.planned ?? position)}
                      transform={`rotate(${position.rotation})`}>
                      <path d={hull} fill={highlighted ? '#1d4ed8' : '#dbeafe'} stroke={highlighted ? '#93c5fd' : '#1e293b'} strokeWidth=".35" />
                    </g>
                    {highlighted && yard.can_edit && !boat.placement.planned && (!boat.placement.actual || yard.can_plan) && <circle cx={(draftPosition?.x ?? position.x) - position.x + Math.cos((draftPosition ?? position).rotation * Math.PI / 180) * (length / 2 + 1.2)}
                      cy={(draftPosition?.y ?? position.y) - position.y + Math.sin((draftPosition ?? position).rotation * Math.PI / 180) * (length / 2 + 1.2)} r=".65" fill="#facc15" className="cursor-crosshair"
                      onPointerDown={(event) => start(event, boat, draftPosition ?? position, true)}><title>Draai {boat.name}</title></circle>}
                    {showStatus && statusKeys(boat).map((key, index) => {
                      const route = statuses[key].route?.(boat.statuses[key]);
                      const dot = <circle cx={index * 1.35} cy={width / 2 + 1} r=".57" fill={statuses[key].color} stroke="#102031" strokeWidth=".15"><title>{statuses[key].label}</title></circle>;
                      return route ? <a key={key} href={`${admin}/${route}`} aria-label={`${boat.name} · ${statuses[key].label}`} onPointerDown={(event) => event.stopPropagation()}>{dot}</a>
                        : <g key={key} pointerEvents="none">{dot}</g>;
                    })}
                    {labels && <text y={width / 2 + 3} fontSize="1.65" textAnchor="middle" fill="white" stroke="#0f172a" strokeWidth=".5" paintOrder="stroke" pointerEvents="none">{boat.name}</text>}
                  </g>}
                </g>;
              })}
            </g>
          </svg>
          <p className="pointer-events-none absolute bottom-2 right-2 rounded bg-slate-950/90 px-2 py-1 text-xs">
            {mapCount} op kaart · Weergave opgehaald {loadedAt?.toLocaleTimeString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }) ?? '—'}
          </p>
          {menu && <div aria-label={`Acties voor ${menu.boat.name}`} className={`${panel} absolute z-20 grid max-h-[95%] w-56 max-w-[95%] gap-1 overflow-auto shadow-xl`}
            style={{ left: menu.x ?? 8, top: menu.y ?? 8 }}>
            <div className="flex items-center justify-between gap-1"><strong>{menu.boat.name}</strong><button className={control} aria-label="Bootacties sluiten" onClick={() => setMenu(undefined)}>×</button></div>
            <Link className={control} href={`${admin}/boten/${menu.boat.id}`}>Bekijk boot</Link>
            {yard.can_edit && yard.can_plan && !locked && !draft && menu.boat.placement.actual && !menu.boat.placement.planned && <>
              <button className={control} onClick={() => { beginMove(menu.boat); setMenu(undefined); svg.current?.focus(); }}>Verplaatsen</button>
              <button className={control} onClick={() => { beginMove(menu.boat); setMenu(undefined); }}>Verplaatsing plannen</button>
            </>}
            {can('planning.manage') && <button className={control} onClick={() => { setQuickTask(menu.boat); setDrawer(true); setMenu(undefined); }}>Taak toevoegen</button>}
            {can('boats.write') && <button className={control} onClick={() => { setPhoto(menu.boat); setMenu(undefined); }}>Foto toevoegen</button>}
            <button className={control} onClick={async () => {
              try {
                await navigator.clipboard.writeText(menu.boat.registration_number || menu.boat.id);
                setNotice('Bootreferentie gekopieerd.');
              } catch { setError('Bootreferentie kon niet worden gekopieerd.'); }
              setMenu(undefined);
            }}>Kopieer bootreferentie</button>
            <button className={control} onClick={() => { setDetail('Historie'); setDrawer(true); setMenu(undefined); }}>Historie bekijken</button>
            {yard.can_edit && !draft && menu.boat.placement.actual && !menu.boat.placement.planned &&
              <button className={`${control} !text-red-300`} onClick={() => { setMenu(undefined); removePlacement(); }}>Verwijder van canvas</button>}
          </div>}
          {help && <div className={`${panel} absolute left-2 top-2 z-20 max-w-xs space-y-2 text-sm`}>
            <button className={control} onClick={() => setHelp(false)}>Sneltoetsen sluiten</button>
            <p>{typeof navigator !== 'undefined' && /Mac|iPad|iPhone/.test(navigator.platform) ? '⌘' : 'Ctrl'} + Z / Shift + Z / S · concept ongedaan maken, opnieuw, opslaan</p>
            <p>Pijlen · 0,1 m · met Shift 1 m. Spatie + slepen · kaart verschuiven. + / − / 0 · zoom en pas in.</p>
            <p>Shift + klik · meerdere boten. Delete · plaatsing verwijderen na bevestiging. Esc · sluiten.</p>
            {Object.values(statuses).map(({ label, color }) => <p key={label}><span style={{ color }}>●</span> {label}</p>)}
          </div>}
          {yard.background?.published_at && <p className="pointer-events-none absolute bottom-2 left-2 rounded bg-slate-950/90 px-2 py-1 text-xs">
            Kaartversie {yard.background.version} · {new Date(yard.background.published_at).toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' })}
          </p>}
          {!mapImage && <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-slate-950/80 px-2 py-1 text-xs">Tijdelijk werfraster · meters</span>}
          {hover && !draft && <div className="absolute bottom-8 left-2 max-w-[95%] rounded-lg border border-slate-500 bg-slate-950 p-2 text-xs shadow-lg" onPointerEnter={() => showHover(hover)} onPointerLeave={hideHover}>
            <BoatIdentity boat={hover} />
            <div className="mt-2 flex gap-3"><Link className="text-blue-300" href={`${admin}/boten/${hover.id}`}>Bekijk boot</Link>
              {can('boats.write') && <button className="text-blue-300" onClick={() => setPhoto(hover)}>Foto toevoegen</button>}
              {hover.statuses.maintenance && <Link className="text-blue-300" href={`${admin}/werkorders/${hover.statuses.maintenance}`}>Werkzaamheden</Link>}</div>
          </div>}
        </div>
        {drawer && <aside aria-label="Boten en details"
          className={`${panel} min-w-0 space-y-3 overflow-auto overscroll-contain ${expanded ? 'absolute bottom-0 right-0 top-12 z-10 w-[min(22rem,85vw)] lg:static lg:w-auto' : 'lg:max-h-[min(74dvh,65vw)] lg:min-h-[340px]'}`}>
          <section className="rounded-lg border border-slate-600 bg-slate-800/60 p-2">
            <button className="w-full py-1 text-left font-semibold" aria-expanded={picker} onClick={() => setPicker(!picker)}>
              Boten zonder locatie ({unplaced?.total ?? '…'}) {picker ? '⌄' : '›'}
            </button>
            {picker && <div className="space-y-2">
              {unplacedError && <p role="alert">{unplacedError} <button className={control} onClick={() => setRetry(retry + 1)}>Opnieuw proberen</button></p>}
              {!unplaced && !unplacedError && <p role="status">Boten laden…</p>}
              <ul className="max-h-56 divide-y divide-slate-700 overflow-auto">
                {unplaced?.data.filter(matches).map((boat) => {
                  const canPlace = yard.can_edit && !draft && !busy && !locked && boat.placement.presence !== 'departed';
                  return <li key={boat.id} draggable={canPlace} onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-yard-boat', boat.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
                    <button className="min-w-0 text-left" title="Bekijk bootdetails" disabled={!!draft && draft.id !== boat.id} onClick={() => choose(boat)}><BoatIdentity boat={boat} compact /></button>
                    {canPlace && <button className={`${control} !bg-blue-800`} onClick={() => placeDraft(boat)}>Plaatsen</button>}
                  </li>;
                })}
              </ul>
              {unplaced && !unplaced.data.some(matches) && <p className="text-xs text-slate-300">Geen passende boten op deze pagina.</p>}
              {unplaced && unplaced.last_page > 1 && <div className="flex items-center gap-2 text-xs">
                <button className={control} disabled={unplacedPage <= 1} onClick={() => setUnplacedPage(unplacedPage - 1)}>Vorige</button>
                <span>{unplacedPage} / {unplaced.last_page}</span>
                <button className={control} disabled={unplacedPage >= unplaced.last_page} onClick={() => setUnplacedPage(unplacedPage + 1)}>Volgende</button>
              </div>}
              {yard.can_edit && <Link href={`${admin}/boten?new=1`} className="text-xs text-blue-300 underline">Nieuwe boot registreren</Link>}
            </div>}
          </section>
          {!selected ? <p className="text-sm text-slate-300">Selecteer een boot op de kaart of zoek een bestaande boot.</p> : <>
            <button aria-expanded={drawer} className="w-full text-left font-semibold lg:hidden" onClick={() => setDrawer(!drawer)}>{selected.name} · {drawer ? 'Details sluiten' : 'Details openen'}</button>
            <div className={`${drawer ? 'block' : 'hidden lg:block'} space-y-4`}>
              <div className="flex items-start justify-between gap-2">
                <BoatIdentity boat={selected} />
                <button aria-label="Bootacties" className={control} onClick={() => {
                  setMenu(menu ? undefined : { boat: selected });
                  mapFrame.current?.scrollIntoView({ block: 'nearest' });
                }}>⋯</button>
              </div>
              {selected.move_job && <p className="rounded bg-slate-800 p-2 text-xs">Geplande verplaatsing · {new Date(selected.move_job.due_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}</p>}
              {quickTask?.id === selected.id && <form className="grid gap-2 rounded border border-slate-600 p-2" onSubmit={async (event) => {
                event.preventDefault();
                const fields = new FormData(event.currentTarget);
                setBusy(true); setError('');
                try {
                  await api(`${yardEndpoint}/boats/${selected.id}/tasks`, { method: 'POST', body: Object.fromEntries(fields) });
                  setQuickTask(undefined); setNotice('Taak toegevoegd.');
                } catch (err) { setError(errorMessage(err as ApiError)); }
                finally { setBusy(false); }
              }}>
                <label className="grid gap-1 text-xs">Taaknaam<input className={control} name="title" required maxLength={255} /></label>
                <label className="grid gap-1 text-xs">Datum<input className={control} name="due_on" type="date" /></label>
                <label className="grid gap-1 text-xs">Instructies<textarea className={control} name="description" maxLength={2000} /></label>
                <div className="flex gap-1"><button className={control} disabled={busy}>Taak opslaan</button>
                  <button type="button" className={control} onClick={() => setQuickTask(undefined)}>Sluiten</button></div>
              </form>}
              {selected.placement.presence && <p className="text-sm text-slate-300">
                {selected.placement.presence === 'departed' ? 'Vertrokken' : selected.placement.actual ? 'Aangekomen' : 'Aangekomen — Nog plaatsen'}
              </p>}
              {yard.can_edit && !draft && !selected.placement.planned && <div className="flex flex-wrap gap-1">
                {selected.placement.presence !== 'arrived' && <button className={control} disabled={busy} onClick={() => {
                  if (window.confirm(`Bevestig dat ${selected.name} fysiek op de werf is aangekomen.`)) void save('arrive');
                }}>Aankomst bevestigen</button>}
                {(selected.placement.presence === 'arrived' || selected.placement.actual) && <button className={control} disabled={busy} onClick={() => {
                  if (window.confirm(`Bevestig dat ${selected.name} de werf fysiek heeft verlaten.`)) void save('depart');
                }}>Vertrek bevestigen</button>}
                {!selected.placement.actual && selected.placement.presence !== 'departed' && <button className={control} disabled={busy || locked} onClick={() => placeDraft(selected)}>Plaats op kaart</button>}
              </div>}
              <div className="flex flex-wrap gap-2 text-xs">
                {statusKeys(selected).map((key) => {
                  const status = statuses[key];
                  const route = status.route?.(selected.statuses[key]);
                  const label = <><span style={{ color: status.color }}>● </span>{status.label}</>;
                  return route ? <Link key={key} href={`${admin}/${route}`}>{label}</Link> : <span key={key}>{label}</span>;
                })}
              </div>
              {yard.can_edit && (draft || selected.placement.actual || selected.placement.previous) && <div aria-label={draft ? 'Plaatsingsconcept' : 'Plaatsingsacties'} className={draft ? 'space-y-2 rounded-lg border border-amber-400/50 bg-slate-950 p-3' : 'space-y-2 border-y border-slate-700 py-3'}>
                {selected.placement.planned?.appointment_id && selected.statuses.planning && <Link className="text-sm text-blue-300 underline"
                  href={`${admin}/afspraken?appointment_id=${selected.placement.planned.appointment_id}`}
                 >Open gekoppelde afspraak</Link>}
                {draft && <>
                  <h3 className="font-semibold">{selected.placement.actual ? `${selected.name} verplaatsen` : 'Plaatsingsconcept'}</h3>
                  {!!draft.group?.length && <p className="text-xs">{draft.group.length + 1} boten · opdrachten achter elkaar inplannen</p>}
                  {selected.placement.actual && <p className="text-xs">Van · {describePosition(selected.placement.actual)}</p>}
                  <p className="text-xs text-amber-200">Naar · {describePosition({ ...draft.position, location_code: location })}</p>
                  {conflict !== undefined && <p role="status" className="text-xs text-red-300">Actuele serverpositie · {describePosition(conflict)}</p>}
                  {warnings && <div role="status" className={`text-xs ${warnings.length ? 'text-amber-200' : 'text-green-300'}`}>
                    {warnings.length ? warnings.join(' ') : 'Geen conflict gevonden.'}
                    <p className="text-slate-300">Kaartcontrole op basis van geregistreerde afmetingen en zones.</p>
                  </div>}
                  <div className="flex flex-wrap gap-2">
                    <label className="grid text-xs">Rotatie °<input className={`${control} w-24`} type="number" min={0} max={360} step={1} value={Math.round(draft.position.rotation)} onChange={(event) => edit({ ...draft, position: { ...draft.position, rotation: Number(event.target.value) } })} /></label>
                    <label className="grid text-xs">Locatiecode<input className={`${control} w-28`} value={location} onChange={(event) => edit({ ...draft, position: { ...draft.position, location_code: event.target.value || null } })} /></label>
                  </div>
                  {selected.placement.actual && selected.statuses.planning && <label className="block text-xs">
                    <input type="checkbox" checked={linkAppointment} onChange={(event) => setLinkAppointment(event.target.checked)} /> Verplaatsing koppelen aan actieve afspraak
                  </label>}
                  <div className="flex flex-wrap gap-1">
                    <button className={control} disabled={busy} onClick={resetDraft}>Annuleren</button>
                  </div>
                </>}
                <label className="grid text-xs">Reden / toelichting bij waarschuwing<input className={control} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} /></label>
                {yard.can_plan && selected.placement.actual && draft && !selected.placement.planned && <div className="grid gap-2">
                  <label className="grid text-xs">Datum en tijd (Nederland)<input type="datetime-local" className={control} value={dueAt} onChange={(event) => { setDueAt(event.target.value); setOffsetStart(undefined); }} /></label>
                  <label className="grid text-xs">Materieel<input className={control} maxLength={150} value={equipment} onChange={(event) => setEquipment(event.target.value)} /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid text-xs">Duur (min.)<input className={control} type="number" min={1} max={720} value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
                    <label className="grid text-xs">Prioriteit<select className={control} value={priority} onChange={(event) => setPriority(event.target.value)}>
                      <option value="low">Laag</option><option value="normal">Normaal</option><option value="high">Hoog</option><option value="urgent">Dringend</option>
                    </select></label>
                  </div>
                  <label className="grid text-xs">Instructies<textarea className={control} maxLength={2000} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
                </div>}
                {yard.can_plan && ((draft && selected.placement.actual && !selected.placement.planned) || (!draft && selected.placement.planned?.task_id)) &&
                  <label className="grid text-xs">Medewerker<select aria-label="Medewerker" className={control} value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                    <option value="">Kies een medewerker</option>
                    {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </select></label>}
                <div className="flex flex-wrap gap-1">
                  {draft && !selected.placement.actual && <button className={control} disabled={busy || conflict !== undefined} onClick={() => void save('place') }>Plaatsing opslaan</button>}
                  {yard.can_plan && draft && selected.placement.actual && !selected.placement.planned && <button className={control} disabled={busy || conflict !== undefined || !dueAt || Number(duration) < 1 || Number(duration) > 720} onClick={() => void save('plan')}>Verplaatsing plannen</button>}
                  {yard.can_plan && draft && selected.placement.planned && <button className={control} disabled={busy} onClick={() => openQuickMove(selected)}>Verplaatsing aanpassen</button>}
                  {yard.can_plan && draft && !draft.group?.length && selected.placement.actual && !selected.placement.planned && <button className={control} disabled={busy || conflict !== undefined} onClick={() => {
                    if (window.confirm(`Bevestig dat ${selected.name} fysiek staat op ${describePosition({ ...draft.position, location_code: location })}.`)) void save('move_now');
                  }}>Nu verplaatst</button>}
                  {yard.can_plan && !draft && selected.placement.planned?.task_id && <button className={control} disabled={busy || !assignee} onClick={() => void save('assign')}>Toewijzen</button>}
                  {yard.can_plan && !draft && selected.placement.planned && !selected.placement.planned.task_id && <button className={control} disabled={busy} onClick={() => {
                    if (window.confirm('Bevestig dat de boot fysiek op de geplande locatie staat.')) void save('complete');
                  }}>Verplaatsing uitgevoerd</button>}
                  {yard.can_plan && !draft && selected.placement.planned && <button className={control} disabled={busy} onClick={() => void save('cancel_plan')}>Planning annuleren</button>}
                  {!draft && !selected.placement.actual && !selected.placement.planned && selected.placement.previous && selected.placement.presence !== 'departed' && <button className={control} disabled={busy} onClick={() => void save('restore')}>Vorige plaatsing herstellen</button>}
                  {!draft && !selected.placement.planned && selected.placement.actual && <button className={control} disabled={busy} onClick={() => {
                    if (window.confirm('Boot van de werfkaart verwijderen?')) void save('remove');
                  }}>Van kaart verwijderen</button>}
                </div>
              </div>}
              <nav aria-label="Bootdetails" className="flex flex-wrap gap-1">
                {['Overzicht', 'Diensten', 'Financieel', 'Historie'].map((name) => <button key={name} className={`${control} !px-2 ${detail === name ? '!bg-blue-800' : ''}`} onClick={() => setDetail(name)} aria-pressed={detail === name}>{name}</button>)}
              </nav>
              {detail === 'Historie' ? <YardHistory key={selected.id} locale={locale} boatId={selected.id} revision={revision} /> :
                <div className="grid gap-2 text-sm text-blue-300">
                  <Link href={`${admin}/boten/${selected.id}`}>Open bootdossier</Link>
                  {detail === 'Overzicht' && selected.customer && <Link href={`${admin}/klanten/${selected.customer.id}`}>Open klant</Link>}
                  {detail === 'Diensten' && selected.storage && <Link href={`${admin}/stalling/${selected.storage.id}`}>Open stallingscontract</Link>}
                  {detail === 'Diensten' && selected.statuses.maintenance && <Link href={`${admin}/werkorders/${selected.statuses.maintenance}`}>Open werkorder</Link>}
                  {detail === 'Financieel' && <YardHistory locale={locale} boatId={selected.id} revision={revision} initialSource="invoice" />}
                </div>}
            </div>
          </>}
        </aside>}
      </div>}
    </>}
    {quickMove && selected && draft && <dialog ref={moveDialog} aria-labelledby="yard-quick-move-title"
      className="m-auto max-h-[90dvh] w-[min(92vw,30rem)] overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 p-4 text-white shadow-xl backdrop:bg-slate-950/40"
      onCancel={(event) => { event.preventDefault(); if (!busy) { resetDraft(); setError(''); } }}>
      <form className="grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        void save(selected.placement.planned ? 'replan' : 'plan');
      }}>
        <h2 id="yard-quick-move-title" className="text-lg font-bold">Verplaatsing plannen</h2>
        <BoatIdentity boat={selected} compact />
        <p className="text-sm">{describePosition(selected.placement.actual)} → {describePosition(draft.position)}</p>
        {warnings?.length ? <p role="status" className="text-sm text-amber-200">{warnings.join(' ')}</p> : null}
        {scheduleWarnings.length ? <p role="status" className="text-sm text-amber-200">{scheduleWarnings.join(' ')}</p> : null}
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        {conflict !== undefined && <p className="text-sm text-red-200">Actuele serverpositie · {describePosition(conflict)}</p>}
        <fieldset disabled={busy || loadingOptions} className="grid gap-3">
          <label className="grid text-xs">Uitvoerder
            <select className={control} value={assignee} onChange={(event) => setAssignee(event.target.value)}>
              <option value="">Nog niet toegewezen</option>
              {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
          <label className="text-sm"><input type="checkbox" disabled={!assignee} checked={rememberAssignee && !!assignee} onChange={(event) => setRememberAssignee(event.target.checked)} /> Als standaard voor verplaatsen</label>
          <div className="flex flex-wrap gap-1">
            {([['now', 'Nu'], ['today', 'Vandaag'], ['tomorrow', 'Morgen 09:00'], ['next', 'Eerstvolgende vrije plek']] as const).map(([choice, label]) =>
              <button key={choice} type="button" className={control} onClick={() => void loadMoveOptions(selected, choice)}>{label}</button>)}
          </div>
          <label className="grid text-xs">Datum en tijd kiezen (Nederland)
            <input required type="datetime-local" className={control} value={dueAt} onChange={(event) => { setDueAt(event.target.value); setOffsetStart(undefined); }} />
          </label>
          <label className="grid text-xs">Opmerking<textarea className={control} maxLength={2000} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
          <details>
            <summary className="cursor-pointer text-sm">Meer details</summary>
            <div className="mt-2 grid gap-2">
              <label className="grid text-xs">Materieel<input className={control} maxLength={150} value={equipment} onChange={(event) => setEquipment(event.target.value)} /></label>
              <label className="grid text-xs">Duur (min.)<input required className={control} type="number" min={1} max={720} value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
              <label className="grid text-xs">Prioriteit<select className={control} value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="low">Laag</option><option value="normal">Normaal</option><option value="high">Hoog</option><option value="urgent">Dringend</option>
              </select></label>
              <label className="grid text-xs">Locatiecode<input className={control} maxLength={80} value={location} onChange={(event) => setDraft({ ...draft, position: { ...draft.position, location_code: event.target.value || null } })} /></label>
              <label className="grid text-xs">Toelichting bij kaartwaarschuwing<input className={control} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            </div>
          </details>
        </fieldset>
        {loadingOptions && <p role="status" className="text-sm">Beschikbaarheid controleren…</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={control} disabled={busy} onClick={() => { resetDraft(); setError(''); }}>Annuleren</button>
          <button type="button" className={control} disabled={busy} onClick={() => { moveOptionsRequest.current++; setLoadingOptions(false); setQuickMove(false); }}>Positie aanpassen</button>
          <button className={`${control} !bg-amber-200 !text-slate-950`} disabled={busy || loadingOptions || conflict !== undefined || !dueAt || !!scheduleWarnings.length}>Opslaan &amp; toewijzen</button>
        </div>
      </form>
    </dialog>}
    {photo && <YardQuickPhoto boat={photo} onClose={() => setPhoto(undefined)} />}
    {dailyPlan && <YardDailyPlan date={date && date !== 'week' ? date : yardDay(0)} onClose={() => setDailyPlan(false)} />}
  </section>;
}

function BoatIdentity({ boat, compact = false }: { boat: Boat; compact?: boolean }) {
  return <div className="flex items-start gap-3">
    {boat.photo_url && <img src={boat.photo_url} alt="" loading="lazy" className={compact ? 'h-9 w-12 shrink-0 rounded object-cover' : 'h-16 w-20 rounded-lg object-cover sm:h-20 sm:w-24'} />}
    <div className="min-w-0">
      <strong className="break-words text-base">{boat.name}</strong>
      <p className="text-sm text-slate-300">{[boat.registration_number, boat.customer?.name].filter(Boolean).join(' · ')}</p>
      <p className="text-sm text-slate-300">{dimensions(boat)} · {boat.placement.actual?.location_code ?? boat.location_code ?? 'Locatie zonder code'}</p>
      {compact && <p className="text-xs text-slate-300">
        {boat.placement.actual ? 'Op de kaart' : boat.placement.presence === 'departed' ? 'Vertrokken' : boat.placement.previous ? 'Van de kaart gehaald' : boat.placement.presence === 'arrived' ? 'Aangekomen · nog plaatsen' : 'Geregistreerd · aankomst onbevestigd'}
        {' · '}{statusKeys(boat).map((key) => <span key={key} title={statuses[key].label} style={{ color: statuses[key].color }}>● </span>)}
      </p>}
      {!compact && boat.storage && <p className="text-xs text-green-300">Actieve stalling · {boat.storage.start_date?.slice(0, 10)} – {boat.storage.end_date?.slice(0, 10)}</p>}
    </div>
  </div>;
}
