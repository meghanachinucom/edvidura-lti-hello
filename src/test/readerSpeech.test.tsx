import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EbookReader } from "@/components/learner/EbookReader";
import { ebooks } from "@/data/ebooks";
import { ebookChapters } from "@/data/ebookContent";

vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
const speak = vi.fn();
const cancel = vi.fn();
class MockUtterance {
  lang = "";
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}
beforeEach(() => {
  vi.useFakeTimers(); speak.mockClear(); cancel.mockClear();
  vi.stubGlobal("speechSynthesis", { speak, cancel });
  vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function reader() {
  const book = ebooks.find((item) => item.id === "eb-wiring");
  if (!book) throw new Error("Missing wiring mock");
  const view = render(<EbookReader book={book} />);
  await act(async () => { vi.advanceTimersByTime(700); });
  return view;
}
it("reads the resumed chapter and Stop cancels it", async () => {
  await reader();
  fireEvent.click(screen.getByRole("button", { name: "Listen" }));
  const chapter = ebookChapters["eb-wiring"]?.[1];
  expect(chapter).toBeDefined();
  expect(speak.mock.calls[0]?.[0].text).toBe([chapter?.title, ...(chapter?.paragraphs ?? [])].join("\n\n"));
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Listen" })).toBeEnabled();
});
it("cancels on chapter change and unmount, ignoring stale completion", async () => {
  const view = await reader();
  fireEvent.click(screen.getByRole("button", { name: "Listen" }));
  const oldEnd = speak.mock.calls[0]?.[0].onend;
  fireEvent.click(screen.getByRole("button", { name: "Next chapter" }));
  expect(cancel).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Listen" }));
  act(() => { oldEnd?.(); });
  expect(screen.getByRole("button", { name: "Stop" })).toBeEnabled();
  view.unmount(); expect(cancel).toHaveBeenCalledTimes(2);
});
it("returns to Listen when the utterance finishes", async () => {
  await reader(); fireEvent.click(screen.getByRole("button", { name: "Listen" }));
  act(() => { speak.mock.calls[0]?.[0].onend?.(); });
  expect(screen.getByRole("button", { name: "Listen" })).toBeEnabled();
});
it("disables listening when the browser has no speech API", async () => {
  Reflect.deleteProperty(window, "speechSynthesis");
  await reader();
  expect(screen.getByRole("button", { name: "Listen" })).toBeDisabled();
  expect(speak).not.toHaveBeenCalled();
});