/**
 * Processes HTML content from question/option strings and injects inline styles
 * for semantic tags so they render correctly on all mobile browsers, bypassing
 * any CSS cascade/Tailwind preflight issues.
 */
export function processHtml(html) {
  if (!html) return '';
  return html
    .replace(/\\n/g, '<br/>') // Handles JSON string escaped \n
    .replace(/\n/g, '<br/>'); // Handles actual newlines from textareas
}
