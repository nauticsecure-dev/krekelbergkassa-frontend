'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  History,
  Image as ImageIcon,
  Package,
  PauseCircle,
  PlayCircle,
  Plus,
  QrCode,
  Receipt,
  Ship,
  Trash2,
  Upload,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminDetailGrid,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { LoadingState, ErrorState } from '@/components/admin/DataState';
import { workOrdersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

type Row = Record<string, unknown>;

const TYPE_LABELS: Record<string, string> = {
  pressure_washing: 'Hogedrukreiniging',
  crane_service: 'Kraanservice',
  winter_storage_preparation: 'Winterklaar maken',
  summer_storage_preparation: 'Zomerklaar maken',
  engine_maintenance: 'Motoronderhoud',
  electrical_work: 'Elektrawerk',
  painting: 'Schilderwerk',
  polishing: 'Polijsten',
  cleaning: 'Reiniging',
  battery_service: 'Accu service',
  inspection: 'Inspectie',
  transport: 'Transport',
  insurance_inspection: 'Verzekeringskeuring',
  supplier_workbon: 'Leverancier werkbon',
  custom: 'Overig',
};

const DOCUMENT_FOLDERS = ['reports', 'certificates', 'measurements', 'inspection_notes', 'other'];

const WAITING_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'waiting_for_customer', label: 'Wacht op klant' },
  { value: 'waiting_for_parts', label: 'Wacht op onderdelen' },
  { value: 'waiting_for_supplier_invoice', label: 'Wacht op lev. factuur' },
  { value: 'waiting_for_payment', label: 'Wacht op betaling' },
];

