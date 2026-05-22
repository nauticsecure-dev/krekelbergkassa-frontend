import { SimpleHero } from './SimpleHero';
import { Card } from '@/components/ui/Card';

export interface LegalSection {
  heading: string;
  body: string[];
}

export function LegalPage({
  badge,
  title,
  subtitle,
  updatedOn,
  sections,
}: {
  badge: string;
  title: string;
  subtitle: string;
  updatedOn: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <SimpleHero badge={badge} title={title} subtitle={subtitle} />
      <section className="container-wide -mt-10 grid gap-6 pb-20 lg:grid-cols-[18rem_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
              Inhoudsopgave
            </div>
            <ol className="mt-3 space-y-2 text-sm">
              {sections.map((s, i) => (
                <li key={s.heading}>
                  <a
                    href={`#sec-${i}`}
                    className="flex items-center gap-2 text-navy-700 hover:text-navy-900"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sand-100 text-[10px] font-semibold text-navy-700">
                      {i + 1}
                    </span>
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-lg bg-sand-50 p-3 text-xs text-navy-500">
              Laatst bijgewerkt op {updatedOn}
            </div>
          </Card>
        </aside>
        <Card className="p-8">
          <div className="prose prose-sm prose-navy max-w-none">
            {sections.map((s, i) => (
              <section key={s.heading} id={`sec-${i}`} className="mb-8 scroll-mt-28">
                <h2 className="font-display text-2xl text-navy-900">
                  {i + 1}. {s.heading}
                </h2>
                {s.body.map((p, j) => (
                  <p
                    key={j}
                    className="mt-2 text-sm leading-relaxed text-navy-700"
                  >
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}
