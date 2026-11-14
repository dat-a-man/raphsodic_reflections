/**
 * How the site is put together.
 *
 * You should rarely need to open this file. Essays live in posts/, the About
 * page in about/, and the site's name and wording in site.yaml.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import yaml from "js-yaml";
import { HtmlBasePlugin } from "@11ty/eleventy";
import Image, { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import rssPlugin from "@11ty/eleventy-plugin-rss";

import { createMarkdown, firstPicture, PHOTO_SIZES } from "./theme/lib/markdown.js";
import { parseFrontMatter } from "./theme/lib/frontmatter.js";
import { parseLooseDate, dateFromFilename, dateFirstCommitted, today, readableDate, shortDate, isoDate } from "./theme/lib/dates.js";
import { slugify, titleFromSlug, bare, stripTags, excerptFromHtml } from "./theme/lib/text.js";
import { scanImages, resolveImage } from "./theme/lib/images.js";
import { note, printNotes, resetNotes } from "./theme/lib/notes.js";

// "build" when publishing, "serve" while previewing on your own computer.
const isPublishing = process.env.ELEVENTY_RUN_MODE === "build";

// Where the site lives. GitHub fills these in when it publishes (see
// .github/workflows/publish.yml), so nothing needs editing if the address changes.
const siteUrl = (process.env.SITE_URL || "http://localhost:8080").replace(/\/+$/, "");
const pathPrefix = process.env.PATH_PREFIX || "/";

const tidy = (inputPath) => String(inputPath || "").replace(/^\.\//, "");
const isEssay = (inputPath) => /^posts\/.+\.md$/.test(tidy(inputPath));

/** The settings in site.yaml, read afresh for every build. */
function loadSite() {
  const defaults = {
    title: "Rhapsodic Reflections",
    author: "",
    tagline: "",
    welcome: "",
    description: "",
    language: "en-GB",
  };
  let settings = {};
  try {
    settings = yaml.load(fs.readFileSync("site.yaml", "utf8")) || {};
  } catch (error) {
    note("site.yaml", `This file couldn't be read (${error.reason || error.message}), so the built-in wording was used instead.`);
  }
  const site = {};
  for (const key of Object.keys(defaults)) {
    const value = settings[key];
    site[key] = value === undefined || value === null ? defaults[key] : String(value).trim();
  }
  if (!site.title) site.title = defaults.title;

  // The cover sets the last word of the title in capitals beneath the rest.
  const words = site.title.split(/\s+/);
  site.titleLast = words.length > 1 ? words.pop() : "";
  site.titleLead = words.join(" ");

  site.owner = site.author || site.title;
  site.url = siteUrl;
  return site;
}