function workOrderTypeLabel(
  type: string | undefined | null,
  t: (key: string, vars?: Record<string, string | number>) => string,
  metaTypes?: Array<{ value: string; label: string }>
): string {
  if (!type) return '—';
  const fromMeta = metaTypes?.find((o) => o.value === type)?.label;
  if (fromMeta) return fromMeta;
  const key = `adminNew.workOrders.types.${type}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return TYPE_LABELS[type] ?? type;
}

const str = (row: Row | undefined, ...keys: string[]): string => {
  if (!row) return '';
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
  }
  return '';
};

const arr = (row: Row | undefined, key: string): Row[] => {
  const v = row?.[key];
  return Array.isArray(v) ? (v as Row[]) : [];
};

function statusTone(status: string): React.ComponentProps<typeof Badge>['tone'] {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('complete') || s === 'invoiced') return 'success';
  if (s.includes('progress') || s.includes('start')) return 'marine';
  if (s.includes('waiting')) return 'gold';
  if (s.includes('cancel')) return 'sand';
  return 'navy';
}

export default function WorkOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { locale, t } = useIntl();
  const { push, pushError } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [showAssign, setShowAssign] = React.useState(false);
  const [assignee, setAssignee] = React.useState('');
  const [showComplete, setShowComplete] = React.useState(false);
  const [completeNotes, setCompleteNotes] = React.useState('');
  const [completeHours, setCompleteHours] = React.useState('');
  const [showEdit, setShowEdit] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    type: '',
    priority: 'normal',
    due_date: '',
    description: '',
    estimated_hours: '',
  });
  const [showQr, setShowQr] = React.useState(false);
  const [qrData, setQrData] = React.useState<Row | null>(null);
  const [showWaiting, setShowWaiting] = React.useState(false);
  const [waitingStatus, setWaitingStatus] = React.useState('waiting_for_parts');
  const [timeForm, setTimeForm] = React.useState({ hours: '', rate: '', note: '' });
  const [materialForm, setMaterialForm] = React.useState({ description: '', quantity: '1', unit_price: '' });
  const [photoFolder, setPhotoFolder] = React.useState('before');
  const [docFolder, setDocFolder] = React.useState('other');
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);
  const docInputRef = React.useRef<HTMLInputElement | null>(null);
  const [activityTab, setActivityTab] = React.useState<'timeline' | 'audit'>('timeline');

  const data = useQuery([id], async () => {
    if (!id) throw new Error('Missing work order id');
    const [order, metadata] = await Promise.all([
      workOrdersService.get(id),
      workOrdersService.metadata().catch(() => null),
    ]);
    return { order, metadata };
  });
  const audit = useQuery([id, 'audit'], () =>
    id ? workOrdersService.auditLog(id, { per_page: 25 }).catch(() => null) : Promise.resolve(null)
  );
  const timeline = useQuery([id, 'timeline'], () =>
    id ? workOrdersService.timeline(id).catch(() => null) : Promise.resolve(null)
  );

  const assignM = useMutation(() => workOrdersService.assign(id, { assignee_id: assignee || null }));
  const startM = useMutation(() => workOrdersService.start(id));
  const completeM = useMutation(() =>
    workOrdersService.complete(id, {
      notes: completeNotes || undefined,
      hours: completeHours ? Number(completeHours) : undefined,
    })
  );
  const waitingM = useMutation(() => workOrdersService.waiting(id, { status: waitingStatus }));
  const editM = useMutation((payload: Record<string, unknown>) => workOrdersService.update(id, payload));
  const invoiceM = useMutation(() => workOrdersService.generateInvoice(id));
  const addTime = useMutation((payload: Record<string, unknown>) => workOrdersService.addTimeEntry(id, payload));
  const delTime = useMutation((entryId: string) => workOrdersService.deleteTimeEntry(id, entryId));
  const addMaterial = useMutation((payload: Record<string, unknown>) => workOrdersService.addMaterial(id, payload));
  const delMaterial = useMutation((materialId: string) => workOrdersService.deleteMaterial(id, materialId));
  const uploadPhoto = useMutation((fd: FormData) => workOrdersService.uploadPhoto(id, fd));
  const uploadDoc = useMutation((fd: FormData) => workOrdersService.uploadDocument(id, fd));
  const delPhoto = useMutation((fileId: string) => workOrdersService.deletePhoto(id, fileId));
  const delDoc = useMutation((fileId: string) => workOrdersService.deleteDocument(id, fileId));

  const refetchAll = async () => {
    await Promise.all([data.refetch(), audit.refetch(), timeline.refetch()]);
  };

  const onAddTime = async (e: React.FormEvent) => {
    e.preventDefault();
    await run(t('adminNew.workOrders.toasts.timeAdded'), async () => {
      await addTime.mutate({
        duration_minutes: timeForm.hours ? Math.round(Number(timeForm.hours) * 60) : undefined,
        hourly_rate: timeForm.rate ? Math.round(Number(timeForm.rate) * 100) : undefined,
        note: timeForm.note || undefined,
      });
      setTimeForm({ hours: '', rate: '', note: '' });
    });
  };

  const onAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    await run(t('adminNew.workOrders.toasts.materialAdded'), async () => {
      await addMaterial.mutate({
        description: materialForm.description,
        quantity: materialForm.quantity ? Number(materialForm.quantity) : 1,
        unit_price: materialForm.unit_price ? Math.round(Number(materialForm.unit_price) * 100) : 0,
      });
      setMaterialForm({ description: '', quantity: '1', unit_price: '' });
    });
  };

  const onUpload = async (kind: 'photo' | 'document', file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    if (kind === 'photo') fd.append('folder', photoFolder);
    if (kind === 'document') fd.append('folder', docFolder);
    await run(t('adminNew.workOrders.toasts.fileUploaded'), () =>
      kind === 'photo' ? uploadPhoto.mutate(fd) : uploadDoc.mutate(fd)
    );
  };

  const onOpenEdit = () => {
    if (!order) return;
    setEditForm({
      type: str(order, 'type'),
      priority: str(order, 'priority') || 'normal',
      due_date: str(order, 'due_date'),
      description: str(order, 'description'),
      estimated_hours: order.estimated_hours != null ? String(order.estimated_hours) : '',
    });
    setShowEdit(true);
  };

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await run(t('adminNew.common.saved'), async () => {
      await editM.mutate({
        type: editForm.type || undefined,
        priority: editForm.priority || undefined,
        due_date: editForm.due_date || undefined,
        description: editForm.description || undefined,
        estimated_hours: editForm.estimated_hours ? Number(editForm.estimated_hours) : undefined,
      });
      setShowEdit(false);
    });
  };

  const onQr = async () => {
    try {
      const res = await workOrdersService.qr(id);
      setQrData(res);
      setShowQr(true);
    } catch (err) {
      pushError(err, 'QR code ophalen mislukt');
    }
  };

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      push({ tone: 'success', title: label });
      await refetchAll();
    } catch (err) {
      pushError(err, t('adminNew.common.operationFailed'));
    }
  };

  const order = data.data?.order;
  const technicians = data.data?.metadata?.technicians ?? [];
  const types = data.data?.metadata?.types ?? [];
  const status = str(order, 'status') || 'new';
  const availableActions = (order?.available_actions ?? {}) as Record<string, boolean>;

  // Fix: use `files` array from API and split by file_type
  const allFiles = arr(order, 'files');
  const photos = allFiles.length > 0
    ? allFiles.filter((f) => String(f.file_type ?? '') === 'photo')
    : arr(order, 'photos');
  const documents = allFiles.length > 0
    ? allFiles.filter((f) => String(f.file_type ?? '') === 'document')
    : arr(order, 'documents');

  const timeEntries = arr(order, 'time_entries');
  const materials = arr(order, 'materials');
  const auditRows = (audit.data?.data ?? []) as unknown as Row[];
  const timelineData = timeline.data as { data?: Row[] } | Row[] | null | undefined;
  const timelineRows: Row[] = Array.isArray(timelineData)
    ? timelineData
    : (timelineData?.data ?? []);
  const boatId = str(order, 'boat_id');
  const assigneeName = str(order, 'assignee_name', 'technician_name');
  const totals = (order?.totals ?? {}) as Record<string, unknown>;
  const money = (cents: unknown) =>
    typeof cents === 'number' ? `€${(cents / 100).toFixed(2)}` : '€0.00';

  // Customer contact info
  const customer = (order?.customer ?? {}) as Record<string, unknown>;
  const customerName = str(customer, 'name') || str(order, 'customer_name');
  const customerPhone = str(customer, 'phone');
  const customerEmail = str(customer, 'email');

  const formatDate_ = (val: string) => formatDate(val, dateLocale);

  return (
    <>
      <AdminPageHeader
        title={`${t('adminNew.workOrders.title')} ${str(order, 'number') || id}`}
        subtitle={str(order, 'type') ? workOrderTypeLabel(str(order, 'type'), t, types) : t('adminNew.workOrders.subtitle')}
        rightSlot={
          order ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit className="h-4 w-4" />}
                onClick={onOpenEdit}
              >
                {t('adminNew.common.edit')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={() => {
                  setAssignee(str(order, 'assignee_id', 'technician_id'));
                  setShowAssign(true);
                }}
              >
                {t('adminNew.workOrders.detail.assign')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<PlayCircle className="h-4 w-4" />}
                disabled={startM.loading || statusTone(status) === 'marine'}
                onClick={() => void run(t('adminNew.workOrders.toasts.started'), startM.mutate)}
              >
                {t('adminNew.workOrders.detail.start')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<PauseCircle className="h-4 w-4" />}
                onClick={() => setShowWaiting(true)}
              >
                Wachten
              </Button>
              <Button
                variant="gold"
                size="sm"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => {
                  setCompleteNotes('');
                  setCompleteHours('');
                  setShowComplete(true);
                }}
              >
                {t('adminNew.workOrders.detail.complete')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<QrCode className="h-4 w-4" />}
                onClick={() => void onQr()}
              >
                QR
              </Button>
            </div>
          ) : null
        }
        stats={[
          {
            label: t('adminNew.workOrders.columns.status'),
            value: status,
            icon: Wrench,
            tone: statusTone(status) === 'success' ? 'success' : 'marine',
            loading: data.loading,
          },
          {
            label: t('adminNew.workOrders.columns.priority'),
            value: str(order, 'priority') || 'normal',
            icon: Wrench,
            tone: 'gold',
            loading: data.loading,
          },
          {
            label: t('adminNew.workOrders.columns.due'),
            value: str(order, 'due_date') ? formatDate_(str(order, 'due_date')) : '—',
            tone: 'navy',
            loading: data.loading,
          },
          {
            label: t('adminNew.workOrders.detail.assignee'),
            value: assigneeName || t('adminNew.workOrders.detail.unassigned'),
            icon: UserPlus,
            tone: 'marine',
            loading: data.loading,
          },
        ]}
      />

      <AdminContent>
        {data.loading ? (
          <LoadingState label={t('adminNew.common.loading')} variant="detail" />
        ) : null}
        {!data.loading && data.error ? (
          <ErrorState message={data.error} onRetry={() => void data.refetch()} />
        ) : null}

        {!data.loading && order ? (
          <>
            <div className="bento-grid lg:grid-cols-3">
              <AdminSectionCard
                className="lg:col-span-2"
                title={t('adminNew.workOrders.detail.overview')}
                icon={Wrench}
                action={<Badge tone={statusTone(status)}>{status}</Badge>}
              >
                <div className="space-y-5">
                  <AdminDetailGrid
                    items={[
                      { label: t('adminNew.workOrders.columns.type'), value: workOrderTypeLabel(str(order, 'type'), t, types) },
                      { label: t('adminNew.workOrders.columns.priority'), value: str(order, 'priority') || 'normal' },
                      {
                        label: t('adminNew.workOrders.columns.due'),
                        value: str(order, 'due_date') ? formatDate_(str(order, 'due_date')) : '—',
                      },
                      {
                        label: t('adminNew.workOrders.detail.created'),
                        value: str(order, 'created_at') ? formatDate_(str(order, 'created_at')) : '—',
                      },
                      ...(order.estimated_hours != null ? [{ label: t('adminNew.workOrders.detail.estimatedHours'), value: `${Number(order.estimated_hours).toFixed(2)}u` }] : []),
                    ]}
                  />
                  {str(order, 'description', 'notes') ? (
                    <div className="rounded-xl border border-navy-100/70 bg-sand-50/40 p-4 text-sm text-navy-700">
                      {str(order, 'description', 'notes')}
                    </div>
                  ) : null}
                </div>
              </AdminSectionCard>

              <div className="flex flex-col gap-4">
                <AdminSectionCard title={t('adminNew.workOrders.detail.boat')} icon={Ship}>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-semibold text-navy-900">
                        {str(order, 'boat_name') ||
                          (order.boat as { name?: string } | undefined)?.name ||
                          '—'}
                      </div>
                      {boatId ? (
                        <Link
                          href={`/${locale}/admin/boten/${boatId}`}
                          className="mt-1 inline-flex text-sm font-semibold text-marine-700 hover:text-marine-900"
                        >
                          {t('adminNew.boats.title')} →
                        </Link>
                      ) : null}
                    </div>
                    {customerName ? (
                      <div className="rounded-lg border border-navy-100/70 bg-sand-50/40 p-3 text-xs">
                        <div className="font-semibold text-navy-800">{customerName}</div>
                        {customerPhone ? <div className="mt-0.5 text-navy-500">{customerPhone}</div> : null}
                        {customerEmail ? <div className="mt-0.5 text-navy-500">{customerEmail}</div> : null}
                      </div>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      leftIcon={<Receipt className="h-4 w-4" />}
                      disabled={invoiceM.loading || !availableActions.generate_invoice}
                      onClick={() =>
                        void run(t('adminNew.workOrders.toasts.invoiceCreated'), async () => {
                          const inv = await invoiceM.mutate();
                          if (inv?.id) window.location.href = `/${locale}/admin/facturen/${inv.id}`;
                        })
                      }
                    >
                      {t('adminNew.workOrders.detail.generateInvoice')}
                    </Button>
                    {!availableActions.generate_invoice ? (
                      <p className="text-xs text-navy-400">
                        {order.invoice_id ? 'Factuur al aangemaakt.' : 'Zet opdracht eerst op Afgerond.'}
                      </p>
                    ) : null}
                  </div>
                </AdminSectionCard>
              </div>
            </div>

            {/* Time tracking + materials */}
            <div className="bento-grid lg:grid-cols-2">
              <AdminSectionCard
                title={t('adminNew.workOrders.detail.timeTracking')}
                icon={Clock}
                action={
                  totals.labor_hours != null ? (
                    <Badge tone="marine">
                      {`${Number(totals.labor_hours).toFixed(2)} ${t('adminNew.workOrders.detail.hours')} · ${money(totals.labor_cents)}`}
                    </Badge>
                  ) : null
                }
              >
                {timeEntries.length ? (
                  <ul className="mb-3 divide-y divide-navy-100 rounded-xl border border-navy-100/70 text-sm">
                    {timeEntries.map((te, i) => {
                      const userName = (te.user as { name?: string } | undefined)?.name ?? str(te, 'user_name') ?? `#${i + 1}`;
                      const hours = te.minutes != null
                        ? `${(Number(te.minutes) / 60).toFixed(2)}h`
                        : te.duration_minutes != null
                        ? `${(Number(te.duration_minutes) / 60).toFixed(2)}h`
                        : '';
                      return (
                        <li key={str(te, 'id') || i} className="flex items-center justify-between px-3 py-2">
                          <span className="text-navy-700">
                            {userName}
                            {hours ? ` · ${hours}` : ''}
                            {str(te, 'note') ? ` — ${str(te, 'note')}` : ''}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-semibold text-navy-900">{money(te.line_total)}</span>
                            <button
                              type="button"
                              className="text-navy-300 hover:text-rose-600"
                              onClick={() => void run(t('adminNew.common.deleted'), () => delTime.mutate(str(te, 'id')))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mb-3 text-sm text-navy-500">{t('adminNew.workOrders.detail.noTime')}</p>
                )}
                <form onSubmit={onAddTime} className="grid grid-cols-3 gap-2">
                  <input
                    className="input-base"
                    placeholder={t('adminNew.workOrders.detail.hours')}
                    inputMode="decimal"
                    value={timeForm.hours}
                    onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
                  />
                  <input
                    className="input-base"
                    placeholder={t('adminNew.workOrders.detail.rate')}
                    inputMode="decimal"
                    value={timeForm.rate}
                    onChange={(e) => setTimeForm({ ...timeForm, rate: e.target.value })}
                  />
                  <Button type="submit" size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} disabled={addTime.loading}>
                    {t('adminNew.common.add')}
                  </Button>
                  <input
                    className="input-base col-span-3"
                    placeholder={t('adminNew.workOrders.detail.timeNote')}
                    value={timeForm.note}
                    onChange={(e) => setTimeForm({ ...timeForm, note: e.target.value })}
                  />
                </form>
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.workOrders.detail.materials')}
                icon={Package}
                action={
                  totals.materials_cents != null ? <Badge tone="gold">{money(totals.materials_cents)}</Badge> : null
                }
              >
                {materials.length ? (
                  <ul className="mb-3 divide-y divide-navy-100 rounded-xl border border-navy-100/70 text-sm">
                    {materials.map((m, i) => (
                      <li key={str(m, 'id') || i} className="flex items-center justify-between px-3 py-2">
                        <span className="text-navy-700">
                          {str(m, 'description')} × {str(m, 'quantity')}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-navy-900">{money(m.line_total)}</span>
                          <button
                            type="button"
                            className="text-navy-300 hover:text-rose-600"
                            onClick={() => void run(t('adminNew.common.deleted'), () => delMaterial.mutate(str(m, 'id')))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-3 text-sm text-navy-500">{t('adminNew.workOrders.detail.noMaterials')}</p>
                )}
                <form onSubmit={onAddMaterial} className="grid grid-cols-4 gap-2">
                  <input
                    className="input-base col-span-2"
                    placeholder={t('adminNew.workOrders.detail.materialDesc')}
                    value={materialForm.description}
                    onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                    required
                  />
                  <input
                    className="input-base"
                    placeholder={t('adminNew.workOrders.detail.qty')}
                    inputMode="decimal"
                    value={materialForm.quantity}
                    onChange={(e) => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                  />
                  <input
                    className="input-base"
                    placeholder={t('adminNew.workOrders.detail.unitPrice')}
                    inputMode="decimal"
                    value={materialForm.unit_price}
                    onChange={(e) => setMaterialForm({ ...materialForm, unit_price: e.target.value })}
                  />
                  <Button type="submit" size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} disabled={addMaterial.loading} className="col-span-4">
                    {t('adminNew.common.add')}
                  </Button>
                </form>
              </AdminSectionCard>
            </div>

            {/* Photos + Documents */}
            <div className="bento-grid lg:grid-cols-2">
              <AdminSectionCard
                title={t('adminNew.workOrders.detail.photos')}
                icon={ImageIcon}
                action={
                  <div className="flex items-center gap-2">
                    <select
                      className="input-base h-8 py-0 text-xs"
                      value={photoFolder}
                      onChange={(e) => setPhotoFolder(e.target.value)}
                    >
                      {['before', 'during', 'after', 'damage', 'inspection'].map((f) => (
                        <option key={f} value={f}>
                          {t(`adminNew.workOrders.photoFolders.${f}`)}
                        </option>
                      ))}
                    </select>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void onUpload('photo', e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Upload className="h-3.5 w-3.5" />}
                      disabled={uploadPhoto.loading}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      {t('adminNew.common.add')}
                    </Button>
                  </div>
                }
              >
                {photos.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p, i) => {
                      const url = str(p, 'url', 'path', 'signed_url');
                      const fileId = str(p, 'file_id', 'id');
                      return (
                        <div key={fileId || i} className="group relative aspect-square overflow-hidden rounded-lg border border-navy-100 bg-sand-50">
                          <a href={url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </a>
                          {fileId ? (
                            <button
                              type="button"
                              className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-rose-600 opacity-0 transition group-hover:opacity-100"
                              onClick={() => void run(t('adminNew.common.deleted'), () => delPhoto.mutate(fileId))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-6 text-sm text-navy-500">{t('adminNew.workOrders.detail.noPhotos')}</p>
                )}
              </AdminSectionCard>

              <AdminSectionCard
                title={t('adminNew.workOrders.detail.documents')}
                icon={FileText}
                action={
                  <>
                    <div className="flex items-center gap-2">
                      <select
                        className="input-base h-8 py-0 text-xs"
                        value={docFolder}
                        onChange={(e) => setDocFolder(e.target.value)}
                      >
                        {DOCUMENT_FOLDERS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                      <input
                        ref={docInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          void onUpload('document', e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Upload className="h-3.5 w-3.5" />}
                        disabled={uploadDoc.loading}
                        onClick={() => docInputRef.current?.click()}
                      >
                        {t('adminNew.common.add')}
                      </Button>
                    </div>
                  </>
                }
              >
                {documents.length ? (
                  <ul className="divide-y divide-navy-100 rounded-xl border border-navy-100/70">
                    {documents.map((d, i) => {
                      const fileId = str(d, 'file_id', 'id');
                      return (
                        <li key={fileId || i} className="flex items-center justify-between px-4 py-3 text-sm">
                          <div>
                            <span className="text-navy-800">{str(d, 'name', 'filename') || `#${i + 1}`}</span>
                            {str(d, 'folder') ? <span className="ml-2 text-xs text-navy-400">[{str(d, 'folder')}]</span> : null}
                          </div>
                          <span className="flex items-center gap-3">
                            <a
                              href={str(d, 'url', 'path', 'signed_url')}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-marine-700 hover:text-marine-900"
                            >
                              {t('adminNew.invoiceDetail.actions.openPdf')}
                            </a>
                            {fileId ? (
                              <button
                                type="button"
                                className="text-navy-300 hover:text-rose-600"
                                onClick={() => void run(t('adminNew.common.deleted'), () => delDoc.mutate(fileId))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="py-6 text-sm text-navy-500">{t('adminNew.workOrders.detail.noDocuments')}</p>
                )}
              </AdminSectionCard>
            </div>

            {/* Activity panel */}
            <AdminSectionCard
              title={t('adminNew.workOrders.detail.activity')}
              icon={History}
              action={
                <div className="inline-flex rounded-lg border border-navy-100 bg-sand-50/60 p-0.5 text-xs font-semibold">
                  {(['timeline', 'audit'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActivityTab(tab)}
                      className={
                        activityTab === tab
                          ? 'rounded-md bg-white px-3 py-1.5 text-navy-900 shadow-sm'
                          : 'rounded-md px-3 py-1.5 text-navy-500 hover:text-navy-800'
                      }
                    >
                      {t(`adminNew.workOrders.detail.${tab === 'timeline' ? 'tabTimeline' : 'tabAudit'}`)}
                    </button>
                  ))}
                </div>
              }
            >
              {activityTab === 'timeline' ? (
                timeline.loading ? (
                  <p className="py-4 text-sm text-navy-500">{t('adminNew.common.loading')}</p>
                ) : timelineRows.length ? (
                  <ol className="space-y-2">
                    {timelineRows.map((a, i) => (
                      <li key={str(a, 'id') || i} className="flex items-start gap-3 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marine-400" />
                        <div>
                          <div className="text-navy-800">
                            {str(a, 'title', 'action', 'description', 'event') || '—'}
                          </div>
                          {str(a, 'description') && str(a, 'description') !== str(a, 'title') ? (
                            <div className="text-xs text-navy-500">{str(a, 'description')}</div>
                          ) : null}
                          <div className="text-xs text-navy-400">
                            {(a.user as { name?: string } | undefined)?.name ?? str(a, 'user_name') ?? ''}
                            {str(a, 'created_at', 'occurred_at')
                              ? ` · ${formatDate_(str(a, 'created_at', 'occurred_at'))}`
                              : ''}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="py-4 text-sm text-navy-500">{t('adminNew.workOrders.detail.noActivity')}</p>
                )
              ) : audit.loading ? (
                <p className="py-4 text-sm text-navy-500">{t('adminNew.common.loading')}</p>
              ) : auditRows.length ? (
                <ol className="space-y-2">
                  {auditRows.map((a, i) => {
                    const before = (a.before_data ?? null) as Record<string, unknown> | null;
                    const after = (a.after_data ?? null) as Record<string, unknown> | null;
                    const changedKeys = Array.from(
                      new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
                    ).filter((k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]));
                    const fmt = (v: unknown) =>
                      v == null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
                    return (
                      <li key={str(a, 'id') || i} className="flex items-start gap-3 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marine-400" />
                        <div className="min-w-0 flex-1">
                          <div className="text-navy-800">{str(a, 'action') || '—'}</div>
                          <div className="text-xs text-navy-400">
                            {(a.user as { name?: string } | undefined)?.name ?? ''}
                            {str(a, 'created_at') ? ` · ${formatDate_(str(a, 'created_at'))}` : ''}
                          </div>
                          {changedKeys.length ? (
                            <details className="mt-1.5 rounded-lg border border-navy-100/70 bg-sand-50/40">
                              <summary className="cursor-pointer select-none px-3 py-1.5 text-xs font-semibold text-marine-700">
                                {t('adminNew.workOrders.detail.changes', { count: changedKeys.length })}
                              </summary>
                              <div className="divide-y divide-navy-100/70 px-3 pb-2 text-xs">
                                {changedKeys.map((k) => (
                                  <div key={k} className="flex flex-wrap items-baseline gap-x-2 py-1.5">
                                    <span className="font-semibold text-navy-700">{k}</span>
                                    <span className="text-rose-600 line-through">{fmt(before?.[k])}</span>
                                    <span className="text-navy-300">→</span>
                                    <span className="text-emerald-700">{fmt(after?.[k])}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="py-4 text-sm text-navy-500">{t('adminNew.workOrders.detail.noActivity')}</p>
              )}
            </AdminSectionCard>

            <Link
              href={`/${locale}/admin/werkorders`}
              className="inline-flex text-sm font-semibold text-marine-700 hover:text-marine-800"
            >
              {t('adminNew.workOrders.detail.back')}
            </Link>
          </>
        ) : null}
      </AdminContent>

      {/* Assign modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(t('adminNew.workOrders.toasts.assigned'), async () => {
              await assignM.mutate();
              setShowAssign(false);
            });
          }}
        >
          <AdminModalHeader
            title={t('adminNew.workOrders.detail.assign')}
            subtitle={t('adminNew.workOrders.detail.assignSubtitle')}
          />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.workOrders.detail.assignee')}
              </label>
              <select
                className="input-base w-full"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">{t('adminNew.workOrders.detail.unassigned')}</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowAssign(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={assignM.loading}>
              {t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* Complete modal */}
      <Modal open={showComplete} onClose={() => setShowComplete(false)} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(t('adminNew.workOrders.toasts.completed'), async () => {
              await completeM.mutate();
              setShowComplete(false);
            });
          }}
        >
          <AdminModalHeader
            title={t('adminNew.workOrders.detail.complete')}
            subtitle={t('adminNew.workOrders.detail.completeSubtitle')}
          />
          <AdminModalBody>
            <Input
              label={t('adminNew.workOrders.detail.hours')}
              type="number"
              inputMode="decimal"
              value={completeHours}
              onChange={(e) => setCompleteHours(e.target.value)}
              placeholder="0.00"
            />
            <textarea
              className="input-base mt-3 min-h-20 w-full"
              placeholder={t('adminNew.workOrders.detail.completionNote')}
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
            />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowComplete(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={completeM.loading}>
              {t('adminNew.workOrders.detail.complete')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} size="md">
        <form onSubmit={(e) => void onSaveEdit(e)}>
          <AdminModalHeader title={t('adminNew.common.edit')} subtitle={str(order, 'number') || ''} />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.workOrders.columns.type')}</label>
              <select className="input-base w-full" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                {(types.length ? types : Object.keys(TYPE_LABELS).map((v) => ({ value: v, label: TYPE_LABELS[v] }))).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.workOrders.columns.priority')}</label>
              <select className="input-base w-full" value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                {['low', 'normal', 'high', 'urgent', 'emergency'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={t('adminNew.workOrders.columns.due')}
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
              />
              <Input
                label={t('adminNew.workOrders.detail.estimatedHours')}
                type="number"
                value={editForm.estimated_hours}
                onChange={(e) => setEditForm({ ...editForm, estimated_hours: e.target.value })}
              />
            </div>
            <textarea
              className="input-base min-h-24 w-full"
              placeholder={t('adminNew.workOrders.description')}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowEdit(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={editM.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* Waiting modal */}
      <Modal open={showWaiting} onClose={() => setShowWaiting(false)} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run('Status bijgewerkt', async () => {
              await waitingM.mutate();
              setShowWaiting(false);
            });
          }}
        >
          <AdminModalHeader title="Wachtstatus instellen" subtitle="Selecteer de reden van wachten" />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Status</label>
              <select
                className="input-base w-full"
                value={waitingStatus}
                onChange={(e) => setWaitingStatus(e.target.value)}
              >
                {WAITING_STATUSES.map((ws) => (
                  <option key={ws.value} value={ws.value}>{ws.label}</option>
                ))}
              </select>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowWaiting(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={waitingM.loading}>Instellen</Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* QR code modal */}
      <Modal open={showQr} onClose={() => setShowQr(false)} size="sm">
        <AdminModalHeader title="QR-code" subtitle={str(qrData ?? {}, 'number', 'label')} />
        <AdminModalBody>
          {qrData?.qr_url ? (
            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={String(qrData.qr_url)}
                alt="QR code"
                className="h-48 w-48 rounded-lg border border-navy-100"
              />
              <p className="text-sm text-navy-600">{str(qrData ?? {}, 'label')}</p>
              <p className="font-mono text-xs text-navy-400">{str(qrData ?? {}, 'payload')}</p>
            </div>
          ) : (
            <p className="py-4 text-sm text-navy-500">QR code niet beschikbaar.</p>
          )}
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="ghost" onClick={() => setShowQr(false)}>{t('adminNew.common.cancel')}</Button>
          {qrData?.qr_url ? (
            <a
              href={String(qrData.qr_url)}
              download={`WO-${str(qrData ?? {}, 'number')}-qr.png`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg bg-marine-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marine-800"
            >
              Downloaden
            </a>
          ) : null}
        </AdminModalFooter>
      </Modal>
    </>
  );
}
