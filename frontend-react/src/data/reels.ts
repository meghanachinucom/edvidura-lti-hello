export interface Reel {
  id: string;
  title: string;
  idea: string;
  lessonId: string;
  category?: string;
  diagramTitle?: string;
  keyPoints?: string[];
  conceptCheck?: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  };
}

/** 10 rich concept reels across Algebra, Physical Science, Railways Safety, Digital & AI, and Life Values. */
export const reels: Reel[] = [
  {
    id: "r-1",
    title: "Balancing Linear Equations",
    category: "Class 8 Algebra",
    idea: "An equation is a balanced scale. Whatever operation you apply to one side (addition, subtraction, multiplication, division), you must apply identically to the other.",
    lessonId: "1",
    diagramTitle: "Balance Scale Schematic: 2x + 5 = 15 -> 2x = 10 -> x = 5",
    keyPoints: [
      "Isolate the variable term by undoing addition or subtraction first",
      "Isolate the variable by undoing multiplication or division",
      "Check by substituting the solution back into the original equation",
    ],
    conceptCheck: {
      question: "In the equation 3x - 7 = 14, what is the first inverse operation to isolate x?",
      options: [
        "Divide both sides by 3",
        "Add 7 to both sides",
        "Subtract 14 from both sides",
        "Multiply both sides by 7",
      ],
      correct: 1,
      explanation:
        "Correct! Adding 7 to both sides eliminates the constant -7, giving 3x = 21, then dividing by 3 yields x = 7.",
    },
  },
  {
    id: "r-2",
    title: "Distributive Property & Factoring",
    category: "Class 8 Algebra",
    idea: "Multiplying a single term across a sum: a(b + c) = ab + ac. Factoring reverses this by pulling out the greatest common factor.",
    lessonId: "2",
    diagramTitle: "Geometric Area Model: Length a * Width (b + c) = ab + ac",
    keyPoints: [
      "Expand: 4(x + 3) = 4x + 12",
      "Factor: 6y - 15 = 3(2y - 5)",
      "Watch signs carefully when distributing negative coefficients: -2(x - 4) = -2x + 8",
    ],
    conceptCheck: {
      question: "What is the expanded form of -3(2x - 5)?",
      options: ["-6x - 15", "-6x + 15", "6x - 15", "-5x - 8"],
      correct: 1,
      explanation: "Correct! Distribute -3 to 2x (-6x) and -3 to -5 (+15), resulting in -6x + 15.",
    },
  },
  {
    id: "r-3",
    title: "Newton's Third Law: Action-Reaction",
    category: "Physical Science",
    idea: "For every action, there is an equal and opposite reaction. Forces always occur in matched pairs acting on two different bodies.",
    lessonId: "3",
    diagramTitle: "Opposing Vectors: F(Skater A on B) = -F(Skater B on A)",
    keyPoints: [
      "Action and reaction forces never cancel each other because they act on different objects",
      "Magnitudes are strictly equal, even if the masses of the two objects differ",
      "Acceleration depends on mass (F = ma), so lighter objects experience greater acceleration",
    ],
    conceptCheck: {
      question: "When a rifle fires a bullet forward, what force does the rifle experience?",
      options: [
        "No recoil force because the bullet is much lighter",
        "An equal backward force, resulting in rifle recoil",
        "A force twice as large because gunpowder expands backward",
        "A force that cancels out the bullet's momentum completely",
      ],
      correct: 1,
      explanation:
        "Correct! By Newton's Third Law, the rifle exerts a forward force on the bullet, and the bullet exerts an equal backward force on the rifle.",
    },
  },
  {
    id: "r-4",
    title: "Conservation of Energy: Potential to Kinetic",
    category: "Physical Science",
    idea: "Energy cannot be created or destroyed; it only transforms. A roller coaster trades gravitational potential energy (mgh) for kinetic energy (½mv²).",
    lessonId: "4",
    diagramTitle: "Energy Conservation Track: Peak PE -> Speed KE -> Work Done",
    keyPoints: [
      "Potential Energy (PE = mgh) is highest at the maximum height",
      "Kinetic Energy (KE = ½mv²) is highest at the lowest elevation",
      "Total Mechanical Energy (E = PE + KE) remains constant in frictionless systems",
    ],
    conceptCheck: {
      question:
        "A pendulum swings through its lowest point. Where is its kinetic energy at maximum?",
      options: [
        "At the extreme highest point of its swing",
        "At the exact bottom (lowest point) of its swing",
        "Halfway between top and bottom",
        "Kinetic energy remains zero throughout the swing",
      ],
      correct: 1,
      explanation:
        "Correct! At the lowest point, all gravitational potential energy has converted into kinetic energy, giving maximum velocity.",
    },
  },
  {
    id: "r-5",
    title: "Why the Earth Wire Matters",
    category: "Railways Safety",
    idea: "The earth conductor provides a safe low-resistance return path for fault currents, tripping the MCB or RCCB before human touch becomes fatal.",
    lessonId: "5",
    diagramTitle: "Fault Path Schematic: Line -> Metal Chassis -> Earth Electrode",
    keyPoints: [
      "Normal state: 0V on metal enclosure with unbroken grounding",
      "Fault state: current flows harmlessly to earth electrode (< 1 ohm)",
      "Trip condition: RCCB detects 30mA imbalance within 40ms",
    ],
    conceptCheck: {
      question: "What primary safety function does the green-yellow earth conductor serve?",
      options: [
        "Carries return operating current back to the utility transformer",
        "Provides a low-impedance fault loop path to rapidly trigger circuit breakers",
        "Stabilizes mains line voltage during peak load surges",
        "Reduces electricity meter consumption during standby",
      ],
      correct: 1,
      explanation:
        "Correct! The earth wire routes fault current away from equipment enclosures directly to ground, causing the MCB/RCCB to trip instantly.",
    },
  },
  {
    id: "r-6",
    title: "Automatic Block Signalling & Track Circuits",
    category: "Railways Safety",
    idea: "A continuous low-voltage current runs through rails. A train's wheelset shorts the rails, dropping the relay and setting the rear signal to red.",
    lessonId: "6",
    diagramTitle: "Fail-Safe Track Circuit: Axle Shunts Relay -> Red Aspect Dropped",
    keyPoints: [
      "Fail-safe principle: broken rail or loss of power automatically drops signal to Red (Stop)",
      "Wheelset axle creates a zero-resistance shunt across the two running rails",
      "Signal progression: Red (Stop) -> Yellow (Caution) -> Double Yellow (Attention) -> Green (Proceed)",
    ],
    conceptCheck: {
      question:
        "If a rail snaps or signalling power fails, what aspect does the signal automatically display?",
      options: [
        "Flashing green (speed up)",
        "Yellow (caution)",
        "Red (danger / stop) — fail-safe design",
        "Signal goes completely dark with no restriction",
      ],
      correct: 2,
      explanation:
        "Correct! All railway track circuits are fail-safe: any disruption to the circuit de-energizes the relay and drops the signal to Red.",
    },
  },
  {
    id: "r-7",
    title: "How AI Language Models Predict Tokens",
    category: "Digital & AI",
    idea: "Large Language Models break text into sub-word tokens and use probability distributions calculated across billions of neural weights to predict the next token.",
    lessonId: "7",
    diagramTitle: "Transformer Attention: Context Vectors -> Softmax Next Token Probabilities",
    keyPoints: [
      "Tokenization splits text into meaningful sub-words (e.g. 'un' + 'break' + 'able')",
      "Self-attention allows the model to connect distant words in a sentence",
      "Temperature controls sampling: low temperature is deterministic; high temperature is creative",
    ],
    conceptCheck: {
      question: "What does setting an AI model temperature to 0.1 achieve?",
      options: [
        "Makes the model generate completely random and unpredictable words",
        "Makes output highly deterministic, factual, and consistent",
        "Causes the model to shut down due to cold thermal throttling",
        "Doubles the size of the model's vocabulary context window",
      ],
      correct: 1,
      explanation:
        "Correct! Lower temperature (close to 0) flattens randomness, making the model reliably select the highest-probability token.",
    },
  },
  {
    id: "r-8",
    title: "Two-Factor Authentication & Phishing Defense",
    category: "Digital & AI",
    idea: "Authentication requires something you know (password) plus something you have (security key or authenticator app). Passwords alone are vulnerable to credential stuffing.",
    lessonId: "8",
    diagramTitle: "Zero-Trust Access: Password + Time-Based OTP (TOTP) / FIDO2 Passkey",
    keyPoints: [
      "Phishing sites copy login pages to steal usernames and passwords",
      "FIDO2 hardware keys and passkeys are cryptographically bound to domain names and cannot be phished",
      "Never share one-time SMS verification codes with anyone on phone calls",
    ],
    conceptCheck: {
      question: "Why is a hardware FIDO2 passkey more secure than an SMS text verification code?",
      options: [
        "Hardware keys do not require electrical power to function",
        "SMS codes can be intercepted via SIM swapping or phishing; passkeys are domain-bound",
        "Hardware keys automatically create 50-character random passwords",
        "SMS codes only work when connected to high-speed fiber internet",
      ],
      correct: 1,
      explanation:
        "Correct! SMS verification can be intercepted by SIM hijacking or fake login screens, whereas FIDO2 passkeys verify the genuine domain cryptographically.",
    },
  },
  {
    id: "r-9",
    title: "Vidura Niti: Truthful Self-Discipline",
    category: "Life Values",
    idea: "Vidura taught that enduring success comes not from deceit or haste, but from steady self-restraint, respect for truth, and honest effort.",
    lessonId: "9",
    diagramTitle:
      "Pillars of Character: Satya (Truth), Dama (Restraint), and Udyama (Diligent Action)",
    keyPoints: [
      "True wisdom is knowing what is right and doing it even when unobserved",
      "Impulsive anger destroys judgment; calm deliberation reveals righteous solutions",
      "Knowledge without humility and ethics becomes a hazard to society",
    ],
    conceptCheck: {
      question: "According to Vidura Niti, what is the mark of genuine wisdom?",
      options: [
        "Accumulating wealth by any means available",
        "Demonstrating self-control, doing good consistently, and avoiding destructive ego",
        "Winning every argument regardless of truth or facts",
        "Avoiding difficult tasks by delegating them to others",
      ],
      correct: 1,
      explanation:
        "Correct! Vidura emphasized that self-discipline, ethical consistency, and humility under all conditions are the true hallmarks of a wise student.",
    },
  },
  {
    id: "r-10",
    title: "Active Listening in Collaborative Problem Solving",
    category: "Life Values",
    idea: "Great engineering and team achievements require hearing what others actually mean, asking clarifying questions, and synthesizing diverse strengths without defensive reactions.",
    lessonId: "10",
    diagramTitle: "Communication Cycle: Listen with Empathy -> Clarify -> Synthesize Solution",
    keyPoints: [
      "Listen to understand, not merely to prepare your immediate rebuttal",
      "Restate the other person's point to verify mutual comprehension before proposing fixes",
      "Diverse perspectives uncover edge cases that a single mind would miss",
    ],
    conceptCheck: {
      question:
        "In a student team debugging a complex project, what is the best first step when a teammate proposes a solution?",
      options: [
        "Immediately reject it and explain your own approach",
        "Listen actively, summarize their idea to confirm understanding, then evaluate it constructively",
        "Remain silent and let the teacher decide who is right",
        "Argue until the teammate concedes defeat",
      ],
      correct: 1,
      explanation:
        "Correct! Active listening and reflective summarization build trust, prevent misunderstandings, and produce better engineering outcomes.",
    },
  },
];
