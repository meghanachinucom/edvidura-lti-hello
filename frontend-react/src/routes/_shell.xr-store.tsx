import { useState, useId } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Box,
  Compass,
  CheckCircle2,
  ChevronRight,
  Eye,
  Glasses,
  Maximize2,
  Play,
  Rotate3d,
  Sliders,
  Sparkles,
  Layers,
  Wrench,
  X,
  Users,
  Award,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { VirtualTransferReadiness } from "@/components/enterprise/VirtualTransferReadiness";
import { useRole } from "@/components/shell/RoleContext";

export const Route = createFileRoute("/_shell/xr-store")({
  head: () => ({
    meta: [
      { title: "XR Store & 3D Spatial Labs" + t("app.titleSuffix") },
      {
        name: "description",
        content: "Interactive WebXR 3D Spatial Labs and Cartesian coordinate simulators",
      },
    ],
  }),
  component: XrStorePage,
});

interface XrLabItem {
  id: string;
  name: string;
  category: "spatial-math" | "physics-lab" | "geometry-ar" | "simulations";
  tagline: string;
  heroImage: string;
  description: string;
  headsetReady: boolean;
  interactiveLabType?: "cartesian" | "circuit" | "ar-checklist";
}

const XR_LABS: XrLabItem[] = [
  {
    id: "cartesian-3d",
    name: "Walk the Graph in 3D: Cartesian Coordinate Lab",
    category: "spatial-math",
    tagline:
      "Manipulate slope (m) and intercept (b) in real-time with dynamic delta-triangle geometry.",
    heroImage: "/images/xr/cartesian-3d.svg",
    description:
      "Interactive visual laboratory for exploring linear equations y = mx + b on a Cartesian coordinate plane with responsive slope adjustments and point calculations.",
    headsetReady: true,
    interactiveLabType: "cartesian",
  },
  {
    id: "substation-ar",
    name: "Substation Switchgear AR Inspection Checklist",
    category: "geometry-ar",
    tagline: "Step-by-step augmented reality safety inspection for 33kV isolators and busbars.",
    heroImage: "/images/xr/substation-ar.svg",
    description:
      "Industrial Lockout-Tagout (LOTO) protocol training with virtual step validation and hazardous voltage simulation.",
    headsetReady: true,
    interactiveLabType: "ar-checklist",
  },
  {
    id: "circuit-vr",
    name: "Domestic Circuit & Ohm's Law VR Workbench",
    category: "physics-lab",
    tagline: "Live voltage, current, and resistance parametric circuit simulator.",
    heroImage: "/images/xr/circuit-vr.svg",
    description:
      "Build virtual parallel and series circuits with live multimeter readings, breaker trip thresholds, and ground fault safety checks.",
    headsetReady: false,
    interactiveLabType: "circuit",
  },
  {
    id: "cnc-toolpath",
    name: "CNC 3-Axis Toolpath G-Code Spatial Simulator",
    category: "simulations",
    tagline: "Simulate linear and circular interpolation G01/G02 cutter moves in 3D space.",
    heroImage: "/images/xr/cnc-toolpath.svg",
    description:
      "Visualize coordinate translation and spindle paths on precision machining stock before physical shop-floor fabrication.",
    headsetReady: true,
  },
];

