import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://vwdmziztplmenfmuntrr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZG16aXp0cGxtZW5mbXVudHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDI2MTQsImV4cCI6MjEwNDUxODYxNH0.oTarfCHl3WtwMQIi6kbW6LaoidggUPwCftLjvCGocMo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('prepbuddy_banners').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
