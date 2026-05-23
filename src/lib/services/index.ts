import { api } from '@/lib/api';
import type {
  AppSettings,
  AuditLog,
  Boat,
  Customer,
  Invoice,
  InvoiceLine,
  PaginatedResponse,
  Payment,
  PortalBoat,
  PortalContract,
  PortalInvoice,
  PortalMe,
  PricingRule,
  Product,
  Reminder,
  Sale,
  SessionUser,
  StallingContract,
  SyncDevice,
  SyncStatus,
} from '@/lib/api-types';
import { asArray, asPaginated, maybeResource } from './utils';

export interface LoginResponse {
  user: SessionUser;
  token?: string;
  session?: {
    device_id: string;
    expires_at: string;
  };
}

export const authService = {
  login(email: string, password: string) {
    return api<LoginResponse>('/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
  },
  async me() {
    const res = await api<{ user: SessionUser }>('/v1/auth/me');
    return res.user;
  },
  logout() {
    return api<{ message: string }>('/v1/auth/logout', { method: 'POST' });
  },
  requestMagicLink(email: string, locale?: string) {
    return api<{ success: boolean; message: string }>(
      '/v1/auth/customer/magic-link',
      {
        method: 'POST',
        auth: false,
        body: { email, locale },
      }
    );
  },
  verifyMagicLink(token: string) {
    return api<{
      success: boolean;
      portal_token: string;
      expires_in: string;
      customer: {
        id: string;
        name: string;
        email: string;
        preferred_locale: string;
      };
    }>('/v1/auth/customer/verify-magic-link', {
      method: 'POST',
      auth: false,
      body: { token },
    });
  },
};

export const customersService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/customers', { query });
    return asPaginated<Customer>(res);
  },
  get(id: string) {
    return api<Customer>(`/v1/customers/${id}`);
  },
  create(payload: {
    name: string;
    email?: string | null;
    billing_email?: string | null;
    phone?: string | null;
    company_name?: string | null;
    is_business?: boolean;
    preferred_locale?: string | null;
    vat_number?: string | null;
    notes?: string | null;
  }) {
    return api<Customer>('/v1/customers', { method: 'POST', body: payload, queueWhenOffline: true });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<Customer>(`/v1/customers/${id}`, { method: 'PATCH', body: payload, queueWhenOffline: true });
  },
  remove(id: string) {
    return api<{ message: string }>(`/v1/customers/${id}`, { method: 'DELETE', queueWhenOffline: true });
  },
};

