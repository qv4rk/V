# reading_room_inbox: drop an article here, push, and it's published

This is the one folder for new Reading Room articles on feisttech.com.
Put a file here, `git push`, and about two minutes later it is live at
`https://feisttech.com/articles/<file-name>.html` and in the Reading Room
(`https://feisttech.com/readingroom/`), with its pictures.

How it works: every push to `main` runs the site's existing build
(`.github/workflows/deploy.yml` → `python build.py`). `build.py` now also reads
this folder through `inbox.py`, makes the article page, pulls the pictures out
of Word files, and the build bot commits the result. No new workflow needed.

## Which format?

| Format | Pictures | Use it when |
|---|---|---|
| **Markdown `.md` + picture folder** (best) | files in a folder next to it | you want full control; smallest, cleanest, easiest to fix later |
| **Word `.docx`** | pictures inside the document are extracted automatically | you wrote it in Word / Google Docs |
| **JSON `.json`** | base64 inside the file (works, but files get big) | a tool or script made the article |
| PDF `.pdf` | **not supported** | export it to `.docx` first (Word: File → Save As) |

The file name becomes the web address, so name it the way you want the link:
`sotm0023-ps-ar.md` → `feisttech.com/articles/sotm0023-ps-ar.html`.
Use lowercase letters, numbers and dashes.

## 1. Markdown (recommended)

```
reading_room_inbox/
  my-article.md
  my-article/
    picture-1.jpg
    picture-2.jpg
```

Copy `_TEMPLATE.md`, rename it, fill in the title, write the text. Put pictures
in a folder and point to them with a path relative to the `.md` file:

```markdown
![Boats on the Pearl River, 1839](my-article/picture-1.jpg)
```

**Commit the picture files too.** A picture that isn't committed is the #1
reason pictures go missing. The build log prints
`WARNING ... picture not found` when that happens.

## 2. Word (.docx)

Just drop `my-article.docx` in the folder. Pictures pasted into the document
are pulled out to `articles/images/my-article/`. The title comes from the
first Heading 1 / Heading 2 in the document, otherwise from the file name.
To set the title, excerpt or place yourself, add a small `my-article.yml`
next to it:

```yaml
title: "Boats at Canton, 1839"
excerpt: "The fast crabs that ran opium up the Pearl River."
```

Check that the pictures are really *inside* the .docx before you push:
the file should be megabytes, not a few kilobytes (on a computer:
`unzip -l my-article.docx | grep media`).

## 3. JSON with base64 pictures (optional)

```json
{
  "title": "My Article",
  "excerpt": "Short summary.",
  "content": "First paragraph.\n\n![Caption](picture-1.jpg)\n\nSecond paragraph.",
  "images": { "picture-1.jpg": "<base64 of the jpg, or a data:image/jpeg;base64,... URI>" }
}
```

Make the base64 in Termux / Linux: `base64 -w0 picture-1.jpg > picture-1.b64`.

## Publish (from your phone or computer)

```bash
cd V                                   # your local copy of qv4rk/V
git pull --rebase                      # get the latest first (other agents push too)
cp ~/Downloads/my-article.docx reading_room_inbox/
git add reading_room_inbox/
git commit -m "Reading Room: add my-article"
git push
```

Then open `https://github.com/qv4rk/V/actions` and wait for the green tick
(about 1–2 minutes), and open `https://feisttech.com/articles/my-article.html`.

## Change or remove an article

- Change: edit the file in this folder and push again. The page is rebuilt.
- Hide without deleting: add `draft: true` to the top (Markdown/JSON/.yml),
  or rename the file to start with `_` (e.g. `_my-article.md`). Push.
  The old page file stays until it is cleaned up, so ask for it to be retired
  if it must disappear right away.

## Rules the build follows

- Files and folders starting with `_` or `.` are ignored, and so is this README.
- If an article with the same name already exists in `nodes/`, the inbox file
  is skipped (the log says so). Pick another file name.
- No `location` with `lat`/`lon` → the article is published and listed, but no
  dot is put on the Atlas globe.
- One bad file never breaks the rest of the site build; it is skipped with a
  message in the build log (Actions tab → latest run → "Run build script").
