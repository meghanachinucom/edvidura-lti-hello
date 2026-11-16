/** Mock eBook text. Each chapter has a start page used for "Page n of N". */
export interface Chapter {
  id: string;
  title: string;
  startPage: number;
  paragraphs: string[];
}

const wiring: Chapter[] = [
  {
    id: "ch-1",
    title: "Chapter 1 — Supply to the home",
    startPage: 1,
    paragraphs: [
      "Power reaches a home through the service cable from the supply company. It ends at the meter and the main switch.",
      "After the main switch, the supply goes to the distribution board. Every circuit in the home starts here.",
      "Each circuit has its own MCB. If one circuit has a fault, only that circuit switches off.",
      "Always find the main switch before you start work. You must know how to isolate the whole home.",
    ],
  },
  {
    id: "ch-2",
    title: "Chapter 2 — Ring and radial circuits",
    startPage: 14,
    paragraphs: [
      "A radial circuit starts at the distribution board and runs out to each point, one after another. It ends at the last point.",
      "A ring circuit starts and ends at the same MCB. The cable goes around the sockets and comes back, so current has two paths.",
      "Choose the cable size for the load. Lighting circuits often use 1.5 sq mm cable. Socket circuits for heavier loads use 2.5 sq mm or 4 sq mm.",
      "At the distribution board, every circuit's earth wire joins the main earth bar. The earth bar connects to the earth electrode outside the home.",
    ],
  },
  {
    id: "ch-3",
    title: "Chapter 3 — Testing before switching on",
    startPage: 31,
    paragraphs: [
      "Test every new circuit before you connect the supply. Testing finds faults while it is still safe.",
      "First, do a continuity test on the live, neutral and earth wires. Each wire must be unbroken from end to end.",
      "Next, test the insulation between the wires. Good insulation shows a very high resistance.",
      "Only switch on when every test passes. Write the results down for the record.",
    ],
  },
];

const short = (topic: string): Chapter[] => [
  {
    id: "ch-1",
    title: `Chapter 1 — ${topic}`,
    startPage: 1,
    paragraphs: [
      "This chapter introduces the topic in short, simple steps.",
      "Read each part slowly. Say the key words to yourself.",
      "Look at the pictures in your class lessons as you read.",
      "When you finish, practise with a quiz.",
    ],
  },
];

export const ebookChapters: Record<string, Chapter[]> = {
  "de7900fd-488b-4740-bf7e-7a11b3475cd6": [
    {
      id: "ch-algebra-1",
      title: "Chapter 1 — Variables and Equations",
      startPage: 1,
      paragraphs: [
        "In algebra, letters stand for numbers whose values can change or are unknown.",
        "An equation is a mathematical statement asserting that two expressions are equal.",
        "To solve an equation, perform the same operation on both sides to isolate the variable.",
        "Check your solution by substituting the value back into the original equation.",
      ],
    },
    {
      id: "ch-algebra-2",
      title: "Chapter 2 — Linear Functions & Graphs",
      startPage: 15,
      paragraphs: [
        "A linear function forms a straight line when plotted on the Cartesian plane.",
        "The standard slope-intercept form is y = mx + b, where m is the slope and b is the y-intercept.",
        "A positive slope rises from left to right; a negative slope falls from left to right.",
      ],
    },
  ],
  "eb-wiring": wiring,
  "eb-earthing": short("Why earthing matters"),
  "eb-instruments": short("Your first tester"),
};
