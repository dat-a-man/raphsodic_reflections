#!/usr/bin/env node
/**
 * Start a new essay with today's date already filled in.
 *
 *   npm run new -- "The title of the essay"
 */
import fs from "node:fs";
import path from "node:path";
import { slugify } from "../theme/lib/text.js";

const title = process.argv.slice(2).join(" ").trim();
if (!title) {
  console.log('\n  Give the essay a title, like this:\n\n    npm run new -- "The First Bell of the Morning"\n');
  process.exit(1);
}

const file = path.join("posts", `${slugify(title)}.md`);
if (fs.existsSync(file)) {
  console.log(`\n  ${file} already exists. Open it, or choose a different title.\n`);
  process.exit(1);
}

const today = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
const safeTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
fs.writeFileSync(file, `---\ntitle: "${safeTitle}"\ndate: ${today}\n---\n\nStart writing here. Leave an empty line between paragraphs.\n`);
console.log(`\n  Created ${file}\n  Write the essay there, then run "npm start" to see it.\n`);
