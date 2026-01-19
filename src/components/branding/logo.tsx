import Link from "next/link";

type LogoProps = {
  className?: string;
  href?: string;
};

export function Logo({ className, href = "/" }: LogoProps) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-primary-foreground shadow-[0_0_18px_rgba(255,140,0,0.35)]">
        SM
      </span>
      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        SM-AI
      </span>
    </Link>
  );
}
