import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { t } from "@/i18n";

type Variant = "info" | "success" | "warning" | "error";

const styles: Record<Variant, string> = {
  info: "border-focus-ring bg-highlight",
  success: "border-success bg-surface",
  warning: "border-warning bg-surface",
  error: "border-error bg-surface",
};
const iconColor: Record<Variant, string> = { info: "text-ink", success: "text-success", warning: "text-warning", error: "text-error" };
const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle };

/** Never colour alone: always an icon plus words. */
export function StatusBanner({ variant, children }: { variant: Variant; children: ReactNode }) {
  const Icon = icons[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-surface border-l-4 p-3 text-ink ${styles[variant]}`}>
      <Icon aria-hidden size={20} className={`mt-0.5 shrink-0 ${iconColor[variant]}`} />
      <p className="min-w-0"><span className="sr-only">{t(`shared.status.${variant}`)}: </span>{children}</p>
    </div>
  );
}
