import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://kgcmbbesrzldoiwkckke.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnY21iYmVzcnpsZG9pd2tja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTM5OTYsImV4cCI6MjA5OTE2OTk5Nn0.TUyoxBTIiGBlkzXMcsJxXH6-nb8PXXB215Ye1K9B7I4';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

