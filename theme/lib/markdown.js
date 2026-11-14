/**
 * Markdown, the way a writer (not a programmer) expects it to behave.
 *
 *  - Curly quotes, real dashes and ellipses are set automatically.
 *  - A new line is a new line. Poems and addresses keep their shape.
 *  - Paragraphs pasted from Word with no blank line between them are still
 *    paragraphs.
 *  - A picture on its own line becomes a mounted photograph. Words in
 *    "quotes" after the file name, or a short line straight underneath,
 *    become its caption.
 *  - Picture file names may contain spaces and brackets
 *    ("WhatsApp Image 2026-11-14 at 10.30.15.jpeg", "photo (1).jpg").
 *  - Whether the writer uses # or ## for section headings, they come out the
 *    same size.
 */
import markdownIt from "markdown-it";
import { resolveImage } from "./images.js";
import { note } from "./notes.js";

/** A "line" longer than this is really a paragraph that lost its blank line. */
const PROSE_LINE = 110;
/** A single line this short, directly under a picture, is its caption. */
const CAPTION_MAX = 160;
/** An opening paragraph needs this many characters to carry a drop capital. */
const OPENING_MIN = 150;
/** How wide pictures appear: the text column on larger screens, nearly full width on phones. */
export const PHOTO_SIZES = "(min-width: 42em) 39rem, calc(100vw - 2.5rem)";

