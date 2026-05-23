import { cn } from '@/lib/cn';

interface CrestLogoProps {
  className?: string;
  labelClassName?: string;
  withWordmark?: boolean;
}

export function CrestLogo({
  className,
  labelClassName,
  withWordmark = false,
}: CrestLogoProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        viewBox="0 0 210 280"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Krekelberg Nautic crest"
        className="h-auto w-[118px] drop-shadow-[0_10px_30px_rgba(15,27,42,0.16)]"
      >
        <defs>
          <linearGradient id="krekBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1698d3" />
            <stop offset="100%" stopColor="#1489c3" />
          </linearGradient>
        </defs>

        <path
          d="M28 10h154v216c-24 10-51 16-77 22-26-6-53-12-77-22V10Z"
          fill="#fff"
          stroke="#1e2d40"
          strokeWidth="2"
        />
        <rect x="34" y="88" width="142" height="128" fill="url(#krekBlue)" />

        <path
          d="M58 210c16 5 34 5 50 0 16-5 34-5 50 0"
          stroke="#1a3f9f"
          strokeWidth="8"
          fill="none"
        />
        <path
          d="M58 198c16 5 34 5 50 0 16-5 34-5 50 0"
          stroke="#2f5bb8"
          strokeWidth="8"
          fill="none"
        />
        <path
          d="M58 186c16 5 34 5 50 0 16-5 34-5 50 0"
          stroke="#3f73d6"
          strokeWidth="8"
          fill="none"
        />

        <path d="M95 98 96 194 66 204c19-27 21-69 29-106Z" fill="#f6f7fb" />
        <path d="M116 88 154 194 118 204c4-27-1-70-2-116Z" fill="#f6f7fb" />

        <text
          x="105"
          y="38"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="13"
          letterSpacing="0.08em"
          fill="#2b3748"
        >
          KREKELBERG
        </text>
        <text
          x="105"
          y="64"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="20"
          letterSpacing="0.06em"
          fill="#182536"
        >
          NAUTIC
        </text>
      </svg>

      {withWordmark ? (
        <div className={cn('mt-5 text-center', labelClassName)}>
          <h1 className="heading-display text-5xl text-navy-900 sm:text-7xl">
            Krekelberg Nautic
          </h1>
        </div>
      ) : null}
    </div>
  );
}
