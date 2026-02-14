/**
 * Minimal JSON repair for LLM outputs.
 *
 * LLMs frequently produce almost-valid JSON with markdown fences,
 * trailing commas, unquoted keys, single-quoted strings, or truncated
 * output.  This module handles the most common cases.
 */

export function repairJson(raw: string): string {
  let s = raw.trim();

  // Strip markdown fences
  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  s = s.trim();

  // Remove JS-style single-line comments (// ...) outside of strings
  s = s.replace(/(?<!["\w])\/\/[^\n]*/g, "");

  // Remove JS-style multi-line comments (/* ... */)
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");

  // Extract first JSON object or array
  const startObj = s.indexOf("{");
  const startArr = s.indexOf("[");
  let start = -1;
  if (startObj === -1 && startArr === -1) return s;
  if (startObj === -1) start = startArr;
  else if (startArr === -1) start = startObj;
  else start = Math.min(startObj, startArr);

  s = s.slice(start);

  // Find matching end bracket
  const openChar = s[0]!;
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let end = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === openChar) depth++;
    if (c === closeChar) depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }

  if (end !== -1) {
    s = s.slice(0, end + 1);
  } else {
    // JSON is truncated — try to close it
    let openBraces = 0;
    let openBrackets = 0;
    let inStr = false;
    let esc = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i]!;
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (c === "{") openBraces++;
      else if (c === "}") openBraces--;
      else if (c === "[") openBrackets++;
      else if (c === "]") openBrackets--;
    }
    // Remove trailing partial key/value
    s = s.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "");
    s = s.replace(/,\s*$/, "");
    for (let i = 0; i < openBrackets; i++) s += "]";
    for (let i = 0; i < openBraces; i++) s += "}";
  }

  // Fix trailing commas before } or ]
  s = s.replace(/,\s*([\]}])/g, "$1");

  // Fix unquoted property names:  { foo: "bar" } → { "foo": "bar" }
  s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // Fix single-quoted strings → double quotes
  s = s.replace(/:\s*'([^']*)'/g, ': "$1"');

  // Fix literal newlines inside string values
  s = s.replace(/"([^"]*?)"/g, (_match, content: string) => {
    return (
      '"' +
      content
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t") +
      '"'
    );
  });

  return s;
}
