/**
 * Processes HTML content from question/option strings and injects inline styles
 * for semantic tags so they render correctly on all mobile browsers, bypassing
 * any CSS cascade/Tailwind preflight issues.
 */
export function processHtml(html) {
  if (!html) return '';
  return html
    .replace(/\\n/g, '<br/>')
    // Bold
    .replace(/<strong(\s[^>]*)?>/gi, (m, attrs) => `<strong${attrs || ''} style="font-weight:700">`)
    .replace(/<b(\s[^>]*)?>/gi, (m, attrs) => `<b${attrs || ''} style="font-weight:700">`)
    // Italic
    .replace(/<em(\s[^>]*)?>/gi, (m, attrs) => `<em${attrs || ''} style="font-style:italic">`)
    .replace(/<i(\s[^>]*)?>/gi, (m, attrs) => `<i${attrs || ''} style="font-style:italic">`)
    // Underline / Inserted
    .replace(/<u(\s[^>]*)?>/gi, (m, attrs) => `<u${attrs || ''} style="text-decoration:underline">`)
    .replace(/<ins(\s[^>]*)?>/gi, (m, attrs) => `<ins${attrs || ''} style="text-decoration:underline">`)
    // Highlight / Mark
    .replace(/<mark(\s[^>]*)?>/gi, (m, attrs) => `<mark${attrs || ''} style="background-color:#fef08a;padding:0 2px;border-radius:2px;color:inherit">`)
    // Strikethrough
    .replace(/<s(\s[^>]*)?>/gi, (m, attrs) => `<s${attrs || ''} style="text-decoration:line-through">`)
    .replace(/<del(\s[^>]*)?>/gi, (m, attrs) => `<del${attrs || ''} style="text-decoration:line-through">`)
    // Superscript / Subscript
    .replace(/<sup(\s[^>]*)?>/gi, (m, attrs) => `<sup${attrs || ''} style="vertical-align:super;font-size:0.75em">`)
    .replace(/<sub(\s[^>]*)?>/gi, (m, attrs) => `<sub${attrs || ''} style="vertical-align:sub;font-size:0.75em">`);
}
