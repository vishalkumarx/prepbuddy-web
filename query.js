import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const file = fs.readFileSync('./src/supabase.js', 'utf-8');
const urlMatch = file.match(/supabaseUrl = '(.*?)'/);
const keyMatch = file.match(/supabaseAnonKey = '(.*?)'/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  supabase.from('prepbuddy_enrollments').update({ is_active: false }).eq('id', '708c553f-1c24-466f-a0a2-733b107a20b9').then(({ data, error }) => {
    console.log("Update Error:", error);
  });
}
