'use client';
import { TranslatedText } from '@/components/cms/TranslatedText';

import Link from 'next/link';
import { usePermission } from '@/lib/permissions';
import { YardQuickPhoto } from './YardQuickPhoto';
import { YardDailyPlan } from './YardDailyPlan';
import { Expand, Minus, Plus, Redo2, Undo2, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { api, type ApiError } from '@/lib/api';
import { control, YardHistory, yardEndpoint, type Page } from './YardHistory';
import { YardMoves } from './YardMoves';
import { YardServiceBoard } from './YardServiceBoard';
import type { ScheduleResources } from './YardSchedulingSettings';
import { YardMapManagement, YardSafetyProposal, YardRestoreReview, type YardGeometry } from './YardMapManagement';
import { useYardDraftRecovery } from './useYardDraftRecovery';
import { useYardRefresh } from './useYardRefresh';
import { YardArrival, type Arrival } from './YardArrival';
import { YardPhotoSessions, useYardPhotoCopy } from './YardPhotoSessions';
import type { PhotoPlacement } from './YardPhotoMatch';

type Point = { x: number; y: number };
type Position = Point & { rotation: number; scale: number; location_code?: string | null };
type Placement = { actual: Position | null; planned: (Position & { appointment_id?: string; task_id?: string }) | null; previous: Position | null; presence: 'arrived' | 'departed' | null; version: number; interaction_locked?: boolean; arrival?: Arrival | null; arrived_at?: string | null };
type Zone = Point & { name: string; type: 'building' | 'restricted' | 'route'; width: number; height: number };
type Conflict = Placement & { assignment?: { assignee_id?: string; due_at?: string; state?: string; instructions?: string; equipment?: string; priority?: string } | null };

function ConflictDetails({ placement }: { placement: Conflict }) {
  return <div role="status" className="space-y-1 text-xs text-red-200">
    <p><TranslatedText textKey="siteCopy.1701ec7efd5347f4" fallbackText={"Serverversie "} />{placement.version} <TranslatedText textKey="siteCopy.c02aea2b3fc96563" fallbackText={" · Actueel: "} />{describePosition(placement.actual)}</p>
    <p><TranslatedText textKey="siteCopy.0a2ff586ab739698" fallbackText={"Gepland: "} />{describePosition(placement.planned)}</p>
    {placement.assignment && <p><TranslatedText textKey="siteCopy.27c1d56b137c3f82" fallbackText={"Opdracht: "} />{placement.assignment.state} · {placement.assignment.due_at
      ? new Date(placement.assignment.due_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' }) : 'Geen tijd'} <TranslatedText textKey="siteCopy.06e40c58ac4673b6" fallbackText={" · Medewerker: "} />{placement.assignment.assignee_id ?? 'Niet toegewezen'}</p>}
    {placement.assignment?.equipment && <p>Materieel · {placement.assignment.equipment}</p>}
    {placement.assignment?.priority && <p>Prioriteit · {placement.assignment.priority}</p>}
    {placement.assignment?.instructions && <p className="whitespace-pre-wrap">{placement.assignment.instructions}</p>}
    <p><TranslatedText textKey="siteCopy.a269ce62c9cb05d5" fallbackText={"Je concept blijft zichtbaar. Annuleer het concept en laad de huidige plaatsing voordat je opnieuw plant."} /></p>
  </div>;
}
type Boat = {
  id: string; name: string; registration_number: string | null; customer: { id: string; name: string } | null;
  length_cm: number | null; width_cm: number | null; location_code: string | null; photo_url: string | null;
  storage: { id: string; type: string; start_date: string; end_date: string } | null;
  statuses: Record<string, string>; placement: Placement;
  top_view?: { id: string; url: string } | null;
  action_route?: string | null;
  services?: string[];
  move_job?: NonNullable<Conflict['assignment']> & { date: string; due_at: string };
};
type Yard = {
  width: number; height: number; can_edit: boolean; can_publish: boolean;
  can_plan: boolean; can_execute: boolean;
  can_manage_photos: boolean;
  can_view_daily_plan?: boolean;
  geometry?: YardGeometry;
  background: (Point & { width: number; height: number; version: number; published_at?: string; zones?: Zone[]; transform?: number[]; calibration_current?: boolean }) | null;
  boats: Page<Boat>;
};
type Draft = { id: string; position: Position; group?: { id: string; position: Position; version: number }[] };
type SavedDraft = { draft: Draft; placement: Placement; reason: string; dueAt: string; assignee: string; teamId?: string; equipment: string; duration: string; priority: string; instructions: string };
function validSavedDraft(value: unknown): value is SavedDraft {
  if (!value || typeof value !== 'object') return false;
  const saved = value as SavedDraft;
  const position = (point: Position | null) => !point || ['x', 'y', 'rotation', 'scale'].every((key) => Number.isFinite(point[key as keyof Position]));
  return typeof saved.draft?.id === 'string' && !!saved.draft.position && position(saved.draft.position)
    && Number.isInteger(saved.placement?.version) && position(saved.placement.actual) && position(saved.placement.planned)
    && ['reason', 'dueAt', 'assignee', 'equipment', 'duration', 'priority', 'instructions'].every((key) => typeof saved[key as keyof SavedDraft] === 'string')
    && (saved.teamId === undefined || typeof saved.teamId === 'string')
    && (!saved.draft.group || Array.isArray(saved.draft.group) && saved.draft.group.every((member) => typeof member.id === 'string' && Number.isInteger(member.version) && !!member.position && position(member.position)));
}
type Operation = 'move_now' | 'arrive' | 'depart' | 'place' | 'plan' | 'replan' | 'assign' | 'complete' | 'remove' | 'restore' | 'cancel_plan';
type MoveChoice = 'now' | 'today' | 'tomorrow' | 'next';
type MoveOptions = {
  assigned_to_user_id: string | null;
  team_id?: string | null;
  choices: Record<MoveChoice, string | null>;
  current: { due_at: string | null; duration: number; equipment: string; team_id?: string | null; reason: string; priority: string; instructions: string } | null;
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

function yardPeriod(filter: string) {
  if (!filter) return {};
  if (filter !== 'week') return { from: filter, to: filter };
  const weekday = new Date(yardDay(0) + 'T12:00:00Z').getUTCDay();
  const monday = 7 - (weekday + 6) % 7;
  return { from: yardDay(monday), to: yardDay(monday + 6) };
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
  const [linkedMoveId, setLinkedMoveId] = useState<string>();
  const [conflict, setConflict] = useState<Conflict>();
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
  const [combinedStatuses, setCombinedStatuses] = useState<string[]>([]);
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
  const [preparedBackground, setPreparedBackground] = useState<{ file: File; outputId: string }>();
  const [draft, setDraft] = useState<Draft>();
  const draftRef = useRef<Draft>();
  draftRef.current = draft;
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
  const [scheduleResources, setScheduleResources] = useState<ScheduleResources>();
  const [teamId, setTeamId] = useState<string>();
  const [linkAppointment, setLinkAppointment] = useState(false);
  const [warnings, setWarnings] = useState<string[]>();
  const [assessment, setAssessment] = useState<{ severity: string; requires_approval: boolean; details: { message: string; clearance_m: number | null; required_clearance_m: number; overridable: boolean }[] }>();
  const [safetyApproval, setSafetyApproval] = useState<string>();
  const [scheduleWarnings, setScheduleWarnings] = useState<string[]>([]);
  const location = draft?.position.location_code ?? '';
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [arrival, setArrival] = useState<{ id: string; version: number }>();
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useYardRefresh(() => setRefreshRevision(value => value + 1));
  const admin = `/${locale}/admin`;
  const recovery = useYardDraftRecovery<SavedDraft>(draft && selected ? {
    draft, placement: selected.placement, reason, dueAt, assignee, teamId, equipment, duration, priority, instructions,
  } : undefined, validSavedDraft);

  useEffect(() => {
    if (quickMove && !moveDialog.current?.open) moveDialog.current?.showModal();
  }, [quickMove]);

  useEffect(() => {
    if (window.location.hash === '#verplaatsingen') {
      setLinkedMoveId(new URLSearchParams(window.location.search).get('task_id') || undefined);
      setTab('Verplaatsingen');
    }
    if (window.location.hash === '#dienstenbord') {
      setLinkedMoveId(new URLSearchParams(window.location.search).get('task_id') || undefined);
      setTab('Dienstenbord');
    }
  }, []);

  useEffect(() => {
    if (!yard?.can_plan) return;
    let active = true;
    api<typeof assignees>(`${yardEndpoint}/move-assignees`)
      .then((rows) => { if (active) setAssignees(rows); })
      .catch((err) => { if (active) setError(errorMessage(err)); });
    api<ScheduleResources>(`${yardEndpoint}/schedule-resources`)
      .then(rows => { if (active) setScheduleResources(rows); }).catch(() => undefined);
    return () => { active = false; };
  }, [yard?.can_plan, revision]);

  useEffect(() => {
    let active = true;
    async function load() {
      const first = await api<Yard>(yardEndpoint, { query: { placed: 1 } });
      const rows = [...first.boats.data];
      for (let page = 2; page <= first.boats.last_page && active; page++) {
        const next = await api<Yard>(yardEndpoint, { query: { placed: 1, page } });
        rows.push(...next.boats.data);
      }
      const opened = selectedRef.current;
      let latest = rows.find(boat => boat.id === opened?.id);
      if (active && opened && !latest) {
        const current = await api<Yard>(yardEndpoint, { query: { search: opened.id } });
        latest = current.boats.data.find(boat => boat.id === opened.id);
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
        if (opened && selectedRef.current?.id === opened.id) {
          const current = selectedRef.current;
          const currentDraft = draftRef.current;
          if (currentDraft?.id === opened.id) {
            const changedMember = currentDraft.group?.map(member => rows.find(boat => boat.id === member.id && boat.placement.version !== member.version)).find(Boolean);
            const changed = latest && latest.placement.version !== current.placement.version ? latest : changedMember;
            if (changed) {
              setConflict({ ...changed.placement, assignment: changed.move_job });
              if (changed.id !== opened.id) setError(`De plaatsing van ${changed.name} in deze groep is gewijzigd.`);
            }
          } else if (latest) setSelected(latest);
        }
      }
    }
    load().catch((err) => { if (active) setError(errorMessage(err)); });
    return () => { active = false; };
  }, [revision, refreshRevision]);

  useEffect(() => {
    if (tab !== 'Werfcanvas') return;
    let active = true;
    setUnplacedError('');
    api<Yard>(yardEndpoint, { query: { placed: 0, page: unplacedPage } })
      .then((result) => { if (active) setUnplaced(result.boats); })
      .catch((err) => { if (active) setUnplacedError(errorMessage(err)); });
    return () => { active = false; };
  }, [revision, refreshRevision, unplacedPage, retry, tab]);

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
        placed: tab === 'Botenlijst' && ['', '0', '1', 'unplaced-arrival'].includes(site) ? (site === 'unplaced-arrival' ? 0 : site) : undefined,
        presence: tab === 'Botenlijst' && site === 'unplaced-arrival' ? 'arrived' : undefined,
        category: tab === 'Botenlijst' && !['', '0', '1', 'unplaced-arrival'].includes(site) ? site : undefined,
        'statuses[]': combinedStatuses,
        service, zone, employee_id: employee || undefined, ...yardPeriod(date),
      } })
        .then((result) => { if (active) setResults(result.boats); })
        .catch((err) => { if (active) setSearchError(errorMessage(err)); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, length, storage, site, resultPage, tab, revision, refreshRevision, retry, combinedStatuses, service, zone, employee, date]);

  useEffect(() => {
    setWarnings(undefined);
    setAssessment(undefined);
    setScheduleWarnings([]);
    if (!draft) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api<{ warnings: string[]; schedule_warnings?: string[]; severity: string; requires_approval: boolean; details: { message: string; clearance_m: number | null; required_clearance_m: number; overridable: boolean }[] }>(`${yardEndpoint}/placements/${draft.id}/check`, {
        method: 'POST', body: {
          position: { ...draft.position, location_code: location || null },
          ...(selected?.placement.actual && dueAt ? { due_at: offsetStart ?? dueAt, assigned_to_user_id: assignee || null, duration_minutes: Number(duration), equipment } : {}),
        },
      }).then((result) => {
        if (active) {
          setWarnings(result.warnings);
          setAssessment(result);
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
    setTeamId(undefined);
    recovery.discard();
    setNotice('');
    if (conflict) setRevision((value) => value + 1);
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
        setTeamId(options.team_id ?? options.current?.team_id ?? undefined);
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
      if (locked || boat.placement.interaction_locked || !yard?.can_edit || event.shiftKey || !position || (boat.placement.actual && !yard.can_plan)
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
    if (operation === 'place' && selected.placement.presence !== 'arrived' &&
      !window.confirm(`Bevestig dat ${selected.name} fysiek op de werf is aangekomen. De plaatsing bevestigt ook de aankomst.`)) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    setConflict(undefined);
    try {
      const endpoint = `${yardEndpoint}/placements/${selected.id}`;
      if (operation === 'plan' && draft?.group?.length && selected.placement.actual) {
        await api(yardEndpoint + '/group-moves', { method: 'POST', body: {
          due_at: dueAt, assigned_to_user_id: assignee || null, team_id: teamId || null, equipment, duration_minutes: Number(duration),
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
      const body = { operation, version: selected.placement.version, reason, approval_id: safetyApproval,
          confirmed: ['arrive', 'depart', 'complete', 'move_now', 'place'].includes(operation) ? true : undefined,
          due_at: planning ? offsetStart ?? dueAt : undefined,
          assigned_to_user_id: planning || operation === 'assign' ? assignee || null : undefined,
          team_id: (planning || operation === 'assign') && teamId !== undefined ? teamId || null : undefined,
          equipment: planning ? equipment : undefined,
          duration_minutes: planning ? Number(duration) : undefined,
          priority: planning ? priority : undefined,
          instructions: planning ? instructions : undefined,
          remember_assignee: planning && quickMove ? rememberAssignee : undefined,
          appointment_id: operation === 'plan' && linkAppointment ? selected.statuses.planning : undefined,
          position: (planning || ['place', 'move_now'].includes(operation)) && draft?.id === selected.id ? { ...draft.position, location_code: location || null } : undefined };
      const payload = JSON.stringify(body);
      const needsConfirmation = planning || operation === 'move_now';
      if (needsConfirmation && confirmation.current?.payload !== payload && globalThis.crypto?.randomUUID) {
        confirmation.current = { payload, key: globalThis.crypto.randomUUID() };
      }
      const placement = await api<Placement>(operation === 'move_now' ? endpoint + '/move-now' : endpoint, {
        method: operation === 'move_now' ? 'POST' : 'PATCH',
        body: { ...body, idempotency_key: needsConfirmation ? confirmation.current?.key : undefined },
      });
      const updated = { ...selected, placement };
      setSelected(updated);
      setPlaced((boats) => [...boats.filter((boat) => boat.id !== updated.id), ...(placement.actual ? [updated] : [])]);
      resetDraft();
      setNotice(planning ? 'Verplaatsing ingepland.' : 'Wijziging opgeslagen.');
      setRevision((value) => value + 1);
    } catch (err) {
      const failure = err as ApiError;
      if (failure.status === 409) setConflict((failure.data as { placement?: Conflict })?.placement);
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
    if (draft || !boat.placement.actual || boat.placement.planned || boat.placement.interaction_locked || locked || busy) return;
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
    if (!yard?.can_edit || draft || busy || locked || boat.placement.interaction_locked || boat.placement.actual || boat.placement.presence === 'departed') return;
    if (boat.placement.presence !== 'arrived' && !boat.placement.previous &&
      !window.confirm(`De aankomst van ${boat.name} is onbevestigd. Wil je een kaartplaatsing voorbereiden?`)) return;
    choose(boat);
    edit({ id: boat.id, position: { ...(point ?? { x: yard.width / 2, y: yard.height / 2 }), rotation: 0, scale: 1, location_code: boat.location_code } });
    if (!point) setView(initialView);
  }

  async function openPhotoPlacement(boatId: string, proposal: PhotoPlacement) {
    if (!yard?.can_edit || locked || draftRef.current) throw new Error('Sluit eerst het bestaande kaartconcept.');
    const current = await api<Yard>(yardEndpoint, { query: { search: boatId } });
    const boat = current.boats.data.find(item => item.id === boatId);
    if (!boat || boat.placement.version !== proposal.placement_version || current.geometry?.version !== proposal.assessment.geometry_version) {
      throw new Error('De werfgeometrie of plaatsing is gewijzigd. Controleer het voorstel opnieuw.');
    }
    if (boat.placement.planned || boat.placement.interaction_locked || boat.placement.presence === 'departed'
      || (boat.placement.actual && !current.can_plan)) {
      throw new Error('Deze boot kan op dit moment geen kaartconcept krijgen.');
    }
    choose(boat);
    edit({ id: boat.id, position: { ...proposal.position, location_code: boat.placement.actual?.location_code ?? boat.location_code } });
    setView(initialView);
    setTab('Werfcanvas');
  }

  function resetView() {
    setView(initialView);
    setHover(undefined);
    if (!draft) { setSelected(undefined); setSelectedIds([]); }
  }

  const mapImage = yard?.background?.calibration_current ? yard.background : null;
  const matches = (boat: Boat) => {
    const keys = statusKeys(boat);
    const job = boat.move_job;
    const point = boat.placement.actual;
    return combinedStatuses.every((key) => keys.includes(key)) &&
      (!status || (status === 'present' ? !!point || boat.placement.presence === 'arrived' : status === 'unplaced' ? !point : keys.includes(status))) &&
      (!service || (boat.services ?? keys).includes(service)) &&
      (!zone || (point?.location_code ?? boat.location_code) === zone ||
        (point && (yard?.geometry?.zones ?? yard?.background?.zones)?.some((area) => area.name === zone && point.x >= area.x &&
          point.x <= area.x + area.width && point.y >= area.y && point.y <= area.y + area.height))) &&
      (!employee || (job?.assignee_id === employee && onYardDate(job.date, date)));
  };
  const visible = placed.filter((boat) => matches(boat) && (positionMode !== 'planned' ||
    (boat.placement.planned && onYardDate(boat.move_job?.date, date)) || boat.id === draft?.id));
  const mapCount = visible.length;
  const groupDestinations = draft && selected?.placement.actual ? groupPositions(draft, selected.placement.actual) : [];
  const zones = [...new Set([...((yard?.geometry?.zones ?? yard?.background?.zones)?.map((area) => area.name) ?? []),
    ...placed.map((boat) => boat.placement.actual?.location_code ?? boat.location_code).filter((code): code is string => !!code)])].sort();
  if (draft && selected && !visible.some((boat) => boat.id === draft.id)) visible.push(selected);
  const front = visible.findIndex((boat) => boat.id === selected?.id);
  if (front !== -1) visible.push(...visible.splice(front, 1));
  const showResults = tab === 'Botenlijst' || !!search.trim();
  const canNavigate = () => !draft && !editingMap || window.confirm('Niet-opgeslagen wijzigingen verlaten?');
  const filterClass = `${control} min-w-0 2xl:max-w-28`;
  const filterControls = <>
    <details className="relative">
      <summary className={`${filterClass} cursor-pointer whitespace-nowrap`}><TranslatedText textKey="siteCopy.4a186d6368a10271" fallbackText={"Status combineren"} />{combinedStatuses.length ? ` (${combinedStatuses.length})` : ''}</summary>
      <fieldset className="absolute left-0 top-full z-30 grid min-w-48 gap-2 rounded border border-slate-600 bg-slate-900 p-3">
        <legend className="sr-only"><TranslatedText textKey="siteCopy.d6dbae09be085e98" fallbackText={"Alle gekozen statussen moeten overeenkomen"} /></legend>
        {Object.entries(statuses).filter(([key]) => key !== 'idle').map(([key, entry]) => <label key={key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={combinedStatuses.includes(key)} onChange={(event) => {
            setCombinedStatuses((current) => event.target.checked ? [...current, key] : current.filter((value) => value !== key)); setResultPage(1);
          }} />{entry.label}
        </label>)}
      </fieldset>
    </details>
    <select aria-label="Status" className={filterClass} value={status} onChange={(event) => { setStatus(event.target.value); if (event.target.value === 'unplaced') { setPicker(true); setDrawer(true); } }}>
      <option value=""><TranslatedText textKey="siteCopy.1d49e6efaad311c2" fallbackText={"Status"} inline={false} /></option><option value="present"><TranslatedText textKey="siteCopy.59cca9dc7fe5e84b" fallbackText={"Aanwezig"} inline={false} /></option><option value="unplaced"><TranslatedText textKey="siteCopy.079b2beaae30ce21" fallbackText={"Zonder locatie"} inline={false} /></option>
      {Object.entries(statuses).map(([key, entry]) => <option key={key} value={key}>{entry.label}</option>)}
    </select>
    <select aria-label="Dienst" className={filterClass} value={service} onChange={(event) => setService(event.target.value)}>
      <option value=""><TranslatedText textKey="siteCopy.91a00622ca50d449" fallbackText={"Dienst"} inline={false} /></option><option value="storage"><TranslatedText textKey="siteCopy.544693826c575665" fallbackText={"Stalling"} inline={false} /></option><option value="planning"><TranslatedText textKey="siteCopy.1d770bfec6de665a" fallbackText={"Kraan"} inline={false} /></option><option value="washing"><TranslatedText textKey="siteCopy.1b2da18622f0fd6f" fallbackText={"Afspuiten"} inline={false} /></option>
      <option value="maintenance"><TranslatedText textKey="siteCopy.7a4dff0dab80c669" fallbackText={"Onderhoud"} inline={false} /></option><option value="sale"><TranslatedText textKey="siteCopy.cf0a315c87c47c28" fallbackText={"Makelaardij"} inline={false} /></option>
    </select>
    <select aria-label="Zone" className={filterClass} value={zone} onChange={(event) => setZone(event.target.value)}>
      <option value=""><TranslatedText textKey="siteCopy.58f5bb7037370572" fallbackText={"Zone"} inline={false} /></option>{zones.map((name) => <option key={name}>{name}</option>)}
    </select>
    {!!assignees.length && <select aria-label="Medewerker filter" className={filterClass} value={employee} onChange={(event) => setEmployee(event.target.value)}>
      <option value=""><TranslatedText textKey="siteCopy.03398e24efecaa86" fallbackText={"Medewerker"} inline={false} /></option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select>}
    <details className="relative"><summary className={control} title="Datum">{date ? (date === 'week' ? 'Volgende week' : date) : 'Datum'}</summary>
      <div className={`${panel} absolute right-0 z-30 grid gap-1`}>
        {[['', 'Alle datums'], [yardDay(0), 'Vandaag'], [yardDay(1), 'Morgen'], ['week', 'Volgende week']].map(([value, name]) =>
          <button key={name} className={control} onClick={() => setDate(value)}>{name}</button>)}
        <input className={control} aria-label="Eigen datum" type="date" value={date === 'week' ? '' : date} onChange={(event) => setDate(event.target.value)} />
        <select className={control} aria-label="Positieweergave" value={positionMode} onChange={(event) => setPositionMode(event.target.value)}>
          <option value="both"><TranslatedText textKey="siteCopy.d2e0a4f9769eb713" fallbackText={"Beide"} inline={false} /></option><option value="current"><TranslatedText textKey="siteCopy.dc5c0d7ea4a97d34" fallbackText={"Huidig"} inline={false} /></option><option value="planned"><TranslatedText textKey="siteCopy.2ea57609a547e473" fallbackText={"Gepland"} inline={false} /></option>
        </select>
      </div>
    </details>
    <button className={`${control} whitespace-nowrap`} onClick={() => {
      setStatus(''); setCombinedStatuses([]); setService(''); setZone(''); setEmployee(''); setDate(''); setSearch(''); setResultPage(1); setPositionMode('both');
      if (!draft) { setSelected(undefined); setSelectedIds([]); }
    }}><TranslatedText textKey="siteCopy.fa97c675023173ca" fallbackText={"Wis filters"} /></button>
  </>;
  const secondaryControls = <>
    <button className={`${control} whitespace-nowrap`} onClick={() => setView(initialView)}><TranslatedText textKey="siteCopy.fc82245ac0636727" fallbackText={"Pas in"} /></button>
    <details className="relative"><summary className={control}><TranslatedText textKey="siteCopy.8ae17a04360cc13f" fallbackText={"Lagen"} /></summary>
      <div className={`${panel} absolute right-0 z-30 grid w-48 gap-2 text-sm`}>
        <label><input type="checkbox" checked={labels} onChange={(event) => setLabels(event.target.checked)} />{' '}<TranslatedText textKey="siteCopy.1480cb7f04bda22d" fallbackText={"Bootlabels"} /></label>
        <label><input type="checkbox" checked={showStatus} onChange={(event) => setShowStatus(event.target.checked)} />{' '}<TranslatedText textKey="siteCopy.61a089d18a9182bb" fallbackText={"Statuscirkels"} /></label>
        <label><input type="checkbox" checked={plans} onChange={(event) => setPlans(event.target.checked)} />{' '}<TranslatedText textKey="siteCopy.6b53667fa8b90869" fallbackText={"Geplande posities"} /></label>
        <label><input type="checkbox" checked={arrows} onChange={(event) => setArrows(event.target.checked)} />{' '}<TranslatedText textKey="siteCopy.bad537648366a21e" fallbackText={"Bewegingspijlen"} /></label>
        <label><input type="checkbox" checked={guides} onChange={(event) => setGuides(event.target.checked)} />{' '}<TranslatedText textKey="siteCopy.364dce42b5dddc31" fallbackText={"Uitlijnraster"} /></label>
        <label><input type="checkbox" checked={showZones} onChange={(event) => setShowZones(event.target.checked)} />{' '}<TranslatedText textKey="siteCopy.8eca586be5d8f621" fallbackText={"Werfgrenzen en zones"} /></label>
      </div>
    </details>
    <details className="relative"><summary className={control} title="Kaartacties">⋯</summary>
      <div className={`${panel} absolute right-0 z-30 grid w-52 gap-1`}>
        <div className="flex gap-1 sm:hidden">
          <button className={control} aria-label="Uitzoomen" onClick={() => zoom(.8)}>−</button>
          <output className="self-center text-xs">{Math.round(view.scale * 100)}%</output>
          <button className={control} aria-label="Inzoomen" onClick={() => zoom(1.25)}>+</button>
        </div>
        <button className={control} onClick={resetView}><TranslatedText textKey="siteCopy.9f72119288369982" fallbackText={"Herstel weergave"} /></button>
        <button className={control} disabled={!selected?.placement.actual} onClick={() => selected && choose(selected, true)}><TranslatedText textKey="siteCopy.7f817140987baff1" fallbackText={"Zoom naar selectie"} /></button>
        {yard?.can_plan && yard.can_edit && selected?.placement.actual && selectedIds.length > 1 && !draft && !locked &&
          <button className={control} onClick={() => beginMove(selected, true)}><TranslatedText textKey="siteCopy.641e87d739c266a2" fallbackText={"Groepsverplaatsing voorstellen"} /></button>}
        <button className={control} aria-pressed={locked} onClick={() => setLocked(!locked)}>{locked ? 'Plaatsingen ontgrendelen' : 'Plaatsingen vergrendelen'}</button>
        {yard?.can_view_daily_plan && <button className={control} onClick={() => setDailyPlan(true)}><TranslatedText textKey="siteCopy.8e6b2b7e2defe8a8" fallbackText={"Dagplanning afdrukken"} /></button>}
        <button className={control} onClick={() => setHelp(!help)}><TranslatedText textKey="siteCopy.23c55ee28a553ad5" fallbackText={"Sneltoetsen"} /></button>
      </div>
    </details>
  </>;

  const teamSelect = scheduleResources?.teams?.length ? <label className="grid text-xs">
    <TranslatedText textKey="yardSchedule.team" inline={false} />
    <select className={control} value={teamId ?? ''} onChange={event => {
      const team = scheduleResources.teams.find(item => item.id === event.target.value);
      setTeamId(team?.id ?? '');
      if (team) setAssignee(team.lead_id);
    }}><option value="">—</option>{scheduleResources.teams.map(team => <option key={team.id} value={team.id}>{team.label}</option>)}</select>
  </label> : null;

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
          !selected.placement.interaction_locked && !selected.placement.planned && (draft || (yard.can_plan && selected.placement.actual))) {
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
      <div><h1 className="text-2xl font-semibold sm:text-3xl"><TranslatedText textKey="siteCopy.65460d34ae86a3ce" fallbackText={"Werfcanvas — Operationele werfplanning"} /></h1>
        <p className="text-sm text-slate-300"><TranslatedText textKey="siteCopy.67f7278e0a021624" fallbackText={"Beheer boten, verplaatsingen en historie op één werfplattegrond."} /></p></div>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg bg-[#efd092] px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={!yard?.can_edit || !!draft || busy} onClick={() => { setPicker(true); setDrawer(true); setTab('Werfcanvas'); }}><TranslatedText textKey="siteCopy.2d007b56b6624dd4" fallbackText={"+ Boot plaatsen"} /></button>
        <button className={control} disabled={locked || !yard?.can_edit || !yard.can_plan || !selected?.placement.actual || !!selected.placement.planned || !!draft || busy} onClick={() => {
          if (!selected?.placement.actual) return;
          beginMove(selected); setTab('Werfcanvas');
        }}><TranslatedText textKey="siteCopy.47c8f4f33081de6a" fallbackText={"+ Verplaatsing"} /></button>
        <button className={control} disabled={!yard?.can_publish || busy} onClick={() => {
          setEditingMap(!editingMap); setPreview(''); setPreparedBackground(undefined);
          setTab('Werfcanvas');
        }}><TranslatedText textKey="siteCopy.8de0ec50325870d6" fallbackText={"Kaart bewerken"} /></button>
      </div>
    </header>
    <datalist id="yard-equipment-options">{scheduleResources?.equipment?.map(item => <option key={item.id} value={item.label} />)}</datalist>
    <nav aria-label="Werfweergaven" className="flex flex-wrap gap-2">
      {yard?.can_manage_photos && <button className={control} aria-pressed={tab === 'photos'} onClick={() => { if (canNavigate()) setTab('photos'); }}>{photoCopy('title')}</button>}
      {['Werfcanvas', 'Botenlijst', ...(yard?.can_plan || yard?.can_execute ? ['Verplaatsingen'] : []), ...(yard?.can_execute ? ['Mijn werk vandaag'] : []), ...(yard?.can_plan || yard?.can_execute ? ['Dienstenbord'] : []), 'Historie'].map((name) => <button key={name} className={`${control} ${tab === name ? '!bg-blue-800' : ''}`} aria-pressed={tab === name} onClick={() => { if (name === tab || canNavigate()) { setLinkedMoveId(undefined); setTab(name); setResultPage(1); } }}>{name}</button>)}
      {[['Taken', 'taken'], ['Planning', 'planning']].map(([name, route]) => <Link key={route} className={control} href={`${admin}/${route}`}>{name}</Link>)}
    </nav></>}
    {error && <div role="alert" className="flex flex-wrap items-center gap-2 rounded bg-red-950 p-3 text-sm">
      <span>{error}</span><button className={control} onClick={() => {
        if (draft && !window.confirm('Concept wissen en kaart vernieuwen?')) return;
        resetDraft(); setError(''); setRevision((value) => value + 1);
      }}><TranslatedText textKey="siteCopy.08bc775747052d17" fallbackText={"Vernieuwen"} /></button>
    </div>}
    {notice && <p role="status" className="text-sm text-green-300">{notice}</p>}
    {yard?.can_manage_photos && tab === 'photos' && <YardPhotoSessions onPlacement={yard.can_edit ? openPhotoPlacement : undefined} onPublish={yard.can_publish ? (file, outputId) => {
      setPreparedBackground({ file, outputId });
      setPreview(URL.createObjectURL(file));
      setEditingMap(true);
      setTab('Werfcanvas');
    } : undefined} />}
    {(yard?.can_plan || yard?.can_execute) && tab === 'Dienstenbord' && <YardServiceBoard locale={locale} boatId={selected?.id} taskId={linkedMoveId} refreshRevision={refreshRevision} onChange={() => setRevision((value) => value + 1)} />}
    {(yard?.can_execute || yard?.can_plan) && (tab === 'Verplaatsingen' || tab === 'Mijn werk vandaag') &&
      <YardMoves key={tab} taskId={linkedMoveId} mine={tab === 'Mijn werk vandaag'} refreshRevision={refreshRevision} onChange={() => setRevision((value) => value + 1)} />}
    {recovery.recovered && !draft && <div role="status" className="flex flex-wrap items-center gap-2 rounded border border-amber-400 p-3 text-sm">
      <p><TranslatedText textKey="siteCopy.300496bb45b4ba9e" fallbackText={"Er is een niet-opgeslagen concept uit deze sessie beschikbaar."} /></p>
      <button className={control} disabled={busy || !yard?.can_edit} onClick={async () => {
        const saved = recovery.recovered;
        if (!saved) return;
        setBusy(true);
        try {
          const current = await api<Yard>(yardEndpoint, { query: { search: saved.draft.id } });
          const boat = current.boats.data.find((item) => item.id === saved.draft.id);
          if (!boat || !current.can_edit) throw new Error('Deze boot kan niet worden bewerkt.');
          recovery.discard(); setSelected({ ...boat, placement: saved.placement }); setSelectedIds([boat.id]);
          setDraft(saved.draft); setReason(saved.reason); setDueAt(saved.dueAt); setAssignee(saved.assignee); setTeamId(saved.teamId); setEquipment(saved.equipment);
          setDuration(saved.duration); setPriority(saved.priority); setInstructions(saved.instructions); setDrawer(true); setTab('Werfcanvas');
          if (boat.placement.version !== saved.placement.version) setConflict({ ...boat.placement, assignment: boat.move_job });
          setNotice('Concept hersteld. Controleer de huidige werfinstructies voordat je opslaat.');
        } catch (err) { setError(errorMessage(err as ApiError)); }
        finally { setBusy(false); }
      }}><TranslatedText textKey="siteCopy.e1aaa862d82552ab" fallbackText={"Concept vergelijken en herstellen"} /></button>
      <button className={control} onClick={recovery.discard}><TranslatedText textKey="siteCopy.0297159c408e2eb2" fallbackText={"Concept verwijderen"} /></button>
    </div>}
    {!yard && !error && <p role="status"><TranslatedText textKey="siteCopy.7f0e9db9b6d4e7bd" fallbackText={"Werfcanvas laden…"} /></p>}
    {yard && !yard.geometry?.verified && <p role="status" className="text-sm text-amber-200"><TranslatedText textKey="siteCopy.ca9927991f829947" fallbackText={"Werfgrens nog niet gemeten. Kaartcontroles gebruiken voorlopige afmetingen."} /></p>}
    {yard?.background && !yard.background.calibration_current && <p role="status" className="text-sm text-amber-200"><TranslatedText textKey="siteCopy.a76b7ecc54d95878" fallbackText={"De achtergrond heeft geen actuele goedgekeurde kalibratie en is verborgen. Laat de meetpunten opnieuw controleren."} /></p>}
    {editingMap && tab === 'Werfcanvas' && yard?.geometry && <YardMapManagement initial={yard.geometry} version={imageVersion ?? 0} prepared={preparedBackground} onGeometryChanged={() => setRevision(value => value + 1)} onPublished={() => { setEditingMap(false); setPreview(''); setPreparedBackground(undefined); setRevision(value => value + 1); }} />}
    {tab === 'Historie' ? <YardHistory locale={locale} revision={revision} /> : (tab === 'Werfcanvas' || tab === 'Botenlijst') && <>
      <div className="relative z-20 flex min-w-0 shrink-0 items-center gap-1.5" role="group" aria-label="Werfcanvas werkbalk">
        <input className={`${control} min-w-0 flex-1 2xl:min-w-36`} maxLength={120} aria-label="Zoek boot, klant, registratie of referentie" placeholder="Zoek boot, eigenaar, registratie…" value={search} onChange={(event) => {
          setSearch(event.target.value); setResultPage(1);
          if (!event.target.value && !draft) { setSelected(undefined); setSelectedIds([]); }
        }} />
        {tab === 'Werfcanvas' && <>
          <div className="hidden items-center gap-1 2xl:flex">{filterControls}</div>
          <details className="relative shrink-0 2xl:hidden"><summary className={control} title="Meer filters en kaartbediening"><TranslatedText textKey="siteCopy.ee9a49b95bf97698" fallbackText={"Meer"} /><span className="hidden sm:inline">{' '}<TranslatedText textKey="siteCopy.f2519a295fc4192a" fallbackText={"filters"} /></span></summary>
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
          <button className={`${control} shrink-0 !bg-blue-800`} disabled={!draft || busy || conflict !== undefined} onClick={saveDraft}><TranslatedText textKey="siteCopy.acd554c217434dee" fallbackText={"Opslaan"} />{draft && ' •'}</button>
          <button ref={fullscreenButton} className={`${control} flex shrink-0 items-center gap-1`} title={expanded ? 'Volledig scherm sluiten' : 'Volledig scherm'}
            aria-label={expanded ? 'Volledig scherm sluiten' : 'Volledig scherm'} aria-pressed={expanded} onClick={() => void toggleFullscreen()}>
            {expanded ? <X size={16} /> : <Expand size={16} />}
          </button>
        </>}
      </div>
      {showResults && <section aria-label="Zoekresultaten" className={`${panel} shrink-0 space-y-2 ${expanded ? 'max-h-[28dvh] overflow-auto' : ''}`}>
        {tab === 'Botenlijst' && <div className="flex flex-wrap items-center gap-2">
          <strong><TranslatedText textKey="siteCopy.b13b9455a25d232b" fallbackText={"Botenlijst"} /></strong>
          <input aria-label="Lengte in centimeter" placeholder="Lengte (cm)" type="number" min={1} className={`${control} w-32`} value={length} onChange={(event) => { setLength(event.target.value); setResultPage(1); }} />
          <select aria-label="Stallingsstatus" className={control} value={storage} onChange={(event) => { setStorage(event.target.value); setResultPage(1); }}>
            <option value=""><TranslatedText textKey="siteCopy.7bef68bd4fa025b7" fallbackText={"Alle stallingsstatussen"} inline={false} /></option><option value="active"><TranslatedText textKey="siteCopy.d9f04e0ac12a1198" fallbackText={"Actieve stalling"} inline={false} /></option><option value="inactive"><TranslatedText textKey="siteCopy.40ea435262fcb934" fallbackText={"Geen actieve stalling"} inline={false} /></option>
            <option value="winter"><TranslatedText textKey="siteCopy.0904aea9db28d26b" fallbackText={"Winterstalling"} inline={false} /></option><option value="summer"><TranslatedText textKey="siteCopy.fb365893e693dc00" fallbackText={"Zomerstalling"} inline={false} /></option>
          </select>
          <select aria-label="Plaatsingsstatus" className={control} value={site} onChange={(event) => { setSite(event.target.value); setResultPage(1); }}>
            <option value=""><TranslatedText textKey="siteCopy.780a86c56cf6bf9e" fallbackText={"Alle boten"} inline={false} /></option><option value="1"><TranslatedText textKey="siteCopy.ec090ba499b00c9b" fallbackText={"Op werfkaart"} inline={false} /></option><option value="0"><TranslatedText textKey="siteCopy.b548337ec8301215" fallbackText={"Zonder plaatsing"} inline={false} /></option>
            <option value="unplaced-arrival"><TranslatedText textKey="siteCopy.b566b5ff41fda2f5" fallbackText={"Aangekomen — Nog plaatsen"} inline={false} /></option>
            <option value="registered_not_arrived"><TranslatedText textKey="siteCopy.8dd4bc08845fe308" fallbackText={"Geregistreerd — nog niet aangekomen"} inline={false} /></option><option value="temporarily_removed"><TranslatedText textKey="siteCopy.463093ffdbc0d969" fallbackText={"Tijdelijk van de kaart verwijderd"} inline={false} /></option><option value="departed"><TranslatedText textKey="siteCopy.1039528f29ca3b57" fallbackText={"Vertrokken"} inline={false} /></option>
            <option value="arrived_unplaced"><TranslatedText textKey="siteCopy.dd7d85fc720ae83a" fallbackText={"Aangekomen — eerste plaatsing"} inline={false} /></option>
          </select>
        </div>}
        {searchError && <p role="alert">{searchError} <button className={control} onClick={() => setRetry(retry + 1)}><TranslatedText textKey="siteCopy.3ad579345c1df9f4" fallbackText={"Opnieuw proberen"} /></button></p>}
        {!results && !searchError && <p role="status"><TranslatedText textKey="siteCopy.b307cf6ca0b63fac" fallbackText={"Boten laden…"} /></p>}
        {results && !results.data.some((boat) => tab === 'Botenlijst' || (matches(boat) && onYardDate(boat.move_job?.date, date))) && <p><TranslatedText textKey="siteCopy.5eac9c5021a6cb69" fallbackText={"Geen boten gevonden op deze pagina."} /></p>}
        <ul className="max-h-56 divide-y divide-slate-700 overflow-y-auto">
          {results?.data.filter((boat) => tab === 'Botenlijst' || (matches(boat) && onYardDate(boat.move_job?.date, date))).map((boat) => <li key={boat.id}>
            <button className="w-full px-2 py-2 text-left hover:bg-slate-800 disabled:opacity-50" disabled={!!draft && draft.id !== boat.id} onClick={() => {
              choose(boat, true); setTab('Werfcanvas'); setSearch('');
              if (!boat.placement.actual) setPicker(true);
            }}><BoatIdentity boat={boat} compact /></button>
          </li>)}
        </ul>
        {results && results.last_page > 1 && <div className="flex items-center gap-2">
          <button className={control} disabled={resultPage <= 1} onClick={() => setResultPage(resultPage - 1)}><TranslatedText textKey="siteCopy.19280b1214ce7dc0" fallbackText={"Vorige"} /></button>
          <span>{resultPage} / {results.last_page}</span>
          <button className={control} disabled={resultPage >= results.last_page} onClick={() => setResultPage(resultPage + 1)}><TranslatedText textKey="siteCopy.5039191b6dd79e15" fallbackText={"Volgende"} /></button>
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
                const drag = gesture.current;
                if (drag?.moved && drag.draft) setDraft(drag.originalDraft);
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
              {mapImage && background && (mapImage.transform
                ? <image href={background} x={0} y={0} width={1} height={1} transform={`matrix(${mapImage.transform.join(' ')})`} preserveAspectRatio="none" />
                : <image href={background} x={mapImage.x} y={mapImage.y} width={mapImage.width} height={mapImage.height} preserveAspectRatio="none" />)}
              {yard.geometry && <polygon points={yard.geometry.boundary.map(p => p.join(',')).join(' ')} fill="none" stroke="#fbbf24" strokeWidth={.15} strokeDasharray=".8 .4" pointerEvents="none" />}
              {guides && mapImage && <rect width={yard.width} height={yard.height} fill="url(#yard-grid)" pointerEvents="none" />}
              {showZones && <rect width={yard.width} height={yard.height} fill="none" stroke="#f1d28f" strokeWidth=".28" strokeDasharray="1 1" />}
              {showZones && (yard.geometry?.zones ?? yard.background?.zones)?.map((zone, index) => <rect key={index} x={zone.x} y={zone.y} width={zone.width} height={zone.height}
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
                      {boat.top_view && <image href={boat.top_view.url} x={-length / 2} y={-width / 2} width={length} height={width} preserveAspectRatio="none" pointerEvents="none" />}
                    </g>
                    {highlighted && yard.can_edit && !locked && !boat.placement.interaction_locked && !boat.placement.planned && (!boat.placement.actual || yard.can_plan) && <circle cx={(draftPosition?.x ?? position.x) - position.x + Math.cos((draftPosition ?? position).rotation * Math.PI / 180) * (length / 2 + 1.2)}
                      cy={(draftPosition?.y ?? position.y) - position.y + Math.sin((draftPosition ?? position).rotation * Math.PI / 180) * (length / 2 + 1.2)} r=".65" fill="#facc15" className="cursor-crosshair"
                      onPointerDown={(event) => start(event, boat, draftPosition ?? position, true)}><title><TranslatedText inline={false} textKey="yardPricing.rotateVerb" /> {boat.name}</title></circle>}
                    {showStatus && statusKeys(boat).map((key, index) => {
                      const route = key === 'action' ? boat.action_route : statuses[key].route?.(boat.statuses[key]);
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
            {mapCount}{' '}<TranslatedText textKey="siteCopy.41ef988ab60b6d4b" fallbackText={"op kaart · Weergave opgehaald"} />{' '}{loadedAt?.toLocaleTimeString('nl-NL', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit' }) ?? '—'}
          </p>
          {menu && <div aria-label={`Acties voor ${menu.boat.name}`} className={`${panel} absolute z-20 grid max-h-[95%] w-56 max-w-[95%] gap-1 overflow-auto shadow-xl`}
            style={{ left: menu.x ?? 8, top: menu.y ?? 8 }}>
            <div className="flex items-center justify-between gap-1"><strong>{menu.boat.name}</strong><button className={control} aria-label="Bootacties sluiten" onClick={() => setMenu(undefined)}>×</button></div>
            <Link className={control} href={`${admin}/boten/${menu.boat.id}`}><TranslatedText textKey="siteCopy.0898f330d8a25890" fallbackText={"Bekijk boot"} /></Link>
            {yard.can_edit && !draft && menu.boat.placement.version > 0 && <button className={control} disabled={busy} onClick={async () => {
              const boat = menu.boat;
              setBusy(true); setError('');
              try {
                const placement = await api<Placement>(`${yardEndpoint}/placements/${boat.id}/lock`, {
                  method: 'PATCH', body: { version: boat.placement.version, locked: !boat.placement.interaction_locked },
                });
                setSelected({ ...boat, placement }); setRevision((value) => value + 1); setMenu(undefined);
              } catch (err) { setError(errorMessage(err as ApiError)); }
              finally { setBusy(false); }
            }}>{menu.boat.placement.interaction_locked ? 'Deze boot ontgrendelen' : 'Deze boot vergrendelen'}</button>}
            {yard.can_edit && yard.can_plan && !locked && !draft && menu.boat.placement.actual && !menu.boat.placement.planned && <>
              <button className={control} onClick={() => { beginMove(menu.boat); setMenu(undefined); svg.current?.focus(); }}><TranslatedText textKey="siteCopy.8332fcf3c8de5a9a" fallbackText={"Verplaatsen"} /></button>
              <button className={control} onClick={() => { beginMove(menu.boat); setMenu(undefined); }}><TranslatedText textKey="siteCopy.f3e3c6978e22b786" fallbackText={"Verplaatsing plannen"} /></button>
            </>}
            {can('planning.manage') && <button className={control} onClick={() => { setQuickTask(menu.boat); setDrawer(true); setMenu(undefined); }}><TranslatedText textKey="siteCopy.c5e1580c991d75af" fallbackText={"Taak toevoegen"} /></button>}
            {can('boats.write') && <button className={control} onClick={() => { setPhoto(menu.boat); setMenu(undefined); }}><TranslatedText textKey="siteCopy.91fd205555d4abfb" fallbackText={"Foto toevoegen"} /></button>}
            <button className={control} onClick={async () => {
              try {
                await navigator.clipboard.writeText(menu.boat.registration_number || menu.boat.id);
                setNotice('Bootreferentie gekopieerd.');
              } catch { setError('Bootreferentie kon niet worden gekopieerd.'); }
              setMenu(undefined);
            }}><TranslatedText textKey="siteCopy.3bad32a0320b1520" fallbackText={"Kopieer bootreferentie"} /></button>
            <button className={control} onClick={() => { setDetail('Historie'); setDrawer(true); setMenu(undefined); }}><TranslatedText textKey="siteCopy.61f6b8a402093e2b" fallbackText={"Historie bekijken"} /></button>
            {yard.can_edit && !draft && menu.boat.placement.actual && !menu.boat.placement.planned &&
              <button className={`${control} !text-red-300`} onClick={() => { setMenu(undefined); removePlacement(); }}><TranslatedText textKey="siteCopy.6c15414b34e60211" fallbackText={"Verwijder van canvas"} /></button>}
          </div>}
          {help && <div className={`${panel} absolute left-2 top-2 z-20 max-w-xs space-y-2 text-sm`}>
            <button className={control} onClick={() => setHelp(false)}><TranslatedText textKey="siteCopy.ac8bc4997b7cfe0a" fallbackText={"Sneltoetsen sluiten"} /></button>
            <p>{typeof navigator !== 'undefined' && /Mac|iPad|iPhone/.test(navigator.platform) ? '⌘' : 'Ctrl'}{' '}<TranslatedText textKey="siteCopy.af26000c567e8f5d" fallbackText={"+ Z / Shift + Z / S · concept ongedaan maken, opnieuw, opslaan"} /></p>
            <p><TranslatedText textKey="siteCopy.3c32368f673ec831" fallbackText={"Pijlen · 0,1 m · met Shift 1 m. Spatie + slepen · kaart verschuiven. + / − / 0 · zoom en pas in."} /></p>
            <p><TranslatedText textKey="siteCopy.ed76897fb3175fd5" fallbackText={"Shift + klik · meerdere boten. Delete · plaatsing verwijderen na bevestiging. Esc · sluiten."} /></p>
            {Object.values(statuses).map(({ label, color }) => <p key={label}><span style={{ color }}>●</span> {label}</p>)}
          </div>}
          {yard.background?.published_at && <p className="pointer-events-none absolute bottom-2 left-2 rounded bg-slate-950/90 px-2 py-1 text-xs"><TranslatedText textKey="siteCopy.d5ac2dc6236dec97" fallbackText={"Kaartversie"} />{' '}{yard.background.version} · {new Date(yard.background.published_at).toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' })}
          </p>}
          {!mapImage && <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-slate-950/80 px-2 py-1 text-xs"><TranslatedText textKey="siteCopy.610d350e543e1b43" fallbackText={"Tijdelijk werfraster · meters"} /></span>}
          {hover && !draft && <div className="absolute bottom-8 left-2 max-w-[95%] rounded-lg border border-slate-500 bg-slate-950 p-2 text-xs shadow-lg" onPointerEnter={() => showHover(hover)} onPointerLeave={hideHover}>
            <BoatIdentity boat={hover} />
            <div className="mt-2 flex gap-3"><Link className="text-blue-300" href={`${admin}/boten/${hover.id}`}><TranslatedText textKey="siteCopy.0898f330d8a25890" fallbackText={"Bekijk boot"} /></Link>
              {can('boats.write') && <button className="text-blue-300" onClick={() => setPhoto(hover)}><TranslatedText textKey="siteCopy.91fd205555d4abfb" fallbackText={"Foto toevoegen"} /></button>}
              {hover.statuses.maintenance && <Link className="text-blue-300" href={`${admin}/werkorders/${hover.statuses.maintenance}`}><TranslatedText textKey="siteCopy.76dd23c0158a8722" fallbackText={"Werkzaamheden"} /></Link>}</div>
          </div>}
        </div>
        {drawer && <aside aria-label="Boten en details"
          className={`${panel} min-w-0 space-y-3 overflow-auto overscroll-contain ${expanded ? 'absolute bottom-0 right-0 top-12 z-10 w-[min(22rem,85vw)] lg:static lg:w-auto' : 'lg:max-h-[min(74dvh,65vw)] lg:min-h-[340px]'}`}>
          <section className="rounded-lg border border-slate-600 bg-slate-800/60 p-2">
            <button className="w-full py-1 text-left font-semibold" aria-expanded={picker} onClick={() => setPicker(!picker)}><TranslatedText textKey="siteCopy.309d7709230a8d45" fallbackText={"Boten zonder locatie ("} />{unplaced?.total ?? '…'}) {picker ? '⌄' : '›'}
            </button>
            {picker && <div className="space-y-2">
              {unplacedError && <p role="alert">{unplacedError} <button className={control} onClick={() => setRetry(retry + 1)}><TranslatedText textKey="siteCopy.3ad579345c1df9f4" fallbackText={"Opnieuw proberen"} /></button></p>}
              {!unplaced && !unplacedError && <p role="status"><TranslatedText textKey="siteCopy.b307cf6ca0b63fac" fallbackText={"Boten laden…"} /></p>}
              <ul className="max-h-56 divide-y divide-slate-700 overflow-auto">
                {unplaced?.data.filter(matches).map((boat) => {
                  const canPlace = yard.can_edit && !draft && !busy && !locked && boat.placement.presence !== 'departed';
                  return <li key={boat.id} draggable={canPlace} onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-yard-boat', boat.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
                    <button className="min-w-0 text-left" title="Bekijk bootdetails" disabled={!!draft && draft.id !== boat.id} onClick={() => choose(boat)}><BoatIdentity boat={boat} compact /></button>
                    {canPlace && <button className={`${control} !bg-blue-800`} onClick={() => placeDraft(boat)}><TranslatedText textKey="siteCopy.6358429f392da139" fallbackText={"Plaatsen"} /></button>}
                  </li>;
                })}
              </ul>
              {unplaced && !unplaced.data.some(matches) && <p className="text-xs text-slate-300"><TranslatedText textKey="siteCopy.1bd3237f14666a54" fallbackText={"Geen passende boten op deze pagina."} /></p>}
              {unplaced && unplaced.last_page > 1 && <div className="flex items-center gap-2 text-xs">
                <button className={control} disabled={unplacedPage <= 1} onClick={() => setUnplacedPage(unplacedPage - 1)}><TranslatedText textKey="siteCopy.19280b1214ce7dc0" fallbackText={"Vorige"} /></button>
                <span>{unplacedPage} / {unplaced.last_page}</span>
                <button className={control} disabled={unplacedPage >= unplaced.last_page} onClick={() => setUnplacedPage(unplacedPage + 1)}><TranslatedText textKey="siteCopy.5039191b6dd79e15" fallbackText={"Volgende"} /></button>
              </div>}
              {yard.can_edit && <Link href={`${admin}/boten?new=1`} className="text-xs text-blue-300 underline"><TranslatedText textKey="siteCopy.7dc3353743158c47" fallbackText={"Nieuwe boot registreren"} /></Link>}
            </div>}
          </section>
          {!selected ? <p className="text-sm text-slate-300"><TranslatedText textKey="siteCopy.3f5d9a34b6f43053" fallbackText={"Selecteer een boot op de kaart of zoek een bestaande boot."} /></p> : <>
            <button aria-expanded={drawer} className="w-full text-left font-semibold lg:hidden" onClick={() => setDrawer(!drawer)}>{selected.name} · {drawer ? 'Details sluiten' : 'Details openen'}</button>
            <div className={`${drawer ? 'block' : 'hidden lg:block'} space-y-4`}>
              <div className="flex items-start justify-between gap-2">
                <BoatIdentity boat={selected} />
                <button aria-label="Bootacties" className={control} onClick={() => {
                  setMenu(menu ? undefined : { boat: selected });
                  mapFrame.current?.scrollIntoView({ block: 'nearest' });
                }}>⋯</button>
              </div>
              {selected.move_job && <p className="rounded bg-slate-800 p-2 text-xs"><TranslatedText textKey="siteCopy.60e9cbf90a562c59" fallbackText={"Geplande verplaatsing ·"} />{' '}{new Date(selected.move_job.due_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}</p>}
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
                <label className="grid gap-1 text-xs"><TranslatedText textKey="siteCopy.ff9d994a993ca0bd" fallbackText={"Taaknaam"} /><input className={control} name="title" required maxLength={255} /></label>
                <label className="grid gap-1 text-xs"><TranslatedText textKey="siteCopy.6ebab66981e56f0f" fallbackText={"Datum"} /><input className={control} name="due_on" type="date" /></label>
                  <label className="grid gap-1 text-xs"><TranslatedText textKey="siteCopy.ee6ac5a8e105a39c" fallbackText={"Tijdstip"} /><input className={control} name="due_at" type="datetime-local" /></label>
                  <label className="grid gap-1 text-xs"><TranslatedText textKey="siteCopy.1c82ef2208ee5533" fallbackText={"Uitvoerder"} /><select className={control} name="assigned_to_user_id"><option value=""><TranslatedText textKey="siteCopy.fb1028817a7500b5" fallbackText={"Nog niet toegewezen"} inline={false} /></option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
                  {scheduleResources?.teams?.length ? <label className="grid gap-1 text-xs"><TranslatedText textKey="yardSchedule.team" inline={false} /><select className={control} name="team_id"><option value="">—</option>{scheduleResources.teams.map(team => <option key={team.id} value={team.id}>{team.label}</option>)}</select></label> : null}
                  <label className="grid gap-1 text-xs"><TranslatedText textKey="siteCopy.e556d143d038fef6" fallbackText={"Duur (minuten)"} /><input className={control} name="duration_minutes" type="number" min={1} max={720} defaultValue={30} required /></label>
                  <label className="grid gap-1 text-xs"><TranslatedText textKey="siteCopy.4d1acde76aec65b1" fallbackText={"Materieel"} /><input className={control} name="equipment" list="yard-equipment-options" maxLength={150} /></label>
                  <label className="grid gap-1 text-xs"><TranslatedText textKey="siteCopy.e0ee7637495f0443" fallbackText={"Dienstcode uit catalogus"} /><input className={control} name="service_code" maxLength={100} /></label>
                  <label className="grid gap-1 text-xs"><TranslatedText textKey="siteCopy.4a52198fab761e7c" fallbackText={"Prioriteit"} /><select className={control} name="priority"><option value="normal"><TranslatedText textKey="siteCopy.47981ebfbb19b0b9" fallbackText={"Normaal"} inline={false} /></option><option value="low"><TranslatedText textKey="siteCopy.eb4ad8bbf5eec32a" fallbackText={"Laag"} inline={false} /></option><option value="high"><TranslatedText textKey="siteCopy.05bc2b4a4f70097d" fallbackText={"Hoog"} inline={false} /></option><option value="urgent"><TranslatedText textKey="siteCopy.4427e01eeeabce33" fallbackText={"Urgent"} inline={false} /></option></select></label>
                <label className="grid gap-1 text-xs"><TranslatedText textKey="siteCopy.b14daa9867f1a0b0" fallbackText={"Instructies"} /><textarea className={control} name="description" maxLength={2000} /></label>
                <div className="flex gap-1"><button className={control} disabled={busy}><TranslatedText textKey="siteCopy.329122629a956eb4" fallbackText={"Taak opslaan"} /></button>
                  <button type="button" className={control} onClick={() => setQuickTask(undefined)}><TranslatedText textKey="siteCopy.99d72c5cdafdc4a1" fallbackText={"Sluiten"} /></button></div>
              </form>}
              {selected.placement.presence && <p className="text-sm text-slate-300">
                {selected.placement.presence === 'departed' ? 'Vertrokken' : selected.placement.actual ? 'Aangekomen' : 'Aangekomen — Nog plaatsen'}
              </p>}
              {selected.placement.arrival && <div className="grid gap-1 text-sm">
                {selected.placement.arrived_at && <time dateTime={selected.placement.arrived_at}>{new Date(selected.placement.arrived_at).toLocaleString(locale, { timeZone: 'Europe/Amsterdam' })}</time>}
                {selected.placement.arrival.appointment_id && <Link href={`${admin}/afspraken?appointment_id=${selected.placement.arrival.appointment_id}`}>Aankomstafspraak {selected.placement.arrival.service_code}</Link>}
                {selected.placement.arrival.condition && <p className="whitespace-pre-wrap">{selected.placement.arrival.condition}</p>}
                {!!selected.placement.arrival.photo_ids?.length && <Link href={`${admin}/boten/${selected.id}`}>Aankomstfoto’s in het bootdossier ({selected.placement.arrival.photo_ids.length})</Link>}
              </div>}
              {yard.can_edit && !draft && arrival?.id === selected.id && <YardArrival key={selected.id}
                boatId={selected.id} name={selected.name} version={arrival.version}
                onSaved={() => { setArrival(undefined); setNotice('Aankomst opgeslagen.'); setRevision(value => value + 1); }}
                onClose={() => setArrival(undefined)} />}
              {yard.can_edit && !draft && !selected.placement.planned && <div className="flex flex-wrap gap-1">
                {selected.placement.presence !== 'arrived' && arrival?.id !== selected.id && <button className={control} disabled={busy}
                  onClick={() => setArrival({ id: selected.id, version: selected.placement.version })}><TranslatedText textKey="siteCopy.0ee007c720047379" fallbackText={"Aankomst bevestigen"} /></button>}
                {(selected.placement.presence === 'arrived' || selected.placement.actual) && <button className={control} disabled={busy} onClick={() => {
                  if (window.confirm(`Bevestig dat ${selected.name} de werf fysiek heeft verlaten.`)) void save('depart');
                }}><TranslatedText textKey="siteCopy.99b4e5571abdfd74" fallbackText={"Vertrek bevestigen"} /></button>}
                {!selected.placement.actual && selected.placement.presence !== 'departed' && <button className={control} disabled={busy || locked} onClick={() => placeDraft(selected)}><TranslatedText textKey="siteCopy.ff67833eba46d73b" fallbackText={"Plaats op kaart"} /></button>}
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
                 ><TranslatedText textKey="siteCopy.f6db499e81d387f3" fallbackText={"Open gekoppelde afspraak"} /></Link>}
                {draft && <>
                  <h3 className="font-semibold">{selected.placement.actual ? `${selected.name} verplaatsen` : 'Plaatsingsconcept'}</h3>
                  {!!draft.group?.length && <p className="text-xs">{draft.group.length + 1}{' '}<TranslatedText textKey="siteCopy.fabd9d96b445ff4a" fallbackText={"boten · opdrachten achter elkaar inplannen"} /></p>}
                  {selected.placement.actual && <p className="text-xs"><TranslatedText textKey="siteCopy.362f5033802d20fa" fallbackText={"Van ·"} />{' '}{describePosition(selected.placement.actual)}</p>}
                  <p className="text-xs text-amber-200"><TranslatedText textKey="siteCopy.2a92df4bba5d14cb" fallbackText={"Naar ·"} />{' '}{describePosition({ ...draft.position, location_code: location })}</p>
                  {conflict && <ConflictDetails placement={conflict} />}
                  {warnings && <div role="status" className={`text-xs ${warnings.length ? 'text-amber-200' : 'text-green-300'}`}>
                    {warnings.length ? warnings.join(' ') : 'Geen conflict gevonden.'}
                    <p className="text-slate-300"><TranslatedText textKey="siteCopy.f695b8244170c384" fallbackText={"Kaartcontrole op basis van geregistreerde afmetingen en zones."} /></p>
                  </div>}
                  <div className="flex flex-wrap gap-2">
                    <label className="grid text-xs"><TranslatedText textKey="siteCopy.d00632068482d347" fallbackText={"Rotatie °"} /><input className={`${control} w-24`} type="number" min={0} max={360} step={1} value={Math.round(draft.position.rotation)} onChange={(event) => edit({ ...draft, position: { ...draft.position, rotation: Number(event.target.value) } })} /></label>
                    <label className="grid text-xs"><TranslatedText textKey="siteCopy.f022e2fc8bdf815f" fallbackText={"Locatiecode"} /><input className={`${control} w-28`} value={location} onChange={(event) => edit({ ...draft, position: { ...draft.position, location_code: event.target.value || null } })} /></label>
                  </div>
                  {selected.placement.actual && selected.statuses.planning && <label className="block text-xs">
                    <input type="checkbox" checked={linkAppointment} onChange={(event) => setLinkAppointment(event.target.checked)} />{' '}<TranslatedText textKey="siteCopy.029db07e5f97d6ba" fallbackText={"Verplaatsing koppelen aan actieve afspraak"} /></label>}
                  <div className="flex flex-wrap gap-1">
                    <button className={control} disabled={busy} onClick={resetDraft}><TranslatedText textKey="siteCopy.a87a5a85c0252680" fallbackText={"Annuleren"} /></button>
                  </div>
                </>}
                <label className="grid text-xs"><TranslatedText textKey="siteCopy.a6e6be1150f9ed7c" fallbackText={"Reden / toelichting bij waarschuwing"} /><input className={control} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} /></label>
                {!draft && !selected.placement.actual && !selected.placement.planned && selected.placement.previous && selected.placement.presence !== 'departed' && <YardRestoreReview boatId={selected.id} version={selected.placement.version} position={selected.placement.previous} reason={reason} onApproved={setSafetyApproval} />}
                {draft && assessment && <div role="status" className={`text-xs ${assessment.severity === 'red' ? 'text-red-200' : assessment.severity === 'orange' ? 'text-amber-200' : 'text-green-300'}`}>
                  <p><TranslatedText textKey="siteCopy.cd96a08b7717f313" fallbackText={"Controle: "} />{{ red: 'rood — onafhankelijke beoordeling vereist', orange: 'oranje — toelichting vereist', green: 'groen' }[assessment.severity]}</p>
                  {assessment.details.map((d, i) => <p key={i}>{d.message} <TranslatedText textKey="siteCopy.b5568e9e25fc74da" fallbackText={" Vrije ruimte "} />{d.clearance_m == null ? 'onbekend' : d.clearance_m.toFixed(2)} <TranslatedText textKey="siteCopy.15117cda4eb10f75" fallbackText={" m · vereist "} />{d.required_clearance_m.toFixed(2)} <TranslatedText textKey="siteCopy.098bd218c4e7913b" fallbackText={" m."} /></p>)}
                  {assessment.requires_approval && assessment.details.every(d => d.overridable) && !draft.group?.length && <YardSafetyProposal onApproved={setSafetyApproval} proposal={{ boatId: selected.id, version: selected.placement.version, operation: selected.placement.actual ? selected.placement.planned ? 'replan' : 'plan' : 'place', reason, position: { ...draft.position, location_code: location || null }, ...(selected.placement.actual ? { due_at: offsetStart ?? dueAt, duration_minutes: Number(duration) } : {}) }} />}
                </div>}
                {yard.can_plan && selected.placement.actual && draft && !selected.placement.planned && <div className="grid gap-2">
                  <label className="grid text-xs"><TranslatedText textKey="siteCopy.ae3f9cc15a21108a" fallbackText={"Datum en tijd (Nederland)"} /><input type="datetime-local" className={control} value={dueAt} onChange={(event) => { setDueAt(event.target.value); setOffsetStart(undefined); }} /></label>
                  <label className="grid text-xs"><TranslatedText textKey="siteCopy.4d1acde76aec65b1" fallbackText={"Materieel"} /><input className={control} list="yard-equipment-options" maxLength={150} value={equipment} onChange={(event) => setEquipment(event.target.value)} /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid text-xs"><TranslatedText textKey="siteCopy.bf1ee9513d5ae95a" fallbackText={"Duur (min.)"} /><input className={control} type="number" min={1} max={720} value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
                    <label className="grid text-xs"><TranslatedText textKey="siteCopy.4a52198fab761e7c" fallbackText={"Prioriteit"} /><select className={control} value={priority} onChange={(event) => setPriority(event.target.value)}>
                      <option value="low"><TranslatedText textKey="siteCopy.eb4ad8bbf5eec32a" fallbackText={"Laag"} inline={false} /></option><option value="normal"><TranslatedText textKey="siteCopy.47981ebfbb19b0b9" fallbackText={"Normaal"} inline={false} /></option><option value="high"><TranslatedText textKey="siteCopy.05bc2b4a4f70097d" fallbackText={"Hoog"} inline={false} /></option><option value="urgent"><TranslatedText textKey="siteCopy.6a443a3f80dd91a5" fallbackText={"Dringend"} inline={false} /></option>
                    </select></label>
                  </div>
                  <label className="grid text-xs"><TranslatedText textKey="siteCopy.b14daa9867f1a0b0" fallbackText={"Instructies"} /><textarea className={control} maxLength={2000} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
                </div>}
                {yard.can_plan && ((draft && selected.placement.actual && !selected.placement.planned) || (!draft && selected.placement.planned?.task_id)) &&
                  <>{teamSelect}<label className="grid text-xs"><TranslatedText textKey="siteCopy.03398e24efecaa86" fallbackText={"Medewerker"} /><select aria-label="Medewerker" className={control} value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                    <option value=""><TranslatedText textKey="siteCopy.1185ca77d3256130" fallbackText={"Kies een medewerker"} inline={false} /></option>
                    {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </select></label></>}
                <div className="flex flex-wrap gap-1">
                  {draft && !selected.placement.actual && <button className={control} disabled={busy || conflict !== undefined} onClick={() => void save('place') }><TranslatedText textKey="siteCopy.36c60058b1fb3f68" fallbackText={"Plaatsing opslaan"} /></button>}
                  {yard.can_plan && draft && selected.placement.actual && !selected.placement.planned && <button className={control} disabled={busy || conflict !== undefined || !dueAt || Number(duration) < 1 || Number(duration) > 720} onClick={() => void save('plan')}><TranslatedText textKey="siteCopy.f3e3c6978e22b786" fallbackText={"Verplaatsing plannen"} /></button>}
                  {yard.can_plan && draft && selected.placement.planned && <button className={control} disabled={busy} onClick={() => openQuickMove(selected)}><TranslatedText textKey="siteCopy.6a1c2043e2656a9e" fallbackText={"Verplaatsing aanpassen"} /></button>}
                  {yard.can_plan && draft && !draft.group?.length && selected.placement.actual && !selected.placement.planned && <button className={control} disabled={busy || conflict !== undefined} onClick={() => {
                    if (window.confirm(`Bevestig dat ${selected.name} fysiek staat op ${describePosition({ ...draft.position, location_code: location })}.`)) void save('move_now');
                  }}><TranslatedText textKey="siteCopy.bc8da3b414c88bd8" fallbackText={"Nu verplaatst"} /></button>}
                  {yard.can_plan && !draft && selected.placement.planned?.task_id && <button className={control} disabled={busy || !assignee} onClick={() => void save('assign')}><TranslatedText textKey="siteCopy.c0710f297f29a120" fallbackText={"Toewijzen"} /></button>}
                  {yard.can_plan && !draft && selected.placement.planned && !selected.placement.planned.task_id && <button className={control} disabled={busy} onClick={() => {
                    if (window.confirm('Bevestig dat de boot fysiek op de geplande locatie staat.')) void save('complete');
                  }}><TranslatedText textKey="siteCopy.984b176aa7423b1c" fallbackText={"Verplaatsing uitgevoerd"} /></button>}
                  {yard.can_plan && !draft && selected.placement.planned && <button className={control} disabled={busy} onClick={() => void save('cancel_plan')}><TranslatedText textKey="siteCopy.a4c3055edb20e0a4" fallbackText={"Planning annuleren"} /></button>}
                  {!draft && !selected.placement.actual && !selected.placement.planned && selected.placement.previous && selected.placement.presence !== 'departed' && <button className={control} disabled={busy} onClick={() => void save('restore')}><TranslatedText textKey="siteCopy.1d1182d9b73eebcd" fallbackText={"Vorige plaatsing herstellen"} /></button>}
                  {!draft && !selected.placement.planned && selected.placement.actual && <button className={control} disabled={busy} onClick={() => {
                    if (window.confirm('Boot van de werfkaart verwijderen?')) void save('remove');
                  }}><TranslatedText textKey="siteCopy.1ac0cdd1719106eb" fallbackText={"Van kaart verwijderen"} /></button>}
                </div>
              </div>}
              <nav aria-label="Bootdetails" className="flex flex-wrap gap-1">
                {['Overzicht', 'Diensten', 'Financieel', 'Historie'].map((name) => <button key={name} className={`${control} !px-2 ${detail === name ? '!bg-blue-800' : ''}`} onClick={() => setDetail(name)} aria-pressed={detail === name}>{name}</button>)}
              </nav>
              {detail === 'Historie' ? <YardHistory key={selected.id} locale={locale} boatId={selected.id} revision={revision} /> :
                <div className="grid gap-2 text-sm text-blue-300">
                  <Link href={`${admin}/boten/${selected.id}`}><TranslatedText textKey="siteCopy.e8980e4e90651c47" fallbackText={"Open bootdossier"} /></Link>
                  {detail === 'Overzicht' && selected.customer && <Link href={`${admin}/klanten/${selected.customer.id}`}><TranslatedText textKey="siteCopy.91b0941538b85f19" fallbackText={"Open klant"} /></Link>}
                  {detail === 'Diensten' && selected.storage && <Link href={`${admin}/stalling/${selected.storage.id}`}><TranslatedText textKey="siteCopy.68af68fd44197abe" fallbackText={"Open stallingscontract"} /></Link>}
                  {detail === 'Diensten' && selected.statuses.maintenance && <Link href={`${admin}/werkorders/${selected.statuses.maintenance}`}><TranslatedText textKey="siteCopy.21579412778bc840" fallbackText={"Open werkorder"} /></Link>}
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
        <h2 id="yard-quick-move-title" className="text-lg font-bold"><TranslatedText textKey="siteCopy.f3e3c6978e22b786" fallbackText={"Verplaatsing plannen"} /></h2>
        <BoatIdentity boat={selected} compact />
        <p className="text-sm">{describePosition(selected.placement.actual)} → {describePosition(draft.position)}</p>
        {warnings?.length ? <p role="status" className="text-sm text-amber-200">{warnings.join(' ')}</p> : null}
        {scheduleWarnings.length ? <p role="status" className="text-sm text-amber-200">{scheduleWarnings.join(' ')}</p> : null}
        {assessment?.requires_approval && assessment.details.every(d => d.overridable) && <YardSafetyProposal onApproved={setSafetyApproval} proposal={{ boatId: selected.id, version: selected.placement.version, operation: selected.placement.planned ? 'replan' : 'plan', reason, position: { ...draft.position, location_code: location || null }, due_at: offsetStart ?? dueAt, duration_minutes: Number(duration) }} />}
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        {conflict && <ConflictDetails placement={conflict} />}
        <fieldset disabled={busy || loadingOptions} className="grid gap-3">
          {teamSelect}
          <label className="grid text-xs"><TranslatedText textKey="siteCopy.1c82ef2208ee5533" fallbackText={"Uitvoerder"} /><select className={control} value={assignee} onChange={(event) => setAssignee(event.target.value)}>
              <option value=""><TranslatedText textKey="siteCopy.fb1028817a7500b5" fallbackText={"Nog niet toegewezen"} inline={false} /></option>
              {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
          <label className="text-sm"><input type="checkbox" disabled={!assignee} checked={rememberAssignee && !!assignee} onChange={(event) => setRememberAssignee(event.target.checked)} />{' '}<TranslatedText textKey="siteCopy.58b1afb71e995d95" fallbackText={"Als standaard voor verplaatsen"} /></label>
          <div className="flex flex-wrap gap-1">
            {([['now', 'Nu'], ['today', 'Vandaag'], ['tomorrow', 'Morgen 09:00'], ['next', 'Eerstvolgende vrije plek']] as const).map(([choice, label]) =>
              <button key={choice} type="button" className={control} onClick={() => void loadMoveOptions(selected, choice)}>{label}</button>)}
          </div>
          <label className="grid text-xs"><TranslatedText textKey="siteCopy.6d1654ec521e229c" fallbackText={"Datum en tijd kiezen (Nederland)"} /><input required type="datetime-local" className={control} value={dueAt} onChange={(event) => { setDueAt(event.target.value); setOffsetStart(undefined); }} />
          </label>
          <label className="grid text-xs"><TranslatedText textKey="siteCopy.67d28961a8a6ec76" fallbackText={"Opmerking"} /><textarea className={control} maxLength={2000} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
          <details>
            <summary className="cursor-pointer text-sm"><TranslatedText textKey="siteCopy.1ab3f35aa24b968b" fallbackText={"Meer details"} /></summary>
            <div className="mt-2 grid gap-2">
              <label className="grid text-xs"><TranslatedText textKey="siteCopy.4d1acde76aec65b1" fallbackText={"Materieel"} /><input className={control} list="yard-equipment-options" maxLength={150} value={equipment} onChange={(event) => setEquipment(event.target.value)} /></label>
              <label className="grid text-xs"><TranslatedText textKey="siteCopy.bf1ee9513d5ae95a" fallbackText={"Duur (min.)"} /><input required className={control} type="number" min={1} max={720} value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
              <label className="grid text-xs"><TranslatedText textKey="siteCopy.4a52198fab761e7c" fallbackText={"Prioriteit"} /><select className={control} value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="low"><TranslatedText textKey="siteCopy.eb4ad8bbf5eec32a" fallbackText={"Laag"} inline={false} /></option><option value="normal"><TranslatedText textKey="siteCopy.47981ebfbb19b0b9" fallbackText={"Normaal"} inline={false} /></option><option value="high"><TranslatedText textKey="siteCopy.05bc2b4a4f70097d" fallbackText={"Hoog"} inline={false} /></option><option value="urgent"><TranslatedText textKey="siteCopy.6a443a3f80dd91a5" fallbackText={"Dringend"} inline={false} /></option>
              </select></label>
              <label className="grid text-xs"><TranslatedText textKey="siteCopy.f022e2fc8bdf815f" fallbackText={"Locatiecode"} /><input className={control} maxLength={80} value={location} onChange={(event) => setDraft({ ...draft, position: { ...draft.position, location_code: event.target.value || null } })} /></label>
              <label className="grid text-xs"><TranslatedText textKey="siteCopy.1ae719356d7c392f" fallbackText={"Toelichting bij kaartwaarschuwing"} /><input className={control} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            </div>
          </details>
        </fieldset>
        {loadingOptions && <p role="status" className="text-sm"><TranslatedText textKey="siteCopy.bfea9a09024a2432" fallbackText={"Beschikbaarheid controleren…"} /></p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={control} disabled={busy} onClick={() => { resetDraft(); setError(''); }}><TranslatedText textKey="siteCopy.a87a5a85c0252680" fallbackText={"Annuleren"} /></button>
          <button type="button" className={control} disabled={busy} onClick={() => { moveOptionsRequest.current++; setLoadingOptions(false); setQuickMove(false); }}><TranslatedText textKey="siteCopy.c197d9684371ba65" fallbackText={"Positie aanpassen"} /></button>
          <button className={`${control} !bg-amber-200 !text-slate-950`} disabled={busy || loadingOptions || conflict !== undefined || !dueAt || !!scheduleWarnings.length}><TranslatedText textKey="siteCopy.a40cb3cf86503bee" fallbackText={"Opslaan & toewijzen"} /></button>
        </div>
      </form>
    </dialog>}
    {photo && <YardQuickPhoto boat={photo} canApproveTopView={yard?.can_manage_photos} onChange={() => setRevision((value) => value + 1)} onClose={() => setPhoto(undefined)} />}
    {dailyPlan && <YardDailyPlan date={date && date !== 'week' ? date : yardDay(0)} refreshRevision={refreshRevision} onClose={() => setDailyPlan(false)} />}
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
      {!compact && boat.storage && <p className="text-xs text-green-300"><TranslatedText textKey="siteCopy.674530df2688b9f7" fallbackText={"Actieve stalling ·"} />{' '}{boat.storage.start_date?.slice(0, 10)} – {boat.storage.end_date?.slice(0, 10)}</p>}
    </div>
  </div>;
}
