/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_OPENAI_KEY?: string;
  readonly VITE_GROQ_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
