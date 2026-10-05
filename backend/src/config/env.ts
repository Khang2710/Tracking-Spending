import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  FRONTEND_ORIGINS: z.string().default("http://localhost:5173,http://127.0.0.1:5173"),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
});

export interface BackendConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  supabaseUrl: string;
  supabasePublishableKey: string;
  frontendOrigins: string[];
  groqApiKey?: string;
  openRouterApiKey?: string;
}

function cleanOptionalSecret(value?: string): string | undefined {
  const clean = value?.trim();
  if (!clean || clean === "undefined" || clean === "null") return undefined;
  return clean;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): BackendConfig {
  const value = envSchema.parse(source);
  return {
    nodeEnv: value.NODE_ENV,
    port: value.PORT,
    supabaseUrl: value.SUPABASE_URL,
    supabasePublishableKey: value.SUPABASE_PUBLISHABLE_KEY,
    frontendOrigins: value.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
    groqApiKey: cleanOptionalSecret(value.GROQ_API_KEY),
    openRouterApiKey: cleanOptionalSecret(value.OPENROUTER_API_KEY),
  };
}
