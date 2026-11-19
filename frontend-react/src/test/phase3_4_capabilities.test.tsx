import { describe, expect, it } from "vitest";
import { ebooks } from "@/data/ebooks";
import { ebookChapters } from "@/data/ebookContent";
import { SUPPORTED_LOCALES, getLocaleBcp47, setLocale, getLocale, t } from "@/i18n";

describe("Phase 2, 3 & 4 Architectural & Open-Source AI Capabilities", () => {
  it("provides 5 complete multi-chapter interactive demo textbooks", () => {
    expect(ebooks.length).toBeGreaterThanOrEqual(5);

    // Book 1: Algebra I
    const b1 = ebooks.find((b) => b.slug === "algebra-i-foundations");
    expect(b1).toBeDefined();
    expect(b1?.title).toContain("Algebra I");
    expect(ebookChapters[b1!.id]?.length).toBe(4);

    // Book 2: Physical Science
    const b2 = ebooks.find((b) => b.slug === "physical-science-motion");
    expect(b2).toBeDefined();
    expect(b2?.title).toContain("Physical Science");
    expect(ebookChapters[b2!.id]?.length).toBe(4);

    // Book 3: Indian Railways Track Maintenance
    const b3 = ebooks.find((b) => b.slug === "railways-safety-manual");
    expect(b3).toBeDefined();
    expect(b3?.title).toContain("Indian Railways");
    expect(ebookChapters[b3!.id]?.length).toBe(4);

    // Book 4: Digital Literacy & Cybersecurity
    const b4 = ebooks.find((b) => b.slug === "digital-ai-cybersecurity");
    expect(b4).toBeDefined();
    expect(b4?.title).toContain("Digital Literacy");
    expect(ebookChapters[b4!.id]?.length).toBe(4);

    // Book 5: Niti & Life Values
    const b5 = ebooks.find((b) => b.slug === "niti-ethics-companion");
    expect(b5).toBeDefined();
    expect(b5?.title).toContain("Niti & Life Values");
    expect(ebookChapters[b5!.id]?.length).toBe(4);
  });

  it("embeds PaperMorph interactive concept checks and diagrams in textbook chapters", () => {
    const algChapters = ebookChapters["de7900fd-488b-4740-bf7e-7a11b3475cd6"];
    expect(algChapters).toBeDefined();
    for (const ch of algChapters!) {
      expect(ch.diagramTitle).toBeDefined();
      expect(ch.conceptCheck).toBeDefined();
      expect(ch.conceptCheck!.options.length).toBe(4);
      expect(ch.conceptCheck!.explanation).toBeTruthy();
    }
  });

  it("supports 11 Indian languages plus English in i18n", () => {
    expect(SUPPORTED_LOCALES.length).toBe(12);

    const codes = SUPPORTED_LOCALES.map((l) => l.code);
    expect(codes).toContain("en");
    expect(codes).toContain("hi"); // Hindi
    expect(codes).toContain("te"); // Telugu
    expect(codes).toContain("ta"); // Tamil
    expect(codes).toContain("kn"); // Kannada
    expect(codes).toContain("ml"); // Malayalam
    expect(codes).toContain("mr"); // Marathi
    expect(codes).toContain("bn"); // Bengali
    expect(codes).toContain("gu"); // Gujarati
    expect(codes).toContain("pa"); // Punjabi
    expect(codes).toContain("or"); // Odia
    expect(codes).toContain("ur"); // Urdu

    expect(getLocaleBcp47("hi")).toBe("hi-IN");
    expect(getLocaleBcp47("te")).toBe("te-IN");
    expect(getLocaleBcp47("ta")).toBe("ta-IN");
    expect(getLocaleBcp47("kn")).toBe("kn-IN");
  });

  it("updates and persists session locale correctly", () => {
    setLocale("hi");
    expect(getLocale()).toBe("hi");
    expect(t("roles.learner")).toBe("शिक्षार्थी");

    setLocale("te");
    expect(getLocale()).toBe("te");
    expect(t("roles.learner")).toBe("విద్యార్థి");

    setLocale("en");
    expect(getLocale()).toBe("en");
  });
});
