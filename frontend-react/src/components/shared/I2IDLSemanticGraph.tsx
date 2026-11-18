import { useState, useEffect } from "react";
import {
  Network,
  Layers,
  Database,
  ExternalLink,
  Code2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";

interface GraphNode {
  id: string;
  uri: string;
  type: string;
  label: string;
  pillar: number;
  standard: string;
  x: number;
  y: number;
  color: string;
  triples: Array<{ predicate: string; object: string }>;
}

const DEFAULT_NODES: GraphNode[] = [
  {
    id: "comp-variables",
    uri: "urn:edvidura:competency:variables",
    type: "CompetencyDefinition",
    label: "Variables & Expressions",
    pillar: 1,
    standard: "IEEE 1484.20.3",
    x: 80,
    y: 70,
    color: "#0284c7",
    triples: [
      { predicate: "dcterms:isPartOf", object: "urn:edvidura:framework:rhs-algebra" },
      { predicate: "ceasn:exactAlignment", object: "http://asn.desire2learn.com/resources/D1000344" },
    ],
  },
  {
    id: "comp-solve-linear",
    uri: "urn:edvidura:competency:solve-linear",
    type: "CompetencyDefinition",
    label: "Solving Linear Equations",
    pillar: 1,
    standard: "IEEE 1484.20.3",
    x: 230,
    y: 70,
    color: "#0284c7",
    triples: [
      { predicate: "ceasn:prerequisiteAlignment", object: "urn:edvidura:competency:variables" },
      { predicate: "skos:related", object: "urn:edvidura:manual:algebra-ch1" },
    ],
  },
  {
    id: "lesson-linear-eq",
    uri: "urn:edvidura:lesson:slope-intercept",
    type: "LearningResource",
    label: "Lesson: Slope & Intercept",
    pillar: 2,
    standard: "IEEE 2881",
    x: 150,
    y: 160,
    color: "#8b5cf6",
    triples: [
      { predicate: "schema:teaches", object: "urn:edvidura:competency:solve-linear" },
      { predicate: "lti:context", object: "urn:lti:context:moodle-course-10" },
    ],
  },
  {
    id: "ebook-algebra-ch1",
    uri: "urn:edvidura:manual:algebra-ch1",
    type: "EbookChapter",
    label: "Algebra I · Chapter 1",
    pillar: 3,
    standard: "PEBL / EPUB3",
    x: 340,
    y: 80,
    color: "#f59e0b",
    triples: [
      { predicate: "adl:assesses", object: "urn:edvidura:competency:solve-linear" },
      { predicate: "schema:inLanguage", object: "hi, te, en" },
    ],
  },
  {
    id: "sme-chunk-balance",
    uri: "urn:edvidura:sme:chunk:balance-ops",
    type: "KnowledgeChunk",
    label: "SME RAG: Balance Operations",
    pillar: 3,
    standard: "W3C PROV-O",
    x: 370,
    y: 170,
    color: "#10b981",
    triples: [
      { predicate: "prov:wasDerivedFrom", object: "urn:edvidura:manual:algebra-ch1" },
      { predicate: "rag:relevanceScore", object: "0.94" },
    ],
  },
  {
    id: "quiz-item-slice-a-q2",
    uri: "urn:edvidura:assessment:slice-a-q2",
    type: "AssessmentItem",
    label: "Quiz Q2: 2x + 5 = 15",
    pillar: 4,
    standard: "QTI 3.0 / xAPI",
    x: 230,
    y: 230,
    color: "#ef4444",
    triples: [
      { predicate: "qti:evaluates", object: "urn:edvidura:competency:solve-linear" },
      { predicate: "lti:agsLineItem", object: "urn:lti:ags:lineitem:rhs-c08-score" },
    ],
  },
  {
    id: "xapi-statement-evidence",
    uri: "urn:edvidura:xapi:statement:d94fa21",
    type: "LearningEvidence",
    label: "xAPI Statement (Passed)",
    pillar: 4,
    standard: "ADL TLA xAPI",
    x: 80,
    y: 220,
    color: "#ec4899",
    triples: [
      { predicate: "xapi:actor", object: "Alice Nguyen (c01.s01)" },
      { predicate: "xapi:verb", object: "http://adlnet.gov/expapi/verbs/mastered" },
    ],
  },
];

const EDGES = [
  { from: "comp-variables", to: "comp-solve-linear", label: "prerequisite" },
  { from: "comp-solve-linear", to: "lesson-linear-eq", label: "teaches" },
  { from: "comp-solve-linear", to: "ebook-algebra-ch1", label: "assesses" },
  { from: "ebook-algebra-ch1", to: "sme-chunk-balance", label: "derives" },
  { from: "lesson-linear-eq", to: "quiz-item-slice-a-q2", label: "evaluates" },
  { from: "quiz-item-slice-a-q2", to: "xapi-statement-evidence", label: "records" },
  { from: "xapi-statement-evidence", to: "comp-variables", label: "verifies" },
];

export function I2IDLSemanticGraph({ className = "" }: { className?: string }) {
  const [activePillar, setActivePillar] = useState(1);
  const [selectedNode, setSelectedNode] = useState<GraphNode>(DEFAULT_NODES[1]);
  const [liveJsonLd, setLiveJsonLd] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/v1/ld/graph");
      setLiveJsonLd(data);
    } catch {
      // Fallback to builtin graph
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const pillarDescriptions = [
    {
      id: 1,
      title: "1. Assessment & PLE",
      full: "Competency Assessment, Difference Training & Personal Learning Environment",
      desc: "Maps learner mastery deltas against IEEE 1484.20.3 standard skills. Generates personalized micro-curricula and targeted remedial steps automatically without teacher manual intervention.",
    },
    {
      id: 2,
      title: "2. LMS & xAPI",
      full: "Moodle, LTI 1.3 & xAPI Interoperability",
      desc: "Preserves two-way context activity bindings (Moodle Course ID 10 <-> EdVidura RHS-C08). Binds AGS gradebook lineitems to xAPI statement actors across standard LMS boundaries.",
    },
    {
      id: 3,
      title: "3. SME RAG",
      full: "SME Chatbot, RAG & Dynamic Content Authoring",
      desc: "Indexes multi-chapter textbooks and course materials into semantic vector chunks linked to standardized competencies. Enables voice questioning and verified citation retrieval.",
    },
    {
      id: 4,
      title: "4. Analytics",
      full: "Analytics & Learning Evidence Trails",
      desc: "Records cryptographically verifiable learning statements conforming to IEEE 2881 metadata and ADL Total Learning Architecture guidelines for longitudinal evidence portfolios.",
    },
    {
      id: 5,
      title: "5. Decoupled Fed.",
      full: "Schema-Decoupled Cross-Component Federation",
      desc: "Connects disjoint microservices (quizzes, readers, coaches, gradebooks) through W3C Linked Data URIs and RDF triples without requiring shared SQL database tables or brittle schemas.",
    },
  ];

  return (
    <div
      className={`rounded-surface border border-secondary/30 bg-surface p-6 shadow-sm space-y-5 ${className}`}
      role="region"
      aria-label="I2IDL 5-Pillar Linked Data Knowledge Graph"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="text-secondary size-5" />
            <h3 className="font-heading text-base font-bold text-ink">
              I2IDL & ADL TLA Semantic Linked Data Explorer (IEEE 1484.20.3)
            </h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Decoupled semantic knowledge graph linking competencies, course lessons, textbooks, and verified xAPI statements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/v1/ld/graph"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-1 px-3"
          >
            <Code2 size={13} />
            <span>Raw JSON-LD</span>
            <ExternalLink size={12} />
          </a>
          <button
            type="button"
            onClick={fetchGraph}
            disabled={loading}
            className="btn-secondary text-xs py-1 px-2.5"
            title="Refresh semantic triples"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 5-Pillar Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        {pillarDescriptions.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePillar(p.id)}
            className={`rounded-control px-2.5 py-2 text-center text-xs font-semibold transition ${
              activePillar === p.id
                ? "bg-secondary text-white font-bold shadow-2xs"
                : "bg-muted text-ink hover:bg-muted/80"
            }`}
          >
            <span className="block truncate">{p.title}</span>
          </button>
        ))}
      </div>

      {/* Active Pillar Explanation Banner */}
      <div className="rounded-control bg-secondary/5 border border-secondary/20 p-3.5 text-xs text-ink space-y-1">
        <div className="font-bold text-secondary flex items-center gap-1.5">
          <Sparkles size={14} />
          <span>{pillarDescriptions[activePillar - 1].full}</span>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          {pillarDescriptions[activePillar - 1].desc}
        </p>
      </div>

      {/* Interactive Semantic Graph & Node Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Network Graph Canvas */}
        <div className="lg:col-span-2 rounded border border-border bg-slate-950 p-3 relative overflow-hidden shadow-inner">
          <svg viewBox="0 0 460 300" className="w-full h-[290px]">
            {/* Edges */}
            {EDGES.map((edge, idx) => {
              const fromN = DEFAULT_NODES.find((n) => n.id === edge.from);
              const toN = DEFAULT_NODES.find((n) => n.id === edge.to);
              if (!fromN || !toN) return null;
              return (
                <g key={idx}>
                  <line
                    x1={fromN.x}
                    y1={fromN.y}
                    x2={toN.x}
                    y2={toN.y}
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={(fromN.x + toN.x) / 2}
                    cy={(fromN.y + toN.y) / 2}
                    r="2.5"
                    fill="#38bdf8"
                    className="animate-pulse"
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {DEFAULT_NODES.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const matchesPillar = node.pillar === activePillar;
              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer transition-all duration-200"
                >
                  {/* Highlight ring */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="26"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="3"
                      className="animate-pulse"
                    />
                  )}
                  {/* Node body */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="19"
                    fill={node.color}
                    opacity={matchesPillar ? 1 : 0.75}
                    stroke="#ffffff"
                    strokeWidth={matchesPillar ? 2.5 : 1}
                  />
                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + 32}
                    fill={isSelected ? "#38bdf8" : "#cbd5e1"}
                    fontSize="9.5"
                    fontWeight={isSelected ? "bold" : "600"}
                    textAnchor="middle"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-400">
            Interactive Semantic Graph · Click any node to inspect resolvable RDF payload
          </div>
        </div>

        {/* Node Inspector Card */}
        <div className="lg:col-span-1 rounded-surface border border-border bg-page-bg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-bold text-xs text-ink flex items-center gap-1.5">
              <Database size={14} className="text-secondary" />
              Node Semantic Payload
            </span>
            <span className="font-mono text-[10px] bg-secondary/15 text-secondary px-2 py-0.5 rounded font-bold">
              {selectedNode.standard}
            </span>
          </div>

          <div>
            <h4 className="font-bold text-sm text-ink">{selectedNode.label}</h4>
            <p className="font-mono text-[11px] text-secondary break-all mt-0.5">{selectedNode.uri}</p>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-ink-muted text-[11px]">
              <span>Entity Type:</span>
              <span className="font-mono font-semibold text-ink">{selectedNode.type}</span>
            </div>
            <div className="flex justify-between text-ink-muted text-[11px]">
              <span>Target Standard:</span>
              <span className="font-semibold text-ink">{selectedNode.standard}</span>
            </div>
          </div>

          <div className="border-t border-border pt-2 space-y-2">
            <span className="text-[11px] font-bold text-ink-muted uppercase">RDF Triples:</span>
            <div className="space-y-1.5">
              {selectedNode.triples.map((tr, idx) => (
                <div key={idx} className="rounded bg-surface p-2 text-[10px] border border-border space-y-0.5">
                  <div className="font-mono font-bold text-secondary">{tr.predicate}</div>
                  <div className="font-mono text-ink-muted break-all">{tr.object}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
