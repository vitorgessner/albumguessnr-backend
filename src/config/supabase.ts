import { createClient } from '@supabase/supabase-js';
import { env } from '../app';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_API_KEY);
