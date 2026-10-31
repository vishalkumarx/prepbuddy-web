/**
 * Parses match-the-following questions that contain List I / List II or Column I / Column II
 * and converts them into an elegant responsive comparison table.
 */
export function formatMatchTheFollowing(text) {
  if (!text || typeof text !== 'string') return text;
  
  // If already formatted with an HTML table, don't reformat
  if (text.includes('<table')) return text;

  // Normalize escaped newlines
  const normalized = text.replace(/\\n/g, '\n');

  // Match List I / Column I / List 1 and List II / Column II / List 2 structures
  const listSplitRegex = /(List\s*[-–—]?\s*[I12AB]+|Column\s*[-–—]?\s*[I12AB]+)\s*[-–—:]*\s*([^:\n\r]*?)[:\-–—]\s*([\s\S]+?)(?=(?:List\s*[-–—]?\s*[I12AB]+|Column\s*[-–—]?\s*[I12AB]+)\s*[-–—:]*\s*[^:\n\r]*?[:\-–—]|$)/gi;

  const matches = [...normalized.matchAll(listSplitRegex)];
  if (matches.length < 2) return text;

  const parseItems = (raw) => {
    let trimmed = raw.replace(/\.+$/, '').trim();
    let items = [];
    if (trimmed.includes(';')) {
      items = trimmed.split(';').map(s => s.trim().replace(/\.+$/, '')).filter(Boolean);
    } else if (trimmed.includes('\n')) {
      items = trimmed.split('\n').map(s => s.trim().replace(/\.+$/, '')).filter(Boolean);
    } else {
      items = trimmed.split(/(?=(?:[a-z0-9ivx]+\s*[\.\)]|\([a-z0-9ivx]+\))\s*)/i).map(s => s.trim().replace(/\.+$/, '')).filter(Boolean);
    }
    return items;
  };

  const firstMatchIndex = matches[0].index;
  const introText = normalized.substring(0, firstMatchIndex).trim();

  const col1Prefix = matches[0][1].trim();
  const col1Title = matches[0][2].trim();
  const col1Items = parseItems(matches[0][3]);

  const col2Prefix = matches[1][1].trim();
  const col2Title = matches[1][2].trim();
  const col2Items = parseItems(matches[1][3]);

  const maxRows = Math.max(col1Items.length, col2Items.length);
  if (maxRows === 0) return text;

  const col1Header = col1Title ? `${col1Prefix} – ${col1Title}` : col1Prefix;
  const col2Header = col2Title ? `${col2Prefix} – ${col2Title}` : col2Prefix;

  let tableHtml = `<div class="match-table-wrapper my-3 overflow-x-auto"><table class="match-table w-full border-collapse border border-gray-200 text-xs md:text-sm rounded-xl overflow-hidden shadow-xs"><thead><tr class="bg-indigo-50/90 text-indigo-950 border-b border-gray-200"><th class="py-2.5 px-3.5 text-left font-bold border-r border-gray-200 w-1/2">${col1Header}</th><th class="py-2.5 px-3.5 text-left font-bold w-1/2">${col2Header}</th></tr></thead><tbody>`;

  for (let i = 0; i < maxRows; i++) {
    const item1 = col1Items[i] || '';
    const item2 = col2Items[i] || '';
    const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
    tableHtml += `<tr class="${rowBg} border-b border-gray-100 last:border-b-0"><td class="py-2.5 px-3.5 border-r border-gray-200 text-gray-800 font-medium">${item1}</td><td class="py-2.5 px-3.5 text-gray-800 font-medium">${item2}</td></tr>`;
  }
  tableHtml += `</tbody></table></div>`;

  const afterLists = normalized.substring(firstMatchIndex + matches[0][0].length + matches[1][0].length).trim();

  let result = '';
  if (introText) result += introText + '\n';
  result += tableHtml;
  if (afterLists) result += '\n' + afterLists;
  return result;
}

/**
 * Processes HTML content from question/option strings and injects inline styles
 * for semantic tags so they render correctly on all mobile browsers, bypassing
 * any CSS cascade/Tailwind preflight issues.
 */
export function processHtml(html) {
  if (!html) return '';
  const formatted = formatMatchTheFollowing(html);
  return formatted
    .replace(/\\n/g, '<br/>') // Handles JSON string escaped \n
    .replace(/\n/g, '<br/>'); // Handles actual newlines from textareas
}

