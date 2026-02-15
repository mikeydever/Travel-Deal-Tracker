type RequiredKey = "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY";
type OptionalKey =
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "FLIGHT_API_KEY"
  | "HOTEL_API_KEY"
  | "TRAVELPAYOUTS_API_TOKEN"
  | "TRAVELPAYOUTS_MARKER"
  | "TRAVELPAYOUTS_TRS"
  | "CRON_SECRET"
  | "RESEND_API_KEY"
  | "ALERT_EMAIL_TO"
  | "PEXELS_API_KEY"
  | "BRAVE_SEARCH_API_KEY"
  | "OPENAI_API_KEY"
  | "FLIGHT_API_DISABLED_UNTIL"
  | "VIATOR_API_KEY"
  | "VIATOR_API_BASE";

const warn = (message: string) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[env] ${message}`);
  }
};

const readEnv = <K extends string>(key: K, options?: { required?: boolean }) => {
  const value = process.env[key];
  if (!value && options?.required) {
    const base = `Missing required env var: ${key}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(base);
    }
    warn(base);
  }
  return value ?? "";
};

export const env: Record<RequiredKey | OptionalKey, string> = {
  NEXT_PUBLIC_SUPABASE_URL: readEnv("NEXT_PUBLIC_SUPABASE_URL", { required: true }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", { required: true }),
  SUPABASE_SERVICE_ROLE_KEY: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  FLIGHT_API_KEY: readEnv("FLIGHT_API_KEY"),
  HOTEL_API_KEY: readEnv("HOTEL_API_KEY"),
  TRAVELPAYOUTS_API_TOKEN: readEnv("TRAVELPAYOUTS_API_TOKEN"),
  TRAVELPAYOUTS_MARKER: readEnv("TRAVELPAYOUTS_MARKER"),
  TRAVELPAYOUTS_TRS: readEnv("TRAVELPAYOUTS_TRS"),
  CRON_SECRET: readEnv("CRON_SECRET"),
  RESEND_API_KEY: readEnv("RESEND_API_KEY"),
  ALERT_EMAIL_TO: readEnv("ALERT_EMAIL_TO"),
  PEXELS_API_KEY: readEnv("PEXELS_API_KEY"),
  BRAVE_SEARCH_API_KEY: readEnv("BRAVE_SEARCH_API_KEY"),
  OPENAI_API_KEY: readEnv("OPENAI_API_KEY"),
  FLIGHT_API_DISABLED_UNTIL: readEnv("FLIGHT_API_DISABLED_UNTIL"),
  VIATOR_API_KEY: readEnv("VIATOR_API_KEY"),
  VIATOR_API_BASE: readEnv("VIATOR_API_BASE"),
};

export type Env = typeof env;
