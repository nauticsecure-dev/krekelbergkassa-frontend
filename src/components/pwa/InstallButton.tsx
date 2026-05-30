"use client";

import * as React from "react";
import {
  Anchor,
  Apple,
  ArrowRight,
  Bell,
  Check,
  Chrome,
  Download,
  Globe,
  MonitorSmartphone,
  Plus,
  Share2,
  Sparkles,
  WifiOff,
  Zap,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { usePwaInstall } from "@/lib/pwa";
import { useIntl } from "@/i18n/IntlProvider";
import { cn } from "@/lib/cn";

interface Props {
  variant?: "header" | "hero";
  className?: string;
}

export function InstallButton({ variant = "header", className }: Props) {
  const { t } = useIntl();
  const { canInstall, installed, platform, promptInstall } = usePwaInstall();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<
    "idle" | "installing" | "installed" | "dismissed"
  >("idle");

  if (installed) return null;

  const runInstall = async () => {
    setStatus("installing");
    const result = await promptInstall();
    if (result === "accepted") {
      setStatus("installed");
      setTimeout(() => setOpen(false), 1200);
    } else if (result === "unavailable") {
      setStatus("idle");
      setOpen(true);
    } else {
      setStatus("dismissed");
    }
  };

  const onTriggerClick = () => {
    if (platform === "ios-safari") {
      setOpen(true);
      return;
    }
    if (canInstall) {
      void runInstall();
      return;
    }
    setOpen(true);
  };

  const onInstallClick = async () => {
    if (canInstall) {
      await runInstall();
      return;
    }
    setOpen(true);
  };

  const HeaderTrigger = (
    <button
      type="button"
      onClick={onTriggerClick}
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm font-medium text-navy-800 transition hover:border-navy-200 hover:bg-sand-50",
        className,
      )}
    >
      <span className="relative flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-marine-500 to-navy-900 text-white">
        <Download className="h-3 w-3" />
      </span>
      <span className="hidden lg:inline">{t("install.trigger")}</span>
      <span className="lg:hidden">{t("nav.installShort")}</span>
      <span
        aria-hidden
        className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-gold-500 shadow-[0_0_0_3px_rgba(255,255,255,0.85)]"
      />
    </button>
  );

  const HeroTrigger = (
    <button
      type="button"
      onClick={onTriggerClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/15",
        className,
      )}
    >
      <MonitorSmartphone className="h-4 w-4" />
      {t("install.trigger")}
    </button>
  );

  return (
    <>
      {variant === "header" ? HeaderTrigger : HeroTrigger}
      <InstallModal
        open={open}
        onClose={() => setOpen(false)}
        platform={platform}
        canInstall={canInstall}
        status={status}
        onInstall={onInstallClick}
      />
    </>
  );
}

