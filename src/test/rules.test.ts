import { describe, expect, it } from "vitest";
import { groupsForRole } from "@/data/nav";
import { formatIST } from "@/lib/time";

describe("role menus", () => {
  it("Training Officer never sees Learn or Teach", () => expect(groupsForRole.trainingOfficer).toEqual(["institute"]));
  it("Learner sees only Learn", () => expect(groupsForRole.learner).toEqual(["learn"]));
  it("Instructor sees Teach only", () => expect(groupsForRole.instructor).toEqual(["teach"]));
});

describe("IST formatting", () => {
  it("same day shows Today", () =>
    expect(formatIST("2026-10-23T05:12:00Z", new Date("2026-10-23T08:00:00Z"))).toBe("Today, 10:42 IST"));
  it("previous day shows Yesterday", () =>
    expect(formatIST("2026-10-22T12:35:00Z", new Date("2026-10-23T08:00:00Z"))).toBe("Yesterday, 18:05 IST"));
  it("other day shows date", () =>
    expect(formatIST("2026-10-21T10:35:00Z", new Date("2026-10-23T08:00:00Z"))).toBe("21 Oct, 16:05 IST"));
});
