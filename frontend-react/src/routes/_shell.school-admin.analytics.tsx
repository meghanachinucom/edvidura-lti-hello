import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  BarChart3,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { t } from "@/i18n";
import { downloadBlob } from "@/lib/download";
import { PageHeading } from "@/components/shared/PageHeading";
import { CountUp } from "@/components/shared/CountUp";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/school-admin/analytics")({
  head: () => ({
    meta: [
      { title: "Institutional Analytics Dashboard" + t("app.titleSuffix") },
      {
        name: "description",
        content: "School-wide grade performance, faculty engagement, and learning analytics.",
      },
      { property: "og:title", content: "Institutional Analytics Dashboard" + t("app.titleSuffix") },
      {
        property: "og:description",
        content: "School-wide grade performance, faculty engagement, and learning analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAnalyticsDashboardPage,
});

interface GradeMetric {
  code: string;
  grade: string;
  leadTeacher: string;
  students: number;
  avgScore: number;
  passRate: number;
  status: "Exceeding" | "On Track" | "Needs Attention";
}

interface FacultyMetric {
  id: string;
  name: string;
  grade: string;
  turnaroundHours: string;
  feedbackGiven: number;
  activeRate: string;
}

export function AdminAnalyticsDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("all");

  const gradeMetrics: GradeMetric[] = [
    {
      code: "RHS-C01",
      grade: "Grade 1",
      leadTeacher: "Ananya Roy",
      students: 22,
      avgScore: 92,
      passRate: 95,
      status: "Exceeding",
    },
    {
      code: "RHS-C02",
      grade: "Grade 2",
      leadTeacher: "Vikram Sen",
      students: 22,
      avgScore: 88,
      passRate: 91,
      status: "On Track",
    },
    {
      code: "RHS-C03",
      grade: "Grade 3",
      leadTeacher: "Sunita Rao",
      students: 22,
      avgScore: 89,
      passRate: 93,
      status: "On Track",
    },
    {
      code: "RHS-C04",
      grade: "Grade 4",
      leadTeacher: "Deepak Joshi",
      students: 22,
      avgScore: 84,
      passRate: 88,
      status: "On Track",
    },
    {
      code: "RHS-C05",
      grade: "Grade 5",
      leadTeacher: "Kavita Menon",
      students: 22,
      avgScore: 86,
      passRate: 90,
      status: "On Track",
    },
    {
      code: "RHS-C06",
      grade: "Grade 6",
      leadTeacher: "Manoj Verma",
      students: 22,
      avgScore: 81,
      passRate: 85,
      status: "On Track",
    },
    {
      code: "RHS-C07",
      grade: "Grade 7",
      leadTeacher: "Shreya Nair",
      students: 22,
      avgScore: 83,
      passRate: 87,
      status: "On Track",
    },
    {
      code: "RHS-C08",
      grade: "Grade 8",
      leadTeacher: "Priya Sharma",
      students: 22,
      avgScore: 89,
      passRate: 92,
      status: "Exceeding",
    },
    {
      code: "RHS-C09",
      grade: "Grade 9",
      leadTeacher: "Rajesh Iyer",
      students: 22,
      avgScore: 79,
      passRate: 82,
      status: "Needs Attention",
    },
    {
      code: "RHS-C10",
      grade: "Grade 10",
      leadTeacher: "Meenakshi Das",
      students: 22,
      avgScore: 91,
      passRate: 94,
      status: "Exceeding",
    },
  ];

  const facultyMetrics: FacultyMetric[] = [
    {
      id: "TCH-01",
      name: "Ananya Roy",
      grade: "Grade 1",
      turnaroundHours: "0.8 hrs",
      feedbackGiven: 84,
      activeRate: "99%",
    },
    {
      id: "TCH-02",
      name: "Vikram Sen",
      grade: "Grade 2",
      turnaroundHours: "1.2 hrs",
      feedbackGiven: 76,
      activeRate: "96%",
    },
    {
      id: "TCH-03",
      name: "Sunita Rao",
      grade: "Grade 3",
      turnaroundHours: "1.5 hrs",
      feedbackGiven: 81,
      activeRate: "95%",
    },
    {
      id: "TCH-04",
      name: "Deepak Joshi",
      grade: "Grade 4",
      turnaroundHours: "2.1 hrs",
      feedbackGiven: 69,
      activeRate: "93%",
    },
    {
      id: "TCH-05",
      name: "Kavita Menon",
      grade: "Grade 5",
      turnaroundHours: "1.4 hrs",
      feedbackGiven: 78,
      activeRate: "97%",
    },
    {
      id: "TCH-06",
      name: "Manoj Verma",
      grade: "Grade 6",
      turnaroundHours: "1.9 hrs",
      feedbackGiven: 72,
      activeRate: "92%",
    },
    {
      id: "TCH-07",
      name: "Shreya Nair",
      grade: "Grade 7",
      turnaroundHours: "1.6 hrs",
      feedbackGiven: 75,
      activeRate: "94%",
    },
    {
      id: "TCH-08",
      name: "Priya Sharma",
      grade: "Grade 8",
      turnaroundHours: "0.9 hrs",
      feedbackGiven: 94,
      activeRate: "100%",
    },
    {
      id: "TCH-09",
      name: "Rajesh Iyer",
      grade: "Grade 9",
      turnaroundHours: "2.4 hrs",
      feedbackGiven: 65,
      activeRate: "90%",
    },
    {
      id: "TCH-10",
      name: "Meenakshi Das",
      grade: "Grade 10",
      turnaroundHours: "1.1 hrs",
      feedbackGiven: 91,
      activeRate: "98%",
    },
  ];

  const filteredGrades =
    selectedGrade === "all" ? gradeMetrics : gradeMetrics.filter((g) => g.code === selectedGrade);

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
    const headers = [
      "Class Code",
      "Grade",
      "Lead Teacher",
      "Students",
      "Average Score %",
      "Pass Rate %",
      "Status",
    ];
    const rows = gradeMetrics.map((g) => [
      esc(g.code),
      esc(g.grade),
      esc(g.leadTeacher),
      esc(g.students),
      esc(`${g.avgScore}%`),
      esc(`${g.passRate}%`),
      esc(g.status),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadBlob(
      new Blob([csvContent], { type: "text/csv;charset=utf-8" }),
      "riverside-grade-analytics.csv",
    );
  };

  const exportJson = () => {
    const payload = {
      institution: "Riverside High School",
      academicYear: "2026–27",
      exportedAt: new Date().toISOString(),
      schoolAvgMastery: "86%",
      activeLearners: 220,
      gradeMetrics,
      facultyMetrics,
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }),
      "riverside-executive-summary.json",
    );
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-7 px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeading
          text="Institutional Analytics Dashboard"
          context="School-wide academic trends across Grades 1–10, syllabus adoption, and faculty turnaround benchmarks."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Download size={14} />
            <span>Export Executive Summary (CSV)</span>
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              School Avg Mastery
            </span>
            <TrendingUp size={18} className="text-secondary" />
          </div>
          <p className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold text-ink">86%</p>
          <span className="text-xs text-ink-muted font-medium">+4.2% Year-Over-Year Growth</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Active Weekly Learners
            </span>
            <Users size={18} className="text-teal-700" />
          </div>
          <p className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold text-teal-800">
            220 / 220
          </p>
          <span className="text-xs text-ink-muted font-medium">
            100% Active in LTI 1.3 Coursework
          </span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              eBook & Lab Adoption
            </span>
            <BookOpen size={18} className="text-emerald-700" />
          </div>
          <p className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold text-emerald-800">
            94%
          </p>
          <span className="text-xs text-ink-muted font-medium">Interactive Readers & 3D Labs</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Statutory Compliance
            </span>
            <Award size={18} className="text-amber-600" />
          </div>
          <p className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold text-ink">98%</p>
          <span className="text-xs text-ink-muted font-medium">
            Safety Credentials & Filings Current
          </span>
        </div>
      </div>

      {/* Grade-by-Grade Performance Table (Grades 1–10) */}
      <div className="rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="font-heading font-bold text-base text-ink">
              Grade-by-Grade Academic Performance (Grades 1–10)
            </h2>
            <p className="text-xs text-ink-muted">
              Live metrics across all 10 Riverside High School grade cohorts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-ink-muted">Filter Grade:</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="rounded-control border border-border bg-page-bg px-2.5 py-1 text-xs font-bold text-ink outline-none"
            >
              <option value="all">All Grades (1–10)</option>
              {gradeMetrics.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.grade} ({g.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border bg-page-bg/60 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <th className="py-2.5 px-3">Section Code</th>
                <th className="py-2.5 px-3">Grade Level</th>
                <th className="py-2.5 px-3">Lead Teacher</th>
                <th className="py-2.5 px-3">Students</th>
                <th className="py-2.5 px-3">Average Score</th>
                <th className="py-2.5 px-3">Quiz Pass Rate</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredGrades.map((g) => (
                <tr key={g.code} className="hover:bg-page-bg/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-secondary text-xs">{g.code}</td>
                  <td className="py-3 px-3 font-bold text-ink">{g.grade}</td>
                  <td className="py-3 px-3 text-ink-muted font-medium">{g.leadTeacher}</td>
                  <td className="py-3 px-3 text-ink font-semibold">{g.students}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-secondary h-full rounded-full"
                          style={{ width: `${g.avgScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-xs">{g.avgScore}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-700">{g.passRate}%</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                        g.status === "Exceeding"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : g.status === "On Track"
                            ? "bg-teal-50 text-teal-800 border-teal-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Faculty Engagement & Grading Turnaround Summary */}
      <div className="rounded-surface border border-border bg-surface p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <GraduationCap size={18} />
            </span>
            <div>
              <h2 className="font-heading font-bold text-base text-ink">
                Faculty Engagement & Grading Turnaround
              </h2>
              <p className="text-xs text-ink-muted">
                10 certified faculty members across Grades 1–10.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Average Turnaround: 1.4 Hours
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {facultyMetrics.map((f) => (
            <div
              key={f.id}
              className="rounded-control border border-border bg-page-bg p-3.5 space-y-1.5 hover:border-secondary/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-ink-muted">{f.id}</span>
                <span className="text-xs font-bold text-emerald-700">{f.activeRate} Active</span>
              </div>
              <h4 className="font-heading font-bold text-xs sm:text-sm text-ink truncate">
                {f.name}
              </h4>
              <p className="text-xs text-secondary font-medium">{f.grade}</p>
              <div className="pt-1.5 border-t border-border flex items-center justify-between text-xs text-ink-muted">
                <span>Avg Turnaround:</span>
                <span className="font-bold text-ink">{f.turnaroundHours}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
