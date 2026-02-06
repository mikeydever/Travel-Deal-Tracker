import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let sharedBrowserClient: SupabaseClient | null = null;
let sharedServiceClient: SupabaseClient | null = null;

const getCredentials = () => {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase credentials are not configured");
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
};

export const getSupabaseBrowserClient = () => {
  if (sharedBrowserClient) {
    return sharedBrowserClient;
  }

  const { url, anonKey } = getCredentials();
  sharedBrowserClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });

  return sharedBrowserClient;
};

export const getSupabaseServiceRoleClient = () => {
  if (sharedServiceClient) {
    return sharedServiceClient;
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Attempted to use service role without SUPABASE_SERVICE_ROLE_KEY");
  }

  const { url } = getCredentials();
  sharedServiceClient = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY);

  return sharedServiceClient;
};
