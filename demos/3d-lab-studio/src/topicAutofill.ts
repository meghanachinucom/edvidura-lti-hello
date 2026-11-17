/**
 * Teachers often type only a short title. Expand it into a usable chapter draft
 * so Develop can build callouts + interactive 3D without a full prompt.
 */

export type TopicAutofill = {
  title: string;
  body: string;
  /** True when we wrote/expanded the body from a short title. */
  autofilled: boolean;
};

type Seed = { title: string; body: string; match: RegExp };

const SEEDS: Seed[] = [
  {
    match: /volcano|lava|magma|erupt/,
    title: 'Volcanoes',
    body: `## Volcanoes

A volcano is an opening in the Earth’s crust. Magma rises from a magma chamber through a vent. During an eruption, lava, ash, and gases come out of the crater.

Students should name the magma chamber, vent/crater, and lava flow, and explain what happens in an eruption.`,
  },
  {
    match: /cyclone|hurricane|typhoon|eyewall|eye wall|landfall/,
    title: 'Cyclones',
    body: `## Cyclones — form, strengthen, hit land

Cyclones form over warm ocean water (about 26.5°C or more). Heat and moisture rise, a low-pressure centre develops, and winds begin to spiral. Over the open sea the storm strengthens: the eyewall holds the fiercest winds and rain bands spread outward.

When the cyclone hits land (landfall), it loses the warm-water energy source, winds usually weaken, but heavy rain and flooding can still hit the coast and inland areas.

Students should: (1) explain formation over warm seas, (2) describe strengthening (eye, eyewall, rain bands), (3) say what changes at landfall.`,
  },
  {
    match: /chemical\s*reaction|reactant|exothermic|endothermic/,
    title: 'Chemical reactions',
    body: `## Chemical reactions

In a chemical reaction, reactants change into products. Bonds in the starting substances break and new bonds form. Heating often makes particles move faster so the reaction progresses more quickly (classroom demo language).

Students should name reactants, the reaction step, and products, and see how temperature changes reaction progress.`,
  },
  {
    match: /water\s*cycle|evaporat|condens|monsoon|precipitat/,
    title: 'Water cycle and our rains',
    body: `## Water cycle (Class 6–7)

Water evaporates from the sea, rises as vapour, cools into clouds (condensation), and returns as rain (precipitation) — the pattern behind India’s monsoon and crops.

Trace evaporation → condensation → rain, and say why monsoon matters for farming.`,
  },
  {
    match: /photosynth|chlorophyll|stomata|nutrition in plants/,
    title: 'Nutrition in plants — photosynthesis',
    body: `## Photosynthesis (Class 7)

Green plants make food using sunlight, carbon dioxide, and water. Chlorophyll in leaves helps capture light. Oxygen is released as a by-product.

Name sunlight, leaf/chlorophyll, and oxygen, and explain what each contributes.`,
  },
  {
    match: /digest|oesophagus|esophagus|stomach|intestine|bolus/,
    title: 'Nutrition in animals — digestion',
    body: `## Human digestive system (Class 7)

Food passes mouth → food pipe (oesophagus) → stomach → small intestine → large intestine.

Follow the path and say what happens in the stomach and small intestine.`,
  },
  {
    match: /\bcell\b|nucleus|mitochondr|organelle|plasma membrane|fundamental unit/,
    title: 'The fundamental unit of life',
    body: `## Cell structure (Class 9)

The cell is the basic unit of life. The nucleus controls the cell. Mitochondria release energy. The plasma membrane controls what enters and leaves.

Match nucleus, mitochondria, and membrane with their jobs.`,
  },
  {
    match: /force|newton|accelerat|laws of motion|friction/,
    title: 'Force and laws of motion',
    body: `## Force and motion (Class 9)

A force can change the speed or direction of an object. For the same mass, a larger force produces a larger acceleration. Newton’s second law: F = m × a.

Change mass and force and notice how acceleration changes when friction is small.`,
  },
  {
    match: /circuit|battery|bulb|switch|current|voltage|electric/,
    title: 'Electric current and its effects',
    body: `## Circuit (Class 7 / 10)

Current flows only in a closed path. Battery → bulb → switch → back to battery.

Close the switch to complete the circuit. Open it and the bulb goes off.`,
  },
  {
    match: /fraction|numerator|denominator|equal parts/,
    title: 'Fractions — parts of a whole',
    body: `## Fractions (Class 6)

A fraction shows equal parts of a whole. In ¾, the denominator 4 means four equal parts; the numerator 3 means three parts are taken.

Identify whole, numerator, and denominator on the bar model.`,
  },
  {
    match: /mirror|reflect|incidence|ray of light/,
    title: 'Light — reflection at a plane mirror',
    body: `## Reflection of light (Class 8 / 10)

On a plane mirror, angle of incidence equals angle of reflection (i = r). The normal is perpendicular to the mirror.

Identify incident ray, normal, and reflected ray.`,
  },
  {
    match: /solar\s*system|planet|orbit|sun and earth/,
    title: 'Solar system',
    body: `## Solar system

The Sun is at the centre. Earth and other planets move in orbits around the Sun. Day and night come from Earth’s rotation; seasons relate to revolution and tilt.

Name the Sun, Earth, and orbit, and say what an orbit is.`,
  },
  {
    match: /heart|circulat|blood vessel|cardiac/,
    title: 'Human heart and circulation',
    body: `## Heart and blood circulation

The heart pumps blood through chambers and valves. Blood carries oxygen and nutrients to the body and returns carbon dioxide to the lungs.

Describe chambers, blood flow, and valves in simple school language.`,
  },
  {
    match: /earthquake|seismic|tectonic|fault/,
    title: 'Earthquakes',
    body: `## Earthquakes

An earthquake is shaking of the ground caused by sudden movement of rocks along a fault. Seismic waves travel outward from the focus; the epicentre is above it on the surface.

Name focus, epicentre, and seismic waves, and say why some places feel stronger shaking.`,
  },
  {
    match: /plant\s*cell|leaf|transpiration|root\s*hair/,
    title: 'Plant parts and functions',
    body: `## Plant parts

Roots absorb water and minerals. Stem transports materials. Leaves make food. Flowers help in reproduction.

Match root, stem, and leaf with their main jobs.`,
  },
];

