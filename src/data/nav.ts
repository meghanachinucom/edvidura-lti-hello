import type { Role } from "./people";

export type GroupId = "learn" | "teach" | "institute";
export interface NavItem { to: string; labelKey: string }
export interface NavGroup { id: GroupId; labelKey: string; items: NavItem[] }

export const navGroups: Record<GroupId, NavGroup> = {
  learn: { id: "learn", labelKey: "nav.learn", items: [
    { to: "/lessons", labelKey: "pages.lessons" },
    { to: "/active-quizzes", labelKey: "pages.activeQuizzes" },
    { to: "/learn/gap", labelKey: "pages.gap" },
    { to: "/learn/coach", labelKey: "pages.coach" },
    { to: "/learn/flashcards", labelKey: "pages.flashcards" },
    { to: "/learn/micro", labelKey: "pages.micro" },
    { to: "/manuals", labelKey: "pages.manuals" },
    { to: "/learn/analytics", labelKey: "pages.learnAnalytics" },
    { to: "/learn/activity", labelKey: "pages.learnActivity" },
  ] },
  teach: { id: "teach", labelKey: "nav.teach", items: [
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
  ] },
  institute: { id: "institute", labelKey: "nav.institute", items: [
    { to: "/school-admin", labelKey: "pages.sa" },
    { to: "/school-admin/teachers", labelKey: "pages.saTeachers" },
    { to: "/school-admin/classes", labelKey: "pages.saClasses" },
    { to: "/school-admin/students", labelKey: "pages.saStudents" },
    { to: "/school-admin/analytics", labelKey: "pages.saAnalytics" },
    { to: "/school-admin/activity", labelKey: "pages.saActivity" },
    { to: "/institution-detail", labelKey: "pages.institutionDetail" },
  ] },
};

export const groupsForRole: Record<Role, GroupId[]> = {
  learner: ["learn"],
  instructor: ["teach"],
  trainingOfficer: ["institute"],
};

export const learnerTabs = [
  { to: "/lessons", labelKey: "shared.learnerTabs.lessons", icon: "BookOpen" },
  { to: "/active-quizzes", labelKey: "shared.learnerTabs.quizzes", icon: "ClipboardList" },
  { to: "/learn/gap", labelKey: "shared.learnerTabs.plan", icon: "Map" },
  { to: "/learn/coach", labelKey: "shared.learnerTabs.coach", icon: "MessageCircle" },
] as const;

export const roleNavItems: Record<Role, NavItem[]> = {
  learner: [
    { to: "/lessons", labelKey: "roleNav.lessons" }, { to: "/active-quizzes", labelKey: "roleNav.quizzes" },
    { to: "/learn/gap", labelKey: "roleNav.plan" }, { to: "/learn/coach", labelKey: "roleNav.askVidura" },
    { to: "/learn/flashcards", labelKey: "roleNav.flashcards" }, { to: "/learn/micro", labelKey: "roleNav.reels" },
    { to: "/manuals", labelKey: "roleNav.ebooks" }, { to: "/learn/analytics", labelKey: "roleNav.analytics" },
    { to: "/learn/activity", labelKey: "roleNav.activity" },
  ],
  instructor: [
    { to: "/teacher/attempts", labelKey: "roleNav.results" }, { to: "/teacher/content", labelKey: "roleNav.content" },
    { to: "/teacher/analytics", labelKey: "roleNav.analytics" }, { to: "/teacher/activity", labelKey: "roleNav.activity" },
    { to: "/teacher/manuals", labelKey: "roleNav.ebooks" }, { to: "/lti-integration", labelKey: "roleNav.ltiConnection" },
    { to: "/teacher/ai", labelKey: "roleNav.aiTools" }, { to: "/teacher/coach/insights", labelKey: "roleNav.coachInsights" },
    { to: "/teacher/coach/shortcuts", labelKey: "roleNav.coachShortcuts" }, { to: "/teacher/skills", labelKey: "roleNav.skills" },
    { to: "/teacher/sme", labelKey: "roleNav.sources" }, { to: "/teacher/dct", labelKey: "roleNav.microPlanner" },
    { to: "/student-directory", labelKey: "roleNav.studentDirectory" }, { to: "/institutions", labelKey: "roleNav.institutions" },
  ],
  trainingOfficer: [
    { to: "/school-admin", labelKey: "roleNav.home" }, { to: "/school-admin/teachers", labelKey: "roleNav.teachers" },
    { to: "/school-admin/classes", labelKey: "roleNav.classes" }, { to: "/school-admin/students", labelKey: "roleNav.students" },
    { to: "/school-admin/analytics", labelKey: "roleNav.analytics" }, { to: "/school-admin/activity", labelKey: "roleNav.activity" },
    { to: "/institution-detail", labelKey: "roleNav.institutionDetails" },
  ],
};

export const roleHome: Record<Role, string> = {
  learner: "/lessons",
  instructor: "/teacher/attempts",
  trainingOfficer: "/school-admin",
};

export const accessPage = "/__prototype/access";

export function allowedFor(role: Role, path: string): boolean {
  if (path.startsWith("/school-admin") || path.startsWith("/institution-detail")) return role === "trainingOfficer";
  if (path.startsWith("/teacher") || path.startsWith("/lti-integration") || path.startsWith("/student-directory") || path.startsWith("/institutions")) return role === "instructor";
  if (path.startsWith("/learn/") || path.startsWith("/lessons") || path.startsWith("/active-quizzes") || path.startsWith("/quiz/") || path.startsWith("/manuals") || path.startsWith("/read/manuals")) return role === "learner";
  return true;
}
