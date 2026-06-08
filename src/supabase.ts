import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? "https://demo.placeholder.supabase.co",
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "demo-anon-key",
);