function InstallModal({
  open,
  onClose,
  platform,
  canInstall,
  status,
  onInstall,
}: {
  open: boolean;
  onClose: () => void;
  platform: ReturnType<typeof usePwaInstall>["platform"];
  canInstall: boolean;
  status: "idle" | "installing" | "installed" | "dismissed";
  onInstall: () => void;
}) {
  const { t } = useIntl();
  return (
    <Modal open={open} onClose={onClose} size="lg" className="p-0">
      <div className="grid grid-cols-1 md:grid-cols-[1.05fr_1fr]">
        {/* Visual side */}
        <div className="relative hidden overflow-hidden md:block">
          <div className="hero-gradient absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent" />
          <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white">
            <Logo variant="light" />
            <div>
              <Badge tone="sand" className="mb-3" dot>
                Progressive Web App
              </Badge>
              <h2 className="heading-display text-3xl text-white">
                {t("install.modalTitle")}
                <br />
                {t("install.modalTitle2")}
              </h2>
              <p className="mt-3 max-w-xs text-sm text-sand-100/80">
                {t("install.modalDesc")}
              </p>
              <div className="mt-6 space-y-2.5 text-sm">
                <Bullet icon={Zap}>{t("install.benefitFast")}</Bullet>
                <Bullet icon={WifiOff}>{t("install.benefitOffline")}</Bullet>
                <Bullet icon={Bell}>{t("install.benefitPush")}</Bullet>
                <Bullet icon={Anchor}>{t("install.benefitBoat")}</Bullet>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-sand-100/70">
              <Sparkles className="h-3.5 w-3.5 text-gold-300" />
              {t("install.noStore")}
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-6 -right-6 hidden xl:block">
            <div className="h-44 w-24 rounded-[28px] border-4 border-white/15 bg-navy-950/60 p-1.5 shadow-elev backdrop-blur">
              <div className="h-full w-full overflow-hidden rounded-[22px] bg-gradient-to-br from-sand-50 to-marine-50">
                <div className="m-1.5 h-2 rounded-full bg-navy-900/10" />
                <div className="m-1.5 h-3 rounded-full bg-navy-900/15" />
                <div className="m-1.5 h-12 rounded-md bg-gradient-to-br from-marine-200 to-marine-500" />
                <div className="m-1.5 h-2 rounded bg-navy-900/10" />
                <div className="m-1.5 h-2 rounded bg-navy-900/10" />
                <div className="m-1.5 h-6 rounded bg-gold-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Action side */}
        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-navy-400">
            <Globe className="h-3.5 w-3.5" />
            <span>{platformLabel(platform, t)}</span>
          </div>
          <h3 className="mt-2 font-display text-2xl text-navy-900">
            {status === "installed"
              ? t("install.stepsTitleDone")
              : t("install.stepsTitleIdle")}
          </h3>
          <p className="mt-1.5 text-sm text-navy-500">
            {status === "installed"
              ? t("install.stepsDescDone")
              : t("install.stepsDescIdle")}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Mini icon={Zap} label={t("install.miniFast")} />
            <Mini icon={WifiOff} label={t("install.miniOffline")} />
            <Mini icon={Bell} label={t("install.miniPush")} />
          </div>

          <div className="mt-6 flex-1">
            {platform === "ios-safari" ? (
              <IosSteps />
            ) : platform === "android-chrome" ? (
              <AndroidSteps canInstall={canInstall} />
            ) : (
              <DesktopSteps canInstall={canInstall} />
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {status === "installed" ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={<Check className="h-4 w-4" />}
              >
                {t("install.installed")}
              </Button>
            ) : (
              <Button
                variant="gold"
                size="lg"
                fullWidth
                onClick={onInstall}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                disabled={status === "installing"}
              >
                {status === "installing"
                  ? t("install.installing")
                  : t("install.installNow")}
              </Button>
            )}
            {!canInstall && status !== "installed" ? (
              <p className="text-center text-[11px] text-navy-500">
                {t("install.fallbackHint")}
              </p>
            ) : null}
          </div>
          {status === "dismissed" ? (
            <p className="mt-2 text-center text-xs text-rose-600">
              {t("install.dismissed")}
            </p>
          ) : null}
          <p className="mt-3 text-center text-[11px] text-navy-400">
            {t("install.footnote")}
          </p>
        </div>
      </div>
    </Modal>
  );
}

function platformLabel(
  p: ReturnType<typeof usePwaInstall>["platform"],
  t: (key: string) => string,
) {
  switch (p) {
    case "ios-safari":
      return t("install.platformIos");
    case "android-chrome":
      return t("install.platformAndroid");
    case "desktop":
      return t("install.platformDesktop");
    default:
      return t("install.platformWebapp");
  }
}

function Bullet({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sand-100/90">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-gold-300">
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </div>
  );
}

function Mini({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-navy-100 bg-sand-50/60 px-2 py-3 text-center">
      <Icon className="h-4 w-4 text-marine-700" />
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-navy-500">
        {label}
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
  icon,
}: {
  n: number;
  title: string;
  desc: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">
        {n}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
          {title}
          {icon}
        </div>
        <div className="text-xs text-navy-500">{desc}</div>
      </div>
    </li>
  );
}

function IosSteps() {
  const { t } = useIntl();
  return (
    <ol className="space-y-3">
      <Step
        n={1}
        title={t("install.iosStep1Title")}
        icon={<Share2 className="h-3.5 w-3.5 text-marine-700" />}
        desc={t("install.iosStep1Desc")}
      />
      <Step
        n={2}
        title={t("install.iosStep2Title")}
        icon={<Plus className="h-3.5 w-3.5 text-marine-700" />}
        desc={t("install.iosStep2Desc")}
      />
      <Step
        n={3}
        title={t("install.iosStep3Title")}
        icon={<Check className="h-3.5 w-3.5 text-emerald-600" />}
        desc={t("install.iosStep3Desc")}
      />
    </ol>
  );
}

function AndroidSteps({ canInstall }: { canInstall: boolean }) {
  const { t } = useIntl();
  if (canInstall) {
    return (
      <ol className="space-y-3">
        <Step
          n={1}
          title={t("install.androidStep1")}
          desc={t("install.androidStep1Desc")}
        />
        <Step
          n={2}
          title={t("install.androidStep2")}
          desc={t("install.androidStep2Desc")}
        />
        <Step
          n={3}
          title={t("install.androidStep3")}
          icon={<Check className="h-3.5 w-3.5 text-emerald-600" />}
          desc={t("install.androidStep3Desc")}
        />
      </ol>
    );
  }
  return (
    <ol className="space-y-3">
      <Step
        n={1}
        title={t("install.androidAltStep1")}
        desc={t("install.androidAltStep1Desc")}
        icon={<Chrome className="h-3.5 w-3.5 text-marine-700" />}
      />
      <Step
        n={2}
        title={t("install.androidAltStep2")}
        desc={t("install.androidAltStep2Desc")}
      />
      <Step
        n={3}
        title={t("install.androidStep3")}
        icon={<Check className="h-3.5 w-3.5 text-emerald-600" />}
        desc={t("install.androidStep3Desc")}
      />
    </ol>
  );
}

function DesktopSteps({ canInstall }: { canInstall: boolean }) {
  const { t } = useIntl();
  if (canInstall) {
    return (
      <ol className="space-y-3">
        <Step
          n={1}
          title={t("install.desktopStep1")}
          desc={t("install.desktopStep1Desc")}
          icon={<Chrome className="h-3.5 w-3.5 text-marine-700" />}
        />
        <Step
          n={2}
          title={t("install.desktopStep2")}
          desc={t("install.desktopStep2Desc")}
        />
        <Step
          n={3}
          title={t("install.desktopStep3")}
          icon={<Check className="h-3.5 w-3.5 text-emerald-600" />}
          desc={t("install.desktopStep3Desc")}
        />
      </ol>
    );
  }
  return (
    <ol className="space-y-3">
      <Step
        n={1}
        title={t("install.desktopAltStep1")}
        desc={t("install.desktopAltStep1Desc")}
        icon={<Apple className="h-3.5 w-3.5 text-marine-700" />}
      />
      <Step
        n={2}
        title={t("install.desktopAltStep2")}
        desc={t("install.desktopAltStep2Desc")}
      />
      <Step
        n={3}
        title={t("install.desktopStep3")}
        icon={<Check className="h-3.5 w-3.5 text-emerald-600" />}
        desc={t("install.desktopStep3Desc")}
      />
    </ol>
  );
}
