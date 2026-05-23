"use client";

import * as React from "react";
import Link from "next/link";
import {
  Anchor,
  ArrowRight,
  Calendar,
  ChevronDown,
  Clock,
  CreditCard,
  HelpCircle,
  Hotel,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Shield,
  Ship,
  Sparkles,
  Users,
  Warehouse,
} from "lucide-react";
import { useIntl } from "@/i18n/IntlProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

const CATEGORIES = [
  { id: "all", label: "Alle vragen", icon: HelpCircle, count: 24 },
  { id: "kraan", label: "Kranen & afspuiten", icon: Ship, count: 7 },
  { id: "stalling", label: "Winterstalling", icon: Warehouse, count: 6 },
  { id: "planning", label: "Planning & afspraken", icon: Calendar, count: 5 },
  { id: "betalen", label: "Tarieven & betalen", icon: CreditCard, count: 3 },
  { id: "verkoop", label: "Verkoop / brokerage", icon: Anchor, count: 2 },
  { id: "verblijf", label: "Appartementen", icon: Hotel, count: 1 },
];

const QUESTIONS: { cat: string; q: string; a: string }[] = [
  {
    cat: "kraan",
    q: "Hoe lang duurt het kranen van mijn boot?",
    a: "Het kranen duurt gemiddeld 20–30 minuten, afhankelijk van de grootte en het gewicht van uw boot. Voor zeer grote schepen reserveren wij standaard een uur.",
  },
  {
    cat: "kraan",
    q: "Wat is het verschil tussen kranen en hellingen?",
    a: "Kranen gebeurt met onze 30-tons mobiele kraan. Hellingen is langzamer en geschikt voor lichte schepen.",
  },
  {
    cat: "kraan",
    q: "Wanneer moet ik mijn boot reserveren voor kraanwerk?",
    a: "Wij raden aan minimaal 2 weken van tevoren te boeken in het hoogseizoen (maart-mei en oktober-november).",
  },
  {
    cat: "stalling",
    q: "Wat zijn de tarieven voor winterstalling?",
    a: "Tarieven worden per meter berekend. Een gemiddelde boot van 8–10 meter zit tussen €450 en €650 per seizoen.",
  },
  {
    cat: "stalling",
    q: "Kan ik tijdens de stalling bij mijn boot komen?",
    a: "Ja, tijdens openingstijden kunt u uw boot bezoeken. Werkzaamheden uitvoeren is mogelijk in onze daarvoor bestemde werkruimtes.",
  },
  {
    cat: "planning",
    q: "Hoe kan ik een afspraak annuleren of verzetten?",
    a: "Log in op uw account en wijzig of annuleer uw afspraak tot 24 uur van tevoren kosteloos.",
  },
  {
    cat: "betalen",
    q: "Welke betaalmethoden accepteren jullie?",
    a: "Wij accepteren iDEAL, Bancontact, creditcard, contant en PIN. Voor stalling kan ook in termijnen worden betaald.",
  },
  {
    cat: "verkoop",
    q: "Hoe lang duurt het verkopen van mijn boot via jullie?",
    a: "De gemiddelde verkooptijd ligt tussen 3 en 6 maanden, afhankelijk van prijs, type boot en seizoen.",
  },
];

