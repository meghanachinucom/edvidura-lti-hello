export interface Institute { name: string; shortName: string; code: string; moodleSite: string }

export const institute: Institute = {
  name: "Suryamala Industrial Training Institute",
  shortName: "Suryamala ITI",
  code: "SITI-DEMO",
  moodleSite: "https://moodle.example.org",
};

/** Moodle settings shown after "Create connect link". Placeholder domain only. */
export const toolBase = "https://edvidura.example.test";
export const moodleSettings = [
  { key: "toolUrl", value: `${toolBase}/lti/launch` },
  { key: "loginUrl", value: `${toolBase}/lti/login` },
  { key: "keysetUrl", value: `${toolBase}/lti/keys` },
  { key: "redirectUrl", value: `${toolBase}/lti/launch` },
  { key: "registrationUrl", value: `${toolBase}/lti/register` },
] as const;

/** SH-05 deep-link options. */
export const deepLinkOptions = ["hub", "lessons", "ebooks", "quiz"] as const;
