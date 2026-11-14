# Rhapsodic Reflections

A quiet home for one teacher's writing. Each essay is a plain text file in the
`posts` folder. Add a file, and about a minute later it is on the site, set in
book type with its photographs resized and its date and title in place.

There are two pages, **Home** and **About**, and nothing else to manage.

| To do this | Open this |
| --- | --- |
| Add or change an essay | the [`posts`](posts) folder |
| Add a photograph | the [`posts/images`](posts/images) folder |
| Change the About page | [`about/about.md`](about/about.md) |
| Change the site's name, her name, or the welcome | [`site.yaml`](site.yaml) |

Everything else (the `theme` folder and the files beside this one) is the
machinery, and can be left alone.

---

## Publishing an essay

You can do all of this on github.com, from a computer or a phone.

1. Open the **`posts`** folder.
2. Press **Add file → Create new file**.
3. Give the file a name ending in `.md`, such as `the-first-bell.md`.
   The name becomes the essay's web address, so keep it short, in small
   letters, with hyphens instead of spaces.
4. Paste this at the top and change the two lines:

   ```
   ---
   title: "The First Bell of the Morning"
   date: 14 November 2026
   ---
   ```

5. Write or paste the essay underneath, with an empty line between paragraphs.
6. Press **Commit changes**. That's all.

If the essay is already a file on your computer, use
**Add file → Upload files** instead and drag it in.

There is a ready-made starting point at [`posts/_template.md`](posts/_template.md).
Files whose names begin with `_` never appear on the site.

### If you leave something out

Nothing here can stop an essay from publishing.

- **No title?** The first heading in the essay is used; failing that, the file name.
- **No date?** The day the file was first added is used.
- **A date written differently?** `14 November 2026`, `14th Nov 2026`,
  `14/11/2026` and `2026-11-14` all work. Numbers are read day first.
- **Pasted from Word with no empty lines between paragraphs?** They are still
  set as separate paragraphs.

---

## Photographs

1. Open **`posts/images`** and use **Add file → Upload files**.
2. In the essay, on a line of its own, write:

   ```
   ![A few words describing the picture](my-photo.jpg "A caption to show underneath")
   ```

   The caption in quotes is optional.

Things worth knowing:

- **Upload photographs just as they are.** Each one is resized for phones and
  large screens, turned the right way up, and only loaded when the reader
  scrolls to it, so a photo of several megabytes reaches the reader at a small
  fraction of that size.
- **The first picture in an essay is its thumbnail on the home page.** An essay
  with no picture gets a small cloth-bound cover with its initial instead.
- **For a large picture at the top of the essay**, add `cover: my-photo.jpg` to
  the block at the top instead of putting it in the text.
- **JPG and PNG work.** iPhone photos ending in `.HEIC` do not; save or export
  them as JPG first. If one slips through, the essay still publishes, with a
  short note where the picture would have been.
- File names with spaces, brackets or capital letters are fine
  (`WhatsApp Image 2026-11-14 at 10.30.15.jpeg` works as it is).

---

## Formatting

| Type this | To get |
| --- | --- |
| an empty line | a new paragraph |
| `## A heading` | a section heading |
| `*like this*` | *italics* |
| `**like this**` | **bold** |
| `> like this` | a quotation, set apart |
| `---` on a line of its own | a break, with a small ornament |
| `[the school](https://example.com)` | a link |
| `- first` / `- second` on separate lines | a list |

**Poems and addresses keep their shape.** Type each line on its own line and
leave an empty line between verses.

Quotation marks, apostrophes and dashes are tidied automatically: type plain
`"quotes"` and `--`, and the site sets “quotes” and –.

### The block at the top

Only `title` and `date` are usually needed. The rest are there when you want them.

```
---
title: "The First Bell of the Morning"
date: 14 November 2026
summary: "One or two sentences to show on the home page instead of the opening lines."
cover: school-gate.jpg
cover_caption: "The gate, as it was in 1987."
draft: true
---
```

`draft: true` keeps an essay off the site until you remove that line.

---

## Changing things

**The About page.** Open [`about/about.md`](about/about.md), press the pencil,
and replace the words. To add her photograph, upload it to the `about` folder
and follow the note at the top of that file; it appears in an arched frame.

