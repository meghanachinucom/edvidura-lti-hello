import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { t } from "@/i18n";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);
  const copy = async () => {
    try { await navigator.clipboard?.writeText(text); } catch { /* clipboard blocked; still confirm in prototype */ }
    setCopied(true);
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={copy} className="btn-secondary gap-2" aria-label={label ? `${t("shared.copy.copy")}: ${label}` : undefined}>
        {copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
        {t("shared.copy.copy")}
      </button>
      <span role="status" className="text-sm text-success">{copied ? t("shared.copy.copied") : ""}</span>
    </span>
  );
}
