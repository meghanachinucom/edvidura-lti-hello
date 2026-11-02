export interface DraftQuestion { text: string; options: string[]; correctIndex: number }

export const draftQuestions: { sources: string[]; questions: DraftQuestion[] } = {
  sources: ["Earthing and why it matters"],
  questions: [
    { text: "What happens if an appliance's earth wire is broken and a live wire touches its metal body?", options: ["Nothing", "The body becomes live and can give a shock", "The MCB always trips", "The voltage drops to zero"], correctIndex: 1 },
    { text: "Which test confirms the earth conductor is unbroken?", options: ["Insulation test", "Continuity test", "Polarity test", "Load test"], correctIndex: 1 },
    { text: "An RCCB trips when it senses which of these?", options: ["A difference between phase and neutral current", "A voltage above 230 V", "A loose lamp holder", "Too many switches on one board"], correctIndex: 0 },
    { text: "Before replacing a socket outlet, what should you do first?", options: ["Switch off at the socket only", "Isolate the circuit at the board and prove it dead with a tester", "Wear rubber slippers and start", "Remove the fuse while the load is on"], correctIndex: 1 },
    { text: "In domestic wiring, which colour is used for the protective earth conductor?", options: ["Red", "Black", "Green or green-and-yellow", "Blue"], correctIndex: 2 },
  ],
};

export const draftLessonText = {
  sources: ["Earthing and Electrical Safety"],
  title: "Earthing in a domestic installation",
  body: "Every metal part that could become live in a fault must be connected to earth. When a live wire touches an earthed metal body, a large current flows to earth and the MCB or RCCB switches the supply off. Without earthing, the metal stays live and anyone who touches it can receive a shock.",
};

export const draftSimplified = {
  sources: ["Electrical safety and PPE"],
  original: "Prior to commencing any work on a distribution board, the circuit shall be isolated, secured against reconnection and verified de-energised using an approved voltage indicator.",
  simplified: "Before you work on a distribution board, switch the circuit off, lock it off, and use a tester to prove it is dead.",
};

export const draftFeedback = {
  sources: ["Ohm's law in practice"],
  learnerName: "Bikash Gogoi",
  suggestion: "You set up the formula correctly but divided resistance by voltage. Try I = V ÷ R again: 230 ÷ 46.",
};

/** TC-09 Remediation micro-lesson draft (no learner names). */
export const remediationDraft = {
  sources: ["Earthing and why it matters", "MCBs, fuses and RCCBs"],
  title: "Following a fault current to earth",
  body: "## Worked example\n\nAn electric iron has a loose live wire that touches its metal body.\n\n1. The fault current flows from the live wire into the metal body.\n2. It flows through the earth wire in the flex to the earth pin of the plug.\n3. It reaches the earth electrode through the earth conductor.\n4. The large current makes the MCB trip or the RCCB operate, and the supply switches off.\n\n## Why it matters\n\nIf the earth wire is broken, the metal body stays live. Anyone who touches it can get a shock.\n\n## Check yourself\n\n- Where does the fault current go if the earth wire is unbroken?\n- Which device switches the supply off?",
};

/** TC-10 Simplified drafts, keyed by lesson id. */
export const simplifyDrafts: Record<string, { title: string; body: string }> = {
  "1": { title: "Stay safe and wear PPE", body: "Electricity can hurt or kill you.\n\n- Switch off the supply and lock it before work.\n- Wear insulated gloves, safety shoes and eye protection (PPE).\n- Use a tester to prove the circuit is dead." },
  "2": { title: "Ohm's law made simple", body: "Current (I) = Voltage (V) ÷ Resistance (R).\n\n- Example: 230 V ÷ 46 Ω = 5 A.\n- More resistance means less current." },
  "3": { title: "Earthing — the simple version", body: "Earthing joins an appliance's metal body to the ground with a wire.\n\n- If a live wire touches the metal body, a fault current flows.\n- The current takes the earth wire, because it has very low resistance.\n- This large current makes the MCB or fuse operate, so the supply switches off.\n\nNo one gets a shock from the metal body." },
  "4": { title: "MCBs, fuses and RCCBs", body: "- An MCB or fuse switches off when there is too much current (overload or short circuit).\n- An RCCB switches off when current leaks to earth.\n- Both protect people and wiring." },
  "5": { title: "Before the checkpoint quiz", body: "Read the earlier lessons again.\n\n- Check the ones you marked done.\n- Then take the quiz." },
};

/** TC-11 Grade assist inputs and suggestion (no learner names). */
export const gradeAssist = {
  sources: ["Earthing and why it matters"],
  question: "Explain why the metal body of an electric iron must be earthed.",
  answer: "If the wire inside touches the metal, the iron becomes live. The earth wire takes the current away so you don't get a shock.",
  rubric: ["States the fault-current path", "Links earthing to the protective device operating", "Uses correct terms"],
  strengths: ["Explains that the metal body can become live in a fault.", "Says the earth wire carries the current away from the user."],
  improvements: ["Say that the large fault current makes the MCB or fuse operate and switch off the supply.", "Use the terms \"live conductor\" and \"fault current\"."],
  feedback: "Good start — you explained that the metal body can become live and that the earth wire carries the current away. To complete your answer, add that this large fault current makes the MCB or fuse operate, so the supply switches off. Use the terms \"live conductor\" and \"fault current\".",
};

/** TC-16 micro-lesson drafts keyed by skill code. */
export const microDrafts: Record<string, { title: string; body: string; sources: string[] }> = {
  earthing: { title: "Earthing in two minutes", sources: ["Earthing and why it matters"], body: "Earthing joins the metal body of an appliance to the ground.\n\n- In a fault, current flows through the earth wire.\n- The large current makes the MCB or fuse switch off.\n- The metal body cannot give a shock." },
  "safe-isolation": { title: "Isolate safely before work", sources: ["Electrical safety and PPE"], body: "Follow these steps every time:\n\n1. Switch off the circuit at the board.\n2. Lock it off and keep the key with you.\n3. Prove your tester works on a known live supply.\n4. Test the circuit to prove it is dead.\n5. Prove your tester again." },
};
