import { createFileRoute, Outlet } from "@tanstack/react-router";
import { t } from "@/i18n";

// Operator area: separate minimal layout, no shell, web only (no tab bar).
export const Route = createFileRoute("/ops")({ component: OpsLayout });

function OpsLayout() {
  return (
    <div className="min-h-screen bg-page-bg">
      <a href="#main" className="skip-link">
        {t("app.skip")}
      </a>
      <header className="border-b border-slate-700/80 bg-topbar px-6 py-3 text-white">
        <p className="font-heading text-[16px] font-bold text-white">{t("OP.console")}</p>
      </header>
      <main id="main">
        <Outlet />
      </main>
    </div>
  );
}
