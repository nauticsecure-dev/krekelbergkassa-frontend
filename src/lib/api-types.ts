export type Role = 'customer' | 'staff' | 'admin' | 'manager' | 'guest';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  locale?: string;
  avatarUrl?: string | null;
  permissions?: string[];
  two_factor_enabled?: boolean;
  last_login_at?: string;
}

export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
  meta?: PaginationMeta;
}

export interface Customer {
  id: string;
  customer_number: string;
  name: string;
  company_name: string | null;
  is_business: boolean;
  email: string | null;
  billing_email: string | null;
  phone: string | null;
  preferred_locale: string;
  vat_number: string | null;
  notes: string | null;
  boats_count?: number;
  boats?: Boat[];
  created_at: string;
  updated_at: string;
  // Trello #76: user/customer management
  gender?: string | null;
  status?: string | null;
  is_blocked?: boolean;
  blocked_at?: string | null;
  block_reason?: string | null;
  last_login_at?: string | null;
  last_active_at?: string | null;
  city?: string | null;
  country?: string | null;
}

export type BoatType = 'motor' | 'sail' | 'rib' | 'trailer' | 'other';

export interface Boat {
  id: string;
  customer_id: string;
  name: string;
  type: BoatType | string;
  registration_number: string | null;
  length_cm: number | null;
  width_cm: number | null;
  length_metres: number | null;
  surface_area_cm2: number | null;
  location_code: string | null;
  photo_url: string | null;
  notes: string | null;
  customer?: Customer;
  created_at: string;
  updated_at: string;
}

