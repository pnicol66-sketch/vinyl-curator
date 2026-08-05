# Vinyl Curator

A camera app for archiving vinyl records on an Android phone (built for a Motorola Razr,
works on any modern phone). It walks you through a fixed checklist of shots per album,
auto-detects the record/sleeve outline and crops the photo (with draggable corners to
fine-tune), names every file from the label artist + album, and saves the set to Google Drive.

## The shot checklist (per album)

01 Front Cover · 02 Back Cover · 03 Other ·
04–07 Side 1–4 Labels ·
08–15 Side 1–4 Matrix and Dead Wax Other

A 1-disc album shows only sides 1–2 (9 shots); choosing "2 discs" adds sides 3–4.
"Other" and "Dead Wax Other" shots are optional and can be skipped.

Files are named like:

    Fleetwood Mac - Rumours - 01 Front Cover.jpg
    Fleetwood Mac - Rumours - 08 Side 1 Matrix.jpg

## Getting it on your phone

The app is a PWA — a set of static files that must be hosted at an **https** address
(Chrome only allows camera access over https). The easiest free option is GitHub Pages:

1. Create a free account at github.com (if you don't have one).
2. Create a new **public** repository, e.g. `vinyl-curator`.
3. Upload the files in this folder (`index.html`, `app.js`, `detect.js`,
   `manifest.webmanifest`, `sw.js`, `icon.svg`) — "uploading an existing file" on the
   repo page works from the browser, no git needed.
4. Repo → Settings → Pages → Source: "Deploy from a branch" → branch `main`, folder `/ (root)`.
5. After a minute your app is live at `https://YOURNAME.github.io/vinyl-curator/`.
6. Open that address in Chrome on the phone → menu (⋮) → **Add to Home screen**.
   It installs like an app and works offline after the first load.

## Saving to Google Drive — two ways

**A. Share… button (zero setup, recommended to start).**
On the export screen tap **Share…**, pick **Drive** in the Android share sheet, choose a
folder, done. The photos keep their generated filenames.

**B. Direct upload (one-time 5-minute setup).**
The app can upload straight into `My Drive / Vinyl Curator / <Artist>_<Album>/`, updating
files in place if you re-shoot. It needs a free Google OAuth Client ID:

1. console.cloud.google.com → create a project.
2. APIs & Services → Library → enable **Google Drive API**.
3. OAuth consent screen → External → app name + your email → add yourself as a **Test user**.
4. Credentials → Create credentials → **OAuth client ID** → type **Web application** →
   under *Authorized JavaScript origins* add your Pages origin, e.g. `https://YOURNAME.github.io`.
5. Copy the Client ID into the app's **Settings** screen.

The app only requests the `drive.file` scope — it can only see files/folders it created,
nothing else in your Drive.

## The Google Sheet helper

The Vinyl Project Google Sheet has a bound Apps Script (kept in a private companion repo —
it travels automatically with copies of the sheet, so there's nothing to install beyond
copying the template). It adds these menus:

**Vinyl Curator** — imports albums from `My Drive / Vinyl Curator` into the sheet
(photo thumbnails in the matching cells, typed matrix text filled in, never overwriting),
plus sorting, For Sale / Sold moves, folder-tag maintenance, and sheet formatting.

**Vinyl Research** — AI pressing research on your album rows:

1. One-time setup: create an API key at console.anthropic.com (Billing → add credits,
   $5 is plenty to start; API Keys → Create Key), then Vinyl Research →
   **Set Anthropic API key…** and paste it. The key is stored privately in your Google
   account, never in the sheet.
2. **Research albums with AI…** — tick the albums, pick the model (Claude Opus 5 —
   deepest research, recommended; Claude Sonnet 5 — faster and about a third of the cost).
3. For each album the AI receives the row's photos (covers, labels, dead-wax close-ups at
   high detail), typed matrix numbers, and current row data, then researches with live web
   search following the built-in Vinyl Research Reference Guide (Discogs variant first,
   bsnpubs/45worlds label dating, Popsike + Discogs sales history for value — always
   pricing the variant, never the master release).
4. Results (Label Name, Label Number, Mono/Stereo, Year, LP Notes, General Notes,
   Price Guide) appear in an approval screen with the current cell values alongside —
   every field editable. **Approve + import** writes them into the matching columns;
   **Research further…** sends your typed guidance back for another round; **Skip**
   moves on without touching the sheet.

Budget roughly 1–4 minutes and $0.10–0.50 per album with Opus 5.

## Sharing it with another collector

The whole system travels with two links — see [INSTALL.md](INSTALL.md) for the
step-by-step guide a new user can follow on their own:

1. **The app**: they open https://pnicol66-sketch.github.io/vinyl-curator/ on their phone
   and Add to Home screen. Their photos and settings stay on their phone.
2. **The sheet**: they open the template
   (https://docs.google.com/spreadsheets/d/1yB7PvMQU4R2pLpuuX_Dr13Eob8cUR2kKNTOAKARwJcY/copy)
   and click **Make a copy** — the bound script travels with the copy, so their private
   copy has all the menus wired up. On first use they authorize the script (the
   "unverified app" warning is normal) and add their **own** Anthropic API key for
   research; nothing of yours is shared and they pay for their own usage.

Use is by permission: the menus check the user's Google account against the owner's
license list, so add their email to the Allowlist tab of the "Vinyl Curator Licenses"
sheet before (or after — it checks daily) sending them the links. Copied sheets don't
track script updates — send licensed users the new script to paste when you ship
improvements.

## Shooting tips

- Lay covers and discs on a plain background that contrasts with them (light for dark
  covers, dark for light ones) — that's what the outline detection keys on.
- For matrix / dead-wax shots use the 🔦 torch button and tilt the disc slightly so the
  etched characters catch shadows; use the zoom slider to get close.
- If auto-detect misses, drag the four amber corners, or tap **Auto** to retry / **Full**
  to keep the whole frame. **⟳** rotates the saved photo in 90° steps.
- Label shots crop as a **circle** (saved on a white square): drag inside the circle to
  move it, drag its edge to resize.
- Matrix / dead-wax entries can be **typed instead of photographed**: tap the ⌨ button on
  the camera screen. Typed entries export as matching `.txt` files next to the photos.

## Privacy

Everything (photos, album info, settings) is stored locally in the browser's IndexedDB on
the phone. Nothing leaves the phone except when you explicitly Share, download the ZIP, or
upload to your own Google Drive.

## Local testing on a PC

Run `powershell -ExecutionPolicy Bypass -File serve.ps1` in this folder and open
http://localhost:8321/ — on localhost the camera works without https (or use the 🖼 import
button to test with existing image files).

## License

© 2026 pnicol66. Shared for personal use; please don't redistribute the app, the sheet
template, or the script without permission — contact pnicol66@gmail.com.
