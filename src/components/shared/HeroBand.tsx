import type { ReactNode } from "react";

/** Pass B dark hero band with emerald, sky and lime glows. */
export function HeroBand({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`hero-band ${className}`}>{children}</div>;
}
