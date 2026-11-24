# Repo command sheet

A plain list of the commands used on **qv4rk/V** (the live site, [feisttech.com](https://feisttech.com/)) and **qv4rk/GrokBotPlayground** (the staging site, [qv4rk.github.io/GrokBotPlayground](https://qv4rk.github.io/GrokBotPlayground/)).

This is for you, Tsiefekim (GitHub: **qv4rk**), so you can keep the work going from a phone (Termux) or a computer if you no longer have Grok Super. You do not need to memorize it. Copy a block, run it, then read the note under it.

The same file lives in three places. Keep them in sync if you edit one:

- `docs/REPO_COMMANDS.md` in `qv4rk/V`
- `REPO_COMMANDS.md` in `qv4rk/GrokBotPlayground`
- a working copy on the bot box at `/workspace/REPO_COMMANDS.md`

Written 24 November 2026, America/New_York. If a later change in the repo disagrees with a detail here, trust the repo and update this sheet.

---

## Contents

1. [The two repos, in one minute](#1-the-two-repos-in-one-minute)
2. [Install git and gh](#2-install-git-and-gh)
3. [Sign in with `gh auth login`](#3-sign-in-with-gh-auth-login)
4. [Clone a repo](#4-clone-a-repo)
5. [The everyday loop: status, add, commit, pull, push](#5-the-everyday-loop-status-add-commit-pull-push)
6. [Branches](#6-branches)
7. [Archive a copy before a takedown](#7-archive-a-copy-before-a-takedown)
8. [Restore an old version without rewriting history](#8-restore-an-old-version-without-rewriting-history)
9. [Open a pull request](#9-open-a-pull-request)
10. [GitHub Pages](#10-github-pages)
11. [Dot-folders are public](#11-dot-folders-are-public)
12. [V's build bot and local tools](#12-vs-build-bot-and-local-tools)
13. [The FeistTech helper commands (`ft-*`)](#13-the-feisttech-helper-commands-ft-)
14. [Articles folder and intake](#14-articles-folder-and-intake)
15. [Generate an image with Pollinations](#15-generate-an-image-with-pollinations)
16. [Convert a Word file with pandoc](#16-convert-a-word-file-with-pandoc)
17. [JSON, pictures, and why some chapter uploads had no images](#17-json-pictures-and-why-some-chapter-uploads-had-no-images)
18. [Encode and decode base64 (Termux APK scripts)](#18-encode-and-decode-base64-termux-apk-scripts)
19. [What never to do](#19-what-never-to-do)
20. [If something goes wrong](#20-if-something-goes-wrong)

---

## 1. The two repos, in one minute

**qv4rk/V** is the live website. GitHub Pages serves the `main` branch, from the repo root, at **https://feisttech.com/**. A file named `CNAME` in the root holds the domain `feisttech.com`. Do not delete that file.

Published articles start as Markdown files in `nodes/`. A GitHub Action (`.github/workflows/deploy.yml`) runs `python build.py` on every push to `main`. That script writes:

- `articles/{id}.html` — standalone article pages
- `data/events.json` — map / atlas metadata
- `data/reading-room/articles/{id}.json` and `data/reading-room/manifest.json` — the Reading Room
- `sitemap.xml`

Those generated files are overwritten on the next build. Edit `nodes/*.md`, not the generated HTML or JSON, if you want a change to last.

**qv4rk/GrokBotPlayground** is the staging site. Nothing there goes live on feisttech.com until you copy it into V and push. GitHub Pages serves it with the workflow `.github/workflows/static.yml`, at **https://qv4rk.github.io/GrokBotPlayground/**. Book chapter folders (`chapter-01/` and so on), `gaspi-3/`, `publication-html/`, and related work live here first.

Other people and bots also push to V, so always pull the latest `main` before you push. See [section 5](#5-the-everyday-loop-status-add-commit-pull-push).

---

## 2. Install git and gh

`git` is the tool that tracks file versions. `gh` is GitHub's official command-line tool. You want both.

### Termux (Android)

Open Termux and run these one at a time.

```bash
pkg update
```

Refreshes the list of packages Termux can install. Run this first on a new install, and again if an install command fails.

```bash
pkg install git gh
```

Installs `git` and the GitHub CLI (`gh`). On some Termux mirrors the package is named `github-cli` instead of `gh`. If the line above cannot find `gh`, run `pkg install git github-cli` instead.

```bash
pkg install python pandoc curl
```

Installs Python (needed to build V locally), pandoc (needed to convert Word files), and curl (needed to download generated images). Skip any that Termux says are already installed.

### Linux desktop (Debian or Ubuntu)

```bash
sudo apt update
```

Refreshes the package list. You need this before installing.

```bash
sudo apt install git gh pandoc python3 python3-pip curl
```

Installs git, the GitHub CLI, pandoc, Python, and curl. On Fedora, use `sudo dnf install git gh pandoc python3-pip curl` instead. On Arch, use `sudo pacman -S git github-cli pandoc python python-pip curl`.

### macOS

If you do not have Homebrew yet, install it from [https://brew.sh](https://brew.sh), then run:

```bash
brew install git gh pandoc
```

Installs git, the GitHub CLI, and pandoc. Python and curl are already present on current macOS.

### Windows

In PowerShell (as a normal user is fine):

```powershell
winget install --id Git.Git --id GitHub.cli --id JohnMacFarlane.Pandoc
```

Installs git, the GitHub CLI, and pandoc. Close and reopen the terminal after it finishes, so the new commands are on your PATH.

### Check that they work

```bash
git --version
```

```bash
gh --version
```

Each should print a version number. If you get "command not found", the install did not finish, or you need to close and reopen the terminal.

---

## 3. Sign in with `gh auth login`

You only need to do this once on each device.

```bash
gh auth login
```

Walks you through signing in to GitHub. Choose these options:

1. **GitHub.com**
2. **HTTPS** (easier than SSH on a phone)
3. **Login with a web browser** (Termux will give you a one-time code; open the URL, paste the code, and approve)
4. If it asks about Git credentials, say yes, so `git push` can use the same login

When it finishes, check:

```bash
gh auth status
```

You should see that you are logged in as **qv4rk**. After this, `git clone`, `git pull`, and `git push` over HTTPS should work without typing a password.

If you later need to edit GitHub Actions workflow files (anything under `.github/workflows/`), the login also needs the `workflow` scope. Content pushes do not need it. To add that scope later:

```bash
gh auth refresh -s workflow
```

Asks GitHub to grant the extra `workflow` permission on this device. Approve it in the browser when prompted. Do not run this unless you actually need to change a workflow file.

---

## 4. Clone a repo

A clone is a full copy of the repo on your phone or computer. You edit the copy, then push your commits back to GitHub.

### V (the live site)

The helper script in the repo expects the folder to be called `v_project_fresh` in your home directory. Use that name on Termux unless you have a reason not to.

```bash
cd ~
```

Moves you to your home directory.

```bash
git clone https://github.com/qv4rk/V.git v_project_fresh
```

Downloads qv4rk/V into `~/v_project_fresh`. This repo is large (a few hundred megabytes), so the first clone can take a few minutes on a phone.

```bash
cd ~/v_project_fresh
```

Enters the repo. Later commands in this sheet assume you are inside the repo unless they say otherwise.

### GrokBotPlayground (staging)

```bash
cd ~
```

```bash
git clone https://github.com/qv4rk/GrokBotPlayground.git
```

Downloads the staging repo into `~/GrokBotPlayground`.

```bash
cd ~/GrokBotPlayground
```

Enters the staging repo.

If the folder already exists and you only need the latest files, do not clone again. Use `git pull --rebase origin main` instead (section 5).

---

## 5. The everyday loop: status, add, commit, pull, push

This is the sequence for almost every change. Do the steps in this order. Other people push to V, so the pull step matters.

### See where you are

```bash
git status
```

Shows which branch you are on, which files you have changed, and which files are new and not yet tracked. Read this before you add or commit anything.

```bash
git diff
```

Shows the actual line-by-line edits that are not staged yet.

```bash
git log --oneline -10
```

Shows the last ten commits, one line each, with their short IDs (SHAs). Useful when you need to name an old version.

### Stage the files you want to keep

```bash
git add path/to/file
```

Marks that one file to go into the next commit. Prefer naming files over `git add .`, so you do not accidentally commit a secret, a huge binary, or someone else's unfinished file.

```bash
git add docs/REPO_COMMANDS.md
```

Example: stage only the command sheet.

To unstage a file you added by mistake, without changing the file itself:

```bash
git restore --staged path/to/file
```

Takes the file out of the upcoming commit. Your edits stay in the file.

### Commit

```bash
git commit -m "A short description of what changed"
```

Saves a snapshot of the staged files on your current branch. The message should say what the commit does, in one line. A commit lives on your machine until you push it.

If git says you must set your name and email (first time on a new device):

```bash
git config --global user.name "qv4rk"
```

```bash
git config --global user.email "223748002+qv4rk@users.noreply.github.com"
```

Sets the author name and the private GitHub noreply address already used on these repos. Then run the `git commit` command again.

### Pull, then push

Always pull before you push, and use rebase so your new commit sits on top of whatever landed on GitHub while you were working.

```bash
git pull --rebase origin main
```

Downloads the latest `main` from GitHub and places your unpushed commits on top of it. If there are no conflicts, you are ready to push. If git reports a conflict, see [section 20](#20-if-something-goes-wrong). Do not add `--force` to get past a conflict.

```bash
git push origin main
```

Uploads your commits to GitHub. Only do this when you intend those changes to go onto `main`. For work you want reviewed first, push a branch instead (sections 6 and 9).

If `git push` is rejected because new commits appeared on GitHub in the meantime, run `git pull --rebase origin main` again, then `git push origin main` again. Never use `--force` to "just make it go through."

---

## 6. Branches

`main` is the live branch on both repos. A branch is a named copy of the work, so you can change things without touching `main` until you are ready.

```bash
git branch
```

Lists local branches. The current one has a `*` next to it.

```bash
git checkout -b my-topic-name
```

Creates a new branch from whatever you are on now, and switches to it. Name it after the work, for example `docs/command-sheet` or `article/puerto-rico-notes`.

```bash
git checkout main
```

Switches back to `main`. Git will refuse if the switch would overwrite uncommitted edits. Commit or stash those edits first.

```bash
git checkout my-topic-name
```

Switches to an existing branch.

```bash
git push -u origin my-topic-name
```

Uploads the branch to GitHub and sets it to track the remote branch. After the first time, `git push` on that branch is enough.

```bash
git branch -a
```

Lists local branches and the remote branches your clone knows about. Remote names start with `remotes/origin/`.

To update that list from GitHub:

```bash
git fetch origin
```

Downloads new branch names and commits, but does not change your files. Safe to run any time.

---

## 7. Archive a copy before a takedown

The standing rule on these repos: **do not delete history, and do not make old versions disappear.** If you are about to take a page or folder down from the live site, keep a copy on an archive branch first. The chapter 22 takedown used this pattern: the branch `archive/ch22-takedown-2026-11-17` was pushed while the old files were still on `main`, and only then were those files removed from `main`.

Do this from a clean `main` (no uncommitted work):

```bash
git checkout main
```

Makes sure you are on `main`.

```bash
git pull --rebase origin main
```

Updates `main` to match GitHub, so the archive holds the latest live files.

```bash
git branch archive/describe-what-and-the-date
```

Creates a local archive branch pointing at this moment, without switching to it. Use a clear name and a date, for example `archive/reading-room-before-cleanup-2026-11-24`.

```bash
git push -u origin archive/describe-what-and-the-date
```

Uploads the archive branch to GitHub. Check on github.com that the branch is there and that the files you care about are in it. Only after that should you delete or move files on `main`.

Taking the files off `main` is a later, ordinary commit (delete or move, then `git add`, `git commit`, `git pull --rebase`, `git push`). The archive branch keeps the old tree. You can always get a file back from it with the restore commands in the next section.

---

## 8. Restore an old version without rewriting history

You can bring back an old file, or undo a commit, without erasing anything. The old commits stay in the history.

### Find the commit you want

```bash
git log --oneline -- path/to/file
```

Lists the commits that touched that file, with their short SHAs.

```bash
git show a1b2c3d:path/to/file
```

Prints the file as it existed in commit `a1b2c3d`. Replace `a1b2c3d` with the real SHA. This does not change any files; it only shows you the old text.

### Put an old copy of a file back into your working tree

```bash
git checkout a1b2c3d -- path/to/file
```

Copies that file from commit `a1b2c3d` into your current branch as a new edit. History is not rewritten. Review the file, then commit it in the usual way (`git add` is already done for that path), and push. That becomes a new commit that "restores" the old content.

To restore a whole folder:

```bash
git checkout a1b2c3d -- path/to/folder
```

Same idea, for every file under that folder.

You can also restore from an archive branch instead of a SHA:

```bash
git checkout archive/ch22-takedown-2026-11-17 -- path/to/file
```

Copies the file from the named branch into your current branch, ready to commit.

### Undo a whole commit by adding a new one

```bash
git revert a1b2c3d
```

Creates a new commit that reverses the changes introduced by `a1b2c3d`. The original commit stays in the history. This is the safe way to undo something that is already on `main`.

If `git revert` opens a text editor for the message, save and close it to finish (in nano: Ctrl+O, Enter, then Ctrl+X).

---

## 9. Open a pull request

A pull request (PR) is a request to merge a branch into `main`. Use this when you want to review the change on GitHub first, or when you will later merge from your local machine after looking at the files. You asked to be able to pull a folder down locally and sort it yourself; a PR is a good way to land that kind of work.

Start from an up-to-date `main`:

```bash
git checkout main
```

```bash
git pull --rebase origin main
```

```bash
git checkout -b my-topic-name
```

Creates and switches to your working branch.

Make your edits, then:

```bash
git add path/to/file
```

```bash
git commit -m "A short description of what changed"
```

```bash
git pull --rebase origin main
```

Rebases your branch onto the latest `main` so the PR is easier to merge.

```bash
git push -u origin my-topic-name
```

Uploads the branch.

```bash
gh pr create --title "Short title" --body "What this changes, and anything a reviewer should check."
```

Opens the pull request against `main` (the default). It will print a URL. Open that URL on GitHub to read the diff.

To merge it from the command line, after you are happy with it:

```bash
gh pr merge --merge
```

Merges the PR with a merge commit (no rebase, no squash, so history stays intact). You can also merge it with the button on GitHub.

To look at an existing PR:

```bash
gh pr list
```

Lists open pull requests.

```bash
gh pr checkout 123
```

Downloads PR number 123 into a local branch and switches to it. Replace `123` with the real number.

---

## 10. GitHub Pages

### How feisttech.com is served

GitHub Pages for **qv4rk/V** is set to:

- Source branch: **`main`**
- Folder: **`/`** (the repo root)
- Custom domain: **feisttech.com**
- HTTPS: on
- The domain name is also stored in the `CNAME` file at the repo root. The file contains one line: `feisttech.com`.

There is a `gh-pages` branch in the repo from earlier work, but the live site is not served from it now. A push to `main` is what updates feisttech.com.

There is also a "Build & Deploy" Action (see [section 12](#12-vs-build-bot-and-local-tools)) that regenerates article pages and commits them back to `main`. After that commit lands, Pages builds again.

### How GrokBotPlayground is served

GitHub Pages for **qv4rk/GrokBotPlayground** is set to:

- Built by the workflow `.github/workflows/static.yml`
- On every push to `main`, and also when you run the workflow by hand
- The workflow uploads the **entire repo** as the site
- Public URL: **https://qv4rk.github.io/GrokBotPlayground/**
- No custom domain

A file at `chapter-22/index.html` is therefore live at `https://qv4rk.github.io/GrokBotPlayground/chapter-22/`. Same pattern for `gaspi-3/`, `book/`, and the rest.

### Check a deploy

For V, list recent Actions runs:

```bash
gh run list --repo qv4rk/V
```

Shows the latest workflow runs, including "Build & Deploy" and "pages build and deployment". Look at the status column: `completed success` means that run finished cleanly. `cancelled` often means a newer push cancelled an older Pages build, which is normal.

```bash
gh api repos/qv4rk/V/pages/builds/latest
```

Prints the most recent Pages build as JSON. Useful fields: `"status"` (should be `"built"`), `"commit"` (the SHA that is live), and `"error"`. Times in this output are UTC (they end in `Z`). Convert to America/New_York when you write them down: UTC minus 5 hours in winter, minus 4 in summer.

For the staging site:

```bash
gh run list --repo qv4rk/GrokBotPlayground
```

Shows "Deploy static content to Pages" and any chapter-binary runs. The Pages URL is in the run, or you can just open https://qv4rk.github.io/GrokBotPlayground/ and refresh.

To watch a run that is still in progress:

```bash
gh run watch
```

Waits until the in-progress run on this repo finishes, and prints the result.

If a Pages build fails, do not force-push a "fix". Read the log, commit a real fix, pull with rebase, and push again.

```bash
gh run view --log-failed
```

Prints the log for the failed steps of the latest failed run.

---

## 11. Dot-folders are public

Both sites have a `.nojekyll` file, and GitHub Pages serves the files that are on the published branch. Folders whose names start with a dot (for example `.drafts-2026-11-05/`) are still in the repo, and a direct URL to a file inside them can be opened by anyone.

A folder URL may show a 404 if there is no `index.html`, but that does not mean the files are private. Anyone who knows or guesses the file path can fetch it.

To take something down:

1. Put an archive branch up first ([section 7](#7-archive-a-copy-before-a-takedown)).
2. Delete the files from `main` (or move them off `main`) and push that commit.
3. Leave the copy on the archive branch. Do not try to scrub it out of git history.

Do not put secrets, keys, unpublished copyrighted research, or anything you would not want public into any folder that is on `main` of V or GrokBotPlayground, even if the folder name starts with a dot.

---

## 12. V's build bot and local tools

### What happens on a push to `main`

The workflow file is `.github/workflows/deploy.yml`. On every push to `main` it:

1. Checks out the repo and installs Python 3.11 plus `requirements.txt` (PyYAML and Markdown).
2. Runs `python build.py`.
3. Stages `data/events.json`, `data/reading-room/`, `articles/`, `sitemap.xml`, and `nodes/tags/` if present.
4. If those files changed, commits them as `auto: regenerate articles and events [skip ci]`.
5. Rebases that commit onto the latest `origin/main` and pushes it.

Only one of these builds may write to `main` at a time. A newer push cancels an older run, so two bots do not race. That is why you sometimes see a cancelled Pages build followed by a successful one.

Because the bot overwrites the generated files, treat these as outputs, not sources:

- `articles/*.html` (except images you added yourself under `articles/images/`)
- `data/events.json`
- `data/reading-room/articles/*.json` and `data/reading-room/manifest.json` when they were produced by `build.py`
- `sitemap.xml`

The source of truth for a published atlas / Reading Room article is `nodes/{id}.md`.

### Run the build yourself

From the V repo root, after you have edited a node:

```bash
pip install -r requirements.txt
```

Installs the two Python libraries the build needs: PyYAML and Markdown. On some systems the command is `pip3` instead of `pip`. You only need to do this when setting up a new device, or if the install is missing.

```bash
python build.py
```

Reads every `nodes/*.md` file and regenerates the article pages, map data, Reading Room JSON, and sitemap. On some systems the command is `python3 build.py`. Read the last lines of output to see how many nodes were built. Fix any error before you commit.

```bash
python check_nodes.py
```

Read-only audit of `nodes/`. It reports draft markers, an `id` that does not match the filename, empty excerpts, and missing required fields (`id`, `title`, `date`, `location`, `excerpt`). It does not change any files. Run this before you publish.

### Short links

`tools/make_shortlinks.py` writes tiny redirect pages so addresses like `https://feisttech.com/gaspi` forward to the real app. GitHub Pages has no server-side rewrites, so each short name is a folder with an `index.html`. The script will not overwrite a folder that already holds a real page.

```bash
python3 tools/make_shortlinks.py
```

Creates or updates the short-link folders listed inside the script. Run this only after you have edited the `SHORTLINKS` map in that file. Then commit the new or changed `index.html` files.

Current short links (as of this sheet): `reader` and `readingroom` → `/apps/webapps/tts/reader/`; `gaza` → `/gaza-damage/`; `gaspi` → `/thegreatgaspi/`; plus `sky`, `natal`, `eigenstate`, `trends`, `solsys`, `omniscope`, `axial`, `keyforge`, and `veil`.

### Publish one Reading Room article from a Markdown file

`tools/publish_article.py` is a narrower tool than `build.py`. It reads a Markdown file with a short frontmatter block, writes `data/reading-room/articles/{id}.json`, and adds the id to `data/reading-room/manifest.json`. It does not create a `nodes/` file. Prefer writing a node and running `build.py` when the piece should also appear on the map. Use this script when you only want the Reading Room entry.

```bash
python3 tools/publish_article.py path/to/article.md --no-push
```

Writes the JSON and updates the manifest, but does not commit or push. Always use `--no-push` first, then review the files with `git diff`, then commit yourself. Without `--no-push`, the script commits and pushes in one step, which is easy to regret.

The input file looks like this:

```text
title: Route 60 to the Master Fund
published: 2026-09-01
excerpt: One or two sentences describing the piece.
tags: october-7, gaza, reconstruction
date: 2023-10-07
location_name: The Gaza perimeter, Route 232
location_lat: 31.4667
location_lon: 34.4917
---
First paragraph.

Second paragraph.
```

Only `title` is required. `published` defaults to today. The article with the latest `published` date becomes the homepage's featured piece, so set that date on purpose.

### Preview the site on your phone or computer

```bash
python3 -m http.server 8000
```

Serves the current directory at http://localhost:8000. In Termux you can open that URL with `termux-open-url http://localhost:8000/`. Press Ctrl+C to stop the server. Run this from the V repo root after `python build.py` if you want to see the generated pages.

### Other scripts (less often used)

- `split_to_nodes.py` — a one-time migration that created `nodes/` from older JSON. It skips files that already exist. You should not need to run it again.
- `tools/alignment_finder.py` — a sky-alignment scanner for the atlas. Needs `pip install skyfield` and a large ephemeris download. Not part of the ordinary article build.
- `tools/build_eclipses.js` — eclipse data helper for the atlas.
- `tools/feisttech.sh` — the Termux helpers in the next section.

---

## 13. The FeistTech helper commands (`ft-*`)

V ships a small set of bash functions for Termux. They live in `tools/feisttech.sh`. They assume the clone is at `~/v_project_fresh`. Install once:

```bash
nano ~/.bashrc
```

Opens your shell startup file. Add this line at the bottom, save, and exit (in nano: Ctrl+O, Enter, Ctrl+X):

```bash
source ~/v_project_fresh/tools/feisttech.sh
```

Tells every new Termux session to load the helpers. If your clone is not at `~/v_project_fresh`, set `FT_HOME` to your path on the line above this one, for example `export FT_HOME=$HOME/V`.

```bash
source ~/.bashrc
```

Loads the file in the current session so you do not have to close Termux.

Then these commands are available:

```bash
ft
```

Prints the list of helper commands.

```bash
ft-new "Article title" optional-id
```

Creates `nodes/optional-id.md` (or a slug from the title) with a starter frontmatter block, then opens it in your editor (`nano` unless you set `EDITOR`).

```bash
ft-edit some-id
```

Opens `nodes/some-id.md` in your editor.

```bash
ft-list
```

Lists every node with its id, year, and title.

```bash
ft-build
```

Runs `python build.py` in the repo.

```bash
ft-status
```

Shows whether you are on `main`, what has changed under `nodes/`, `data/`, and `articles/`, and whether GitHub's `main` is ahead of you.

```bash
ft-preview some-id
```

Builds, starts a local server, and (in Termux) opens the article page. It also prints the Reading Room and map URLs for that id.

```bash
ft-publish "Commit message"
```

This one is powerful: it stashes your `nodes/` edits, pulls `main` with rebase, pops the stash, builds, commits, and pushes to `main`. Only run it when you intend to publish, you are already on `main`, and you have reviewed the diffs. If you would rather keep control, skip this and use the ordinary add / commit / pull / push steps in section 5.

```bash
ft-serve
```

Serves the repo at http://localhost:8000 until you press Ctrl+C.

---

## 14. Articles folder and intake

### Current locations (as of 24 November 2026, America/New_York)

`articles_consolidated/` is **not yet on `qv4rk/V` main**. A designated intake folder for drop-in Markdown, PDF, Word, or JSON files is also not on `main` yet. Another piece of work is meant to add both. When those folders land, update the boxed notes below with the real paths and any automated steps.

Until then, article text is scattered across these places in V:

| Place | What it is | Edit this? |
| --- | --- | --- |
| `nodes/*.md` | Source Markdown for published atlas / Reading Room pieces | Yes — this is the source of truth |
| `articles/{id}.html` | Pages generated by `build.py` | No, they get overwritten |
| `articles/images/` | Image files used by some published chapters (for example chapter 22) | Yes, add real image files here and reference them from the node |
| `data/reading-room/articles/{id}.json` | Reading Room copies, usually generated from nodes | Not if they come from `build.py` |
| `data/reading-room/manifest.json` | The list of Reading Room ids | Updated by the build or by `publish_article.py` |
| `readingroom/` | Older standalone HTML pages | Leave unless you are cleaning this on purpose |
| `.drafts-2026-11-05/` | Draft snapshot still in the repo | Treat as public; do not add secrets. Archive before deleting |

GrokBotPlayground holds chapter work under `chapter-01/` … `chapter-27/`, plus `publication-html/`, `narrative-docx/`, `book/`, and `gaspi-3/`.

> **Fill in when the folders exist**
>
> - Consolidated archive folder (planned name): `articles_consolidated/` at the root of qv4rk/V. This is a copy of existing articles, gathered in one place so you can sort them locally. It is an archive, not a second source of truth, unless you later decide otherwise.
> - Intake folder (name to be confirmed): a single folder you can drop a new `.md`, `.pdf`, `.docx`, or `.json` into, then `git add`, `git commit`, and `git push`. After a `git pull`, that file will be on your other machines too.
> - If a script later auto-publishes files from the intake folder, document the command and what it writes in `nodes/` or `data/reading-room/` here.

### How to use a drop folder, even before any automation exists

You do not need a special script for "I added a file and I want it in the repo." From the repo root:

```bash
mkdir -p articles_consolidated
```

Creates the folder if it is not there yet. Only do this if you have decided to start the folder yourself. If another commit has already added it, skip this and use the existing folder.

```bash
cp /path/to/your-article.md articles_consolidated/
```

Copies your article into the folder. Use the real path of your file. Repeat for `.pdf`, `.docx`, or `.json` as needed. Put images for that article in a subfolder next to it, for example `articles_consolidated/your-article/images/`, rather than embedding pictures as base64 unless you have a reason (see [section 17](#17-json-pictures-and-why-some-chapter-uploads-had-no-images)).

```bash
git add articles_consolidated/
```

Stages everything new or changed under that folder.

```bash
git status
```

Read this. Make sure you are not staging secrets or huge unrelated files.

```bash
git commit -m "Add article files to articles_consolidated"
```

```bash
git pull --rebase origin main
```

```bash
git push origin main
```

After the push, run `git pull --rebase origin main` on your other clone (for example your computer, if you pushed from the phone), and the folder will be there.

---

## 15. Generate an image with Pollinations

Book and site images for this project have been generated with Pollinations, using a wide landscape size of 1344×768, the `flux` model, and `nologo=true`. A prompt of about 55 words works well: describe the scene first, then a short style tail. These are landscape shots, not portraits.

You can do this with curl. The prompt must be URL-encoded (spaces become `%20`, and so on). The easiest reliable way is to let Python encode it, then pass the result to curl.

```bash
PROMPT="Wide landscape of San Juan harbor at dusk, wooden wharves in the foreground, Spanish colonial facades and ships at anchor, humid sky, documentary oil painting, no text, no caption, no watermark"
```

Stores the prompt in a variable. Replace the sentence with your own.

```bash
ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$PROMPT")
```

Turns the prompt into a URL-safe string and stores it as `ENCODED`.

```bash
curl -L "https://image.pollinations.ai/prompt/${ENCODED}?width=1344&height=768&nologo=true&seed=1&model=flux" -o scene.jpg
```

Downloads the image to `scene.jpg` in the current directory. `-L` follows redirects. Change `seed=1` to another integer (`2`, `3`, …) to get a different picture from the same prompt. Change `-o scene.jpg` to the filename you want.

Then commit the image file itself (for example into `articles/images/` or a chapter `panels/` folder), and point the Markdown or HTML at that file. Do not rely on the Pollinations URL as the permanent picture: it can change or fail later.

---

## 16. Convert a Word file with pandoc

pandoc reads a `.docx` and writes Markdown. The important flag is `--extract-media`, which pulls the pictures out as real files and rewrites the Markdown to point at them. Without that flag you can end up with a text file and no pictures, which is what happened when some chapter uploads looked like they failed.

```bash
pandoc chapter.docx -t markdown -o chapter.md --extract-media=./chapter-media
```

Converts `chapter.docx` to `chapter.md` and writes the embedded pictures into `./chapter-media/` (usually under `chapter-media/media/`). Run this from the folder where you want those files to appear. Then open `chapter.md` and check that the image links look like `![](chapter-media/media/image1.jpg)` and that those files exist.

Commit **both** the Markdown and the media folder:

```bash
git add chapter.md chapter-media/
```

```bash
git commit -m "Add chapter text and extracted images"
```

Then pull with rebase and push, as in section 5.

To convert the other way (Markdown plus images back to Word):

```bash
pandoc chapter.md -o chapter.docx
```

Writes a `.docx`. Pictures that are linked from the Markdown with real file paths will be included. Pictures that were only in a chat upload, or only described, will not.

---

## 17. JSON, pictures, and why some chapter uploads had no images

Yes, a JSON file can hold a picture if you encode the picture as base64 and put the string in a field, or as a `data:image/jpeg;base64,...` URL inside Markdown. That works as a last resort. It is usually the wrong default for these repos.

Why:

- Base64 makes a file about one third larger than the original picture.
- GitHub warns at 50 MB per file and hard-rejects files over 100 MB.
- The current Reading Room JSON shape is `id`, `title`, `published`, `date`, `location`, `excerpt`, `content`, `tags`, and sometimes `voice`. The `content` field is text / Markdown. The reader may not display a giant data-URI image the way you expect.
- Git and GitHub handle ordinary `.jpg` / `.png` files well. You can open them, diff the path, and replace one picture without rewriting a huge JSON file.

**The reliable method:** keep the article text in Markdown or JSON, keep each picture as its own file, and reference it with a relative path, for example:

```markdown
![Ibrahim addresses the notables](images/sotm0022-ps-ar-01-ibrahim-addresses-notables.jpg)
```

That is how chapter 22's pictures live under `articles/images/` on V, and how chapter panels live under `chapter-22/panels/` on GrokBotPlayground.

If a chapter you uploaded had text but no pictures, the usual cause is that the commit contained the `.md` or `.docx` but not the image files. Fix it by adding the images (extract them with pandoc if they are stuck inside a Word file), committing them, and checking the paths in the Markdown.

If you still need to encode one small image into a file, see the next section, then use a field such as:

```json
"image_data_uri": "data:image/jpeg;base64,/9j/4AAQ..."
```

Do not paste a huge base64 blob into a chat message or a commit message. Keep it in a file.

---

## 18. Encode and decode base64 (Termux APK scripts)

You have shell scripts stored as one long base64 string that, once decoded, build, sign, and align a working APK in Termux. The commands below only encode or decode a file you already have. They do not change what the script does.

### Encode a file to base64

On Termux and most Linux desktops:

```bash
base64 -w 0 myscript.sh > myscript.sh.b64
```

Writes a single-line base64 copy of `myscript.sh` to `myscript.sh.b64`. `-w 0` means "do not wrap lines." Keep the original script too.

On macOS, `base64` has no `-w` flag. Use this instead:

```bash
base64 -i myscript.sh | tr -d '\n' > myscript.sh.b64
```

Same result: one line of base64 in `myscript.sh.b64`.

### Decode base64 back into a file

On Termux and Linux:

```bash
base64 -d myscript.sh.b64 > myscript.sh
```

Writes the original bytes to `myscript.sh`. Look at the file before you run it.

On macOS:

```bash
base64 -D -i myscript.sh.b64 -o myscript.sh
```

Same thing, using the macOS flag `-D`.

```bash
chmod +x myscript.sh
```

Marks the decoded file as executable, if it is a script you intend to run.

To encode or decode a binary (an APK, a keystore, a PNG):

```bash
base64 -w 0 app.apk > app.apk.b64
```

```bash
base64 -d app.apk.b64 > app.apk
```

Same commands; base64 does not care whether the file is text or binary.

**Be careful with keystores and signing keys.** A decoded keystore is a secret. Do not commit it, do not put it on `main`, and do not store it in a folder that GitHub Pages will serve. If a script contains a password or a key, keep that script off these public repos.

---

## 19. What never to do

These rules are standing rules for qv4rk/V and qv4rk/GrokBotPlayground. They are not style tips; they prevent irreversible damage.

**Never force-push.**

```bash
# do not run these
git push --force
git push --force-with-lease
git push -f
```

A force-push overwrites the branch on GitHub and can erase other people's commits. If a push is rejected, pull with rebase and push again.

**Never hard-reset a branch that has been pushed, and never hard-reset to discard work you have not inspected.**

```bash
# do not run this
git reset --hard
```

This throws away uncommitted work, and if you move `main` backwards and push, you are into force-push territory. If you only need to undo a commit that is already on GitHub, use `git revert` ([section 8](#8-restore-an-old-version-without-rewriting-history)).

**Never commit secrets or keys.** That includes API keys, tokens, `.env` files, `id_rsa` and other private keys, keystores, signing passwords, and pasted `Authorization` headers. If a file might contain a secret, do not add it. If a secret was already committed, do not try to rewrite history to hide it; treat it as public, rotate the key, and remove the file in a new commit.

**Never rewrite published history.** No `git rebase` of commits that are already on `origin/main`, no `git commit --amend` of a commit you already pushed, no `git filter-branch` / `git filter-repo`. `git pull --rebase` is the exception: it only rebases your local, not-yet-pushed commits on top of the latest `main`.

**Never take something down without an archive branch.** See [section 7](#7-archive-a-copy-before-a-takedown).

**Do not treat generated files as the source.** Edit `nodes/*.md` (or the staging files in GrokBotPlayground), then rebuild.

---

## 20. If something goes wrong

### `git pull --rebase` reports a conflict

Git will list the conflicted files. Open each one and look for conflict markers: `<<<<<<<`, `=======`, and `>>>>>>>`. Keep the correct lines, delete the markers, then:

```bash
git add path/to/resolved-file
```

Marks the file as resolved.

```bash
git rebase --continue
```

Continues the rebase. Repeat if another conflict appears.

If you have not finished the rebase and you want to go back to how things were before the pull (your local uncommitted situation may still need care; this aborts the rebase):

```bash
git rebase --abort
```

Cancels the in-progress rebase and returns the branch to the state just before `git pull --rebase`. It does not fix the underlying conflict; it just stops the rebase so you can try again later. Do not use this to avoid reviewing a conflict you already started resolving on a public branch.

### You committed a file you did not mean to, but you have not pushed yet

```bash
git reset --soft HEAD~1
```

Moves the last commit off the branch but keeps all the changes staged. You can unstage the extra file with `git restore --staged path`, then commit again. **Only do this if that last commit has not been pushed.** If it is already on GitHub, use a new commit that deletes the file instead, or `git revert`.

### You are not sure what branch you are on, or whether you are behind

```bash
git status
```

```bash
git fetch origin
```

```bash
git log --oneline --decorate -15
```

The first command is the most useful. The third shows where `main` and `origin/main` are relative to you.

### A Pages or build run failed

```bash
gh run list
```

```bash
gh run view --log-failed
```

Read the error, fix the file, commit, pull with rebase, and push. Give the Action a minute or two, then check again.

### You want a second local copy to preview a branch without touching your main clone

```bash
git clone --branch some-branch --single-branch https://github.com/qv4rk/V.git /path/to/preview-folder
```

Creates a separate folder that only contains `some-branch`. Replace the branch name and the folder path. This is what `ft-check` does for you if you use the helper script.

---

That is the working set. When a new folder, script, or Pages setting is added, update this sheet in both repos in a new commit, and do not overwrite an older copy in git history.
