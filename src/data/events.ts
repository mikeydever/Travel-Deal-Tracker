import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";

export interface EventRow {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  notes?: string | null;
  updated_at?: string;
}

const SELECT_FIELDS = "id, name, location, start_date, end_date, notes, updated_at";

export const getEventsInRange = async (params: {
  start: string;
  end: string;
}): Promise<EventRow[]> => {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("events")
    .select(SELECT_FIELDS)
    .lte("start_date", params.end)
    .gte("end_date", params.start)
    .order("start_date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as EventRow[]) ?? [];
};
