"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  ArrowLeft,
  Fingerprint,
  Hammer,
  MapPin,
  Share2,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useIntl } from "@/i18n/IntlProvider";
import { cn } from "@/lib/cn";
import {
  LOGIN_ROLES,
  coerceLoginRole,
  type LoginRole,
} from "@/components/auth/RoleTabs";

interface VisualVariant {
  badge: string;
  title: string;
  subtitle: string;
  features: { icon: typeof ShieldCheck; title: string; desc: string }[];
  image: string;
}

type VariantKind = "signin" | "signup" | "forgot";

function getVariantKind(pathname: string): VariantKind {
  if (pathname.endsWith("/signup")) return "signup";
  if (pathname.endsWith("/forgot-password")) return "forgot";
  return "signin";
}

function buildVariant(
  kind: VariantKind,
  t: (key: string) => string,
): VisualVariant {
  if (kind === "signup") {
    return {
      badge: t("authLayout.signupBadge"),
      title: t("authLayout.signupTitle"),
      subtitle: t("authLayout.signupSubtitle"),
      image: "/img/krek/verkoop-schip.webp",
      features: [
        {
          icon: ShieldCheck,
          title: t("authLayout.signupF1Title"),
          desc: t("authLayout.signupF1Desc"),
        },
        {
          icon: Fingerprint,
          title: t("authLayout.signupF2Title"),
          desc: t("authLayout.signupF2Desc"),
        },
        {
          icon: Share2,
          title: t("authLayout.signupF3Title"),
          desc: t("authLayout.signupF3Desc"),
        },
      ],
    };
  }
  if (kind === "forgot") {
    return {
      badge: t("authLayout.forgotBadge"),
      title: t("authLayout.forgotTitle"),
      subtitle: t("authLayout.forgotSubtitle"),
      image: "/img/krek/werf-hero.webp",
      features: [
        {
          icon: ShieldCheck,
          title: t("authLayout.forgotF1Title"),
          desc: t("authLayout.forgotF1Desc"),
        },
        {
          icon: Fingerprint,
          title: t("authLayout.forgotF2Title"),
          desc: t("authLayout.forgotF2Desc"),
        },
        {
          icon: Share2,
          title: t("authLayout.forgotF3Title"),
          desc: t("authLayout.forgotF3Desc"),
        },
      ],
    };
  }
  return {
    badge: t("authLayout.signinBadge"),
    title: t("authLayout.signinTitle"),
    subtitle: t("authLayout.signinSubtitle"),
    image: "/img/krek/jachthaven.webp",
    features: [
      {
        icon: ShieldCheck,
        title: t("authLayout.signinF1Title"),
        desc: t("authLayout.signinF1Desc"),
      },
      {
        icon: Fingerprint,
        title: t("authLayout.signinF2Title"),
        desc: t("authLayout.signinF2Desc"),
      },
      {
        icon: Share2,
        title: t("authLayout.signinF3Title"),
        desc: t("authLayout.signinF3Desc"),
      },
    ],
  };
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, locale } = useIntl();
  const pathname = usePathname();
  const v = buildVariant(getVariantKind(pathname), t);

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950">
      {/* Backdrop photo full-bleed (mobile shows only as small accent) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${v.image})` }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/70 to-navy-950/40 lg:from-navy-950/85 lg:via-navy-950/55 lg:to-navy-950/10"
      />

      {/* Top utility bar */}
      <div className="relative z-[9999999999999] flex h-16 items-center justify-between px-5 sm:px-8">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-sand-100 backdrop-blur transition hover:bg-white/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("authLayout.back")}</span>
          <span className="sm:hidden">{t("authLayout.backShort")}</span>
        </Link>
        <LanguageSwitcher variant="light" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-5 pb-10 pt-2 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:py-6">
        {/* Left visual / glass card */}
        <section className="hidden text-white lg:block">
          <div className="rounded-3xl border border-white/10 bg-navy-950/50 p-8 shadow-elev backdrop-blur-md xl:p-10">
            <div className="mb-6 flex items-center justify-between">
              <Logo variant="light" />
              <span className="rounded-full border border-gold-300/40 bg-gold-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-200">
                {v.badge}
              </span>
            </div>
            <h1 className="heading-display whitespace-pre-line text-4xl text-white xl:text-5xl">
              {v.title}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-sand-100/80">
              {v.subtitle}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {v.features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-white/10 bg-navy-950/60 p-4"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/15 text-gold-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="mt-3 text-sm font-semibold text-white">
                      {f.title}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-sand-100/65">
                      {f.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-950/60 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/15 text-gold-300">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sand-100/70">
                  {t("authLayout.physicalSupport")}
                </div>
                <div className="text-sm font-medium text-white">
                  {t("authLayout.address")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right form card */}
        <section
          className={cn(
            "relative mx-auto w-full max-w-[480px] overflow-hidden rounded-3xl",
            "bg-sand-50 shadow-elev ring-1 ring-navy-100/40",
          )}
        >
          <React.Suspense fallback={<AuthTopTabsFallback label={t("loginRole.question")} />}>
            <AuthTopTabs />
          </React.Suspense>
          <div className="px-6 py-7 sm:px-8 sm:py-8">{children}</div>
        </section>
      </div>
    </div>
  );
}

function AuthTopTabsFallback({ label }: { label: string }) {
  return (
    <div className="border-b border-navy-100/60 bg-white px-4 py-3">
      <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-navy-500">
        {label}
      </div>
      <div className="h-10 rounded-full bg-sand-100" />
    </div>
  );
}

function AuthTopTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t, locale } = useIntl();
  const isSignup = pathname.endsWith("/signup");
  const isForgot = pathname.endsWith("/forgot-password");
  const role = coerceLoginRole(searchParams.get("role"));
  const page = isSignup ? "signup" : "login";

  if (isForgot) return null;

  return (
    <div className="border-b border-navy-100/60 bg-white px-4 py-3">
      <div className="flex items-center gap-1 rounded-full bg-sand-100 p-1">
        {LOGIN_ROLES.map((item) => (
          <RoleTabLink
            key={item.id}
            href={`/${locale}/${page}?role=${item.id}`}
            active={role === item.id}
            label={t(item.labelKey)}
            role={item.id}
          />
        ))}
      </div>
    </div>
  );
}

function RoleTabLink({
  href,
  active,
  label,
  role,
}: {
  href: string;
  active: boolean;
  label: string;
  role: LoginRole;
}) {
  const Icon =
    role === "customer" ? UserCircle2 : role === "staff" ? Hammer : BarChart3;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-navy-900 text-white shadow-sm"
          : "text-navy-600 hover:text-navy-900",
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full",
          active ? "bg-white/15 text-white" : "bg-navy-200/60 text-navy-700",
        )}
      >
        <Icon className="h-3 w-3" />
      </span>
      <span className="leading-none">{label}</span>
    </Link>
  );
}