/** A "# Title" (or underlined title) on the very first line of an essay. */
function leadingHeading(source) {
  let match = source.match(/^\s*#[ \t]+(.+?)[ \t]*#*[ \t]*(?:\r?\n|$)/);
  if (!match) match = source.match(/^\s*([^\s#>*\-+\d!\[<`|][^\n]*?)[ \t]*\r?\n=+[ \t]*(?:\r?\n|$)/);
  return match ? { text: match[1].trim(), rest: source.slice(match[0].length) } : null;
}

export default async function (eleventyConfig) {
  /* ── Writing ─────────────────────────────────────────────────────────── */

  const markdown = createMarkdown();
  eleventyConfig.setLibrary("md", markdown);
  eleventyConfig.setFrontMatterParsingOptions({ engines: { yaml: parseFrontMatter } });

  // Not pages: the instructions, the essay template, anything starting with "_".
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("**/_*");
  eleventyConfig.ignores.add("theme/assets/**");
  eleventyConfig.ignores.add("scripts/**");

  // Every essay gets a title, an address and a date, whatever was left out.
  eleventyConfig.addPreprocessor("essay-defaults", "md", function (data, content) {
    if (!isEssay(this.inputPath)) return;
    if (data.draft && isPublishing) return false; // drafts stay at home

    const heading = leadingHeading(content);
    const written = data.title === undefined || data.title === null ? "" : String(data.title).trim();
    data.title = written || heading?.text || titleFromSlug(data.page.fileSlug);
    if (!data.permalink) data.permalink = `/reflections/${slugify(data.page.fileSlug)}/`;

    // If the essay opens by repeating its own title as a heading, show it once.
    if (heading && bare(heading.text) === bare(data.title)) return heading.rest || "\n";
  });

  eleventyConfig.addDateParsing(function (value) {
    const inputPath = this.page?.inputPath;
    if (!isEssay(inputPath)) return;
    const written = parseLooseDate(value);
    if (written) return written;
    const fallback = dateFromFilename(inputPath) || dateFirstCommitted(inputPath) || today();
    if (value !== undefined && value !== null && value !== "") {
      note(tidy(inputPath), `Couldn't read the date "${value}", so ${readableDate(fallback)} was used. Try writing it like 14 November 2026.`);
    }
    return fallback;
  });

  eleventyConfig.addCollection("essays", (api) => api.getFilteredByGlob("posts/**/*.md"));

  /* ── Pictures ────────────────────────────────────────────────────────── */

  // Every picture is resized to several widths, saved as modern WebP with a
  // JPEG fallback, turned the right way up, stripped of its hidden location
  // data, and only downloaded when the reader scrolls near it.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp", "auto"],
    widths: [640, 960, 1280, 1680],
    urlPath: "/img/",
    fixOrientation: true,
    failOnError: false,
    sharpJpegOptions: { quality: 80, mozjpeg: true },
    sharpWebpOptions: { quality: 78 },
    filenameFormat: (id, src, width, format) => `${slugify(path.parse(src).name).slice(0, 48)}-${id}-${width}.${format}`,
    htmlOptions: {
      imgAttributes: { loading: "lazy", decoding: "async", sizes: PHOTO_SIZES },
    },
  });

  eleventyConfig.addFilter("findImage", (src, inputPath) => (src ? resolveImage(src, inputPath) : null));

  // The picture that stands for an essay on the home page and in link previews:
  // its cover if one is named, otherwise the first picture in the essay itself.
  const leadPicture = (essay) => {
    if (!essay) return null;
    const usable = (found) => (found && (found.kind === "local" || found.kind === "remote") ? found : null);
    const cover = essay.data?.cover ? usable(resolveImage(essay.data.cover, essay.inputPath)) : null;
    if (cover) return cover;
    const first = firstPicture(essay.rawInput ?? essay.data?.page?.rawInput);
    return first ? usable(resolveImage(first, essay.inputPath)) : null;
  };
  eleventyConfig.addFilter("leadPicture", leadPicture);

  // The picture shown when a link is shared on WhatsApp and the like: the
  // essay's own picture at a sensible size, or else the site's card.
  eleventyConfig.addAsyncFilter("socialImage", async (essay) => {
    const fallback = `${siteUrl}/assets/img/social-card.jpg`;
    const found = leadPicture(essay);
    if (found?.kind !== "local" || /\.svg$/i.test(found.file)) return fallback;
    try {
      const made = await Image(found.file, {
        widths: [1200],
        formats: ["jpeg"],
        outputDir: path.join(eleventyConfig.directories.output, "img"),
        urlPath: "/img/",
        fixOrientation: true,
        sharpJpegOptions: { quality: 80, mozjpeg: true },
        filenameFormat: (id, src, width, format) => `${slugify(path.parse(src).name).slice(0, 48)}-${id}-share.${format}`,
      });
      return siteUrl + made.jpeg[0].url;
    } catch {
      return fallback;
    }
  });

  /* ── Small helpers for the page templates ────────────────────────────── */

  eleventyConfig.addGlobalData("site", loadSite);
  eleventyConfig.addGlobalData("build", () => ({ year: new Date().getFullYear(), publishing: isPublishing }));

  eleventyConfig.addFilter("readableDate", readableDate);
  eleventyConfig.addFilter("shortDate", shortDate);
  eleventyConfig.addFilter("isoDate", isoDate);

  // Titles and captions may use *italics* and get proper quotation marks too.
  const inline = (text) => markdown.renderInline(String(text ?? ""));
  eleventyConfig.addFilter("inlineMd", inline);
  eleventyConfig.addFilter("plain", (text) => stripTags(inline(text)));

  // The first letter of a title, for the decorated tile an essay gets when it has no picture.
  eleventyConfig.addFilter("initial", (title) => {
    const letter = stripTags(inline(title)).match(/[\p{L}\p{N}]/u);
    return letter ? letter[0].toUpperCase() : "\u2766";
  });

  // …and which of the five cloth colours that tile is bound in. It is worked
  // out from the file name, so an essay keeps its colour as others are added.
  eleventyConfig.addFilter("cloth", (essay) => {
    let sum = 0;
    for (const char of String(essay?.fileSlug || essay?.url || "")) sum = (sum * 31 + char.codePointAt(0)) % 9973;
    return (sum % 5) + 1;
  });

  eleventyConfig.addFilter("excerpt", (essay, limit) =>
    essay?.data?.summary ? stripTags(inline(essay.data.summary)) : excerptFromHtml(essay?.content, limit),
  );

  // "/about/" → "https://…/about/". (Named fullUrl because the feed plugin has its own absoluteUrl.)
  eleventyConfig.addFilter("fullUrl", (url) => siteUrl + (String(url).startsWith("/") ? url : `/${url}`));

  eleventyConfig.addFilter("byYear", (essays) => {
    const years = [];
    for (const essay of essays || []) {
      const year = essay.date.getUTCFullYear();
      if (!years.length || years[years.length - 1].year !== year) years.push({ year, essays: [] });
      years[years.length - 1].essays.push(essay);
    }
    return years;
  });

  // style.css?v=3f9a1c… so returning readers always get the current stylesheet.
  const fingerprints = new Map();
  eleventyConfig.addFilter("fresh", (url) => {
    const file = path.join("theme", String(url).replace(/^\/+/, ""));
    if (!fingerprints.has(file) || !isPublishing) {
      try {
        fingerprints.set(file, createHash("sha1").update(fs.readFileSync(file)).digest("hex").slice(0, 10));
      } catch {
        fingerprints.set(file, "");
      }
    }
    const mark = fingerprints.get(file);
    return mark ? `${url}?v=${mark}` : url;
  });

  /* ── Plumbing ────────────────────────────────────────────────────────── */

  eleventyConfig.addPlugin(rssPlugin);
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.addPassthroughCopy({ "theme/assets": "assets" });
  eleventyConfig.addWatchTarget("./site.yaml");
  eleventyConfig.addWatchTarget("./posts/");
  eleventyConfig.addWatchTarget("./about/");

  eleventyConfig.on("eleventy.before", async () => {
    resetNotes();
    await scanImages(["posts", "about"]);
  });
  eleventyConfig.on("eleventy.after", () => printNotes());
}

export const config = {
  dir: { input: ".", includes: "theme/layouts", data: "theme/data", output: "_site" },
  templateFormats: ["md", "njk"],
  markdownTemplateEngine: false,
  htmlTemplateEngine: "njk",
  pathPrefix,
};
