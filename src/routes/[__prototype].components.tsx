import { useCallback, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ClipboardList, Map, MessageCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CopyButton } from "@/components/shared/CopyButton";
import { Toast } from "@/components/shared/Toast";
import { SessionExpired } from "@/components/shared/SessionExpired";
import { SlowNetworkNote } from "@/components/shared/SlowNetworkNote";
import { AITrustNote } from "@/components/shared/AITrustNote";
import { LoopStepper } from "@/components/shared/LoopStepper";
import { BottomTabBar, type TabItem } from "@/components/shared/BottomTabBar";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { TabletPanel } from "@/components/shared/TabletPanel";
import { classAttempts, type Attempt } from "@/data/attempts";
import { personById } from "@/data/people";
import { quizTitle } from "@/data/quiz";
import { institute } from "@/data/institute";
import { coachExchanges } from "@/data/coach";
import { draftQuestions } from "@/data/aiDrafts";
import { formatIST } from "@/lib/time";

// PROTOTYPE ONLY review page. `?frame=1` renders just the device sample for the size frames.
export const Route = createFileRoute("/__prototype/components")({
  validateSearch: (s: Record<string, unknown>) => ({ frame: s["frame"] === 1 || s["frame"] === "1" ? 1 : undefined }),
  head: () => ({
    meta: [
      { title: t("pages.protoComponents") + t("app.titleSuffix") },
      { name: "description", content: t("PX-components.intro") },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: t("pages.protoComponents") + t("app.titleSuffix") },
      { property: "og:description", content: t("PX-components.intro") },
    ],
  }),
  component: Gallery,
});

const [coachA, coachB] = coachExchanges as [typeof coachExchanges[0], typeof coachExchanges[0]];
const draftQ = draftQuestions.questions[0]!;

const g = (k: string, v?: Record<string, string | number>) => t(`PX-components.${k}`, v);

const columns: Column<Attempt>[] = [
  { key: "learner", header: g("colLearner"), cell: (r) => personById(r.personId)?.name },
  { key: "quiz", header: g("colQuiz"), cell: (r) => quizTitle(r.quizId) },
  { key: "type", header: g("colType"), cell: (r) => (r.kind === "graded" ? g("typeGraded") : g("typePractice")) },
  { key: "score", header: g("colScore"), cell: (r) => g("scoreOf", { n: r.score }) },
  { key: "moodle", header: g("colMoodle"), cell: (r) => g(`moodle.${r.moodleStatus}`) },
  { key: "at", header: g("colSubmitted"), cell: (r) => formatIST(r.submittedAt) },
];

const tabs: TabItem[] = [
  { to: "/lessons", label: g("tabLessons"), icon: BookOpen },
  { to: "/active-quizzes", label: g("tabQuizzes"), icon: ClipboardList },
  { to: "/learn/gap", label: g("tabPlan"), icon: Map },
  { to: "/learn/coach", label: g("tabCoach"), icon: MessageCircle },
];

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`sec-${id}`} className="border-t border-border pt-6">
      <h2 id={`sec-${id}`} className="font-heading text-[22px] text-ink">{g(id)}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
const Sub = ({ children }: { children: React.ReactNode }) => <h3 className="font-semibold text-ink-muted">{children}</h3>;

/** Sample screen shown inside each device-size frame. */
function DeviceSample() {
  const [sheet, setSheet] = useState(false);
  return (
    <div className="min-h-screen bg-page-bg pb-20 tablet:pb-4">
      <main className="mx-auto max-w-content space-y-4 p-4">
        <p className="font-semibold text-accent tablet:hidden">{g("layoutMobile")}</p>
        <p className="hidden font-semibold text-accent tablet:block desktop:hidden">{g("layoutTablet")}</p>
        <p className="hidden font-semibold text-accent desktop:block">{g("layoutDesktop")}</p>
        <TabletPanel main={<div className="space-y-4">
          <button type="button" className="btn-secondary" onClick={() => setSheet(true)}>{g("sheetOpen")}</button>
          <DataTable caption={g("tableCaption")} columns={columns} rows={classAttempts.slice(0, 3)} rowKey={(r) => r.id} />
        </div>}>
          <p className="text-ink">{g("panelBody")}</p>
        </TabletPanel>
      </main>
      <BottomSheet open={sheet} title={g("sheetTitle")} onClose={() => setSheet(false)}>
        <p className="text-ink">{g("sheetBody")}</p>
        <button type="button" className="btn-primary mt-4 w-full" onClick={() => setSheet(false)}>{g("sheetMark")}</button>
      </BottomSheet>
      <BottomTabBar items={tabs} />
    </div>
  );
}

