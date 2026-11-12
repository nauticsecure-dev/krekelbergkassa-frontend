"use client";
import { useCatalogUpdates } from '@/lib/catalog-events';

import { TranslatedText } from '@/components/cms/TranslatedText';
import { SearchSelect } from '@/components/ui/SearchSelect';

import * as React from "react";
import Link from "next/link";
import {
  Anchor,
  Banknote,
  Check,
  CreditCard,
  Droplets,
  ExternalLink,
  FileText,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  QrCode,
  ScanLine,
  Search,
  Ship,
  Star,
  Trash2,
  UserPlus,
  Wallet,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
} from "@/components/admin/AdminUi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { LoadingState } from "@/components/admin/DataState";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { BarcodeScannerModal } from "@/components/admin/BarcodeScannerModal";
import {
  boatsService,
  customersService,
  invoicesService,
  kassaService,
  productsService,
} from "@/lib/services";
import { useMutation, useQuery } from "@/lib/hooks/useAsync";
import type { Boat, Customer, Product, KassaCheckoutResponse, KassaQrSession } from "@/lib/api-types";
import { formatCurrency, intlLocale } from "@/lib/format";
import { productPriceExclEuros, productPriceInclEuros } from "@/lib/products";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";
import { generateRequestId } from "@/lib/api";
import { canAccessAdminRoute } from "@/lib/auth-routes";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from '@/lib/permissions';
import { useIntl } from "@/i18n/IntlProvider";
import { tEnum } from "@/i18n/admin-enums";
import { useToast } from "@/components/ui/ToastProvider";
import { getDeviceId } from "@/lib/device";
import { cn } from "@/lib/cn";

interface CartItem {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  product?: Product;
  metadata?: Record<string, unknown>;
  boatName?: string;
}

