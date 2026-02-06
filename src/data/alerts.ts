import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";

export interface AlertLogInput {
  type: string;
  message: string;
}

export const recordAlertLog = async (input: AlertLogInput) => {
  const client = getSupabaseServiceRoleClient();
  const payload = {
    type: input.type,
    message: input.message,
  };

  const { data, error } = await client
    .from("alerts_log")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to write alert log: ${error.message}`);
  }

  return data;
};

export const hasRecentAlert = async (type: string, withinHours = 24) => {
  const client = getSupabaseServiceRoleClient();
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("alerts_log")
    .select("id")
    .eq("type", type)
    .gte("triggered_at", since)
    .limit(1);

  if (error) {
    console.warn(`[alerts] failed to check recent alerts for ${type}`, error);
    return false;
  }

  return Boolean(data && data.length);
};
