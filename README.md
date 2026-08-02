# Vinyl Snap

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
2. Create a new **public** repository, e.g. `vinyl-snap`.
3. Upload the files in this folder (`index.html`, `app.js`, `detect.js`,
   `manifest.webmanifest`, `sw.js`, `icon.svg`) — "uploading an existing file" on the
   repo page works from the browser, no git needed.
4. Repo → Settings → Pages → Source: "Deploy from a branch" → branch `main`, folder `/ (root)`.
5. After a minute your app is live at `https://YOURNAME.github.io/vinyl-snap/`.
6. Open that address in Chrome on the phone → menu (⋮) → **Add to Home screen**.
   It installs like an app and works offline after the first load.

## Saving to Google Drive — two ways

**A. Share… button (zero setup, recommended to start).**
On the export screen tap **Share…**, pick **Drive** in the Android share sheet, choose a
folder, done. The photos keep their generated filenames.

**B. Direct upload (one-time 5-minute setup).**
The app can upload straight into `My Drive / Vinyl Snap / <Artist> - <Album>/`, updating
files in place if you re-shoot. It needs a free Google OAuth Client ID:

1. console.cloud.google.com → create a project.
2. APIs & Services → Library → enable **Google Drive API**.
3. OAuth consent screen → External → app name + your email → add yourself as a **Test user**.
4. Credentials → Create credentials → **OAuth client ID** → type **Web application** →
   under *Authorized JavaScript origins* add your Pages origin, e.g. `https://YOURNAME.github.io`.
5. Copy the Client ID into the app's **Settings** screen.

The app only requests the `drive.file` scope — it can only see files/folders it created,
nothing else in your Drive.

## Shooting tips

- Lay covers and discs on a plain background that contrasts with them (light for dark
  covers, dark for light ones) — that's what the outline detection keys on.
- For matrix / dead-wax shots use the 🔦 torch button and tilt the disc slightly so the
  etched characters catch shadows; use the zoom slider to get close.
- If auto-detect misses, drag the four amber corners, or tap **Auto** to retry / **Full**
  to keep the whole frame. **⟳** rotates the saved photo in 90° steps.

## Privacy

Everything (photos, album info, settings) is stored locally in the browser's IndexedDB on
the phone. Nothing leaves the phone except when you explicitly Share, download the ZIP, or
upload to your own Google Drive.

## Local testing on a PC

Run `powershell -ExecutionPolicy Bypass -File serve.ps1` in this folder and open
http://localhost:8321/ — on localhost the camera works without https (or use the 🖼 import
button to test with existing image files).
