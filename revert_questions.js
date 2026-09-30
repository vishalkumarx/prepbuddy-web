const sbUrl = 'https://vwdmziztplmenfmuntrr.supabase.co';
const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZG16aXp0cGxtZW5mbXVudHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDI2MTQsImV4cCI6MjEwNDUxODYxNH0.oTarfCHl3WtwMQIi6kbW6LaoidggUPwCftLjvCGocMo';

async function revertTable(table) {
  let count = 0;
  let offset = 0;
  const limit = 1000;
  while (true) {
    const req = await fetch(`${sbUrl}/rest/v1/${table}?select=id,subcategory,test_name&limit=${limit}&offset=${offset}`, {
      headers: {
        'apikey': sbKey,
        'Authorization': 'Bearer ' + sbKey
      }
    });
    const data = await req.json();
    if (data.length === 0) break;
    
    for (const row of data) {
      if (row.test_name && row.test_name !== row.subcategory) {
        await fetch(`${sbUrl}/rest/v1/${table}?id=eq.${row.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': sbKey,
            'Authorization': 'Bearer ' + sbKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subcategory: row.test_name })
        });
        count++;
      }
    }
    offset += limit;
  }
  console.log(`Reverted ${count} rows in ${table}`);
}

async function run() {
  await revertTable('prepbuddy_questions');
  await revertTable('prepbuddy_test_attempts');
}
run();
