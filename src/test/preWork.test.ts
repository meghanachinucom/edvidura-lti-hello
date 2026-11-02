import { describe, expect, it } from "vitest";
import { lotoSteps, transitionRoles, updateLotoSteps } from "@/data/preWork";
import { questionFailRates, skillGaps } from "@/data/teacherInsights";

describe("LOTO sequence", () => {
  it("requires supply, lock, tag and test in that order", () => {
    expect(lotoSteps).toEqual(["supply", "lock", "tag", "test"]);
    expect(updateLotoSteps([false, false, false, false], 2, true)).toEqual([false, false, false, false]);
    expect(updateLotoSteps([true, false, false, false], 3, true)).toEqual([true, false, false, false]);
  });
  it("becomes ready only after all four steps", () => {
    let checked = [false, false, false, false];
    for (let i = 0; i < 4; i++) {
      checked = updateLotoSteps(checked, i, true);
      expect(checked.every(Boolean)).toBe(i === 3);
    }
    expect(checked).toEqual([true, true, true, true]);
  });
  it("resets later steps when an earlier check is removed", () => {
    expect(updateLotoSteps([true, true, true, true], 1, false)).toEqual([true, false, false, false]);
  });
});

it.each(transitionRoles)("$id has 2/4 held skills, 2/4 gap skills and 50% saved", (role) => {
  expect([role.held, role.gap, role.total, role.savedPercent]).toEqual([2, 2, 4, 50]);
});

it("links every radar question to a counted skill", () => {
  expect(questionFailRates).toHaveLength(5);
  for (const question of questionFailRates) expect(skillGaps.some((skill) => skill.code === question.skillCode)).toBe(true);
});