import { createClient } from '@supabase/supabase-js';

// Supabase URL and Anon Key extracted from Android local.properties
const supabaseUrl = 'https://vwdmziztplmenfmuntrr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZG16aXp0cGxtZW5mbXVudHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDI2MTQsImV4cCI6MjEwNDUxODYxNH0.oTarfCHl3WtwMQIi6kbW6LaoidggUPwCftLjvCGocMo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
