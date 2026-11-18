import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { setBearerToken } from "@/components/shell/RoleContext";

function mockJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(data),
  };
}

describe("Enterprise & Specialized Workflows Frontend Integration", () => {
  beforeEach(() => {
    setBearerToken("test-bearer-token");
    vi.restoreAllMocks();
  });

  describe("CAT Competencies, Technical Orders & Proposals", () => {
    it("fetches CAT competency catalog overview", async () => {
      const mockOverview = {
        ok: true,
        data: {
          competencies: [
            { code: "CAT-C1", title: "Aircraft Electrical Wiring Safety" },
            { code: "CAT-C2", title: "Connector Pinout Inspection" },
          ],
          proposals: [{ id: "prop-1", title: "Proposed Wiring Standard", source: "NAVAIR-01" }],
        },
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockJsonResponse(mockOverview) as any);

      const res = await api.get<any>("/api/v1/app/cat");
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/v1/app/cat",
        expect.objectContaining({ method: "GET" }),
      );
      expect(res.competencies).toHaveLength(2);
      expect(res.proposals).toHaveLength(1);
    });

    it("submits Technical Order text for competency mapping", async () => {
      const mockResult = {
        ok: true,
        data: {
          competencies: [{ code: "CAT-MAP-1", title: "Lockout Tagout Procedure" }],
          mapped_count: 1,
        },
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockJsonResponse(mockResult) as any);

      const payload = {
        title: "LOTO Technical Order",
        text: "Perform lockout and tagout on primary breaker before servicing panel.",
        persist: true,
      };

      const res = await api.post<any>("/api/v1/app/cat/map", payload);
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/v1/app/cat/map",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
      expect(res.mapped_count).toBe(1);
    });

    it("approves and rejects Technical Order proposals", async () => {
      const mockApprove = { ok: true, data: { status: "approved" } };
      const mockReject = { ok: true, data: { status: "rejected" } };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockJsonResponse(mockApprove) as any)
        .mockResolvedValueOnce(mockJsonResponse(mockReject) as any);

      const r1 = await api.post<any>("/api/v1/app/cat/proposals/prop-1/approve");
      expect(r1.status).toBe("approved");

      const r2 = await api.post<any>("/api/v1/app/cat/proposals/prop-2/reject");
      expect(r2.status).toBe("rejected");
    });
  });

  describe("Interactive Lab Packs & XR Suite", () => {
    it("proposes and saves an interactive lab pack", async () => {
      const mockProposal = {
        ok: true,
        data: {
          title: "Three-Phase Motor Lab",
          steps: [{ stage: 1, action: "De-energize main breaker" }],
        },
      };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockJsonResponse(mockProposal) as any);

      const res = await api.post<any>("/api/v1/app/labs/propose", {
        title: "Three-Phase Motor Lab",
        body_md: "Connect motor leads to star-delta contactor.",
      });

      expect(res.steps).toHaveLength(1);
    });

    it("publishes an interactive lab pack for learners", async () => {
      const mockPublish = { ok: true, data: { id: "pack-101", status: "published" } };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockPublish) as any);

      const res = await api.post<any>("/api/v1/app/labs/packs/pack-101/publish");
      expect(res.status).toBe("published");
    });

    it("fetches XR Suite stack overview and asset repositories", async () => {
      const mockXr = {
        ok: true,
        data: {
          products: { immersive_labs: true, ar_assistance: true, vr_maintainer: true },
          store_apps: [{ id: "app-1", title: "Substation Simulator" }],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockXr) as any);

      const res = await api.get<any>("/api/v1/app/xr/overview");
      expect(res.products.immersive_labs).toBe(true);
      expect(res.store_apps).toHaveLength(1);
    });
  });

  describe("SME Document Search, AuditPro & Air-Gap", () => {
    it("queries handbook document search index", async () => {
      const mockSearch = {
        ok: true,
        data: {
          hits: [
            { title: "Earthing Standards", snippet: "Earth pit resistance < 1 ohm", score: 0.95 },
          ],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockSearch) as any);

      const res = await api.get<any>("/api/v1/app/document-search?q=earthing");
      expect(res.hits[0].title).toBe("Earthing Standards");
      expect(res.hits[0].score).toBe(0.95);
    });

    it("fetches AuditPro sealed attempt logs and IQ review psychometrics", async () => {
      const mockAudit = {
        ok: true,
        data: [{ id: "audit-1", quiz_title: "Wiring Safety", hash: "sha256:abc123sealed" }],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockAudit) as any);

      const res = await api.get<any>("/api/v1/app/audit-pro");
      expect(res).toHaveLength(1);
      expect(res[0].hash).toContain("sha256");
    });

    it("verifies air-gap content pack readiness", async () => {
      const mockAirgap = {
        ok: true,
        data: {
          ready: true,
          checks: { offline_cached: true, zero_cdn: true },
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockAirgap) as any);

      const res = await api.get<any>("/api/v1/app/airgap-pack");
      expect(res.ready).toBe(true);
      expect(res.checks.zero_cdn).toBe(true);
    });
  });

  describe("Study Groups & Group Assignments", () => {
    it("creates study groups and dispatches group assignments", async () => {
      const mockGroup = { ok: true, data: { group_id: "grp-1", name: "Alpha Squad" } };
      const mockAssign = { ok: true, data: { id: "asgn-1", title: "Wiring Quiz" } };

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockJsonResponse(mockGroup, 201) as any)
        .mockResolvedValueOnce(mockJsonResponse(mockAssign, 201) as any);

      const g = await api.post<any>("/api/v1/app/groups", {
        name: "Alpha Squad",
        members: ["p1", "p2"],
      });
      expect(g.name).toBe("Alpha Squad");

      const a = await api.post<any>("/api/v1/app/groups/assign", {
        group_id: "grp-1",
        activity_type: "quiz",
        title: "Wiring Quiz",
      });
      expect(a.title).toBe("Wiring Quiz");
    });
  });

  describe("Pravachana Episodic Audio", () => {
    it("loads episodes, updates audio position, and adds notes", async () => {
      const mockCatalog = {
        ok: true,
        data: {
          episodes: [{ id: "ep-1", title_en: "Trade Safety Foundations", duration_sec: 600 }],
        },
      };
      const mockProgress = { ok: true, data: { position_sec: 120, completed: false } };
      const mockNote = { ok: true, data: { id: "n-1", body: "Important breaker rule" } };

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockJsonResponse(mockCatalog) as any)
        .mockResolvedValueOnce(mockJsonResponse(mockProgress) as any)
        .mockResolvedValueOnce(mockJsonResponse(mockNote) as any);

      const cat = await api.get<any>("/api/v1/app/pravachanas");
      expect(cat.episodes[0].id).toBe("ep-1");

      const prog = await api.post<any>("/api/v1/app/pravachanas/ep-1/progress", {
        position_sec: 120,
        duration_sec: 600,
        completed: false,
      });
      expect(prog.position_sec).toBe(120);

      const note = await api.post<any>("/api/v1/app/pravachanas/ep-1/notes", {
        body: "Important breaker rule",
      });
      expect(note.id).toBe("n-1");
    });
  });

  describe("AI Essay & Open-Response Grading", () => {
    it("evaluates student response against curriculum rubric", async () => {
      const mockGrading = {
        ok: true,
        data: {
          score: 9,
          max_score: 10,
          reasoning: "Comprehensive coverage of lockout procedures.",
          strengths: ["Clear safety sequence", "Correct multimeter step"],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockGrading) as any);

      const res = await api.post<any>("/api/v1/app/quiz/essay-grade", {
        prompt: "Describe LOTO procedure",
        student_answer: "Isolate breaker and apply lock and tag.",
        rubric: "Strict safety adherence",
        max_score: 10,
      });

      expect(res.score).toBe(9);
      expect(res.strengths).toHaveLength(2);
    });
  });

  describe("School Admin & Operator Console Integration", () => {
    it("fetches school overview snapshot figures", async () => {
      const mockOverview = {
        ok: true,
        data: {
          institution: { name: "Govt ITI Hyderabad", code: "ITI-HYD" },
          figures: { learnersLaunched: 42, quizAttempts: 156 },
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockOverview) as any);

      const res = await api.get<any>("/api/v1/app/school-admin/overview");
      expect(res.institution.name).toBe("Govt ITI Hyderabad");
      expect(res.figures.quizAttempts).toBe(156);
    });

    it("registers new class section in school administration", async () => {
      const mockClass = {
        ok: true,
        data: {
          class: { class_code: "ELE-C", class_name: "Electrician Batch C" },
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockClass, 201) as any);

      const res = await api.post<any>("/api/v1/app/classes", {
        class_code: "ELE-C",
        class_name: "Electrician Batch C",
      });

      expect(res.class.class_code).toBe("ELE-C");
    });

    it("triggers operator LRS telemetry retry", async () => {
      const mockRetry = { ok: true, data: { status: "queued", statements_requeued: 4 } };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockRetry) as any);

      const res = await api.post<any>("/api/v1/ops/retry-lrs");
      expect(res.status).toBe("queued");
    });

    it("fetches sellable blocks catalog from admin API", async () => {
      const mockBlocks = {
        ok: true,
        data: {
          blocks: [{ id: "xr-suite", name: "Spatial Training" }],
          presets: ["vocational_standard"],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockBlocks) as any);

      const res = await api.get<any>("/admin/blocks");
      expect(res.blocks).toHaveLength(1);
      expect(res.presets).toContain("vocational_standard");
    });

    it("provisions new tenant realm through admin API", async () => {
      const mockCreated = {
        ok: true,
        data: {
          id: "tenant-new",
          slug: "poly-technic",
          name: "Polytechnic Institute",
          segment: "polytechnic",
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        mockJsonResponse(mockCreated, 201) as any,
      );

      const res = await api.post<any>("/admin/tenants", {
        slug: "poly-technic",
        name: "Polytechnic Institute",
        segment: "polytechnic",
      });
      expect(res.slug).toBe("poly-technic");
      expect(res.segment).toBe("polytechnic");
    });
  });

  describe("Micro-learning, Test Bank Review, External Grades & Assignments Integration", () => {
    it("records micro-learning card viewed xAPI statement", async () => {
      const mockView = { ok: true, data: { recorded: true } };

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(mockJsonResponse(mockView) as any);

      const res = await api.post<any>("/api/v1/app/micro/viewed", {
        skill_id: "reel-transformer-01",
        title: "Transformer Voltage Step-Down",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/v1/app/micro/viewed",
        expect.objectContaining({ method: "POST" }),
      );
      expect(res.recorded).toBe(true);
    });

    it("fetches department-level pravachana engagement stats", async () => {
      const mockStats = {
        ok: true,
        data: { episodes: 14, watches: 120, completed: 88, notes_count: 35 },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockStats) as any);

      const res = await api.get<any>("/api/v1/app/pravachanas/stats");
      expect(res.episodes).toBe(14);
      expect(res.completed).toBe(88);
    });

    it("submits test bank review with live quiz promotion", async () => {
      const mockReview = {
        ok: true,
        data: { updated_count: 5, promoted_count: 5 },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockReview) as any);

      const res = await api.post<any>("/api/v1/app/quiz/bank/review", {
        batch_id: "batch-101",
        item_ids: ["item-1", "item-2", "item-3"],
        status: "approved",
        promote: true,
      });

      expect(res.updated_count).toBe(5);
      expect(res.promoted_count).toBe(5);
    });

    it("ingests external assessment grade via LTI bridge", async () => {
      const mockGrade = {
        ok: true,
        data: { recorded: true, grade_id: "gr-99" },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockGrade) as any);

      const res = await api.post<any>("/api/v1/app/grades", {
        subject: "user-iti-12",
        score: 92,
        max_score: 100,
        learner_name: "Pooja Hegde",
        activity_id: "circuit-wiring-exam",
        source: "moodle-workshop",
      });

      expect(res.recorded).toBe(true);
      expect(res.grade_id).toBe("gr-99");
    });

    it("loads curriculum assignments dashboard", async () => {
      const mockAssignments = {
        ok: true,
        data: {
          assignments: [
            { id: "as-1", title: "Wiring Inspection Lab", status: "submitted", score: 85 },
          ],
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockJsonResponse(mockAssignments) as any);

      const res = await api.get<any>("/api/v1/app/assignments");
      expect(res.assignments).toHaveLength(1);
      expect(res.assignments[0].title).toBe("Wiring Inspection Lab");
    });
  });
});