const SIZES = [375, 768, 1024, 1280];

function Gallery() {
  const { frame } = Route.useSearch();
  if (frame) return <DeviceSample />;
  return <GalleryPage />;
}

function GalleryPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmResult, setConfirmResult] = useState("");
  const [toast, setToast] = useState(false);
  const [slow, setSlow] = useState<"idle" | "pending" | "done">("idle");
  const [sheet, setSheet] = useState(false);
  const dismissToast = useCallback(() => setToast(false), []);

  const runSlow = () => { setSlow("pending"); setTimeout(() => setSlow("done"), 5000); };

  return (
    <div className="min-h-screen bg-page-bg">
      <a href="#main" className="skip-link">{t("app.skip")}</a>
      <p className="bg-warning px-4 py-2 text-center font-semibold text-accent-ink">{g("prototypeOnly")}</p>
      <main id="main" className="mx-auto max-w-content space-y-8 px-4 py-8 pb-24">
        <div>
          <PageHeading titleKey="pages.protoComponents" />
          <p className="mt-2 max-w-reading text-ink-muted">{g("intro")}</p>
        </div>

        <section aria-labelledby="sec-devices" className="border-t border-border pt-6">
          <h2 id="sec-devices" className="font-heading text-[22px] text-ink">{g("devices")}</h2>
          <p className="mt-1 text-ink-muted">{g("devicesHelp")}</p>
          <div className="mt-4 space-y-6">
            {SIZES.map((w) => {
              const scale = Math.min(1, 920 / w);
              return (
                <figure key={w}>
                  <figcaption className="mb-2 font-semibold text-ink">{g("frameTitle", { w })}</figcaption>
                  <div className="overflow-x-auto">
                    <div style={{ width: w * scale, height: 640 * scale }} className="rounded-surface border border-border-control">
                      <iframe title={g("frameTitle", { w })} src="/__prototype/components?frame=1" width={w} height={640}
                        style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }} className="block bg-page-bg" />
                    </div>
                  </div>
                </figure>
              );
            })}
          </div>
        </section>

        <Section id="statusBanner">
          <StatusBanner variant="info">{g("bannerInfo")}</StatusBanner>
          <StatusBanner variant="success">{g("bannerSuccess")}</StatusBanner>
          <StatusBanner variant="warning">{g("bannerWarning")}</StatusBanner>
          <StatusBanner variant="error">{g("bannerError")}</StatusBanner>
        </Section>

        <Section id="emptyState">
          <EmptyState headingLevel={3} title={g("emptyTitle")} help={g("emptyHelp")} action={<Link to="/lessons" className="btn-primary">{g("emptyAction")}</Link>} />
          <Sub>{g("emptyNoAction")}</Sub>
          <EmptyState headingLevel={3} title={g("emptyTitle")} help={g("emptyHelp")} />
        </Section>

        <Section id="skeleton">
          <Sub>{g("skelText")}</Sub><LoadingSkeleton variant="text" />
          <Sub>{g("skelTable")}</Sub><LoadingSkeleton variant="table" />
        </Section>

        <Section id="errorAlert">
          <ErrorAlert message={g("errorMsg")} onRetry={() => {}} />
          <Sub>{g("errorNoRetry")}</Sub>
          <ErrorAlert message={g("errorMsg")} />
        </Section>

        <Section id="dataTable">
          <DataTable caption={g("tableCaption")} columns={columns} rows={classAttempts} rowKey={(r) => r.id} />
          <DataTable caption={g("tableEmptyCaption")} columns={columns} rows={[]} rowKey={(r) => r.id}
            empty={<EmptyState headingLevel={3} title={g("tableEmptyTitle")} help={g("tableEmptyHelp")} />} />
        </Section>

        <Section id="confirmDialog">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-secondary" onClick={() => setConfirmOpen(true)}>{g("confirmOpen")}</button>
            <p role="status" className="text-ink">{confirmResult}</p>
          </div>
          <ConfirmDialog open={confirmOpen} title={g("confirmTitle")} body={g("confirmBody")} confirmLabel={g("confirmYes")} cancelLabel={g("confirmNo")}
            onConfirm={() => { setConfirmOpen(false); setConfirmResult(g("confirmDone")); }}
            onCancel={() => { setConfirmOpen(false); setConfirmResult(g("confirmCancelled")); }} />
        </Section>

        <Section id="copyButton">
          <p className="text-ink"><span className="font-semibold">{g("copyLabel")}:</span> {institute.moodleSite}</p>
          <CopyButton text={institute.moodleSite} label={g("copyLabel")} />
        </Section>

        <Section id="toast">
          <button type="button" className="btn-secondary" onClick={() => setToast(true)}>{g("toastShow")}</button>
          {toast && <Toast message={g("toastMsg")} onDismiss={dismissToast} />}
        </Section>

        <Section id="sessionExpired">
          <p className="text-ink-muted">{g("sessionNote")}</p>
          <div className="rounded-surface border border-border-control"><SessionExpired embedded /></div>
        </Section>

        <Section id="slowNote">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={slow === "pending"} onClick={runSlow}>
              {slow === "pending" ? g("slowSaving") : g("slowRun")}
            </button>
            {slow === "done" && <p role="status" className="text-success">{g("slowDone")}</p>}
          </div>
          <SlowNetworkNote pending={slow === "pending"} />
        </Section>

        <Section id="aiTrust">
          <Sub>{g("aiLearner")}</Sub>
          <div className="rounded-surface bg-surface p-4">
            <p className="text-ink">{coachA.answer}</p>
            <AITrustNote audience="learner" sources={coachA.sources} />
          </div>
          <Sub>{g("aiLearnerNone")}</Sub>
          <div className="rounded-surface bg-surface p-4">
            <p className="text-ink">{coachB.answer}</p>
            <AITrustNote audience="learner" />
          </div>
          <Sub>{g("aiInstructor")}</Sub>
          <div className="rounded-surface bg-surface p-4">
            <p className="text-ink">{draftQ.text}</p>
            <AITrustNote audience="instructor" sources={draftQuestions.sources} />
          </div>
        </Section>

        <Section id="loopStepper">
          {([1, 2, 3] as const).map((n) => (<div key={n}><Sub>{g("loopStep", { n })}</Sub><div className="mt-2"><LoopStepper current={n} /></div></div>))}
        </Section>

        <Section id="bottomTabBar">
          <div className="max-w-sm rounded-surface border border-border-control"><BottomTabBar items={tabs} fixed={false} /></div>
        </Section>

        <Section id="bottomSheet">
          <button type="button" className="btn-secondary" onClick={() => setSheet(true)}>{g("sheetOpen")}</button>
          <BottomSheet open={sheet} title={g("sheetTitle")} onClose={() => setSheet(false)}>
            <p className="text-ink">{g("sheetBody")}</p>
            <button type="button" className="btn-primary mt-4 w-full" onClick={() => setSheet(false)}>{g("sheetMark")}</button>
          </BottomSheet>
        </Section>

        <Section id="tabletPanel">
          <TabletPanel main={<div className="rounded-surface border border-border bg-surface p-4 text-ink">{g("mainArea")}</div>}>
            <p className="text-ink">{g("panelBody")}</p>
          </TabletPanel>
        </Section>
      </main>
    </div>
  );
}
