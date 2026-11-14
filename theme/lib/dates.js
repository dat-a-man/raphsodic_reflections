/**
 * Dates, read generously.
 *
 * An author should be able to write the date the way they would on a letter:
 *   2026-11-14 · 14 November 2026 · 14th Nov 2026 · 14/11/2026 · November 14, 2026
 * Numbers are read day-first (14/11/2026), the British and Indian way.
 *
 * Every date is stored as noon UTC on that calendar day, so it can never
 * slip to the day before or after when formatted.
 */
import { execFileSync } from "node:child_process";

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

function make(year, month, day) {
  if (!(year >= 1000 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  // Reject things like 31 February, which JavaScript would quietly roll over.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

/** Turn whatever the author wrote into a Date, or null if we can't tell. */
export function parseLooseDate(value) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return make(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value !== "string") return null;

  let s = value
    .trim()
    .toLowerCase()
    .replace(/(\d)(st|nd|rd|th)\b/g, "$1") // 14th → 14
    .replace(/[,]/g, " ")
    .replace(/\bof\b/g, " ") // "14th of November"
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/^(mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)[a-z]*\.? /, ""); // "Saturday 14 …"

  let m;

  // 2026-11-14, 2026/11/14, 2026.11.14 (optionally followed by a time)
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[t ].*)?$/))) return make(+m[1], +m[2], +m[3]);

  // 14/11/2026, 14-11-2026, 14.11.26: day first, unless that is impossible
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/))) {
    let day = +m[1];
    let month = +m[2];
    let year = +m[3];
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) [day, month] = [month, day];
    return make(year, month, day);
  }

  // 14 November 2026, 14 Nov 2026, 14-Nov-2026
  if ((m = s.match(/^(\d{1,2})[ -]([a-z]+)\.?[ -](\d{4})$/)) && MONTHS[m[2]]) return make(+m[3], MONTHS[m[2]], +m[1]);

  // November 14 2026
  if ((m = s.match(/^([a-z]+)\.? (\d{1,2}) (\d{4})$/)) && MONTHS[m[1]]) return make(+m[3], MONTHS[m[1]], +m[2]);

  // November 2026
  if ((m = s.match(/^([a-z]+)\.? (\d{4})$/)) && MONTHS[m[1]]) return make(+m[2], MONTHS[m[1]], 1);

  return null;
}

/** A date at the front of a file name: 2026-11-14-my-essay.md */
export function dateFromFilename(inputPath) {
  const m = String(inputPath).split("/").pop().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?=\D|$)/);
  return m ? make(+m[1], +m[2], +m[3]) : null;
}

const gitCache = new Map();

/** The day a file was first added to the repository, as the author's own calendar saw it. */
export function dateFirstCommitted(inputPath) {
  if (gitCache.has(inputPath)) return gitCache.get(inputPath);
  let result = null;
  try {
    const out = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--follow", "--format=%aI", "--", inputPath],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 15000 },
    ).trim();
    // Oldest commit that added the file is the last line. %aI keeps the author's
    // own UTC offset, so the first ten characters are the date on their calendar.
    const oldest = out.split("\n").filter(Boolean).pop();
    const m = oldest && oldest.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) result = make(+m[1], +m[2], +m[3]);
  } catch {
    // Not a git repository, or git isn't installed: no matter.
  }
  gitCache.set(inputPath, result);
  return result;
}

export function today() {
  const now = new Date();
  return make(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

const longFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** 14 November 2026 */
export const readableDate = (date) => (date instanceof Date ? longFormat.format(date) : "");
/** 14 Nov */
export const shortDate = (date) => (date instanceof Date ? shortFormat.format(date) : "");
/** 2026-11-14 */
export const isoDate = (date) => (date instanceof Date ? date.toISOString().slice(0, 10) : "");
