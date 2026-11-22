// counts.js: a counted noun in the page's language, the same rule as build.py's plural_form (copy.json "counts").
// Arabic: 0, 1, 2, 3–10 (plural), 11 and over (singular, accusative).
export function form(n, lang) {
  if (lang === "en") return n === 1 ? "one" : "other";
  if (n === 0) return "zero";
  if (n === 1) return "one";
  if (n === 2) return "two";
  return n <= 10 ? "few" : "many";
}
export function count(data, noun, n) {
  return data.counts[noun][form(n, data.lang)].replace("{n}", String(n));
}
export function fill(s, o) { return s.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : `{${k}}`)); }
