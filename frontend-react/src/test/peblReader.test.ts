import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { api } from "@/lib/api";
import { setBearerToken, RoleProvider } from "@/components/shell/RoleContext";
import { EbookReader } from "@/components/learner/EbookReader";
import type { Ebook } from "@/data/ebooks";
import type { Chapter } from "@/data/ebookContent";
import {
  adaptEbook,
  adaptChapters,
  type BackendManualItem,
  type BackendChapterItem,
  type BackendManualDetail,
} from "@/lib/adapters";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", null, children),
}));

class MockUtterance {
  lang = "";
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

interface RecordedEvent {
  event_type: string;
  version?: number | undefined;
  chapter_index?: number | undefined;
  chapter_title?: string | undefined;
}

interface BookmarkPayload {
  chapter_index?: number | undefined;
  title?: string | undefined;
  version?: number | undefined;
}

function mockJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(data),
  };
}

describe("Phase 7: PeBL eBook Reader, Audio Integration and xAPI Tracking", () => {
  const speakMock = vi.fn();
  const cancelMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    setBearerToken("valid-learner-bearer-token");
    speakMock.mockClear();
    cancelMock.mockClear();
    vi.stubGlobal("speechSynthesis", {
      speak: speakMock,
      cancel: cancelMock,
    });
    vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
  });

  afterEach(() => {
    cleanup();
    setBearerToken(null);
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("adapts backend manual item with reading progress correctly", () => {
    const rawManual: BackendManualItem = {
      id: "man-iti-elec-1",
      slug: "electrician-theory-sem1",
      title: "Electrician Theory Semester 1",
      total_pages: 120,
      progress_percent: 50,
      status: "published",
    };

    const adapted = adaptEbook(rawManual);
    expect(adapted.id).toBe("man-iti-elec-1");
    expect(adapted.title).toBe("Electrician Theory Semester 1");
    expect(adapted.pages).toBe(120);
    expect(adapted.currentPage).toBe(60); // 50% of 120
    expect(adapted.cover).toBe("accent");
  });

  it("adapts structured backend chapter sections accurately", () => {
    const rawChapters: BackendChapterItem[] = [
      {
        id: "sec-1",
        index: 0,
        slug: "safety-rules",
        title: "Workshop Safety Regulations",
        startPage: 1,
        paragraphs: ["Follow basic safety protocols.", "Wear safety boots and goggles."],
      },
      {
        id: "sec-2",
        index: 1,
        slug: "hand-tools",
        title: "Hand Tools & Wire Stripping",
        startPage: 15,
        paragraphs: ["Use insulated pliers for live circuits."],
      },
    ];

    const chapters = adaptChapters("man-iti-elec-1", rawChapters);
    expect(chapters).toHaveLength(2);
    const ch0 = chapters[0];
    const ch1 = chapters[1];
    expect(ch0?.id).toBe("sec-1");
    expect(ch0?.title).toBe("Workshop Safety Regulations");
    expect(ch0?.startPage).toBe(1);
    expect(ch0?.paragraphs).toHaveLength(2);
    expect(ch1?.title).toBe("Hand Tools & Wire Stripping");
    expect(ch1?.startPage).toBe(15);
  });

  it("fetches assigned manuals catalogue from backend API", async () => {
    const mockCatalogue = {
      manuals: [
        {
          id: "man-1",
          slug: "basic-electrical",
          title: "Basic Electrical Workshop",
          total_pages: 50,
          progress_percent: 20,
        },
      ],
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(mockCatalogue)));

    const res = await api.get<{ manuals: BackendManualItem[] }>("/api/v1/app/manuals");
    expect(res.manuals).toHaveLength(1);
    expect(res.manuals[0]?.title).toBe("Basic Electrical Workshop");

    const ebooks = res.manuals.map(adaptEbook);
    expect(ebooks[0]?.currentPage).toBe(10);
  });

  it("handles empty manual catalogue for unassigned classes cleanly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse({ manuals: [] })));

    const res = await api.get<{ manuals: BackendManualItem[] }>("/api/v1/app/manuals");
    expect(res.manuals).toEqual([]);
    const ebooks = res.manuals.map(adaptEbook);
    expect(ebooks).toHaveLength(0);
  });

  it("fetches manual detail with reading progress and bookmarks", async () => {
    const detailPayload: BackendManualDetail = {
      manual: {
        id: "man-1",
        slug: "electrician-theory",
        title: "Electrician Theory",
        total_pages: 80,
      },
      chapters: [
        {
          id: "ch-1",
          index: 0,
          slug: "ch-1",
          title: "Chapter 1: Safety",
          startPage: 1,
          paragraphs: ["Safety first."],
        },
      ],
      reading_progress: {
        manual_id: "man-1",
        version: 1,
        chapter_index: 0,
        current_page: 5,
        progress_percent: 25,
      },
      bookmarks: [
        {
          id: "bm-101",
          chapter_index: 0,
          title: "Safety Section Bookmark",
        },
      ],
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(detailPayload)));

    const data = await api.get<BackendManualDetail>("/api/v1/app/manuals/man-1");
    expect(data.manual.id).toBe("man-1");
    expect(data.chapters).toHaveLength(1);
    expect(data.reading_progress?.progress_percent).toBe(25);
    expect(data.bookmarks).toHaveLength(1);
    expect(data.bookmarks?.[0]?.title).toBe("Safety Section Bookmark");
  });

  it("persists reading progress to backend on chapter change", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url, init) => {
        capturedBody = JSON.parse(init?.body as string) as Record<string, unknown>;
        return mockJsonResponse({
          ok: true,
          progress: {
            manual_id: "man-1",
            version: 1,
            chapter_index: 2,
            progress_percent: 60,
          },
        });
      }),
    );

    const res = await api.post<{ ok: boolean }>("/api/v1/app/manuals/man-1/progress", {
      version: 1,
      chapter_index: 2,
      progress_percent: 60,
    });

    expect(capturedBody).toEqual({
      version: 1,
      chapter_index: 2,
      progress_percent: 60,
    });
    expect(res.ok).toBe(true);
  });

  it("creates and deletes bookmarks via API", async () => {
    let callCount = 0;
    const createBody: BookmarkPayload = {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url, init) => {
        callCount++;
        if (callCount === 1) {
          const parsed = JSON.parse(init?.body as string) as BookmarkPayload;
          createBody.chapter_index = parsed.chapter_index;
          createBody.title = parsed.title;
          return mockJsonResponse(
            {
              ok: true,
              bookmark: {
                id: "201",
                manual_id: "man-1",
                chapter_index: 1,
                title: "Tools Overview",
              },
            },
            201,
          );
        }
        return mockJsonResponse({ ok: true });
      }),
    );

    // 1. Create Bookmark
    const created = await api.post<{ ok: boolean; bookmark: { id: string } }>(
      "/api/v1/app/manuals/man-1/bookmarks",
      {
        version: 1,
        chapter_index: 1,
        title: "Tools Overview",
      },
    );

    expect(createBody.chapter_index).toBe(1);
    expect(createBody.title).toBe("Tools Overview");
    expect(created.bookmark.id).toBe("201");

    // 2. Delete Bookmark
    const deleted = await api.delete<{ ok: boolean }>(
      `/api/v1/app/manuals/man-1/bookmarks/${created.bookmark.id}`,
    );
    expect(deleted.ok).toBe(true);
  });

  it("records audio narration and reading telemetry xAPI milestone events", async () => {
    const postedEvents: RecordedEvent[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_url, init) => {
        if (init?.body) {
          postedEvents.push(JSON.parse(init.body as string) as RecordedEvent);
        }
        return mockJsonResponse({ ok: true, statement_id: "stmt-12345" });
      }),
    );

    // ebook_initialized
    await api.post("/api/v1/app/manuals/man-1/events", {
      event_type: "ebook_initialized",
      version: 1,
    });

    // audio_started
    await api.post("/api/v1/app/manuals/man-1/events", {
      event_type: "audio_started",
      version: 1,
      chapter_index: 0,
      chapter_title: "Chapter 1: Safety",
    });

    // audio_completed
    await api.post("/api/v1/app/manuals/man-1/events", {
      event_type: "audio_completed",
      version: 1,
      chapter_index: 0,
      chapter_title: "Chapter 1: Safety",
    });

    // chapter_experienced
    await api.post("/api/v1/app/manuals/man-1/events", {
      event_type: "chapter_experienced",
      version: 1,
      chapter_index: 1,
      chapter_title: "Chapter 2: Hand Tools",
    });

    expect(postedEvents).toHaveLength(4);
    expect(postedEvents[0]?.event_type).toBe("ebook_initialized");
    expect(postedEvents[1]?.event_type).toBe("audio_started");
    expect(postedEvents[2]?.event_type).toBe("audio_completed");
    expect(postedEvents[3]?.event_type).toBe("chapter_experienced");
    expect(postedEvents[3]?.chapter_index).toBe(1);
  });

  describe("Audio Narration & xAPI Telemetry Regression Suite", () => {
    const sampleBook: Ebook = {
      id: "eb-audio-test",
      title: "Electrical Workshop Safety",
      description: "Audio test book",
      pages: 40,
      currentPage: 1,
      cover: "accent",
      category: "vocational",
    };

    const sampleChapters: Chapter[] = [
      {
        id: "ch-101",
        title: "Chapter 1: General Safety",
        startPage: 1,
        paragraphs: ["Wear safety glasses and protective boots."],
      },
      {
        id: "ch-102",
        title: "Chapter 2: Isolation Procedures",
        startPage: 11,
        paragraphs: ["Always lock out and tag out equipment."],
      },
    ];

    async function mountReader() {
      const view = render(
        React.createElement(
          RoleProvider,
          null,
          React.createElement(EbookReader, {
            book: sampleBook,
            initialChapters: sampleChapters,
          }),
        ),
      );
      await act(async () => {
        vi.advanceTimersByTime(700);
      });
      return view;
    }

    it("natural narration completion records exactly one audio_completed event", async () => {
      const recordedEvents: RecordedEvent[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (_url, init) => {
          if (init?.body) {
            recordedEvents.push(JSON.parse(init.body as string) as RecordedEvent);
          }
          return mockJsonResponse({ ok: true });
        }),
      );

      await mountReader();
      const listenBtn = screen.getByRole("button", { name: "Listen" });
      fireEvent.click(listenBtn);

      expect(speakMock).toHaveBeenCalledTimes(1);
      const startedEvents = recordedEvents.filter((e) => e.event_type === "audio_started");
      expect(startedEvents).toHaveLength(1);

      // Trigger natural completion
      const activeUtterance = speakMock.mock.calls[0]?.[0] as MockUtterance;
      act(() => {
        activeUtterance.onend?.();
      });

      const completedEvents = recordedEvents.filter((e) => e.event_type === "audio_completed");
      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0]?.chapter_title).toBe("Chapter 1: General Safety");
      expect(screen.getByRole("button", { name: "Listen" })).toBeEnabled();
    });

    it("manual stop cancels playback and does NOT record audio_completed", async () => {
      const recordedEvents: RecordedEvent[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (_url, init) => {
          if (init?.body) {
            recordedEvents.push(JSON.parse(init.body as string) as RecordedEvent);
          }
          return mockJsonResponse({ ok: true });
        }),
      );

      await mountReader();
      fireEvent.click(screen.getByRole("button", { name: "Listen" }));
      expect(speakMock).toHaveBeenCalledTimes(1);

      // Click Stop to cancel playback
      const stopBtn = screen.getByRole("button", { name: "Stop" });
      fireEvent.click(stopBtn);

      expect(cancelMock).toHaveBeenCalledTimes(1);
      const completedEvents = recordedEvents.filter((e) => e.event_type === "audio_completed");
      expect(completedEvents).toHaveLength(0);
      expect(screen.getByRole("button", { name: "Listen" })).toBeEnabled();
    });

    it("chapter navigation cancels playback without recording completion", async () => {
      const recordedEvents: RecordedEvent[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (_url, init) => {
          if (init?.body) {
            recordedEvents.push(JSON.parse(init.body as string) as RecordedEvent);
          }
          return mockJsonResponse({ ok: true });
        }),
      );

      await mountReader();
      fireEvent.click(screen.getByRole("button", { name: "Listen" }));
      expect(speakMock).toHaveBeenCalledTimes(1);

      // Navigate to next chapter
      const nextBtn = screen.getByRole("button", { name: "Next chapter" });
      fireEvent.click(nextBtn);

      expect(cancelMock).toHaveBeenCalledTimes(1);
      const completedEvents = recordedEvents.filter((e) => e.event_type === "audio_completed");
      expect(completedEvents).toHaveLength(0);
    });

    it("component unmount cancels playback without recording completion", async () => {
      const recordedEvents: RecordedEvent[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (_url, init) => {
          if (init?.body) {
            recordedEvents.push(JSON.parse(init.body as string) as RecordedEvent);
          }
          return mockJsonResponse({ ok: true });
        }),
      );

      const view = await mountReader();
      fireEvent.click(screen.getByRole("button", { name: "Listen" }));
      expect(speakMock).toHaveBeenCalledTimes(1);

      // Unmount the component
      view.unmount();

      expect(cancelMock).toHaveBeenCalledTimes(1);
      const completedEvents = recordedEvents.filter((e) => e.event_type === "audio_completed");
      expect(completedEvents).toHaveLength(0);
    });

    it("repeated onend callbacks do not generate duplicate completion events", async () => {
      const recordedEvents: RecordedEvent[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (_url, init) => {
          if (init?.body) {
            recordedEvents.push(JSON.parse(init.body as string) as RecordedEvent);
          }
          return mockJsonResponse({ ok: true });
        }),
      );

      await mountReader();
      fireEvent.click(screen.getByRole("button", { name: "Listen" }));
      const activeUtterance = speakMock.mock.calls[0]?.[0] as MockUtterance;

      // First onend
      act(() => {
        activeUtterance.onend?.();
      });

      // Second redundant onend (simulating buggy browser behavior)
      act(() => {
        activeUtterance.onend?.();
      });

      const completedEvents = recordedEvents.filter((e) => e.event_type === "audio_completed");
      expect(completedEvents).toHaveLength(1);
    });
  });
});
