import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure env vars are loaded
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Only error if we actually try to use it and it's missing (allows build to pass if envs are missing)
export const getSupabase = () => {
    if (!supabaseUrl || !supabaseKey) {
        console.warn("Supabase credentials missing. Check .env file.");
        return null;
    }
    return createClient(supabaseUrl, supabaseKey);
};

export const supabase = getSupabase();
