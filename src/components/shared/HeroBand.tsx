import type { ReactNode } from "react";

export function HeroBand({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`hero-band ${className}`}>{children}</div>;
}
