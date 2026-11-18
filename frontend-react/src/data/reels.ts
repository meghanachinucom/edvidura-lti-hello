export interface Reel {
  id: string;
  title: string;
  idea: string;
  lessonId: string;
  diagramTitle?: string;
  keyPoints?: string[];
  conceptCheck?: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  };
}

/** 4 rich reels with PaperMorph interactive concept checks and diagram callouts. */
export const reels: Reel[] = [
  {
    id: "r-1",
    title: "Why the earth wire matters",
    idea: "The earth wire gives fault current a safe low-resistance path so the MCB or RCCB can trip before human contact becomes fatal.",
    lessonId: "3",
    diagramTitle: "Fault Path Schematic: Line -> Chassis -> Earth Electrode",
    keyPoints: [
      "Normal state: 0V on metal enclosure",
      "Fault state: current flows to earth electrode (< 1 ohm)",
      "Trip condition: RCCB detects 30mA imbalance within 40ms",
    ],
    conceptCheck: {
      question: "What primary safety function does the green-yellow earth conductor serve?",
      options: [
        "It carries normal return operating current back to the utility transformer",
        "It provides a low-impedance fault loop path to rapidly trigger protective disconnect devices",
        "It stabilizes mains line voltage during peak load surges",
        "It reduces electricity meter consumption during standby",
      ],
      correct: 1,
      explanation:
        "Correct! The earth wire routes fault current away from equipment enclosures directly to ground, causing the MCB/RCCB to trip instantly.",
    },
  },
  {
    id: "r-2",
    title: "Reading an MCB rating",
    idea: "The markings on an MCB, such as B16 or C32, tell you its trip curve characteristic and the continuous current it is rated for.",
    lessonId: "4",
    diagramTitle: "Thermal-Magnetic MCB Trip Curve (Current vs Time)",
    keyPoints: [
      "B-curve: trips at 3–5x rated current (domestic lighting & resistive loads)",
      "C-curve: trips at 5–10x rated current (inductive loads, motors, compressors)",
      "D-curve: trips at 10–20x rated current (high inrush transformers)",
    ],
    conceptCheck: {
      question:
        "Which trip curve is most suitable for electric motors with high startup inrush current?",
      options: [
        "Type A curve (ultrafast)",
        "Type B curve (3-5x In)",
        "Type C curve (5-10x In)",
        "Type Z curve (precision electronics)",
      ],
      correct: 2,
      explanation:
        "Correct! Type C breakers withstand short motor starting transients (5 to 10 times rated current) without nuisance tripping.",
    },
  },
  {
    id: "r-3",
    title: "Proving dead before you touch",
    idea: "Follow the golden safety rule: test your tester on a known live source, test the isolated circuit, then test your tester again.",
    lessonId: "1",
    diagramTitle: "Safe Isolation Protocol: 3-Point Voltage Verification",
    keyPoints: [
      "Step 1: Check voltage indicator on known proving unit (LED glows)",
      "Step 2: Probe isolated equipment phase-neutral and phase-earth (0V verified)",
      "Step 3: Re-verify indicator on proving unit to ensure meter has not failed silently",
    ],
    conceptCheck: {
      question:
        "Why must you re-test the voltage detector on a known source AFTER checking the isolated circuit?",
      options: [
        "To discharge internal tester capacitors",
        "To confirm the tester battery or internal fuse did not fail while taking the isolation reading",
        "To calibrate the digital zero baseline",
        "To record the test timestamp in the digital logging unit",
      ],
      correct: 1,
      explanation:
        "Correct! If the tester failed mid-measurement, a dead reading could falsely indicate safety on a live circuit.",
    },
  },
  {
    id: "r-4",
    title: "Ohm's law in 60 seconds",
    idea: "The fundamental linear relationship of circuits: Voltage (V) = Current (I) multiplied by Resistance (R).",
    lessonId: "2",
    diagramTitle: "Ohm's Law Triangle & Power Relationships",
    keyPoints: [
      "V = I * R (Volts = Amperes * Ohms)",
      "I = V / R (Doubling resistance halves current for a fixed voltage)",
      "P = V * I = I^2 * R (Dissipated thermal power in watts)",
    ],
    conceptCheck: {
      question:
        "If a 240V industrial heater element has a resistance of 48 ohms, what current will flow through it?",
      options: ["2.5 Amps", "5.0 Amps", "11.5 Amps", "24.0 Amps"],
      correct: 1,
      explanation: "Correct! I = V / R = 240V / 48 ohms = 5.0 Amperes.",
    },
  },
];
