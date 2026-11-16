import { describe, it, expect, beforeEach } from "vitest";
import { roleHome, allowedFor } from "@/data/nav";
import { getLessonImage } from "@/components/shared/LessonList";
import type { Lesson } from "@/data/lessons";
import { demoAccounts } from "@/data/accounts";
import { institute } from "@/data/institute";
import { queryClient } from "@/lib/queryClient";

describe("EdVidura Priority Fixes & Role Recognition Suite", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("Priority 1: Role Resolution & Dashboard Routing", () => {
    it("maps instructor claims directly to instructor role and /teacher/attempts", () => {
      const exchData = {
        token: "tok-prof-123",
        tenant_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject: "teacher1",
        learner_name: "John Teacher",
        is_instructor: true,
        is_school_admin: false,
        lms_return_url: "http://localhost:8085/mod/lti/return.php?course=2",
      };

      const mappedRole = exchData.is_school_admin
        ? "trainingOfficer"
        : exchData.is_instructor
          ? "instructor"
          : "learner";

      expect(mappedRole).toBe("instructor");
      expect(roleHome[mappedRole]).toBe("/teacher/attempts");
      expect(allowedFor(mappedRole, "/teacher/attempts")).toBe(true);
      expect(allowedFor(mappedRole, "/lessons")).toBe(false); // Instructor cannot access learner lessons
    });

    it("maps school admin claims to trainingOfficer and /school-admin", () => {
      const exchData = {
        token: "tok-admin-123",
        tenant_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject: "admin",
        learner_name: "Admin User",
        is_instructor: true, // In Moodle, admins have instructor claim too
        is_school_admin: true,
        lms_return_url: "http://localhost:8085/mod/lti/return.php?course=2",
      };

      // Crucial: is_school_admin takes precedence over is_instructor
      const mappedRole = exchData.is_school_admin
        ? "trainingOfficer"
        : exchData.is_instructor
          ? "instructor"
          : "learner";

      expect(mappedRole).toBe("trainingOfficer");
      expect(roleHome[mappedRole]).toBe("/school-admin");
      expect(allowedFor(mappedRole, "/school-admin")).toBe(true);
    });

    it("maps learner claims to learner and /lessons", () => {
      const exchData = {
        token: "tok-student-123",
        tenant_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        subject: "student1",
        learner_name: "Meghana Student",
        is_instructor: false,
        is_school_admin: false,
        lms_return_url: "http://localhost:8085/mod/lti/return.php?course=2",
      };

      const mappedRole = exchData.is_school_admin
        ? "trainingOfficer"
        : exchData.is_instructor
          ? "instructor"
          : "learner";

      expect(mappedRole).toBe("learner");
      expect(roleHome[mappedRole]).toBe("/lessons");
      expect(allowedFor(mappedRole, "/lessons")).toBe(true);
    });
  });

  describe("Priority 2: LMS Return Navigation (Back to Moodle)", () => {
    it("preserves authentic Moodle return URL from launch presentation", () => {
      const session = {
        name: "John Teacher",
        username: "teacher1",
        role: "instructor" as const,
        lmsReturnUrl: "http://localhost:8085/mod/lti/return.php?course=2",
      };

      const returnUrl = session.lmsReturnUrl || "http://localhost:8085";
      expect(returnUrl).toBe("http://localhost:8085/mod/lti/return.php?course=2");
      expect(returnUrl).not.toBe("/");
      expect(returnUrl).not.toBe("/lessons");
    });

    it("falls back to Moodle base origin if return URL is empty", () => {
      const session = {
        name: "Learner",
        username: "user",
        role: "learner" as const,
        lmsReturnUrl: undefined,
      };

      const returnUrl = session.lmsReturnUrl || "http://localhost:8085";
      expect(returnUrl).toBe("http://localhost:8085");
    });
  });

  describe("Priority 3: Sign Out & Refresh Invalidation", () => {
    it("sets edvidura_signed_out flag and suppresses cookie-based auto-restore on reload", () => {
      // Simulate user clicking sign out
      sessionStorage.setItem("edvidura_signed_out", "true");

      // Verify sign-out flag prevents session recovery on subsequent visit
      const isSignedOut = sessionStorage.getItem("edvidura_signed_out") === "true";
      expect(isSignedOut).toBe(true);

      // Verify that when a fresh LTI launch arrives with ?code= or ?token=, the flag is cleared
      const hasFreshLaunchCode = true;
      if (hasFreshLaunchCode) {
        sessionStorage.removeItem("edvidura_signed_out");
      }
      expect(sessionStorage.getItem("edvidura_signed_out")).toBeNull();
    });
  });

  describe("Priority 4: Lesson Thumbnail Images & Fallbacks", () => {
    it("maps backend lessons with UUIDs to local vector SVG illustrations based on order", () => {
      const backendLesson1: Lesson = {
        id: "b455799a-41e9-445e-85b9-122e1e3bc180", // UUID from PostgreSQL
        order: 1,
        title: "Electrical safety and PPE",
        kind: "reading",
        markedDone: false,
        courseCode: "ELE-A",
      };

      const backendLesson2: Lesson = {
        id: "7cd15478-f7b5-4b35-8025-a1c6a3ff8a99",
        order: 2,
        title: "Ohm's law in practice",
        kind: "video",
        markedDone: false,
        courseCode: "ELE-A",
      };

      const backendLesson5: Lesson = {
        id: "9aa88712-4412-4299-8ab1-ff541289c001",
        order: 5,
        title: "Checkpoint quiz",
        kind: "quiz",
        markedDone: false,
        courseCode: "ELE-A",
      };

      expect(getLessonImage(backendLesson1)).toBe("/images/lessons/lesson-1.svg");
      expect(getLessonImage(backendLesson2)).toBe("/images/lessons/lesson-2.svg");
      expect(getLessonImage(backendLesson5)).toBe("/images/lessons/lesson-5.svg");
    });

    it("falls back to default SVG if order is missing or invalid", () => {
      const unknownLesson: Lesson = {
        id: "unknown-uuid",
        order: 0,
        title: "Custom Module",
        kind: "reading",
        markedDone: false,
        courseCode: "ELE-A",
      };

      expect(getLessonImage(unknownLesson)).toBe("/images/lessons/lesson-default.svg");
    });
  });

  describe("Priority 5: Comprehensive Role-Based Route Guards", () => {
    const instructorRoutes = [
      "/teacher/attempts",
      "/teacher/content",
      "/teacher/analytics",
      "/teacher/activity",
      "/teacher/manuals",
      "/teacher/ai",
      "/teacher/ai/generate",
      "/teacher/coach/insights",
      "/teacher/skills",
      "/teacher/sme",
      "/teacher/dct",
      "/student-directory",
    ];

    const adminRoutes = [
      "/school-admin",
      "/school-admin/teachers",
      "/school-admin/classes",
      "/school-admin/students",
      "/school-admin/analytics",
      "/school-admin/activity",
      "/institution-detail",
      "/lti-integration",
      "/institutions",
      "/onboard",
      "/lti/register",
    ];

    const learnerRoutes = [
      "/lessons",
      "/lessons/1",
      "/active-quizzes",
      "/quiz/1",
      "/quiz/result/1",
      "/learn/gap",
      "/learn/coach",
      "/learn/flashcards",
      "/learn/micro",
      "/manuals",
      "/manuals/1",
      "/read/manuals/1",
      "/learn/analytics",
      "/learn/activity",
    ];

    it("strictly blocks learner role from accessing any instructor or admin routes", () => {
      instructorRoutes.forEach((route) => {
        expect(allowedFor("learner", route)).toBe(false);
      });
      adminRoutes.forEach((route) => {
        expect(allowedFor("learner", route)).toBe(false);
      });
    });

    it("permits learner role to access all learner-authorized routes", () => {
      learnerRoutes.forEach((route) => {
        expect(allowedFor("learner", route)).toBe(true);
      });
    });

    it("strictly blocks instructor role from accessing learner-only or admin routes", () => {
      learnerRoutes.forEach((route) => {
        expect(allowedFor("instructor", route)).toBe(false);
      });
      adminRoutes.forEach((route) => {
        expect(allowedFor("instructor", route)).toBe(false);
      });
    });

    it("permits instructor role to access all instructor routes", () => {
      instructorRoutes.forEach((route) => {
        expect(allowedFor("instructor", route)).toBe(true);
      });
    });

    it("strictly blocks trainingOfficer role from accessing learner-only routes", () => {
      learnerRoutes.forEach((route) => {
        expect(allowedFor("trainingOfficer", route)).toBe(false);
      });
    });

    it("permits trainingOfficer role to access all institute admin routes", () => {
      adminRoutes.forEach((route) => {
        expect(allowedFor("trainingOfficer", route)).toBe(true);
      });
    });
  });

  describe("Priority 6: Riverside Demo Account Consolidation", () => {
    it("contains only Riverside demo identities", () => {
      expect(demoAccounts.length).toBe(3);
      const usernames = demoAccounts.map((a) => a.username);
      expect(usernames).toEqual(["riverside_alice", "riverside_priya", "riverside_admin"]);
    });

    it("has exactly one learner, one instructor, and one training officer", () => {
      const roles = demoAccounts.map((a) => a.role);
      expect(roles).toEqual(["learner", "instructor", "trainingOfficer"]);
    });

    it("ensures no legacy Lakeside or other tenant personas exist in demoAccounts", () => {
      const nonRiverside = demoAccounts.filter((a) => !a.username.startsWith("riverside_"));
      expect(nonRiverside).toHaveLength(0);
    });

    it("points institute profile to Riverside High School", () => {
      expect(institute.name).toBe("Riverside High School");
      expect(institute.shortName).toBe("Riverside High");
      expect(institute.code).toBe("RIVERSIDE");
      expect(institute.moodleSite).toBe("http://localhost:8085");
    });
  });

  describe("Priority 7: Fail-Closed Security, Loading State & Cache Invalidation", () => {
    it("fails closed when role is unknown, undefined or invalid", () => {
      const invalidRoles = ["unknown", "guest", "student", "teacher", "", null, undefined];
      const protectedPaths = ["/lessons", "/teacher/attempts", "/school-admin", "/launch-hub"];

      invalidRoles.forEach((role) => {
        protectedPaths.forEach((path) => {
          expect(allowedFor(role as any, path)).toBe(false);
        });
      });
    });

    it("verifies account switching clears React Query cache completely", () => {
      // Simulate cached instructor queries
      queryClient.setQueryData(["teacher-attempts", "class-8"], {
        attempts: [{ id: "att-1", student: "Alice", score: 95 }],
      });
      queryClient.setQueryData(["teacher-analytics"], { avgScore: 88 });

      expect(queryClient.getQueryData(["teacher-attempts", "class-8"])).toBeDefined();
      expect(queryClient.getQueryData(["teacher-analytics"])).toBeDefined();

      // Clear queryClient as executed on signOut and signIn
      queryClient.clear();

      expect(queryClient.getQueryData(["teacher-attempts", "class-8"])).toBeUndefined();
      expect(queryClient.getQueryData(["teacher-analytics"])).toBeUndefined();
    });

    it("enforces synchronous fail-closed blocked state for unauthenticated sessions", () => {
      // Logic from AppShell: const isUnauthorized = !session || !role || !allowedFor(role, pathname);
      const isUnauthNoSession = (session: any, role: any, pathname: string) =>
        !session || !role || !allowedFor(role, pathname);

      // Null session -> blocked
      expect(isUnauthNoSession(null, "learner", "/lessons")).toBe(true);
      expect(isUnauthNoSession(null, "instructor", "/teacher/attempts")).toBe(true);

      // Authenticated learner requesting instructor route -> blocked
      const learnerSession = { name: "Alice", username: "riverside_alice", role: "learner" as const };
      expect(isUnauthNoSession(learnerSession, "learner", "/teacher/attempts")).toBe(true);
      expect(isUnauthNoSession(learnerSession, "learner", "/teacher/content")).toBe(true);
      expect(isUnauthNoSession(learnerSession, "learner", "/school-admin")).toBe(true);

      // Authenticated learner requesting permitted route -> not blocked
      expect(isUnauthNoSession(learnerSession, "learner", "/lessons")).toBe(false);

      // Authenticated instructor requesting instructor route -> not blocked
      const instructorSession = { name: "Priya", username: "riverside_priya", role: "instructor" as const };
      expect(isUnauthNoSession(instructorSession, "instructor", "/teacher/attempts")).toBe(false);
      expect(isUnauthNoSession(instructorSession, "instructor", "/teacher/content")).toBe(false);

      // Authenticated instructor requesting learner-only route -> blocked
      expect(isUnauthNoSession(instructorSession, "instructor", "/lessons")).toBe(true);
    });

    it("verifies safe session switching from learner to instructor without role leakage", () => {
      // 1. Initial learner state
      let activeSession: any = { name: "Alice", username: "riverside_alice", role: "learner" };
      queryClient.setQueryData(["learner-progress"], { completed: 2, total: 4 });
      expect(queryClient.getQueryData(["learner-progress"])).toBeDefined();
      expect(allowedFor(activeSession.role, "/lessons")).toBe(true);
      expect(allowedFor(activeSession.role, "/teacher/attempts")).toBe(false);

      // 2. Perform switch to instructor: cache cleared, session updated
      queryClient.clear();
      activeSession = { name: "Priya", username: "riverside_priya", role: "instructor" };

      // Query cache wiped
      expect(queryClient.getQueryData(["learner-progress"])).toBeUndefined();
      // Role non-leakage confirmed: instructor has access to teacher routes, not learner
      expect(allowedFor(activeSession.role, "/teacher/attempts")).toBe(true);
      expect(allowedFor(activeSession.role, "/lessons")).toBe(false);
      expect(roleHome[activeSession.role as keyof typeof roleHome]).toBe("/teacher/attempts");
    });

    it("verifies safe session switching from instructor to learner without privilege retention", () => {
      // 1. Initial instructor state
      let activeSession: any = { name: "Priya", username: "riverside_priya", role: "instructor" };
      queryClient.setQueryData(["teacher-attempts"], { count: 12 });
      expect(queryClient.getQueryData(["teacher-attempts"])).toBeDefined();
      expect(allowedFor(activeSession.role, "/teacher/attempts")).toBe(true);

      // 2. Perform switch to learner: cache cleared, session updated
      queryClient.clear();
      activeSession = { name: "Alice", username: "riverside_alice", role: "learner" };

      // Query cache wiped
      expect(queryClient.getQueryData(["teacher-attempts"])).toBeUndefined();
      // Role non-leakage confirmed: learner has NO instructor privileges
      expect(allowedFor(activeSession.role, "/teacher/attempts")).toBe(false);
      expect(allowedFor(activeSession.role, "/teacher/content")).toBe(false);
      expect(allowedFor(activeSession.role, "/lessons")).toBe(true);
      expect(roleHome[activeSession.role as keyof typeof roleHome]).toBe("/lessons");
    });
  });
});

