import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { setBearerToken, getBearerToken } from "@/components/shell/RoleContext";
import { adaptLesson, adaptQuiz, adaptClassSummary } from "@/lib/adapters";

describe("EdVidura API Client & Adapters", () => {
  beforeEach(() => {
    setBearerToken(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setBearerToken(null);
  });

  it("injects Bearer token when present in RoleContext", async () => {
    setBearerToken("test-bearer-token-123");

    let capturedHeaders: Headers | undefined;
    const mockFetch = vi.fn().mockImplementation((url, init) => {
      capturedHeaders = init?.headers;
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ ok: true, data: { status: "ready" }, error: null }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const data = await api.get<{ status: string }>("/api/v1/app/health");
    expect(data.status).toBe("ready");
    expect(capturedHeaders?.get("Authorization")).toBe("Bearer test-bearer-token-123");
  });

  it("handles 401 Unauthorized by clearing bearer token and throwing ApiError", async () => {
    setBearerToken("stale-token");

    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            ok: false,
            data: null,
            error: { code: "auth_required", message: "Launch token expired" },
          }),
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    await expect(api.get("/api/v1/app/session")).rejects.toThrow("Launch token expired");
    expect(getBearerToken()).toBeNull();
  });

  it("unwraps AppEnvelope data successfully on HTTP 200", async () => {
    const payload = [{ id: "l1", title: "Ohm's Law", duration_minutes: 25 }];
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ ok: true, data: payload, error: null }),
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const result = await api.get<typeof payload>("/api/v1/app/lessons");
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Ohm's Law");
  });

  it("maps AppEnvelope errors with custom status codes", async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            ok: false,
            data: null,
            error: { code: "staff_required", message: "Staff access required for authoring" },
          }),
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    try {
      await api.post("/api/v1/app/ai/author", { prompt: "Test" });
      expect.fail("Should have thrown ApiError");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(403);
      expect(apiErr.code).toBe("staff_required");
      expect(apiErr.message).toBe("Staff access required for authoring");
    }
  });

  it("handles request abort and timeout signals", async () => {
    const controller = new AbortController();
    const mockFetch = vi.fn().mockImplementation((url, init) => {
      return new Promise((_, reject) => {
        init.signal.addEventListener("abort", () => {
          const abortError = new DOMException("The user aborted a request.", "AbortError");
          reject(abortError);
        });
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    setTimeout(() => controller.abort(), 10);

    await expect(api.get("/api/v1/app/slow", { signal: controller.signal })).rejects.toThrow(
      "Request timed out or cancelled",
    );
  });

  it("adapts backend lesson models correctly", () => {
    const backendLesson = {
      id: "les-101",
      title: "AC Circuits",
      course_code: "ELE-A",
      order_index: 2,
      completed: true,
      kind: "video",
    };

    const adapted = adaptLesson(backendLesson);
    expect(adapted.id).toBe("les-101");
    expect(adapted.title).toBe("AC Circuits");
    expect(adapted.order).toBe(2);
    expect(adapted.kind).toBe("video");
    expect(adapted.markedDone).toBe(true);
    expect(adapted.courseCode).toBe("ELE-A");
  });

  it("adapts backend quiz summary and normalizes option strings/objects", () => {
    const backendQuiz = {
      id: "qz-transformer-1",
      title: "Transformer Fundamentals",
      questions: [
        {
          id: "q-1",
          prompt: "What does step-down transformer do?",
          options: ["Decreases voltage", "Increases voltage", "No change"],
          correct: "A",
        },
        {
          id: "q-2",
          prompt: "What is core material?",
          options: [{ text: "Silicon Steel" }, { text: "Copper" }],
          correct: "A",
        },
      ],
    };

    const adapted = adaptQuiz(backendQuiz);
    expect(adapted.id).toBe("qz-transformer-1");
    expect(adapted.title).toBe("Transformer Fundamentals");
    expect(adapted.questions).toHaveLength(2);
    expect(adapted.questions[0]?.options[0]?.text).toBe("Decreases voltage");
    expect(adapted.questions[1]?.options[0]?.text).toBe("Silicon Steel");
  });

  it("adapts class roster summaries into table view models", () => {
    const backendClass = {
      id: "c-101",
      class_code: "ELE-A",
      class_name: "Electrician 1st Year Section A",
      subject: "Electrical",
      teachers: [{ name: "Suresh Iyer", role: "lead" }],
      students: [
        { name: "Meena Rathod", student_code: "ST-01" },
        { name: "Arjun Das", student_code: "ST-02" },
      ],
    };

    const adapted = adaptClassSummary(backendClass);
    expect(adapted.id).toBe("c-101");
    expect(adapted.code).toBe("ELE-A");
    expect(adapted.teacherName).toBe("Suresh Iyer");
    expect(adapted.studentCount).toBe(2);
  });
});