export default function FaqPage() {
  const { t } = useIntl();
  const [cat, setCat] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<number | null>(0);

  const visible = QUESTIONS.filter(
    (item) =>
      (cat === "all" || item.cat === cat) &&
      (q.length === 0 ||
        item.q.toLowerCase().includes(q.toLowerCase()) ||
        item.a.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      {/* Hero */}
      <section className="hero-gradient relative isolate">
        <div className="container-wide grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="text-white">
            <Badge tone="sand" className="mb-4" dot>
              Klantenservice
            </Badge>
            <h1 className="heading-display text-4xl text-white sm:text-5xl">
              {t("faq.title")}
            </h1>
            <p className="mt-4 max-w-xl text-sand-100/85">
              {t("faq.subtitle")}
            </p>
            <div className="mt-6 max-w-md">
              <Input
                placeholder="Zoek bijv. winterstalling, kranen, betalen..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                className="border-white/20 bg-white/95 text-navy-900 placeholder:text-navy-400"
              />
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="glass-card overflow-hidden rounded-2xl ring-1 ring-white/15">
              <div className="aspect-[4/3] w-full bg-gradient-to-tr from-marine-700 via-marine-500 to-gold-300" />
            </div>
            <div className="absolute -bottom-5 -left-5 rounded-xl bg-white p-3 shadow-elev">
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-marine-500 text-white">
                <Sparkles className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="container-wide mt-10 grid gap-6 lg:grid-cols-[18rem_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-navy-400">
              {t("faq.categories")}
            </div>
            <ul className="space-y-1">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = cat === c.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setCat(c.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                        active
                          ? "bg-navy-900 text-white"
                          : "text-navy-700 hover:bg-sand-100",
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        {c.label}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          active
                            ? "bg-white/15 text-white"
                            : "bg-navy-50 text-navy-500",
                        )}
                      >
                        {c.count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="overflow-hidden bg-marine-500 text-white">
            <div className="p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-marine-100">
                {t("faq.helpTitle")}
              </div>
              <p className="mt-2 text-sm text-marine-50">{t("faq.helpDesc")}</p>
              <div className="mt-4 space-y-2 text-sm">
                <a
                  href="tel:+31475322275"
                  className="flex items-center gap-2 font-medium hover:text-gold-200"
                >
                  <Phone className="h-4 w-4" /> 0475 32 22 75
                </a>
                <a
                  href="mailto:info@krekelberg-nautic.nl"
                  className="flex items-center gap-2 hover:text-gold-200"
                >
                  <Mail className="h-4 w-4" /> info@krekelberg-nautic.nl
                </a>
              </div>
              <Link href="#" className="mt-5 block">
                <Button
                  variant="gold"
                  size="md"
                  fullWidth
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {t("faq.contactBtn")}
                </Button>
              </Link>
            </div>
          </Card>
        </aside>

        {/* Questions */}
        <div className="space-y-3">
          {visible.length === 0 ? (
            <Card className="p-10 text-center text-navy-500">
              Geen vragen gevonden voor uw zoekopdracht.
            </Card>
          ) : null}
          {visible.map((item, idx) => {
            const isOpen = open === idx;
            return (
              <Card key={item.q} className="overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-marine-100 text-marine-700">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-navy-900">{item.q}</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 flex-shrink-0 text-navy-500 transition",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-navy-100 bg-sand-50/50 px-5 py-4 pl-[3.5rem] text-sm leading-relaxed text-navy-600">
                    {item.a}
                  </div>
                ) : null}
              </Card>
            );
          })}

          {/* Trust strip */}
          <div className="grid gap-4 pt-6 sm:grid-cols-3">
            <TrustItem
              icon={Clock}
              title={t("faq.openYard")}
              desc={t("faq.openYardDesc")}
            />
            <TrustItem
              icon={Users}
              title={t("faq.professional")}
              desc={t("faq.professionalDesc")}
            />
            <TrustItem
              icon={Shield}
              title={t("faq.trust")}
              desc={t("faq.trustDesc")}
            />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="container-wide pt-16 pb-24">
        <div className="grid items-center gap-6 rounded-2xl bg-navy-900 px-8 py-10 text-white sm:px-12 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <h3 className="heading-display text-2xl text-white sm:text-3xl">
              {t("faq.readyTitle")}
            </h3>
            <p className="mt-2 max-w-xl text-sand-100/80">
              {t("faq.readyDesc")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="gold"
                size="lg"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {t("faq.contactBtn")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10"
              >
                <MessageCircle className="mr-1.5 h-4 w-4" />
                Chat met ons
              </Button>
            </div>
          </div>
          <div className="grid gap-3 text-sm">
            <Row icon={Phone}>0475 32 22 75</Row>
            <Row icon={Mail}>info@krekelberg-nautic.nl</Row>
            <Row icon={MapPin}>Havenstraat 12, 6041 BC Roermond</Row>
          </div>
        </div>
      </section>
    </>
  );
}

function TrustItem({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-marine-50 text-marine-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold text-navy-900">{title}</div>
        <div className="text-xs text-navy-500">{desc}</div>
      </div>
    </Card>
  );
}

function Row({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sand-100/90">
      <Icon className="h-4 w-4 text-gold-300" />
      {children}
    </div>
  );
}
