import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True khi cả 2 env vars đã được cấu hình trong .env.local */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    "[Supabase] Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example → .env.local, điền credentials từ Supabase Dashboard (Settings → API) rồi restart dev server."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,     // tự lưu session vào localStorage
      autoRefreshToken: true,   // tự refresh token khi sắp hết hạn
      detectSessionInUrl: true, // xử lý redirect OAuth / magic link về /login
    },
  }
);
