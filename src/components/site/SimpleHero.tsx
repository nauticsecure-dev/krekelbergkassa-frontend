import { Badge } from '@/components/ui/Badge';

export function SimpleHero({
  badge,
  title,
  subtitle,
}: {
  badge?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="hero-gradient">
      <div className="container-wide py-16 text-white">
        {badge ? (
          <Badge tone="sand" className="mb-3" dot>
            {badge}
          </Badge>
        ) : null}
        <h1 className="heading-display text-4xl text-white sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sand-100/80">{subtitle}</p>
      </div>
    </section>
  );
}
