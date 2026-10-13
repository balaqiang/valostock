import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Service-role client: Auth admin API (sign out, update password). Server only. */
export const supabaseAdmin: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);

/**
 * A fresh anon client for one auth call (sign up, sign in, refresh).
 * Nothing is persisted: the API keeps the tokens in httpOnly cookies itself.
 */
export function authClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, options);
}
