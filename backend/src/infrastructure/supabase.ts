import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

interface SupabaseConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

const serverAuthOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
} as const;

export function createTokenVerifier(config: SupabaseConfig) {
  const authClient = createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
    serverAuthOptions,
  );

  return async (accessToken: string): Promise<Pick<User, "id"> | null> => {
    const { data, error } = await authClient.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return { id: data.user.id };
  };
}

export function createUserSupabaseClient(
  config: SupabaseConfig,
  accessToken: string,
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    ...serverAuthOptions,
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