export function XrStorePage() {
  const { session } = useRole();
  const isInstructor = Boolean(session?.isInstructor || session?.role === "instructor");

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedLab, setSelectedLab] = useState<XrLabItem | null>(null);

  // Instructor Lab Assignment State
  const [assignedLabs, setAssignedLabs] = useState<Record<string, boolean>>({
    "cartesian-3d": true,
    "substation-ar": true,
    "circuit-vr": true,
    "cnc-toolpath": false,
  });
  const [passThreshold, setPassThreshold] = useState<number>(75);

  // Cartesian lab interactive state
  const [slope, setSlope] = useState<number>(1.5);
  const [intercept, setIntercept] = useState<number>(2.0);
  const [evalX, setEvalX] = useState<number>(3.0);

  // AR Checklist state
  const [arSteps, setArSteps] = useState([
    { id: 1, label: "Confirm high-voltage breaker is tripped and locked", done: true },
    { id: 2, label: "Attach warning tag with technician name and timestamp", done: true },
    { id: 3, label: "Verify zero voltage using calibrated contactless probe", done: false },
    { id: 4, label: "Install protective earthing ground clamps on busbar", done: false },
  ]);

  const evalY = Number((slope * evalX + intercept).toFixed(2));
  const angleDeg = Number(((Math.atan(slope) * 180) / Math.PI).toFixed(1));

  const filteredLabs = XR_LABS.filter((lab) => {
    if (activeCategory === "all") return true;
    return lab.category === activeCategory;
  });

  // Dedicated Instructor Lab Management & Telemetry View
  if (isInstructor) {
    return (
      <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeading
            text="3D Spatial Labs Management & Class Telemetry"
            context="Class-wide 3D simulation telemetry, virtual-to-practical workshop transfer, and curriculum assignment."
          />
          <div className="flex items-center gap-2 rounded-2xl bg-teal-50 border border-teal-200 px-4 py-2 text-xs font-semibold text-teal-800 shadow-xs">
            <Users size={16} className="text-teal-700" />
            <span>Class 8 Algebra I · 24 Active Students</span>
          </div>
        </div>

        {/* Instructor KPI Summary Strip */}
        <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">
              Assigned 3D Labs
            </span>
            <p className="mt-1 font-heading text-2xl font-extrabold text-ink">
              {Object.values(assignedLabs).filter(Boolean).length} / {XR_LABS.length}
            </p>
            <p className="text-xs text-secondary mt-1 font-medium">Class 8 active curriculum</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">
              Class Completion Rate
            </span>
            <p className="mt-1 font-heading text-2xl font-extrabold text-emerald-700">84%</p>
            <p className="text-xs text-ink-muted mt-1 font-medium">20 of 24 students passed</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">
              Avg Simulation Score
            </span>
            <p className="mt-1 font-heading text-2xl font-extrabold text-ink">88.5%</p>
            <p className="text-xs text-emerald-600 mt-1 font-medium">+6.2% above baseline</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block">
              Pass Threshold
            </span>
            <p className="mt-1 font-heading text-2xl font-extrabold text-amber-600">
              {passThreshold}%
            </p>
            <p className="text-xs text-ink-muted mt-1 font-medium">Configurable passing bar</p>
          </div>
        </div>

        {/* Configure Pass Threshold & Assignment Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-heading text-base font-bold text-ink flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-secondary" />
                <span>Curriculum Lab Assignment & Certification Threshold</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Enable 3D Spatial Labs for Class 8 and adjust the certified workshop readiness
                threshold.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-ink">Pass Bar: {passThreshold}%</span>
              <input
                type="range"
                min={60}
                max={90}
                step={5}
                value={passThreshold}
                onChange={(e) => setPassThreshold(Number(e.target.value))}
                className="w-32 accent-secondary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {XR_LABS.map((lab) => {
              const isAssigned = Boolean(assignedLabs[lab.id]);
              return (
                <div
                  key={lab.id}
                  className="rounded-xl border border-border bg-page-bg p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold uppercase text-secondary">
                        {lab.category}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAssignedLabs((prev) => ({ ...prev, [lab.id]: !prev[lab.id] }))
                        }
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition ${
                          isAssigned
                            ? "bg-emerald-500/15 text-emerald-700 border border-emerald-300"
                            : "bg-slate-200 text-slate-600 border border-slate-300"
                        }`}
                      >
                        {isAssigned ? "Assigned" : "Unassigned"}
                      </button>
                    </div>
                    <h4 className="font-heading text-sm font-bold text-ink mt-2 line-clamp-1">
                      {lab.name}
                    </h4>
                    <p className="text-xs text-ink-muted mt-1 line-clamp-2">{lab.tagline}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLab(lab)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface py-1.5 text-xs font-bold text-ink hover:bg-slate-50 transition"
                  >
                    <Play size={12} fill="currentColor" /> Preview 3D Lab
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Student-by-Student Virtual vs. Practical Workshop Score Table */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-heading text-base font-bold text-ink flex items-center gap-2">
                <Award size={18} className="text-emerald-600" />
                <span>Student Virtual Simulation vs. Practical Workshop Telemetry</span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Validated sim-to-real transfer telemetry backed by Class 8 physical and virtual
                exercises.
              </p>
            </div>
            <span className="text-xs font-bold text-secondary bg-secondary/10 px-3 py-1 rounded-full">
              Workforce Transfer Engine Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-page-bg text-ink-muted">
                <tr>
                  <th className="p-3 font-semibold">Student Name</th>
                  <th className="p-3 font-semibold">3D Simulation Score</th>
                  <th className="p-3 font-semibold">Practical Workshop Score</th>
                  <th className="p-3 font-semibold">Sim-to-Real Transfer</th>
                  <th className="p-3 font-semibold">Readiness Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  {
                    name: "Alice Nguyen",
                    id: "6",
                    sim: 95,
                    practical: 90,
                    transfer: 92.5,
                    ready: true,
                  },
                  {
                    name: "Arjun Das",
                    id: "p-arjun",
                    sim: 88,
                    practical: 82,
                    transfer: 85.0,
                    ready: true,
                  },
                  {
                    name: "Lakshmi Reddy",
                    id: "p-lakshmi",
                    sim: 92,
                    practical: 85,
                    transfer: 88.5,
                    ready: true,
                  },
                  {
                    name: "Pooja Yadav",
                    id: "p-pooja",
                    sim: 85,
                    practical: 80,
                    transfer: 82.5,
                    ready: true,
                  },
                  {
                    name: "Joseph Mathew",
                    id: "p-joseph",
                    sim: 78,
                    practical: 74,
                    transfer: 76.0,
                    ready: true,
                  },
                  {
                    name: "Sneha Patil",
                    id: "p-sneha",
                    sim: 96,
                    practical: 94,
                    transfer: 95.0,
                    ready: true,
                  },
                  {
                    name: "Imran Shaikh",
                    id: "p-imran",
                    sim: 72,
                    practical: 66,
                    transfer: 69.0,
                    ready: false,
                  },
                  {
                    name: "Bikash Gogoi",
                    id: "p-bikash",
                    sim: 64,
                    practical: 60,
                    transfer: 62.0,
                    ready: false,
                  },
                ].map((st) => (
                  <tr key={st.id} className="hover:bg-page-bg/50 transition">
                    <td className="p-3 font-bold text-ink">{st.name}</td>
                    <td className="p-3 font-mono text-ink font-semibold">{st.sim}%</td>
                    <td className="p-3 font-mono text-ink font-semibold">{st.practical}%</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-border/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              st.transfer >= passThreshold ? "bg-emerald-600" : "bg-amber-500"
                            }`}
                            style={{ width: `${st.transfer}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-ink">{st.transfer}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {st.transfer >= passThreshold ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold">
                          <Check size={12} /> Certified Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-bold">
                          Needs Practice
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal preview when teacher clicks preview */}
        {selectedLab && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
            <div className="flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl bg-surface border border-border shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-border bg-page-bg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Rotate3d size={22} />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-ink">{selectedLab.name}</h3>
                    <p className="text-xs text-ink-muted">{selectedLab.tagline}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLab(null)}
                  className="p-1.5 rounded-xl text-ink-muted hover:bg-surface transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                <p className="text-sm text-ink leading-relaxed">{selectedLab.description}</p>
                <div className="rounded-2xl bg-slate-950 p-8 text-center text-white space-y-3">
                  <Rotate3d size={40} className="mx-auto text-amber-400 animate-spin" />
                  <p className="text-sm font-bold">Interactive 3D Simulation Session Active</p>
                  <p className="text-xs text-slate-400">
                    Headset & Touchscreen WebXR runtime initialized.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Learner View (Alice Nguyen)
  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
      {/* Unified Standard Page Heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading
          text="3D Spatial Labs & XR Store"
          context="Hands-on WebGL and WebXR simulations designed for Chrome, Meta Quest, and spatial touchscreens."
        />
        <div className="flex items-center gap-2 rounded-2xl bg-surface border border-border px-4 py-2 text-xs font-semibold text-ink shadow-xs">
          <Glasses size={18} className="text-amber-600" />
          <span>Meta Quest & WebXR Ready</span>
        </div>
      </div>

      {/* Hero Experience Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
        <div className="absolute inset-0">
          <img
            src={XR_LABS[0]!.heroImage}
            alt="Hero Lab"
            className="w-full h-full object-cover opacity-35 filter blur-xs"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>
        <div className="relative z-10 p-6 tablet:p-10 max-w-xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
            Featured Interactive Lab
          </span>
          <h2 className="font-heading text-2xl tablet:text-3xl font-bold text-white">
            {XR_LABS[0]!.name}
          </h2>
          <p className="text-xs tablet:text-sm text-slate-300">{XR_LABS[0]!.tagline}</p>
          <div className="flex items-center gap-3 pt-2">
            <button
              id="launch-3d-lab-btn"
              type="button"
              onClick={() => setSelectedLab(XR_LABS[0]!)}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 transition shadow-lg"
            >
              <Rotate3d size={18} /> Launch 3D Lab Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Live Interactive Cartesian Coordinate Lab Workbench */}
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600">
              <Sparkles size={14} /> Interactive Spatial Workbench · Real-Time Simulation
            </div>
            <h3 className="font-heading text-xl font-bold text-ink mt-0.5">
              Live Cartesian Coordinate Plane: y = mx + b
            </h3>
            <p className="text-xs text-ink-muted">
              Drag the sliders below to see how varying slope and intercept shifts the coordinate
              vector in real time.
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
            Interactive Simulation Active
          </span>
        </div>

        <div className="grid gap-6 tablet:grid-cols-2">
          {/* SVG Cartesian Coordinate Canvas */}
          <div className="relative aspect-square w-full rounded-2xl bg-slate-950 p-4 flex flex-col items-center justify-center border border-slate-800 shadow-inner overflow-hidden">
            <svg viewBox="-100 -100 200 200" className="w-full h-full">
              {/* Grid lines */}
              {[-80, -60, -40, -20, 20, 40, 60, 80].map((v) => (
                <g key={v} opacity={0.15}>
                  <line x1={v} y1="-100" x2={v} y2="100" stroke="#94a3b8" strokeWidth="0.5" />
                  <line x1="-100" y1={v} x2="100" y2={v} stroke="#94a3b8" strokeWidth="0.5" />
                </g>
              ))}
              {/* Axes */}
              <line x1="-100" y1="0" x2="100" y2="0" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="0" y1="-100" x2="0" y2="100" stroke="#94a3b8" strokeWidth="1.5" />

              {/* Equation Line y = mx + b (scaled: 1 unit = 8 px) */}
              {(() => {
                const scale = 8;
                const x1 = -12;
                const y1 = slope * x1 + intercept;
                const x2 = 12;
                const y2 = slope * x2 + intercept;
                return (
                  <line
                    x1={x1 * scale}
                    y1={-y1 * scale}
                    x2={x2 * scale}
                    y2={-y2 * scale}
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                );
              })()}

              {/* Intercept Point (0, b) */}
              <circle cx={0} cy={-intercept * 8} r="5" fill="#38bdf8" />
              {/* Evaluated Point (evalX, evalY) */}
              <circle cx={evalX * 8} cy={-evalY * 8} r="5" fill="#10b981" />
            </svg>

            {/* Legend overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur-xs">
              <span className="text-amber-400 font-bold">
                Line: y = {slope}x {intercept >= 0 ? `+ ${intercept}` : `- ${Math.abs(intercept)}`}
              </span>
              <span className="text-emerald-400 font-bold">
                Point: ({evalX}, {evalY})
              </span>
            </div>
          </div>

          {/* Controls & Math Analysis */}
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-page-bg border border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Slope (m): <span className="text-amber-600 font-mono text-sm">{slope}</span>
                </span>
                <span className="text-xs font-mono text-ink-muted">θ = {angleDeg}°</span>
              </div>
              <input
                type="range"
                min="-4"
                max="4"
                step="0.25"
                value={slope}
                onChange={(e) => setSlope(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-ink-muted font-mono">
                <span>-4.0 (steep neg)</span>
                <span>0.0 (horizontal)</span>
                <span>+4.0 (steep pos)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-page-bg border border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Y-Intercept (b):{" "}
                  <span className="text-sky-600 font-mono text-sm">{intercept}</span>
                </span>
                <span className="text-xs font-mono text-ink-muted">(0, {intercept})</span>
              </div>
              <input
                type="range"
                min="-8"
                max="8"
                step="0.5"
                value={intercept}
                onChange={(e) => setIntercept(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-ink-muted font-mono">
                <span>-8.0</span>
                <span>0.0</span>
                <span>+8.0</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-page-bg border border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Evaluate at X ={" "}
                  <span className="text-emerald-600 font-mono text-sm">{evalX}</span>
                </span>
                <span className="text-xs font-mono text-emerald-600 font-bold">Y = {evalY}</span>
              </div>
              <input
                type="range"
                min="-8"
                max="8"
                step="0.5"
                value={evalX}
                onChange={(e) => setEvalX(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Suite: Simulation-to-Real Transfer Readiness */}
      <VirtualTransferReadiness studentId="p-rajesh" />

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: "All Experiences" },
          { id: "spatial-math", label: "Spatial Math" },
          { id: "geometry-ar", label: "Geometry & AR" },
          { id: "physics-lab", label: "Physics Labs" },
          { id: "simulations", label: "Shop-Floor Simulations" },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeCategory === cat.id
                ? "bg-ink text-white shadow-sm"
                : "bg-surface border border-border text-ink-muted hover:border-amber-500/50"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Labs Grid */}
      <div className="grid gap-6 tablet:grid-cols-2">
        {filteredLabs.map((lab) => (
          <div
            key={lab.id}
            className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition hover:shadow-md hover:border-amber-500/40"
          >
            <div className="relative h-52 overflow-hidden bg-slate-900">
              <img
                src={lab.heroImage}
                alt={lab.name}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute top-3 right-3">
                {lab.headsetReady && (
                  <span className="rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-bold text-slate-950 backdrop-blur-xs flex items-center gap-1">
                    <Glasses size={12} /> Headset Ready
                  </span>
                )}
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90">
                <span className="rounded-md bg-black/60 px-2.5 py-0.5 backdrop-blur-xs font-sans capitalize">
                  {lab.category.replace("-", " ")}
                </span>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-ink leading-snug group-hover:text-amber-600 transition">
                  {lab.name}
                </h3>
                <p className="text-xs text-ink-muted mt-2 leading-relaxed">{lab.tagline}</p>
              </div>

              <div className="border-t border-border pt-4 flex items-center justify-between">
                <span className="text-xs font-mono text-ink-muted">Interactive Module</span>
                <button
                  type="button"
                  onClick={() => setSelectedLab(lab)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
                >
                  <Play size={12} fill="currentColor" /> Open Lab
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Personal Virtual-to-Workshop Readiness Bar (Learner View) */}
      <VirtualTransferReadiness />

      {/* Interactive Modal View */}
      {selectedLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl bg-surface border border-border shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-page-bg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Rotate3d size={22} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-ink">{selectedLab.name}</h3>
                  <p className="text-xs text-ink-muted">{selectedLab.tagline}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLab(null)}
                className="p-1.5 rounded-xl text-ink-muted hover:bg-surface transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {selectedLab.interactiveLabType === "cartesian" ? (
                /* Dynamic Cartesian Coordinate Lab Simulator */
                <div className="space-y-6">
                  <div className="grid gap-6 tablet:grid-cols-2">
                    {/* SVG Cartesian Coordinate Canvas */}
                    <div className="relative aspect-square w-full rounded-2xl bg-slate-950 p-4 flex flex-col items-center justify-center border border-slate-800 shadow-inner overflow-hidden">
                      <svg viewBox="-100 -100 200 200" className="w-full h-full">
                        {/* Grid lines */}
                        {[-80, -60, -40, -20, 20, 40, 60, 80].map((v) => (
                          <g key={v} opacity={0.15}>
                            <line
                              x1={v}
                              y1="-100"
                              x2={v}
                              y2="100"
                              stroke="#94a3b8"
                              strokeWidth="0.5"
                            />
                            <line
                              x1="-100"
                              y1={v}
                              x2="100"
                              y2={v}
                              stroke="#94a3b8"
                              strokeWidth="0.5"
                            />
                          </g>
                        ))}
                        {/* Axes */}
                        <line x1="-100" y1="0" x2="100" y2="0" stroke="#94a3b8" strokeWidth="1.5" />
                        <line x1="0" y1="-100" x2="0" y2="100" stroke="#94a3b8" strokeWidth="1.5" />

                        {/* Equation Line y = mx + b (scaled: 1 unit = 8 px) */}
                        {(() => {
                          const scale = 8;
                          const x1 = -12;
                          const y1 = slope * x1 + intercept;
                          const x2 = 12;
                          const y2 = slope * x2 + intercept;
                          return (
                            <line
                              x1={x1 * scale}
                              y1={-y1 * scale}
                              x2={x2 * scale}
                              y2={-y2 * scale}
                              stroke="#f59e0b"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          );
                        })()}

                        {/* Intercept Point (0, b) */}
                        <circle cx={0} cy={-intercept * 8} r="5" fill="#38bdf8" />
                        {/* Evaluated Point (evalX, evalY) */}
                        <circle cx={evalX * 8} cy={-evalY * 8} r="5" fill="#10b981" />
                      </svg>

                      {/* Legend overlay */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur-xs">
                        <span className="text-amber-400 font-bold">
                          Line: y = {slope}x{" "}
                          {intercept >= 0 ? `+ ${intercept}` : `- ${Math.abs(intercept)}`}
                        </span>
                        <span className="text-emerald-400 font-bold">
                          Point: ({evalX}, {evalY})
                        </span>
                      </div>
                    </div>

                    {/* Controls & Math Analysis */}
                    <div className="space-y-5">
                      <div className="p-4 rounded-2xl bg-page-bg border border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                            Slope (m):{" "}
                            <span className="text-amber-600 font-mono text-sm">{slope}</span>
                          </span>
                          <span className="text-xs font-mono text-ink-muted">θ = {angleDeg}°</span>
                        </div>
                        <input
                          type="range"
                          min="-4"
                          max="4"
                          step="0.25"
                          value={slope}
                          onChange={(e) => setSlope(parseFloat(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-ink-muted font-mono">
                          <span>-4.0 (steep neg)</span>
                          <span>0.0 (horizontal)</span>
                          <span>+4.0 (steep pos)</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-page-bg border border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                            Y-Intercept (b):{" "}
                            <span className="text-sky-600 font-mono text-sm">{intercept}</span>
                          </span>
                          <span className="text-xs font-mono text-ink-muted">(0, {intercept})</span>
                        </div>
                        <input
                          type="range"
                          min="-8"
                          max="8"
                          step="0.5"
                          value={intercept}
                          onChange={(e) => setIntercept(parseFloat(e.target.value))}
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-ink-muted font-mono">
                          <span>-8.0</span>
                          <span>0.0</span>
                          <span>+8.0</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-page-bg border border-border space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                            Evaluate at X ={" "}
                            <span className="text-emerald-600 font-mono text-sm">{evalX}</span>
                          </span>
                          <span className="text-xs font-mono text-emerald-600 font-bold">
                            Y = {evalY}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-8"
                          max="8"
                          step="0.5"
                          value={evalX}
                          onChange={(e) => setEvalX(parseFloat(e.target.value))}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedLab.interactiveLabType === "ar-checklist" ? (
                /* AR Substation Inspection Checklist */
                <div className="space-y-4">
                  <p className="text-xs text-ink-muted">
                    Simulate real-time augmented reality visual confirmation for high-voltage
                    industrial equipment.
                  </p>
                  <div className="space-y-3">
                    {arSteps.map((step) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          setArSteps((prev) =>
                            prev.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)),
                          );
                        }}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition ${
                          step.done
                            ? "bg-emerald-500/10 border-emerald-500/30 text-ink"
                            : "bg-page-bg border-border text-ink hover:border-amber-500/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                              step.done
                                ? "bg-emerald-500 text-white"
                                : "border border-border bg-surface"
                            }`}
                          >
                            {step.done && <CheckCircle2 size={16} />}
                          </div>
                          <span className="text-xs font-semibold">{step.label}</span>
                        </div>
                        <span className="text-xs font-mono text-ink-muted">
                          {step.done ? "VERIFIED" : "PENDING"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Fallback preview */
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                    <Sparkles size={32} />
                  </div>
                  <h4 className="font-heading text-lg font-bold text-ink">{selectedLab.name}</h4>
                  <p className="text-xs text-ink-muted max-w-md mx-auto">
                    {selectedLab.description}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-page-bg">
              <span className="text-xs text-ink-muted">WebXR API · Status: Active</span>
              <button
                type="button"
                onClick={() => setSelectedLab(null)}
                className="rounded-xl bg-ink px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