**The site's name, her name, the welcome.** Open [`site.yaml`](site.yaml) and
change the words between the quotes. Her name is signed at the end of every
essay, heads the About page, and appears in the footer. If someone else wrote
a particular piece, add `author: "Their Name"` to that essay's block at the top.

**An essay you have already published.** Open it in `posts`, press the pencil,
make the change, and commit. To remove one, open it and choose **Delete file**
from the `…` menu. Try not to rename a published file: its web address would
change and old links to it would stop working.

---

## If something looks wrong

Wait two minutes and refresh; publishing takes about a minute.

If it still looks wrong, open the **Actions** tab at the top of the repository
and click the most recent run.

- **A yellow note** means the site published but something needs a look, for
  example a picture that could not be found. The note says which file.
- **A red cross** means that change did not publish. The site itself is
  untouched and still shows the previous version. Click the run to read why,
  fix the file, and it will try again by itself.

---

## Photos and privacy

A photograph taken on a phone usually records where it was taken. The published
site removes that information from every picture. The original files in
`posts/images` keep it, though, and anyone can see the files in a public
repository.

If that matters for a particular photo, do one of these before uploading it:

- send it to yourself on WhatsApp and upload the copy you receive (WhatsApp
  removes the location);
- on an iPhone, choose **Options** on the share sheet and switch **Location** off;
- or make the repository private (this needs a paid GitHub plan to keep the
  site online).

When a photo with a location is uploaded, a note about it appears on the
Actions run.

---

## Working on your own computer (optional)

You never need to. If you would like to see changes before they go live:

```
npm install        # once
npm start          # then open http://localhost:8080
```

The page refreshes as you save. Drafts are shown here, marked as drafts.

```
npm run new -- "The title of the essay"
```

starts a new essay with today's date filled in.

To publish from here, send the changes to GitHub. Photos in `posts/images`
go up with the essay; nothing needs resizing first.

```
git add .
git commit -m "New essay: The First Bell of the Morning"
git push
```

In VS Code you can do the same without typing commands: open **Source
Control** in the left sidebar, write a short message, press **Commit**, then
**Sync Changes**.

---

## Setting it up the first time

1. Put this folder in a repository on GitHub.
2. In the repository, open **Settings → Pages** and under *Build and
   deployment* set **Source** to **GitHub Actions**.
3. Open the **Actions** tab and wait for the green tick. The site is then at
   `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

### Using your own domain

1. In **Settings → Pages → Custom domain**, enter the address with `www`, for
   example `www.rhapsodicreflections.com`, and save.
2. Where the domain is registered, add these DNS records:

   | Type | Host | Value |
   | --- | --- | --- |
   | CNAME | `www` | `YOUR-USERNAME.github.io` |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |

3. Back in **Settings → Pages**, tick **Enforce HTTPS** once it becomes
   available (it can take up to an hour).

Nothing in the files needs changing: the site finds out its own address each
time it publishes.

---

## How it is made

- **[Eleventy](https://www.11ty.dev)** turns the Markdown files into plain web
  pages. There is no database and nothing to keep updated on a server.
- **GitHub Actions** rebuilds the site on every change
  ([`.github/workflows/publish.yml`](.github/workflows/publish.yml)) and
  **GitHub Pages** serves it.
- **Type:** EB Garamond for reading and Cormorant Garamond for titles, both
  kept in this repository under the SIL Open Font Licence, with true small
  capitals and old-style numerals
  ([details](theme/assets/fonts/README.md)).
- **Made for older eyes:** large type, strong contrast, a narrow column, big
  buttons, and **A−** / **A+** at the top of every page for readers who want
  the words larger. The pages work without JavaScript and print cleanly.
- **Link previews:** when a link is shared, WhatsApp and others show the
  essay's first picture, or the card in `theme/assets/img/social-card.jpg`.
  That card and the icons show the site's name; if you rename the site,
  replace them (the card is 1200 × 630 pixels).

```
posts/            the essays, one file each
  images/         their photographs
about/            the About page and her portrait
site.yaml         the site's name and wording
theme/            the design: page layouts, styles, typefaces
eleventy.config.js, package.json    how the site is built
```

The essays and photographs belong to their author. All rights reserved.