// Trello #80: resolve a DB-provided Lucide icon name (e.g. "Anchor") to its
// component. Returns null when the name is empty or unknown so callers can fall
// back to the keyword-derived categoryMeta() icon.
function resolveLucideIcon(icon?: string | null): LucideIcon | null {
  if (!icon) return null;
  const map = LucideIcons as unknown as Record<string, LucideIcon>;
  // Accept both "Anchor" and "anchor"/"anchor-icon" style strings.
  const pascal = icon
    .replace(/[-_\s]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  const candidate = map[icon] ?? map[pascal];
  return typeof candidate === "function" || (candidate && "render" in (candidate as object))
    ? (candidate as LucideIcon)
    : null;
}

function catalogIcon(name: string): LucideIcon {
  const key = name.toLowerCase();
  if (/afspuit|wash|clean/.test(key)) return Droplets;
  if (/kraan|kran|lift|crane/.test(key)) return Anchor;
  if (/stalling|winter|storage/.test(key)) return Warehouse;
  if (/onderhoud|repar|maintenance/.test(key)) return Wrench;
  return Ship;
}

export default function KassaPage() {
  const catalogStatus = useCatalogUpdates();
  const { can } = usePermission();
  const { user } = useAuth();
  const canCheckout = can('kassa.checkout');
  const canWriteCustomer = can('customers.write');
  const { locale, t } = useIntl();
  const { push } = useToast();
  const localeTag =
    intlLocale(locale);

  const [query, setQuery] = React.useState("");
  // Trello #80: fast-scan mode (skip confirmation/sound; sent to scan API).
  const [fastScan, setFastScan] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("pin");
  const [note, setNote] = React.useState("");
  // Trello #79: optional total adjustment → separate DISCOUNT line + required reason.
  const [adjustEnabled, setAdjustEnabled] = React.useState(false);
  const [adjustedTotal, setAdjustedTotal] = React.useState("");
  const [adjustmentReason, setAdjustmentReason] = React.useState("");
  const [showNoteModal, setShowNoteModal] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [showSplitModal, setShowSplitModal] = React.useState(false);
  const [showQrModal, setShowQrModal] = React.useState(false);
  const [qrSession, setQrSession] = React.useState<KassaQrSession | null>(null);
  const [qrAttempt, setQrAttempt] = React.useState<Parameters<typeof kassaService.createQrSession>[0] | null>(null);
  const qrSubmitting = React.useRef(false);
  const [qrStarting, setQrStarting] = React.useState(false);
  const [qrCopied, setQrCopied] = React.useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = React.useState<number | null>(null);
  const [qrEmailInput, setQrEmailInput] = React.useState('');
  const [qrPhoneInput, setQrPhoneInput] = React.useState('');
  const [showQrEmailInput, setShowQrEmailInput] = React.useState(false);
  const [showQrPhoneInput, setShowQrPhoneInput] = React.useState(false);
  const [splitPayments, setSplitPayments] = React.useState([
    { method: "pin", amount: "" },
    { method: "cash", amount: "" },
  ]);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [showCustomerModal, setShowCustomerModal] = React.useState(false);
  // Trello #62: searchable customer picker
  const [showCustomerPicker, setShowCustomerPicker] = React.useState(false);
  const [customerPickerSearch, setCustomerPickerSearch] = React.useState("");
  const [pickerSearchDebounced, setPickerSearchDebounced] = React.useState("");
  const [editingCustomerId, setEditingCustomerId] = React.useState<string | null>(null);
  const [editCustomer, setEditCustomer] = React.useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    country: "",
    google_place_id: "",
    latitude: null as number | null,
    longitude: null as number | null,
    notes: "",
  });
  const [newCustomer, setNewCustomer] = React.useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    street: "",
    house_number: "",
    postal_code: "",
    city: "",
    country: "",
    google_place_id: "",
    latitude: null as number | null,
    longitude: null as number | null,
    notes: "",
  });
  const [showMobileCart, setShowMobileCart] = React.useState(false);
  const [checkoutConfirm, setCheckoutConfirm] = React.useState<
    "standard" | "split" | "qr" | "on_account" | null
  >(null);

  const searchRef = React.useRef<HTMLInputElement>(null);

  const pos = (key: string) => tEnum(t, "adminNew.kassa.pos", key);
  const [selectedBoat, setSelectedBoat] = React.useState<Boat | null>(null);
  const [pickedCustomer, setPickedCustomer] = React.useState<(Pick<Customer, "id" | "name"> & { email?: string | null }) | null>(null);
  const [serviceProduct, setServiceProduct] = React.useState<Product | null>(null);
  const [serviceLength, setServiceLength] = React.useState("");
  const [serviceWidth, setServiceWidth] = React.useState("");
  const [serviceWeight, setServiceWeight] = React.useState("");
  const [serviceDate, setServiceDate] = React.useState("");
  const [editingLine, setEditingLine] = React.useState<CartItem | null>(null);
  const [showPayment, setShowPayment] = React.useState(false);
  const [showClear, setShowClear] = React.useState(false);
  const [showBoats, setShowBoats] = React.useState(false);
  const [sale, setSale] = React.useState<KassaCheckoutResponse | null>(null);
  const [saleCustomerId, setSaleCustomerId] = React.useState("");
  const [checkingSale, setCheckingSale] = React.useState(false);
  const saleStorageKey = user?.id ? "kassa.sale." + user.id : null;
  React.useEffect(() => {
    if (!saleStorageKey) return;
    try {
      const saved = sessionStorage.getItem(saleStorageKey);
      const restored = saved ? JSON.parse(saved) : null;
      setSale(restored?.sale ?? null);
      setSaleCustomerId(restored?.customerId ?? "");
    } catch {
      setSale(null);
      setSaleCustomerId("");
    }
  }, [saleStorageKey]);
  const rememberSale = React.useCallback((next: KassaCheckoutResponse | null, customerId = "") => {
    setSale(next);
    setSaleCustomerId(customerId);
    if (!saleStorageKey) return;
    try {
      if (next) sessionStorage.setItem(saleStorageKey, JSON.stringify({ sale: next, customerId }));
      else sessionStorage.removeItem(saleStorageKey);
    } catch {
      // The current sale remains open in component state.
    }
  }, [saleStorageKey]);
  const [receiptBusy, setReceiptBusy] = React.useState(false);
  const [receiptUrl, setReceiptUrl] = React.useState<string | null>(null);
  const [receiptStatus, setReceiptStatus] = React.useState("");
  const [submitted, setSubmitted] = React.useState<Parameters<typeof kassaService.checkout>[0] | null>(null);
  const submitting = React.useRef(false);
  const [search, setSearch] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const matches = query.trim() === search && search.length >= 2;
  const boatSearch = useQuery(["kassa-boats", search, showBoats, customerId], () =>
    can("boats.view") && (search.length >= 2 || showBoats)
      ? boatsService.list({
          search: search.length >= 2 ? search : undefined,
          customer_id: showBoats ? customerId || undefined : undefined,
          per_page: 8,
        })
      : Promise.resolve(null),
  );
  const customerSearch = useQuery(["kassa-customer-search", search], () =>
    can("customers.view") && search.length >= 2
      ? customersService.list({ search, per_page: 5 })
      : Promise.resolve(null),
  );
  const qrPending = !!qrSession && !["paid", "completed", "expired", "failed", "canceled", "cancelled"].includes(qrSession.status);
  const basketLocked = qrStarting || !!qrAttempt || qrPending || !!submitted || !!sale;
  const basketContextChanged = cart.some((item) => item.metadata?.boat_id && item.metadata.boat_id !== selectedBoat?.id);

  const productsQuery = useQuery(["products"], () =>
    productsService.list({ per_page: 200, active: true, show_in_kassa: true }),
  );
  const productSearch = useQuery(["kassa-product-search", search], () =>
    search.length >= 2
      ? productsService.list({ search, active: true, show_in_kassa: true, per_page: 40 })
          .then((result) => ({ search, products: result.data }))
      : Promise.resolve(null),
  );
  const paymentMethods = useQuery(["kassa-payment-methods", showPayment], () =>
    canCheckout && showPayment ? kassaService.paymentMethods() : Promise.resolve(null));
  const customersQuery = useQuery(["customers-kassa"], () =>
    customersService.list({ per_page: 100 }),
  );
  const createCustomer = useMutation(customersService.create);
  const updateCustomer = useMutation(
    ({ id, ...payload }: Record<string, unknown> & { id: string }) =>
      customersService.update(id, payload)
  );
  const checkout = useMutation(kassaService.checkout);
  const qrStorageKey = user?.id ? "kassa.qr." + user.id : null;
  React.useEffect(() => {
    if (!qrStorageKey) return;
    try {
      const saved = sessionStorage.getItem(qrStorageKey);
      if (saved) setQrAttempt(JSON.parse(saved));
    } catch {
      // A pending request remains recoverable in memory while the page is open.
    }
  }, [qrStorageKey]);
  const rememberQr = React.useCallback((request: Parameters<typeof kassaService.createQrSession>[0] | null) => {
    setQrAttempt(request);
    if (!qrStorageKey) return;
    try {
      if (request) sessionStorage.setItem(qrStorageKey, JSON.stringify(request));
      else sessionStorage.removeItem(qrStorageKey);
    } catch {
      // A pending request remains recoverable in memory while the page is open.
    }
  }, [qrStorageKey]);
  const checkoutStorageKey = user?.id ? "kassa.checkout." + user.id : null;
  React.useEffect(() => {
    if (!checkoutStorageKey) return;
    try {
      if (saleStorageKey && sessionStorage.getItem(saleStorageKey)) {
        sessionStorage.removeItem(checkoutStorageKey);
        setSubmitted(null);
        return;
      }
      const saved = sessionStorage.getItem(checkoutStorageKey);
      if (saved) setSubmitted(JSON.parse(saved));
    } catch {
      // Checkout still supports retry while the page remains open.
    }
  }, [checkoutStorageKey, saleStorageKey]);
  const rememberCheckout = (request: Parameters<typeof kassaService.checkout>[0] | null) => {
    setSubmitted(request);
    if (!checkoutStorageKey) return;
    try {
      if (request) sessionStorage.setItem(checkoutStorageKey, JSON.stringify(request));
      else sessionStorage.removeItem(checkoutStorageKey);
    } catch {
      // The current attempt remains available in component state.
    }
  };
  const quote = useMutation(kassaService.createQuotation);
  const [quotation, setQuotation] = React.useState<{ id: string; reference: string } | null>(null);

  // Debounce picker search so we don't fire on every keystroke.
  React.useEffect(() => {
    const timer = setTimeout(() => setPickerSearchDebounced(customerPickerSearch), 280);
    return () => clearTimeout(timer);
  }, [customerPickerSearch]);

  const pickerResultsQuery = useQuery(
    ["customers-picker", pickerSearchDebounced, showCustomerPicker],
    () =>
      showCustomerPicker
        ? customersService.list({ search: pickerSearchDebounced || undefined, per_page: 10 })
        : Promise.resolve(null),
  );
  // Trello #80/#86: favourites, recently-used and bundles for fast checkout.
  const bundlesQuery = useQuery(["kassa-bundles"], () =>
    productsService.bundles().catch(() => []),
  );
  // Trello #80: recently-used seeded from the backend.
  const recentQuery = useQuery(["kassa-recent-products"], () =>
    productsService.recent({ per_page: 20 }).catch(() => []),
  );
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set());
  const [recentIds, setRecentIds] = React.useState<string[]>([]);

  // Seed favourites from the product resource's is_favorite flag.
  React.useEffect(() => {
    const favs = productsQuery.data?.data
      ?.filter((p) => p.is_favorite)
      .map((p) => p.id);
    if (favs && favs.length) setFavoriteIds(new Set(favs));
  }, [productsQuery.data?.data]);

  // Recently-used is tracked per device in localStorage (offline-friendly) and
  // seeded from the backend (Trello #80: GET /products/recent) on mount.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("kassa-recent-products");
      if (raw) setRecentIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);
  // Merge backend recent ids in front of the local list once they load.
  React.useEffect(() => {
    const recentList = (recentQuery.data ?? []) as Product[];
    const backend = recentList.map((p) => p.id).filter(Boolean);
    if (!backend.length) return;
    setRecentIds((prev) => {
      const merged = [...backend, ...prev.filter((id) => !backend.includes(id))].slice(0, 12);
      try {
        localStorage.setItem("kassa-recent-products", JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    });
  }, [recentQuery.data]);

  // Trello #80: fast-scan toggle persisted in localStorage.
  React.useEffect(() => {
    try {
      setFastScan(localStorage.getItem("kassa_fast_scan") === "1");
    } catch {
      /* ignore */
    }
  }, []);
  const pushRecent = React.useCallback((productId?: string) => {
    if (!productId) return;
    setRecentIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(
        0,
        8,
      );
      try {
        localStorage.setItem("kassa-recent-products", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    // Trello #80: record server-side too (best effort).
    void productsService.recordRecent(productId).catch(() => {});
  }, []);

  const toggleFavorite = (productId: string) => {
    const on = !favoriteIds.has(productId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(productId);
      else next.delete(productId);
      return next;
    });
    void productsService.setFavorite(productId, on).catch(() => {
      // revert on failure
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (on) next.delete(productId);
        else next.add(productId);
        return next;
      });
    });
  };

  const catalogProducts = React.useMemo(
    () => productsQuery.data?.data ?? [],
    [productsQuery.data?.data],
  );
  const allProducts = React.useMemo(
    () => catalogProducts.filter((product) => product.show_in_kassa !== false),
    [catalogProducts],
  );
  // Trello #107: when opened from a stalling contract's "pay at register" route,
  // pre-fill the cart with the locked deposit line and lock the customer.
  const [prefillLocked, setPrefillLocked] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const amount = p.get("prefill_amount");
    if (!amount) return;
    const cents = Math.round(Number(amount));
    if (!Number.isFinite(cents) || cents <= 0) return;
    const description =
      p.get("description") || t("adminNew.stalling.invoiceLabels.deposit");
    const contractId = p.get("contract_id") ?? "";
    if (p.get("customer_id")) setCustomerId(p.get("customer_id") as string);
    setCart([
      {
        id: `prefill-${contractId || "deposit"}`,
        description,
        quantity: 1,
        unit_price_cents: Math.round((cents * 100) / 121),
      },
    ]);
    setPrefillLocked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = React.useMemo(() => {
    const groups = new Map<string, { label: string; icon: LucideIcon }>();
    for (const product of allProducts) {
      const label = (product.category ?? product.group?.name ?? "").trim();
      if (!label || groups.has(label.toLowerCase())) continue;
      groups.set(label.toLowerCase(), {
        label,
        icon: resolveLucideIcon(product.display_icon) ?? catalogIcon(label),
      });
    }
    return Array.from(groups.values());
  }, [allProducts]);

  const productMatchesText = React.useCallback(
    (product: Product | undefined, q: string) => {
      if (!product) return false;
      const fields = [
        product.name,
        product.code,
        product.category,
        product.service_code,
        product.barcode,
        product.search_code,
        // Trello #86: also match SKU, tags and aliases.
        product.sku,
        ...(product.tags ?? []),
        ...(product.aliases ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(q);
    },
    [],
  );

  const hasLengthPricing = (product: Product) =>
    product.has_pricing_rules || product.pricing_type === "length_range" ||
    product.pricing_type === "per_meter" || !!product.pricing_rules?.length;
  const priceOnRequest = (product: Product) =>
    ["manual", "on_request"].includes(product.pricing_type ?? "") ||
    (!hasLengthPricing(product) && product.price_excl_vat <= 0);

  const addProduct = (product: Product, context?: { length: number; date: string; width?: number; weight?: number }) => {
    if (!canCheckout || product.show_in_kassa === false || product.active === false || basketLocked || prefillLocked) return;
    if (priceOnRequest(product)) {
      push({ tone: "error", title: pos("onRequest") });
      return;
    }
    if (hasLengthPricing(product) && !context) {
      setEditingLine(null);
      setServiceProduct(product);
      setServiceLength(selectedBoat?.length_cm ? String(selectedBoat.length_cm) : "");
      setServiceWidth(selectedBoat?.width_cm ? String(selectedBoat.width_cm) : "");
      setServiceWeight(selectedBoat?.weight_kg ? String(selectedBoat.weight_kg) : "");
      setServiceDate("");
      return;
    }

    const boatId = editingLine ? editingLine.metadata?.boat_id : selectedBoat?.id;
    const boatName = editingLine ? editingLine.boatName : selectedBoat?.name;
    const quantity = editingLine?.quantity ?? 1;
    const description = context ? product.name + ' · ' + context.length + ' cm' : product.name;
    const metadata = context ? {
      ...editingLine?.metadata,
      length_cm: context.length,
      date: context.date || undefined,
      boat_id: boatId,
      width_cm: context.width,
      weight_kg: context.weight,
    } : undefined;
    const line: CartItem = {
      id: editingLine?.id ?? generateRequestId(),
      product_id: product.id,
      description,
      quantity,
      unit_price_cents: context ? 0 : Math.round(productPriceExclEuros(product) * 100),
      product: context ? product : undefined,
      metadata,
      boatName: context ? boatName : undefined,
    };
    setCart((current) => {
      if (editingLine && context) return current.map((item) => item.id === editingLine.id ? line : item);
      const existing = current.find((item) => item.product_id === product.id && JSON.stringify(item.metadata) === JSON.stringify(metadata));
      if (existing) {
        return current.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...current, line];
    });
    if (context) setEditingLine(null);
    pushRecent(product.id);
  };

  // Trello #80: barcode scan — resolve via the backend (search_code / EAN /
  // alias lookup + scan log) and auto-add the matched product. Works for the
  // USB/keyboard search box and the camera scanner (source = "camera").
  const [scanning, setScanning] = React.useState(false);
  const [showCamera, setShowCamera] = React.useState(false);
  const runScan = async (rawCode: string, source = "usb") => {
    const code = rawCode.trim();
    if (!code || !canCheckout || basketLocked || prefillLocked) return;
    setScanning(true);
    try {
      const res = await productsService.scan({
        barcode: code,
        source,
        fast_scan: fastScan,
      });
      if (res.matched && res.product) {
        addProduct(res.product as Product);
        if (source !== "camera") {
          setQuery("");
          searchRef.current?.focus();
        }
      } else {
        push({
          tone: "error",
          title: t("adminNew.kassa.scanNotFound", { code }),
        });
      }
    } catch {
      /* fall back to the client-side text filter already showing results */
    } finally {
      setScanning(false);
    }
  };
  const handleBarcodeScan = () => runScan(query, "usb");

  const removeItem = (id: string) =>
    !basketLocked && setCart((prev) => prev.filter((item) => item.id !== id));

  const changeQty = (id: string, delta: number) =>
    !basketLocked && !prefillLocked && setCart((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p,
      ),
    );

  const cartHas = (productId?: string) =>
    !!productId && cart.some((item) => item.product_id === productId);

  const basketItems = React.useMemo(() => cart.map((item) => ({
    product_id: item.product_id,
    description: item.description,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents,
    metadata: item.metadata,
  })), [cart]);
  const basketQuote = useQuery(
    ["kassa-basket", basketItems, customerId],
    () => canCheckout && basketItems.length
      ? kassaService.quote({ customer_id: customerId || undefined, items: basketItems }).then((value) => ({ items: basketItems, customerId, value }))
      : Promise.resolve(null),
  );
  const reviewed = basketQuote.loading || basketQuote.error || basketQuote.data?.items !== basketItems || basketQuote.data.customerId !== customerId
    ? null : basketQuote.data.value;
  const totalCents = reviewed?.total_cents ?? 0;
  const vatRates = Array.from(new Set(reviewed?.lines.map((line) => line.vat_rate) ?? []));
  const canAdjust = can("kassa.refund") && vatRates.length === 1;
  const checkoutReady = canCheckout && !!reviewed && cart.length > 0 && totalCents >= 0 &&
    !basketLocked && !basketContextChanged && !catalogStatus.changed;
  const money = (cents: number) => formatCurrency(cents / 100, localeTag);

  const PAYMENT_BUTTONS: Array<{
    method: string;
    label: string;
    icon: LucideIcon;
    action?: () => void;
  }> = [
    {
      method: "cash",
      label: t("adminNew.kassa.payment.cash"),
      icon: Banknote,
    },
    {
      method: "pin",
      label: t("adminNew.kassa.payment.pin"),
      icon: CreditCard,
    },
    {
      method: "creditcard",
      label: t("adminNew.kassa.payment.creditcard"),
      icon: CreditCard,
    },
    {
      method: "invoice",
      label: t("adminNew.kassa.payment.invoice"),
      icon: FileText,
    },
    ...["ideal", "bancontact", "banktransfer", "manual", "other"].map((method) => ({
      method,
      label: tEnum(t, "adminNew.kassa.receiptPayment", method),
      icon: Wallet,
    })),
    {
      method: "downpayment",
      label: t("adminNew.kassa.downPayment"),
      icon: Wallet,
      action: () => setShowSplitModal(true),
    },
  ];

  const checkoutMethodLabel = (mode: NonNullable<typeof checkoutConfirm>) => {
    switch (mode) {
      case "qr":
        return t("adminNew.kassa.qrPayment");
      case "on_account":
        return t("adminNew.kassa.onAccount");
      case "split":
        return t("adminNew.kassa.splitPayment");
      default: {
        const labels: Record<string, string> = {
          cash: t("adminNew.kassa.payment.cash"),
          pin: t("adminNew.kassa.payment.pin"),
          invoice: t("adminNew.kassa.payment.invoice"),
          creditcard: t("adminNew.kassa.payment.creditcard"),
        };
        return labels[paymentMethod] ?? PAYMENT_BUTTONS.find((button) => button.method === paymentMethod)?.label ?? paymentMethod;
      }
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteCustomer) return;
    try {
      const created = await createCustomer.mutate({
        name: newCustomer.name,
        email: newCustomer.email || null,
        phone: newCustomer.phone || null,
        company_name: newCustomer.company_name || null,
        is_business: !!newCustomer.company_name,
        notes: newCustomer.notes || null,
        address: newCustomer.street
          ? {
              street: newCustomer.street,
              house_number: newCustomer.house_number || null,
              postal_code: newCustomer.postal_code || null,
              city: newCustomer.city || null,
              country: newCustomer.country || null,
              google_place_id: newCustomer.google_place_id || null,
              latitude: newCustomer.latitude,
              longitude: newCustomer.longitude,
            }
          : undefined,
      });
      chooseCustomer(created);
      setShowCustomerModal(false);
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        company_name: "",
        street: "",
        house_number: "",
        postal_code: "",
        city: "",
        country: "",
        google_place_id: "",
        latitude: null,
        longitude: null,
        notes: "",
      });
      await customersQuery.refetch();
      push({
        tone: "success",
        title: t("adminNew.kassa.toasts.customerCreated"),
      });
    } catch (err) {
      push({
        tone: "error",
        title: t("adminNew.kassa.toasts.customerCreateFailed"),
        message: getApiErrorMessage(err),
      });
    }
  };

  // Trello #72: QR flow uses a payment session (no invoice up front); the
  // webhook finalizes the invoice once Mollie confirms payment.
  const startQrSession = async () => {
    if (!canCheckout || qrSubmitting.current || (!qrAttempt && (!checkoutReady || adjustEnabled || totalCents <= 0))) return;
    qrSubmitting.current = true;
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const uuid = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    const request = qrAttempt ?? {
      session_id: uuid,
      device_id: getDeviceId(),
      customer_id: customerId || undefined,
      method: "ideal",
      expected_total_cents: totalCents,
      sale_note: note || undefined,
      redirect_url: window.location.href,
      items: basketItems,
    };
    rememberQr(request);
    setQrStarting(true);
    setQrSession(null);
    setQrCopied(false);
    qrSettled.current = false;
    setShowPayment(false);
    setShowQrModal(true);
    try {
      const session = await kassaService.createQrSession(request);
      if (request.customer_id) setCustomerId(request.customer_id);
      setQrSession(session);
      setQrAttempt(null);
    } catch (err) {
      if ([400, 422].includes(getApiErrorStatus(err) ?? 0)) {
        rememberQr(null);
        void basketQuote.refetch().catch(() => undefined);
      }
      setShowQrModal(false);
      push({
        tone: "error",
        title: t("adminNew.kassa.toasts.checkoutFailed"),
        message: getApiErrorMessage(err),
      });
    } finally {
      qrSubmitting.current = false;
      setQrStarting(false);
    }
  };

  // Poll the QR session while pending; finalize cart on success.
  const qrSettled = React.useRef(false);
  React.useEffect(() => {
    const id = qrSession?.session_id;
    const status = (qrSession?.status ?? "").toLowerCase();
    if (!id) return;
    if (status === "paid" || status === "completed") {
      if (!qrSettled.current) {
        qrSettled.current = true;
        rememberSale({ payment_status: "paid", invoice_id: qrSession.invoice_id ?? undefined,
          invoice_number: qrSession.invoice_number ?? undefined, total_amount_cents: qrSession.amount_cents }, customerId);
        rememberQr(null);
        setShowQrModal(false);
        setCart([]);
        setNote("");
        setShowPayment(false);
        setShowMobileCart(false);
        setPrefillLocked(false);
        push({
          tone: "success",
          title: t("adminNew.kassa.toasts.checkoutDone"),
        });
      }
      return;
    }
    if (
      status === "expired" ||
      status === "failed" ||
      status === "canceled" ||
      status === "cancelled"
    ) {
      rememberQr(null);
      return;
    }
    let active = true;
    let inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const next = await kassaService.qrSession(id);
        if (active) setQrSession(next);
      } catch {
        // The next poll retries the status check.
      } finally {
        inFlight = false;
      }
    }, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [qrSession, rememberQr, rememberSale, customerId, push, t]);

  // Countdown ticker for QR session expiry
  React.useEffect(() => {
    if (!showQrModal || !qrSession?.expires_at) {
      setQrSecondsLeft(null);
      return;
    }
    const tick = () => {
      const diff = Math.floor((new Date(qrSession.expires_at!).getTime() - Date.now()) / 1000);
      setQrSecondsLeft(Math.max(0, diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [showQrModal, qrSession?.expires_at]);

  // Pre-fill email/phone inputs when guest session is loaded
  React.useEffect(() => {
    if (qrSession?.guest_email && !qrEmailInput) setQrEmailInput(qrSession.guest_email);
    if (qrSession?.guest_phone && !qrPhoneInput) setQrPhoneInput(qrSession.guest_phone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrSession?.session_id]);

  const closeQrModal = () => {
    setShowQrModal(false);
    setQrSecondsLeft(null);
    setQrEmailInput('');
    setQrPhoneInput('');
    setShowQrEmailInput(false);
    setShowQrPhoneInput(false);
  };

  const handleCheckout = async (
    mode: "standard" | "split" | "qr" | "on_account" = "standard",
  ) => {
    if (!canCheckout || submitting.current) return;
    if (mode === "qr") {
      await startQrSession();
      return;
    }
    if (!submitted && (!checkoutReady || (mode === "on_account" && !customerId))) return;
    submitting.current = true;
    try {
      const payload: Parameters<typeof kassaService.checkout>[0] = {
        idempotency_key: Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join(""),
        expected_total_cents: totalCents,
        sale_note: note || undefined,
        device_id: getDeviceId(),
        customer_id: customerId || undefined,
        locale: localeTag,
        on_account_note: note || undefined,
        redirect_url:
          typeof window !== "undefined" ? window.location.href : undefined,
        items: basketItems,
      };

      if (mode === "split") {
        payload.payments = splitPayments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({
            method: p.method,
            amount_cents: Math.round(Number(p.amount) * 100),
          }));
      } else {
        payload.payment_method =
          mode === "on_account" ? "invoice" : paymentMethod;
      }

      // Total adjustment → backend records a DISCOUNT line; reason is mandatory.
      if (!submitted && adjustEnabled && adjustedTotal !== "") {
        if (!adjustmentReason.trim()) {
          push({ tone: "error", title: t("adminNew.kassa.adjustReasonRequired") });
          return;
        }
        payload.adjusted_total_cents = Math.round(Number(adjustedTotal) * 100);
        payload.adjustment_reason = adjustmentReason.trim();
        payload.adjustment_vat_rate = vatRates[0];
      }

      if (!submitted && mode === "split" && !payload.payments?.length) return;
      const request = submitted ?? payload;
      rememberCheckout(request);
      const res = await checkout.mutate(request);
      if (typeof res !== "string") rememberSale(res, request.customer_id ?? "");
      rememberCheckout(null);
      if (request.customer_id) setCustomerId(request.customer_id);
      const checkoutUrl =
        typeof res === "string"
          ? res
          : (res.checkout_url ??
            res.payment?.checkout_url ??
            res.payment_url ??
            res.url);

      setCart([]);
      setNote("");
      setAdjustEnabled(false);
      setAdjustedTotal("");
      setAdjustmentReason("");
      setShowSplitModal(false);
      setShowPayment(false);
      setShowMobileCart(false);
      setPrefillLocked(false);

      if (typeof res === "string" && checkoutUrl) window.location.assign(checkoutUrl);


    } catch (err) {
      if ([400, 422].includes(getApiErrorStatus(err) ?? 0)) {
        rememberCheckout(null);
        void basketQuote.refetch().catch(() => undefined);
      }
      push({
        tone: "error",
        title: t("adminNew.kassa.toasts.checkoutFailed"),
        message: getApiErrorMessage(err),
      });
    } finally {
      submitting.current = false;
    }
  };

  const handleQuote = async () => {
    if (!checkoutReady || !customerId || !can("invoice.create") || quote.loading) return;
    try {
      const saved = await quote.mutate({
        customer_id: customerId,
        locale: localeTag,
        expected_total_cents: totalCents,
        sale_note: note || undefined,
        items: basketItems,
      });
      setQuotation(saved);
    } catch (err) {
      push({
        tone: "error",
        title: t("adminNew.kassa.toasts.quoteFailed"),
        message: getApiErrorMessage(err),
      });
      void basketQuote.refetch().catch(() => undefined);
    }
  };


  const selectedCustomer = pickedCustomer?.id === customerId ? pickedCustomer
    : customersQuery.data?.data.find((customer) => customer.id === customerId);
  const chooseCustomer = (customer: (Pick<Customer, "id" | "name"> & { email?: string | null }) | null) => {
    if (prefillLocked || basketLocked) return;
    setShowBoats(false);
    setCustomerId(customer?.id ?? "");
    setPickedCustomer(customer);
    if (selectedBoat?.customer_id !== customer?.id) setSelectedBoat(null);
    setQuery("");
  };
  const chooseCustomerAfterSale = () => {
    setPickedCustomer(null);
    setCustomerId("");
    setSelectedBoat(null);
    setQuery("");
  };
  const chooseBoat = (boat: Boat) => {
    if (prefillLocked || basketLocked) return;
    chooseCustomer(boat.customer ?? { id: boat.customer_id, name: "" });
    setSelectedBoat(boat);
    setShowBoats(false);
  };

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const modalOpen = Array.from(document.querySelectorAll('[role="dialog"], dialog[open]'))
        .some((dialog) => dialog.getClientRects().length > 0);
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat ||
          target?.closest("input, textarea, select, [contenteditable=true]") || modalOpen) return;
      if (event.key === "/") searchRef.current?.focus();
      else if (event.key === "F2" && !basketLocked && !prefillLocked) setShowCustomerPicker(true);
      else if (event.key === "F4" && checkoutReady) setShowPayment(true);
      else if (event.key === "F8" && cart.length && !basketLocked) setShowClear(true);
      else if (event.key === "Escape" && showMobileCart) setShowMobileCart(false);
      else return;
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [basketLocked, cart.length, checkoutReady, prefillLocked, showMobileCart]);

  const localProducts = allProducts.filter((product) => query.trim()
    ? productMatchesText(product, query.trim().toLowerCase())
    : !activeCategory || (product.category ?? product.group?.name ?? "").trim().toLowerCase() === activeCategory);
  const visibleProducts = matches && productSearch.data?.search === search
    ? Array.from(new Map([...localProducts, ...productSearch.data.products]
        .filter((product) => product.active !== false && product.show_in_kassa !== false)
        .map((product) => [product.id, product])).values())
    : localProducts;
  const waitingForProducts = matches && productSearch.loading;
  const quickProducts = [...new Set([...favoriteIds, ...recentIds])]
    .map((id) => allProducts.find((product) => product.id === id))
    .filter((product): product is Product => !!product).slice(0, 6);
  const invoiceHref = sale?.invoice_id && "/" + locale + "/admin/facturen/" + sale.invoice_id;
  const paymentHref = sale?.checkout_url ?? sale?.payment?.checkout_url ?? sale?.payment_url ?? sale?.url;
  const salePending = !!sale && (sale.pending_payments?.length
    ?? Number(sale.payment?.provider === "mollie" && sale.payment.status === "pending")) > 0;
  const refreshSale = React.useCallback(async (current: KassaCheckoutResponse, verify: boolean) => {
    if (!current.invoice_id) return;
    const latest = await kassaService.sale(current.invoice_id, verify);
    const pending = (latest.payments ?? []).filter((payment) => payment.provider === "mollie" && payment.status === "pending");
    rememberSale({
      ...current,
      status: latest.status,
      payment_status: latest.payment_status,
      paid_amount_cents: latest.paid_amount_cents,
      outstanding_cents: latest.outstanding_cents,
      pending_payments: pending.map((payment) => ({
        id: payment.id, method: payment.method, checkout_url: payment.checkout_url ?? null, amount_cents: Number(payment.amount),
      })),
    }, saleCustomerId);
  }, [rememberSale, saleCustomerId]);
  React.useEffect(() => {
    if (!salePending || !sale?.invoice_id || checkingSale) return;
    const timer = setTimeout(() => {
      setCheckingSale(true);
      void refreshSale(sale, false).catch(() => undefined).finally(() => setCheckingSale(false));
    }, 4000);
    return () => clearTimeout(timer);
  }, [salePending, sale, refreshSale, checkingSale]);

  const checkPayment = async () => {
    if (!sale || checkingSale) return;
    setCheckingSale(true);
    setReceiptStatus("");
    try {
      await refreshSale(sale, true);
    } catch (error) {
      setReceiptStatus(getApiErrorMessage(error));
    } finally {
      setCheckingSale(false);
    }
  };
  const formatDimension = (cm: number) =>
    new Intl.NumberFormat(localeTag, { maximumFractionDigits: 2 }).format(cm / 100) + " m (" +
    new Intl.NumberFormat(localeTag).format(cm) + " cm)";
  const enabledPayments = paymentMethods.error ? null : paymentMethods.data;
  const methodEnabled = (method: string) => ["creditcard", "ideal", "bancontact"].includes(method)
    ? enabledPayments?.online.includes(method) : enabledPayments?.pos.includes(method);
  const updateReceipt = async (kind: "print" | "email") => {
    if (!sale?.invoice_id || receiptBusy) return;
    setReceiptBusy(true);
    setReceiptStatus("");
    try {
      if (kind === "email") {
        const result = await invoicesService.email(sale.invoice_id);
        setReceiptStatus(result.queued === true ? pos("emailQueued") : pos("receiptPending"));
      } else {
        const pdf = await invoicesService.getPdf(sale.invoice_id);
        setReceiptUrl(pdf.signed_url ?? null);
        if (!pdf.signed_url) setReceiptStatus(pos("receiptPending"));
      }
    } catch (error) {
      setReceiptStatus(getApiErrorMessage(error));
    } finally {
      setReceiptBusy(false);
    }
  };
  const nextSale = () => {
    if (salePending) return;
    rememberCheckout(null);
    rememberSale(null);
    setReceiptUrl(null);
    setReceiptStatus("");
    setQrSession(null);
    rememberQr(null);
    chooseCustomerAfterSale();
  };
  const basketAmount = reviewed ? money(totalCents) : cart.length ? "—" : money(0);
  const serviceBoat = !editingLine || editingLine.metadata?.boat_id === selectedBoat?.id ? selectedBoat : null;

  return (
    <>
      <AdminContent className="space-y-5 pb-24 lg:pb-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-navy-900"><TranslatedText textKey={"adminNew.kassa.title"} /></h1>
            {user?.name && <p className="text-sm text-navy-600">{user.name}</p>}
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-navy-700">
            {canAccessAdminRoute(user?.role, "/" + locale + "/admin/verkopen", user?.permissions) && (
              <Link href={'/' + locale + '/admin/verkopen'}><TranslatedText textKey={"adminNew.kassa.viewAllSales"} /></Link>
            )}
            <Link href={'/' + locale + '/admin/kassa/analytics'}><TranslatedText textKey={"adminNew.kassa.analytics.title"} /></Link>
            {(can("settings.view") || can("settings.financial.view")) && (
              <Link href={'/' + locale + '/admin/instellingen#payments'}><TranslatedText textKey={"admin.sidebar.settings"} /></Link>
            )}
          </nav>
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,34%)]">
          <div className="min-w-0 space-y-4">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-500" />
                <input ref={searchRef} type="search" value={query} aria-label={pos("search")}
                  onChange={(event) => { setQuery(event.target.value); setShowBoats(false); }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    if (!scanning) void handleBarcodeScan();
                  }}
                  placeholder={pos("search")} className="input-base w-full py-3 pl-11" />
              </div>
              <Button variant="outline" leftIcon={<ScanLine className="h-5 w-5" />}
                disabled={basketLocked} onClick={() => setShowCamera(true)}>{pos("scan")}</Button>
            </div>

            {((matches && (can("boats.view") || can("customers.view"))) || showBoats) && (
              <div className="grid gap-4 rounded-xl border border-navy-100 bg-white p-4 sm:grid-cols-2" aria-live="polite">
                {can("boats.view") && <div>
                  <h2 className="font-semibold text-navy-900"><TranslatedText textKey={"adminModules.nav.boats"} /></h2>
                  {(boatSearch.loading || boatSearch.error) && <p className="text-sm">{boatSearch.error || t("adminNew.common.loading")}</p>}
                  {!boatSearch.loading && !boatSearch.error && !boatSearch.data?.data.length && <p className="text-sm">{pos("noResults")}</p>}
                  {!boatSearch.loading && !boatSearch.error && boatSearch.data?.data.map((boat) => (
                    <button type="button" key={boat.id} disabled={basketLocked || prefillLocked} onClick={() => chooseBoat(boat)}
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-sand-50 disabled:opacity-50">
                      {boat.name} {[boat.registration_number, boat.customer?.name].filter(Boolean).map((label) => ' · ' + label)}
                    </button>
                  ))}
                </div>}
                {matches && can("customers.view") && <div>
                  <h2 className="font-semibold text-navy-900"><TranslatedText textKey={"adminModules.nav.customers"} /></h2>
                  {(customerSearch.loading || customerSearch.error) && <p className="text-sm">{customerSearch.error || t("adminNew.common.loading")}</p>}
                  {!customerSearch.loading && !customerSearch.error && !customerSearch.data?.data.length && <p className="text-sm">{pos("noResults")}</p>}
                  {!customerSearch.loading && !customerSearch.error && customerSearch.data?.data.map((customer) => (
                    <button type="button" key={customer.id} disabled={basketLocked || prefillLocked} onClick={() => chooseCustomer(customer)}
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-sand-50 disabled:opacity-50">
                      {customer.name}{customer.email && ' · ' + customer.email}
                    </button>
                  ))}
                </div>}
              </div>
            )}

            <div className={cn("grid gap-4", (selectedBoat || customerId) && "xl:grid-cols-[minmax(11rem,32%)_minmax(0,1fr)]")}>
              <div className="min-w-0">
                {(selectedBoat || customerId) && (
                  <div className="mb-3 space-y-3 rounded-2xl border border-navy-100 bg-white p-4">
                    {selectedBoat && <>
                      {selectedBoat.photo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedBoat.photo_url} alt={selectedBoat.name} className="aspect-video w-full rounded-lg object-cover" />
                      )}
                      <div>
                        <h2 className="break-words text-lg font-bold text-navy-900">{selectedBoat.name}</h2>
                        <p className="text-sm text-navy-600">{selectedBoat.registration_number}</p>
                      </div>
                      <dl className="space-y-2 border-t border-navy-100 pt-3 text-sm">
                        {([["length", selectedBoat.length_cm], ["width", selectedBoat.width_cm], ["draft", selectedBoat.draft_cm]] as const).map(([key, cm]) => cm != null && (
                          <div key={key} className="flex flex-wrap justify-between gap-1">
                            <dt>{pos(key)}</dt><dd className="font-medium">{formatDimension(cm)}</dd>
                          </div>
                        ))}
                      </dl>
                    </>}
                    {selectedCustomer?.name && <p className="break-words text-sm font-semibold text-navy-900">{selectedCustomer.name}</p>}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {can("customers.view") && (
                    <Button size="sm" variant="outline" disabled={basketLocked || prefillLocked}
                      onClick={() => setShowCustomerPicker(true)}><TranslatedText textKey={"adminNew.kassa.selectCustomer"} /></Button>
                  )}
                  {can("boats.view") && (
                    <Button size="sm" variant="outline" disabled={basketLocked || prefillLocked}
                      aria-expanded={showBoats} onClick={() => { setQuery(""); setSearch(""); setShowBoats(!showBoats); }}>
                      {pos("chooseBoat")}
                    </Button>
                  )}
                </div>
              </div>
              <section aria-label={t("adminNew.kassa.products")} className="min-w-0 space-y-4">
                {!query.trim() && <div className="flex flex-wrap gap-2">
                  <CategoryTab active={!activeCategory} label={t("adminNew.kassa.allCategories")} icon={Warehouse} onClick={() => setActiveCategory("")} />
                  {quickProducts.length > 0 && <CategoryTab active={activeCategory === "__quick"} label={pos("quick")} icon={Star} onClick={() => setActiveCategory("__quick")} />}
                  {categories.map(({ label, icon }) => (
                    <CategoryTab key={label} label={label} icon={icon} active={activeCategory === label.toLowerCase()}
                      onClick={() => setActiveCategory(label.toLowerCase())} />
                  ))}
                </div>}
                {productsQuery.loading ? <LoadingState label={t("adminNew.common.loading")} /> :
                  productsQuery.error ? <p role="alert" className="text-rose-700">{productsQuery.error}</p> :
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {(activeCategory === "__quick" && !query.trim() ? quickProducts : visibleProducts).map((product) => {
                      const unavailable = priceOnRequest(product);
                      const icon = resolveLucideIcon(product.display_icon) ?? catalogIcon(product.name + " " + (product.category ?? product.group?.name ?? ""));
                      return <CatalogTile key={product.id} title={product.name}
                        price={unavailable ? pos("onRequest") : hasLengthPricing(product) ? pos("calculate") : formatCurrency(productPriceInclEuros(product), localeTag)}
                        selected={cartHas(product.id)} image={product.image_url}
                        icon={icon}
                        disabled={unavailable || basketLocked || !canCheckout || prefillLocked}
                        favorite={favoriteIds.has(product.id)} favoriteLabel={t("adminNew.kassa.favouriteToggle")}
                        onFavorite={() => toggleFavorite(product.id)} onClick={() => addProduct(product)} />;
                    })}
                  </div>
                }
                {waitingForProducts && !visibleProducts.length && <LoadingState label={t("adminNew.common.loading")} />}
                {matches && productSearch.error && <p role="alert" className="text-sm text-rose-700">{productSearch.error}</p>}
                {!waitingForProducts && !productsQuery.loading && !productsQuery.error && !visibleProducts.length && activeCategory !== "__quick" && (
                  <p className="rounded-xl border border-navy-100 bg-white p-4 text-sm text-navy-600">{pos("noResults")}</p>
                )}
                {!query.trim() && (bundlesQuery.data ?? []).some((bundle) => bundle.items?.length) && (
                  <details className="rounded-xl border border-navy-100 bg-white p-3">
                    <summary className="cursor-pointer font-semibold">{pos("bundles")}</summary>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(bundlesQuery.data ?? []).filter((bundle) => bundle.items?.length).map((bundle) => {
                        const items = bundle.items ?? [];
                        const products = items.map((item) => allProducts.find((product) => product.id === item.product_id));
                        return <Button key={bundle.id} size="sm" variant="outline"
                          disabled={basketLocked || prefillLocked || !canCheckout || !items.length ||
                            products.some((product) => !product || hasLengthPricing(product) || priceOnRequest(product))}
                          onClick={() => items.forEach((item, index) => {
                            const product = products[index];
                            if (product) for (let count = 0; count < (item.quantity ?? 1); count++) addProduct(product);
                          })}>{bundle.name}</Button>;
                      })}
                    </div>
                  </details>
                )}
              </section>
            </div>
          </div>

          <aside id="cart" className={cn("min-w-0 rounded-2xl border border-navy-100 bg-white shadow-sm lg:sticky lg:top-24",
            showMobileCart ? "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:max-h-[85dvh] max-lg:overflow-y-auto" : "max-lg:hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-100 p-4">
              <h2 className="text-lg font-bold text-navy-900"><TranslatedText textKey={"adminNew.kassa.cart"} /> ({cart.length})</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!cart.length || basketLocked} onClick={() => setShowClear(true)}>
                  <TranslatedText textKey={"adminNew.kassa.clearCart"} />
                </Button>
                <Button size="sm" variant="ghost" className="lg:hidden" onClick={() => setShowMobileCart(false)}><TranslatedText textKey={"adminNew.common.close"} /></Button>
              </div>
            </div>
            {selectedCustomer?.name && <p className="px-4 pt-3 text-sm text-navy-600">{selectedCustomer.name}</p>}
            <div className="divide-y divide-navy-100 px-4 lg:max-h-[38vh] lg:overflow-y-auto">
              {!cart.length && <p className="py-6 text-sm text-navy-500"><TranslatedText textKey={"adminNew.kassa.emptyCartMessage"} /></p>}
              {cart.map((item, index) => {
                const line = reviewed?.lines[index];
                return <div key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">{item.description}</p>
                    {item.boatName && <p className="break-words text-xs text-navy-600">{item.boatName}{item.metadata?.date ? ' · ' + String(item.metadata.date) : ''}</p>}
                    {item.metadata?.length_cm != null && !basketLocked && (
                      <button type="button" className="py-1 text-xs font-semibold text-marine-700 underline" onClick={() => {
                        const product = item.product;
                        if (!product) return;
                        setEditingLine(item);
                        setServiceProduct(product);
                        setServiceLength(String(item.metadata?.length_cm ?? ""));
                        setServiceWidth(String(item.metadata?.width_cm ?? ""));
                        setServiceWeight(String(item.metadata?.weight_kg ?? ""));
                        setServiceDate(String(item.metadata?.date ?? ""));
                      }}><TranslatedText textKey={"adminNew.common.edit"} /></button>
                    )}
                    {line && <p className="text-xs text-navy-600">{money(line.unit_price)} · <TranslatedText textKey={"adminNew.kassa.vatPercent"} vars={{ rate: line.vat_rate }} /></p>}
                    {!!line?.included_quantity && <p className="text-xs text-marine-700"><TranslatedText textKey="adminNew.kassa.pos.includedQuantity" vars={{ quantity: line.included_quantity }} /></p>}
                    {!!Object.keys(line?.included_services ?? {}).length && <p className="text-xs text-marine-700">
                      {pos("packageIncludes")} · {Object.entries(line?.included_services ?? {}).map(([code, count]) =>
                        `${count} × ${allProducts.find((product) => product.service_code === code)?.name ?? code}`).join(", ")}
                    </p>}
                    <details className="mt-1 text-xs text-navy-600">
                      <summary className="cursor-pointer">{pos("lineNote")}</summary>
                      <input className="input-base mt-1 w-full" maxLength={500} disabled={basketLocked} aria-label={pos("lineNote")}
                        defaultValue={String(item.metadata?.line_note ?? "")} onBlur={(event) => {
                          const line_note = event.target.value.trim();
                          if (line_note === String(item.metadata?.line_note ?? "")) return;
                          setCart((current) => current.map((row) => row.id === item.id
                            ? { ...row, metadata: { ...row.metadata, line_note } } : row));
                        }} />
                    </details>
                    {can('kassa.refund') && !basketLocked && !prefillLocked && <details className="mt-2 text-xs">
                      <summary className="cursor-pointer"><TranslatedText textKey="smartServices.freeItem" /></summary>
                      <form className="mt-2 space-y-2" onSubmit={(event) => {
                        event.preventDefault(); const reason = String(new FormData(event.currentTarget).get('reason')).trim();
                        if (reason.length < 3) return;
                        setCart((current) => current.map((row) => row.id === item.id ? { ...row, metadata: { ...row.metadata, free_reason: reason } } : row));
                      }}>
                        <input name="reason" aria-label={t('smartServices.reason')} required minLength={3} maxLength={500} defaultValue={String(item.metadata?.free_reason ?? '')} className="input-base w-full" />
                        <button className="underline"><TranslatedText textKey="smartServices.freeItem" /></button>
                        {!!item.metadata?.free_reason && <button type="button" className="ml-2 underline" onClick={() => setCart((current) => current.map((row) => row.id === item.id ? { ...row, metadata: { ...row.metadata, free_reason: undefined } } : row))}><TranslatedText textKey="adminNew.common.cancel" /></button>}
                      </form>
                    </details>}
                    {!prefillLocked && <div className="mt-1 flex items-center gap-2 text-sm">
                      <button type="button" disabled={basketLocked} className="h-8 w-8 rounded-lg border border-navy-100" aria-label={pos("decrease")} onClick={() => changeQty(item.id, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" disabled={basketLocked} className="h-8 w-8 rounded-lg border border-navy-100" aria-label={pos("increase")} onClick={() => changeQty(item.id, 1)}>+</button>
                    </div>}
                  </div>
                  <div className="shrink-0 text-right text-sm font-semibold">
                    <p>{line ? money(line.line_total) : "—"}</p>
                    <button type="button" disabled={basketLocked} className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sand-50"
                      aria-label={pos("remove") + ' ' + item.description} onClick={() => { removeItem(item.id); if (prefillLocked) setPrefillLocked(false); }}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>;
              })}
            </div>
            <div className="space-y-2 border-t border-navy-100 p-4 text-sm" aria-live="polite">
              {note && <p className="break-words rounded bg-sand-50 p-2">{note}</p>}
              {basketContextChanged && <div role="alert" className="text-amber-800">
                <p>{pos("contextChanged")}</p>
                {!!selectedBoat?.length_cm && !basketLocked && <button type="button" className="font-semibold underline" onClick={() => {
                  const boat = selectedBoat;
                  setCart((current) => current.map((line) => !line.metadata?.boat_id || line.metadata.boat_id === boat.id ? line : {
                    ...line,
                    description: line.product ? `${line.product.name} · ${boat.length_cm} cm` : line.description,
                    boatName: boat.name,
                    metadata: { ...line.metadata, boat_id: boat.id, length_cm: boat.length_cm, width_cm: boat.width_cm, weight_kg: boat.weight_kg },
                  }));
                }}>{pos("repriceBoat")}</button>}
              </div>}
              {catalogStatus.changed && <div role="alert" className="rounded bg-amber-50 p-2 text-amber-900">
                <p><TranslatedText textKey="smartServices.updated" /></p>
                <button type="button" className="mt-1 font-semibold underline disabled:opacity-50" disabled={!reviewed} onClick={catalogStatus.acknowledge}><TranslatedText textKey="smartServices.reviewUpdated" /></button>
              </div>}
              {cart.length > 0 && basketQuote.error && <p role="alert" className="text-rose-700">{basketQuote.error}</p>}
              {cart.length > 0 && !reviewed && !basketQuote.error && <p>{pos("pricing")}</p>}
              {reviewed && <>
                <Row label={t("adminNew.kassa.totalExcl")} value={money(reviewed.subtotal_cents)} />
                <details>
                  <summary className="cursor-pointer">{pos("vat")} · {money(reviewed.vat_amount_cents)}</summary>
                  {vatRates.map((rate) => (
                    <Row key={rate} label={t("adminNew.kassa.vatPercent", { rate })}
                      value={money(reviewed.lines.reduce((sum, line) => sum + (line.vat_rate === rate ? line.vat_amount : 0), 0))} />
                  ))}
                </details>
              </>}
              <div className="flex justify-between gap-2 border-t border-navy-100 pt-2 text-base font-bold">
                <span>{pos("totalIncl")}</span><span>{basketAmount}</span>
              </div>
              <Button variant="gold" fullWidth className="min-h-12" leftIcon={<CreditCard className="h-5 w-5" />}
                disabled={!checkoutReady} onClick={() => setShowPayment(true)}>
                <TranslatedText textKey={"adminNew.kassa.payNow"} /> {basketAmount}
              </Button>
              {qrAttempt && !qrPending && <Button variant="outline" fullWidth disabled={qrStarting} onClick={() => void startQrSession()}>{pos("resumeQr")}</Button>}
              {qrPending && <Button variant="outline" fullWidth onClick={() => setShowQrModal(true)}>{pos("resumeQr")}</Button>}
              {submitted && <Button variant="outline" fullWidth disabled={checkout.loading} onClick={() => void handleCheckout()}>
                {pos("retry")}
              </Button>}
              <Button variant="ghost" size="sm" disabled={!cart.length || basketLocked}
                onClick={() => { setNoteDraft(note); setShowNoteModal(true); }}><TranslatedText textKey={"adminNew.kassa.addNote"} /></Button>
            </div>
          </aside>
        </div>
      </AdminContent>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white p-3 lg:hidden">
        <Button variant="gold" fullWidth aria-expanded={showMobileCart} aria-controls="cart" onClick={() => setShowMobileCart(true)}>
          <TranslatedText textKey={"adminNew.kassa.cart"} /> ({cart.length}) · {basketAmount}
        </Button>
      </div>

      <AdminConfirmModal open={showClear} onClose={() => setShowClear(false)}
        title={t("adminNew.kassa.clearCart")} message={pos("confirmClear")}
        confirmLabel={t("adminNew.kassa.clearCart")} cancelLabel={t("adminNew.common.cancel")}
        onConfirm={() => { if (!basketLocked) { setCart([]); setNote(""); setPrefillLocked(false); setAdjustEnabled(false); setAdjustedTotal(""); setAdjustmentReason(""); } setShowClear(false); }} />

      <Modal open={!!serviceProduct} onClose={() => { setServiceProduct(null); setEditingLine(null); }} size="sm">
        <form onSubmit={(event) => {
          event.preventDefault();
          const length = Number(serviceLength);
          if (!serviceProduct || !Number.isInteger(length) || length < 1 || length > 99999) return;
          addProduct(serviceProduct, { length, date: serviceDate,
            width: serviceWidth ? Number(serviceWidth) : undefined,
            weight: serviceWeight ? Number(serviceWeight) : undefined });
          setServiceProduct(null);
        }}>
          <AdminModalHeader title={serviceProduct?.name ?? ""} subtitle={editingLine ? editingLine.boatName : selectedBoat?.name} />
          <AdminModalBody>
            <Input label={pos("length") + " (cm)"} type="number" min={1} max={99999} step={1} required
              value={serviceLength} readOnly={!!serviceBoat?.length_cm} onChange={(event) => setServiceLength(event.target.value)} />
            <Input label={pos("serviceDate")} type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
            <Input label={pos("width") + " (cm)"} type="number" min={1} max={99999} step={1}
              value={serviceWidth} readOnly={!!serviceBoat?.width_cm} onChange={(event) => setServiceWidth(event.target.value)} />
            <Input label={pos("weight") + " (kg)"} type="number" min={1} max={1000000} step={1}
              value={serviceWeight} readOnly={!!serviceBoat?.weight_kg} onChange={(event) => setServiceWeight(event.target.value)} />
          </AdminModalBody>
          <AdminModalFooter><Button type="submit" variant="gold">{pos("calculate")}</Button></AdminModalFooter>
        </form>
      </Modal>

      <Modal open={showPayment && !checkoutConfirm && !showSplitModal && !showQrModal && !quotation} onClose={() => { setShowPayment(false); setAdjustEnabled(false); }} size="md">
        <AdminModalHeader title={t("adminNew.kassa.paymentMethodTitle")} subtitle={basketAmount} />
        <AdminModalBody>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_BUTTONS.filter(({ method }) => method === "downpayment"
              ? ["cash", "pin", "ideal", "creditcard", "bancontact", "banktransfer"].some(methodEnabled) : methodEnabled(method))
              .map(({ method, label, icon: Icon, action }) => (
              <Button key={method} variant={paymentMethod === method ? "gold" : "outline"}
                aria-pressed={action ? undefined : paymentMethod === method} disabled={!checkoutReady}
                leftIcon={<Icon className="h-4 w-4" />} onClick={action ?? (() => setPaymentMethod(method))}>{label}</Button>
            ))}
            {enabledPayments?.online.includes("ideal") && <Button variant="outline" disabled={!checkoutReady || adjustEnabled || totalCents <= 0} onClick={() => setCheckoutConfirm("qr")}><TranslatedText textKey={"adminNew.kassa.qrPayment"} /></Button>}
            {can("invoice.create") && <Button variant="outline" disabled={!checkoutReady || !customerId || quote.loading} onClick={handleQuote}>{pos("saveQuote")}</Button>}
          </div>
          {(paymentMethods.loading || paymentMethods.error) && <p role="status">{paymentMethods.error || t("adminNew.common.loading")}</p>}
          {paymentMethod === "pin" && methodEnabled("pin") && <p className="text-sm text-navy-600">{pos("manualPin")}</p>}
          {paymentMethod === "creditcard" && <p className="text-sm text-navy-600">{pos("onlineCard")}</p>}
          {paymentMethod === "invoice" && !customerId && <p role="alert" className="text-sm text-amber-800">{pos("invoiceCustomer")}</p>}
          {canAdjust && <details>
            <summary className="cursor-pointer text-sm font-semibold"><TranslatedText textKey={"adminNew.kassa.adjustTotal"} /></summary>
            <label className="my-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={adjustEnabled} onChange={(event) => {
                setAdjustEnabled(event.target.checked);
                if (event.target.checked && !adjustedTotal) setAdjustedTotal((totalCents / 100).toFixed(2));
              }} />
              <TranslatedText textKey={"adminNew.kassa.adjustTotal"} />
            </label>
            {adjustEnabled && <>
              <Input label={t("adminNew.kassa.adjustNewTotal")} type="number" min="0" step="0.01"
                value={adjustedTotal} onChange={(event) => setAdjustedTotal(event.target.value)} />
              <Input label={t("adminNew.kassa.adjustReason")} value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)} />
            </>}
          </details>}
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="gold" disabled={!checkoutReady || !methodEnabled(paymentMethod) || (paymentMethod === "invoice" && !customerId) ||
            (adjustEnabled && (!adjustmentReason.trim() || !adjustedTotal || Number(adjustedTotal) < 0 || Number(adjustedTotal) * 100 > totalCents))}
            onClick={() => setCheckoutConfirm(paymentMethod === "invoice" ? "on_account" : "standard")}>
            <TranslatedText textKey={"adminNew.kassa.checkout"} />
          </Button>
        </AdminModalFooter>
      </Modal>

      <Modal open={!!quotation} onClose={() => setQuotation(null)} size="sm">
        <AdminModalHeader title={pos("quoteSaved")} subtitle={quotation?.reference} />
        <AdminModalFooter>
          {quotation && <Link href={`/${locale}/admin/facturen/${quotation.id}`} className="font-semibold text-marine-700 underline">{pos("openQuote")}</Link>}
          <Button variant="outline" onClick={() => setQuotation(null)}><TranslatedText textKey="adminNew.common.close" /></Button>
        </AdminModalFooter>
      </Modal>

      <Modal open={!!sale} onClose={nextSale} size="sm" showClose={!salePending} closeOnBackdrop={!salePending}>
        <AdminModalHeader title={salePending ? pos("paymentPending") : sale?.payment_status === "paid" ? pos("paid") : pos("recorded")} subtitle={sale?.invoice_number} />
        <AdminModalBody>
          <p className="text-lg font-semibold">{money(sale?.total_amount_cents ?? 0)}</p>
          {!!sale?.outstanding_cents && <Row label={t("adminNew.invoiceDetail.summary.outstanding")} value={money(sale.outstanding_cents)} />}
          {!salePending && sale?.invoice_id && <div className="flex flex-wrap gap-2">
            {can("invoice.view") && (receiptUrl
              ? <a href={receiptUrl} target="_blank" rel="noreferrer" className="font-semibold text-marine-700 underline">{pos("openReceipt")}</a>
              : <Button size="sm" variant="outline" disabled={receiptBusy} onClick={() => void updateReceipt("print")}>{pos("printReceipt")}</Button>)}
            {saleCustomerId && can("invoice.send") && <Button size="sm" variant="outline" disabled={receiptBusy}
              onClick={() => void updateReceipt("email")}>{pos("emailReceipt")}</Button>}
          </div>}
          {receiptStatus && <p role="status" className="text-sm text-navy-600">{receiptStatus}</p>}
          {salePending && <div className="flex flex-wrap gap-3">
            {sale?.pending_payments?.length ? sale.pending_payments.map((payment) => payment.checkout_url && (
              <a key={payment.id} href={payment.checkout_url} target="_blank" rel="noreferrer" className="font-semibold text-marine-700 underline">
                {pos("openPayment")} · {money(payment.amount_cents)}
              </a>
            )) : paymentHref && <a href={paymentHref} target="_blank" rel="noreferrer" className="font-semibold text-marine-700 underline">{pos("openPayment")}</a>}
            <Button size="sm" variant="outline" disabled={checkingSale} onClick={() => void checkPayment()}>{pos("checkPayment")}</Button>
          </div>}
        </AdminModalBody>
        <AdminModalFooter>
          {invoiceHref && can("invoice.view") && <Link href={invoiceHref} className="font-semibold text-marine-700 underline">{pos("viewInvoice")}</Link>}
          <Button variant="gold" disabled={salePending} onClick={nextSale}>{pos("newSale")}</Button>
        </AdminModalFooter>
      </Modal>
      {/* Note modal */}
      <Modal
        open={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        size="md"
      >
        <AdminModalHeader title={t("adminNew.kassa.noteTitle")} />
        <AdminModalBody>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={t("adminNew.kassa.notePlaceholder")}
            rows={4}
            className="input-base w-full resize-none"
          />
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="ghost" onClick={() => setShowNoteModal(false)}>
            {<TranslatedText textKey={"adminNew.common.cancel"} />}
          </Button>
          <Button
            variant="gold"
            onClick={() => {
              setNote(noteDraft.trim());
              setShowNoteModal(false);
              if (noteDraft.trim()) {
                push({ tone: "success", title: t("adminNew.kassa.noteSaved") });
              }
            }}
          >
            {<TranslatedText textKey={"adminNew.common.save"} />}
          </Button>
        </AdminModalFooter>
      </Modal>

      {/* Split modal */}
      <Modal
        open={showSplitModal}
        onClose={() => setShowSplitModal(false)}
        size="md"
      >
        <AdminModalHeader title={t("adminNew.kassa.splitPayment")} />
        <AdminModalBody>
          {splitPayments.map((row, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2">
              <SearchSelect
                className="input-base"
                value={row.method}
                onChange={(e) =>
                  setSplitPayments((prev) =>
                    prev.map((p, i) =>
                      i === idx ? { ...p, method: e.target.value } : p,
                    ),
                  )
                }
              >
                <option value="pin"><TranslatedText textKey="siteCopy.f7070f4de4f42958" fallbackText={"PIN"} inline={false} /></option>
                <option value="cash">{t("adminNew.kassa.payment.cash")}</option>
                <option value="ideal"><TranslatedText textKey="siteCopy.a0960033ab977465" fallbackText={"iDEAL"} inline={false} /></option>
                <option value="creditcard">{t("adminNew.kassa.payment.creditcard")}</option>
                <option value="bancontact"><TranslatedText textKey="siteCopy.2d68844a6caaf573" fallbackText={"Bancontact"} inline={false} /></option>
                <option value="banktransfer">{t("adminNew.kassa.payment.banktransfer")}</option>
              </SearchSelect>
              <Input
                type="number"
                step="0.01"
                value={row.amount}
                onChange={(e) =>
                  setSplitPayments((prev) =>
                    prev.map((p, i) =>
                      i === idx ? { ...p, amount: e.target.value } : p,
                    ),
                  )
                }
                placeholder={t("adminNew.kassa.amountPlaceholder")}
              />
            </div>
          ))}
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="ghost" onClick={() => setShowSplitModal(false)}>
            {<TranslatedText textKey={"adminNew.common.cancel"} />}
          </Button>
          <Button disabled={!checkoutReady || !splitPayments.some((row) => Number(row.amount) > 0) || splitPayments.some((row) => Number(row.amount) > 0 && !methodEnabled(row.method))} variant="gold" onClick={() => setCheckoutConfirm("split")}>
            {<TranslatedText textKey={"adminNew.kassa.checkout"} />}
          </Button>
        </AdminModalFooter>
      </Modal>

      {/* Camera barcode scanner (opened by the Scan barcode button) */}
      <BarcodeScannerModal
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onDetected={(code) => {
          void runScan(code, "camera");
          setShowCamera(false);
        }}
      />

      <Modal open={showQrModal} onClose={closeQrModal} size="md">
        <AdminModalHeader
          title={t("adminNew.kassa.qrPayment")}
          subtitle={t("adminNew.kassa.qrSubtitle")}
        />
        <AdminModalBody>
          {(() => {
            const status = (
              qrSession?.status ?? (qrStarting ? "pending" : "")
            ).toLowerCase();
            const payUrl =
              qrSession?.checkout_url ?? qrSession?.qr_payload ?? null;
            // Trello #72: prefer the server-rendered QR image when present.
            const qrImg =
              qrSession?.qr_code_url ??
              (payUrl
                ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payUrl)}`
                : null);
            const paid = status === "paid" || status === "completed";
            const expired = status === "expired";
            const failed =
              expired ||
              status === "failed" ||
              status === "canceled" ||
              status === "cancelled";
            const statusKey = paid
              ? "qrPaid"
              : failed
                ? "qrFailed"
                : "qrWaiting";
            const amountLabel =
              qrSession?.amount_cents != null
                ? money(qrSession.amount_cents)
                : totalCents > 0
                  ? money(totalCents)
                  : null;
            const sendEmail = async (email?: string) => {
              if (!qrSession?.session_id) return;
              try {
                await kassaService.sendPaymentLink(qrSession.session_id, email ? { email } : undefined);
                push({ tone: "success", title: t("adminNew.kassa.qrLinkSent") });
                setShowQrEmailInput(false);
              } catch (err) {
                const msg = getApiErrorMessage(err);
                if (msg?.toLowerCase().includes('email') || String(err).includes('422')) {
                  setShowQrEmailInput(true);
                } else {
                  push({ tone: "error", title: t("adminNew.common.operationFailed"), message: msg });
                }
              }
            };
            const sendWhatsApp = async (phone?: string) => {
              if (!qrSession?.session_id) return;
              try {
                await kassaService.sendPaymentLinkWhatsapp(qrSession.session_id, phone ? { phone } : undefined);
                push({ tone: "success", title: t('settingsHub.operational.accepted') });
                setShowQrPhoneInput(false);
              } catch (err) {
                const msg = getApiErrorMessage(err);
                if (msg?.toLowerCase().includes('phone') || String(err).includes('422')) {
                  setShowQrPhoneInput(true);
                } else {
                  push({ tone: "error", title: t("adminNew.common.operationFailed"), message: msg });
                }
              }
            };
            return (
              <div className="text-center">
                {amountLabel && !paid ? (
                  <div className="mb-3 text-lg font-semibold text-navy-900">
                    {<TranslatedText textKey={"adminNew.kassa.qrScanToPay"} vars={{ amount: amountLabel }} />}
                  </div>
                ) : null}
                {qrStarting && !qrSession ? (
                  <div className="py-10">
                    <LoadingState label={t("adminNew.kassa.qrCreating")} />
                  </div>
                ) : paid ? (
                  <div className="py-6">
                    <Check className="mx-auto h-14 w-14 rounded-full bg-emerald-50 p-3 text-emerald-600" />
                    <div className="mt-3 text-lg font-semibold text-navy-900">
                      {<TranslatedText textKey={"adminNew.kassa.qrPaid"} />}
                    </div>
                    {qrSession?.invoice_id ? (
                      <Link
                        href={`/${locale}/admin/facturen/${qrSession.invoice_id}`}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-marine-700"
                      >
                        {qrSession.invoice_number ??
                          t("adminNew.invoiceDetail.actions.openPdf")}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                ) : failed ? (
                  <div className="py-6">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                      <QrCode className="h-7 w-7" />
                    </div>
                    <div className="mt-3 text-lg font-semibold text-navy-900">
                      {expired ? <TranslatedText textKey={"adminNew.kassa.qrExpired"} /> : <TranslatedText textKey={"adminNew.kassa.qrFailed"} />}
                    </div>

                  </div>
                ) : payUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrImg ?? ''}
                      alt="Mollie QR"
                      className="mx-auto rounded-lg border border-navy-100"
                    />
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full bg-marine-50 px-3 py-1 text-xs font-semibold text-marine-700">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-marine-500" />
                        {<TranslatedText textKey={`adminNew.kassa.${statusKey}`} />}
                      </div>
                      {qrSecondsLeft !== null && qrSecondsLeft > 0 ? (
                        <div className={`text-xs font-mono font-semibold tabular-nums ${qrSecondsLeft < 60 ? 'text-rose-600' : 'text-navy-400'}`}>
                          {Math.floor(qrSecondsLeft / 60)}:{String(qrSecondsLeft % 60).padStart(2, '0')}
                        </div>
                      ) : null}
                    </div>

                    {/* Guest email auto-offer */}
                    {qrSession?.guest_email && !showQrEmailInput ? (
                      <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-marine-50 px-3 py-2 text-xs text-marine-800">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{qrSession.guest_email}</span>
                        <Button size="sm" variant="outline" className="ml-1 h-6 px-2 text-[11px]" onClick={() => void sendEmail(qrEmailInput || qrSession.guest_email!)}>
                          <TranslatedText textKey="siteCopy.7e2c65b0a66ac754" fallbackText={"Verstuur"} /></Button>
                      </div>
                    ) : null}

                    {/* Inline email input (shown on 422 or when no guest email) */}
                    {showQrEmailInput ? (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="email"
                          className="flex-1 rounded border border-navy-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-marine-500"
                          placeholder="E-mailadres"
                          value={qrEmailInput}
                          onChange={(e) => setQrEmailInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void sendEmail(qrEmailInput); }}
                          autoFocus
                        />
                        <Button size="sm" variant="gold" onClick={() => void sendEmail(qrEmailInput)} disabled={!qrEmailInput.trim()}>
                          <TranslatedText textKey="siteCopy.73fb3ee78d68bdc3" fallbackText={"Stuur"} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowQrEmailInput(false)}>✕</Button>
                      </div>
                    ) : null}

                    {/* Inline phone input (shown on 422 or when no guest phone) */}
                    {showQrPhoneInput ? (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="tel"
                          className="flex-1 rounded border border-navy-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-marine-500"
                          placeholder="Telefoonnummer"
                          value={qrPhoneInput}
                          onChange={(e) => setQrPhoneInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void sendWhatsApp(qrPhoneInput); }}
                          autoFocus
                        />
                        <Button size="sm" variant="gold" onClick={() => void sendWhatsApp(qrPhoneInput)} disabled={!qrPhoneInput.trim()}>
                          <TranslatedText textKey="siteCopy.73fb3ee78d68bdc3" fallbackText={"Stuur"} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowQrPhoneInput(false)}>✕</Button>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {qrSession && <Button size="sm" variant="outline" disabled={checkingSale} onClick={async () => {
                        setCheckingSale(true);
                        try {
                          setQrSession(await kassaService.qrSession(qrSession.session_id, true));
                        } catch (error) {
                          push({ tone: "error", title: getApiErrorMessage(error) });
                        } finally {
                          setCheckingSale(false);
                        }
                      }}>{pos("checkPayment")}</Button>}
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Check className="h-3.5 w-3.5" />}
                        onClick={() => {
                          void navigator.clipboard?.writeText(payUrl);
                          setQrCopied(true);
                        }}
                      >
                        {qrCopied
                          ? <TranslatedText textKey={"adminNew.kassa.qrCopied"} />
                          : <TranslatedText textKey={"adminNew.kassa.qrCopy"} />}
                      </Button>
                      <a
                        href={payUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                        >
                          {<TranslatedText textKey={"adminNew.kassa.qrOpen"} />}
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<MessageCircle className="h-3.5 w-3.5" />}
                        onClick={() => showQrPhoneInput ? void sendWhatsApp(qrPhoneInput) : void sendWhatsApp()}
                      >
                        {<TranslatedText textKey={"adminNew.kassa.qrWhatsapp"} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Mail className="h-3.5 w-3.5" />}
                        onClick={() => showQrEmailInput ? void sendEmail(qrEmailInput) : void sendEmail()}
                      >
                        {<TranslatedText textKey={"adminNew.kassa.qrSendEmail"} />}
                      </Button>

                    </div>
                  </>
                ) : <p role="status" className="py-4 text-sm text-navy-600"><TranslatedText textKey={"adminNew.kassa.qrCreating"} /></p>}
              </div>
            );
          })()}
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="gold" onClick={closeQrModal}>
            {<TranslatedText textKey={"adminNew.common.close"} />}
          </Button>
        </AdminModalFooter>
      </Modal>

      {/* New customer modal */}
      <Modal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        size="md"
      >
        <form onSubmit={handleCreateCustomer}>
          <AdminModalHeader
            title={t("adminNew.kassa.modalTitle")}
            subtitle={t("adminNew.kassa.modalSubtitle")}
          />
          <AdminModalBody>
            <Input
              label={t("adminNew.common.name")}
              value={newCustomer.name}
              onChange={(e) =>
                setNewCustomer((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <Input
              label={t("adminNew.common.email")}
              value={newCustomer.email}
              onChange={(e) =>
                setNewCustomer((prev) => ({ ...prev, email: e.target.value }))
              }
              type="email"
            />
            <Input
              label={t("adminNew.common.phone")}
              value={newCustomer.phone}
              onChange={(e) =>
                setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
            <Input
              label={t("adminNew.kassa.companyName")}
              value={newCustomer.company_name}
              onChange={(e) =>
                setNewCustomer((prev) => ({ ...prev, company_name: e.target.value }))
              }
            />
            <AddressAutocomplete
              label={t("adminNew.kassa.searchAddress")}
              placeholder={t("adminNew.kassa.searchAddressPlaceholder")}
              onSelect={(addr) =>
                setNewCustomer((prev) => ({
                  ...prev,
                  street: addr.street,
                  house_number: addr.house_number,
                  postal_code: addr.postal_code,
                  city: addr.city,
                  country: addr.country,
                  google_place_id: addr.google_place_id,
                  latitude: addr.latitude,
                  longitude: addr.longitude,
                }))
              }
            />
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_7rem] gap-2 [&>*]:min-w-0">
              <Input
                label={t("adminNew.kassa.street")}
                value={newCustomer.street}
                onChange={(e) =>
                  setNewCustomer((prev) => ({ ...prev, street: e.target.value }))
                }
              />
              <Input
                label={t("adminNew.kassa.houseNumber")}
                value={newCustomer.house_number}
                onChange={(e) =>
                  setNewCustomer((prev) => ({ ...prev, house_number: e.target.value }))
                }
              />
            </div>
            <div className="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] gap-2 [&>*]:min-w-0">
              <Input
                label={t("adminNew.kassa.postalCode")}
                value={newCustomer.postal_code}
                onChange={(e) =>
                  setNewCustomer((prev) => ({ ...prev, postal_code: e.target.value }))
                }
              />
              <Input
                label={t("adminNew.kassa.city")}
                value={newCustomer.city}
                onChange={(e) =>
                  setNewCustomer((prev) => ({ ...prev, city: e.target.value }))
                }
              />
            </div>
            <Input
              label={t("adminNew.kassa.country")}
              value={newCustomer.country}
              onChange={(e) =>
                setNewCustomer((prev) => ({ ...prev, country: e.target.value }))
              }
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-700">
                {<TranslatedText textKey={"adminNew.kassa.customerNotes"} />}
              </label>
              <textarea
                value={newCustomer.notes}
                onChange={(e) =>
                  setNewCustomer((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
                className="input-base w-full resize-none"
                placeholder={t("adminNew.kassa.customerNotesPlaceholder")}
              />
            </div>
            <p className="text-xs text-navy-400">{<TranslatedText textKey={"adminNew.kassa.addressHint"} />}</p>
          </AdminModalBody>
          <AdminModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCustomerModal(false)}
            >
              {<TranslatedText textKey={"adminNew.common.cancel"} />}
            </Button>
            <Button
              type="submit"
              variant="gold"
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={createCustomer.loading}
            >
              {createCustomer.loading
                ? <TranslatedText textKey={"adminNew.kassa.creating"} />
                : <TranslatedText textKey={"adminNew.kassa.create"} />}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* Trello #62: searchable customer picker */}
      <Modal
        open={showCustomerPicker}
        onClose={() => {
          setShowCustomerPicker(false);
          setCustomerPickerSearch("");
          setEditingCustomerId(null);
        }}
        size="md"
      >
        {editingCustomerId ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const updated = await updateCustomer.mutate({
                  id: editingCustomerId,
                  name: editCustomer.name,
                  email: editCustomer.email || null,
                  phone: editCustomer.phone || null,
                  company_name: editCustomer.company_name || null,
                  notes: editCustomer.notes || null,
                  address: editCustomer.street
                    ? {
                        street: editCustomer.street,
                        house_number: editCustomer.house_number || null,
                        postal_code: editCustomer.postal_code || null,
                        city: editCustomer.city || null,
                        country: editCustomer.country || null,
                        google_place_id: editCustomer.google_place_id || null,
                        latitude: editCustomer.latitude,
                        longitude: editCustomer.longitude,
                      }
                    : undefined,
                });
                chooseCustomer(updated);
                setEditingCustomerId(null);
                void pickerResultsQuery.refetch();
                push({ tone: "success", title: t("adminNew.kassa.toasts.customerCreated") });
              } catch (err) {
                push({ tone: "error", title: getApiErrorMessage(err) ?? t("adminNew.common.operationFailed") });
              }
            }}
          >
            <AdminModalHeader
              title={t("adminNew.kassa.editCustomer")}
              subtitle={editCustomer.name}
            />
            <AdminModalBody>
              <Input label={t("adminNew.common.name")} value={editCustomer.name} required
                onChange={(e) => setEditCustomer((p) => ({ ...p, name: e.target.value }))} />
              <Input label={t("adminNew.common.email")} type="email" value={editCustomer.email}
                onChange={(e) => setEditCustomer((p) => ({ ...p, email: e.target.value }))} />
              <Input label={t("adminNew.common.phone")} value={editCustomer.phone}
                onChange={(e) => setEditCustomer((p) => ({ ...p, phone: e.target.value }))} />
              <Input label={t("adminNew.kassa.companyName")} value={editCustomer.company_name}
                onChange={(e) => setEditCustomer((p) => ({ ...p, company_name: e.target.value }))} />
              <AddressAutocomplete
                label={t("adminNew.kassa.searchAddress")}
                placeholder={t("adminNew.kassa.searchAddressPlaceholder")}
                onSelect={(addr) =>
                  setEditCustomer((p) => ({
                    ...p,
                    street: addr.street,
                    house_number: addr.house_number,
                    postal_code: addr.postal_code,
                    city: addr.city,
                    country: addr.country,
                    google_place_id: addr.google_place_id,
                    latitude: addr.latitude,
                    longitude: addr.longitude,
                  }))
                }
              />
            </AdminModalBody>
            <AdminModalFooter>
              <Button disabled={!canWriteCustomer} type="button" variant="ghost" onClick={() => setEditingCustomerId(null)}>
                {<TranslatedText textKey={"adminNew.common.cancel"} />}
              </Button>
              <Button type="submit" variant="primary" disabled={updateCustomer.loading}>
                {<TranslatedText textKey={"adminNew.common.save"} />}
              </Button>
            </AdminModalFooter>
          </form>
        ) : (
          <>
            <AdminModalHeader
              title={t("adminNew.kassa.pickCustomer")}
              subtitle={t("adminNew.kassa.pickCustomerHint")}
            />
            <AdminModalBody>
              <Input
                autoFocus
                placeholder={t("adminNew.kassa.customerSearch")}
                value={customerPickerSearch}
                onChange={(e) => setCustomerPickerSearch(e.target.value)}
                leftIcon={<UserPlus className="h-4 w-4" />}
              />
              <div className="mt-2 max-h-72 divide-y divide-navy-100 overflow-y-auto rounded-lg border border-navy-100">
                <button
                  type="button"
                  onClick={() => {
                    chooseCustomer(null);
                    setShowCustomerPicker(false);
                    setCustomerPickerSearch("");
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-navy-500 hover:bg-sand-50"
                >
                  {<TranslatedText textKey={"adminNew.kassa.noCustomer"} />}
                </button>
                {pickerResultsQuery.loading ? (
                  <div className="px-3 py-4 text-center text-sm text-navy-400">
                    {<TranslatedText textKey={"adminNew.common.loading"} />}…
                  </div>
                ) : (pickerResultsQuery.data?.data ?? []).map((c) => (
                  <div key={c.id} className={cn("flex items-center", c.id === customerId && "bg-marine-50")}>
                    <button
                      type="button"
                      onClick={() => {
                        chooseCustomer(c);
                        setShowCustomerPicker(false);
                        setCustomerPickerSearch("");
                      }}
                      className="flex min-w-0 flex-1 flex-col px-3 py-2 text-left text-sm hover:bg-sand-50"
                    >
                      <span className="font-medium text-navy-900">{c.name}</span>
                      <span className="text-xs text-navy-500">
                        {c.email ?? t("adminNew.common.noEmail")}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </span>
                    </button>
                    <button disabled={!canWriteCustomer}
                      type="button"
                      title={t("adminNew.common.edit")}
                      onClick={() => {
                        setEditingCustomerId(c.id);
                        const cr = c as unknown as Record<string, unknown>;
                        const addr = (cr.address ?? {}) as Record<string, unknown>;
                        setEditCustomer({
                          name: c.name ?? "",
                          email: c.email ?? "",
                          phone: c.phone ?? "",
                          company_name: c.company_name ?? "",
                          street: addr.street as string ?? "",
                          house_number: addr.house_number as string ?? "",
                          postal_code: addr.postal_code as string ?? "",
                          city: addr.city as string ?? "",
                          country: addr.country as string ?? "",
                          google_place_id: addr.google_place_id as string ?? "",
                          latitude: addr.latitude as number ?? null,
                          longitude: addr.longitude as number ?? null,
                          notes: c.notes ?? "",
                        });
                      }}
                      className="mr-2 shrink-0 rounded p-1.5 text-navy-400 hover:bg-sand-100 hover:text-marine-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </AdminModalBody>
            <AdminModalFooter>
              <Link href={`/${locale}/admin/klanten`} className="mr-auto">
                <Button type="button" variant="ghost">
                  {<TranslatedText textKey={"adminNew.kassa.allCustomers"} />}
                </Button>
              </Link>
              <Button disabled={!canWriteCustomer}
                type="button"
                variant="outline"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setShowCustomerPicker(false);
                  setShowCustomerModal(true);
                }}
              >
                {<TranslatedText textKey={"adminNew.kassa.newCustomer"} />}
              </Button>
            </AdminModalFooter>
          </>
        )}
      </Modal>

      <AdminConfirmModal
        open={canCheckout && !!checkoutConfirm}
        onClose={() => setCheckoutConfirm(null)}
        onConfirm={async () => {
          if (!checkoutConfirm) return;
          const mode = checkoutConfirm;
          setCheckoutConfirm(null);
          await handleCheckout(mode);
        }}
        title={t("adminNew.kassa.confirmCheckoutTitle")}
        message={t("adminNew.kassa.confirmCheckout", {
          total: money(checkoutConfirm !== "qr" && adjustEnabled ? Math.round(Number(adjustedTotal) * 100) : totalCents),
          method: checkoutConfirm ? checkoutMethodLabel(checkoutConfirm) : "",
        })}
        confirmLabel={t("adminNew.kassa.checkout")}
        cancelLabel={t("adminNew.common.cancel")}
        variant="primary"
        icon={CreditCard}
        loading={checkout.loading}
      />

    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Sub-components                                 */
/* -------------------------------------------------------------------------- */

function CategoryTab({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-navy-100 bg-white text-navy-700 hover:border-navy-200 hover:bg-sand-50",
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}

function CatalogTile({ title, price, icon: Icon, image, selected, disabled, favorite, favoriteLabel, onFavorite, onClick }: {
  title: string;
  price: string;
  icon: LucideIcon;
  image?: string | null;
  selected: boolean;
  disabled: boolean;
  favorite: boolean;
  favoriteLabel: string;
  onFavorite: () => void;
  onClick: () => void;
}) {
  return (
    <div className={cn("relative min-w-0 rounded-2xl border bg-white", selected ? "border-gold-500 bg-gold-50" : "border-navy-100")}>
      <button type="button" disabled={disabled} onClick={onClick}
        className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl px-2 pb-3 pt-7 text-center hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marine-600 disabled:opacity-60">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-10 w-14 rounded-md object-cover" />
        ) : <Icon aria-hidden="true" className="h-9 w-9 text-navy-800" />}
        <span className="break-words text-sm font-bold text-navy-900 [overflow-wrap:anywhere]">{title}</span>
        <span className="text-xs font-semibold text-navy-600">{price}</span>
      </button>
      <button type="button" aria-label={favoriteLabel + ' · ' + title} aria-pressed={favorite}
        onClick={onFavorite} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-lg hover:bg-gold-50">
        <Star className={cn("h-4 w-4", favorite ? "fill-gold-400 text-gold-600" : "text-navy-400")} />
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-500">{label}</span>
      <span className="font-medium text-navy-800">{value}</span>
    </div>
  );
}