export const boatsService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/boats', { query });
    return asPaginated<Boat>(res);
  },
  get(id: string) {
    return api<Boat>(`/v1/boats/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api<Boat>('/v1/boats', { method: 'POST', body: payload, queueWhenOffline: true });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<Boat>(`/v1/boats/${id}`, { method: 'PATCH', body: payload, queueWhenOffline: true });
  },
  remove(id: string) {
    return api<{ message: string }>(`/v1/boats/${id}`, { method: 'DELETE', queueWhenOffline: true });
  },
};

export const stallingService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/stalling', { query });
    return asPaginated<StallingContract>(res);
  },
  get(id: string) {
    return api<StallingContract>(`/v1/stalling/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api<StallingContract>('/v1/stalling', { method: 'POST', body: payload, queueWhenOffline: true });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<StallingContract>(`/v1/stalling/${id}`, { method: 'PATCH', body: payload, queueWhenOffline: true });
  },
  remove(id: string) {
    return api<{ message: string }>(`/v1/stalling/${id}`, { method: 'DELETE', queueWhenOffline: true });
  },
  cancel(id: string, reason?: string) {
    return api<StallingContract>(`/v1/stalling/${id}/cancel`, {
      method: 'POST',
      body: { reason },
      queueWhenOffline: true,
    });
  },
  extend(id: string, payload: { end_date: string; paid_until?: string | null }) {
    return api<StallingContract>(`/v1/stalling/${id}/extend`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  generateInvoice(id: string) {
    return api<Invoice>(`/v1/stalling/${id}/generate-invoice`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
};

export const invoicesService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/invoices', { query });
    return asPaginated<Invoice>(res);
  },
  get(id: string) {
    return api<Invoice>(`/v1/invoices/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api<Invoice>('/v1/invoices', { method: 'POST', body: payload, queueWhenOffline: true });
  },
  send(id: string) {
    return api<Invoice>(`/v1/invoices/${id}/send`, { method: 'POST', queueWhenOffline: true });
  },
  markPaid(id: string, payload: { method: string; reason?: string; paid_at?: string }) {
    return api<Invoice>(`/v1/invoices/${id}/mark-paid`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  createPayment(id: string, payload: { method: string; redirect_url?: string; locale?: string }) {
    return api<{ payment: Payment; checkout_url?: string; url?: string }>(
      `/v1/invoices/${id}/create-payment`,
      {
        method: 'POST',
        body: payload,
        queueWhenOffline: true,
      }
    );
  },
  credit(id: string) {
    return api<Invoice>(`/v1/invoices/${id}/credit`, { method: 'POST', queueWhenOffline: true });
  },
  cancel(id: string) {
    return api<Invoice>(`/v1/invoices/${id}/cancel`, { method: 'POST', queueWhenOffline: true });
  },
  addLine(id: string, payload: Record<string, unknown>) {
    return api<InvoiceLine>(`/v1/invoices/${id}/lines`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  deleteLine(id: string, lineId: string) {
    return api<{ message: string }>(`/v1/invoices/${id}/lines/${lineId}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  addPayment(id: string, payload: Record<string, unknown>) {
    return api<Payment>(`/v1/invoices/${id}/payments`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  async reminders(id: string) {
    const res = await api<unknown>(`/v1/invoices/${id}/reminders`);
    return asArray<Reminder>(res);
  },
  sendReminder(id: string, payload: { channel?: string; locale?: string; subject?: string; body?: string }) {
    return api<Reminder>(`/v1/invoices/${id}/reminders`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  getPdf(id: string) {
    return api<string>(`/v1/invoices/${id}/pdf`);
  },
  getPdfDownload(id: string) {
    return api<Blob>(`/v1/invoices/${id}/pdf/download`);
  },
  generatePdf(id: string, force = false) {
    return api<unknown>(`/v1/invoices/${id}/generate-pdf`, {
      method: 'POST',
      body: { force },
      queueWhenOffline: true,
    });
  },
};

export const paymentsService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/payments', { query });
    return asPaginated<Payment>(res);
  },
  methods() {
    return api<{ methods: string[] } | string[] | Record<string, unknown>>('/v1/payments/methods');
  },
  get(id: string) {
    return api<Payment>(`/v1/payments/${id}`);
  },
  status(id: string) {
    return api<Record<string, unknown>>(`/v1/payments/${id}/status`);
  },
  reconcile(id: string, payload?: Record<string, unknown>) {
    return api<Payment>(`/v1/payments/${id}/reconcile`, {
      method: 'POST',
      body: payload ?? {},
      queueWhenOffline: true,
    });
  },
};

export const kassaService = {
  checkout(payload: {
    idempotency_key?: string;
    device_id: string;
    customer_id?: string | null;
    payment_method: string;
    locale?: string;
    redirect_url?: string;
    items: Array<{ product_id?: string; description?: string; quantity: number; unit_price_cents?: number; price_cents?: number; vat_rate?: number }>;
  }) {
    return api<string | { sale_id?: string; invoice_id?: string; checkout_url?: string; message?: string }>('/v1/kassa/checkout', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  quote(payload: { customer_id?: string; locale?: string; items: Array<Record<string, unknown>> }) {
    return api<Record<string, unknown>>('/v1/kassa/quote', {
      method: 'POST',
      body: payload,
    });
  },
  async recentSales(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/kassa/recent-sales', { query });
    return asArray<Sale>(res);
  },
  sale(id: string) {
    return api<Sale>(`/v1/kassa/sales/${id}`);
  },
  refund(id: string, payload: { amount?: number; reason?: string }) {
    return api<unknown>(`/v1/kassa/sales/${id}/refund`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
};

export const pricingService = {
  calculate(payload: {
    length_cm: number;
    services: string[];
    contract_type?: string;
    customer_id?: string | null;
    locale?: string;
    channel?: string;
  }) {
    return api<Record<string, unknown>>('/v1/pricing/calculate', {
      method: 'POST',
      body: payload,
    });
  },
  preview(payload: Record<string, unknown>) {
    return api<Record<string, unknown>>('/v1/pricing/preview', {
      method: 'POST',
      body: payload,
    });
  },
  async rules(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/pricing/rules', { query });
    return asPaginated<PricingRule>(res);
  },
  rule(id: string) {
    return api<PricingRule>(`/v1/pricing/rules/${id}`);
  },
  createRule(payload: Record<string, unknown>) {
    return api<PricingRule>('/v1/pricing/rules', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  updateRule(id: string, payload: Record<string, unknown>) {
    return api<PricingRule>(`/v1/pricing/rules/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  deleteRule(id: string) {
    return api<{ message: string }>(`/v1/pricing/rules/${id}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
};

export const productsService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/products', { query });
    return asPaginated<Product>(res);
  },
  get(id: string) {
    return api<Product>(`/v1/products/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api<Product>('/v1/products', { method: 'POST', body: payload, queueWhenOffline: true });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<Product>(`/v1/products/${id}`, { method: 'PATCH', body: payload, queueWhenOffline: true });
  },
  remove(id: string) {
    return api<{ message: string }>(`/v1/products/${id}`, { method: 'DELETE', queueWhenOffline: true });
  },
};

export const filesService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/files', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  upload(formData: FormData) {
    return api<Record<string, unknown>>('/v1/files/upload', {
      method: 'POST',
      body: formData,
      queueWhenOffline: true,
    });
  },
  get(id: string) {
    return api<Record<string, unknown>>(`/v1/files/${id}`);
  },
  remove(id: string) {
    return api<{ message: string }>(`/v1/files/${id}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
};

export const i18nService = {
  locales() {
    return api<Record<string, unknown>>('/v1/i18n/locales');
  },
  messages(locale: string) {
    return api<Record<string, unknown>>('/v1/i18n/messages', { query: { locale } });
  },
  namespace(locale: string, namespace: string) {
    return api<Record<string, unknown>>(`/v1/i18n/messages/${namespace}`, {
      query: { locale },
    });
  },
  updateNamespace(namespace: string, payload: { locale: string; messages: Record<string, string> }) {
    return api<Record<string, unknown>>(`/v1/i18n/messages/${namespace}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  clearCache() {
    return api<{ success?: boolean; message?: string }>('/v1/i18n/cache/clear', {
      method: 'POST',
    });
  },
};

export const settingsService = {
  get() {
    return api<AppSettings>('/v1/admin/settings');
  },
  bulkUpdate(settings: Array<{ key: string; value: unknown }>) {
    return api<{ message: string; settings: AppSettings }>('/v1/admin/settings', {
      method: 'PUT',
      body: { settings },
      queueWhenOffline: true,
    });
  },
  company() {
    return api<AppSettings['company']>('/v1/admin/settings/company');
  },
  updateCompany(payload: Partial<AppSettings['company']>) {
    return api<AppSettings['company']>('/v1/admin/settings/company', {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  invoicing() {
    return api<AppSettings['invoicing']>('/v1/admin/settings/invoicing');
  },
  updateInvoicing(payload: Partial<AppSettings['invoicing']>) {
    return api<AppSettings['invoicing']>('/v1/admin/settings/invoicing', {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  payments() {
    return api<AppSettings['payments']>('/v1/admin/settings/payments');
  },
  updatePayments(payload: Partial<AppSettings['payments']>) {
    return api<AppSettings['payments']>('/v1/admin/settings/payments', {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  testMollie() {
    return api<Record<string, unknown>>('/v1/admin/settings/payments/test-mollie', {
      method: 'POST',
    });
  },
  locales() {
    return api<AppSettings['locales']>('/v1/admin/settings/locales');
  },
  updateLocales(payload: Partial<AppSettings['locales']>) {
    return api<AppSettings['locales']>('/v1/admin/settings/locales', {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  key(key: string) {
    return api<Record<string, unknown>>(`/v1/admin/settings/key/${encodeURIComponent(key)}`);
  },
  deleteKey(key: string) {
    return api<{ message: string }>(`/v1/admin/settings/key/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
};

export const syncService = {
  push(device_id: string, changes: Array<Record<string, unknown>>, last_sync_at?: string | null) {
    return api<Record<string, unknown>>('/v1/sync', {
      method: 'POST',
      body: { device_id, changes, last_sync_at },
    });
  },
  status() {
    return api<SyncStatus>('/v1/sync/status');
  },
  registerDevice(payload: { device_id: string; device_name?: string; device_type?: string }) {
    return api<string>('/v1/sync/devices/register', {
      method: 'POST',
      body: payload,
    });
  },
  async devices() {
    const res = await api<unknown>('/v1/sync/devices');
    return asArray<SyncDevice>(res);
  },
  async adminDevices(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/devices', { query });
    return asPaginated<SyncDevice>(res);
  },
  adminDevice(id: string) {
    return api<SyncDevice>(`/v1/admin/devices/${id}`);
  },
  revokeDevice(id: string, reason?: string) {
    return api<SyncDevice>(`/v1/admin/devices/${id}/revoke`, {
      method: 'POST',
      body: { reason },
      queueWhenOffline: true,
    });
  },
  revokeAll(user_id: string, reason?: string) {
    return api<{ message: string }>('/v1/admin/devices/revoke-all', {
      method: 'POST',
      body: { user_id, reason },
      queueWhenOffline: true,
    });
  },
  async syncLog(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/sync-log', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  async conflicts() {
    const res = await api<unknown>('/v1/admin/sync-log/conflicts');
    return asArray<Record<string, unknown>>(res);
  },
};

export const auditService = {
  async logs(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/audit-logs', { query });
    return asPaginated<AuditLog>(res);
  },
  get(id: string) {
    return api<AuditLog>(`/v1/admin/audit-logs/${id}`);
  },
  async byEntity(type: string, id: string) {
    const res = await api<unknown>(`/v1/admin/audit-logs/entity/${type}/${id}`);
    return asArray<AuditLog>(res);
  },
};

export const adminService = {
  async reminders(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/reminders', { query });
    return asPaginated<Reminder>(res);
  },
  sendBulkReminders() {
    return api<{ message: string; count?: number }>('/v1/admin/reminders/send-bulk', {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  async portalSessions(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/portal-sessions', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  expirePortalSession(id: string) {
    return api<Record<string, unknown>>(`/v1/admin/portal-sessions/${id}/expire`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  expireAllPortalSessions(customer_id: string) {
    return api<{ message: string }>('/v1/admin/portal-sessions/expire-all', {
      method: 'POST',
      body: { customer_id },
      queueWhenOffline: true,
    });
  },
  timelineMessage(payload: { customer_id: string; title: string; body: string; type?: string }) {
    return api<Record<string, unknown>>('/v1/admin/timeline/message', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  runReminderTimeline() {
    return api<Record<string, unknown>>('/v1/admin/timeline/run-reminders', {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
};

export const portalService = {
  me() {
    return api<PortalMe>('/v1/portal/me', { portalAuth: true, auth: false });
  },
  async invoices(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/portal/invoices', {
      query,
      portalAuth: true,
      auth: false,
    });
    return asPaginated<PortalInvoice>(res);
  },
  invoice(id: string) {
    return api<PortalInvoice>(`/v1/portal/invoices/${id}`, {
      portalAuth: true,
      auth: false,
    });
  },
  payInvoice(id: string, payload: { method?: string; redirect_url?: string }) {
    return api<{ checkout_url?: string; payment_url?: string; url?: string }>(
      `/v1/portal/invoices/${id}/pay`,
      {
        method: 'POST',
        body: payload,
        portalAuth: true,
        auth: false,
      }
    );
  },
  async contracts() {
    const res = await api<unknown>('/v1/portal/contracts', {
      portalAuth: true,
      auth: false,
    });
    return asArray<PortalContract>(res);
  },
  async boats() {
    const res = await api<unknown>('/v1/portal/boats', {
      portalAuth: true,
      auth: false,
    });
    return asArray<PortalBoat>(res);
  },
  async timeline() {
    const res = await api<unknown>('/v1/portal/timeline', {
      portalAuth: true,
      auth: false,
    });
    return asPaginated<Record<string, unknown>>(res);
  },
  async notifications() {
    const res = await api<unknown>('/v1/portal/notifications', {
      portalAuth: true,
      auth: false,
    });
    return asPaginated<Record<string, unknown>>(res);
  },
  markAllRead() {
    return api<Record<string, unknown>>('/v1/portal/timeline/read-all', {
      method: 'POST',
      portalAuth: true,
      auth: false,
      queueWhenOffline: true,
    });
  },
  markRead(id: string) {
    return api<Record<string, unknown>>(`/v1/portal/timeline/${id}/read`, {
      method: 'POST',
      portalAuth: true,
      auth: false,
      queueWhenOffline: true,
    });
  },
};

export const healthService = {
  status() {
    return api<{ status: string; service: string; version: string; time: string }>('/health', {
      auth: false,
    });
  },
};

export function unwrapData<T>(payload: unknown, key: string): T {
  return maybeResource<T>(payload, key);
}

export type Paginated<T> = PaginatedResponse<T>;
