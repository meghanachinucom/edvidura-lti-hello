import type { ReactNode } from "react";

export function HeroBand({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`w-full ${className}`}>{children}</div>;
}
