import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { setBearerToken } from "@/components/shell/RoleContext";
import {
  adaptAttempt,
  adaptAttempts,
  adaptClassSummary,
  adaptLesson,
  type BackendAttemptCard,
  type BackendClassRoster,
  type BackendLessonItem,
} from "@/lib/adapters";

function mockJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(data),
  };
}

describe("Phase 8: Teacher, Instructor and Training Officer Workflows", () => {
  beforeEach(() => {
    setBearerToken("test-instructor-token");
  });

  describe("Teacher Dashboard and Attempts Management", () => {
    it("adapts backend attempt cards correctly into UI models", () => {
      const rawAttempts: BackendAttemptCard[] = [
        {
          id: "att-1",
          subject: "student-meena",
          learner_name: "Meena Kumari",
          score: 5,
          max_score: 5,
          score_percent: 100,
          grade_sent: true,
          status: "synced",
          created_at: "2026-11-12T10:00:00Z",
        },
        {
          id: "att-2",
          subject: "student-rajesh",
          learner_name: "Rajesh Kumar",
          score: 2,
          max_score: 5,
          score_percent: 40,
          grade_sent: false,
          grade_error: "Connection timeout",
          status: "needs-review",
          created_at: "2026-11-12T10:05:00Z",
        },
        {
          id: "att-3",
          subject: "student-anita",
          learner_name: "Anita Sharma",
          score: 4,
          max_score: 5,
          score_percent: 80,
          grade_sent: false,
          status: "queued",
          created_at: "2026-11-12T10:10:00Z",
        },
      ];

      const adapted = adaptAttempts(rawAttempts);
      expect(adapted).toHaveLength(3);

      expect(adapted[0]?.id).toBe("att-1");
      expect(adapted[0]?.personId).toBe("student-meena");
      expect(adapted[0]?.score).toBe(5);
      expect(adapted[0]?.moodleStatus).toBe("sent");

      expect(adapted[1]?.moodleStatus).toBe("error");
      expect(adapted[2]?.moodleStatus).toBe("waiting");
    });

    it("fetches instructor tenant attempts from /api/v1/app/attempts", async () => {
      const mockPayload = {
        ok: true,
        data: {
          attempts: [
            {
              id: "att-backend-1",
              subject: "student-1",
              score: 4,
              max_score: 5,
              grade_sent: true,
              status: "synced",
            },
          ],
        },
        error: null,
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
          expect(url).toContain("/api/v1/app/attempts");
          expect(init?.headers).toBeDefined();
          return mockJsonResponse(mockPayload);
        }),
      );

      const res = await api.get<{ attempts: BackendAttemptCard[] }>("/api/v1/app/attempts");
      expect(res.attempts).toHaveLength(1);
      const adapted = adaptAttempt(res.attempts[0]!);
      expect(adapted.id).toBe("att-backend-1");
      expect(adapted.moodleStatus).toBe("sent");
    });

    it("loads teacher dashboard aggregation snapshot", async () => {
      const mockSnapshot = {
        ok: true,
        data: {
          overview: {
            student_count: 32,
            teacher_count: 3,
            class_count: 2,
            chapter_count: 14,
          },
          classes: [
            {
              id: "cls-1",
              class_code: "ELE-A",
              class_name: "Electrician Batch A",
            },
          ],
          recent_attempts: [],
        },
        error: null,
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(mockSnapshot)));

      const res = await api.get<{
        overview: { student_count: number; class_count: number };
        classes: Array<{ class_code: string }>;
      }>("/api/v1/app/teacher/dashboard");

      expect(res.overview.student_count).toBe(32);
      expect(res.overview.class_count).toBe(2);
      expect(res.classes[0]?.class_code).toBe("ELE-A");
    });
  });

  describe("Content Management and Authoring Lifecycle", () => {
    it("creates, updates, and deletes lessons via API client", async () => {
      let created = false;
      let updated = false;
      let deleted = false;

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
          const method = init?.method || "GET";
          if (url.endsWith("/api/v1/app/lessons") && method === "POST") {
            created = true;
            return mockJsonResponse(
              {
                ok: true,
                data: {
                  lesson: {
                    id: "les-new-1",
                    title: "Earthing Safety",
                    body_md: "# Earthing Safety",
                    status: "published",
                  },
                },
                error: null,
              },
              201,
            );
          }
          if (url.includes("/api/v1/app/lessons/les-new-1") && method === "PUT") {
            updated = true;
            return mockJsonResponse({
              ok: true,
              data: {
                lesson: {
                  id: "les-new-1",
                  title: "Earthing Safety (Updated)",
                  body_md: "# Earthing Safety Updated",
                  status: "published",
                },
              },
              error: null,
            });
          }
          if (url.includes("/api/v1/app/lessons/les-new-1") && method === "DELETE") {
            deleted = true;
            return mockJsonResponse({
              ok: true,
              data: { deleted: true },
              error: null,
            });
          }
          return mockJsonResponse({ ok: true, data: null, error: null });
        }),
      );

      // 1. Create
      const createRes = await api.post<{ lesson: { id: string; title: string } }>(
        "/api/v1/app/lessons",
        {
          title: "Earthing Safety",
          body_md: "# Earthing Safety",
          kind: "article",
          status: "published",
        },
      );
      expect(created).toBe(true);
      expect(createRes.lesson.id).toBe("les-new-1");

      // 2. Update
      const updateRes = await api.put<{ lesson: { title: string } }>(
        "/api/v1/app/lessons/les-new-1",
        { title: "Earthing Safety (Updated)" },
      );
      expect(updated).toBe(true);
      expect(updateRes.lesson.title).toBe("Earthing Safety (Updated)");

      // 3. Delete
      const delRes = await api.delete<{ deleted: boolean }>("/api/v1/app/lessons/les-new-1");
      expect(deleted).toBe(true);
      expect(delRes.deleted).toBe(true);
    });

    it("manages quiz questions lifecycle via backend endpoints", async () => {
      let qCreated = false;
      let qDeleted = false;

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
          const method = init?.method || "GET";
          if (url.endsWith("/api/v1/app/quiz/questions") && method === "POST") {
            qCreated = true;
            return mockJsonResponse(
              {
                ok: true,
                data: {
                  question: {
                    id: "q-new-1",
                    prompt: "Which gas is used in SF6 circuit breakers?",
                    position: 1,
                  },
                },
                error: null,
              },
              201,
            );
          }
          if (url.includes("/api/v1/app/quiz/questions/q-new-1") && method === "DELETE") {
            qDeleted = true;
            return mockJsonResponse({
              ok: true,
              data: { deleted: true },
              error: null,
            });
          }
          return mockJsonResponse({ ok: true, data: null, error: null });
        }),
      );

      const addRes = await api.post<{ question: { id: string } }>("/api/v1/app/quiz/questions", {
        prompt: "Which gas is used in SF6 circuit breakers?",
        choices: ["Sulfur hexafluoride", "Nitrogen", "Argon", "Carbon dioxide"],
        correct_index: 0,
        qtype: "single",
      });
      expect(qCreated).toBe(true);
      expect(addRes.question.id).toBe("q-new-1");

      const delRes = await api.delete<{ deleted: boolean }>("/api/v1/app/quiz/questions/q-new-1");
      expect(qDeleted).toBe(true);
      expect(delRes.deleted).toBe(true);
    });
  });

  describe("Classes and Manual Assignments", () => {
    it("adapts backend class rosters to UI summary models", () => {
      const roster: BackendClassRoster = {
        id: "c-101",
        class_code: "ELE-A",
        class_name: "Electrician Trade Practical",
        subject: "Electrical Engineering",
        teachers: [{ name: "Suresh Iyer", email: "suresh@example.edu" }],
        students: [
          { name: "Meena Kumari", student_code: "STU-001" },
          { name: "Rajesh Kumar", student_code: "STU-002" },
        ],
      };

      const summary = adaptClassSummary(roster);
      expect(summary.id).toBe("c-101");
      expect(summary.code).toBe("ELE-A");
      expect(summary.trade).toBe("Electrical Engineering");
      expect(summary.teacherName).toBe("Suresh Iyer");
      expect(summary.studentCount).toBe(2);
    });

    it("gets and sets manual class assignments via dedicated endpoints", async () => {
      let assignedClasses = ["c-101"];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
          const method = init?.method || "GET";
          if (url.includes("/api/v1/app/manuals/man-1/classes")) {
            if (method === "GET") {
              return mockJsonResponse({
                ok: true,
                data: { class_ids: assignedClasses },
                error: null,
              });
            }
            if (method === "POST") {
              const body = JSON.parse(init?.body as string);
              assignedClasses = body.class_ids;
              return mockJsonResponse({
                ok: true,
                data: { class_ids: assignedClasses },
                error: null,
              });
            }
          }
          return mockJsonResponse({ ok: true, data: null, error: null });
        }),
      );

      // GET
      const getRes = await api.get<{ class_ids: string[] }>("/api/v1/app/manuals/man-1/classes");
      expect(getRes.class_ids).toEqual(["c-101"]);

      // POST
      const postRes = await api.post<{ class_ids: string[] }>("/api/v1/app/manuals/man-1/classes", {
        class_ids: ["c-101", "c-102"],
      });
      expect(postRes.class_ids).toEqual(["c-101", "c-102"]);
    });
  });

  describe("AI Content Generation and Assessment Integration", () => {
    it("calls AI authoring generation endpoint with teacher prompt", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
          expect(url).toContain("/api/v1/app/ai/author");
          const body = JSON.parse(init?.body as string);
          expect(body.prompt).toBe("Explain step potential and touch potential");
          return mockJsonResponse({
            ok: true,
            data: {
              lesson_markdown:
                "# Step and Touch Potential\n\nSafety considerations near substations.",
            },
            error: null,
          });
        }),
      );

      const res = await api.post<{ lesson_markdown: string }>("/api/v1/app/ai/author", {
        prompt: "Explain step potential and touch potential",
      });
      expect(res.lesson_markdown).toContain("Step and Touch Potential");
    });
  });
});
