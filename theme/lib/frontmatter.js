/**
 * Front matter, read generously.
 *
 * The block between the two `---` lines at the top of an essay is YAML, which
 * is strict about punctuation: a colon in an unquoted title is an error. That
 * is a poor reason for an essay not to publish, so when strict parsing
 * fails we fall back to reading it one "name: value" line at a time.
 */
import yaml from "js-yaml";

// Field names we understand, and the other spellings people reach for.
const ALIASES = {
  title: "title",
  heading: "title",
  date: "date",
  published: "date",
  summary: "summary",
  description: "summary",
  excerpt: "summary",
  blurb: "summary",
  cover: "cover",
  image: "cover",
  photo: "cover",
  picture: "cover",
  cover_caption: "cover_caption",
  caption: "cover_caption",
  cover_alt: "cover_alt",
  alt: "cover_alt",
  draft: "draft",
  author: "author",
  by: "author",
  written_by: "author",
  writer: "author",
  portrait: "portrait",
  portrait_caption: "portrait_caption",
  portrait_alt: "portrait_alt",
};

const QUOTE_PAIRS = [['"', '"'], ["'", "'"], ["“", "”"], ["‘", "’"]];

function unquote(text) {
  let value = text.trim();
  for (const [open, close] of QUOTE_PAIRS) {
    if (value.length >= 2 && value.startsWith(open) && value.endsWith(close)) {
      return value.slice(1, -1).trim();
    }
  }
  return value;
}

function looseParse(source) {
  const data = {};
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z][\w \-]*?)\s*:\s*(.*)$/);
    if (!match) continue;
    const value = unquote(match[2]);
    if (/^(true|yes)$/i.test(value)) data[match[1]] = true;
    else if (/^(false|no)$/i.test(value)) data[match[1]] = false;
    else data[match[1]] = value;
  }
  return data;
}

export function parseFrontMatter(source) {
  let data;
  try {
    data = yaml.load(source);
  } catch {
    data = looseParse(source);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) data = {};

  // "Title:" → "title", "Cover Caption:" → "cover_caption", and so on.
  for (const key of Object.keys(data)) {
    const normal = key.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const target = ALIASES[normal];
    if (target && target !== key && !(target in data)) {
      data[target] = data[key];
      delete data[key];
    }
  }

  // Word processors turn "…" into curly quotes, which YAML keeps as part of the text.
  for (const key of ["title", "author", "summary", "cover", "cover_caption", "cover_alt", "portrait", "portrait_caption", "portrait_alt"]) {
    if (typeof data[key] === "string") data[key] = unquote(data[key]);
    else if (typeof data[key] === "number") data[key] = String(data[key]); // title: 1984
  }
  if (typeof data.draft === "string") data.draft = /^(true|yes)$/i.test(data.draft.trim());

  return data;
}
