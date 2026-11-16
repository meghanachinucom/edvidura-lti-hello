import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { setBearerToken, getBearerToken } from "@/components/shell/RoleContext";
import {
  adaptLesson,
  adaptLessons,
  adaptQuiz,
  adaptAttempt,
  adaptAttempts,
  type BackendLessonItem,
  type BackendAttemptCard,
  type BackendQuizSummary,
} from "@/lib/adapters";

describe("Phase 6: Learner Journeys & Active Quiz Engine Integration", () => {
  beforeEach(() => {
    setBearerToken("valid-learner-token-xyz");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setBearerToken(null);
  });

  it("loads Learner Launch Hub data including session, course and lessons", async () => {
    const mockHomePayload = {
      ok: true,
      data: {
        session: {
          learner_name: "Meena Rathod",
          subject: "student-meena",
          course: "Electrician Trade",
          tenant_name: "Government ITI Hyderabad",
        },
        course: {
          id: "c-101",
          slug: "electrician",
          title: "Electrician Trade Practical & Theory",
        },
        progress: {
          completed: 3,
          total: 8,
          percent: 38,
        },
        lessons: [
          {
            id: "les-1",
            title: "Ohm's Law Fundamentals",
            order_index: 1,
            completed: true,
            kind: "reading",
          },
          {
            id: "les-2",
            title: "Kirchhoff's Laws",
            order_index: 2,
            completed: false,
            kind: "video",
          },
        ],
      },
      error: null,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve(mockHomePayload),
    });
    vi.stubGlobal("fetch", mockFetch);

    const data = await api.get<typeof mockHomePayload.data>("/api/v1/app/home");
    expect(data.session.learner_name).toBe("Meena Rathod");
    expect(data.course?.title).toBe("Electrician Trade Practical & Theory");
    expect(data.lessons).toHaveLength(2);

    const adapted = adaptLessons(data.lessons as BackendLessonItem[]);
    expect(adapted[0]?.markedDone).toBe(true);
    expect(adapted[1]?.markedDone).toBe(false);
    expect(adapted[1]?.kind).toBe("video");
  });

  it("maps lesson detail and handles lesson completion via API", async () => {
    const lessonDetail = {
      lesson: {
        id: "les-transformer",
        title: "Single Phase Transformer",
        body_md: "Transformers transfer energy via electromagnetic induction.",
        body_html: "<p>Transformers transfer energy via electromagnetic induction.</p>",
        completed: false,
        order_index: 3,
      },
      prev: { id: "les-ac", title: "AC Theory" },
      next: { id: "les-motor", title: "Induction Motors" },
    };

    let completeCalled = false;
    const mockFetch = vi.fn().mockImplementation((url, init) => {
      if (url.includes("/complete")) {
        completeCalled = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ ok: true, data: { completed: true }, error: null }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ ok: true, data: lessonDetail, error: null }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const detail = await api.get<typeof lessonDetail>("/api/v1/app/lessons/les-transformer");
    expect(detail.lesson.title).toBe("Single Phase Transformer");
    expect(detail.prev?.id).toBe("les-ac");
    expect(detail.next?.id).toBe("les-motor");

    const adapted = adaptLesson(detail.lesson as BackendLessonItem);
    expect(adapted.markedDone).toBe(false);

    // Complete lesson
    const completeResp = await api.post<{ completed: boolean }>(
      "/api/v1/app/lessons/les-transformer/complete",
    );
    expect(completeCalled).toBe(true);
    expect(completeResp.completed).toBe(true);
  });

  it("loads quiz questions, adapts options, and validates submission payload", async () => {
    const mockQuiz: BackendQuizSummary = {
      id: "qz-safety-1",
      title: "Electrical Workshop Safety",
      questions: [
        {
          id: "q-1",
          prompt: "What is the primary action in case of electric shock?",
          options: ["Touch victim directly", "Switch off power supply", "Pour water"],
          correct: "B",
        },
        {
          id: "q-2",
          prompt: "What colour represents the earth wire?",
          options: [
            { key: "A", text: "Green / Yellow" },
            { key: "B", text: "Red" },
            { key: "C", text: "Black" },
          ],
          correct: "A",
        },
      ],
    };

    let submittedAnswers: Record<string, string> | undefined;
    const mockFetch = vi.fn().mockImplementation((url, init) => {
      if (url.includes("/quiz/submit")) {
        const body = JSON.parse(init.body);
        submittedAnswers = body.answers;
        return Promise.resolve({
          ok: true,
          status: 201,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              ok: true,
              data: {
                attempt_id: "att-real-123",
                score: 2,
                max_score: 2,
                pass_percent: 60,
                passed: true,
                practice: false,
                grade_queued: true,
                detail: {
                  "q-1": { prompt: "Primary action", chosen: "B", correct: true },
                  "q-2": { prompt: "Earth wire colour", chosen: "A", correct: true },
                },
              },
              error: null,
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ ok: true, data: mockQuiz, error: null }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const rawQuiz = await api.get<BackendQuizSummary>("/api/v1/app/quiz");
    const adaptedQuiz = adaptQuiz(rawQuiz);
    expect(adaptedQuiz.questions).toHaveLength(2);
    expect(adaptedQuiz.questions[0]?.options[1]?.text).toBe("Switch off power supply");

    // Submit answers
    const answers = { "q-1": "B", "q-2": "A" };
    const submitResult = await api.post<{
      attempt_id: string;
      score: number;
      passed: boolean;
      grade_queued: boolean;
    }>("/api/v1/app/quiz/submit", { answers, practice: false });

    expect(submittedAnswers).toEqual({ "q-1": "B", "q-2": "A" });
    expect(submitResult.attempt_id).toBe("att-real-123");
    expect(submitResult.score).toBe(2);
    expect(submitResult.passed).toBe(true);
    expect(submitResult.grade_queued).toBe(true);
  });

  it("handles Moodle AGS polling and distinguishes submission from AGS status", async () => {
    const agsSyncedResponse = {
      ok: true,
      status: "synced",
      grade_sent: true,
      grade_error: null,
      ags_available: true,
      practice: false,
    };

    const mockFetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/ags.json")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(agsSyncedResponse),
        });
      }
      if (url.includes("/receipt.json")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () =>
            Promise.resolve({
              attempt_id: "att-real-123",
              score: 2,
              sealed_at: "2026-11-12T14:00:00Z",
              signature: "sha256-mock-sig",
            }),
        });
      }
      return Promise.reject(new Error("Not found"));
    });
    vi.stubGlobal("fetch", mockFetch);

    const ags = await api.get<typeof agsSyncedResponse>("/quiz/result/att-real-123/ags.json");
    expect(ags.status).toBe("synced");
    expect(ags.grade_sent).toBe(true);

    const receipt = await api.get<{ attempt_id: string; signature: string }>(
      "/quiz/result/att-real-123/receipt.json",
    );
    expect(receipt.attempt_id).toBe("att-real-123");
    expect(receipt.signature).toBe("sha256-mock-sig");
  });

  it("handles AGS failure report with specific grade_error message", async () => {
    const agsFailedResponse = {
      ok: true,
      status: "failed",
      grade_sent: false,
      grade_error: "Moodle LTI AGS endpoint returned HTTP 500: gradebook locked",
      ags_available: true,
      practice: false,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve(agsFailedResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const ags = await api.get<typeof agsFailedResponse>("/quiz/result/att-err-999/ags.json");
    expect(ags.status).toBe("failed");
    expect(ags.grade_sent).toBe(false);
    expect(ags.grade_error).toContain("gradebook locked");
  });

  it("adapts backend attempt history and translates statuses accurately", () => {
    const rawAttempts: BackendAttemptCard[] = [
      {
        id: "att-1",
        subject: "student-meena",
        score: 5,
        max_score: 5,
        status: "synced",
        grade_sent: true,
        created_at: "2026-11-12T10:00:00Z",
      },
      {
        id: "att-2",
        subject: "student-meena",
        score: 3,
        max_score: 5,
        status: "queued",
        grade_sent: false,
        created_at: "2026-11-12T11:00:00Z",
      },
      {
        id: "att-3",
        subject: "student-meena",
        score: 2,
        max_score: 5,
        status: "needs-review",
        grade_error: "Timeout contacting LMS",
        created_at: "2026-11-12T12:00:00Z",
      },
    ];

    const adapted = adaptAttempts(rawAttempts);
    expect(adapted).toHaveLength(3);
    expect(adapted[0]?.moodleStatus).toBe("sent");
    expect(adapted[1]?.moodleStatus).toBe("waiting");
    expect(adapted[2]?.moodleStatus).toBe("error");
  });

  it("clears bearer token and rejects on 401 session expiration", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: () =>
        Promise.resolve({
          ok: false,
          data: null,
          error: { code: "auth_required", message: "LTI session expired" },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(api.get("/api/v1/app/quiz")).rejects.toThrow("LTI session expired");
    expect(getBearerToken()).toBeNull();
  });

  it("correctly handles 403 permission failures and quota limits", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "content-type": "application/json" }),
      json: () =>
        Promise.resolve({
          ok: false,
          data: null,
          error: {
            code: "attempt_limit",
            message: "Max graded attempts reached for this session",
          },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await api.post("/api/v1/app/quiz/submit", { answers: {}, practice: false });
      expect.fail("Should have thrown 403 ApiError");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(403);
      expect(apiErr.code).toBe("attempt_limit");
    }
  });
});
