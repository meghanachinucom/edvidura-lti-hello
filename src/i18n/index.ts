import en from "./en.json";

/** Single text helper. All user-facing strings live in en.json. Supports {name} placeholders. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, en);
  let out = typeof value === "string" ? value : key;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}
