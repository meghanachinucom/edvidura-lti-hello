/** TC-05 editions per eBook (ids match ebooks.ts). Dates are UTC ISO. */
export interface ManualVersion {
  n: number;
  date: string;
  note: string;
}
export interface ManualRecord {
  ebookId: string;
  status: "draft" | "published";
  versions: ManualVersion[];
}

export const manualRecords: ManualRecord[] = [
  {
    ebookId: "de7900fd-488b-4740-bf7e-7a11b3475cd6",
    status: "published",
    versions: [
      { n: 1, date: "2026-10-15T05:30:00Z", note: "Initial Class 8 curriculum edition with interactive concept checks." },
      { n: 2, date: "2026-11-01T06:00:00Z", note: "Added worked examples and multilingual voice narration support." },
    ],
  },
  {
    ebookId: "eb-physical-science",
    status: "published",
    versions: [
      { n: 1, date: "2026-10-20T05:30:00Z", note: "Comprehensive kinematics and forces edition with vector diagrams." },
    ],
  },
  {
    ebookId: "eb-railways-safety",
    status: "published",
    versions: [
      { n: 1, date: "2026-11-01T05:30:00Z", note: "Vocational safety manual featuring USFD and Kavach ATP protocols." },
    ],
  },
  {
    ebookId: "eb-digital-cybersecurity",
    status: "published",
    versions: [
      { n: 1, date: "2026-11-05T05:30:00Z", note: "Digital literacy, AI transformers, and DPDP cybersecurity fundamentals." },
    ],
  },
  {
    ebookId: "eb-niti-ethics",
    status: "published",
    versions: [
      { n: 1, date: "2026-11-10T05:30:00Z", note: "Character and ethics companion with 11 Indian language reflections." },
    ],
  },
];
