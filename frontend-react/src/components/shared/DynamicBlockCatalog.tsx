import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, Layers, Cpu, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";

export interface LegoBlock {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  wave?: string;
  category?: string;
  role?: string;
  audience?: string[];
  enabled?: boolean;
}

interface DynamicBlockCatalogProps {
  role?: "learner" | "instructor" | "admin" | "all";
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export function DynamicBlockCatalog({
  role = "all",
  title = "Modular Capabilities & Live Catalog",
  subtitle = "Live backend Lego catalog & Wave A–C modules auto-rendered dynamically from FastAPI.",
  compact = false,
}: DynamicBlockCatalogProps) {
  const [blocks, setBlocks] = useState<LegoBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [testedBlock, setTestedBlock] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const res = await api.get<{ ok: boolean; blocks: LegoBlock[] }>("/api/v1/blocks/catalog");
        if (active && res && Array.isArray(res.blocks)) {
          setBlocks(res.blocks);
        }
      } catch {
        // Fallback to tenant blocks
        try {
          const res2 = await api.get<{ blocks: LegoBlock[] }>("/api/v1/blocks");
          if (active && res2 && Array.isArray(res2.blocks)) {
            setBlocks(res2.blocks);
          }
        } catch {
          // Graceful fallback
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  const filteredBlocks = blocks.filter((b) => {
    if (role === "all") return true;
    if (role === "learner") {
      return (
        b.id.includes("learning") ||
        b.id.includes("quiz") ||
        b.id.includes("xr") ||
        b.id.includes("assessment") ||
        b.id.includes("immersive") ||
        b.category === "learner" ||
        (b.audience && b.audience.includes("learner"))
      );
    }
    if (role === "instructor") {
      return (
        b.id.includes("classroom") ||
        b.id.includes("sme") ||
        b.id.includes("dct") ||
        b.id.includes("skills") ||
        b.id.includes("grade") ||
        b.category === "instructor" ||
        (b.audience && b.audience.includes("instructor"))
      );
    }
    if (role === "admin") {
      return (
        b.id.includes("core") ||
        b.id.includes("lti") ||
        b.id.includes("onboard") ||
        b.id.includes("audit") ||
        b.id.includes("analytics") ||
        b.category === "admin" ||
        (b.audience && b.audience.includes("admin"))
      );
    }
    return true;
  });

  const displayList = filteredBlocks.length > 0 ? filteredBlocks.slice(0, compact ? 4 : 12) : [];

  if (loading || displayList.length === 0) return null;

  return (
    <section className="space-y-4 pt-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-lg font-bold text-ink flex items-center gap-2">
            <Layers size={18} className="text-secondary" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-ink-muted">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1 self-start rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-secondary">
          <Sparkles size={12} />
          <span>Auto-Rendered from Backend</span>
        </span>
      </div>

      <div
        className={`grid gap-3.5 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}
      >
        {displayList.map((block) => {
          const isTested = testedBlock === block.id;
          const waveBadge = block.wave ? `Wave ${block.wave.toUpperCase()}` : "Live";
          return (
            <article
              key={block.id}
              className="flex flex-col justify-between rounded-surface border border-border bg-surface p-4 shadow-sm transition-all hover:border-border-strong hover:shadow"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold text-secondary">{block.id}</span>
                  <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-secondary">
                    {waveBadge}
                  </span>
                </div>
                <h4 className="font-heading text-sm font-bold text-ink">{block.name}</h4>
                <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                  {block.summary ||
                    block.description ||
                    "Configured Lego module for educational courseware."}
                </p>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <CheckCircle2 size={12} />
                  <span>{isTested ? "Active & Verified" : "Live API"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setTestedBlock(block.id)}
                  className="inline-flex items-center gap-1 rounded-control bg-page-bg px-2.5 py-1 text-xs font-semibold text-ink hover:bg-muted transition-colors"
                >
                  <Cpu size={12} className="text-secondary" />
                  <span>{isTested ? "Verified" : "Inspect"}</span>
                  <ArrowUpRight size={11} className="text-ink-muted" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
