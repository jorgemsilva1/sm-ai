import Link from "next/link";

type LogoProps = {
  className?: string;
  href?: string;
};

export function Logo({ className, href = "/" }: LogoProps) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 ${className}`}>
      <span className="gradient-brand shadow-glow-brand flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white transition-default">
        SM
      </span>
      <span className="text-gradient-brand text-sm font-bold uppercase tracking-[0.2em]">
        SM-AI
      </span>
    </Link>
  );
}
