/**
 * Finding pictures, generously.
 *
 * An author writes `![My classroom](classroom.jpg)` and expects to see the
 * picture. So we look for it wherever it could reasonably be: beside the
 * essay, in an `images` folder, at the path from the top of the repository,
 * and without minding capital letters (`Classroom.JPG` is the same picture).
 *
 * Before each build we also look inside every picture once, to learn which
 * ones can't be read (iPhone .HEIC files, damaged files) and which still
 * carry the GPS position of where they were taken.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { note } from "./notes.js";

const ROOT = process.cwd();
const PICTURE = /\.(jpe?g|png|gif|webp|avif|svg|tiff?|bmp|heic|heif)$/i;

/** file path → { ok, width, height, reason } */
const facts = new Map();
const listings = new Map();

function list(dir) {
  if (!listings.has(dir)) {
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      // not a folder
    }
    listings.set(dir, names);
  }
  return listings.get(dir);
}

const same = (a, b) => a.normalize("NFC").toLowerCase() === b.normalize("NFC").toLowerCase();

/**
 * The path as it is really spelled on disk, or null. Walking the folders one
 * name at a time matters: a Mac will happily open `photo.jpg` when the file is
 * `Photo.JPG`, but the Linux machine that publishes the site will not.
 */
function realPath(candidate) {
  const relative = path.relative(ROOT, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  let current = ROOT;
  for (const segment of relative.split(path.sep)) {
    const names = list(current);
    const match = names.includes(segment) ? segment : names.find((name) => same(name, segment));
    if (!match) return null;
    current = path.join(current, match);
  }
  try {
    return fs.statSync(current).isFile() ? current : null;
  } catch {
    return null;
  }
}

const toUrl = (file) => "/" + path.relative(ROOT, file).split(path.sep).map(encodeURIComponent).join("/");

/**
 * Work out which file an author meant.
 * Returns { kind: "remote" | "local" | "unreadable" | "missing", ... }.
 */
export function resolveImage(src, inputPath) {
  const raw = String(src || "").trim();
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(raw) || /^data:/i.test(raw)) return { kind: "remote", src: raw };

  let wanted = raw;
  try {
    wanted = decodeURIComponent(raw);
  } catch {
    // a stray % sign; use it as written
  }
  wanted = wanted.replace(/\\/g, "/").replace(/[?#].*$/, "");
  if (!wanted) return { kind: "missing", wanted: raw };

  const folder = path.dirname(path.resolve(ROOT, inputPath || "."));
  const name = path.basename(wanted);
  const fromRoot = wanted.replace(/^\/+/, "");
  const candidates = wanted.startsWith("/")
    ? [path.join(ROOT, fromRoot)]
    : [path.resolve(folder, wanted), path.join(ROOT, fromRoot)];
  candidates.push(path.join(folder, "images", name), path.join(ROOT, "posts", "images", name), path.join(folder, name));

  for (const candidate of candidates) {
    const file = realPath(candidate);
    if (!file) continue;
    const fact = facts.get(file);
    if (fact && !fact.ok) return { kind: "unreadable", wanted: raw, file, reason: fact.reason };
    return { kind: "local", file, url: toUrl(file), width: fact?.width, height: fact?.height };
  }
  return { kind: "missing", wanted: raw };
}

/** Does this EXIF block record where the photograph was taken? */
function hasGps(exif) {
  try {
    if (!exif || exif.length < 14) return false;
    let start = exif.indexOf("Exif\0\0") === 0 ? 6 : 0;
    const order = exif.toString("latin1", start, start + 2);
    if (order !== "II" && order !== "MM") return false;
    const little = order === "II";
    const u16 = (at) => (little ? exif.readUInt16LE(at) : exif.readUInt16BE(at));
    const u32 = (at) => (little ? exif.readUInt32LE(at) : exif.readUInt32BE(at));
    const ifd = start + u32(start + 4);
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
      const entry = ifd + 2 + i * 12;
      if (u16(entry) !== 0x8825) continue; // GPSInfo
      const gps = start + u32(entry + 8);
      const tags = u16(gps);
      for (let j = 0; j < tags; j++) {
        const tag = u16(gps + 2 + j * 12);
        if (tag === 2 || tag === 4) return true; // latitude or longitude
      }
    }
  } catch {
    // an unusual EXIF block; nothing to report
  }
  return false;
}

function walk(dir, found = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (PICTURE.test(entry.name)) found.push(full);
  }
  return found;
}

const seen = new Map(); // file → "mtime:size", so unchanged pictures are only opened once

/** Look inside every picture in the content folders. Runs before each build. */
export async function scanImages(folders = ["posts", "about"]) {
  listings.clear();
  const files = folders.flatMap((folder) => walk(path.join(ROOT, folder)));
  await Promise.all(
    files.map(async (file) => {
      const relative = path.relative(ROOT, file);
      let stamp = "";
      try {
        const stat = fs.statSync(file);
        stamp = `${stat.mtimeMs}:${stat.size}`;
      } catch {
        return;
      }
      if (seen.get(file) === stamp && facts.has(file)) return;
      seen.set(file, stamp);

      if (/\.svg$/i.test(file)) {
        facts.set(file, { ok: true });
        return;
      }
      try {
        const meta = await sharp(file).metadata();
        if (meta.format === "heif" && meta.compression && meta.compression !== "av1") {
          throw new Error("iPhone HEIC");
        }
        const turned = meta.orientation >= 5;
        facts.set(file, { ok: true, width: turned ? meta.height : meta.width, height: turned ? meta.width : meta.height });
        if (hasGps(meta.exif)) facts.get(file).gps = true;
      } catch (error) {
        const heic = /\.(heic|heif)$/i.test(file) || /HEIC|heif/i.test(String(error?.message));
        facts.set(file, {
          ok: false,
          reason: heic
            ? "it is an iPhone .HEIC photo. Save or export it as a JPG and upload that instead"
            : "the file could not be opened as a picture. Try saving it again as a JPG",
        });
        note(relative, `This picture can't be shown: ${facts.get(file).reason}.`);
      }
    }),
  );
  for (const file of facts.keys()) if (!files.includes(file)) facts.delete(file);

  const located = files.filter((file) => facts.get(file)?.gps).map((file) => path.relative(ROOT, file));
  if (located.length) {
    const sample = located.slice(0, 5).join(", ") + (located.length > 5 ? `, and ${located.length - 5} more` : "");
    note(
      "photos",
      `${located.length} original photo${located.length > 1 ? "s" : ""} in this repository still ${located.length > 1 ? "record" : "records"} the GPS position where ${located.length > 1 ? "they were" : "it was"} taken (${sample}). ` +
        `The published site strips this out, but the original files in a public repository do not. See "Photos and privacy" in the README.`,
    );
  }
}
