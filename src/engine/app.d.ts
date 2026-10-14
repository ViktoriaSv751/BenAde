import type { SupabaseClient } from "@supabase/supabase-js";
export interface EngineContext {
  supabase: SupabaseClient;
  user: { id: string; email: string; user_metadata?: { full_name?: string } };
  signOut(): Promise<void>;
  changePassword(password: string): Promise<string | null>;
  deleteAccount(): Promise<string | null>;
}
export function mountApp(root: HTMLElement, ctx: EngineContext): { destroy(): void };
