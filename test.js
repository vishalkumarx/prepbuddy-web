import fs from 'fs';
const content = fs.readFileSync('src/supabase.js', 'utf8');
console.log(content.substring(0, 200));