const BODY_ENOUGH = 40;

function titleCaseTopic(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return 'Chapter lab';
  return s
    .split(' ')
    .map((w) => (w.length <= 2 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ')
    .slice(0, 80);
}

function genericBody(topic: string): string {
  return `## ${topic}

Students explore ${topic} in class. Identify the main parts or ideas, how the process or system works, and why it matters in everyday life or the environment.

1. Name three important parts or ideas in ${topic}.
2. Explain one cause-and-effect step.
3. Give one classroom or real-life example.`;
}

/**
 * If the teacher only typed a short title (or a thin body), fill a full chapter draft.
 * Never replaces a substantial teacher-written body.
 */
export function autofillFromShortTitle(title: string, body: string): TopicAutofill {
  const t = (title || '').trim();
  const b = (body || '').trim();
  const topicRaw = t || b.split('\n')[0]?.replace(/^#+\s*/, '').trim() || '';
  const hay = `${t}\n${b}`.toLowerCase();

  if (b.length >= BODY_ENOUGH) {
    return { title: t || titleCaseTopic(topicRaw) || 'Chapter lab', body: b, autofilled: false };
  }

  const seed = SEEDS.find((s) => s.match.test(hay) || s.match.test(topicRaw.toLowerCase()));
  if (seed) {
    return {
      title: t || seed.title,
      body: seed.body,
      autofilled: true,
    };
  }

  const topic = titleCaseTopic(topicRaw || 'Classroom topic');
  return {
    title: t || topic,
    body: genericBody(topic),
    autofilled: true,
  };
}
