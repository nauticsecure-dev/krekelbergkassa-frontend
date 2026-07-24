import { api } from '@/lib/api';
import { getDeviceId } from '@/lib/device';
import type {
  AdminUser,
  AdminWallet,
  AppSettings,
  AuditLog,
  Boat,
  BoatLocation,
  BookingCalendarResponse,
  BookingSlotsResponse,
  CalendarConfig,
  Customer,
  HealthCheckResult,
  Invoice,
  InvoiceLine,
  KassaCheckoutResponse,
  KassaQrSession,
  OpeningHour,
  PaginatedResponse,
  Payment,
  Appointment,
  PortalAppointmentsResponse,
  PortalBoat,
  PortalContract,
  PortalInvoice,
  PortalMe,
  PortalNotificationsResponse,
  PortalTimelineItem,
  PortalTimelineResponse,
  PortalWallet,
  PricingRule,
  Product,
  Reminder,
  Sale,
  SessionUser,
  ContractTemplate,
  StallingContract,
  SyncDevice,
  SyncStatus,
} from '@/lib/api-types';
import { asArray, asPaginated, maybeResource, toBoolean, toNumber } from './utils';

export interface LoginResponse {
  user: SessionUser;
  token?: string;
  access_token?: string;
  session?: {
    device_id: string;
    expires_at: string;
    token?: string;
  };
  // Trello #104: MFA challenge — when enabled the login returns these instead of a token.
  mfa_required?: boolean;
  mfa_token?: string;
}

export function extractLoginToken(res: LoginResponse): string | undefined {
  if (res.token) return res.token;
  if (res.access_token) return res.access_token;
  if (res.session?.token) return res.session.token;
  return undefined;
}

function parseSessionUser(payload: unknown): SessionUser {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid session user payload');
  }
  const record = payload as Record<string, unknown>;
  if (record.user && typeof record.user === 'object') {
    return record.user as SessionUser;
  }
  if (record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>;
    if (data.user && typeof data.user === 'object') {
      return data.user as SessionUser;
    }
    if (typeof data.id === 'string' && typeof data.email === 'string') {
      return data as unknown as SessionUser;
    }
  }
  if (typeof record.id === 'string' && typeof record.email === 'string') {
    return record as unknown as SessionUser;
  }
  throw new Error('Invalid session user payload');
}

