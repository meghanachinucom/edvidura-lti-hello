import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateCircuit, circuitSettings } from "@/data/circuit";
import { confidenceCounts } from "@/data/flashcards";
import { explanationFor } from "@/data/readerExplanations";
import { CircuitWorkbench } from "@/components/learner/CircuitWorkbench";
import { CoachStarterChips } from "@/components/shared/CoachStarterChips";
import { coachShortcuts } from "@/data/coach";

afterEach(cleanup);
describe("circuit workbench rules", () => {
  it("limits voltage to 110–415 V and resistance to 10–200 ohms, in steps of 1", () => {
    expect(circuitSettings.voltage).toMatchObject({ min: 110, max: 415, step: 1 });
    expect(circuitSettings.resistance).toMatchObject({ min: 10, max: 200, step: 1 });
  });
  it("calculates I = V/R and P = V*I", () => {
    expect(calculateCircuit(230, 23, true)).toEqual({ current: 10, power: 2300, fault: null });
    expect(calculateCircuit(110, 200, true).current.toFixed(2)).toBe("0.55");
  });
  it("trips at 17 A, not at the 16 A boundary", () => {
    expect(calculateCircuit(170, 10, true).fault).toBe("overcurrent");
    expect(calculateCircuit(160, 10, true).fault).toBeNull();
  });
  it("trips when earthing is disconnected, even below 16 A", () => {
    expect(calculateCircuit(110, 200, false).fault).toBe("earth");
  });
  it("updates live and latches a trip until a safe reset", () => {
    render(<CircuitWorkbench />);
    expect(screen.getByRole("switch")).toBeChecked();
    fireEvent.change(screen.getByRole("slider", { name: /Resistance/ }), { target: { value: 10 } });
    expect(screen.getByRole("alert")).toHaveTextContent("Current above 16 A");
    expect(screen.getByRole("button", { name: "Reset breaker" })).toBeDisabled();
    fireEvent.change(screen.getByRole("slider", { name: /Resistance/ }), { target: { value: 23 } });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset breaker" }));
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("alert")).toHaveTextContent("Earthing disconnected");
  });
});
it("chips fill only existing shortcut prompts", () => {
  const select = vi.fn();
  render(<CoachStarterChips onSelect={select} />);
  expect(screen.getAllByRole("button")).toHaveLength(coachShortcuts.length);
  coachShortcuts.forEach((shortcut) => {
    fireEvent.click(screen.getByRole("button", { name: shortcut.label }));
    expect(select).toHaveBeenLastCalledWith(shortcut.prompt);
  });
});
it("counts one confidence choice per card and moves a changed choice", () => {
  const choices = { "fc-1": "practice", "fc-2": "mastered" } as const;
  expect(confidenceCounts(choices)).toEqual({ practice: 1, mastered: 1 });
  expect(confidenceCounts({ ...choices, "fc-1": "mastered" })).toEqual({ practice: 0, mastered: 2 });
});
it("uses topic mocks only when the selected passage matches", () => {
  expect(explanationFor("Each circuit has its own MCB.")).toBe("pass3.explanations.breaker");
  expect(explanationFor("Read each part slowly.")).toBeNull();
});