/** Small text helpers shared by the build. */

/** "My School Days.md" → "my-school-days". Keeps letters of any script. */
export function slugify(input) {
  const slug = String(input)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // é → e
    .toLowerCase()
    .replace(/['‘’]/g, "") // mother's → mothers
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

/** "my-school-days" → "My school days", for essays that have no title at all. */
export function titleFromSlug(slug) {
  const words = String(slug).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Untitled";
}

/** Letters and digits only, for comparing two titles loosely. */
export const bare = (text) => String(text || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
export const decodeEntities = (text) => String(text).replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m]);

export const stripTags = (html) => decodeEntities(String(html || "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

/**
 * A short opening passage for the home page, taken from the essay itself.
 * Pictures, headings and tables are skipped; lines of verse are joined with " / ".
 */
export function excerptFromHtml(html, limit = 230) {
  let text = String(html || "")
    .replace(/<(figure|h[1-6]|table|pre|script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/span>\s*<br\s*\/?>\s*<span class="line">/gi, " / ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|blockquote|div)>/gi, " ");
  text = stripTags(text);
  if (text.length <= limit) return text;
  let cut = text.slice(0, limit + 1);
  cut = cut.slice(0, cut.lastIndexOf(" "));
  cut = cut.replace(/[\s,;:—–\-/(]+$/, "");
  // "outing." + "…" would read "outing.…"; let the ellipsis stand in for the full stop.
  if (cut.endsWith(".")) return cut.slice(0, -1) + "…";
  if (/[!?”’"']$/.test(cut)) return cut + " …";
  return cut + "…";
}
