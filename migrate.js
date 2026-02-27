import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xhddbaqcagmwwbltfgqr.supabase.co';
// Need the service role key to execute DDL ALTER TABLE, which we don't naturally have in .env if it only has PUBLIC_SUPABASE_ANON_KEY.
// Let's create an RPC or execute raw sql if possible via rest.
// Notice: Supabase JS client v2 does not expose a raw SQL method by default.
