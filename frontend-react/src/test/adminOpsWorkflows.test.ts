import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { setBearerToken } from "@/components/shell/RoleContext";
import { adaptSchoolOverview, adaptOpsOverview, type BackendSchoolOverview } from "@/lib/adapters";

function mockJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(data),
  };
}

describe("Phase 9: School Admin & Operator Workflows", () => {
  beforeEach(() => {
    setBearerToken("test-staff-token");
    sessionStorage.clear();
  });

  describe("School Admin Overview and Statistics", () => {
    it("adapts backend school overview data into UI detail model", () => {
      const rawOverview: BackendSchoolOverview = {
        institution: {
          id: "inst-101",
          name: "Government Industrial Training Institute",
          code: "GITI-01",
          course_name: "Electrical & Solar Tech",
        },
        snapshot: {
          student_count: 45,
          teacher_count: 4,
          class_count: 2,
          admin_count: 2,
        },
        figures: {
          learners: 45,
          attempts: 120,
          activeClasses: 2,
          faculty: 4,
        },
        classes: [
          { id: "c1", code: "ELE-A", name: "Section A" },
          { id: "c2", code: "ELE-B", name: "Section B" },
        ],
      };

      const adapted = adaptSchoolOverview(rawOverview);

      expect(adapted.id).toBe("inst-101");
      expect(adapted.name).toBe("Government Industrial Training Institute");
      expect(adapted.code).toBe("GITI-01");
      expect(adapted.course).toBe("Electrical & Solar Tech");
      expect(adapted.learnersRecorded).toBe(45);
      expect(adapted.inMoodle).toBe(45);
      expect(adapted.schoolAdmins).toBe(2);
      expect(adapted.teachersCount).toBe(4);
      expect(adapted.classesCount).toBe(2);
      expect(adapted.attemptsCount).toBe(120);
      expect(adapted.classes).toHaveLength(2);
      expect(adapted.classes[0]?.code).toBe("ELE-A");
    });

    it("fetches school overview endpoint with staff credentials", async () => {
      const mockOverview = {
        ok: true,
        data: {
          institution: {
            id: "inst-01",
            code: "ITI-HYD",
            name: "Hyderabad Vocational Institute",
          },
          snapshot: {
            student_count: 50,
            teacher_count: 5,
            class_count: 3,
            admin_count: 1,
          },
          figures: {
            learners: 50,
            attempts: 75,
            activeClasses: 3,
            faculty: 5,
          },
          classes: [{ id: "c1", code: "ELE-A", name: "Electrician Year 1" }],
        },
      };

      vi.spyOn(globalThis, "fetch").mockImplementationOnce(() =>
        Promise.resolve(mockJsonResponse(mockOverview) as unknown as Response),
      );

      const res = await api.get<BackendSchoolOverview>("/api/v1/app/school-admin/overview");

      expect(res.institution?.name).toBe("Hyderabad Vocational Institute");
      expect(res.snapshot?.student_count).toBe(50);
      expect(res.figures?.attempts).toBe(75);
    });
  });

  describe("Faculty and Student Directory Endpoints", () => {
    it("fetches teachers list for the authenticated tenant", async () => {
      const mockTeachers = {
        ok: true,
        data: {
          teachers: [
            {
              id: "t-1",
              teacher_code: "TCH-001",
              name: "Suresh Iyer",
              email: "suresh@edvidura.edu",
            },
            {
              id: "t-2",
              teacher_code: "TCH-002",
              name: "Farhan Qureshi",
              email: "farhan@edvidura.edu",
            },
          ],
        },
      };

      vi.spyOn(globalThis, "fetch").mockImplementationOnce(() =>
        Promise.resolve(mockJsonResponse(mockTeachers) as unknown as Response),
      );

      const res = await api.get<{ teachers: Array<{ name: string; teacher_code: string }> }>(
        "/api/v1/app/teachers",
      );

      expect(res.teachers).toHaveLength(2);
      expect(res.teachers[0]?.name).toBe("Suresh Iyer");
      expect(res.teachers[1]?.teacher_code).toBe("TCH-002");
    });

    it("creates a new teacher record via POST /api/v1/app/teachers", async () => {
      const newTeacher = {
        ok: true,
        data: {
          teacher: {
            id: "t-3",
            teacher_code: "TCH-003",
            name: "Sunita Rao",
            email: "sunita@edvidura.edu",
          },
        },
      };

      vi.spyOn(globalThis, "fetch").mockImplementationOnce(() =>
        Promise.resolve(mockJsonResponse(newTeacher, 201) as unknown as Response),
      );

      const res = await api.post<{ teacher: { name: string; email: string } }>(
        "/api/v1/app/teachers",
        {
          teacher_code: "TCH-003",
          name: "Sunita Rao",
          email: "sunita@edvidura.edu",
        },
      );

      expect(res.teacher.name).toBe("Sunita Rao");
      expect(res.teacher.email).toBe("sunita@edvidura.edu");
    });

    it("fetches enrolled students list via GET /api/v1/app/students", async () => {
      const mockStudents = {
        ok: true,
        data: {
          students: [
            {
              id: "s-1",
              student_code: "LRN-001",
              name: "Meena Rathod",
              classes: ["ELE-A"],
            },
            {
              id: "s-2",
              student_code: "LRN-002",
              name: "Arjun Das",
              classes: ["ELE-A"],
            },
          ],
        },
      };

      vi.spyOn(globalThis, "fetch").mockImplementationOnce(() =>
        Promise.resolve(mockJsonResponse(mockStudents) as unknown as Response),
      );

      const res = await api.get<{ students: Array<{ name: string; student_code: string }> }>(
        "/api/v1/app/students",
      );

      expect(res.students).toHaveLength(2);
      expect(res.students[0]?.name).toBe("Meena Rathod");
    });
  });

  describe("Platform Operator Console & Actions", () => {
    it("handles operator authentication without writing raw key to sessionStorage or localStorage", async () => {
      const mockLoginResponse = {
        ok: true,
        data: {
          signed_in: true,
          mode: "admin_key",
        },
      };

      vi.spyOn(globalThis, "fetch").mockImplementationOnce(() =>
        Promise.resolve(mockJsonResponse(mockLoginResponse) as unknown as Response),
      );

      const secretKey = "super-secret-operator-key";
      const res = await api.post<{ signed_in: boolean }>("/api/v1/ops/login", {
        admin_key: secretKey,
      });

      expect(res.signed_in).toBe(true);
      // Verify raw key is NOT stored in sessionStorage or localStorage
      expect(sessionStorage.getItem("edvidura_admin_key")).toBeNull();
      expect(localStorage.getItem("edvidura_admin_key")).toBeNull();
    });

    it("fetches operator overview using cookie-based session without X-Admin-Key", async () => {
      const mockOverview = {
        ok: true,
        data: {
          tenants: [{ tenant_id: "t-1", name: "Campus 1", count: 10 }],
          institutions: [{ tenant_id: "t-1", name: "Campus 1", code: "C1" }],
          platforms: [],
        },
      };

      let capturedHeaders: HeadersInit | undefined = undefined;
      vi.spyOn(globalThis, "fetch").mockImplementationOnce((_url, init) => {
        capturedHeaders = init?.headers;
        return Promise.resolve(mockJsonResponse(mockOverview) as unknown as Response);
      });

      const res = await api.get<{ tenants: Array<{ name: string }> }>("/api/v1/ops/overview");
      expect(res.tenants).toHaveLength(1);

      // Verify X-Admin-Key header is NOT present
      const h = new Headers(capturedHeaders);
      expect(h.has("X-Admin-Key")).toBe(false);
    });

    it("adapts multi-tenant operator overview", () => {
      const rawOpsData = {
        tenants: [
          { tenant_id: "tenant-a", name: "Campus Alpha", count: 120 },
          { tenant_id: "tenant-b", name: "Campus Beta", count: 85 },
        ],
        institutions: [{ tenant_id: "tenant-a", name: "Campus Alpha ITI", code: "ALPHA-1" }],
        platforms: [{ platform_id: "plat-1", name: "Moodle LMS" }],
      };

      const adapted = adaptOpsOverview(rawOpsData);

      expect(adapted).toHaveLength(2);
      expect(adapted[0]?.name).toBe("Campus Alpha ITI");
      expect(adapted[0]?.learners).toBe(120);
      expect(adapted[0]?.connection).toBe("connected");
      expect(adapted[1]?.name).toBe("Campus Beta");
      expect(adapted[1]?.learners).toBe(85);
    });

    it("triggers LRS retry action via POST /api/v1/ops/retry-lrs", async () => {
      const mockRetryResponse = {
        ok: true,
        data: {
          retried: 5,
          sent: 5,
        },
      };

      vi.spyOn(globalThis, "fetch").mockImplementationOnce(() =>
        Promise.resolve(mockJsonResponse(mockRetryResponse) as unknown as Response),
      );

      const res = await api.post<{ retried: number; sent: number }>(
        "/api/v1/ops/retry-lrs",
        { tenant_id: "tenant-a" },
        { headers: { "X-Admin-Key": "valid-key" } },
      );

      expect(res.retried).toBe(5);
      expect(res.sent).toBe(5);
    });
  });
});
