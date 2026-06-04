"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  Download,
  MonitorSmartphone,
  Share2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { usePwaInstall } from "@/lib/pwa";
import { useIntl } from "@/i18n/IntlProvider";
import { cn } from "@/lib/cn";

interface Props {
  variant?: "header" | "hero";
  className?: string;
}

export function InstallButton({ variant = "header", className }: Props) {
  const { t } = useIntl();
  const { canInstall, canShowInstall, platform, promptInstall, dismiss } =
    usePwaInstall();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<
    "idle" | "installing" | "installed" | "dismissed"
  >("idle");

  // Only render the trigger when installing is genuinely possible
  // (captured prompt, or iOS Safari manual flow) — never a dead button.
  if (!canShowInstall) return null;

  const runInstall = async () => {
    setStatus("installing");
    const result = await promptInstall();
    if (result === "accepted") {
      setStatus("installed");
      setTimeout(() => setOpen(false), 1200);
    } else if (result === "dismissed") {
      setStatus("idle");
    } else {
      // 'unavailable' — keep modal open with fallback instructions
      setStatus("idle");
    }
  };

  const onTriggerClick = () => {
    // Android/desktop with a captured prompt → fire it straight away.
    if (canInstall) {
      void runInstall();
      return;
    }
    // iOS Safari (or no prompt) → show the small modal with instructions.
    setOpen(true);
  };

  const closeAndRemember = () => {
    setOpen(false);
    dismiss();
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

  const isIos = platform === "ios-safari";

  return (
    <>
      {variant === "header" ? HeaderTrigger : HeroTrigger}

      <Modal open={open} onClose={() => setOpen(false)} size="sm" className="p-6 sm:p-7">
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-marine-500 to-navy-900 text-white shadow-elev">
            <Download className="h-6 w-6" />
          </span>

          <h2 className="font-display text-xl text-navy-900">
            {status === "installed"
              ? t("install.installed")
              : t("install.modalTitle")}
          </h2>
          <p className="mt-1.5 text-sm text-navy-600">
            {status === "installed"
              ? t("install.stepsDescDone")
              : t("install.modalDescShort")}
          </p>

          {status !== "installed" ? (
            <p className="mt-1 text-xs text-navy-400">
              {t("install.benefitLine")}
            </p>
          ) : null}

          {/* iOS manual instruction (no programmatic prompt available) */}
          {status !== "installed" && isIos ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-navy-100 bg-sand-50/70 px-4 py-3 text-left text-xs text-navy-600">
              <Share2 className="h-4 w-4 flex-shrink-0 text-marine-700" />
              <span>{t("install.iosShort")}</span>
            </div>
          ) : null}

          {/* Desktop/Android without a captured prompt → manual fallback */}
          {status !== "installed" && !isIos && !canInstall ? (
            <p className="mt-4 rounded-xl border border-navy-100 bg-sand-50/70 px-4 py-3 text-left text-xs text-navy-600">
              {t("install.fallbackUnavailable")}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2">
            {status === "installed" ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={<Check className="h-4 w-4" />}
                onClick={() => setOpen(false)}
              >
                {t("install.installed")}
              </Button>
            ) : isIos || !canInstall ? (
              // No programmatic install available → single dismiss action
              <Button variant="primary" size="lg" fullWidth onClick={closeAndRemember}>
                {t("install.close")}
              </Button>
            ) : (
              <>
                <Button
                  variant="gold"
                  size="lg"
                  fullWidth
                  onClick={runInstall}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  disabled={status === "installing"}
                >
                  {status === "installing"
                    ? t("install.installing")
                    : t("install.installCta")}
                </Button>
                <Button variant="ghost" size="md" fullWidth onClick={closeAndRemember}>
                  {t("install.later")}
                </Button>
              </>
            )}
          </div>

          <p className="mt-3 text-[11px] text-navy-400">{t("install.noStore")}</p>
        </div>
      </Modal>
    </>
  );
}
