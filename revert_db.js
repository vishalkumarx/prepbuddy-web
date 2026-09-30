const sbUrl = 'https://vwdmziztplmenfmuntrr.supabase.co';
const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZG16aXp0cGxtZW5mbXVudHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDI2MTQsImV4cCI6MjEwNDUxODYxNH0.oTarfCHl3WtwMQIi6kbW6LaoidggUPwCftLjvCGocMo';

async function run() {
  // Revert test series linked_tests
  const req = await fetch(sbUrl + '/rest/v1/prepbuddy_test_series?select=id,linked_tests', {
    headers: {
      'apikey': sbKey,
      'Authorization': 'Bearer ' + sbKey
    }
  });
  const data = await req.json();
  for (const series of data) {
    if (series.linked_tests && series.linked_tests.length > 0) {
      let changed = false;
      const updated = series.linked_tests.map(t => {
        if (t.test_name) {
          changed = true;
          return { category: t.category, subcategory: t.test_name }; // Completely remove test_name from the JSON object
        }
        return t;
      });
      if (changed) {
        await fetch(sbUrl + '/rest/v1/prepbuddy_test_series?id=eq.' + series.id, {
          method: 'PATCH',
          headers: {
            'apikey': sbKey,
            'Authorization': 'Bearer ' + sbKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ linked_tests: updated })
        });
        console.log('Reverted test series ' + series.id);
      }
    }
  }
}
run();
