'use client';

import { SimpleHero } from './SimpleHero';
import { Card } from '@/components/ui/Card';
import { EditableText } from '@/components/cms/EditableText';
import { EditSafeLink } from '@/components/cms/EditSafeLink';
import { useRegisterCmsPage } from '@/components/cms/CmsProvider';

export interface LegalSection {
  heading: string;
  body: string[];
}

export function LegalPage({
  page,
  badge,
  title,
  subtitle,
  updatedOn,
  sections,
}: {
  page: string;
  badge: string;
  title: string;
  subtitle: string;
  updatedOn: string;
  sections: LegalSection[];
}) {
  useRegisterCmsPage(page);
  const text = (key: string, fallback: string, type = 'short_text') => (
    <EditableText blockKey={`${page}.${key}`} page={page} section="legal" type={type}>{fallback}</EditableText>
  );
  return (
    <>
      <SimpleHero badge={text('badge', badge)} title={text('title', title, 'heading')} subtitle={text('subtitle', subtitle, 'long_text')} />
      <section className="container-wide -mt-10 grid grid-cols-1 gap-6 pb-20 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
              {text('contents', 'Inhoudsopgave')}
            </div>
            <ol className="mt-3 space-y-2 text-sm">
              {sections.map((s, i) => (
                <li key={s.heading}>
                  <EditSafeLink
                    href={`#sec-${i}`}
                    className="flex items-center gap-2 text-navy-700 hover:text-navy-900"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sand-100 text-[10px] font-semibold text-navy-700">
                      {text(`section.${i}.number`, String(i + 1))}
                    </span>
                    {text(`section.${i}.heading`, s.heading, 'heading')}
                  </EditSafeLink>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-lg bg-sand-50 p-3 text-xs text-navy-500">
              {text('updated_label', 'Laatst bijgewerkt op')} {text('updated_on', updatedOn)}
            </div>
          </Card>
        </aside>
        <Card className="min-w-0 break-words p-8">
          <div className="prose prose-sm prose-navy max-w-none">
            {sections.map((s, i) => (
              <section key={s.heading} id={`sec-${i}`} className="mb-8 scroll-mt-28">
                <h2 className="font-display text-2xl text-navy-900">
                  {text(`section.${i}.number`, String(i + 1))}. {text(`section.${i}.heading`, s.heading, 'heading')}
                </h2>
                {s.body.map((p, j) => (
                  <p
                    key={j}
                    className="mt-2 text-sm leading-relaxed text-navy-700"
                  >
                    {text(`section.${i}.body.${j}`, p, 'long_text')}
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
