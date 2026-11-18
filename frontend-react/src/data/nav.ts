import type { Role } from "./people";

export type GroupId = "learn" | "teach" | "institute";
export interface NavItem {
  to: string;
  labelKey: string;
}
export interface NavGroup {
  id: GroupId;
  labelKey: string;
  items: NavItem[];
}

export const navGroups: Record<GroupId, NavGroup> = {
  learn: {
    id: "learn",
    labelKey: "nav.learn",
    items: [
      { to: "/home", labelKey: "roleNav.dashboard" },
      { to: "/lessons", labelKey: "pages.lessons" },
      { to: "/xr-store", labelKey: "pages.xrLabs" },
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
      { to: "/xr-store", labelKey: "pages.xrLabs" },
      { to: "/teacher/activity", labelKey: "pages.tActivity" },
      { to: "/teacher/manuals", labelKey: "pages.tManuals" },
      { to: "/teacher/ai", labelKey: "pages.tAi" },
      { to: "/teacher/coach/insights", labelKey: "pages.tCoachInsights" },
      { to: "/teacher/skills", labelKey: "pages.tSkills" },
      { to: "/teacher/sme", labelKey: "pages.tSme" },
      { to: "/teacher/dct", labelKey: "pages.tDct" },
      { to: "/student-directory", labelKey: "pages.studentDirectory" },
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
      { to: "/lti-integration", labelKey: "pages.ltiIntegration" },
      { to: "/institutions", labelKey: "pages.institutions" },
    ],
  },
};

export const groupsForRole: Record<Role, GroupId[]> = {
  learner: ["learn"],
  instructor: ["teach"],
  trainingOfficer: ["institute"],
};

export const learnerTabs = [
  { to: "/home", labelKey: "shared.learnerTabs.dashboard", icon: "LayoutDashboard" },
  { to: "/lessons", labelKey: "shared.learnerTabs.lessons", icon: "BookOpen" },
  { to: "/xr-store", labelKey: "shared.learnerTabs.xrLabs", icon: "Box" },
  { to: "/active-quizzes", labelKey: "shared.learnerTabs.quizzes", icon: "ClipboardList" },
  { to: "/learn/gap", labelKey: "shared.learnerTabs.plan", icon: "Map" },
  { to: "/learn/coach", labelKey: "shared.learnerTabs.coach", icon: "MessageCircle" },
] as const;

export const roleNavItems: Record<Role, NavItem[]> = {
  learner: [
    { to: "/lessons", labelKey: "roleNav.lessons" },
    { to: "/active-quizzes", labelKey: "roleNav.quizzes" },
    { to: "/manuals", labelKey: "roleNav.ebooks5" },
    { to: "/learn/coach", labelKey: "roleNav.socraticTutor" },
    { to: "/learn/micro", labelKey: "roleNav.paperMorphReels" },
    { to: "/learn/gap", labelKey: "roleNav.linkedDataPlan" },
    { to: "/learn/flashcards", labelKey: "roleNav.flashcards" },
    { to: "/learn/activity", labelKey: "roleNav.activityEvidence" },
    { to: "/learn/analytics", labelKey: "roleNav.progressSnapshot" },
  ],
  instructor: [
    { to: "/teacher/attempts", labelKey: "roleNav.classResults" },
    { to: "/teacher/content", labelKey: "roleNav.contentStudio" },
    { to: "/teacher/manuals", labelKey: "roleNav.ebookStudio" },
    { to: "/teacher/skills", labelKey: "roleNav.skillsGraph" },
    { to: "/teacher/sme", labelKey: "roleNav.smeSearch" },
    { to: "/teacher/dct", labelKey: "roleNav.dctPlanner" },
    { to: "/teacher/analytics", labelKey: "roleNav.classAnalytics" },
    { to: "/teacher/activity", labelKey: "roleNav.activityStream" },
    { to: "/student-directory", labelKey: "roleNav.nrpsRoster" },
  ],
  trainingOfficer: [
    { to: "/school-admin", labelKey: "roleNav.overview" },
    { to: "/school-admin/classes", labelKey: "roleNav.classes10" },
    { to: "/school-admin/teachers", labelKey: "roleNav.faculty10" },
    { to: "/school-admin/students", labelKey: "roleNav.learnersNrps220" },
    { to: "/institution-detail", labelKey: "roleNav.institutionProfile" },
    { to: "/lti-integration", labelKey: "roleNav.ltiDeepLinking" },
  ],
};

export const roleHome: Record<Role, string> = {
  learner: "/home",
  instructor: "/teacher/attempts",
  trainingOfficer: "/school-admin",
};

export const accessPage = "/__prototype/access";

const validRoles: Role[] = ["learner", "instructor", "trainingOfficer"];

export function allowedFor(role: Role, path: string): boolean {
  if (!role || !validRoles.includes(role)) return false;
  if (
    path.startsWith("/school-admin") ||
    path.startsWith("/institution-detail") ||
    path.startsWith("/lti-integration") ||
    path.startsWith("/institutions") ||
    path.startsWith("/onboard") ||
    path.startsWith("/lti/register")
  )
    return role === "trainingOfficer";
  if (path.startsWith("/teacher/coach/shortcuts")) return false;
  if (path.startsWith("/teacher") || path.startsWith("/student-directory"))
    return role === "instructor";
  if (
    path.startsWith("/learn/") ||
    path.startsWith("/lessons") ||
    path.startsWith("/active-quizzes") ||
    path.startsWith("/quiz/") ||
    path.startsWith("/manuals") ||
    path.startsWith("/read/manuals")
  )
    return role === "learner";
  return true;
}
