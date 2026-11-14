/**
 * Friendly build notes.
 *
 * Nothing an author does in a Markdown file should be able to stop the site
 * from publishing. When something looks off (a picture that can't be found,
 * a date we couldn't read) we carry on, and say so plainly at the end.
 */

const notes = new Map();

/** Remember something worth telling the person who published. */
export function note(file, message) {
  const key = `${file}::${message}`;
  if (!notes.has(key)) notes.set(key, { file, message });
}

export function resetNotes() {
  notes.clear();
}

/** Print everything we noticed. On GitHub these also show up on the run page. */
export function printNotes() {
  if (!notes.size) return;
  const onGitHub = Boolean(process.env.GITHUB_ACTIONS);
  console.log(`\n  A few things to look at (the site was still published):`);
  for (const { file, message } of notes.values()) {
    console.log(`   • ${file}: ${message}`);
    if (onGitHub) {
      const clean = message.replace(/\r?\n/g, " ").replace(/::/g, ": ");
      console.log(`::warning file=${file},title=Worth a look::${clean}`);
    }
  }
  console.log("");
}
