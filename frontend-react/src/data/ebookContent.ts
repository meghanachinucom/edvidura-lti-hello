/** Multi-Chapter Interactive Textbook Content with PaperMorph Concept Checks */
export interface ConceptCheck {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  skillTag: string;
}

export interface Chapter {
  id: string;
  title: string;
  startPage: number;
  diagramTitle?: string;
  diagramUrl?: string;
  diagramCaption?: string;
  takeaway?: string;
  paragraphs: string[];
  conceptCheck?: ConceptCheck;
  narration?: {
    en: string;
    hi?: string;
    te?: string;
    ta?: string;
    kn?: string;
  };
}

export const ebookChapters: Record<string, Chapter[]> = {
  // BOOK 1: Algebra I
  "de7900fd-488b-4740-bf7e-7a11b3475cd6": [
    {
      id: "ch-alg-1",
      title: "Chapter 1 — Foundations of Algebraic Reasoning & Variable Notation",
      startPage: 1,
      diagramTitle: "Balance Scale Analogy of Algebraic Equality",
      diagramCaption:
        "An algebraic equation behaves like a balanced scale: whatever operation is performed on the left hand must be mirrored on the right hand to maintain equilibrium.",
      takeaway:
        "Variables are placeholders for quantities that satisfy mathematical constraints; equality is an invariant state preserved under symmetric transformations.",
      paragraphs: [
        "In algebra, letters such as x, y, and z serve as symbols for numbers whose values are currently unknown or subject to change.",
        "An expression combines variables, numbers, and operations (e.g., 3x + 7), while an equation asserts that two expressions denote identical values (e.g., 3x + 7 = 22).",
        "The golden rule of algebra states that equality is preserved if and only if identical operations are applied simultaneously to both sides.",
        "When modeling real-world situations, we define the unknown quantity explicitly before translating verbal statements into mathematical constraints.",
      ],
      conceptCheck: {
        question:
          "In the expression 4x + 9 = 25, what is the first inverse operation to isolate the term with the variable x?",
        options: [
          "Divide both sides by 4",
          "Subtract 9 from both sides",
          "Multiply both sides by 4",
          "Add 9 to both sides",
        ],
        correctIndex: 1,
        explanation:
          "By applying inverse operations in reverse PEMDAS order, subtract the constant term 9 first: 4x = 16, then divide by 4 to find x = 4.",
        skillTag: "variables-isolation",
      },
      narration: {
        en: "Welcome to Chapter 1. Variables are symbolic placeholders representing numbers whose values satisfy an equation. Remember that an equation is like a balanced scale.",
        hi: "अध्याय 1 में आपका स्वागत है। बीजगणित में अक्षर उन अज्ञात मानों को दर्शाते हैं जो समीकरण को संतुलित रखते हैं।",
        te: "అధ్యాయం 1 కి స్వాగతం. బీజగణితంలో అక్షరాలు సమీకరణాన్ని సంతృప్తిపరిచే తెలియని విలువలను సూచిస్తాయి.",
      },
    },
    {
      id: "ch-alg-2",
      title: "Chapter 2 — Solving Linear Equations (One-Step, Two-Step & Multi-Step)",
      startPage: 16,
      diagramTitle: "Step-by-Step Inverse Operation Workflow",
      diagramCaption:
        "Systematic simplification: Expand brackets → Collect like terms → Isolate variable term → Divide by coefficient → Verify by back-substitution.",
      takeaway:
        "Mastery of linear equation solving requires systematic inversion of addition, subtraction, multiplication, and division in reverse hierarchical sequence.",
      paragraphs: [
        "Solving a multi-step linear equation such as 2(3x - 4) + 5 = 27 requires systematic simplification before variable isolation.",
        "First, apply the distributive property to eliminate parentheses: 6x - 8 + 5 = 27.",
        "Next, combine like constant terms on the left: 6x - 3 = 27. Add 3 to both sides: 6x = 30.",
        "Finally, divide by the coefficient 6 to determine that x = 5. Verify your solution by back-substituting x = 5 into the initial expression.",
      ],
      conceptCheck: {
        question: "What is the solution to 3(x - 2) = 15?",
        options: ["x = 5", "x = 7", "x = 3", "x = 9"],
        correctIndex: 1,
        explanation:
          "Divide both sides by 3 to get x - 2 = 5, then add 2 to both sides: x = 7. Check: 3(7 - 2) = 3(5) = 15.",
        skillTag: "solve-linear",
      },
      narration: {
        en: "Chapter 2 explores multi-step equations. Always distribute parentheses first, collect like terms, and then apply inverse operations.",
        hi: "अध्याय 2 बहु-चरणीय समीकरणों पर केंद्रित है। कोष्ठक हटाएं, समान पदों को जोड़ें और चर का मान ज्ञात करें।",
        te: "అధ్యాయం 2 బహుళ-దశ సమీకరణాలను వివరిస్తుంది. బ్రాకెట్లను విస్తరించండి, చరరాశిని వేరు చేయండి.",
      },
    },
    {
      id: "ch-alg-3",
      title: "Chapter 3 — Linear Inequalities & Graphing on the Cartesian Plane",
      startPage: 32,
      diagramTitle: "Slope-Intercept Form y = mx + b on Cartesian Plane",
      diagramCaption:
        "Visualizing linear functions: slope m indicates rate of vertical rise per horizontal unit; intercept b marks the intersection with the y-axis.",
      takeaway:
        "Every linear relationship has both an algebraic signature (y = mx + b) and a geometric reality on the 2D Cartesian plane.",
      paragraphs: [
        "When an equation is written in slope-intercept form, y = mx + b, m represents the steepness or slope (Δy / Δx) and b represents the vertical intercept (0, b).",
        "A positive slope slopes upward from left to right, whereas a negative slope slopes downward.",
        "Linear inequalities replace the equality symbol with <, ≤, >, or ≥, dividing the Cartesian coordinate plane into half-planes.",
        "Remember the crucial inequality rule: multiplying or dividing both sides by a negative number reverses the direction of the inequality sign.",
      ],
      conceptCheck: {
        question: "When solving -2x < 10, what is the resulting inequality?",
        options: ["x < -5", "x > -5", "x > 5", "x < 5"],
        correctIndex: 1,
        explanation:
          "Dividing both sides by negative 2 flips the inequality sign from less-than to greater-than: x > -5.",
        skillTag: "inequalities-cartesian",
      },
      narration: {
        en: "Chapter 3 covers linear graphing and inequalities. Remember: whenever you multiply or divide by a negative number, the inequality sign flips direction.",
        hi: "अध्याय 3 में हम रेखाचित्र और असमानताओं को समझते हैं। ऋणात्मक संख्या से भाग देने पर असमानता का चिन्ह बदल जाता है।",
        te: "అధ్యాయం 3 గ్రాఫింగ్ మరియు అసమానతలను పరిశీలిస్తుంది. ఋణ సంఖ్యతో భాగించినప్పుడు అసమానత గుర్తు మారుతుంది.",
      },
    },
    {
      id: "ch-alg-4",
      title: "Chapter 4 — Real-World Applications & Word Problem Modeling",
      startPage: 48,
      diagramTitle: "Translating Natural Language to Algebraic Equations",
      diagramCaption:
        "Sentence mapping: 'Total cost of 5 books and shipping $12 is $82' maps directly to 5b + 12 = 82.",
      takeaway:
        "Algebra transforms complex real-world rate, geometry, and finance challenges into solvable linear constraints.",
      paragraphs: [
        "Real-world problems require translating descriptive narratives into symbolic mathematics.",
        "For example, a municipal water utility charges a flat monthly meter fee of $15 plus $2.50 per thousand gallons consumed.",
        "If a school's monthly water bill is $115, the relation is modeled as 15 + 2.50g = 115, where g denotes thousands of gallons.",
        "Subtracting 15 yields 2.50g = 100, and dividing by 2.50 yields g = 40. The school consumed 40,000 gallons of water.",
      ],
      conceptCheck: {
        question:
          "A taxi charges $4 base fare plus $3 per mile. If the total fare is $25, how many miles was the trip?",
        options: ["5 miles", "7 miles", "8 miles", "6 miles"],
        correctIndex: 1,
        explanation:
          "Model as 4 + 3m = 25. Subtract 4 to get 3m = 21, then divide by 3: m = 7 miles.",
        skillTag: "word-problems",
      },
      narration: {
        en: "Chapter 4 applies algebra to real-world rate problems. Always identify the constant fee and the variable rate to set up your linear equation.",
        hi: "अध्याय 4 में हम दैनिक जीवन की समस्याओं को बीजगणित में बदलना सीखते हैं। स्थिर और परिवर्तनशील दरों को पहचानें।",
        te: "అధ్యాయం 4 నిజ జీవిత సమస్యలకు బీజగణితాన్ని అనువర్తిస్తుంది. స్థిర మరియు చర రేట్లను గుర్తించి సమీకరణం రాయండి.",
      },
    },
  ],

  // BOOK 2: Physical Science
  "eb-physical-science": [
    {
      id: "ch-sci-1",
      title: "Chapter 1 — Kinematics: Distance, Displacement, Speed & Velocity",
      startPage: 1,
      diagramTitle: "Vector Displacement vs Scalar Distance",
      diagramCaption:
        "Scalar distance measures total path traveled; vector displacement measures the straight-line directed distance from origin to destination.",
      takeaway:
        "Physics distinguishes scalar quantities (magnitude only) from vector quantities (magnitude with spatial direction).",
      paragraphs: [
        "Kinematics describes the motion of objects without reference to the forces causing that motion.",
        "Distance is a scalar quantity indicating how much ground an object has covered during its motion.",
        "Displacement is a vector quantity measuring the object's overall change in position: Δx = x_final - x_initial.",
        "Average speed is distance divided by elapsed time, whereas average velocity is displacement divided by elapsed time.",
      ],
      conceptCheck: {
        question:
          "A runner completes one full 400-meter circular lap and returns to the start line. What is their displacement?",
        options: ["400 meters", "200 meters", "0 meters", "100 meters"],
        correctIndex: 2,
        explanation:
          "Because the starting and ending positions are identical, the vector change in position is 0 meters, even though distance is 400 meters.",
        skillTag: "kinematics-vectors",
      },
      narration: {
        en: "Welcome to Physical Science Chapter 1. Remember: distance is how far you traveled, but displacement is how far you ended up from where you started.",
        hi: "भौतिक विज्ञान के पहले अध्याय में आपका स्वागत है। दूरी और विस्थापन के अंतर को समझें।",
        te: "భౌతిక శాస్త్రం అధ్యాయం 1 కి స్వాగతం. దూరం మరియు స్థానభ్రంశం మధ్య వ్యత్యాసాన్ని గ్రహించండి.",
      },
    },
    {
      id: "ch-sci-2",
      title: "Chapter 2 — Newton's Three Laws of Motion & Net Force Calculations",
      startPage: 18,
      diagramTitle: "Free-Body Diagram & Net Force Equilibrium",
      diagramCaption:
        "When normal force equals gravitational force and applied force exceeds friction, net force accelerates the mass according to F = ma.",
      takeaway:
        "Forces are interactions that change motion; an object accelerates in the exact direction of the unbalanced net vector force.",
      paragraphs: [
        "Newton's First Law (Law of Inertia) states that an object at rest remains at rest, and an object in uniform motion continues unless acted on by a net external force.",
        "Newton's Second Law establishes the fundamental formula F_net = m · a, connecting force, mass, and acceleration.",
        "Newton's Third Law proves that forces always occur in matched action-reaction pairs: when body A exerts a force on body B, body B exerts an equal and opposite force on body A.",
        "Free-body diagrams resolve all concurrent vectors into orthogonal components to determine acceleration.",
      ],
      conceptCheck: {
        question:
          "A net force of 30 Newtons is applied to a 6-kilogram cart. What is the acceleration of the cart?",
        options: ["180 m/s²", "5 m/s²", "0.2 m/s²", "24 m/s²"],
        correctIndex: 1,
        explanation: "According to Newton's Second Law, a = F / m = 30 N / 6 kg = 5 m/s².",
        skillTag: "newton-laws",
      },
      narration: {
        en: "Chapter 2 explores Newton's three laws of motion. Force equals mass times acceleration: F = m a.",
        hi: "अध्याय 2 में न्यूटन के गति के तीन नियमों का अध्ययन करें। बल = द्रव्यमान गुणा त्वरण।",
        te: "అధ్యాయం 2 న్యూటన్ మూడు గమన నియమాలను వివరిస్తుంది. బలం = ద్రవ్యరాశి x త్వరణం.",
      },
    },
    {
      id: "ch-sci-3",
      title: "Chapter 3 — Work, Power, Potential & Kinetic Energy Transformations",
      startPage: 36,
      diagramTitle: "Rollercoaster Energy Exchange: PE to KE",
      diagramCaption:
        "At the peak, gravitational potential energy is maximum; as the coaster drops, PE converts to kinetic energy KE = 1/2 m v².",
      takeaway:
        "Energy cannot be destroyed; in conservative systems, mechanical energy alternates seamlessly between stored potential and active kinetic states.",
      paragraphs: [
        "In physics, work is done when a force causes a displacement in the direction of the force: W = F · d · cos(θ).",
        "Gravitational potential energy depends on elevation and gravity: PE = m · g · h.",
        "Kinetic energy is the energy of motion: KE = 0.5 · m · v².",
        "Power measures the rate at which work is performed or energy is converted over time: P = W / Δt, measured in Watts (Joules per second).",
      ],
      conceptCheck: {
        question:
          "If a car's velocity doubles from 10 m/s to 20 m/s, by what factor does its kinetic energy increase?",
        options: ["Doubles (2x)", "Triples (3x)", "Quadruples (4x)", "Remains the same"],
        correctIndex: 2,
        explanation:
          "Because kinetic energy is proportional to the square of velocity (v²), doubling speed multiplies kinetic energy by 2² = 4 times.",
        skillTag: "energy-power",
      },
      narration: {
        en: "Chapter 3 covers work, power, and energy conservation. Notice that kinetic energy scales with the square of velocity.",
        hi: "अध्याय 3 कार्य, ऊर्जा और शक्ति के सिद्धांत समझाता है। गतिज ऊर्जा वेग के वर्ग के अनुपात में बढ़ती है।",
        te: "అధ్యాయం 3 పని, శక్తి మరియు సామర్థ్యాన్ని వివరిస్తుంది. గతిశక్తి వేగ వర్గానికి అనులోమానుపాతంలో ఉంటుంది.",
      },
    },
    {
      id: "ch-sci-4",
      title: "Chapter 4 — Conservation of Momentum & Energy Systems",
      startPage: 54,
      diagramTitle: "Elastic vs Inelastic Collision Dynamics",
      diagramCaption:
        "Total momentum p = m · v is conserved in all isolated collisions, while kinetic energy is conserved strictly in elastic collisions.",
      takeaway:
        "The law of conservation of momentum governs collisions from planetary orbits down to subatomic particle interactions.",
      paragraphs: [
        "Momentum is the product of mass and velocity: p = m · v, measured in kilogram meters per second.",
        "The Law of Conservation of Momentum dictates that the total momentum of an isolated system before an interaction equals the total momentum afterward.",
        "In elastic collisions, both total momentum and kinetic energy are conserved.",
        "In inelastic collisions, objects stick together or deform, converting kinetic energy into thermal or acoustic energy while total momentum remains strictly conserved.",
      ],
      conceptCheck: {
        question:
          "What is always conserved in an isolated system during both elastic and inelastic collisions?",
        options: [
          "Only kinetic energy",
          "Only mechanical energy",
          "Total linear momentum",
          "Temperature",
        ],
        correctIndex: 2,
        explanation:
          "Total linear momentum is universally conserved in all collisions in an isolated system, regardless of whether energy is transformed into heat.",
        skillTag: "momentum-conservation",
      },
      narration: {
        en: "Chapter 4 explores conservation of momentum. In any isolated system, total momentum before collision equals total momentum after.",
        hi: "अध्याय 4 संवेग संरक्षण पर आधारित है। किसी बंद प्रणाली में कुल संवेग हमेशा स्थिर रहता है।",
        te: "అధ్యాయం 4 ద్రవ్యవేగ నిత్యత్వ నియమాన్ని చర్చిస్తుంది. అభిఘాతానికి ముందు మరియు తరువాత మొత్తం ద్రవ్యవేగం సమానం.",
      },
    },
  ],

  // BOOK 3: Indian Railways Safety
  "eb-railways-safety": [
    {
      id: "ch-rly-1",
      title: "Chapter 1 — Permanent Way Components: Rails, Sleepers, Ballast & Fastenings",
      startPage: 1,
      diagramTitle: "Cross-Section of Modern Indian Broad Gauge Track (1676 mm)",
      diagramCaption:
        "Track foundation: 60 kg/m UIC rails fastened by Pandrol clips to PSC monoblock sleepers embedded in 300 mm crushed granite ballast.",
      takeaway:
        "The permanent way safely distributes wheel axle loads up to 25 tonnes from steel rail heads through ballast cushions to the subgrade.",
      paragraphs: [
        "The permanent way is the bedrock of railway transportation across Indian Railways' 68,000+ kilometer network.",
        "Modern mainline tracks utilize 60 kg/m 90 UTS continuous welded rails (CWR) on 1676 mm broad gauge standard.",
        "Pre-stressed concrete (PSC) sleepers spaced at 1660 per kilometer maintain precise track gauge and load distribution.",
        "A 300 mm deep ballast cushion of hard, angular granite absorbs vibration, provides rapid drainage, and resists lateral track displacement.",
      ],
      conceptCheck: {
        question: "What is the standard broad gauge track measurement on Indian Railways?",
        options: ["1435 mm", "1676 mm", "1000 mm", "762 mm"],
        correctIndex: 1,
        explanation:
          "Indian Railways broad gauge is standard 1676 mm (5 ft 6 in), the widest standard commercial gauge in the world.",
        skillTag: "railway-track-specs",
      },
      narration: {
        en: "Welcome to the Indian Railways Track Maintenance & Signalling Safety Manual. Chapter 1 introduces permanent way engineering and broad gauge standards.",
        hi: "भारतीय रेल ट्रैक अनुरक्षण एवं सिग्नलिंग सुरक्षा मैन्युअल में आपका स्वागत है। अध्याय 1 स्थायी मार्ग घटकों का परिचय देता है।",
        te: "భారతీయ రైల్వే ట్రాక్ నిర్వహణ మరియు సిగ్నలింగ్ భద్రతా మాన్యువల్ కి స్వాగతం. అధ్యాయం 1 పర్మనెంట్ వే ఇంజనీరింగ్‌ను పరిచయం చేస్తుంది.",
      },
    },
    {
      id: "ch-rly-2",
      title: "Chapter 2 — Track Inspection, Gauge Tolerance & Ultrasonic Defect Detection",
      startPage: 22,
      diagramTitle: "USFD Ultrasonic Flaw Detection Probe Angles",
      diagramCaption:
        "USFD scanning: 0° probe detects horizontal head-web separation; 70° probes detect transverse fatigue fissures in the rail head.",
      takeaway:
        "Ultrasonic flaw detection prevents catastrophic rail fractures through early non-destructive identification of internal metallurgical defects.",
      paragraphs: [
        "Track integrity requires daily keyman inspections and regular automated track recording car (TRC) sweeps.",
        "Broad gauge tolerance on straight track permits -3 mm to +6 mm gauge variation under standard operating speeds.",
        "Ultrasonic Flaw Detection (USFD) operators sweep track with dual 0° and 70° transducer probes to detect sub-surface fatigue cracks.",
        "Defective rails are classified as IMR (Immediate Removal) or OBS (Observe & Clamp), triggering immediate protective speed restrictions.",
      ],
      conceptCheck: {
        question:
          "Which USFD probe angle is specifically designed to detect transverse fatigue cracks in the rail head?",
        options: ["0 degree probe", "45 degree probe", "70 degree probe", "90 degree probe"],
        correctIndex: 2,
        explanation:
          "70-degree ultrasonic probes propagate beams forward and backward through the rail head to intercept vertical transverse fissures.",
        skillTag: "railway-usfd-inspection",
      },
      narration: {
        en: "Chapter 2 examines track safety inspection and Ultrasonic Flaw Detection. USFD scanning ensures microscopic cracks are identified before fracture.",
        hi: "अध्याय 2 में ट्रैक निरीक्षण और अल्ट्रासोनिक दोष पहचान (USFD) प्रक्रिया को विस्तार से समझाया गया है।",
        te: "అధ్యాయం 2 ట్రాక్ తనిఖీ మరియు అల్ట్రాసోనిక్ లోప గుర్తింపు (USFD) పద్ధతులను వివరిస్తుంది.",
      },
    },
    {
      id: "ch-rly-3",
      title:
        "Chapter 3 — Railway Signalling, Interlocking Systems & Automatic Train Protection (Kavach)",
      startPage: 44,
      diagramTitle: "Kavach Automatic Train Protection Architecture",
      diagramCaption:
        "Kavach ATP: RFID tags on tracks, UHF radio transceivers, and loco brake controllers enforce automatic braking if an SPAD occurs.",
      takeaway:
        "Electronic interlocking and Kavach ATP eliminate collision risks by enforcing signal obedience through automated train brake interventions.",
      paragraphs: [
        "Railway signalling coordinates safe separation between trains using modern electronic interlocking (EI) systems with fail-safe architecture.",
        "Color-light signals convey speed authority: Green (proceed at speed), Double Yellow (proceed cautiously), Yellow (expect stop), and Red (absolute stop).",
        "Kavach is Indian Railways' indigenously developed Automatic Train Protection (ATP) system certified to Safety Integrity Level 4 (SIL-4).",
        "Kavach automatically applies emergency brakes if an engineer passes a Signal at Danger (SPAD) or approaches a speed restriction too rapidly.",
      ],
      conceptCheck: {
        question:
          "What safety action does the Kavach ATP system take if a train passes a signal at danger (red)?",
        options: [
          "Sounds an advisory chime only",
          "Automatically applies emergency train brakes to a complete stop",
          "Switches the locomotive to reverse",
          "Changes the signal light to yellow",
        ],
        correctIndex: 1,
        explanation:
          "Kavach enforces fail-safe braking directly on the locomotive pneumatic brake pipe, bringing the train to a complete stop without driver input.",
        skillTag: "kavach-signalling",
      },
      narration: {
        en: "Chapter 3 covers electronic interlocking and the indigenous Kavach ATP system, ensuring zero train collisions even in adverse fog conditions.",
        hi: "अध्याय 3 इलेक्ट्रॉनिक इंटरलॉकिंग और स्वदेशी कवच प्रणाली की कार्यप्रणाली समझाता है।",
        te: "అధ్యాయం 3 ఎలక్ట్రానిక్ ఇంటర్‌లాకింగ్ మరియు స్వదేశీ కవచ్ ఏటీపీ వ్యవస్థను వివరిస్తుంది.",
      },
    },
    {
      id: "ch-rly-4",
      title: "Chapter 4 — Trackside Safety Protocols, Lookout Duties & Emergency Work Rules",
      startPage: 66,
      diagramTitle: "Track Protection Banner & Detonator Placement",
      diagramCaption:
        "Emergency track protection: Place red banner flag at 600m; lay 3 detonators 10m apart at 1200m to alert approaching trains.",
      takeaway:
        "Zero accidents require strict personal protective discipline, designated lookouts with hooters, and standard distance-based track protection.",
      paragraphs: [
        "Track maintenance workers face severe hazards from high-speed trains traveling up to 130 km/h with silent electric traction.",
        "Every maintenance gang must deploy dedicated lookouts equipped with audible hooters and high-visibility retro-reflective jackets.",
        "When undertaking track renewal or emergency repairs, the line must be protected by placing a banner flag at 600 meters and three detonators at 1200 meters.",
        "Maintenance tools must be insulated to prevent accidental shunting of track circuits which could falsely trip green signals.",
      ],
      conceptCheck: {
        question:
          "In an emergency track obstruction, at what distance must the outer detonators be placed from the danger point on broad gauge?",
        options: ["100 meters", "600 meters", "1200 meters", "3000 meters"],
        correctIndex: 2,
        explanation:
          "Indian Railways General Rules specify three detonators placed 10 meters apart at 1200 meters (or 600m in exceptional circumstances) to warn trains.",
        skillTag: "railway-trackside-safety",
      },
      narration: {
        en: "Chapter 4 details essential trackside safety rules. Never step onto the track without a lookout, and know your emergency protection distances.",
        hi: "अध्याय 4 ट्रैक पर काम करने वाले कर्मचारियों की व्यक्तिगत सुरक्षा और आपातकालीन नियमों पर केंद्रित है।",
        te: "అధ్యాయం 4 ట్రాక్‌పై పనిచేసే సిబ్బంది భద్రతా నియమాలు మరియు అత్యవసర చర్యలను వివరిస్తుంది.",
      },
    },
  ],

  // BOOK 4: Digital Literacy & AI
  "eb-digital-cybersecurity": [
    {
      id: "ch-cs-1",
      title: "Chapter 1 — Computing Architecture, Operating Systems & Networks",
      startPage: 1,
      diagramTitle: "Von Neumann Architecture & Bus Data Flow",
      diagramCaption:
        "CPU executes the fetch-decode-execute cycle between ALU, Control Unit, Registers, and System RAM via 64-bit data and address buses.",
      takeaway:
        "Computers translate human logic into binary operations through hardware layers, operating system kernels, and protocol networks.",
      paragraphs: [
        "Modern computers are built upon the Von Neumann architecture, featuring a Central Processing Unit (CPU), memory, and input/output subsystems.",
        "The CPU continuously executes the fetch-decode-execute cycle at gigahertz clock speeds.",
        "The Operating System acts as the resource manager, scheduling threads, allocating virtual memory, and safeguarding file system permissions.",
        "The global Internet functions via the TCP/IP protocol suite, breaking information into routed packets transmitted across fiber-optic backbones.",
      ],
      conceptCheck: {
        question:
          "Which computer subsystem is responsible for executing arithmetic operations and logical comparisons?",
        options: [
          "Control Unit (CU)",
          "Arithmetic Logic Unit (ALU)",
          "Solid State Drive (SSD)",
          "Random Access Memory (RAM)",
        ],
        correctIndex: 1,
        explanation:
          "The Arithmetic Logic Unit (ALU) within the CPU executes all binary arithmetic (+, -, *, /) and boolean logic (AND, OR, NOT).",
        skillTag: "computer-architecture",
      },
      narration: {
        en: "Welcome to Digital Literacy and AI Foundations. Chapter 1 introduces computer architecture and the fetch-decode-execute cycle.",
        hi: "डिजिटल साक्षरता और एआई में आपका स्वागत है। अध्याय 1 कंप्यूटर आर्किटेक्चर और ऑपरेटिंग सिस्टम की बुनियादी समझ देता है।",
        te: "డిజిటల్ లిటరసీ మరియు ఏఐ అధ్యాయం 1 కి స్వాగతం. కంప్యూటర్ ఆర్కిటెక్చర్ మరియు ప్రాసెసర్ పనితీరును పరిచయం చేస్తుంది.",
      },
    },
    {
      id: "ch-cs-2",
      title: "Chapter 2 — Artificial Intelligence, Neural Networks & Machine Learning Foundations",
      startPage: 15,
      diagramTitle: "Deep Neural Network Architecture: Input, Hidden & Output Layers",
      diagramCaption:
        "Multi-layer perceptron: Input vector weights propagate forward through activation functions; loss gradients backpropagate to optimize weights.",
      takeaway:
        "Artificial Intelligence does not reason like a human mind; it optimizes mathematical weight tensors to recognize complex patterns in high-dimensional data.",
      paragraphs: [
        "Machine Learning represents a fundamental paradigm shift from rule-based programming to empirical pattern recognition.",
        "Instead of writing explicit IF-THEN rules, algorithms adjust internal numerical parameters (weights and biases) using training examples.",
        "Deep Learning utilizes layered artificial neural networks capable of learning hierarchical representations of text, images, and audio.",
        "Large Language Models (LLMs) rely on the Transformer architecture with self-attention mechanisms to predict sequence tokens based on context.",
      ],
      conceptCheck: {
        question:
          "What core mechanism allows Transformer neural models to assess relationships between all words in a sentence simultaneously?",
        options: [
          "Sequential recursion",
          "Self-attention mechanism",
          "Relational database joins",
          "Linear regression",
        ],
        correctIndex: 1,
        explanation:
          "The self-attention mechanism computes pairwise attention scores between all tokens in a sequence, allowing the model to understand context holistically.",
        skillTag: "ai-transformer-models",
      },
      narration: {
        en: "Chapter 2 demystifies artificial intelligence. Machine learning learns statistical weights from data rather than hardcoded rules.",
        hi: "अध्याय 2 में हम कृत्रिम बुद्धिमत्ता (AI) और न्यूरल नेटवर्क की कार्यप्रणाली को सरल भाषा में समझते हैं।",
        te: "అధ్యాయం 2 కృత్రిమ మేధస్సు (AI) మరియు న్యూరల్ నెట్‌వర్క్‌ల మౌలిక అంశాలను వివరిస్తుంది.",
      },
    },
    {
      id: "ch-cs-3",
      title: "Chapter 3 — Cybersecurity Essentials: Phishing, Passwords, Encryption & MFA",
      startPage: 30,
      diagramTitle: "Asymmetric Public-Key Cryptography",
      diagramCaption:
        "Public key encrypts plaintext; only the matched private key held securely by the recipient can decrypt the ciphertext.",
      takeaway:
        "Modern cybersecurity balances cryptographic mathematics (AES-256, RSA) with human vigilance against social engineering.",
      paragraphs: [
        "Cybersecurity protects digital systems, networks, and confidential data from unauthorized access or malicious destruction.",
        "Social engineering attacks, such as phishing, deceive users into divulging passwords or credentials by impersonating legitimate authorities.",
        "Multi-Factor Authentication (MFA) requires two or more verification factors: something you know (password), something you have (phone/token), or something you are (biometrics).",
        "Public-key cryptography uses matched mathematical key pairs: a public key for encryption and a secret private key for decryption.",
      ],
      conceptCheck: {
        question:
          "Which of the following represents the strongest defense against credential theft via password guessing or database breaches?",
        options: [
          "Changing passwords every Monday to simple words",
          "Multi-Factor Authentication (MFA) with authenticator apps",
          "Sharing your password with team members",
          "Saving passwords in plain text on your desktop",
        ],
        correctIndex: 1,
        explanation:
          "MFA blocks over 99% of automated credential stuffing and password guessing attacks because attackers lack the second hardware factor.",
        skillTag: "cybersecurity-mfa",
      },
      narration: {
        en: "Chapter 3 covers cybersecurity best practices. Always enable multi-factor authentication and verify email links before clicking.",
        hi: "अध्याय 3 में साइबर सुरक्षा, पासवर्ड सुरक्षा और फ़िशिंग हमलों से बचाव के उपाय बताए गए हैं।",
        te: "అధ్యాయం 3 సైబర్ భద్రత, బలమైన పాస్‌వర్డ్‌లు మరియు ఫిషింగ్ నుండి రక్షణ చర్యలను చర్చిస్తుంది.",
      },
    },
    {
      id: "ch-cs-4",
      title: "Chapter 4 — Ethical Computing, Data Privacy (DPDP Act) & Digital Citizenship",
      startPage: 44,
      diagramTitle: "India's Digital Personal Data Protection (DPDP) Act Rights",
      diagramCaption:
        "Citizen rights under DPDP: Right to access data, right to correction, right to grievance redressal, and right to withdraw consent.",
      takeaway:
        "Responsible digital citizenship requires ethical awareness, respecting intellectual property, and safeguarding personal privacy online.",
      paragraphs: [
        "With rapid digital transformation comes the imperative for ethical stewardship of algorithms and user data.",
        "India's Digital Personal Data Protection (DPDP) Act establishes strict consent mandates for processing citizen information.",
        "Organizations must enforce data minimization: collecting only the minimum data required for a stated legitimate purpose.",
        "Digital citizens must practice responsible information verification, avoiding the viral spread of synthetic deepfakes and disinformation.",
      ],
      conceptCheck: {
        question:
          "Under data privacy laws such as India's DPDP Act, what principle states that platforms should collect only necessary data for a specific purpose?",
        options: [
          "Data maximization",
          "Data minimization",
          "Open harvesting",
          "Indefinite storage",
        ],
        correctIndex: 1,
        explanation:
          "Data minimization requires data fiduciaries to collect only the bare minimum personal data necessary to fulfill the specific legitimate service.",
        skillTag: "data-privacy-ethics",
      },
      narration: {
        en: "Chapter 4 examines data privacy and digital ethics. Always protect your personal data and respect the privacy rights of others.",
        hi: "अध्याय 4 डिजिटल नैतिकता और भारत के डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम के अधिकारों की व्याख्या करता है।",
        te: "అధ్యాయం 4 డేటా గోప్యత మరియు డిజిటల్ పౌరసత్వ నియమాలను వివరిస్తుంది.",
      },
    },
  ],

  // BOOK 5: Niti & Life Values
  "eb-niti-ethics": [
    {
      id: "ch-val-1",
      title: "Chapter 1 — Satya & Dharma: Truthfulness and Moral Responsibility in Daily Life",
      startPage: 1,
      diagramTitle: "The Pillar of Dharma: Conscience, Action & Social Harmony",
      diagramCaption:
        "Satya (truth in thought, speech, and deed) aligned with Dharma (duty to family, community, and nation) builds enduring personal integrity.",
      takeaway:
        "Moral character is founded on consistent truthfulness, personal accountability, and fulfilling one's obligations to others.",
      paragraphs: [
        "In Indian philosophical traditions, Satya (truthfulness) and Dharma (righteous duty) form the bedrock of ethical existence.",
        "Satya extends beyond refraining from factual falsehood; it demands consistency between what one thinks, speaks, and performs.",
        "Dharma represents the universal moral order that sustains family, community, and civilization.",
        "In student life, practicing Satya means taking honest responsibility for one's academic work and standing up against unfair practices.",
      ],
      conceptCheck: {
        question:
          "In ethical decision-making, what does the principle of 'Satya' demand beyond merely speaking factual words?",
        options: [
          "Speaking loudly in debate",
          "Harmony between thought, word, and righteous action",
          "Agreeing with the majority at all costs",
          "Avoiding all difficult conversations",
        ],
        correctIndex: 1,
        explanation:
          "Classical ethics defines Satya as the harmony of Manasa, Vacha, and Karmana — pure thought, truthful speech, and righteous conduct.",
        skillTag: "moral-integrity",
      },
      narration: {
        en: "Welcome to Niti and Life Values. Chapter 1 explores Satya and Dharma: the foundations of truth and moral responsibility.",
        hi: "नीति एवं जीवन मूल्य में आपका स्वागत है। अध्याय 1 सत्य और धर्म के सिद्धांतों को जीवन में अपनाने की प्रेरणा देता है।",
        te: "నీతి మరియు జీవన విలువలు అధ్యాయం 1 కి స్వాగతం. సత్యం మరియు ధర్మం మన జీవితంలో ఎలా మార్గనిర్దేశం చేయాలో వివరిస్తుంది.",
      },
    },
    {
      id: "ch-val-2",
      title: "Chapter 2 — Seva & Karuna: Compassion, Community Service and Social Empathy",
      startPage: 14,
      diagramTitle: "The Cycle of Seva: Empathy to Civic Action",
      diagramCaption:
        "Recognizing distress in others (Karuna) inspires selfless service (Seva), strengthening the collective social fabric of the community.",
      takeaway:
        "True strength of character is measured not by personal status, but by the compassion shown to the vulnerable and service to society.",
      paragraphs: [
        "Karuna is active empathy: the capacity to feel another person's difficulty and the genuine urge to alleviate it.",
        "Seva represents selfless service rendered without expectations of reward or social applause.",
        "Great leaders throughout history, from Swami Vivekananda to Mahatma Gandhi, emphasized that youth develop true leadership through community service.",
        "Simple everyday acts — helping an injured stray animal, mentoring a younger classmate, or organizing neighborhood cleanliness — embody living Seva.",
      ],
      conceptCheck: {
        question:
          "What distinguishes genuine 'Seva' (selfless service) from ordinary commercial transactions?",
        options: [
          "Seva is done only for personal financial gain",
          "Seva is performed selflessly for community welfare without expectation of return",
          "Seva is only done when ordered by authorities",
          "Seva must be advertised on social media",
        ],
        correctIndex: 1,
        explanation:
          "The defining hallmark of Seva is Nishkama Karma: selfless action dedicated to the welfare of others without selfish motives.",
        skillTag: "compassion-service",
      },
      narration: {
        en: "Chapter 2 reflects on Seva and Karuna. Compassion becomes meaningful only when translated into active service for those in need.",
        hi: "अध्याय 2 सेवा और करुणा के महत्व पर प्रकाश डालता है। निःस्वार्थ सेवा ही मानव जीवन को सार्थक बनाती है।",
        te: "అధ్యాయం 2 సేవ మరియు కరుణ యొక్క విశిష్టతను వివరిస్తుంది. సమాజ సేవ ద్వారా నాయకత్వ లక్షణాలు అలవడతాయి.",
      },
    },
    {
      id: "ch-val-3",
      title: "Chapter 3 — Vidya & Vinaya: Knowledge, Humility and the Scientific Temper",
      startPage: 28,
      diagramTitle: "Vidya Dadati Vinayam (Knowledge Generates Humility)",
      diagramCaption:
        "True learning broadens awareness of what remains unknown, replacing intellectual arrogance with modest inquiry and scientific temper.",
      takeaway:
        "The ancient proverb 'Vidya Dadati Vinayam' reminds us that real wisdom produces humility, openness, and rational inquiry.",
      paragraphs: [
        "The Sanskrit aphorism 'Vidya Dadati Vinayam' encapsulates the ultimate objective of true education: wisdom breeds humility.",
        "Arrogance is the enemy of intellectual progress; assuming one already knows everything closes the door to further learning.",
        "A scientific temper encourages asking thoughtful questions, testing evidence objectively, and respecting diverse viewpoints.",
        "A truly educated student listens attentively to others, admits errors gracefully, and applies their intellect for the public good.",
      ],
      conceptCheck: {
        question:
          "According to the Indian educational ideal 'Vidya Dadati Vinayam', what virtue naturally blossoms as one acquires true knowledge?",
        options: [
          "Pride and arrogance",
          "Humility and respectfulness (Vinaya)",
          "Wealth accumulation",
          "Fear of questioning",
        ],
        correctIndex: 1,
        explanation:
          "As knowledge deepens, an educated person recognizes the vastness of the universe and naturally develops humility (Vinaya).",
        skillTag: "wisdom-humility",
      },
      narration: {
        en: "Chapter 3 discusses Vidya and Vinaya. Knowledge should cultivate humility, curiosity, and an open scientific temper.",
        hi: "अध्याय 3 'विद्या ददाति विनयं' के शाश्वत संदेश की व्याख्या करता है: सच्चा ज्ञान विनम्रता सिखाता है।",
        te: "అధ్యాయం 3 'విద్యా దదాతి వినయం' సూక్తిని చర్చిస్తుంది: నిజమైన జ్ఞానం వినయాన్ని ప్రసాదిస్తుంది.",
      },
    },
    {
      id: "ch-val-4",
      title: "Chapter 4 — Samata & Shanti: Equality, Environmental Harmony and Conflict Resolution",
      startPage: 40,
      diagramTitle: "Vasudhaiva Kutumbakam: Universal Family & Environmental Balance",
      diagramCaption:
        "Ecological and social equilibrium: Treating all human beings as equals and preserving nature's balance for future generations.",
      takeaway:
        "Living in peace requires treating all citizens with equal dignity, resolving interpersonal conflicts through dialogue, and caring for Mother Earth.",
      paragraphs: [
        "Peace (Shanti) is not merely the absence of war; it is a positive state of social justice, mental tranquility, and mutual respect.",
        "Samata (equality) asserts the fundamental dignity of every human being, regardless of gender, caste, language, or socioeconomic background.",
        "The Indian vision of 'Vasudhaiva Kutumbakam' (the world is one family) extends our ethical responsibility to our natural environment.",
        "When disagreements arise in schools or communities, constructive dialogue, empathy, and active listening resolve conflicts without violence.",
      ],
      conceptCheck: {
        question: "What is the core philosophical meaning of the phrase 'Vasudhaiva Kutumbakam'?",
        options: [
          "Only family members deserve respect",
          "The entire world is one unified family",
          "Competition is more important than cooperation",
          "Nature can be exploited without limits",
        ],
        correctIndex: 1,
        explanation:
          "'Vasudhaiva Kutumbakam' (from Maha Upanishad) teaches that the entire earth and all living beings constitute one single interconnected family.",
        skillTag: "universal-peace",
      },
      narration: {
        en: "Chapter 4 concludes with Samata and Shanti. Equality and environmental stewardship create enduring peace for future generations.",
        hi: "अध्याय 4 समता, शांति और 'वसुधैव कुटुम्बकम्' के वैश्विक मूल्य की सीख देता है।",
        te: "అధ్యాయం 4 సమత, శాంతి మరియు 'వసుధైవ కుటుంబకం' భావనను వివరిస్తుంది.",
      },
    },
  ],
  "eb-wiring": [
    {
      id: "ch-1",
      title: "Chapter 1 — Supply to the home",
      startPage: 1,
      takeaway:
        "Power reaches the home through the main service cable and passes through the meter to the distribution board.",
      paragraphs: [
        "Power reaches a home through the service cable from the supply company. It ends at the meter and the main switch.",
        "After the main switch, the supply goes to the distribution board. Every circuit in the home starts here.",
        "Each circuit has its own MCB. If one circuit has a fault, only that circuit switches off.",
        "Always find the main switch before you start work. You must know how to isolate the whole home.",
      ],
      conceptCheck: {
        question:
          "Where should you isolate the electrical supply before beginning maintenance work?",
        options: [
          "At the sub-socket",
          "At the main double-pole isolator switch",
          "By removing the appliance fuse only",
          "At the consumer light switch",
        ],
        correctIndex: 1,
        explanation:
          "Always isolate at the main double-pole isolator switch to ensure the entire installation is safely de-energized.",
        skillTag: "isolation-safety",
      },
      narration: {
        en: "Chapter 1 introduces electrical service entrance and isolation procedures.",
      },
    },
    {
      id: "ch-2",
      title: "Chapter 2 — Ring and radial circuits",
      startPage: 14,
      takeaway:
        "Understand the topology differences between radial single-path runs and ring continuous loop circuits.",
      paragraphs: [
        "A radial circuit starts at the distribution board and runs out to each point, one after another. It ends at the last point.",
        "A ring circuit starts and ends at the same MCB. The cable goes around the sockets and comes back, so current has two paths.",
        "Choose the cable size for the load. Lighting circuits often use 1.5 sq mm cable. Socket circuits for heavier loads use 2.5 sq mm or 4 sq mm.",
        "At the distribution board, every circuit's earth wire joins the main earth bar. The earth bar connects to the earth electrode outside the home.",
      ],
      conceptCheck: {
        question: "What differentiates a ring final circuit from a radial circuit?",
        options: [
          "A ring circuit starts and returns to the same protective device",
          "A ring circuit has no earth wire",
          "A radial circuit carries current in two parallel directions",
          "A ring circuit is only used for low-voltage bells",
        ],
        correctIndex: 0,
        explanation:
          "A ring circuit loops from the breaker through all socket outlets and returns to the identical breaker.",
        skillTag: "circuit-topology",
      },
      narration: { en: "Chapter 2 covers ring and radial wiring configurations." },
    },
    {
      id: "ch-3",
      title: "Chapter 3 — Testing before switching on",
      startPage: 31,
      takeaway: "Conduct continuity and insulation resistance tests before energizing any circuit.",
      paragraphs: [
        "Test every new circuit before you connect the supply. Testing finds faults while it is still safe.",
        "First, do a continuity test on the live, neutral and earth wires. Each wire must be unbroken from end to end.",
        "Next, test the insulation between the wires. Good insulation shows a very high resistance.",
        "Only switch on when every test passes. Write the results down for the record.",
      ],
      conceptCheck: {
        question: "What does an insulation resistance test measure?",
        options: [
          "The length of copper wire in metres",
          "The resistance between current-carrying conductors and earth to verify insulation integrity",
          "The supply voltage from the grid",
          "The trip speed of the MCB",
        ],
        correctIndex: 1,
        explanation:
          "Insulation testing verifies there is no breakdown or current leakage between insulated cores and ground.",
        skillTag: "dead-testing",
      },
      narration: { en: "Chapter 3 explains mandatory pre-energization testing protocols." },
    },
  ],
  "eb-earthing": [
    {
      id: "ch-1",
      title: "Chapter 1 — Why earthing matters",
      startPage: 1,
      takeaway:
        "Earthing provides a low-resistance path to trigger protective breakers during faults.",
      paragraphs: [
        "This chapter introduces the topic in short, simple steps.",
        "Read each part slowly. Say the key words to yourself.",
        "Look at the pictures in your class lessons as you read.",
        "When you finish, practise with a quiz.",
      ],
      conceptCheck: {
        question: "Why is protective earthing essential?",
        options: [
          "To save electricity",
          "To safely conduct fault current and trip breakers",
          "To brighten lamps",
          "To cool cables",
        ],
        correctIndex: 1,
        explanation:
          "Protective earthing routes fault current to ground to trigger breakers instantly.",
        skillTag: "earthing",
      },
      narration: { en: "Chapter 1 reviews earthing fundamentals." },
    },
  ],
  "eb-instruments": [
    {
      id: "ch-1",
      title: "Chapter 1 — Your first tester",
      startPage: 1,
      takeaway: "Using multimeters, voltage indicators, and insulation resistance testers safely.",
      paragraphs: [
        "This chapter introduces the topic in short, simple steps.",
        "Read each part slowly. Say the key words to yourself.",
        "Look at the pictures in your class lessons as you read.",
        "When you finish, practise with a quiz.",
      ],
      conceptCheck: {
        question: "What should you check before measuring voltage with a test meter?",
        options: [
          "Check the tester on a known live source to verify functionality",
          "Leave the tester in current (Amps) mode",
          "Measure with uninsulated probes",
          "Test in damp conditions",
        ],
        correctIndex: 0,
        explanation: "Always test your tester on a known proving unit before taking measurements.",
        skillTag: "safe-isolation",
      },
      narration: { en: "Chapter 1 explains instrument selection and verification." },
    },
  ],
};
