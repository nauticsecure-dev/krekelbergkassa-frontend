"use client";

import * as React from "react";
import {
  CreditCard,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserPlus,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminPanel,
  AdminToolbar,
} from "@/components/admin/AdminUi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingState } from "@/components/admin/DataState";
import {
  customersService,
  kassaService,
  pricingService,
  productsService,
} from "@/lib/services";
import { useMutation, useQuery } from "@/lib/hooks/useAsync";
import type { Product, PricingRule } from "@/lib/api-types";
import { formatCurrency } from "@/lib/format";
import { useIntl } from "@/i18n/IntlProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { getDeviceId } from "@/lib/device";

interface CartItem {
  id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  vat_rate: number;
}

export default function KassaPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();

  const [query, setQuery] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("pin");
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [showCustomerModal, setShowCustomerModal] = React.useState(false);
  const [newCustomer, setNewCustomer] = React.useState({ name: "", email: "" });

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
    kassaService.recentSales({}),
  );

  const createCustomer = useMutation(customersService.create);
  const checkout = useMutation(kassaService.checkout);
  const quote = useMutation(kassaService.quote);

  const numericInput = Number(query.replace(/[^0-9]/g, ""));

  const matchingRule = React.useMemo(() => {
    if (!numericInput) return null;
    return (pricingQuery.data?.data ?? []).find(
      (rule) =>
        numericInput >= rule.range_from_cm && numericInput <= rule.range_to_cm,
    );
  }, [numericInput, pricingQuery.data?.data]);

  const visibleProducts = React.useMemo(() => {
    const list = productsQuery.data?.data ?? [];
    if (!query.trim()) return list;

    const q = query.toLowerCase();
    return list.filter((product) => {
      const fields = [
        product.name,
        product.code,
        product.category,
        product.service_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(q);
    });
  }, [productsQuery.data?.data, query]);

  const addProduct = (product: Product, rule?: PricingRule | null) => {
    const unit = rule ? rule.price_incl_vat : product.price_incl_vat;
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
          unit_price_cents: unit,
          vat_rate: Number(product.vat_rate ?? 21),
        },
      ];
    });
  };

  const removeItem = (id: string) =>
    setCart((prev) => prev.filter((item) => item.id !== id));

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
  const localeTag = locale === "en" ? "en-GB" : "nl-NL";

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createCustomer.mutate({
        name: newCustomer.name,
        email: newCustomer.email || null,
      });
      setCustomerId(created.id);
      setShowCustomerModal(false);
      setNewCustomer({ name: "", email: "" });
      await customersQuery.refetch();
      push({
        tone: "success",
        title: t("adminNew.kassa.toasts.customerCreated"),
      });
    } catch (err) {
      push({
        tone: "error",
        title: t("adminNew.kassa.toasts.customerCreateFailed"),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleCheckout = async () => {
    if (!cart.length) {
      push({ tone: "error", title: t("adminNew.kassa.toasts.emptyCart") });
      return;
    }
    try {
      const res = await checkout.mutate({
        device_id: getDeviceId(),
        customer_id: customerId || undefined,
        payment_method: paymentMethod,
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
      });
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
      void recentSales.refetch();

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
        message: err instanceof Error ? err.message : undefined,
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
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

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
          },
          {
            label: t("adminNew.kassa.total"),
            value: formatCurrency(totalCents / 100, localeTag),
            icon: CreditCard,
            tone: totalCents > 0 ? "gold" : "success",
          },
          {
            label: t("adminNew.kassa.products"),
            value: visibleProducts.length,
            tone: "navy",
            loading: productsQuery.loading,
          },
          {
            label: t("adminNew.kassa.recentSales"),
            value: recentSales.data?.length ?? 0,
            tone: "success",
            loading: recentSales.loading,
          },
        ]}
      />

      <AdminContent className="grid gap-5 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <AdminToolbar>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("adminNew.kassa.searchPlaceholder")}
                  className="input-base pl-9"
                />
              </div>
              <div className="flex gap-2">
                <select
                  className="input-base"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={customersQuery.loading}
                >
                  <option value="">
                    {customersQuery.loading
                      ? t("adminNew.common.loading")
                      : t("adminNew.kassa.selectCustomer")}
                  </option>
                  {(customersQuery.data?.data ?? []).map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ·{" "}
                      {customer.email ?? t("adminNew.common.noEmail")}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  onClick={() => setShowCustomerModal(true)}
                >
                  {t("adminNew.common.new")}
                </Button>
              </div>
              <select
                className="input-base"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">{t("adminNew.kassa.payment.cash")}</option>
                <option value="pin">{t("adminNew.kassa.payment.pin")}</option>
                <option value="invoice">
                  {t("adminNew.kassa.payment.invoice")}
                </option>
                <option value="ideal">iDEAL</option>
                <option value="creditcard">
                  {t("adminNew.kassa.payment.creditcard")}
                </option>
                <option value="bancontact">Bancontact</option>
              </select>
          </AdminToolbar>

          {matchingRule ? (
              <div className="mt-3 rounded-lg border border-marine-200 bg-marine-50 px-3 py-2 text-sm text-marine-800">
                {t("adminNew.kassa.smartMatch")}: {matchingRule.range_from_cm}–
                {matchingRule.range_to_cm} cm ·{" "}
                {formatCurrency(
                  matchingRule.price_incl_vat_euros,
                  locale === "en" ? "en-GB" : "nl-NL",
                )}
              </div>
            ) : null}

          <AdminPanel title={t("adminNew.kassa.products")}>
            {productsQuery.loading ? (
              <LoadingState
                label={t("adminNew.kassa.loadingProducts")}
                variant="cards"
              />
            ) : null}
            {!productsQuery.loading && visibleProducts.length === 0 ? (
              <EmptyState
                title={t("adminNew.kassa.emptyProductsTitle")}
                message={t("adminNew.kassa.emptyProductsMessage")}
              />
            ) : null}
            {!productsQuery.loading && visibleProducts.length > 0 ? (
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleProducts.slice(0, 18).map((product) => {
                  const ruleMatch =
                    matchingRule && matchingRule.product_id === product.id
                      ? matchingRule
                      : null;
                  return (
                    <button
                      key={product.id}
                      className="rounded-xl border border-navy-100 bg-white p-3 text-left transition hover:border-navy-300"
                      onClick={() => addProduct(product, ruleMatch)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-navy-900">
                            {product.name}
                          </div>
                          <div className="text-xs text-navy-500">
                            {product.code}
                          </div>
                        </div>
                        {ruleMatch ? (
                          <Badge tone="marine">
                            {t("adminNew.kassa.match")}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-navy-900">
                        {formatCurrency(
                          ruleMatch
                            ? ruleMatch.price_incl_vat_euros
                            : product.price_incl_vat_euros,
                          locale === "en" ? "en-GB" : "nl-NL",
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel title={t("adminNew.kassa.recentSales")}>
            {recentSales.loading ? (
              <LoadingState label={t("adminNew.common.loading")} variant="list" />
            ) : null}
            {!recentSales.loading && recentSales.error ? (
              <div className="px-4 py-4 text-sm text-rose-600">
                {recentSales.error}
              </div>
            ) : null}
            <div className="divide-y divide-navy-100">
              {!recentSales.loading &&
                !recentSales.error &&
                (recentSales.data ?? []).slice(0, 8).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-navy-900">
                      {sale.invoice_number}
                    </div>
                    <div className="text-xs text-navy-500">
                      {new Date(sale.created_at).toLocaleString(locale === "en" ? "en-GB" : "nl-NL")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-navy-900">
                      {formatCurrency(
                        Number(sale.total_euros),
                        locale === "en" ? "en-GB" : "nl-NL",
                      )}
                    </div>
                    <div className="text-xs text-navy-500">
                      {sale.payment_status}
                    </div>
                  </div>
                </div>
              ))}
              {!recentSales.loading &&
              !recentSales.error &&
              recentSales.data &&
              recentSales.data.length === 0 ? (
                <div className="px-4 py-5 text-sm text-navy-500">
                  {t("adminNew.kassa.noRecentSales")}
                </div>
              ) : null}
            </div>
          </AdminPanel>
        </div>

        <Card className="sticky top-24 self-start overflow-hidden shadow-elev">
          <div className="border-b border-navy-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-navy-900">
                {t("adminNew.kassa.cart")}
              </div>
              <Badge tone="navy">
                {t("adminNew.kassa.lines", { count: cart.length })}
              </Badge>
            </div>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="rounded-lg border border-dashed border-navy-200 px-3 py-8 text-center text-sm text-navy-500">
                {t("adminNew.kassa.emptyCartMessage")}
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-navy-100 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-navy-900">
                        {item.description}
                      </div>
                      <div className="text-xs text-navy-500">
                        {t("adminNew.kassa.vat")} {item.vat_rate}%
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-md p-1 text-navy-400 hover:bg-sand-100 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded border border-navy-200 px-2 py-0.5"
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((p) =>
                              p.id === item.id
                                ? {
                                    ...p,
                                    quantity: Math.max(1, p.quantity - 1),
                                  }
                                : p,
                            ),
                          )
                        }
                      >
                        -
                      </button>
                      <span className="min-w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        className="rounded border border-navy-200 px-2 py-0.5"
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((p) =>
                              p.id === item.id
                                ? { ...p, quantity: p.quantity + 1 }
                                : p,
                            ),
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                    <div className="font-semibold text-navy-900">
                      {formatCurrency(
                        (item.unit_price_cents * item.quantity) / 100,
                        locale === "en" ? "en-GB" : "nl-NL",
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 border-t border-navy-100 bg-sand-50/50 p-4 text-sm">
            <Row
              label={t("adminNew.kassa.subtotal")}
              value={formatCurrency(
                subtotalCents / 100,
                locale === "en" ? "en-GB" : "nl-NL",
              )}
            />
            <Row
              label={t("adminNew.kassa.vatIncluded")}
              value={formatCurrency(
                vatCents / 100,
                locale === "en" ? "en-GB" : "nl-NL",
              )}
            />
            <Row
              label={t("adminNew.kassa.total")}
              value={formatCurrency(
                totalCents / 100,
                locale === "en" ? "en-GB" : "nl-NL",
              )}
              strong
            />

            <div className="pt-2">
              <Button
                variant="gold"
                size="md"
                fullWidth
                leftIcon={<CreditCard className="h-4 w-4" />}
                onClick={handleCheckout}
                disabled={checkout.loading}
              >
                {checkout.loading
                  ? t("adminNew.kassa.processing")
                  : t("adminNew.kassa.checkout")}
              </Button>
            </div>
            <Button
              variant="outline"
              size="md"
              fullWidth
              leftIcon={<ShoppingCart className="h-4 w-4" />}
              onClick={handleQuote}
              disabled={quote.loading}
            >
              {quote.loading
                ? t("adminNew.kassa.calculating")
                : t("adminNew.kassa.createQuote")}
            </Button>
          </div>
        </Card>
      </AdminContent>

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
    </>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy-600">{label}</span>
      <span
        className={strong ? "font-semibold text-navy-900" : "text-navy-800"}
      >
        {value}
      </span>
    </div>
  );
}