export interface StallingContract {
  id: string;
  contract_number: string;
  type: 'winter' | 'summer' | 'week' | 'year' | string;
  status: string;
  start_date: string;
  end_date: string;
  period_label: string;
  is_expired: boolean;
  is_overdue: boolean;
  billing_type: 'one_time' | 'monthly' | string;
  billing_interval: 'monthly' | 'yearly' | string | null;
  price_total: number;
  price_per_month: number;
  price_total_euros: number;
  paid_until: string | null;
  next_invoice_date: string | null;
  auto_invoice: boolean;
  payment_status: 'open' | 'expiring' | 'overdue' | 'paid' | 'cancelled' | string;
  open_balance_cents: number;
  notes: string | null;
  customer?: Customer;
  boat?: Boat;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: string;
  unit_price: number;
  vat_rate: string;
  vat_amount: number;
  line_total: number;
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Payment {
  id: string;
  invoice_id: string;
  provider: string;
  provider_payment_id: string | null;
  method: string | null;
  status: string;
  amount: number;
  amount_euros: number;
  currency: string;
  checkout_url: string | null;
  paid_at: string | null;
  reconciled_at: string | null;
  created_at: string;
  customer?: Customer;
}

export interface Reminder {
  id: string;
  invoice_id: string;
  customer_id: string;
  type: string;
  channel: string;
  locale: string;
  subject: string | null;
  body: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  source: 'kassa' | 'stalling' | 'manual' | 'calculator' | string;
  status: string;
  locale: string;
  currency: string;
  subtotal_cents: number;
  vat_amount_cents: number;
  total_amount_cents: number;
  subtotal_euros: number;
  vat_amount_euros: number;
  total_amount_euros: number;
  outstanding_cents: number;
  is_fully_paid: boolean;
  is_overdue: boolean;
  is_sent: boolean;
  reminder_count: number;
  last_reminder_sent_at: string | null;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  customer_snapshot?: Record<string, unknown> | null;
  company_snapshot?: Record<string, unknown> | null;
  customer?: Customer;
  lines?: InvoiceLine[];
  payments?: Payment[];
  stalling_contract?: StallingContract | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  code: string;
  service_code: string | null;
  name: string;
  category: string | null;
  description: string | null;
  vat_rate: string;
  price_excl_vat: number;
  price_incl_vat: number;
  price_excl_vat_euros: number;
  price_incl_vat_euros: number;
  active: boolean;
  barcode?: string | null;
  search_code?: string | null;
  sku?: string | null;
  supplier?: string | null;
  color?: string | null;
  image_url?: string | null;
  tags?: string[] | null;
  aliases?: string[] | null;
  product_group_id?: string | null;
  group?: { code?: string; name?: string; color?: string } | null;
  // Trello #80/#86: POS rendering + favourites
  display_color?: string | null;
  display_icon?: string | null;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingRule {
  id: string;
  product_id: string;
  service_code: string | null;
  range_from_cm: number;
  range_to_cm: number;
  range_label: string;
  price_excl_vat: number;
  price_incl_vat: number;
  price_excl_vat_euros: number;
  price_incl_vat_euros: number;
  currency: string;
  valid_from: string | null;
  valid_to: string | null;
  is_valid_now: boolean;
  priority: number;
  channel: string;
  active: boolean;
  product?: Product;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  invoice_number: string;
  idempotency_key: string;
  device_id: string;
  status: string;
  payment_status: 'paid' | 'open' | string;
  subtotal_cents: number | string;
  vat_amount_cents: number | string;
  total_amount_cents: number | string;
  total_euros: number | string;
  currency: string;
  paid_at: string | null;
  created_at: string;
  customer?: Customer | null;
  lines?: InvoiceLine[];
  payments?: Payment[];
  // Trello #62: recent-sales deep links + display helpers
  invoice_id?: string | null;
  invoice_url?: string | null;
  admin_url?: string | null;
  total_amount_euros?: number | string | null;
  customer_name?: string | null;
  payment_methods?: string[];
  created_date?: string | null;
  created_time?: string | null;
}

export interface KassaCheckoutPayment {
  id: string;
  provider: string;
  method: string | null;
  status: string;
  checkout_url: string | null;
  expires_at?: string | null;
}

export interface KassaCheckoutLine {
  description: string;
  quantity: string | number;
  unit_price: number;
  vat_rate: string | number;
  line_total: number;
  line_total_euros?: number;
}

export interface KassaCheckoutResponse {
  sale_id?: string;
  invoice_id?: string;
  invoice_number?: string;
  idempotency_key?: string | null;
  status?: string;
  payment_status?: string;
  subtotal_cents?: number;
  vat_amount_cents?: number;
  total_amount_cents?: number;
  total_euros?: number;
  currency?: string;
  device_id?: string;
  created_at?: string;
  payment?: KassaCheckoutPayment | null;
  checkout_url?: string | null;
  payment_url?: string | null;
  url?: string | null;
  message?: string;
  lines?: KassaCheckoutLine[];
}

// Trello #72: Mollie QR payment session
export interface KassaQrSession {
  session_id: string;
  status: string;
  amount_cents?: number;
  currency?: string;
  checkout_url?: string | null;
  qr_payload?: string | null;
  poll_url?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  payment_id?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
  completed_at?: string | null;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  actor_type: string;
  reason: string | null;
  user?: SessionUser;
  created_at: string;
}

export interface SyncDevice {
  id: string;
  device_id: string;
  device_name: string | null;
  device_type: string | null;
  ip_address: string | null;
  user_agent: string | null;
  active: boolean;
  last_seen_at: string | null;
  last_sync_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
}

export interface AppSettings {
  company: {
    name: string;
    kvk: string | null;
    vat_number: string | null;
    email: string;
    phone: string | null;
    iban: string | null;
    address: {
      street: string;
      postal_code: string;
      city: string;
      country: string;
    };
  };
  invoicing: {
    invoice_prefix: string;
    default_due_days: number;
    currency: string;
    default_vat_rate: number;
    reminder_first_days: number;
    reminder_second_days: number;
    reminder_final_days: number;
  };
  payments: {
    provider: string;
    connected: boolean;
    test_mode: boolean;
    enabled_methods: string[];
  };
  locales: {
    default_locale: string;
    fallback_locale: string;
    supported_locales: string[];
  };
}

export interface PortalCustomer {
  id: string;
  customer_number: string;
  name: string;
  email: string;
  phone: string;
  preferred_locale: string;
}

export interface PortalInvoice {
  id: string;
  invoice_number: string;
  source: string;
  status: string;
  locale: string;
  currency: string;
  subtotal_cents: number | string;
  vat_amount_cents: number | string;
  total_amount_cents: number | string;
  total_amount_euros: number | string;
  outstanding_cents: number | string;
  is_fully_paid: boolean | string;
  is_overdue: boolean | string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  pdf_url: string;
  lines?: InvoiceLine[];
  payments?: Payment[];
  credited_invoice?: { id?: string; invoice_number?: string; pdf_url?: string } | null;
  credit_notes?: Array<{ id?: string; invoice_number?: string; pdf_url?: string; status?: string }>;
  documents?: Array<{
    type?: string;
    label?: string;
    invoice_id?: string;
    invoice_number?: string;
    pdf_url?: string;
    open_url?: string;
    download_url?: string;
  }>;
  pdf?: {
    status?: string;
    open_url?: string;
    download_url?: string;
  };
}

export interface PortalMe {
  customer: PortalCustomer;
  summary: {
    open_balance_cents: number | string;
    open_invoices_count: number;
    boats_count: number | string;
    active_contracts_count: number;
  };
}

export interface PortalContract {
  id: string;
  contract_number: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  period_label: string;
  paid_until: string | null;
  open_balance_cents: number;
  boat?: PortalBoat;
}

export interface PortalBoat {
  id: string;
  name: string;
  type: string;
  registration_number: string;
  length_cm: number | string;
  width_cm: number | string;
  length_metres: number | string;
  location_code: string;
  photo_url: string;
}

export interface Appointment {
  id: string;
  customer_id: string;
  boat_id: string;
  location_id: string | null;
  service_codes: string[];
  price_snapshot: unknown[] | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  service_minutes: number;
  location_extra_minutes: number;
  status: string;
  approval_type: string;
  cancellation_reason: string | null;
  invoice_id: string | null;
  customer_notes: string | null;
  staff_notes: string | null;
  photo_ids: unknown[] | null;
  confirmed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  boat?: PortalBoat | Boat;
}

export interface PortalTimelineItem {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  message?: string;
  priority?: string;
  status?: string;
  related_type?: string | null;
  related_id?: string | null;
  read_at?: string | null;
  created_at?: string;
}

export interface PortalTimelinePagination {
  page: number;
  per_page: number;
  total: number;
  has_more: boolean;
  unread_count: number;
}

export interface PortalTimelineResponse {
  items: PortalTimelineItem[];
  pagination: PortalTimelinePagination;
}

export interface PortalNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
}

export interface PortalNotificationsResponse {
  unread_count: number;
  latest: PortalNotificationItem[];
}

export interface PortalAppointmentsResponse {
  data: Appointment[];
  total: number;
  has_more: boolean;
}

export interface PortalWallet {
  balance_cents?: number | string;
  balance_euros?: number | string;
  currency?: string;
  active?: boolean;
}

export interface SyncStatus {
  status: string;
  online: boolean;
  last_sync_at: string | null;
  pending_count: number;
  failed_count: number;
  device_id?: string;
  device_name?: string;
}

export type AppointmentStatus =
  | 'pending_manual_review'
  | 'confirmed'
  | 'started'
  | 'out_of_water'
  | 'in_water'
  | 'wash_started'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | string;

export interface OpeningHour {
  id: string;
  type: string;
  day_of_week: number | null;
  specific_date: string | null;
  open_from: string | null;
  open_until: string | null;
  is_closed: boolean;
  label: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BoatLocation {
  id: string;
  code: string;
  section: string | null;
  row: string | null;
  slot: string | null;
  difficulty: string;
  extra_minutes: number;
  is_blocked: boolean;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CalendarConfig {
  regular_hours: OpeningHour[];
  exceptions: OpeningHour[];
  lunch_block: OpeningHour | null;
}

export interface BookingSlotsResponse {
  date: string;
  duration_minutes: string;
  slots: string[];
  is_open: boolean;
}

export interface BookingCalendarDay {
  date: string;
  is_open: boolean;
  open_from: string | null;
  open_until: string | null;
  label: string | null;
}

export interface BookingCalendarResponse {
  days: BookingCalendarDay[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  locale?: string | null;
  two_factor_enabled?: boolean;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  locked_until?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount_cents: number;
  amount_euros?: number;
  description: string;
  notes?: string | null;
  created_at: string;
}

export interface AdminWallet {
  wallet_id?: string;
  balance_cents: number;
  balance_euros: number;
  currency: string;
  has_credit?: boolean;
  transactions: WalletTransaction[];
  total: number;
  has_more?: boolean;
}

export interface HealthCheckResult {
  status: string;
  message?: string;
  latency_ms?: number;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}
