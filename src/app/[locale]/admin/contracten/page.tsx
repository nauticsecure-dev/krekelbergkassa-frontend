'use client';

import * as React from 'react';
import {
  AlignLeft,
  Bold,
  CheckSquare,
  ChevronDown,
  Eye,
  FileText,
  Italic,
  Languages,
  Link2,
  List,
  Plus,
  Save,
  Send,
  Sparkles,
  Tag,
  Undo2,
  X,
} from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const LOCALES = [
  { id: 'nl', label: 'NL' },
  { id: 'en', label: 'EN' },
  { id: 'de', label: 'DE' },
  { id: 'fr', label: 'FR' },
];

const TAG_SUGGESTIONS = [
  '{{customer_name}}',
  '{{boat_name}}',
  '{{contract_start}}',
  '{{contract_end}}',
  '{{location_code}}',
  '{{total_amount}}',
  '{{vat_amount}}',
];

export default function ContractsEditorPage() {
  const { t } = useIntl();
  const [activeLocale, setActiveLocale] = React.useState('nl');
  const [showTags, setShowTags] = React.useState(false);

  const REQUIRED_CHECKBOXES = [
    { id: 'terms', label: 'Akkoord met algemene voorwaarden', required: true },
    { id: 'privacy', label: 'Akkoord met privacyverklaring', required: true },
    { id: 'storage', label: 'Akkoord met stallingsvoorwaarden', required: true },
    { id: 'newsletter', label: 'Inschrijven voor nieuwsbrief', required: false },
  ];

  const VALIDATION = [
    { ok: true, label: 'Variabelen ingevuld' },
    { ok: true, label: 'Verplichte secties aanwezig' },
    { ok: false, label: 'Geen TODO-markeringen' },
    { ok: true, label: 'Vereiste checkboxes' },
  ];

  return (
    <>
      <AdminPageHeader
        title="Stallingscontract — Winter 2026"
        subtitle={t('admin.contracts.subtitle')}
        rightSlot={
          <>
            <div className="flex items-center gap-1 rounded-lg border border-navy-100 bg-white p-1">
              {LOCALES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setActiveLocale(l.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition',
                    activeLocale === l.id
                      ? 'bg-navy-900 text-white'
                      : 'text-navy-600 hover:bg-sand-100'
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />}>
              {t('admin.contracts.preview')}
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Save className="h-4 w-4" />}>
              {t('admin.contracts.saveDraft')}
            </Button>
            <Button variant="gold" size="sm" leftIcon={<Send className="h-4 w-4" />}>
              {t('admin.contracts.publish')} v4
            </Button>
          </>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="gold" dot>
            {t('admin.contracts.draft')} · v4
          </Badge>
          <Badge tone="navy">Wijzigingen sinds gepubliceerd</Badge>
        </div>
      </AdminPageHeader>

      <div className="px-4 py-5 sm:px-6">
        <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
          {/* Editor + Preview side-by-side on lg+ */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Editor */}
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b border-navy-100 bg-sand-50/60 px-4 py-2.5">
                <div className="text-xs font-semibold uppercase tracking-widest text-navy-500">
                  {t('admin.contracts.changeSummary')}
                </div>
              </div>
              <div className="border-b border-navy-100 px-4 py-2">
                <textarea
                  placeholder="Beschrijf kort wat er aangepast werd in deze versie..."
                  rows={2}
                  className="w-full resize-none border-0 bg-transparent p-0 text-sm text-navy-800 placeholder:text-navy-400 focus:outline-none focus:ring-0"
                  defaultValue="Toevoeging: aanvullende betaalvoorwaarden voor termijnbetalingen."
                />
              </div>

              <div className="flex flex-wrap items-center gap-1 border-b border-navy-100 px-3 py-1.5">
                <ToolBtn icon={Bold} />
                <ToolBtn icon={Italic} />
                <ToolBtn icon={AlignLeft} />
                <ToolBtn icon={List} />
                <ToolBtn icon={Link2} />
                <div className="mx-1 h-5 w-px bg-navy-100" />
                <button
                  onClick={() => setShowTags((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-md border border-navy-100 px-2 py-1 text-xs font-medium text-navy-700 hover:bg-sand-100"
                >
                  <Tag className="h-3 w-3" /> Invoegen tag
                </button>
                <div className="ml-auto flex items-center gap-2 text-xs text-navy-400">
                  <Languages className="h-3.5 w-3.5" /> {activeLocale.toUpperCase()}
                </div>
              </div>

              <div className="flex-1 p-5">
                <h2 className="font-display text-2xl text-navy-900">
                  2. Commerciële Voorwaarden
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-navy-700">
                  De commerciële voorwaarden zijn vastgelegd in de bijlagen die door de
                  Partijen worden bevestigd en ondertekend.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-navy-700">
                  De Partner ontvangt commissie volgens de met{' '}
                  <Tagged>{`{{customer_name}}`}</Tagged> overeengekomen tarieven.
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-navy-700">
                  <li><strong>Commissie:</strong> conform bijlage 2; uitbetaald per maand.</li>
                  <li><strong>Betaaltermijn:</strong> 14 dagen na factuurdatum.</li>
                  <li><strong>Opzegging:</strong> 30 dagen schriftelijk.</li>
                </ul>

                {showTags ? (
                  <div className="mt-5 rounded-xl border border-marine-200 bg-marine-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-widest text-marine-700">
                        Beschikbare tags
                      </div>
                      <button
                        onClick={() => setShowTags(false)}
                        className="text-xs text-marine-700 hover:text-marine-900"
                      >
                        Sluiten
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {TAG_SUGGESTIONS.map((tg) => (
                        <button
                          key={tg}
                          className="rounded-md border border-marine-200 bg-white px-2.5 py-1 text-xs font-medium text-marine-800 hover:bg-marine-100"
                        >
                          {tg}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-navy-100 bg-sand-50/40 px-4 py-2.5 text-xs">
                <span className="text-navy-500">Sectie 2 van 8</span>
                <button className="inline-flex items-center gap-1 font-medium text-marine-700 hover:text-marine-800">
                  <Undo2 className="h-3.5 w-3.5" /> Herstel
                </button>
              </div>
            </Card>

            {/* Preview */}
            <Card className="overflow-hidden">
              <div className="border-b border-navy-100 px-4 py-2.5">
                <div className="text-xs font-semibold uppercase tracking-widest text-navy-500">
                  {t('admin.contracts.preview2')}
                </div>
              </div>
              <div className="bg-sand-50/60 px-5 py-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-marine-700" />
                  <div>
                    <div className="text-sm font-semibold text-navy-900">
                      Stallingscontract – Winter 2026
                    </div>
                    <div className="text-xs text-navy-500">
                      Voor klant <strong>Jan Jansen</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg">2. Commerciële voorwaarden</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-700">
                  De commerciële voorwaarden zijn vastgelegd in de bijlagen die door
                  de Partijen — Krekelberg Nautic en Jan Jansen — bevestigd zijn.
                </p>
                <Badge tone="marine" className="mt-3">
                  {t('admin.contracts.sourcePill')}: Winter 2026
                </Badge>
              </div>
            </Card>
          </div>

          {/* Right rail */}
          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <Card className="overflow-hidden">
              <div className="border-b border-navy-100 px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-widest text-navy-500">
                    {t('admin.contracts.syncTags')}
                  </div>
                  <Button variant="ghost" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                    {t('admin.common.new')}
                  </Button>
                </div>
              </div>
              <ul className="divide-y divide-navy-100">
                {TAG_SUGGESTIONS.map((tg, i) => (
                  <li key={tg} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-mono text-xs text-navy-800">{tg}</span>
                    <Badge tone={i % 3 === 0 ? 'success' : 'navy'}>
                      {i % 3 === 0 ? 'Sync' : 'Pending'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                {t('admin.contracts.requiredCheckboxes')}
              </div>
              <ul className="mt-3 space-y-2">
                {REQUIRED_CHECKBOXES.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 rounded-lg border border-navy-100 p-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-marine-50 text-marine-700">
                      <CheckSquare className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-navy-900">{c.label}</div>
                      <div className="text-[11px] text-navy-400">
                        {c.required ? 'Verplicht' : 'Optioneel'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={c.required}
                      className="h-4 w-4 rounded border-navy-200 text-marine-600"
                    />
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                {t('admin.contracts.validation')}
              </div>
              <ul className="mt-3 space-y-2">
                {VALIDATION.map((v) => (
                  <li
                    key={v.label}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 text-sm',
                      v.ok ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800' : 'border-rose-200 bg-rose-50/50 text-rose-800'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full',
                        v.ok ? 'bg-emerald-100' : 'bg-rose-100'
                      )}
                    >
                      {v.ok ? '✓' : '!'}
                    </span>
                    {v.label}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="overflow-hidden bg-gradient-to-tr from-navy-900 to-marine-700 text-white">
              <div className="p-5">
                <Sparkles className="h-5 w-5 text-gold-300" />
                <div className="mt-2 text-sm font-semibold">AI tag-controle</div>
                <p className="mt-1 text-xs text-sand-100/80">
                  Laat AI controleren of alle tags correct gemapt zijn.
                </p>
                <Button variant="gold" size="sm" className="mt-3" fullWidth>
                  Start controle
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

function Tagged({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center rounded-md bg-marine-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-marine-800">
      {children}
    </span>
  );
}

function ToolBtn({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <button className="rounded-md p-1.5 text-navy-600 hover:bg-sand-100">
      <Icon className="h-4 w-4" />
    </button>
  );
}
