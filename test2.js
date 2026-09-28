import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://vwdmziztplmenfmuntrr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZG16aXp0cGxtZW5mbXVudHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDI2MTQsImV4cCI6MjEwNDUxODYxNH0.oTarfCHl3WtwMQIi6kbW6LaoidggUPwCftLjvCGocMo');
async function check() {
  const { data, error } = await supabase.from('prepbuddy_test_attempts').select('*').limit(1);
  console.log(data);
}
check();