export const authService = {
  login(email: string, password: string, device_id = getDeviceId()) {
    return api<LoginResponse>('/v1/auth/login', {
      method: 'POST',
      body: { email, password, device_id },
      auth: false,
    });
  },
  // Trello #104: second factor — submit the TOTP / recovery code with the mfa_token.
  mfaVerify(mfa_token: string, code: string, device_id = getDeviceId()) {
    return api<LoginResponse>('/v1/auth/mfa-verify', {
      method: 'POST',
      body: { mfa_token, code, device_id },
      auth: false,
    });
  },
  async me() {
    const res = await api<unknown>('/v1/auth/me');
    return parseSessionUser(res);
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
  registerCustomer(payload: {
    name: string;
    email: string;
    phone?: string | null;
    preferred_locale?: string | null;
    address?: {
      street?: string | null;
      house_number?: string | null;
      postal_code?: string | null;
      city?: string | null;
      country?: string | null;
      google_place_id?: string | null;
    };
  }) {
    return api<{
      success: boolean;
      message: string;
      customer: { id: string; name: string; email: string; preferred_locale: string };
    }>('/v1/auth/customer/register', {
      method: 'POST',
      auth: false,
      body: payload,
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
    address?: {
      street?: string | null;
      house_number?: string | null;
      postal_code?: string | null;
      city?: string | null;
      country?: string | null;
      google_place_id?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      formatted_address?: string | null;
    };
  }) {
    return api<Customer>('/v1/customers', { method: 'POST', body: payload, queueWhenOffline: true });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<Customer>(`/v1/customers/${id}`, { method: 'PATCH', body: payload, queueWhenOffline: true });
  },
  remove(id: string) {
    return api<{ message: string }>(`/v1/customers/${id}`, { method: 'DELETE', queueWhenOffline: true });
  },
  // Trello #76: block / unblock / impersonate customers.
  block(id: string, reason?: string) {
    return api<{ message?: string; customer?: Customer }>(`/v1/customers/${id}/block`, {
      method: 'POST',
      body: { reason },
      queueWhenOffline: true,
    });
  },
  unblock(id: string) {
    return api<{ message?: string; customer?: Customer }>(`/v1/customers/${id}/unblock`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  impersonate(id: string) {
    return api<{ portal_token: string; expires_at?: string; customer: Customer }>(
      `/v1/customers/${id}/impersonate`,
      { method: 'POST' }
    );
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
  dossier(id: string) {
    return api<Record<string, unknown>>(`/v1/boats/${id}/dossier`);
  },
  // Trello #87: fleet stats, ownership transfer, audit, QR, photos/documents.
  aggregateStats() {
    return api<Record<string, unknown>>('/v1/boats/stats');
  },
  qr(id: string) {
    return api<{ qr_code?: string; payload?: string; label?: string; dossier_url?: string }>(
      `/v1/boats/${id}/qr`
    );
  },
  transfer(id: string, payload: { customer_id: string; transfer_reason?: string; ownership_notes?: string }) {
    return api<Boat>(`/v1/boats/${id}/transfer`, { method: 'POST', body: payload, queueWhenOffline: true });
  },
  async auditLog(id: string, query?: Record<string, string | number | undefined>) {
    const res = await api<unknown>(`/v1/boats/${id}/audit-log`, { query });
    return asPaginated<AuditLog>(res);
  },
  async documents(id: string) {
    return api<{ documents?: Array<Record<string, unknown>>; categories?: string[] }>(
      `/v1/boats/${id}/documents`
    );
  },
  uploadPhoto(id: string, formData: FormData) {
    return api<Record<string, unknown>>(`/v1/boats/${id}/photos`, {
      method: 'POST',
      body: formData,
      queueWhenOffline: true,
    });
  },
  deletePhoto(id: string, fileId: string) {
    return api<{ message?: string }>(`/v1/boats/${id}/photos/${fileId}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  uploadDocument(id: string, formData: FormData) {
    return api<Record<string, unknown>>(`/v1/boats/${id}/documents`, {
      method: 'POST',
      body: formData,
      queueWhenOffline: true,
    });
  },
  deleteDocument(id: string, fileId: string) {
    return api<{ message?: string }>(`/v1/boats/${id}/documents/${fileId}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
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
  async generateInvoice(id: string) {
    const res = await api<unknown>(`/v1/stalling/${id}/generate-invoice`, {
      method: 'POST',
      queueWhenOffline: true,
    });
    // Backend wraps the invoice as { data: { id, ... } }; unwrap so the
    // caller can read invoice.id directly (stalling FACTUUR redirect).
    return maybeResource<Invoice>(res, 'data');
  },
  // Trello #73: dedicated status + location endpoints (quick-edit modal).
  setStatus(id: string, status: string) {
    return api<StallingContract>(`/v1/stalling/${id}/status`, {
      method: 'PATCH',
      body: { payment_status: status },
      queueWhenOffline: true,
    });
  },
  // Trello #73: lifecycle status quick-edit (active/ended/cancelled/checked_out).
  // Accepts an optional change note ("Waarom is de status gewijzigd?").
  setLifecycle(id: string, status: string, note?: string) {
    return api<StallingContract>(`/v1/stalling/${id}/status`, {
      method: 'PATCH',
      body: { status, note: note || undefined },
      queueWhenOffline: true,
    });
  },
  setLocation(id: string, location_code: string | null, bok_number?: string | null) {
    return api<StallingContract>(`/v1/stalling/${id}/location`, {
      method: 'PATCH',
      body: { location_code, bok_number: bok_number ?? undefined },
      queueWhenOffline: true,
    });
  },
  // Trello #107: deposit-invoice + kassa-prefill payment routes after create.
  async generateDepositInvoice(id: string) {
    const res = await api<unknown>(`/v1/stalling/${id}/generate-deposit-invoice`, {
      method: 'POST',
      queueWhenOffline: true,
    });
    return maybeResource<Invoice>(res, 'data');
  },
  kassaPrefill(id: string) {
    return api<Record<string, unknown>>(`/v1/stalling/${id}/kassa-prefill`);
  },
  async logs(id: string, query?: Record<string, string | number | undefined>) {
    const res = await api<unknown>(`/v1/stalling/${id}/logs`, { query });
    return asPaginated<AuditLog>(res);
  },
  // Trello #73: dossier (one-call overview) + photos/documents on a contract.
  dossier(id: string) {
    return api<Record<string, unknown>>(`/v1/stalling/${id}/dossier`);
  },
  async photos(id: string) {
    const res = await api<unknown>(`/v1/stalling/${id}/photos`);
    return asArray<Record<string, unknown>>(res);
  },
  uploadPhoto(id: string, formData: FormData) {
    return api<Record<string, unknown>>(`/v1/stalling/${id}/photos`, {
      method: 'POST',
      body: formData,
      queueWhenOffline: true,
    });
  },
  deletePhoto(id: string, fileId: string) {
    return api<{ message?: string }>(`/v1/stalling/${id}/photos/${fileId}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  async documents(id: string) {
    const res = await api<unknown>(`/v1/stalling/${id}/documents`);
    return asArray<Record<string, unknown>>(res);
  },
  uploadDocument(id: string, formData: FormData) {
    return api<Record<string, unknown>>(`/v1/stalling/${id}/documents`, {
      method: 'POST',
      body: formData,
      queueWhenOffline: true,
    });
  },
  deleteDocument(id: string, fileId: string) {
    return api<{ message?: string }>(`/v1/stalling/${id}/documents/${fileId}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  sendContractEmail(id: string) {
    return api<{ message: string }>(`/v1/stalling/${id}/send-contract-email`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  generateRestInvoice(id: string) {
    return api<Invoice>(`/v1/stalling/${id}/generate-rest-invoice`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
};

export const contractTemplatesService = {
  async list(query?: Record<string, string | number | undefined>) {
    const res = await api<unknown>('/v1/contract-templates', { query });
    return asArray<ContractTemplate>(res);
  },
  get(id: string) {
    return api<ContractTemplate>(`/v1/contract-templates/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api<ContractTemplate>('/v1/contract-templates', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<ContractTemplate>(`/v1/contract-templates/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  delete(id: string) {
    return api<{ message: string }>(`/v1/contract-templates/${id}`, { method: 'DELETE' });
  },
  preview(id: string, data: Record<string, string>) {
    return api<{ html: string }>(`/v1/contract-templates/${id}/preview`, {
      method: 'POST',
      body: { data },
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
  credit(
    id: string,
    payload?: { mode?: 'full' | 'partial'; amount_cents?: number; reason?: string; send_email?: boolean }
  ) {
    return api<Invoice>(`/v1/invoices/${id}/credit`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  email(id: string, payload?: { to?: string; subject?: string; body?: string; locale?: string }) {
    return api<{ message?: string }>(`/v1/invoices/${id}/email`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
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
    payment_method?: string;
    payments?: Array<{ method: string; amount_cents: number; note?: string }>;
    locale?: string;
    redirect_url?: string;
    // Trello #79: total override creates a separate DISCOUNT line (never silently
    // changes product prices); a reason is required when adjusting.
    adjusted_total_cents?: number;
    adjustment_reason?: string;
    on_account_note?: string;
    items: Array<{ product_id?: string; description?: string; quantity: number; unit_price_cents?: number; price_cents?: number; vat_rate?: number }>;
  }) {
    return api<string | KassaCheckoutResponse>('/v1/kassa/checkout', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  analytics(query?: Record<string, string | number | boolean | undefined>) {
    return api<Record<string, unknown>>('/v1/kassa/analytics', { query });
  },
  // Trello #85: report export + cash day-close (dagafsluiting).
  exportAnalytics(query?: Record<string, string | number | boolean | undefined>) {
    return api<Blob>('/v1/kassa/analytics/export', { query: { ...query, format: 'csv' } });
  },
  async cashClosures(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/kassa/cash-closures', { query });
    return asArray<Record<string, unknown>>(res);
  },
  cashClosure(id: string) {
    return api<Record<string, unknown>>(`/v1/kassa/cash-closures/${id}`);
  },
  createCashClosure(payload: {
    business_date: string;
    opening_cash_cents: number;
    cash_paid_out_cents?: number;
    counted_cash_cents: number;
    note?: string;
  }) {
    return api<Record<string, unknown>>('/v1/kassa/cash-closures', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  // Trello #72: Mollie QR sessions — created before an invoice exists, the
  // invoice/payment are finalized by the webhook once paid.
  async createQrSession(payload: {
    device_id: string;
    customer_id?: string | null;
    method?: string;
    redirect_url?: string;
    items: Array<{ product_id?: string; description?: string; quantity: number; unit_price_cents?: number; vat_rate?: number }>;
  }) {
    const res = await api<unknown>('/v1/kassa/qr-sessions', { method: 'POST', body: payload });
    return maybeResource<KassaQrSession>(res, 'data');
  },
  async qrSession(id: string) {
    const res = await api<unknown>(`/v1/kassa/qr-sessions/${id}`);
    return maybeResource<KassaQrSession>(res, 'data');
  },
  cancelQrSession(id: string) {
    return api<unknown>(`/v1/kassa/qr-sessions/${id}/cancel`, { method: 'POST' });
  },
  // Trello #72: regenerate an expired QR session + email the payment link.
  async regenerateQrSession(id: string) {
    const res = await api<unknown>(`/v1/kassa/qr-sessions/${id}/regenerate`, { method: 'POST' });
    return maybeResource<KassaQrSession>(res, 'data');
  },
  sendPaymentLink(id: string, payload?: { email?: string }) {
    return api<{ message?: string }>(`/v1/kassa/qr-sessions/${id}/send-link`, {
      method: 'POST',
      body: payload ?? {},
      queueWhenOffline: true,
    });
  },
  // Trello #72: send the payment link to the customer over WhatsApp.
  sendPaymentLinkWhatsapp(id: string, payload?: { phone?: string }) {
    return api<{ message?: string }>(`/v1/kassa/qr-sessions/${id}/send-link-whatsapp`, {
      method: 'POST',
      body: payload ?? {},
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
    const raw = res as Record<string, unknown> | null;
    const data = asArray<Sale>(res);
    const emptyMessage: string =
      raw && typeof raw.empty_state === 'object' && raw.empty_state
        ? ((raw.empty_state as Record<string, unknown>).message as string) ?? ''
        : '';
    return { data, emptyMessage };
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

const PRICING_CHANNELS = ['all', 'kassa', 'portal', 'stalling'] as const;

type PricingChannel = (typeof PRICING_CHANNELS)[number];

function pricingServiceCodes(payload: {
  service_code?: string;
  service_codes?: string[];
  services?: string[];
}): string[] {
  if (payload.service_code) return [payload.service_code];
  if (payload.service_codes?.length) return payload.service_codes;
  if (payload.services?.length) return payload.services;
  return [];
}

function pricingChannel(
  channel?: string | null,
  opts?: { serviceCodes?: string[]; contractType?: string },
): PricingChannel {
  if (channel && PRICING_CHANNELS.includes(channel as PricingChannel)) {
    return channel as PricingChannel;
  }
  const codes = opts?.serviceCodes ?? [];
  if (
    opts?.contractType === 'winter' ||
    codes.some((code) => code === 'stalling' || code === 'winterstalling')
  ) {
    return 'stalling';
  }
  return 'all';
}

function buildCalculatePayload(payload: {
  length_cm: number;
  service_code?: string;
  service_codes?: string[];
  services?: string[];
  contract_type?: string;
  customer_id?: string | null;
  boat_id?: string | null;
  channel?: string;
  persist?: boolean | null;
  status?: string | null;
  calculator_record_id?: string | null;
}) {
  const serviceCodes = pricingServiceCodes(payload);
  const service_code = serviceCodes[0];
  if (!service_code) {
    throw new Error('service_code is required');
  }
  return {
    length_cm: payload.length_cm,
    service_code,
    channel: pricingChannel(payload.channel, {
      serviceCodes,
      contractType: payload.contract_type,
    }),
    customer_id: payload.customer_id ?? null,
    boat_id: payload.boat_id ?? null,
    ...(payload.persist != null ? { persist: payload.persist } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    // Trello #68: update an existing record in place when an id is supplied.
    ...(payload.calculator_record_id ? { calculator_record_id: payload.calculator_record_id } : {}),
  };
}

function buildPreviewPayload(payload: {
  length_cm: number;
  service_code?: string;
  service_codes?: string[];
  services?: string[];
  contract_type?: string;
  customer_id?: string | null;
  boat_id?: string | null;
  channel?: string;
  persist?: boolean | null;
  status?: string | null;
}) {
  const service_codes = pricingServiceCodes(payload);
  if (!service_codes.length) {
    throw new Error('service_codes is required');
  }
  return {
    length_cm: payload.length_cm,
    service_codes,
    channel: pricingChannel(payload.channel, {
      serviceCodes: service_codes,
      contractType: payload.contract_type,
    }),
    customer_id: payload.customer_id ?? null,
    boat_id: payload.boat_id ?? null,
    ...(payload.persist != null ? { persist: payload.persist } : {}),
    ...(payload.status ? { status: payload.status } : {}),
  };
}

export const pricingService = {
  calculate(payload: {
    length_cm: number;
    service_code?: string;
    services?: string[];
    service_codes?: string[];
    contract_type?: string;
    customer_id?: string | null;
    boat_id?: string | null;
    locale?: string;
    channel?: string;
    persist?: boolean | null;
    status?: string | null;
    calculator_record_id?: string | null;
  }) {
    return api<Record<string, unknown>>('/v1/pricing/calculate', {
      method: 'POST',
      body: buildCalculatePayload(payload),
    });
  },
  preview(payload: {
    length_cm: number;
    service_code?: string;
    services?: string[];
    service_codes?: string[];
    contract_type?: string;
    customer_id?: string | null;
    boat_id?: string | null;
    channel?: string;
    persist?: boolean | null;
    status?: string | null;
  }) {
    return api<Record<string, unknown>>('/v1/pricing/preview', {
      method: 'POST',
      body: buildPreviewPayload(payload),
    });
  },
  // Trello #107: lightweight product-code price preview for the contract modal.
  previewProduct(params: { product_code: string; entity_id?: string; entity_type?: string }) {
    return api<Record<string, unknown>>('/v1/pricing/preview', {
      query: {
        product_code: params.product_code,
        entity_id: params.entity_id,
        entity_type: params.entity_type,
      },
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
  async calculatorRecords(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/pricing/calculator-records', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  calculatorRecord(id: string) {
    return api<Record<string, unknown>>(`/v1/pricing/calculator-records/${id}`);
  },
  // Trello #68: row actions on the calculator records list.
  duplicateCalculatorRecord(id: string) {
    return api<Record<string, unknown>>(`/v1/pricing/calculator-records/${id}/duplicate`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  archiveCalculatorRecord(id: string) {
    return api<Record<string, unknown>>(`/v1/pricing/calculator-records/${id}/archive`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  patchCalculatorRecord(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/pricing/calculator-records/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  // Trello #68: bulk row actions on the calculator records list.
  bulkCalculatorRecords(payload: { ids: string[]; action: 'archive' | 'duplicate' }) {
    return api<Record<string, unknown>>('/v1/pricing/calculator-records/bulk', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  // Trello #68: export the (filtered) calculator records as CSV.
  exportCalculatorRecords(query?: Record<string, string | number | boolean | undefined>) {
    return api<Blob>('/v1/pricing/calculator-records/export', { query: { ...query, format: 'csv' } });
  },
  // Trello #107: makelaardij (brokerage) tariff table + preview.
  async brokerageTariffs() {
    const res = await api<unknown>('/v1/pricing/brokerage-tariffs');
    return asArray<BrokerageTariff>(res);
  },
  createBrokerageTariff(payload: Record<string, unknown>) {
    return api<BrokerageTariff>('/v1/pricing/brokerage-tariffs', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  updateBrokerageTariff(id: string, payload: Record<string, unknown>) {
    return api<BrokerageTariff>(`/v1/pricing/brokerage-tariffs/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  deactivateBrokerageTariff(id: string) {
    return api<BrokerageTariff>(`/v1/pricing/brokerage-tariffs/${id}/deactivate`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  brokeragePreview(payload: { length_cm: number; brokerage_start_date?: string }) {
    return api<BrokeragePreview>('/v1/pricing/brokerage-preview', {
      method: 'POST',
      body: payload,
    });
  },
};

export interface BrokerageTariff {
  id: string;
  min_length_cm: number;
  max_length_cm: number;
  price_per_month: number;
  price_per_month_euros?: number;
  active_from?: string | null;
  active?: boolean;
  notes?: string | null;
  range_label?: string;
}
export interface BrokeragePreview {
  brokerage: boolean;
  length_cm: number;
  brokerage_start_date?: string;
  brokerage_free_until?: string;
  free_months?: number;
  monthly_fee?: number;
  monthly_fee_euros?: number;
  currency?: string;
  status?: string;
  tariff?: { range_label?: string; price_per_month?: number };
}

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
  // Trello #86: product sales stats for one product.
  async stats(id: string) {
    const res = await api<unknown>(`/v1/products/${id}/stats`);
    return maybeResource<Record<string, unknown>>(res, 'data');
  },
  // Trello #80: bulk product stats for the kassa heatmap (GET /products/stats).
  async statsBulk() {
    const res = await api<unknown>('/v1/products/stats');
    return asArray<Record<string, unknown>>(res);
  },
  // Trello #80: recently-used products for the kassa (backend-backed).
  async recent(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/products/recent', { query });
    return asArray<Product>(res);
  },
  recordRecent(id: string) {
    return api<{ message?: string }>(`/v1/products/${id}/recent`, { method: 'POST', queueWhenOffline: true });
  },
  // Trello #80: bundle CRUD.
  createBundle(data: Record<string, unknown>) {
    return api<ProductBundle>('/v1/products/bundles', { method: 'POST', body: data, queueWhenOffline: true });
  },
  updateBundle(id: string, data: Record<string, unknown>) {
    return api<ProductBundle>(`/v1/products/bundles/${id}`, { method: 'PATCH', body: data, queueWhenOffline: true });
  },
  deleteBundle(id: string) {
    return api<{ message?: string }>(`/v1/products/bundles/${id}`, { method: 'DELETE', queueWhenOffline: true });
  },
  async generateImage(id: string, payload: { prompt: string; quality?: string }) {
    const res = await api<unknown>(`/v1/products/${id}/generate-image`, {
      method: 'POST',
      body: payload,
    });
    return maybeResource<{ product?: Product; image_url?: string }>(res, 'data');
  },
  // Trello #80: barcode scan lookup (USB / camera / manual).
  scan(payload: { barcode: string; source?: string; barcode_type?: string; fast_scan?: boolean; quantity?: number }) {
    return api<{ matched: boolean; product?: Product; scan_log?: Record<string, unknown> }>(
      '/v1/products/scan',
      { method: 'POST', body: payload }
    );
  },
  // Trello #80/#86: staff favourites + product bundles for the kassa.
  setFavorite(id: string, on: boolean) {
    return api<Product>(`/v1/products/${id}/favorite`, {
      method: on ? 'POST' : 'DELETE',
      queueWhenOffline: true,
    });
  },
  async bundles() {
    const res = await api<unknown>('/v1/products/bundles');
    return asArray<ProductBundle>(res);
  },
  // Trello #86: multipart product image upload (replaces URL-only field).
  uploadImage(id: string, formData: FormData) {
    return api<{ message?: string; image_url?: string; file_id?: string; product?: Product }>(
      `/v1/products/${id}/upload-image`,
      { method: 'POST', body: formData, queueWhenOffline: true }
    );
  },
  aiSearch(query: string) {
    return api<{ answer: string; products: Product[] }>('/v1/products/ai-search', {
      method: 'POST',
      body: { query },
    });
  },
  async auditLog(id: string, query?: Record<string, string | number | undefined>) {
    const res = await api<unknown>(`/v1/products/${id}/audit-log`, { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  async scanLogs(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/products/scan-logs', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
};

export interface ProductBundle {
  id: string;
  code?: string;
  name: string;
  color?: string | null;
  items?: Array<{ product_id: string; quantity?: number; product?: Product }>;
}

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
  pull(device_id: string, last_sync_at?: string | null) {
    return api<Record<string, unknown>>('/v1/sync/pull', {
      query: { device_id, last_sync_at: last_sync_at ?? undefined },
    });
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
  async timeline(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/timeline', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  // Trello #109: unified staff feed over audit_logs + timeline_items.
  async timelineFeed(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/timeline', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  createTimelineEvent(payload: Record<string, unknown>) {
    return api<{ message?: string; timeline_item_id?: string }>('/v1/timeline/events', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  timelineMessage(payload: {
    customer_id: string;
    title: string;
    message: string;
    type?: string;
    visibility?: 'internal' | 'customer';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    boat_id?: string;
    cta_label?: string;
    cta_url?: string;
  }) {
    return api<Record<string, unknown>>('/v1/admin/timeline/message', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  timelineComment(id: string, payload: { message: string; visibility?: 'internal' | 'customer' }) {
    return api<Record<string, unknown>>(`/v1/admin/timeline/${id}/comment`, {
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
  remindersSummary() {
    return api<{
      invoice_due?: number;
      contracts_expiring?: number;
      work_orders_due?: number;
      total?: number;
      today?: number | Record<string, number>;
      upcoming?: number | Record<string, number>;
      overdue?: number | Record<string, number>;
      completed?: number | Record<string, number>;
    }>('/v1/admin/reminders/summary');
  },
  // Trello #90: reminder lifecycle + rules engine.
  reminder(id: string) {
    return api<Reminder>(`/v1/admin/reminders/${id}`);
  },
  createReminder(payload: Record<string, unknown>) {
    return api<Reminder>('/v1/admin/reminders', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  completeReminder(id: string) {
    return api<Reminder>(`/v1/admin/reminders/${id}/complete`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  dismissReminder(id: string) {
    return api<Reminder>(`/v1/admin/reminders/${id}/dismiss`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  runReminderRules() {
    return api<{ message?: string; count?: number }>('/v1/admin/reminders/run-rules', {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  async reminderRules() {
    const res = await api<unknown>('/v1/admin/reminder-rules');
    return asArray<Record<string, unknown>>(res);
  },
  // Full index response incl. `options` (entity types, channels, reminder_types).
  reminderRuleOptions() {
    return api<{ data?: Array<Record<string, unknown>>; options?: Record<string, unknown> }>(
      '/v1/admin/reminder-rules'
    );
  },
  createReminderRule(payload: Record<string, unknown>) {
    return api<Record<string, unknown>>('/v1/admin/reminder-rules', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  updateReminderRule(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/admin/reminder-rules/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  deleteReminderRule(id: string) {
    return api<{ message?: string }>(`/v1/admin/reminder-rules/${id}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  previewReminderRule(id: string, payload?: { entity_id?: string }) {
    return api<Record<string, unknown>>(`/v1/admin/reminder-rules/${id}/preview`, {
      method: 'POST',
      body: payload ?? {},
    });
  },
  // Trello #90: send a one-off test reminder for a rule.
  testSendReminderRule(id: string, payload: { recipient_email: string; entity_id?: string }) {
    return api<{ channel_used?: string; recipient?: string; subject?: string; status?: string; note?: string }>(
      `/v1/admin/reminder-rules/${id}/test-send`,
      { method: 'POST', body: payload }
    );
  },
  // Trello #90: customer health score.
  customerHealth(customerId: string) {
    return api<Record<string, unknown>>(`/v1/customers/${customerId}/health`);
  },
  // Trello #90: force-recompute the customer health score.
  recomputeCustomerHealth(customerId: string) {
    return api<Record<string, unknown>>(`/v1/customers/${customerId}/health/recompute`, { method: 'POST' });
  },
  // Trello #76: admin-triggered customer magic-link (login link).
  sendCustomerMagicLink(customerId: string) {
    return api<{ message?: string }>(`/v1/customers/${customerId}/send-magic-link`, { method: 'POST' });
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
  // Trello #87/#90: customer-facing boat dossier (portal).
  boatDossier(id: string) {
    return api<Record<string, unknown>>(`/v1/portal/boats/${id}/dossier`, { portalAuth: true, auth: false });
  },
  async boatWorkOrders(id: string) {
    const res = await api<unknown>(`/v1/portal/boats/${id}/work-orders`, { portalAuth: true, auth: false });
    return asArray<Record<string, unknown>>(res);
  },
  async boatInvoices(id: string) {
    const res = await api<unknown>(`/v1/portal/boats/${id}/invoices`, { portalAuth: true, auth: false });
    return asArray<Record<string, unknown>>(res);
  },
  async boatTimeline(id: string) {
    const res = await api<unknown>(`/v1/portal/boats/${id}/timeline`, { portalAuth: true, auth: false });
    return asArray<Record<string, unknown>>(res);
  },
  // Trello #88: customer-facing work orders (portal).
  async workOrders(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/portal/work-orders', { query, portalAuth: true, auth: false });
    return asPaginated<Record<string, unknown>>(res);
  },
  workOrder(id: string) {
    return api<Record<string, unknown>>(`/v1/portal/work-orders/${id}`, { portalAuth: true, auth: false });
  },
  workOrderTimeline(id: string) {
    return api<{ data: Record<string, unknown>[] }>(`/v1/portal/work-orders/${id}/timeline`, { portalAuth: true, auth: false });
  },
  workOrderAccept(id: string, payload?: { signature?: string; note?: string }) {
    return api<Record<string, unknown>>(`/v1/portal/work-orders/${id}/accept`, {
      method: 'POST',
      body: payload ?? {},
      portalAuth: true,
      auth: false,
    });
  },
  async timeline(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/portal/timeline', {
      query,
      portalAuth: true,
      auth: false,
    });
    const obj = res as Record<string, unknown>;
    const items = asPaginated<PortalTimelineItem>(obj.items ?? res);
    const pagination = obj.pagination as PortalTimelineResponse['pagination'] | undefined;
    return {
      items: items.data,
      pagination: pagination ?? {
        page: 1,
        per_page: items.data.length,
        total: items.data.length,
        has_more: false,
        unread_count: items.data.filter((i) => !i.read_at && i.status !== 'read').length,
      },
    } satisfies PortalTimelineResponse;
  },
  notifications() {
    return api<PortalNotificationsResponse>('/v1/portal/notifications', {
      portalAuth: true,
      auth: false,
    });
  },
  async appointments(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/portal/appointments', {
      query,
      portalAuth: true,
      auth: false,
    });
    const obj = res as Record<string, unknown>;
    const page = asPaginated<Appointment>(obj.appointments ?? res);
    return {
      data: page.data,
      total: toNumber(obj.total, page.data.length),
      has_more: toBoolean(obj.has_more),
    } satisfies PortalAppointmentsResponse;
  },
  appointmentConfirmationPdf(id: string) {
    return api<Blob>(`/v1/portal/appointments/${id}/confirmation`, { portalAuth: true, auth: false });
  },
  // Trello #99: customer cancels their own appointment.
  cancelAppointment(id: string, reason?: string) {
    return api<Appointment>(`/v1/portal/appointments/${id}/cancel`, {
      method: 'POST',
      body: { reason },
      portalAuth: true,
      auth: false,
    });
  },
  // Trello #99: customer requests a reschedule (staff approves the actual move).
  requestReschedule(id: string, payload: { preferred_date?: string; preferred_time?: string; reason?: string }) {
    return api<Record<string, unknown>>(`/v1/portal/appointments/${id}/reschedule-request`, {
      method: 'POST',
      body: payload,
      portalAuth: true,
      auth: false,
    });
  },
  wallet() {
    return api<PortalWallet | string>('/v1/portal/wallet', {
      portalAuth: true,
      auth: false,
    });
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
  timelineComment(id: string, message: string) {
    return api<Record<string, unknown>>(`/v1/portal/timeline/${id}/comment`, {
      method: 'POST',
      body: { message },
      portalAuth: true,
      auth: false,
      queueWhenOffline: true,
    });
  },
};

export const tasksService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/tasks', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  get(id: string) {
    return api<Record<string, unknown>>(`/v1/admin/tasks/${id}`);
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/admin/tasks/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  complete(id: string) {
    return api<Record<string, unknown>>(`/v1/admin/tasks/${id}/complete`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
};

export const appointmentsService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/appointments', { query });
    return asPaginated<Appointment>(res);
  },
  get(id: string) {
    return api<Appointment>(`/v1/appointments/${id}`);
  },
  confirm(id: string) {
    return api<Appointment>(`/v1/appointments/${id}/confirm`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  updateStatus(
    id: string,
    payload: { status: string; staff_note?: string | null; public_note?: string | null; photo_id?: string | null }
  ) {
    return api<Appointment>(`/v1/appointments/${id}/status`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  cancel(id: string, reason: string) {
    return api<Appointment>(`/v1/appointments/${id}/cancel`, {
      method: 'POST',
      body: { reason },
      queueWhenOffline: true,
    });
  },
  // Trello #99: drag/drop reschedule + resize.
  schedule(
    id: string,
    payload: {
      date: string;
      start_time: string;
      duration_minutes?: number;
      staff_note?: string;
      notify_customer?: boolean;
    }
  ) {
    return api<Appointment>(`/v1/appointments/${id}/schedule`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  // Trello #99: admin-created appointment.
  create(payload: Record<string, unknown>) {
    return api<Appointment>('/v1/appointments', { method: 'POST', body: payload, queueWhenOffline: true });
  },
  // Trello #99: planning dashboard counters (today / tomorrow / pending / completed-this-week).
  stats(query?: Record<string, string | number | boolean | undefined>) {
    return api<Record<string, unknown>>('/v1/appointments/stats', { query });
  },
  // Trello #99: conflict detection before scheduling/creating.
  checkConflicts(payload: { date: string; start_time: string; duration_minutes?: number; location_id?: string | null }) {
    return api<{ has_conflicts: boolean; conflicts: Array<Record<string, unknown>> }>(
      '/v1/appointments/check-conflicts',
      { method: 'POST', body: payload }
    );
  },
  // Trello #99: bulk cancel / assign / status.
  bulk(payload: { action: 'cancel' | 'assign' | 'status'; appointment_ids: string[]; reason?: string; assigned_to_user_id?: string; status?: string }) {
    return api<Record<string, unknown>>('/v1/appointments/bulk', { method: 'POST', body: payload, queueWhenOffline: true });
  },
  // Trello #99: CSV export of the visible period.
  export(query?: Record<string, string | number | boolean | undefined>) {
    return api<Blob>('/v1/appointments/export', { query });
  },
};

export const bookingService = {
  slots(params: { date: string; length_cm: number; service_codes: string[] }) {
    return api<BookingSlotsResponse>('/v1/booking/slots', {
      auth: false,
      query: {
        date: params.date,
        length_cm: params.length_cm,
        'service_codes[]': params.service_codes,
      },
    });
  },
  calendar(from: string, to: string) {
    return api<BookingCalendarResponse>('/v1/booking/calendar', {
      auth: false,
      query: { from, to },
    });
  },
  book(payload: {
    name: string;
    email: string;
    phone?: string | null;
    locale?: string | null;
    date: string;
    start_time: string;
    location_code?: string | null;
    notes?: string | null;
    address?: {
      street?: string | null;
      postal_code?: string | null;
      city?: string | null;
      country?: string | null;
    };
    boat: {
      name: string;
      type?: string | null;
      length_m: number;
      width_m?: number | null;
      registration_number?: string | null;
    };
    service_codes: string[];
  }) {
    return api<unknown>('/v1/booking', {
      method: 'POST',
      auth: false,
      body: payload,
    });
  },
};

export const calendarService = {
  get() {
    return api<CalendarConfig>('/v1/admin/calendar');
  },
  setRegular(payload: {
    day_of_week: number;
    open_from?: string | null;
    open_until?: string | null;
    is_closed?: boolean;
  }) {
    return api<OpeningHour>('/v1/admin/calendar/regular', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  setException(payload: {
    date: string;
    open_from?: string | null;
    open_until?: string | null;
    is_closed?: boolean;
    label?: string | null;
  }) {
    return api<OpeningHour>('/v1/admin/calendar/exception', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  setLunch(payload: { from: string; until: string }) {
    return api<OpeningHour>('/v1/admin/calendar/lunch', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  async locations() {
    const res = await api<unknown>('/v1/admin/calendar/locations');
    return asArray<BoatLocation>(res);
  },
  createLocation(payload: Record<string, unknown>) {
    return api<BoatLocation>('/v1/admin/calendar/locations', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  updateLocation(id: string, payload: Record<string, unknown>) {
    return api<BoatLocation>(`/v1/admin/calendar/locations/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
};

export const usersService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/users', { query });
    return asPaginated<AdminUser>(res);
  },
  get(id: string) {
    return api<AdminUser>(`/v1/admin/users/${id}`);
  },
  register(payload: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    return api<AdminUser>('/v1/admin/users/register', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<AdminUser>(`/v1/admin/users/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  remove(id: string) {
    return api<{ message: string }>(`/v1/admin/users/${id}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  activate(id: string) {
    return api<AdminUser>(`/v1/admin/users/${id}/activate`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  deactivate(id: string) {
    return api<AdminUser>(`/v1/admin/users/${id}/deactivate`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  impersonate(id: string) {
    return api<{
      token: string;
      expires_at: string;
      user: AdminUser;
    }>(`/v1/admin/users/${id}/impersonate`, { method: 'POST' });
  },
  stopImpersonation() {
    return api<{ message: string }>('/v1/admin/users/impersonate/stop', { method: 'POST' });
  },
  block(id: string, reason?: string) {
    return api<{ message: string; user: AdminUser }>(`/v1/admin/users/${id}/block`, {
      method: 'POST',
      body: { reason },
    });
  },
  unblock(id: string) {
    return api<{ message: string; user: AdminUser }>(`/v1/admin/users/${id}/unblock`, {
      method: 'POST',
    });
  },
};

export const workOrdersService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/work-orders', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  get(id: string) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api<Record<string, unknown>>('/v1/work-orders', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  // Trello #88: metadata (statuses/types/priorities/technicians) + transitions.
  metadata() {
    return api<WorkOrderMetadata>('/v1/work-orders/metadata');
  },
  assign(id: string, payload: { assignee_id?: string | null; technician_id?: string | null }) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}/assign`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  start(id: string) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}/start`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  complete(id: string, payload?: { notes?: string; hours?: number }) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}/complete`, {
      method: 'POST',
      body: payload ?? {},
      queueWhenOffline: true,
    });
  },
  async generateInvoice(id: string) {
    const res = await api<unknown>(`/v1/work-orders/${id}/generate-invoice`, {
      method: 'POST',
      queueWhenOffline: true,
    });
    return maybeResource<Invoice>(res, 'data');
  },
  // Trello #88: stats dashboard, time entries, materials, uploads, audit log.
  stats(query?: Record<string, string | number | undefined>) {
    return api<Record<string, unknown>>('/v1/work-orders/stats', { query });
  },
  async timeEntries(id: string) {
    const res = await api<unknown>(`/v1/work-orders/${id}/time-entries`);
    return asArray<Record<string, unknown>>(res);
  },
  addTimeEntry(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}/time-entries`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  deleteTimeEntry(id: string, entryId: string) {
    return api<{ message?: string }>(`/v1/work-orders/${id}/time-entries/${entryId}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  async materials(id: string) {
    const res = await api<unknown>(`/v1/work-orders/${id}/materials`);
    return asArray<Record<string, unknown>>(res);
  },
  addMaterial(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}/materials`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  deleteMaterial(id: string, materialId: string) {
    return api<{ message?: string }>(`/v1/work-orders/${id}/materials/${materialId}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  uploadPhoto(id: string, formData: FormData) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}/photos`, {
      method: 'POST',
      body: formData,
      queueWhenOffline: true,
    });
  },
  deletePhoto(id: string, fileId: string) {
    return api<{ message?: string }>(`/v1/work-orders/${id}/photos/${fileId}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  uploadDocument(id: string, formData: FormData) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}/documents`, {
      method: 'POST',
      body: formData,
      queueWhenOffline: true,
    });
  },
  deleteDocument(id: string, fileId: string) {
    return api<{ message?: string }>(`/v1/work-orders/${id}/documents/${fileId}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  async auditLog(id: string, query?: Record<string, string | number | undefined>) {
    const res = await api<unknown>(`/v1/work-orders/${id}/audit-log`, { query });
    return asPaginated<AuditLog>(res);
  },
  // Trello #88: semantic timeline events for a work order (separate from audit log).
  async timeline(id: string, query?: Record<string, string | number | undefined>) {
    const res = await api<unknown>(`/v1/work-orders/${id}/timeline`, { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  qr(id: string) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}/qr`);
  },
  waiting(id: string, payload: { status: string; note?: string }) {
    return api<Record<string, unknown>>(`/v1/work-orders/${id}/waiting`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  bulkAction(payload: { action: string; ids: string[]; status?: string; assigned_to_user_id?: string }) {
    return api<{ processed: number; total: number }>('/v1/work-orders/bulk-action', {
      method: 'POST',
      body: payload,
    });
  },
};

export interface WorkOrderMetadata {
  statuses?: string[];
  status_transitions?: Record<string, string[]>;
  types?: Array<{ value: string; label: string }>;
  priorities?: string[];
  photo_folders?: string[];
  document_folders?: string[];
  technicians?: Array<{ id: string; name: string }>;
}

export const invoiceImportsService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/invoice-imports', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  create(payload: Record<string, unknown>) {
    return api<Record<string, unknown>>('/v1/invoice-imports', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  get(id: string) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}`);
  },
  approve(id: string, payload?: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}/approve`, {
      method: 'POST',
      body: payload ?? {},
      queueWhenOffline: true,
    });
  },
  // Trello #70: review workflow transitions.
  process(id: string) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}/process`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  retry(id: string) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}/retry`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  reject(id: string, reason?: string) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}/reject`, {
      method: 'POST',
      body: { reason },
      queueWhenOffline: true,
    });
  },
  // Trello #81: optionally pass the matched import id for duplicate resolution.
  markDuplicate(id: string, duplicateImportId?: string) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}/mark-duplicate`, {
      method: 'POST',
      body: duplicateImportId ? { duplicate_import_id: duplicateImportId } : {},
      queueWhenOffline: true,
    });
  },
  // Trello #81: export the (filtered) invoice imports as CSV.
  export(query?: Record<string, string | number | boolean | undefined>) {
    return api<Blob>('/v1/invoice-imports/export', { query: { ...query, format: 'csv' } });
  },
  // Trello #108: supplier delivery-note → waiting workbon.
  markWorkbon(id: string) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}/mark-workbon`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
  // Trello #108: multi-file upload, bulk actions, workbon matching, OCR source pdf.
  batch(formData: FormData) {
    return api<Record<string, unknown>>('/v1/invoice-imports/batch', {
      method: 'POST',
      body: formData,
      queueWhenOffline: true,
    });
  },
  bulkAction(payload: { ids: string[]; action: string; supplier_id?: string; customer_id?: string; boat_id?: string }) {
    return api<Record<string, unknown>>('/v1/invoice-imports/bulk-action', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  proposeMatches(id: string) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}/propose-matches`);
  },
  resolveLineItems(id: string) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}/resolve-line-items`);
  },
  sourcePdf(id: string) {
    return api<{ file_id?: string; filename?: string; mime_type?: string; signed_url?: string }>(
      `/v1/invoice-imports/${id}/source-pdf`
    );
  },
  linkWorkbon(id: string, workOrderId: string, reviewNotes?: string) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}/link-workbon`, {
      method: 'POST',
      body: { work_order_id: workOrderId, review_notes: reviewNotes },
      queueWhenOffline: true,
    });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/invoice-imports/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
};

// Trello #70: tagged-PDF extraction templates (OCR template dashboard).
export interface ExtractionZone {
  field: string;
  page?: number;
  x: number; // 0..1 fractions of the page width/height
  y: number;
  w: number;
  h: number;
}
export interface ExtractionTemplate {
  id: string;
  name: string;
  vendor_name?: string | null;
  document_type?: string | null;
  supplier_email?: string | null;
  match_keywords?: string[] | null;
  match_rules?: { keywords?: string[]; sender_email_pattern?: string; filename_pattern?: string; exclude_keywords?: string[] } | null;
  field_zones?: ExtractionZone[];
  active?: boolean;
  version?: number;
  used_count?: number;
  usage_count?: number;
  success_count?: number;
  correction_count?: number;
  average_confidence?: number;
  last_used_at?: string | null;
}
export const extractionTemplatesService = {
  async list() {
    const res = await api<unknown>('/v1/invoice-extraction-templates');
    return asArray<ExtractionTemplate>(res);
  },
  get(id: string) {
    return api<ExtractionTemplate>(`/v1/invoice-extraction-templates/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api<ExtractionTemplate>('/v1/invoice-extraction-templates', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<ExtractionTemplate>(`/v1/invoice-extraction-templates/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  metrics(id: string) {
    return api<Record<string, unknown>>(`/v1/invoice-extraction-templates/${id}/metrics`);
  },
  delete(id: string) {
    return api<{ message: string }>(`/v1/invoice-extraction-templates/${id}`, { method: 'DELETE' });
  },
};

export const searchService = {
  search(q: string, limit = 8) {
    return api<{
      query: string;
      intent: string;
      result_count: number;
      results: Record<string, Array<Record<string, unknown>>>;
    }>('/v1/search', { query: { q, limit } });
  },
};

export const productGroupsService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/product-groups', { query });
    return asArray<Record<string, unknown>>(res);
  },
  create(payload: Record<string, unknown>) {
    return api<Record<string, unknown>>('/v1/product-groups', {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/product-groups/${id}`, {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
  remove(id: string) {
    return api<{ message?: string }>(`/v1/product-groups/${id}`, {
      method: 'DELETE',
      queueWhenOffline: true,
    });
  },
  // Trello #86: archive (distinct from deactivate toggle).
  archive(id: string) {
    return api<{ message?: string; data?: Record<string, unknown> }>(
      `/v1/product-groups/${id}/archive`,
      { method: 'POST', queueWhenOffline: true }
    );
  },
};

// Trello #108: suppliers, ledger accounts, supplier payables, accounting.
export const suppliersService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/suppliers', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  get(id: string) {
    return api<Record<string, unknown>>(`/v1/suppliers/${id}`);
  },
  create(payload: Record<string, unknown>) {
    return api<Record<string, unknown>>('/v1/suppliers', { method: 'POST', body: payload, queueWhenOffline: true });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/suppliers/${id}`, { method: 'PATCH', body: payload, queueWhenOffline: true });
  },
  remove(id: string) {
    return api<{ message?: string }>(`/v1/suppliers/${id}`, { method: 'DELETE', queueWhenOffline: true });
  },
  async mappings(supplierId: string) {
    const res = await api<unknown>(`/v1/suppliers/${supplierId}/mappings`);
    return asArray<Record<string, unknown>>(res);
  },
  createMapping(supplierId: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/suppliers/${supplierId}/mappings`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
};

export const ledgerAccountsService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/ledger-accounts', { query });
    return asArray<Record<string, unknown>>(res);
  },
  create(payload: Record<string, unknown>) {
    return api<Record<string, unknown>>('/v1/ledger-accounts', { method: 'POST', body: payload, queueWhenOffline: true });
  },
  update(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/ledger-accounts/${id}`, { method: 'PATCH', body: payload, queueWhenOffline: true });
  },
};

export const supplierPayablesService = {
  async list(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/supplier-payables', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  markPaid(id: string) {
    return api<Record<string, unknown>>(`/v1/supplier-payables/${id}/mark-paid`, {
      method: 'POST',
      queueWhenOffline: true,
    });
  },
};

export const accountingService = {
  dashboard(query?: Record<string, string | number | boolean | undefined>) {
    return api<Record<string, unknown>>('/v1/admin/accounting/dashboard', { query });
  },
};

export const walletsService = {
  get(customerId: string, query?: Record<string, string | number | undefined>) {
    return api<AdminWallet>(`/v1/admin/wallets/${customerId}`, { query });
  },
  credit(
    customerId: string,
    payload: { amount_cents: number; description: string; notes?: string | null }
  ) {
    return api<AdminWallet>(`/v1/admin/wallets/${customerId}/credit`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  debit(
    customerId: string,
    payload: { amount_cents: number; description: string; notes?: string | null }
  ) {
    return api<AdminWallet>(`/v1/admin/wallets/${customerId}/debit`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  applyToInvoice(customerId: string, payload: { invoice_id: string; amount_cents?: number }) {
    return api<Record<string, unknown>>(
      `/v1/admin/wallets/${customerId}/apply-to-invoice`,
      {
        method: 'POST',
        body: payload,
        queueWhenOffline: true,
      }
    );
  },
  adjust(
    customerId: string,
    payload: { amount_cents: number; description: string; notes?: string | null }
  ) {
    return api<AdminWallet>(`/v1/admin/wallets/${customerId}/adjust`, {
      method: 'POST',
      body: payload,
      queueWhenOffline: true,
    });
  },
  generateMonthlyStatement(
    customerId: string,
    payload: { year: number; month: number; locale?: string }
  ) {
    return api<{ invoice_id?: string; invoice_number?: string }>(
      `/v1/admin/wallets/${customerId}/generate-monthly-statement`,
      {
        method: 'POST',
        body: payload,
        queueWhenOffline: true,
      }
    );
  },
};

export const adminHealthService = {
  overview() {
    return api<HealthCheckResult>('/v1/admin/health');
  },
  database() {
    return api<HealthCheckResult>('/v1/admin/health/database');
  },
  queue() {
    return api<HealthCheckResult>('/v1/admin/health/queue');
  },
  mollie() {
    return api<HealthCheckResult>('/v1/admin/health/mollie');
  },
  mail() {
    return api<HealthCheckResult>('/v1/admin/health/mail');
  },
  storage() {
    return api<HealthCheckResult>('/v1/admin/health/storage');
  },
  webhooks() {
    return api<HealthCheckResult>('/v1/admin/health/webhooks');
  },
  // Trello #104: security dashboard panels (failed logins, locked users, suspicious IPs…).
  security() {
    return api<Record<string, unknown>>('/v1/admin/health/security');
  },
};

// Trello #104: Security / Observability / Governance platform — frontend surfaces.
export const governanceService = {
  // Pillar 8 — frontend journey tracking (batched).
  trackEvent(events: Array<Record<string, unknown>>) {
    return api<{ tracked: number }>('/v1/track-event', {
      method: 'POST',
      body: { events },
      queueWhenOffline: true,
    }).catch(() => ({ tracked: 0 }));
  },
  // Pillar 15 — API credential vault.
  async apiCredentials(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/api-credentials', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  createApiCredential(payload: Record<string, unknown>) {
    return api<Record<string, unknown>>('/v1/admin/api-credentials', { method: 'POST', body: payload });
  },
  revealApiCredential(id: string) {
    return api<Record<string, unknown>>(`/v1/admin/api-credentials/${id}/reveal`, { method: 'POST' });
  },
  deleteApiCredential(id: string) {
    return api<{ message?: string }>(`/v1/admin/api-credentials/${id}`, { method: 'DELETE' });
  },
  // Pillar 20 — GDPR data export + anonymisation.
  gdprExport(customerId: string) {
    return api<Record<string, unknown>>(`/v1/admin/gdpr/customers/${customerId}/export`);
  },
  gdprAnonymize(customerId: string, payload: { confirm: string; reason: string }) {
    return api<Record<string, unknown>>(`/v1/admin/gdpr/customers/${customerId}/anonymize`, {
      method: 'POST',
      body: payload,
    });
  },
  // Pillar 21 — backup runs.
  async backupRuns(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/backup-runs', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  createBackupRun(payload: { type: string; notes?: string }) {
    return api<Record<string, unknown>>('/v1/admin/backup-runs', { method: 'POST', body: payload });
  },
  // Pillar 22 — incident response.
  async incidents(query?: Record<string, string | number | boolean | undefined>) {
    const res = await api<unknown>('/v1/admin/incidents', { query });
    return asPaginated<Record<string, unknown>>(res);
  },
  incident(id: string) {
    return api<Record<string, unknown>>(`/v1/admin/incidents/${id}`);
  },
  createIncident(payload: Record<string, unknown>) {
    return api<Record<string, unknown>>('/v1/admin/incidents', { method: 'POST', body: payload });
  },
  updateIncident(id: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/admin/incidents/${id}`, { method: 'PATCH', body: payload });
  },
};

export const repairService = {
  resendInvoiceEmail(invoiceId: string) {
    return api<Record<string, unknown>>(
      `/v1/admin/repair/invoices/${invoiceId}/resend-email`,
      { method: 'POST' }
    );
  },
  regenerateInvoicePdf(invoiceId: string) {
    return api<Record<string, unknown>>(
      `/v1/admin/repair/invoices/${invoiceId}/regenerate-pdf`,
      { method: 'POST' }
    );
  },
  syncMollieStatus() {
    return api<Record<string, unknown>>('/v1/admin/repair/payments/sync-mollie-status', {
      method: 'POST',
    });
  },
  async mismatchedPayments() {
    const res = await api<unknown>('/v1/admin/repair/payments/mismatched');
    return asArray<Payment>(res);
  },
  retryPaymentWebhook(paymentId: string) {
    return api<Record<string, unknown>>(
      `/v1/admin/repair/payments/${paymentId}/retry-webhook`,
      { method: 'POST' }
    );
  },
  async failedWebhooks() {
    const res = await api<unknown>('/v1/admin/repair/webhooks/failed');
    return asArray<Record<string, unknown>>(res);
  },
  replayWebhook(webhookId: string) {
    return api<Record<string, unknown>>(
      `/v1/admin/repair/webhooks/${webhookId}/replay`,
      { method: 'POST' }
    );
  },
  recalculatePaidUntil(contractId: string) {
    return api<StallingContract>(
      `/v1/admin/repair/contracts/${contractId}/recalculate-paid-until`,
      { method: 'POST' }
    );
  },
  mergeCustomers(payload: {
    main_customer_id: string;
    duplicate_customer_id: string;
    reason: string;
  }) {
    return api<Record<string, unknown>>('/v1/admin/repair/customers/merge', {
      method: 'POST',
      body: payload,
    });
  },
  async syncBatches() {
    const res = await api<unknown>('/v1/admin/repair/sync/batches');
    return asArray<Record<string, unknown>>(res);
  },
  async syncConflicts() {
    const res = await api<unknown>('/v1/admin/repair/sync/conflicts');
    return asArray<Record<string, unknown>>(res);
  },
  resolveSyncConflict(
    syncChangeId: string,
    payload: { resolution: 'keep_server' | 'use_client'; reason: string }
  ) {
    return api<Record<string, unknown>>(
      `/v1/admin/repair/sync/conflicts/${syncChangeId}/resolve`,
      { method: 'POST', body: payload }
    );
  },
  idempotencyKey(key: string) {
    return api<Record<string, unknown>>(
      `/v1/admin/repair/sync/idempotency/${encodeURIComponent(key)}`
    );
  },
};

export const healthService = {
  status() {
    return api<{ status: string; service: string; version: string; time: string }>('/health', {
      auth: false,
    });
  },
};

/* --- Public site content (Trello #77 FAQ, #59 opening hours) --- */

export interface FaqQuestion {
  cat?: string;
  q: string;
  a: string;
  order?: number;
  active?: boolean;
}

export interface FaqContent {
  faq: {
    heading?: string;
    intro?: string;
    questions: FaqQuestion[];
  };
  contact: {
    show_chat: boolean;
    chat_label?: string | null;
    company?: Record<string, unknown>;
  };
}

export interface OpeningHoursDay {
  day: string;
  label: string;
  open: string | null;
  close: string | null;
  closed: boolean;
  display: string;
  is_today?: boolean;
}

export interface OpeningHoursResponse {
  status: {
    is_open: boolean;
    label: string;
    detail?: string | null;
    closes_at?: string | null;
    opens_at?: string | null;
    next_open_day?: string | null;
    next_open_time?: string | null;
  };
  hours: OpeningHoursDay[];
}

// Trello #112: Inline CMS / Visual Editor — public read + admin upsert endpoints.
export const cmsService = {
  // Public: fetch all editable content/media/seo/global blocks for a page.
  pageContent(page: string, locale?: string) {
    return api<Record<string, unknown>>('/v1/cms/page-content', {
      auth: false,
      query: { page, locale },
    });
  },
  // Admin upserts (key-addressed; partial value_by_locale merges server-side).
  saveContentBlock(key: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/admin/cms/content-blocks/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: payload,
    });
  },
  uploadMediaBlock(key: string, formData: FormData) {
    return api<Record<string, unknown>>(`/v1/admin/cms/media-blocks/${encodeURIComponent(key)}/upload`, {
      method: 'POST',
      body: formData,
    });
  },
  saveMediaBlock(key: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/admin/cms/media-blocks/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: payload,
    });
  },
  saveSeo(slug: string, payload: Record<string, unknown>) {
    return api<Record<string, unknown>>(`/v1/admin/cms/seo/${encodeURIComponent(slug)}`, {
      method: 'PATCH',
      body: payload,
    });
  },
  globalSettings() {
    return api<Record<string, unknown>>('/v1/admin/cms/global-settings');
  },
  saveGlobalSetting(key: string, payload: { value: unknown }) {
    return api<Record<string, unknown>>(`/v1/admin/cms/global-settings/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: payload,
    });
  },
};

export const contentService = {
  faq(locale?: string) {
    return api<FaqContent>('/v1/content/faq', {
      auth: false,
      query: locale ? { locale } : undefined,
    });
  },
  contact(locale?: string) {
    return api<FaqContent['contact']>('/v1/content/contact', {
      auth: false,
      query: locale ? { locale } : undefined,
    });
  },
  openingHours(locale?: string) {
    return api<OpeningHoursResponse>('/v1/opening-hours', {
      auth: false,
      query: locale ? { locale } : undefined,
    });
  },
  // Admin FAQ editor (Trello #77)
  faqSettings() {
    return api<Record<string, unknown>>('/v1/admin/settings/faq');
  },
  updateFaqSettings(payload: Record<string, unknown>) {
    return api<Record<string, unknown>>('/v1/admin/settings/faq', {
      method: 'PATCH',
      body: payload,
      queueWhenOffline: true,
    });
  },
};

// Trello #98 / #100: public service catalog — diensten pages read tariffs
// from the single product DB instead of the static front-end table.
export interface ServiceCatalogTariff {
  range_from_cm: number;
  range_to_cm: number;
  range_label: string;
  price_type: string;
  price_incl_vat?: number;
  price_incl_vat_euros?: number;
  display_price: string;
  duration_minutes?: number;
  channel?: string;
  is_on_request: boolean;
}
export interface ServiceCatalogService {
  code: string;
  slug?: string;
  service_code?: string;
  name?: string;
  category?: string;
  description?: string;
  group?: { code?: string; name?: string; color?: string } | null;
  tariffs?: ServiceCatalogTariff[];
  visibility?: { kassa?: boolean; calculator?: boolean; public?: boolean; booking?: boolean };
}
export interface ServiceCatalogPage {
  page?: { slug?: string; title?: string };
  services: ServiceCatalogService[];
}
export const serviceCatalogService = {
  page(slug: string) {
    return api<ServiceCatalogPage>(`/v1/service-catalog/pages/${slug}`, { auth: false });
  },
  services(group?: string) {
    return api<{ services: ServiceCatalogService[] }>('/v1/service-catalog/services', {
      auth: false,
      query: group ? { group } : undefined,
    });
  },
};

// ── Dynamic Form Builder ─────────────────────────────────────────────────────

export interface FormTemplate {
  id: string;
  name_json: Record<string, string>;
  description_json?: Record<string, string> | null;
  category: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  offline_enabled: boolean;
  i18n_enabled: boolean;
  allowed_roles_json?: string[] | null;
  questions_count?: number | null;
  responses_count?: number | null;
  questions?: FormQuestion[];
  logic_rules?: FormLogicRule[];
  created_at?: string;
  updated_at?: string;
}

export interface FormQuestion {
  id: string;
  form_template_id: string;
  question_key: string;
  type: string;
  label_json: Record<string, string>;
  help_text_json?: Record<string, string> | null;
  placeholder_json?: Record<string, string> | null;
  sort_order: number;
  required: boolean;
  validation_json?: Record<string, unknown> | null;
  options_json?: Array<{ value: string; label_json: Record<string, string> }> | null;
  visible_by_default: boolean;
  unit?: string | null;
}

export interface FormLogicRule {
  id: string;
  source_question_id?: string | null;
  source_question_key?: string | null;
  operator: string;
  value_json?: unknown;
  action: string;
  target_question_id?: string | null;
  target_question_key?: string | null;
  make_required: boolean;
  sort_order: number;
}

export interface FormResponse {
  id: string;
  form_template_id: string;
  form_version: number;
  template_name?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  boat_id?: string | null;
  stalling_id?: string | null;
  status: string;
  sent_channel?: string | null;
  sent_at?: string | null;
  submitted_at?: string | null;
  offline_created: boolean;
  answers_count?: number | null;
  answers?: FormAnswer[];
  template?: FormTemplate | null;
  created_at?: string;
}

export interface FormAnswer {
  id: string;
  question_id?: string | null;
  question_key: string;
  answer_value_json?: unknown;
  answer_text?: string | null;
  answered_at?: string | null;
}

async function asPaginatedForms<T>(res: unknown) {
  const r = res as {
    data: T[];
    meta: { current_page: number; per_page: number; total: number; last_page: number; from: number | null; to: number | null };
  };
  // Ensure from/to always exist (backend may omit them on empty pages)
  if (r.meta.from === undefined) r.meta.from = null;
  if (r.meta.to === undefined) r.meta.to = null;
  return r;
}

export const formsService = {
  async list(query?: Record<string, string | number | undefined>) {
    const res = await api<unknown>('/v1/forms', { query: query as Record<string, string> });
    return asPaginatedForms<FormTemplate>(res);
  },

  get(id: string) {
    return api<FormTemplate>(`/v1/forms/${id}`);
  },

  create(payload: Partial<FormTemplate>) {
    return api<FormTemplate>('/v1/forms', { method: 'POST', body: payload });
  },

  update(id: string, payload: Partial<FormTemplate>) {
    return api<FormTemplate>(`/v1/forms/${id}`, { method: 'PATCH', body: payload });
  },

  destroy(id: string) {
    return api<{ deleted: boolean }>(`/v1/forms/${id}`, { method: 'DELETE' });
  },

  // Questions
  addQuestion(templateId: string, payload: Partial<FormQuestion>) {
    return api<FormQuestion>(`/v1/forms/${templateId}/questions`, { method: 'POST', body: payload });
  },

  updateQuestion(templateId: string, questionId: string, payload: Partial<FormQuestion>) {
    return api<FormQuestion>(`/v1/forms/${templateId}/questions/${questionId}`, { method: 'PATCH', body: payload });
  },

  deleteQuestion(templateId: string, questionId: string) {
    return api<{ deleted: boolean }>(`/v1/forms/${templateId}/questions/${questionId}`, { method: 'DELETE' });
  },

  reorderQuestions(templateId: string, order: string[]) {
    return api<{ reordered: boolean }>(`/v1/forms/${templateId}/questions/reorder`, { method: 'PATCH', body: { order } });
  },

  // Responses
  async responses(templateId: string, query?: Record<string, string | undefined>) {
    const res = await api<unknown>(`/v1/forms/${templateId}/responses`, { query: query as Record<string, string> });
    return asPaginatedForms<FormResponse>(res);
  },

  createResponse(templateId: string, payload: Record<string, unknown>) {
    return api<FormResponse>(`/v1/forms/${templateId}/responses`, { method: 'POST', body: payload });
  },

  getResponse(responseId: string) {
    return api<FormResponse>(`/v1/form-responses/${responseId}`);
  },

  updateResponse(responseId: string, payload: Record<string, unknown>) {
    return api<FormResponse>(`/v1/form-responses/${responseId}`, { method: 'PATCH', body: payload });
  },

  submitResponse(responseId: string) {
    return api<FormResponse>(`/v1/form-responses/${responseId}/submit`, { method: 'POST' });
  },

  // Stalling helpers
  async stallingForms(stallingId: string) {
    const res = await api<unknown>(`/v1/stalling/${stallingId}/forms`);
    return (res as { data: FormResponse[] }).data;
  },

  sendToStalling(stallingId: string, templateId: string, payload?: Record<string, string>) {
    return api<FormResponse>(`/v1/stalling/${stallingId}/forms/${templateId}/send`, {
      method: 'POST',
      body: payload ?? {},
    });
  },
};

export function unwrapData<T>(payload: unknown, key: string): T {
  return maybeResource<T>(payload, key);
}

export type Paginated<T> = PaginatedResponse<T>;
