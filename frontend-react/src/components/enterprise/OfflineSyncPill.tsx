import { useState } from "react";
import { Cloud, CloudCheck, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export function OfflineSyncPill() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<"synced" | "local" | "error">("synced");
  const [lastSync, setLastSync] = useState<string>("Just now");

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      // Push local journaled delta
      await api.post("/api/v1/sync/push", {
        client_id: "client-alice-tab",
        changes: [
          {
            entity_type: "study_progress",
            entity_key: "unit-linear-01",
            client_version: Date.now(),
            payload: { last_lesson: "les-transformer", timestamp: new Date().toISOString() },
          },
        ],
      });

      // Pull updates
      await api.post("/api/v1/sync/pull", {
        client_id: "client-alice-tab",
        since_version: 0,
      });

      setStatus("synced");
      setLastSync(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setStatus("local");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      aria-label="Local-First Offline Sync Indicator"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-semibold shadow-2xs"
    >
      {status === "synced" ? (
        <span className="flex items-center gap-1.5 text-emerald-700">
          <CloudCheck className="size-3.5" />
          <span>Synced · BF-14</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-amber-700">
          <Cloud className="size-3.5" />
          <span>Local Cache (1 pending)</span>
        </span>
      )}
      <span className="text-border">|</span>
      <span className="text-ink-muted text-[11px] hidden sm:inline">{lastSync}</span>
      <button
        type="button"
        disabled={syncing}
        onClick={handleSyncNow}
        title="Synchronize offline lesson notes & progress"
        className="ml-1 text-secondary hover:text-secondary/80 font-bold hover:underline flex items-center gap-1 disabled:opacity-40"
      >
        <RefreshCw className={`size-3 ${syncing ? "animate-spin" : ""}`} />
        <span>{syncing ? "Syncing..." : "Sync Now"}</span>
      </button>
    </div>
  );
}
