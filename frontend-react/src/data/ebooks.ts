export type CoverTone = "accent" | "ink" | "focus" | "emerald" | "amber";
export type EbookCategory = "vocational" | "life" | "physical" | "maths" | "cs";

export interface Ebook {
  id: string;
  slug: string;
  title: string;
  description: string;
  pages: number;
  currentPage: number | null;
  cover: CoverTone;
  category: EbookCategory;
  author: string;
  subjectCode: string;
  classLevel: string;
  chaptersCount: number;
  hasAudiobook: boolean;
  hasInteractiveChecks: boolean;
  publishedDate: string;
}

/** 5 Complete Multi-Chapter Interactive Demo Textbooks */
export const ebooks: Ebook[] = [
  {
    id: "de7900fd-488b-4740-bf7e-7a11b3475cd6",
    slug: "algebra-i-foundations",
    title: "Algebra I: Foundations, Variables & Linear Equations Handbook",
    description: "Foundational algebraic reasoning, single and multi-step linear equations, inequalities, and Cartesian graphing for Class 8.",
    pages: 64,
    currentPage: 1,
    cover: "accent",
    category: "maths",
    author: "Prof. Priya Sharma · EdVidura Dept. of Mathematics",
    subjectCode: "MATH-08",
    classLevel: "Class 8 (RHS-C08)",
    chaptersCount: 4,
    hasAudiobook: true,
    hasInteractiveChecks: true,
    publishedDate: "2026-10-15",
  },
  {
    id: "eb-physical-science",
    slug: "physical-science-motion",
    title: "Physical Science: Motion, Forces & Energy Interactive Textbook",
    description: "Kinematics, Newton's three laws of motion, work-energy transformations, and momentum conservation with interactive formula checks.",
    pages: 72,
    currentPage: 1,
    cover: "focus",
    category: "physical",
    author: "Dr. K. Ramanathan · National Science Academy",
    subjectCode: "SCI-08",
    classLevel: "Class 8 (RHS-C08)",
    chaptersCount: 4,
    hasAudiobook: true,
    hasInteractiveChecks: true,
    publishedDate: "2026-10-20",
  },
  {
    id: "eb-railways-safety",
    slug: "railways-safety-manual",
    title: "Indian Railways Track Maintenance & Signalling Safety Manual",
    description: "Permanent way engineering, ultrasonic flaw detection, electronic interlocking, Kavach ATP systems, and field trackside safety protocols.",
    pages: 88,
    currentPage: 1,
    cover: "amber",
    category: "vocational",
    author: "Chief Track Engineer V. N. Murthy · Railway Training Institute",
    subjectCode: "VOC-RLY",
    classLevel: "Technical & Vocational Training",
    chaptersCount: 4,
    hasAudiobook: true,
    hasInteractiveChecks: true,
    publishedDate: "2026-11-01",
  },
  {
    id: "eb-digital-cybersecurity",
    slug: "digital-ai-cybersecurity",
    title: "Digital Literacy, AI & Cybersecurity Foundations",
    description: "Computer architecture, modern artificial intelligence models, cybersecurity defense, DPDP compliance, and ethical digital citizenship.",
    pages: 58,
    currentPage: 1,
    cover: "emerald",
    category: "cs",
    author: "Ananya Deshmukh · EdVidura Tech Initiative",
    subjectCode: "CS-08",
    classLevel: "Class 8 & Skill Elective",
    chaptersCount: 4,
    hasAudiobook: true,
    hasInteractiveChecks: true,
    publishedDate: "2026-11-05",
  },
  {
    id: "eb-niti-ethics",
    slug: "niti-ethics-companion",
    title: "Niti & Life Values: Student Character & Ethics Companion",
    description: "Moral reasoning, Satya and Dharma in daily life, community compassion, and civic harmony with multilingual Indian language reflections.",
    pages: 52,
    currentPage: 1,
    cover: "ink",
    category: "life",
    author: "Dr. S. Radhakrishnan Foundation · Humanities Council",
    subjectCode: "VAL-08",
    classLevel: "Class 8 (RHS-C08)",
    chaptersCount: 4,
    hasAudiobook: true,
    hasInteractiveChecks: true,
    publishedDate: "2026-11-10",
  },
  {
    id: "eb-wiring",
    slug: "domestic-wiring-practice",
    title: "Domestic Wiring Practice",
    description: "Circuits, cables and earthing for homes.",
    pages: 62,
    currentPage: 14,
    cover: "accent",
    category: "vocational",
    author: "Technical Training Dept.",
    subjectCode: "ELEC-01",
    classLevel: "Vocational Level 1",
    chaptersCount: 3,
    hasAudiobook: true,
    hasInteractiveChecks: true,
    publishedDate: "2026-09-01",
  },
  {
    id: "eb-earthing",
    slug: "earthing-electrical-safety",
    title: "Earthing and Electrical Safety",
    description: "Earth paths, protective devices and safe work.",
    pages: 48,
    currentPage: null,
    cover: "ink",
    category: "vocational",
    author: "Technical Training Dept.",
    subjectCode: "ELEC-02",
    classLevel: "Vocational Level 1",
    chaptersCount: 3,
    hasAudiobook: true,
    hasInteractiveChecks: true,
    publishedDate: "2026-09-05",
  },
  {
    id: "eb-instruments",
    slug: "measuring-instruments",
    title: "Measuring Instruments",
    description: "Using testers, multimeters and insulation testers.",
    pages: 40,
    currentPage: null,
    cover: "focus",
    category: "physical",
    author: "Technical Training Dept.",
    subjectCode: "ELEC-03",
    classLevel: "Vocational Level 1",
    chaptersCount: 3,
    hasAudiobook: true,
    hasInteractiveChecks: true,
    publishedDate: "2026-09-10",
  },
];

export const ebookById = (id: string) =>
  ebooks.find((e) => e.id === id || e.slug === id);
