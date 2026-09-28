const subGroups = {
  "March CA": [],
  "January CA": [],
  "December 2023 CA": [],
  "February CA": [],
  "General": []
};

const monthOrder = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};

const getSortWeight = (name) => {
  const lowerName = name.toLowerCase();
  for (const [month, weight] of Object.entries(monthOrder)) {
    if (lowerName.includes(month)) {
      // Return a very large number minus the month weight if we want descending (latest month first), or just the weight.
      // Usually "month wise" means chronological.
      return weight;
    }
  }
  return 99; // Non-month groups go to the end
};

const sorted = Object.entries(subGroups).sort((a, b) => {
  return getSortWeight(a[0]) - getSortWeight(b[0]);
});

console.log(sorted.map(s => s[0]));
