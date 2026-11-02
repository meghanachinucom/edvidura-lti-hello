import type { Role } from "./people";

export type GroupId = "learn" | "teach" | "institute";
export interface NavItem { to: string; labelKey: string }
export interface NavGroup { id: GroupId; labelKey: string; items: NavItem[] }

export const navGroups: Record<GroupId, NavGroup> = {
  learn: {
    id: "learn",
    labelKey: "nav.learn",
    items: [
      { to: "/lessons", labelKey: "pages.lessons" },
      { to: "/active-quizzes", labelKey: "pages.activeQuizzes" },
      { to: "/learn/gap", labelKey: "pages.gap" },
      { to: "/learn/coach", labelKey: "pages.coach" },
      { to: "/learn/flashcards", labelKey: "pages.flashcards" },
      { to: "/learn/micro", labelKey: "pages.micro" },
      { to: "/manuals", labelKey: "pages.manuals" },
      { to: "/learn/analytics", labelKey: "pages.learnAnalytics" },
      { to: "/learn/activity", labelKey: "pages.learnActivity" },
    ],
  },
  teach: {
    id: "teach",
    labelKey: "nav.teach",
    items: [
      { to: "/teacher/attempts", labelKey: "pages.tAttempts" },
      { to: "/teacher/content", labelKey: "pages.tContent" },
      { to: "/teacher/analytics", labelKey: "pages.tAnalytics" },
      { to: "/teacher/activity", labelKey: "pages.tActivity" },
      { to: "/teacher/manuals", labelKey: "pages.tManuals" },
      { to: "/lti-integration", labelKey: "pages.ltiIntegration" },
      { to: "/teacher/ai", labelKey: "pages.tAi" },
      { to: "/teacher/coach/insights", labelKey: "pages.tCoachInsights" },
      { to: "/teacher/coach/shortcuts", labelKey: "pages.tCoachShortcuts" },
      { to: "/teacher/skills", labelKey: "pages.tSkills" },
      { to: "/teacher/sme", labelKey: "pages.tSme" },
      { to: "/teacher/dct", labelKey: "pages.tDct" },
      { to: "/student-directory", labelKey: "pages.studentDirectory" },
      { to: "/institutions", labelKey: "pages.institutions" },
    ],
  },
  institute: {
    id: "institute",
    labelKey: "nav.institute",
    items: [
      { to: "/school-admin", labelKey: "pages.sa" },
      { to: "/school-admin/teachers", labelKey: "pages.saTeachers" },
      { to: "/school-admin/classes", labelKey: "pages.saClasses" },
      { to: "/school-admin/students", labelKey: "pages.saStudents" },
      { to: "/school-admin/analytics", labelKey: "pages.saAnalytics" },
      { to: "/school-admin/activity", labelKey: "pages.saActivity" },
      { to: "/institution-detail", labelKey: "pages.institutionDetail" },
    ],
  },
};

export const groupsForRole: Record<Role, GroupId[]> = {
  learner: ["learn"],
  instructor: ["teach"],
  trainingOfficer: ["institute"],
};

/** Learner mobile tab bar (labels are i18n keys). */
export const learnerTabs = [
  { to: "/lessons", labelKey: "shared.learnerTabs.lessons", icon: "BookOpen" },
  { to: "/active-quizzes", labelKey: "shared.learnerTabs.quizzes", icon: "ClipboardList" },
  { to: "/learn/gap", labelKey: "shared.learnerTabs.plan", icon: "Map" },
  { to: "/learn/coach", labelKey: "shared.learnerTabs.coach", icon: "MessageCircle" },
] as const;
