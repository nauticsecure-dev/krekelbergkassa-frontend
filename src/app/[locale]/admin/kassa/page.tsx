"use client";

import * as React from "react";
import Link from "next/link";
import {
  Anchor,
  ArrowDownUp,
  Banknote,
  Check,
  CreditCard,
  Droplets,
  ExternalLink,
  FileText,
  Filter,
  Mail,
  MessageCircle,
  MessageSquarePlus,
  Minus,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  ScanLine,
  Ship,
  ShoppingCart,
  Star,
  Trash2,
  UserPlus,
  Wallet,
  Warehouse,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
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
import { EmptyState, LoadingState } from "@/components/admin/DataState";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { BarcodeScannerModal } from "@/components/admin/BarcodeScannerModal";
import {
  customersService,
  kassaService,
  pricingService,
  productGroupsService,
  productsService,
} from "@/lib/services";
import { useMutation, useQuery } from "@/lib/hooks/useAsync";
import type { Product, PricingRule, KassaQrSession } from "@/lib/api-types";
import { formatCurrency } from "@/lib/format";
import { productPriceInclEuros } from "@/lib/products";
import { normalizeKassaAnalytics } from "@/lib/kassa-analytics";
import { getApiErrorMessage } from "@/lib/api-error";
import { useIntl } from "@/i18n/IntlProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { getDeviceId } from "@/lib/device";
import { cn } from "@/lib/cn";

interface CartItem {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  vat_rate: number;
  image_url?: string | null;
  color?: string | null;
}

type SortKey = "recommended" | "priceAsc" | "priceDesc" | "name";

const CATEGORY_PALETTE = [
  "#1f93b8",
  "#0ea5e9",
  "#bd8528",
  "#7c3aed",
  "#059669",
  "#e11d48",
];

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

function categoryMeta(
  name: string,
  index: number,
): { icon: LucideIcon; accent: string } {
  const n = name.toLowerCase();
  if (n.includes("afspuit") || n.includes("was") || n.includes("clean"))
    return { icon: Droplets, accent: "#1f93b8" };
  if (
    n.includes("kraan") ||
    n.includes("kran") ||
    n.includes("lift") ||
    n.includes("crane")
  )
    return { icon: Anchor, accent: "#0ea5e9" };
  if (n.includes("stalling") || n.includes("winter") || n.includes("storage"))
    return { icon: Warehouse, accent: "#bd8528" };
  return {
    icon: MoreHorizontal,
    accent: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
  };
}

export default function KassaPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const localeTag =
    locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : "nl-NL";

  const [query, setQuery] = React.useState("");
  const [aiQuery, setAiQuery] = React.useState("");
  const [showAiSearch, setShowAiSearch] = React.useState(false);
  const [aiResults, setAiResults] = React.useState<{ answer: string; products: import('@/lib/api-types').Product[] } | null>(null);
  const aiSearch = useMutation((q: string) => productsService.aiSearch(q));
  // Trello #80: fast-scan mode (skip confirmation/sound; sent to scan API).
  const [fastScan, setFastScan] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortKey>("recommended");
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
  const [qrStarting, setQrStarting] = React.useState(false);
  const [qrCopied, setQrCopied] = React.useState(false);
  const [splitPayments, setSplitPayments] = React.useState([
    { method: "pin", amount: "" },
    { method: "cash", amount: "" },
  ]);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [showCustomerModal, setShowCustomerModal] = React.useState(false);
  // Trello #62: searchable customer picker
  const [showCustomerPicker, setShowCustomerPicker] = React.useState(false);
  const [customerPickerSearch, setCustomerPickerSearch] = React.useState("");
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

  // POS keyboard shortcuts (ignored when typing in inputs).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const inField =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (inField) return;
      if (e.key === "F2" || (e.ctrlKey && e.key === "k")) {
        e.preventDefault();
        setShowCustomerPicker(true);
        return;
      }
      if (e.key === "F4" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        if (cart.length) {
          setCheckoutConfirm(
            paymentMethod === "invoice" ? "on_account" : "standard",
          );
        }
        return;
      }
      if (e.key === "F8" || (e.ctrlKey && e.key === "Backspace")) {
        e.preventDefault();
        if (cart.length) {
          setCart([]);
          setNote("");
          push({ tone: "success", title: t("adminNew.kassa.clearCart") });
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cart.length, paymentMethod, push, t]);

  const productsQuery = useQuery(["products"], () =>
    productsService.list({ per_page: 200, active: true }),
  );
  const pricingQuery = useQuery(["pricing-rules"], () =>
    pricingService.rules({ per_page: 200, active: true, valid_now: true }),
  );
  const customersQuery = useQuery(["customers-kassa"], () =>
    customersService.list({ per_page: 100 }),
  );
  const recentSales = useQuery(["kassa-recent"], () =>
    kassaService.recentSales({}).catch(() => []),
  );
  const todayQuery = useQuery(["kassa-today"], async () => {
    const [analytics, sales] = await Promise.all([
      kassaService.analytics({ period: "today" }).catch(() => null),
      kassaService.recentSales({ period: "today" }).catch(() => []),
    ]);
    return normalizeKassaAnalytics(
      analytics as Record<string, unknown> | null,
      sales,
      localeTag,
    );
  });

  const createCustomer = useMutation(customersService.create);
  const checkout = useMutation(kassaService.checkout);
  const quote = useMutation(kassaService.quote);

  // Trello #80/#86: favourites, recently-used and bundles for fast checkout.
  const bundlesQuery = useQuery(["kassa-bundles"], () =>
    productsService.bundles().catch(() => []),
  );
  // Trello #80: product groups → category chip color + DB icon.
  const groupsQuery = useQuery(["kassa-product-groups"], () =>
    productGroupsService.list().catch(() => []),
  );
  // Trello #86: bulk product heatmap (times sold today/week) for tile badges.
  const productStatsQuery = useQuery(["kassa-product-stats"], () =>
    productsService.statsBulk().catch(() => []),
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
  const toggleFastScan = () => {
    setFastScan((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("kassa_fast_scan", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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

  const numericInput = Number(query.replace(/[^0-9]/g, ""));
  const queryText = query.replace(/[0-9]/g, "").trim().toLowerCase();

  const allProducts = React.useMemo(
    () => productsQuery.data?.data ?? [],
    [productsQuery.data?.data],
  );
  const allRules = React.useMemo(
    () => pricingQuery.data?.data ?? [],
    [pricingQuery.data?.data],
  );

  // Trello #80: lookup product groups by name/code → resolve chip color + icon.
  const groupByName = React.useMemo(() => {
    const map = new Map<string, { color?: string | null; icon?: string | null }>();
    ((groupsQuery.data ?? []) as Array<Record<string, unknown>>).forEach((g) => {
      const color = (g.color ?? g.display_color) as string | null | undefined;
      const icon = (g.icon ?? g.display_icon) as string | null | undefined;
      const entry = { color, icon };
      const name = g.name ? String(g.name).toLowerCase() : "";
      const code = g.code ? String(g.code).toLowerCase() : "";
      if (name) map.set(name, entry);
      if (code) map.set(code, entry);
    });
    return map;
  }, [groupsQuery.data]);

  // Trello #86: product_id → times sold (today/week) for the heatmap badge.
  const heatmap = React.useMemo(() => {
    const map = new Map<string, { today: number; week: number }>();
    const rows = (productStatsQuery.data ?? []) as Array<Record<string, unknown>>;
    rows.forEach((row) => {
      const id = String(row.product_id ?? row.id ?? "");
      if (!id) return;
      const today = Number(
        row.times_sold_today ?? row.sold_today ?? row.today ?? 0,
      );
      const week = Number(
        row.times_sold_week ?? row.sold_week ?? row.week ?? row.times_sold ?? 0,
      );
      map.set(id, {
        today: Number.isFinite(today) ? today : 0,
        week: Number.isFinite(week) ? week : 0,
      });
    });
    return map;
  }, [productStatsQuery.data]);
  const HEAT_THRESHOLD = 3;
  // Trello #62: currently-selected customer for the picker display.
  const selectedCustomer = React.useMemo(
    () => (customersQuery.data?.data ?? []).find((c) => c.id === customerId) ?? null,
    [customersQuery.data, customerId],
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
        unit_price_cents: cents,
        vat_rate: 21,
      },
    ]);
    setPrefillLocked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = React.useMemo(() => {
    const set = new Map<
      string,
      { label: string; icon: LucideIcon; accent: string }
    >();
    allProducts.forEach((p) => {
      const key = (p.category ?? p.group?.name ?? "").trim();
      if (!key || set.has(key.toLowerCase())) return;
      const meta = categoryMeta(key, set.size);
      // Trello #80: prefer the matching product group's color + DB icon.
      const group = groupByName.get(key.toLowerCase());
      const dbIcon = resolveLucideIcon(
        group?.icon ?? (p.group as { icon?: string } | null | undefined)?.icon,
      );
      const groupColor = group?.color ?? p.group?.color ?? p.color ?? null;
      set.set(key.toLowerCase(), {
        label: key,
        icon: dbIcon ?? meta.icon,
        accent: groupColor || meta.accent,
      });
    });
    return Array.from(set.values());
  }, [allProducts, groupByName]);

  const matchingRule = React.useMemo(() => {
    if (!numericInput) return null;
    return allRules.find(
      (rule) =>
        numericInput >= rule.range_from_cm && numericInput <= rule.range_to_cm,
    );
  }, [numericInput, allRules]);

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

  // When the staff types a length (e.g. "afspuiten 880"), show the matching
  // size-range tiles like the template instead of plain product cards.
  const rangeTiles = React.useMemo(() => {
    if (!numericInput) return [];
    const rules = allRules.filter((rule) => {
      const product =
        allProducts.find((p) => p.id === rule.product_id) ?? rule.product;
      if (queryText && !productMatchesText(product, queryText)) return false;
      if (
        activeCategory &&
        (product?.category ?? "").toLowerCase() !== activeCategory.toLowerCase()
      )
        return false;
      return true;
    });
    return [...rules].sort((a, b) => a.range_from_cm - b.range_from_cm);
  }, [
    numericInput,
    queryText,
    activeCategory,
    allRules,
    allProducts,
    productMatchesText,
  ]);

  const visibleProducts = React.useMemo(() => {
    let list = allProducts;
    if (activeCategory) {
      list = list.filter(
        (p) =>
          (p.category ?? p.group?.name ?? "").toLowerCase() ===
          activeCategory.toLowerCase(),
      );
    }
    if (queryText) {
      list = list.filter((p) => productMatchesText(p, queryText));
    }
    const sorted = [...list];
    if (sortBy === "priceAsc")
      sorted.sort(
        (a, b) => productPriceInclEuros(a) - productPriceInclEuros(b),
      );
    else if (sortBy === "priceDesc")
      sorted.sort(
        (a, b) => productPriceInclEuros(b) - productPriceInclEuros(a),
      );
    else if (sortBy === "name")
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [allProducts, activeCategory, queryText, sortBy, productMatchesText]);

  const usingRanges = rangeTiles.length > 0;
  const resultCount = usingRanges ? rangeTiles.length : visibleProducts.length;
  const categoryLabel = activeCategory || t("adminNew.kassa.allCategories");

  const mostChosen = React.useMemo(() => {
    // Aggregate the most frequent line descriptions across recent sales, then
    // resolve them back to products for quick re-adding.
    const counts = new Map<string, number>();
    (recentSales.data ?? []).forEach((sale) => {
      (sale.lines ?? []).forEach((line) => {
        const key = (line.description ?? "").toLowerCase();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    const ranked = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([desc]) => allProducts.find((p) => p.name.toLowerCase() === desc))
      .filter(Boolean) as Product[];
    const result = ranked.slice(0, 4);
    if (result.length < 4) {
      for (const p of allProducts) {
        if (result.length >= 4) break;
        if (!result.includes(p)) result.push(p);
      }
    }
    return result;
  }, [recentSales.data, allProducts]);

  const addProduct = (product: Product, rule?: PricingRule | null) => {
    const unitCents = rule
      ? rule.price_incl_vat
      : Math.round(productPriceInclEuros(product) * 100) ||
        product.price_incl_vat;
    const description = rule
      ? `${product.name} (${rule.range_from_cm}-${rule.range_to_cm} cm)`
      : product.name;

    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.product_id === product.id && item.description === description,
      );
      if (existing) {
        return prev.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          id: `${product.id}-${rule?.id ?? "base"}`,
          product_id: product.id,
          description,
          quantity: 1,
          unit_price_cents: unitCents,
          vat_rate: Number(product.vat_rate ?? 21),
          image_url: product.image_url,
          color: product.color ?? product.group?.color ?? null,
        },
      ];
    });
    pushRecent(product.id);
    // Trello #62: confirm each add with a toast.
    push({
      tone: "success",
      title: t("adminNew.kassa.toasts.added", { name: description }),
    });
  };

  // Trello #80: add every product in a bundle with one click.
  const addBundle = (bundle: {
    name: string;
    items?: Array<{ product_id: string; quantity?: number; product?: Product }>;
  }) => {
    const items = bundle.items ?? [];
    let added = 0;
    items.forEach((it) => {
      const product =
        it.product ?? allProducts.find((p) => p.id === it.product_id);
      if (!product) return;
      const times = Math.max(1, it.quantity ?? 1);
      for (let i = 0; i < times; i += 1) addProduct(product);
      added += 1;
    });
    if (!added) {
      push({ tone: "error", title: t("adminNew.kassa.bundleEmpty") });
    }
  };

  // Trello #80: barcode scan — resolve via the backend (search_code / EAN /
  // alias lookup + scan log) and auto-add the matched product. Works for the
  // USB/keyboard search box and the camera scanner (source = "camera").
  const [scanning, setScanning] = React.useState(false);
  const [showCamera, setShowCamera] = React.useState(false);
  const runScan = async (rawCode: string, source = "usb") => {
    const code = rawCode.trim();
    if (!code) return;
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
    setCart((prev) => prev.filter((item) => item.id !== id));

  const changeQty = (id: string, delta: number) =>
    setCart((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p,
      ),
    );

  const cartHas = (productId?: string) =>
    !!productId && cart.some((item) => item.product_id === productId);

  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.unit_price_cents * item.quantity,
    0,
  );
  const vatCents = cart.reduce(
    (sum, item) =>
      sum +
      Math.round(
        (item.unit_price_cents * item.quantity * item.vat_rate) /
          (100 + item.vat_rate),
      ),
    0,
  );
  const totalCents = subtotalCents;
  const exclCents = subtotalCents - vatCents;
  const primaryVatRate = cart[0]?.vat_rate ?? 21;
  const money = (cents: number) => formatCurrency(cents / 100, localeTag);

  const PAYMENT_BUTTONS: Array<{
    method: string;
    label: string;
    icon: LucideIcon;
    classes: string;
    activeClasses: string;
    action?: () => void;
  }> = [
    {
      method: "cash",
      label: t("adminNew.kassa.payment.cash"),
      icon: Banknote,
      classes: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
      activeClasses: "border-emerald-500 bg-emerald-500 text-white shadow-sm",
    },
    {
      method: "pin",
      label: t("adminNew.kassa.payment.pin"),
      icon: CreditCard,
      classes: "border-marine-200 text-marine-700 hover:bg-marine-50",
      activeClasses: "border-marine-500 bg-marine-500 text-white shadow-sm",
    },
    {
      method: "creditcard",
      label: t("adminNew.kassa.payment.creditcard"),
      icon: CreditCard,
      classes: "border-violet-200 text-violet-700 hover:bg-violet-50",
      activeClasses: "border-violet-500 bg-violet-500 text-white shadow-sm",
    },
    {
      method: "invoice",
      label: t("adminNew.kassa.payment.invoice"),
      icon: FileText,
      classes: "border-amber-200 text-amber-700 hover:bg-amber-50",
      activeClasses: "border-amber-500 bg-amber-500 text-white shadow-sm",
    },
    {
      method: "downpayment",
      label: t("adminNew.kassa.downPayment"),
      icon: Wallet,
      classes: "border-slate-200 text-slate-600 hover:bg-slate-50",
      activeClasses: "border-slate-500 bg-slate-500 text-white shadow-sm",
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
        return labels[paymentMethod] ?? paymentMethod;
      }
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setCustomerId(created.id);
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
    if (!cart.length) {
      push({ tone: "error", title: t("adminNew.kassa.toasts.emptyCart") });
      return;
    }
    setQrStarting(true);
    setQrSession(null);
    setQrCopied(false);
    setShowQrModal(true);
    try {
      const session = await kassaService.createQrSession({
        device_id: getDeviceId(),
        customer_id: customerId || undefined,
        method: "ideal",
        redirect_url:
          typeof window !== "undefined" ? window.location.href : undefined,
        items: cart.map((item) => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          vat_rate: item.vat_rate,
        })),
      });
      setQrSession(session);
    } catch (err) {
      setShowQrModal(false);
      push({
        tone: "error",
        title: t("adminNew.kassa.toasts.checkoutFailed"),
        message: getApiErrorMessage(err),
      });
    } finally {
      setQrStarting(false);
    }
  };

  // Poll the QR session while pending; finalize cart on success.
  const qrSettled = React.useRef(false);
  React.useEffect(() => {
    const id = qrSession?.session_id;
    const status = (qrSession?.status ?? "").toLowerCase();
    if (!showQrModal || !id) return;
    if (status === "paid" || status === "completed") {
      if (!qrSettled.current) {
        qrSettled.current = true;
        setCart([]);
        setNote("");
        void recentSales.refetch();
        void todayQuery.refetch();
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
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const next = await kassaService.qrSession(id);
        setQrSession(next);
      } catch {
        /* keep last state; will retry on next tick */
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [showQrModal, qrSession, recentSales, todayQuery, push, t]);

  const closeQrModal = () => {
    setShowQrModal(false);
    qrSettled.current = false;
    setQrSession(null);
  };

  const handleCheckout = async (
    mode: "standard" | "split" | "qr" | "on_account" = "standard",
  ) => {
    if (mode === "qr") {
      await startQrSession();
      return;
    }
    if (!cart.length) {
      push({ tone: "error", title: t("adminNew.kassa.toasts.emptyCart") });
      return;
    }
    try {
      const payload: Parameters<typeof kassaService.checkout>[0] = {
        device_id: getDeviceId(),
        customer_id: customerId || undefined,
        locale: localeTag,
        redirect_url:
          typeof window !== "undefined" ? window.location.href : undefined,
        items: cart.map((item) => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          vat_rate: item.vat_rate,
        })),
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
      if (adjustEnabled && adjustedTotal !== "") {
        if (!adjustmentReason.trim()) {
          push({ tone: "error", title: t("adminNew.kassa.adjustReasonRequired") });
          return;
        }
        payload.adjusted_total_cents = Math.round(Number(adjustedTotal) * 100);
        payload.adjustment_reason = adjustmentReason.trim();
      }

      const res = await checkout.mutate(payload);
      const checkoutUrl =
        typeof res === "string"
          ? res
          : (res.checkout_url ??
            res.payment?.checkout_url ??
            res.payment_url ??
            res.url);
      const invoiceNumber =
        typeof res === "string" ? undefined : res.invoice_number;

      setCart([]);
      setNote("");
      setAdjustEnabled(false);
      setAdjustedTotal("");
      setAdjustmentReason("");
      setShowSplitModal(false);
      void recentSales.refetch();
      void todayQuery.refetch();

      if (checkoutUrl) {
        const popup = window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        if (!popup) {
          window.location.assign(checkoutUrl);
        }
      }

      push({
        tone: "success",
        title: invoiceNumber
          ? `${t("adminNew.kassa.toasts.checkoutDone")} · ${invoiceNumber}`
          : t("adminNew.kassa.toasts.checkoutDone"),
      });
    } catch (err) {
      push({
        tone: "error",
        title: t("adminNew.kassa.toasts.checkoutFailed"),
        message: getApiErrorMessage(err),
      });
    }
  };

  const handleQuote = async () => {
    if (!cart.length) {
      push({ tone: "error", title: t("adminNew.kassa.toasts.emptyCart") });
      return;
    }
    try {
      await quote.mutate({
        customer_id: customerId || undefined,
        locale: localeTag,
        items: cart.map((item) => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          vat_rate: item.vat_rate,
        })),
      });
      push({ tone: "success", title: t("adminNew.kassa.toasts.quoteDone") });
    } catch (err) {
      push({
        tone: "error",
        title: t("adminNew.kassa.toasts.quoteFailed"),
        message: getApiErrorMessage(err),
      });
    }
  };

  const lastSale = recentSales.data?.[0];
  // Trello #62: safe total (never NaN) + deep link to the real invoice.
  const lastSaleEuros = lastSale
    ? Number(
        lastSale.total_euros ??
          lastSale.total_amount_euros ??
          Number(lastSale.total_amount_cents ?? 0) / 100,
      ) || 0
    : 0;
  const lastSaleHref =
    lastSale?.invoice_url ??
    lastSale?.admin_url ??
    (lastSale?.invoice_id
      ? `/${locale}/admin/facturen/${lastSale.invoice_id}`
      : undefined);
  const todayTurnover = todayQuery.data?.totals.turnover_cents ?? 0;
  const todayTransactions = todayQuery.data?.totals.transaction_count ?? 0;

  return (
    <>
      <AdminPageHeader
        title={t("adminNew.kassa.title")}
        subtitle={t("adminNew.kassa.subtitle")}
        stats={[
          {
            label: t("adminNew.kassa.cart"),
            value: cart.length,
            icon: ShoppingCart,
            tone: cart.length > 0 ? "marine" : "navy",
            href: `#cart`,
          },
          {
            label: t("adminNew.kassa.total"),
            value: money(totalCents),
            icon: CreditCard,
            tone: totalCents > 0 ? "gold" : "success",
            href: `#cart`,
          },
          {
            label: t("adminNew.kassa.products"),
            value:
              productsQuery.data?.meta?.total ??
              productsQuery.data?.data.length ??
              0,
            icon: Warehouse,
            tone: "navy",
            href: `/${locale}/admin/producten`,
            actionIcon: Pencil,
            actionHref: `/${locale}/admin/producten`,
            actionLabel: t("adminNew.kassa.editProducts"),
            loading: productsQuery.loading,
          },
          {
            label: t("adminNew.kassa.recentSales"),
            value: recentSales.data?.length ?? 0,
            icon: Receipt,
            tone: "marine",
            href: `/${locale}/admin/verkopen`,
            loading: recentSales.loading,
          },
        ]}
      />

      <AdminContent className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        {/* Top bar: primary search + customer (Trello #62 layout) */}
        <div className="col-span-full space-y-3 rounded-2xl border border-marine-200/60 bg-gradient-to-br from-white to-sand-50/80 p-4 shadow-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <div className="relative min-w-0 flex-[2]">
              <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-marine-500" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleBarcodeScan();
                  }
                }}
                placeholder={t("adminNew.kassa.searchPlaceholder")}
                className="input-base w-full py-3.5 pl-12 text-base font-medium shadow-sm"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-navy-100 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-navy-400 sm:inline">
                /
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowCustomerPicker(true)}
                className="flex flex-1 items-center justify-between rounded-xl border border-navy-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-marine-300"
              >
                <span className={selectedCustomer ? "font-medium text-navy-900" : "text-navy-400"}>
                  {selectedCustomer
                    ? selectedCustomer.name
                    : t("adminNew.kassa.selectCustomer")}
                </span>
                <UserPlus className="h-4 w-4 text-marine-600" />
              </button>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 py-3"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setShowCustomerModal(true)}
              >
                {t("adminNew.kassa.newCustomer")}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-navy-400">
              {t("adminNew.kassa.keyboardHints")}
            </p>
            <div className="flex items-center gap-3">
              {/* AI Natural Language Search */}
              <button
                type="button"
                onClick={() => { setShowAiSearch(!showAiSearch); if (showAiSearch) setAiResults(null); }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${showAiSearch ? 'bg-marine-600 text-white' : 'border border-marine-200 text-marine-600 hover:bg-marine-50'}`}
              >
                ✨ AI Zoeken
              </button>
            {/* Trello #80: fast-scan toggle (persisted; sent to scan API). */}
            <button
              type="button"
              role="switch"
              aria-checked={fastScan}
              onClick={toggleFastScan}
              className="inline-flex items-center gap-2 text-xs font-semibold text-navy-600"
            >
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition",
                  fastScan ? "bg-marine-500" : "bg-navy-200",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition",
                    fastScan ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </span>
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-gold-500" />
                {t("adminNew.kassa.fastScan")}
              </span>
            </button>
            </div>
          </div>

          {/* AI Search panel */}
          {showAiSearch ? (
            <form
              className="mt-3 border-t border-marine-100 pt-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!aiQuery.trim()) return;
                try {
                  const res = await aiSearch.mutate(aiQuery.trim());
                  setAiResults(res ?? null);
                } catch {
                  setAiResults(null);
                }
              }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder='Bijv. "bootverf onder €30" of "onderhoud producten"'
                  className="input-base flex-1 text-sm"
                />
                <Button type="submit" variant="outline" size="sm" disabled={aiSearch.loading}>
                  {aiSearch.loading ? 'Zoeken…' : 'Zoek'}
                </Button>
              </div>
              {aiResults ? (
                <div className="mt-2 rounded-xl border border-marine-100 bg-marine-50/60 p-3">
                  <p className="mb-2 text-sm font-medium text-marine-800">{aiResults.answer}</p>
                  <div className="flex flex-wrap gap-2">
                    {(aiResults.products ?? []).slice(0, 12).map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => {
                          const priceInclCents = Math.round(productPriceInclEuros(pr) * 100);
                          setCart((prev) => {
                            const existing = prev.find((c) => c.product_id === pr.id);
                            if (existing) return prev.map((c) => c.product_id === pr.id ? { ...c, quantity: c.quantity + 1 } : c);
                            return [...prev, { id: pr.id, product_id: pr.id, description: pr.name, quantity: 1, unit_price_cents: priceInclCents, vat_rate: Number(pr.vat_rate ?? 21), image_url: pr.image_url, color: pr.color ?? pr.group?.color }];
                          });
                          setShowAiSearch(false);
                          setAiResults(null);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-marine-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-marine-800 transition hover:bg-marine-50"
                      >
                        {pr.color ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pr.color }} /> : null}
                        {pr.name}
                        <span className="text-navy-400">{formatCurrency(productPriceInclEuros(pr), localeTag)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </form>
          ) : null}
        </div>

        {/* ----------------------------- LEFT: catalog ---------------------------- */}
        <div className="min-w-0 space-y-4">
          {/* Category tabs + quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <CategoryTab
              label={t("adminNew.kassa.allCategories")}
              icon={ShoppingCart}
              accent="#1a2e48"
              active={activeCategory === ""}
              onClick={() => setActiveCategory("")}
            />
            {categories.map((cat) => (
              <CategoryTab
                key={cat.label}
                label={cat.label}
                icon={cat.icon}
                accent={cat.accent}
                active={
                  activeCategory.toLowerCase() === cat.label.toLowerCase()
                }
                onClick={() => setActiveCategory(cat.label)}
              />
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Zap className="h-4 w-4 text-gold-500" />}
                onClick={() => searchRef.current?.focus()}
              >
                {t("adminNew.kassa.quickAdd")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ScanLine className="h-4 w-4 text-marine-600" />}
                disabled={scanning}
                onClick={() => setShowCamera(true)}
              >
                {t("adminNew.kassa.scanBarcode")}
              </Button>
              <Link href={`/${locale}/admin/producten`}>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Pencil className="h-4 w-4 text-navy-500" />}
                >
                  {t("adminNew.kassa.manageProducts")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Sort (search lives in the top bar) */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-navy-100/70 bg-white p-3 shadow-card">
            <span className="hidden items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-500 sm:inline-flex">
              <Filter className="h-4 w-4" />
              {t("adminNew.kassa.filter")}
            </span>
            <label className="relative ml-auto inline-flex items-center">
              <ArrowDownUp className="pointer-events-none absolute left-3 h-4 w-4 text-navy-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="input-base cursor-pointer py-2 pl-9 pr-8 text-sm"
                aria-label={t("adminNew.kassa.sortBy")}
              >
                <option value="recommended">
                  {t("adminNew.kassa.sort.recommended")}
                </option>
                <option value="priceAsc">
                  {t("adminNew.kassa.sort.priceAsc")}
                </option>
                <option value="priceDesc">
                  {t("adminNew.kassa.sort.priceDesc")}
                </option>
                <option value="name">{t("adminNew.kassa.sort.name")}</option>
              </select>
            </label>
          </div>

          {/* Smart match banner */}
          {matchingRule ? (
            <div className="flex items-center gap-2 rounded-xl border border-marine-200/80 bg-gradient-to-r from-marine-50 to-white px-4 py-3 text-sm text-marine-800">
              <Star className="h-4 w-4 text-marine-500" />
              <span className="font-semibold">
                {t("adminNew.kassa.smartMatch")}:
              </span>
              {matchingRule.range_from_cm}–{matchingRule.range_to_cm} cm ·{" "}
              {formatCurrency(matchingRule.price_incl_vat_euros, localeTag)}
            </div>
          ) : null}

          {/* Trello #80/#86: favourites, recently used and bundles */}
          {(() => {
            const favProducts = allProducts.filter((p) =>
              favoriteIds.has(p.id),
            );
            const recentProducts = recentIds
              .map((id) => allProducts.find((p) => p.id === id))
              .filter((p): p is Product => Boolean(p));
            const bundles = bundlesQuery.data ?? [];
            const renderChip = (
              key: string,
              label: string,
              accent: string | null | undefined,
              onClick: () => void,
            ) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy-100 bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 shadow-sm transition hover:border-marine-200 hover:bg-sand-50"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: accent ?? "#1f93b8" }}
                />
                {label}
              </button>
            );
            if (
              !favProducts.length &&
              !recentProducts.length &&
              !bundles.length
            )
              return null;
            return (
              <div className="mb-4 space-y-2">
                {favProducts.length ? (
                  <QuickRow icon={Star} label={t("adminNew.kassa.favourites")}>
                    {favProducts.map((p) =>
                      renderChip(p.id, p.name, p.color ?? p.group?.color, () =>
                        addProduct(p),
                      ),
                    )}
                  </QuickRow>
                ) : null}
                {recentProducts.length ? (
                  <QuickRow
                    icon={MoreHorizontal}
                    label={t("adminNew.kassa.recentlyUsed")}
                  >
                    {recentProducts.map((p) =>
                      renderChip(
                        `r-${p.id}`,
                        p.name,
                        p.color ?? p.group?.color,
                        () => addProduct(p),
                      ),
                    )}
                  </QuickRow>
                ) : null}
                {bundles.length ? (
                  <QuickRow
                    icon={ShoppingCart}
                    label={t("adminNew.kassa.bundles")}
                  >
                    {bundles.map((b) =>
                      renderChip(`b-${b.id}`, b.name, b.color, () =>
                        addBundle(b),
                      ),
                    )}
                  </QuickRow>
                ) : null}
              </div>
            );
          })()}

          {/* Results */}
          <div>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-lg font-semibold text-navy-900">
                {t("adminNew.kassa.resultsTitle", { category: categoryLabel })}
              </h2>
              {!productsQuery.loading ? (
                <span className="text-sm font-medium text-emerald-600">
                  ({t("adminNew.kassa.matchCount", { count: resultCount })})
                </span>
              ) : null}
            </div>

            {productsQuery.loading ? (
              <LoadingState
                label={t("adminNew.kassa.loadingProducts")}
                variant="cards"
              />
            ) : resultCount === 0 ? (
              <EmptyState
                title={t("adminNew.kassa.emptyProductsTitle")}
                message={t("adminNew.kassa.emptyProductsMessage")}
              />
            ) : usingRanges ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {rangeTiles.map((rule) => {
                  const product =
                    allProducts.find((p) => p.id === rule.product_id) ??
                    rule.product;
                  const inRange =
                    numericInput >= rule.range_from_cm &&
                    numericInput <= rule.range_to_cm;
                  const tileId = `${rule.product_id}-${rule.id}`;
                  return (
                    <CatalogTile
                      key={rule.id}
                      title={`${rule.range_from_cm} – ${rule.range_to_cm} cm`}
                      price={formatCurrency(
                        rule.price_incl_vat_euros,
                        localeTag,
                      )}
                      accent={
                        product?.color ?? product?.group?.color ?? "#1f93b8"
                      }
                      selected={cart.some((i) => i.id === tileId)}
                      highlighted={inRange}
                      onClick={() => product && addProduct(product, rule)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {visibleProducts.slice(0, 24).map((product) => {
                  const ruleMatch =
                    matchingRule && matchingRule.product_id === product.id
                      ? matchingRule
                      : null;
                  const fav = favoriteIds.has(product.id);
                  // Trello #86: heatmap badge for hot products.
                  const heat = heatmap.get(product.id);
                  const heatCount = heat ? heat.today || heat.week : 0;
                  const isHot = heatCount >= HEAT_THRESHOLD;
                  // Trello #80: small meta line (VAT % + group name).
                  const metaBits = [
                    product.vat_rate ? `${product.vat_rate}%` : null,
                    product.group?.name ?? null,
                  ].filter(Boolean) as string[];
                  return (
                    <div key={product.id} className="relative h-full">
                      {isHot ? (
                        <span
                          className="absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
                          title={t("adminNew.kassa.hotProduct", { count: heatCount })}
                        >
                          <Zap className="h-2.5 w-2.5" />
                          {heatCount}
                        </span>
                      ) : null}
                      {/* Trello #80: quick edit pencil → product detail */}
                      <Link
                        href={`/${locale}/admin/producten/${product.id}`}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t("adminNew.kassa.editProduct")}
                        className="absolute right-1.5 top-1.5 z-10 rounded-full bg-white/80 p-1 text-navy-400 transition hover:scale-110 hover:text-marine-600"
                      >
                        <Pencil className="h-3 w-3" />
                      </Link>
                      <button
                        type="button"
                        aria-pressed={fav}
                        aria-label={t("adminNew.kassa.favouriteToggle")}
                        onClick={() => toggleFavorite(product.id)}
                        className="absolute bottom-1.5 right-1.5 z-10 rounded-full bg-white/70 p-1 transition hover:scale-110"
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5",
                            fav
                              ? "fill-gold-400 text-gold-500"
                              : "text-navy-200",
                          )}
                        />
                      </button>
                      <CatalogTile
                        title={product.name}
                        subtitle={product.code}
                        meta={metaBits.length ? metaBits.join(" · ") : undefined}
                        price={formatCurrency(
                          ruleMatch
                            ? ruleMatch.price_incl_vat_euros
                            : productPriceInclEuros(product),
                          localeTag,
                        )}
                        accent={
                          product.color ?? product.group?.color ?? "#1f93b8"
                        }
                        image={product.image_url}
                        selected={cartHas(product.id)}
                        highlighted={!!ruleMatch}
                        onClick={() => addProduct(product, ruleMatch)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Most chosen */}
          {mostChosen.length > 0 ? (
            <div className="rounded-2xl border border-navy-100/70 bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
                <Star className="h-4 w-4 text-gold-500" />
                {t("adminNew.kassa.mostChosen")}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {mostChosen.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="flex items-center gap-2 rounded-xl border border-navy-100 bg-sand-50/60 px-3 py-2 text-left transition hover:border-marine-200 hover:bg-white"
                  >
                    <Ship className="h-4 w-4 shrink-0 text-marine-500" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-navy-900">
                        {product.name}
                      </div>
                      <div className="text-xs text-marine-700">
                        {formatCurrency(
                          productPriceInclEuros(product),
                          localeTag,
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Bottom stats strip */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatStrip
              icon={Star}
              tone="gold"
              label={t("adminNew.kassa.lastSale")}
              value={lastSale ? formatCurrency(lastSaleEuros, localeTag) : "—"}
              hint={lastSale?.invoice_number ?? undefined}
              href={lastSaleHref}
              loading={recentSales.loading}
            />
            <StatStrip
              icon={Receipt}
              tone="marine"
              label={t("adminNew.kassa.totalToday")}
              value={money(todayTurnover)}
              loading={todayQuery.loading}
            />
            <StatStrip
              icon={ShoppingCart}
              tone="navy"
              label={t("adminNew.kassa.transactionsCount")}
              value={todayTransactions}
              loading={todayQuery.loading}
            />
          </div>
          {/* Recent sales list */}
          <div className="rounded-2xl border border-navy-100/70 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <Receipt className="h-4 w-4 text-marine-600" />
                {t("adminNew.kassa.recentSales")}
              </h3>
              <Link
                href={`/${locale}/admin/verkopen`}
                className="text-xs font-semibold text-marine-700 hover:text-marine-900"
              >
                {t("adminNew.kassa.viewAllSales")}
              </Link>
            </div>
            {recentSales.loading ? (
              <LoadingState label={t("adminNew.common.loading")} variant="list" />
            ) : recentSales.error ? (
              <p className="text-sm text-navy-500">{t("adminNew.kassa.noRecentSales")}</p>
            ) : !recentSales.data?.length ? (
              <p className="text-sm text-navy-500">{t("adminNew.kassa.noRecentSales")}</p>
            ) : (
              <ul className="divide-y divide-navy-50">
                {(recentSales.data ?? []).slice(0, 5).map((sale, i) => {
                  const euros =
                    Number(
                      sale.total_euros ??
                        sale.total_amount_euros ??
                        Number(sale.total_amount_cents ?? 0) / 100,
                    ) || 0;
                  const href =
                    sale.invoice_url ??
                    sale.admin_url ??
                    (sale.invoice_id
                      ? `/${locale}/admin/facturen/${sale.invoice_id}`
                      : undefined);
                  return (
                    <li key={sale.id ?? sale.invoice_id ?? String((sale as { sale_id?: string }).sale_id ?? i)}>
                      {href ? (
                        <Link
                          href={href}
                          className="flex items-center justify-between py-2 text-sm hover:text-marine-700"
                        >
                          <span className="font-medium text-navy-800">
                            {sale.invoice_number ?? sale.customer_name ?? "—"}
                          </span>
                          <span className="font-semibold tabular-nums text-navy-900">
                            {formatCurrency(euros, localeTag)}
                          </span>
                        </Link>
                      ) : (
                        <div className="flex items-center justify-between py-2 text-sm">
                          <span className="font-medium text-navy-800">
                            {sale.invoice_number ?? "—"}
                          </span>
                          <span className="font-semibold tabular-nums text-navy-900">
                            {formatCurrency(euros, localeTag)}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ----------------------------- RIGHT: checkout --------------------------- */}
        <div
          id="cart"
          className={cn(
            "space-y-4 xl:sticky xl:top-24",
            showMobileCart
              ? "max-xl:fixed max-xl:inset-x-0 max-xl:bottom-0 max-xl:z-50 max-xl:max-h-[92vh] max-xl:overflow-y-auto max-xl:rounded-t-2xl max-xl:border-t max-xl:border-navy-100 max-xl:bg-sand-50 max-xl:p-4 max-xl:pb-6 max-xl:shadow-elev"
              : "max-xl:hidden",
          )}
        >
          {/* Cart */}
          <div className="overflow-hidden rounded-2xl border border-navy-100/70 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-navy-100/80 bg-gradient-to-r from-sand-50/90 to-white px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-marine-600" />
                <h3 className="text-sm font-semibold text-navy-900">
                  {t("adminNew.kassa.cart")}
                </h3>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-marine-500 px-1.5 text-xs font-bold text-white">
                  {cart.length}
                </span>
              </div>
            </div>

            {prefillLocked ? (
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
                {t("adminNew.stalling.invoiceLabels.deposit")} · {t("adminNew.stalling.toasts.kassaOpened")}
              </div>
            ) : null}
            <div className="max-h-[340px] space-y-2 overflow-y-auto scrollbar-thin p-3">
              {cart.length === 0 ? (
                <div className="rounded-xl border border-dashed border-navy-200 bg-sand-50/50 px-3 py-8 text-center text-sm text-navy-500">
                  {t("adminNew.kassa.emptyCartMessage")}
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white p-2.5"
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand-50"
                      style={{
                        borderLeft: `3px solid ${item.color ?? "#1f93b8"}`,
                      }}
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Ship className="h-5 w-5 text-marine-400" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-navy-900">
                        {item.description}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <button
                          onClick={() => changeQty(item.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-navy-200 text-navy-600 hover:bg-sand-50"
                          aria-label="-"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-6 text-center text-sm tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => changeQty(item.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-navy-200 text-navy-600 hover:bg-sand-50"
                          aria-label="+"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-navy-900">
                        {money(item.unit_price_cents * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded-md p-1 text-navy-400 hover:bg-sand-100 hover:text-rose-600"
                        aria-label="delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {note ? (
              <div className="mx-3 mb-2 rounded-lg bg-sand-50 px-3 py-2 text-xs text-navy-600">
                {note}
              </div>
            ) : null}

            {/* Totals */}
            <div className="space-y-1.5 border-t border-navy-100/80 px-4 py-3 text-sm">
              <Row
                label={t("adminNew.kassa.totalExcl")}
                value={money(exclCents)}
              />
              <Row
                label={t("adminNew.kassa.vatPercent", { rate: primaryVatRate })}
                value={money(vatCents)}
              />
              <div className="mt-1 flex items-center justify-between border-t border-navy-100 pt-2">
                <span className="text-base font-bold text-navy-900">
                  {t("adminNew.kassa.total")}
                </span>
                <span className="text-xl font-bold text-navy-900">
                  {money(totalCents)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 border-t border-navy-100/80 px-3 py-3">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={<MessageSquarePlus className="h-4 w-4" />}
                onClick={() => {
                  setNoteDraft(note);
                  setShowNoteModal(true);
                }}
              >
                {t("adminNew.kassa.addNote")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => {
                  setCart([]);
                  setNote("");
                }}
                className="text-rose-600 hover:bg-rose-50"
              >
                {t("adminNew.kassa.clearCart")}
              </Button>
            </div>
          </div>

          {/* Customer */}
          <div className="rounded-2xl border border-navy-100/70 bg-white p-4 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
              <UserPlus className="h-4 w-4 text-marine-600" />
              {t("adminNew.kassa.customer")}
            </h3>
            <button
              type="button"
              onClick={() => setShowCustomerPicker(true)}
              className="flex w-full items-center justify-between rounded-lg border border-navy-200 bg-white px-3 py-2 text-left text-sm transition hover:border-marine-300"
            >
              <span className={selectedCustomer ? "text-navy-900" : "text-navy-400"}>
                {selectedCustomer
                  ? `${selectedCustomer.name}${selectedCustomer.email ? ` · ${selectedCustomer.email}` : ""}`
                  : t("adminNew.kassa.selectCustomer")}
              </span>
              <ScanLine className="h-4 w-4 rotate-90 text-navy-300" />
            </button>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="inline-flex items-center gap-1.5 font-semibold text-marine-700 hover:text-marine-900"
              >
                <Plus className="h-4 w-4" />
                {t("adminNew.kassa.newCustomer")}
              </button>
              {customerId ? (
                <Link
                  href={`/${locale}/admin/klanten/${customerId}`}
                  className="inline-flex items-center gap-1 font-semibold text-navy-500 hover:text-navy-800"
                >
                  {t("adminNew.kassa.viewCustomer")}
                </Link>
              ) : (
                <Link
                  href={`/${locale}/admin/klanten`}
                  className="inline-flex items-center gap-1 font-semibold text-navy-500 hover:text-navy-800"
                >
                  {t("adminNew.kassa.allCustomers")}
                </Link>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-navy-400">
              {t("adminNew.kassa.customerHint")}
            </p>
          </div>

          {/* Payment methods */}
          <div className="rounded-2xl border border-navy-100/70 bg-white p-4 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-navy-900">
              {t("adminNew.kassa.paymentMethodTitle")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                const active = !btn.action && paymentMethod === btn.method;
                return (
                  <button
                    key={btn.method}
                    type="button"
                    onClick={() =>
                      btn.action ? btn.action() : setPaymentMethod(btn.method)
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                      active ? btn.activeClasses : `bg-white ${btn.classes}`,
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {btn.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={<QrCode className="h-4 w-4" />}
                onClick={() => setCheckoutConfirm("qr")}
                disabled={checkout.loading}
              >
                {t("adminNew.kassa.qrPayment")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={handleQuote}
                disabled={quote.loading}
              >
                {quote.loading
                  ? t("adminNew.kassa.calculating")
                  : t("adminNew.kassa.createQuote")}
              </Button>
            </div>
          </div>

          {/* Trello #79: total adjustment / discount with mandatory reason */}
          <div className="rounded-2xl border border-navy-100/70 bg-white p-4 shadow-card">
            <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <input
                type="checkbox"
                checked={adjustEnabled}
                onChange={(e) => {
                  setAdjustEnabled(e.target.checked);
                  if (e.target.checked && adjustedTotal === "") {
                    setAdjustedTotal((totalCents / 100).toFixed(2));
                  }
                }}
                className="h-4 w-4 rounded border-navy-300"
              />
              {t("adminNew.kassa.adjustTotal")}
            </label>
            {adjustEnabled ? (
              <div className="mt-3 space-y-2">
                <Input
                  label={t("adminNew.kassa.adjustNewTotal")}
                  inputMode="decimal"
                  value={adjustedTotal}
                  onChange={(e) => setAdjustedTotal(e.target.value)}
                />
                <Input
                  label={t("adminNew.kassa.adjustReason")}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder={t("adminNew.kassa.adjustReasonPlaceholder")}
                  required
                />
              </div>
            ) : null}
          </div>

          {/* Checkout */}
          <button
            type="button"
            onClick={() =>
              setCheckoutConfirm(
                paymentMethod === "invoice" ? "on_account" : "standard",
              )
            }
            disabled={checkout.loading || cart.length === 0}
            className="flex w-full items-center justify-between rounded-2xl bg-marine-600 px-5 py-4 text-left font-semibold text-white shadow-elev transition hover:bg-marine-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5" />
              {checkout.loading
                ? t("adminNew.kassa.processing")
                : t("adminNew.kassa.payNow")}
            </span>
            <span className="text-xl font-bold">{money(totalCents)}</span>
          </button>
        </div>
      </AdminContent>

      {/* Mobile cart bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100/80 bg-white/95 p-3 shadow-elev backdrop-blur-sm xl:hidden">
        <button
          type="button"
          onClick={() => setShowMobileCart((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl bg-marine-600 px-4 py-3.5 text-left font-semibold text-white"
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t("adminNew.kassa.cart")} ({cart.length})
          </span>
          <span className="text-lg font-bold tabular-nums">{money(totalCents)}</span>
        </button>
      </div>

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
            {t("adminNew.common.cancel")}
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
            {t("adminNew.common.save")}
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
              <select
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
                <option value="pin">PIN</option>
                <option value="cash">{t("adminNew.kassa.payment.cash")}</option>
                <option value="ideal">iDEAL</option>
                <option value="creditcard">{t("adminNew.kassa.payment.creditcard")}</option>
                <option value="bancontact">Bancontact</option>
                <option value="banktransfer">{t("adminNew.kassa.payment.banktransfer")}</option>
              </select>
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
            {t("adminNew.common.cancel")}
          </Button>
          <Button variant="gold" onClick={() => setCheckoutConfirm("split")}>
            {t("adminNew.kassa.checkout")}
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
            const regenerate = async () => {
              if (!qrSession?.session_id) return;
              try {
                const next = await kassaService.regenerateQrSession(qrSession.session_id);
                setQrSession(next);
                setQrCopied(false);
              } catch (err) {
                push({ tone: "error", title: t("adminNew.common.operationFailed"), message: getApiErrorMessage(err) });
              }
            };
            const sendEmail = async () => {
              if (!qrSession?.session_id) return;
              try {
                await kassaService.sendPaymentLink(qrSession.session_id);
                push({ tone: "success", title: t("adminNew.kassa.qrLinkSent") });
              } catch (err) {
                push({ tone: "error", title: t("adminNew.common.operationFailed"), message: getApiErrorMessage(err) });
              }
            };
            // Trello #72: send the payment link to the customer over WhatsApp.
            const sendWhatsApp = async () => {
              if (!qrSession?.session_id) return;
              try {
                await kassaService.sendPaymentLinkWhatsapp(qrSession.session_id);
                push({ tone: "success", title: t("adminNew.kassa.qrLinkSent") });
              } catch (err) {
                push({ tone: "error", title: t("adminNew.common.operationFailed"), message: getApiErrorMessage(err) });
              }
            };
            return (
              <div className="text-center">
                {amountLabel && !paid ? (
                  <div className="mb-3 text-lg font-semibold text-navy-900">
                    {t("adminNew.kassa.qrScanToPay", { amount: amountLabel })}
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
                      {t("adminNew.kassa.qrPaid")}
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
                      {expired ? t("adminNew.kassa.qrExpired") : t("adminNew.kassa.qrFailed")}
                    </div>
                    <div className="mt-4 flex justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                        onClick={() => void regenerate()}
                      >
                        {t("adminNew.kassa.qrRegenerate")}
                      </Button>
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
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-marine-50 px-3 py-1 text-xs font-semibold text-marine-700">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-marine-500" />
                      {t(`adminNew.kassa.${statusKey}`)}
                    </div>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
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
                          ? t("adminNew.kassa.qrCopied")
                          : t("adminNew.kassa.qrCopy")}
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
                          {t("adminNew.kassa.qrOpen")}
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<MessageCircle className="h-3.5 w-3.5" />}
                        onClick={() => void sendWhatsApp()}
                      >
                        {t("adminNew.kassa.qrWhatsapp")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Mail className="h-3.5 w-3.5" />}
                        onClick={() => void sendEmail()}
                      >
                        {t("adminNew.kassa.qrSendEmail")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                        onClick={() => void regenerate()}
                      >
                        {t("adminNew.kassa.qrRegenerate")}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            );
          })()}
        </AdminModalBody>
        <AdminModalFooter>
          {qrSession &&
          ![
            "paid",
            "completed",
            "expired",
            "failed",
            "canceled",
            "cancelled",
          ].includes((qrSession.status ?? "").toLowerCase()) ? (
            <Button
              variant="ghost"
              onClick={() => {
                if (qrSession?.session_id)
                  void kassaService
                    .cancelQrSession(qrSession.session_id)
                    .catch(() => {});
                closeQrModal();
              }}
            >
              {t("adminNew.kassa.qrCancel")}
            </Button>
          ) : null}
          <Button variant="gold" onClick={closeQrModal}>
            {t("adminNew.common.close")}
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
            <div className="grid grid-cols-[1fr_7rem] gap-2">
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
            <div className="grid grid-cols-[8rem_1fr] gap-2">
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
                {t("adminNew.kassa.customerNotes")}
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
            <p className="text-xs text-navy-400">{t("adminNew.kassa.addressHint")}</p>
          </AdminModalBody>
          <AdminModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCustomerModal(false)}
            >
              {t("adminNew.common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="gold"
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={createCustomer.loading}
            >
              {createCustomer.loading
                ? t("adminNew.kassa.creating")
                : t("adminNew.kassa.create")}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      {/* Trello #62: searchable customer picker */}
      <Modal open={showCustomerPicker} onClose={() => setShowCustomerPicker(false)} size="md">
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
                setCustomerId("");
                setShowCustomerPicker(false);
              }}
              className="flex w-full items-center px-3 py-2 text-left text-sm text-navy-500 hover:bg-sand-50"
            >
              {t("adminNew.kassa.noCustomer")}
            </button>
            {(customersQuery.data?.data ?? [])
              .filter((c) => {
                const q = customerPickerSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  c.name.toLowerCase().includes(q) ||
                  (c.email ?? "").toLowerCase().includes(q) ||
                  (c.phone ?? "").toLowerCase().includes(q)
                );
              })
              .slice(0, 50)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCustomerId(c.id);
                    setShowCustomerPicker(false);
                  }}
                  className={cn(
                    "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-sand-50",
                    c.id === customerId && "bg-marine-50",
                  )}
                >
                  <span className="font-medium text-navy-900">{c.name}</span>
                  <span className="text-xs text-navy-500">
                    {c.email ?? t("adminNew.common.noEmail")}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </span>
                </button>
              ))}
          </div>
        </AdminModalBody>
        <AdminModalFooter>
          <Link href={`/${locale}/admin/klanten`} className="mr-auto">
            <Button type="button" variant="ghost">
              {t("adminNew.kassa.allCustomers")}
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setShowCustomerPicker(false);
              setShowCustomerModal(true);
            }}
          >
            {t("adminNew.kassa.newCustomer")}
          </Button>
        </AdminModalFooter>
      </Modal>

      <AdminConfirmModal
        open={!!checkoutConfirm}
        onClose={() => setCheckoutConfirm(null)}
        onConfirm={async () => {
          if (!checkoutConfirm) return;
          const mode = checkoutConfirm;
          setCheckoutConfirm(null);
          await handleCheckout(mode);
        }}
        title={t("adminNew.kassa.confirmCheckoutTitle")}
        message={t("adminNew.kassa.confirmCheckout", {
          total: money(totalCents),
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
  accent,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  accent: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={
        active ? { backgroundColor: accent, borderColor: accent } : undefined
      }
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "text-white shadow-sm"
          : "border-navy-100 bg-white text-navy-700 hover:border-navy-200 hover:bg-sand-50",
      )}
    >
      <Icon
        className="h-4 w-4"
        style={active ? undefined : { color: accent }}
      />
      {label}
    </button>
  );
}

function CatalogTile({
  title,
  subtitle,
  meta,
  price,
  accent,
  selected,
  highlighted,
  image,
  onClick,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  price: string;
  accent: string;
  selected?: boolean;
  highlighted?: boolean;
  image?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={!selected ? { borderLeftColor: accent } : undefined}
      className={cn(
        "group relative flex h-full flex-col justify-between gap-2 rounded-xl border p-3 text-left transition w-full",
        selected
          ? "border-marine-500 bg-marine-500 text-white shadow-sm"
          : cn(
              "border-l-4 border-navy-100/80 bg-white hover:-translate-y-0.5 hover:border-marine-200 hover:shadow-card",
              highlighted && "ring-2 ring-marine-300",
            ),
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div
            className={cn(
              "text-sm font-semibold leading-tight",
              selected ? "text-white" : "text-navy-900",
            )}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              className={cn(
                "mt-0.5 truncate text-xs",
                selected ? "text-white/80" : "text-navy-400",
              )}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {selected ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
            <Check className="h-3 w-3" />
          </span>
        ) : image ? (
          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md ring-1 ring-navy-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="h-full w-full object-cover" />
          </span>
        ) : (
          <Ship
            className={cn(
              "h-4 w-4 shrink-0 transition",
              "text-navy-300 group-hover:text-marine-400",
            )}
          />
        )}
      </div>
      <div>
        {meta ? (
          <div
            className={cn(
              "mb-0.5 truncate text-[11px]",
              selected ? "text-white/80" : "text-navy-400",
            )}
          >
            {meta}
          </div>
        ) : null}
        <div
          className={cn(
            "text-base font-bold",
            selected ? "text-white" : "text-marine-700",
          )}
        >
          {price}
        </div>
      </div>
    </button>
  );
}

function StatStrip({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  loading,
  href,
}: {
  icon: LucideIcon;
  tone: "navy" | "marine" | "gold";
  label: string;
  value: React.ReactNode;
  hint?: string;
  loading?: boolean;
  href?: string;
}) {
  const tones: Record<string, string> = {
    navy: "bg-navy-50 text-navy-700",
    marine: "bg-marine-50 text-marine-700",
    gold: "bg-gold-50 text-gold-700",
  };
  const inner = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          tones[tone],
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
          {label}
        </div>
        {loading ? (
          <span className="mt-1 block h-5 w-16 animate-pulse rounded bg-navy-100" />
        ) : (
          <div className="truncate text-lg font-semibold text-navy-900">
            {value}
          </div>
        )}
        {hint && !loading ? (
          <div className="truncate text-xs text-navy-400">{hint}</div>
        ) : null}
      </div>
    </>
  );
  const base =
    "flex items-center gap-3 rounded-2xl border border-navy-100/70 bg-white px-4 py-3 shadow-card";
  if (href) {
    return (
      <Link
        href={href}
        className={cn(base, "transition hover:border-navy-200 hover:shadow-md")}
      >
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-500">{label}</span>
      <span className="font-medium text-navy-800">{value}</span>
    </div>
  );
}

function QuickRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-navy-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <div className="flex flex-1 gap-1.5 overflow-x-auto pb-0.5">
        {children}
      </div>
    </div>
  );
}