const IMAGE_SYNTAX =
  /!\[([^\]\n]*)\]\(\s*<?([^\n"“”<>]+?\.(?:jpe?g|png|gif|webp|avif|svg|heic|heif|bmp|tiff?))>?\s*(?:["“]([^"”\n]*)["”])?\s*\)/gi;

/** The file name of the first picture an essay mentions, or null. */
export function firstPicture(source) {
  const text = String(source || "");
  const written = new RegExp(IMAGE_SYNTAX.source, "i").exec(text);
  const html = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(text);
  if (written && (!html || written.index < html.index)) return written[2].trim();
  return html ? html[1].trim() : null;
}

const isBlank = (token) => token.type === "text" && !token.content.trim();
const isBreak = (token) => token.type === "softbreak" || token.type === "hardbreak";
const textLength = (tokens) =>
  tokens.reduce((sum, t) => sum + (t.type === "text" || t.type === "code_inline" ? t.content.length : 0), 0);
const isPictureLine = (tokens) => tokens.some((t) => t.type === "image") && tokens.every((t) => t.type === "image" || isBlank(t));

/** Split a paragraph's contents wherever the writer pressed Return. */
function splitLines(children) {
  const lines = [[]];
  let depth = 0;
  for (const token of children) {
    if (isBreak(token) && depth === 0) lines.push([]);
    else lines[lines.length - 1].push(token);
    depth += token.nesting;
  }
  return lines.filter((line) => line.some((token) => !isBlank(token)));
}

export function createMarkdown() {
  const md = markdownIt({ html: true, breaks: true, linkify: true, typographer: true }).disable("code");

  // Only turn real addresses (https://…) into links. The "fuzzy" mode would
  // also link a missing space after a full stop ("the end.In 1974…").
  md.linkify.set({ fuzzyLink: false });

  /* ---- 1. Be forgiving about how a picture is written ------------------ */
  md.core.ruler.after("normalize", "rr_picture_syntax", (state) => {
    state.src = state.src.replace(IMAGE_SYNTAX, (whole, alt, destination, caption) => {
      const target = destination.trim();
      const safeTarget = /[\s()]/.test(target) ? `<${target}>` : target;
      return `![${alt}](${safeTarget}${caption === undefined ? "" : ` "${caption.trim()}"`})`;
    });
  });

  /* ---- 2. Shape paragraphs, verse, photographs and headings ------------ */
  md.core.ruler.after("inline", "rr_structure", (state) => {
    if (state.inlineMode) return;
    const { Token } = state;

    const block = (type, tag, nesting, like) => {
      const token = new Token(type, tag, nesting);
      token.block = true;
      if (like) {
        token.map = like.map;
        token.level = like.level;
      }
      return token;
    };

    const inlineOf = (children, like) => {
      const token = new Token("inline", "", 0);
      token.block = true;
      token.children = children;
      // Later typography rules decide what to do by looking at .content.
      token.content = children.map((child) => child.content || "").join(" ");
      token.map = like?.map ?? null;
      token.level = (like?.level ?? 0) + 1;
      return token;
    };

    const paragraph = (children, like, className) => {
      const open = block("paragraph_open", "p", 1, like);
      if (className) open.attrSet("class", className);
      return [open, inlineOf(children, like), block("paragraph_close", "p", -1, like)];
    };

    const figure = (image, captionChildren, like) => {
      const open = block("figure_open", "figure", 1, like);
      open.attrSet("class", "photo");
      const out = [open, inlineOf([image], like)];
      if (captionChildren?.length) {
        out.push(block("figcaption_open", "figcaption", 1, like), inlineOf(captionChildren, like), block("figcaption_close", "figcaption", -1, like));
      }
      out.push(block("figure_close", "figure", -1, like));
      return out;
    };

    /** Lines of text: either separate paragraphs (pasted prose) or verse. */
    const textRun = (lines, like) => {
      if (lines.length === 1) return paragraph(lines[0], like);
      if (lines.some((line) => textLength(line) > PROSE_LINE)) return lines.flatMap((line) => paragraph(line, like));
      const children = [];
      lines.forEach((line, index) => {
        if (index) children.push(new Token("hardbreak", "br", 0));
        const open = new Token("span_open", "span", 1);
        open.attrSet("class", "line");
        children.push(open, ...line, new Token("span_close", "span", -1));
      });
      return paragraph(children, like, "lines");
    };

    const rebuilt = [];
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const open = tokens[i];
      const inline = tokens[i + 1];
      const isParagraph =
        open.type === "paragraph_open" && !open.hidden && inline?.type === "inline" && tokens[i + 2]?.type === "paragraph_close";
      if (!isParagraph) {
        rebuilt.push(open);
        continue;
      }
      i += 2;

      const lines = splitLines(inline.children || []);
      if (!lines.length) continue; // an empty paragraph

      // The everyday case, one unbroken paragraph of words, is left exactly as it is.
      if (lines.length === 1 && !isPictureLine(lines[0])) {
        rebuilt.push(open, inline, tokens[i]);
        continue;
      }

      // Group neighbouring lines into runs of pictures and runs of words.
      const runs = [];
      for (const line of lines) {
        const kind = isPictureLine(line) ? "pictures" : "words";
        if (runs.length && runs[runs.length - 1].kind === kind) runs[runs.length - 1].lines.push(line);
        else runs.push({ kind, lines: [line] });
      }

      for (let r = 0; r < runs.length; r++) {
        const run = runs[r];
        if (run.kind === "words") {
          rebuilt.push(...textRun(run.lines, open));
          continue;
        }
        const images = run.lines.flatMap((line) => line.filter((token) => token.type === "image"));
        images.forEach((image, index) => {
          let caption = null;
          const title = image.attrGet("title");
          if (title) {
            image.attrs.splice(image.attrIndex("title"), 1);
            caption = [];
            state.md.inline.parse(title, state.md, state.env, caption);
          } else if (index === images.length - 1) {
            // One short line straight under the picture is its caption.
            const next = runs[r + 1];
            if (next?.kind === "words" && next.lines.length === 1 && textLength(next.lines[0]) <= CAPTION_MAX) {
              caption = next.lines[0];
              r++;
            }
          }
          rebuilt.push(...figure(image, caption, open));
        });
      }
    }
    state.tokens = rebuilt;

    // Section headings always begin at <h2>, whatever the writer typed.
    const headings = rebuilt.filter((token) => token.type === "heading_open");
    if (headings.length) {
      const shift = 2 - Math.min(...headings.map((token) => Number(token.tag.slice(1))));
      if (shift) {
        for (const token of rebuilt) {
          if (token.type !== "heading_open" && token.type !== "heading_close") continue;
          token.tag = `h${Math.min(6, Math.max(2, Number(token.tag.slice(1)) + shift))}`;
        }
      }
    }

    // Mark a proper opening paragraph so it can carry a drop capital.
    if (state.env?.page && state.env.dropcap !== false) {
      let i = 0;
      while (rebuilt[i]?.type === "figure_open") {
        while (rebuilt[i] && rebuilt[i].type !== "figure_close") i++;
        i++;
      }
      const open = rebuilt[i];
      const first = rebuilt[i + 1]?.children?.[0];
      if (
        open?.type === "paragraph_open" &&
        open.level === 0 &&
        !open.attrGet("class") &&
        first?.type === "text" &&
        /^[A-Za-zÀ-ɏ]/.test(first.content) &&
        textLength(rebuilt[i + 1].children) >= OPENING_MIN
      ) {
        open.attrSet("class", "opening");
      }
    }
  });

  /* ---- 3. Pictures: find the file, or say kindly that we couldn't ------ */
  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const { escapeHtml } = md.utils;
    const src = token.attrGet("src") || "";
    const alt = self.renderInlineAsText(token.children || [], options, env);
    const page = String(env?.page?.inputPath || "").replace(/^\.\//, "") || "a page";
    const found = resolveImage(src, env?.page?.inputPath);

    if (found.kind === "missing") {
      let shown = src;
      try {
        shown = decodeURIComponent(src);
      } catch {
        // show it as written
      }
      note(page, `Couldn't find the picture "${shown}". Check the spelling, and that the file is in posts/images/.`);
      return `<span class="photo-note">Picture not found: ${escapeHtml(shown)}</span>`;
    }
    if (found.kind === "unreadable") {
      return `<span class="photo-note">This picture can’t be shown because ${escapeHtml(found.reason)}.</span>`;
    }
    if (found.kind === "remote") {
      return `<img src="${escapeHtml(found.src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" eleventy:ignore>`;
    }
    return `<img src="${escapeHtml(found.url)}" alt="${escapeHtml(alt)}" sizes="${PHOTO_SIZES}" loading="lazy" decoding="async">`;
  };

  /* ---- 4. Wide tables scroll sideways instead of breaking the page ----- */
  md.renderer.rules.table_open = () => '<div class="table-scroll"><table>\n';
  md.renderer.rules.table_close = () => "</table></div>\n";

  return md;
}
