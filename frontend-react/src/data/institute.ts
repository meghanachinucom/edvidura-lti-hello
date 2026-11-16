export interface Institute {
  name: string;
  shortName: string;
  code: string;
  moodleSite: string;
}

export const institute: Institute = {
  name: "Riverside High School",
  shortName: "Riverside High",
  code: "RIVERSIDE",
  moodleSite: "http://localhost:8085",
};

/** Moodle settings shown after "Create connect link". Local development environment. */
export const toolBase = "http://localhost:8000";
export const moodleSettings = [
  { key: "toolUrl", value: `${toolBase}/lti/launch` },
  { key: "loginUrl", value: `${toolBase}/lti/login` },
  { key: "keysetUrl", value: `${toolBase}/.well-known/jwks.json` },
  { key: "redirectUrl", value: `${toolBase}/lti/launch` },
  { key: "registrationUrl", value: `${toolBase}/lti/register` },
] as const;

/** SH-05 deep-link options. */
export const deepLinkOptions = ["hub", "lessons", "ebooks", "quiz"] as const;
