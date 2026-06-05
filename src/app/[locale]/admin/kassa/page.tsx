"use client";

import * as React from "react";
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
  MessageSquarePlus,
  Minus,
  MoreHorizontal,
  Plus,
  QrCode,
  Receipt,
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
import { EmptyState, LoadingState } from "@/components/admin/DataState";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import {
  customersService,
  kassaService,
  pricingService,
  productsService,
} from "@/lib/services";
import { useMutation, useQuery } from "@/lib/hooks/useAsync";
import type { Product, PricingRule } from "@/lib/api-types";
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

function categoryMeta(name: string, index: number): { icon: LucideIcon; accent: string } {
  const n = name.toLowerCase();
  if (n.includes("afspuit") || n.includes("was") || n.includes("clean"))
    return { icon: Droplets, accent: "#1f93b8" };
  if (n.includes("kraan") || n.includes("kran") || n.includes("lift") || n.includes("crane"))
    return { icon: Anchor, accent: "#0ea5e9" };
  if (n.includes("stalling") || n.includes("winter") || n.includes("storage"))
    return { icon: Warehouse, accent: "#bd8528" };
  return { icon: MoreHorizontal, accent: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] };
}

export default function KassaPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const localeTag = locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : "nl-NL";

  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortKey>("recommended");
  const [customerId, setCustomerId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("pin");
  const [note, setNote] = React.useState("");
  const [showNoteModal, setShowNoteModal] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [showSplitModal, setShowSplitModal] = React.useState(false);
  const [showQrModal, setShowQrModal] = React.useState(false);
  const [qrUrl, setQrUrl] = React.useState<string | null>(null);
  const [splitPayments, setSplitPayments] = React.useState([
    { method: "pin", amount: "" },
    { method: "cash", amount: "" },
  ]);
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [showCustomerModal, setShowCustomerModal] = React.useState(false);
  const [newCustomer, setNewCustomer] = React.useState({ name: "", email: "", phone: "" });
  const [checkoutConfirm, setCheckoutConfirm] = React.useState<
    "standard" | "split" | "qr" | "on_account" | null
  >(null);

  const searchRef = React.useRef<HTMLInputElement>(null);

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

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && query.length >= 8 && /^\d+$/.test(query)) {
        const match = allProducts.find(
          (p) => p.barcode === query || p.code === query,
        );
        if (match) {
          addProduct(match);
          setQuery("");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query, allProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = React.useMemo(() => {
    const set = new Map<string, { label: string; icon: LucideIcon; accent: string }>();
    allProducts.forEach((p) => {
      const key = (p.category ?? p.group?.name ?? "").trim();
      if (!key || set.has(key.toLowerCase())) return;
      const meta = categoryMeta(key, set.size);
      set.set(key.toLowerCase(), { label: key, ...meta });
    });
    return Array.from(set.values());
  }, [allProducts]);

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
      const product = allProducts.find((p) => p.id === rule.product_id) ?? rule.product;
      if (queryText && !productMatchesText(product, queryText)) return false;
      if (
        activeCategory &&
        (product?.category ?? "").toLowerCase() !== activeCategory.toLowerCase()
      )
        return false;
      return true;
    });
    return [...rules].sort((a, b) => a.range_from_cm - b.range_from_cm);
  }, [numericInput, queryText, activeCategory, allRules, allProducts, productMatchesText]);

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
      sorted.sort((a, b) => productPriceInclEuros(a) - productPriceInclEuros(b));
    else if (sortBy === "priceDesc")
      sorted.sort((a, b) => productPriceInclEuros(b) - productPriceInclEuros(a));
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
      .map(([desc]) =>
        allProducts.find((p) => p.name.toLowerCase() === desc),
      )
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
      : Math.round(productPriceInclEuros(product) * 100) || product.price_incl_vat;
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
  };

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
      });
      setCustomerId(created.id);
      setShowCustomerModal(false);
      setNewCustomer({ name: "", email: "", phone: "" });
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

  const handleCheckout = async (
    mode: "standard" | "split" | "qr" | "on_account" = "standard",
  ) => {
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
          mode === "qr" ? "ideal" : mode === "on_account" ? "invoice" : paymentMethod;
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
      setShowSplitModal(false);
      void recentSales.refetch();
      void todayQuery.refetch();

      if (mode === "qr" && checkoutUrl) {
        setQrUrl(checkoutUrl);
        setShowQrModal(true);
      } else if (checkoutUrl) {
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
        ]}
      />

      <AdminContent className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
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
                active={activeCategory.toLowerCase() === cat.label.toLowerCase()}
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
                onClick={() => searchRef.current?.focus()}
              >
                {t("adminNew.kassa.scanBarcode")}
              </Button>
            </div>
          </div>

          {/* Search + sort */}
          <div className="flex flex-col gap-3 rounded-2xl border border-navy-100/70 bg-white p-3 shadow-card sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("adminNew.kassa.searchPlaceholder")}
                className="input-base w-full pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-500 sm:inline-flex">
                <Filter className="h-4 w-4" />
                {t("adminNew.kassa.filter")}
              </span>
              <label className="relative inline-flex items-center">
                <ArrowDownUp className="pointer-events-none absolute left-3 h-4 w-4 text-navy-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="input-base cursor-pointer py-2 pl-9 pr-8 text-sm"
                  aria-label={t("adminNew.kassa.sortBy")}
                >
                  <option value="recommended">{t("adminNew.kassa.sort.recommended")}</option>
                  <option value="priceAsc">{t("adminNew.kassa.sort.priceAsc")}</option>
                  <option value="priceDesc">{t("adminNew.kassa.sort.priceDesc")}</option>
                  <option value="name">{t("adminNew.kassa.sort.name")}</option>
                </select>
              </label>
            </div>
          </div>

          {/* Smart match banner */}
          {matchingRule ? (
            <div className="flex items-center gap-2 rounded-xl border border-marine-200/80 bg-gradient-to-r from-marine-50 to-white px-4 py-3 text-sm text-marine-800">
              <Star className="h-4 w-4 text-marine-500" />
              <span className="font-semibold">{t("adminNew.kassa.smartMatch")}:</span>
              {matchingRule.range_from_cm}–{matchingRule.range_to_cm} cm ·{" "}
              {formatCurrency(matchingRule.price_incl_vat_euros, localeTag)}
            </div>
          ) : null}

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
              <LoadingState label={t("adminNew.kassa.loadingProducts")} variant="cards" />
            ) : resultCount === 0 ? (
              <EmptyState
                title={t("adminNew.kassa.emptyProductsTitle")}
                message={t("adminNew.kassa.emptyProductsMessage")}
              />
            ) : usingRanges ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {rangeTiles.map((rule) => {
                  const product =
                    allProducts.find((p) => p.id === rule.product_id) ?? rule.product;
                  const inRange =
                    numericInput >= rule.range_from_cm &&
                    numericInput <= rule.range_to_cm;
                  const tileId = `${rule.product_id}-${rule.id}`;
                  return (
                    <CatalogTile
                      key={rule.id}
                      title={`${rule.range_from_cm} – ${rule.range_to_cm} cm`}
                      price={formatCurrency(rule.price_incl_vat_euros, localeTag)}
                      accent={product?.color ?? product?.group?.color ?? "#1f93b8"}
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
                  return (
                    <CatalogTile
                      key={product.id}
                      title={product.name}
                      subtitle={product.code}
                      price={formatCurrency(
                        ruleMatch
                          ? ruleMatch.price_incl_vat_euros
                          : productPriceInclEuros(product),
                        localeTag,
                      )}
                      accent={product.color ?? product.group?.color ?? "#1f93b8"}
                      selected={cartHas(product.id)}
                      highlighted={!!ruleMatch}
                      onClick={() => addProduct(product, ruleMatch)}
                    />
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
                        {formatCurrency(productPriceInclEuros(product), localeTag)}
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
              value={
                lastSale
                  ? formatCurrency(Number(lastSale.total_euros), localeTag)
                  : "—"
              }
              hint={lastSale?.invoice_number ?? undefined}
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
        </div>

        {/* ----------------------------- RIGHT: checkout --------------------------- */}
        <div id="cart" className="space-y-4 xl:sticky xl:top-24">
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
                      style={{ borderLeft: `3px solid ${item.color ?? "#1f93b8"}` }}
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
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
              <Row label={t("adminNew.kassa.totalExcl")} value={money(exclCents)} />
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
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input-base w-full"
            >
              <option value="">
                {customersQuery.loading
                  ? t("adminNew.common.loading")
                  : t("adminNew.kassa.selectCustomer")}
              </option>
              {(customersQuery.data?.data ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.email ?? t("adminNew.common.noEmail")}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCustomerModal(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-marine-700 hover:text-marine-900"
            >
              <Plus className="h-4 w-4" />
              {t("adminNew.kassa.newCustomer")}
            </button>
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

          {/* Checkout */}
          <button
            type="button"
            onClick={() =>
              setCheckoutConfirm(paymentMethod === "invoice" ? "on_account" : "standard")
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

      {/* Note modal */}
      <Modal open={showNoteModal} onClose={() => setShowNoteModal(false)} size="md">
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
      <Modal open={showSplitModal} onClose={() => setShowSplitModal(false)} size="md">
        <AdminModalHeader title={t("adminNew.kassa.splitPayment")} />
        <AdminModalBody>
          {splitPayments.map((row, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2">
              <select
                className="input-base"
                value={row.method}
                onChange={(e) =>
                  setSplitPayments((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, method: e.target.value } : p)),
                  )
                }
              >
                <option value="pin">PIN</option>
                <option value="cash">{t("adminNew.kassa.payment.cash")}</option>
              </select>
              <Input
                type="number"
                step="0.01"
                value={row.amount}
                onChange={(e) =>
                  setSplitPayments((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, amount: e.target.value } : p)),
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

      {/* QR modal */}
      <Modal open={showQrModal} onClose={() => setShowQrModal(false)} size="md">
        <AdminModalHeader title={t("adminNew.kassa.qrPayment")} />
        <AdminModalBody>
          <div className="text-center">
            {qrUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`}
                  alt="Mollie QR"
                  className="mx-auto rounded-lg border border-navy-100"
                />
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-marine-700"
                >
                  {qrUrl} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </>
            ) : null}
          </div>
        </AdminModalBody>
      </Modal>

      {/* New customer modal */}
      <Modal open={showCustomerModal} onClose={() => setShowCustomerModal(false)} size="md">
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
      style={active ? { backgroundColor: accent, borderColor: accent } : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
        active
          ? "text-white shadow-sm"
          : "border-navy-100 bg-white text-navy-700 hover:border-navy-200 hover:bg-sand-50",
      )}
    >
      <Icon className="h-4 w-4" style={active ? undefined : { color: accent }} />
      {label}
    </button>
  );
}

function CatalogTile({
  title,
  subtitle,
  price,
  accent,
  selected,
  highlighted,
  onClick,
}: {
  title: string;
  subtitle?: string;
  price: string;
  accent: string;
  selected?: boolean;
  highlighted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={!selected ? { borderLeftColor: accent } : undefined}
      className={cn(
        "group relative flex flex-col justify-between gap-2 rounded-xl border p-3 text-left transition",
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
        ) : (
          <Ship
            className={cn(
              "h-4 w-4 shrink-0 transition",
              "text-navy-300 group-hover:text-marine-400",
            )}
          />
        )}
      </div>
      <div
        className={cn(
          "text-base font-bold",
          selected ? "text-white" : "text-marine-700",
        )}
      >
        {price}
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
}: {
  icon: LucideIcon;
  tone: "navy" | "marine" | "gold";
  label: string;
  value: React.ReactNode;
  hint?: string;
  loading?: boolean;
}) {
  const tones: Record<string, string> = {
    navy: "bg-navy-50 text-navy-700",
    marine: "bg-marine-50 text-marine-700",
    gold: "bg-gold-50 text-gold-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-navy-100/70 bg-white px-4 py-3 shadow-card">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
          {label}
        </div>
        {loading ? (
          <span className="mt-1 block h-5 w-16 animate-pulse rounded bg-navy-100" />
        ) : (
          <div className="truncate text-lg font-semibold text-navy-900">{value}</div>
        )}
        {hint && !loading ? (
          <div className="truncate text-xs text-navy-400">{hint}</div>
        ) : null}
      </div>
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
