/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_LLM_BASE_URL?: string;
  readonly VITE_LLM_MODEL?: string;
  readonly VITE_ANTHROPIC_API_KEY?: string;
  readonly VITE_ANTHROPIC_MODEL?: string;
  readonly VITE_MESHY_API_KEY?: string;
}

declare const __EDV_ANTHROPIC_PROXY__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
