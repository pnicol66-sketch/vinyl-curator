# Vinyl Curator

A camera app for archiving vinyl records on an Android phone (built for a Motorola Razr,
works on any modern phone). It walks you through a fixed checklist of shots per album,
auto-detects the record/sleeve outline and crops the photo (with draggable corners and
side handles to fine-tune), names every file from the label artist + album, and saves the
set to Google Drive.

## The shot checklist (per album)

01 Front Cover · 02 Front Cover Grade · 03 Back Cover · 04 Back Cover Grade · 05 Other ·
06–13 Side 1–4 Labels and Vinyl Grades ·
14/16/18/20 Side 1–4 Matrix/Runout (typed text + up to 4 optional photos each; numbers
15/17/19/21 are retired — they belonged to the old "Dead Wax Other" entries, now merged
into the Matrix/Runout text)

Grade entries (02, 04, 07, 09, 11, 13) are typed, not photographed, and export as `.txt`.
A 1-disc album shows only sides 1–2; choosing "2 discs" adds sides 3–4.
The "Other" shot is optional and can be skipped.

Files are named like:

    Fleetwood Mac - Rumours - 01 Front Cover.jpg
    Fleetwood Mac - Rumours - 14 Side 1 Matrix Runout.txt
    Fleetwood Mac - Rumours - 14 Side 1 Matrix Runout A1.jpg

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
6. Open that address on the phone and install it — Android: **Install app on this phone**
   on the home screen (or menu ⋮ → Install app). iPhone: **Share** → **Add to Home Screen**,
   which the app prompts for, since Safari allows no install button.
   It then runs full-screen and works offline after the first load.

## Saving to Google Drive — two ways

**A. Share… button (zero setup, recommended to start).**
On the export screen tap **Share…**, pick **Drive** in the Android share sheet, choose a
folder, done. The photos keep their generated filenames.

Note what this path *cannot* do: the app hands the files to Android and has no say in
where they land or how they are arranged. There are no `<Artist>_<Album>` folders — every
file drops loose into whatever folder the Drive save dialog happens to be pointing at,
which defaults to My Drive. If you are sharing a folder with someone, this is the usual
reason your files never show up on their side. Use **B** for that.

**B. Direct upload (recommended — no setup for the person using the app).**
The app uploads straight into `My Drive / Vinyl Curator / <Artist>_<Album>/`, updating files
in place if you re-shoot, and offers to share that folder with the curator on the first
upload. For someone handed a ready-made build, the whole procedure is: tap **Upload to
Google Drive**, sign in with their own Google account, allow, accept the sharing prompt.
Their photos stay in their own Drive; the curator gets read-only access to that one folder.

### Building a copy for someone else

Fill in `BUILTIN` at the top of `app.js` — once, for everyone:

```js
const BUILTIN = {
  clientId: '…apps.googleusercontent.com',
  apiKey: '',            // only if you want the advanced Link… picker
  projectNumber: '',     // ditto
  shareWith: 'you@example.com',
};
```

An OAuth client id identifies the **app**, not the user, and is public by design in a
browser app — it is in the page source either way. One Cloud project of yours serves every
client; none of them ever opens the Cloud console.

Publish the consent screen to **In production** rather than leaving it in Testing. The app
requests only `drive.file`, which Google classes as a
[non-sensitive scope](https://developers.google.com/workspace/drive/api/guides/api-specific-auth),
so this needs [no verification review](https://support.google.com/cloud/answer/13463073).
Left in Testing you must add each user's address as a test user by hand (100 max) and they
meet an "unverified app" warning.

Anything left blank in `BUILTIN` falls back to the Settings screen, so an unfilled build
behaves exactly as it always did.

### Setting up the Cloud project (one time, yours)
It needs a free Google OAuth Client ID:

1. console.cloud.google.com → create a project.
2. APIs & Services → Library → enable **Google Drive API**.
3. OAuth consent screen → External → app name + your email → add yourself as a **Test user**.
4. Credentials → Create credentials → **OAuth client ID** → type **Web application** →
   under *Authorized JavaScript origins* add your Pages origin, e.g. `https://YOURNAME.github.io`.
5. Copy the Client ID into the app's **Settings** screen.

The app only requests the `drive.file` scope — it can only see files/folders it created,
nothing else in your Drive.

### How the sharing works

`drive.file` cuts both ways. The app can only see folders **it** created — which is exactly
why it creates its own rather than expecting one to be prepared for it. Because the folder
is app-created, the app may also grant permission on it, so on the first upload it asks the
person using it:

> Share "Vinyl Curator" with you@example.com? … You stay the owner, nothing else in your
> Drive is shared, and you can stop sharing at any time from Drive itself.

Accepted, it POSTs a `reader` permission
([`permissions.create` accepts `drive.file`](https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/create))
and records the decision so it never asks about that folder again. Per-album subfolders
inherit the sharing, so every later upload arrives without anyone touching Drive.

Declining is remembered too — no nagging on every upload — and any sharing failure is
reported but never aborts the upload. Set `shareWith` to empty and nothing is ever shared.

### Advanced: uploading into a folder that already exists

Only needed when someone already has a folder full of photos, or insists on a specific
shared folder. A folder made by hand in the Drive UI, or one someone else owns and shared
with you, is **invisible** to the app, so it would create a second folder of the same name
and upload into that — real files in a real folder nobody else can see.

**Link…** in Settings fixes that case. Next to each folder entry it opens the Google
Picker; choosing a folder there grants the app `drive.file` access to that exact folder,
and the app stores its Drive id and uploads there from then on. It is the only way to reach
a folder the app did not create. (The Sheet script's `IMPORT_FOLDER` takes an id or a name
for the same reason.)

**Link…** needs two extras from the same Cloud project, in `BUILTIN` or in Settings:

6. Library → also enable **Google Picker API**.
7. Credentials → Create credentials → **API key** → paste into *API key*.
8. The **project number** from the Cloud console Dashboard → paste into *Cloud project
   number*. (Picker's `setAppId` requires it under `drive.file`.)

Leave these blank and everything works as before, by folder name in My Drive. If a linked
folder is later deleted or unshared the upload stops with an error asking you to re-link —
it deliberately does not fall back to creating a folder by name, since that silent
duplicate is the whole problem being avoided.

Shared drives (Team Drives) are not supported as link targets; use a normal folder shared
with the other account.

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
   and install it (Android: Install app; iPhone: Share → Add to Home Screen). Their photos
   and settings stay on their phone.
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
- For matrix/runout shots use the 🔦 torch button and tilt the disc slightly so the
  etched characters catch shadows; use the zoom slider to get close. If the image goes
  blurry up close, drag the **Focus** slider (left = nearest) or tap **AF** to re-run
  autofocus (both appear only on cameras that support focus control).
- If auto-detect misses, drag the four amber corners, drag the amber bar on any side to
  move that whole edge in or out, or drag inside the frame to shift the whole crop box.
  Tap **Auto** to retry / **Full** to keep the whole frame. **⟳** rotates the saved photo
  in 90° steps. Dragging a corner, a side, or a circle's ring pops a 3× magnifier in the
  far top corner so your fingertip isn't hiding the edge you're lining up.
- Matrix/Runout shots crop as a **strict rectangle** — corners carry their neighbours, so
  the frame stays square-on and the photo is never warped to straighten it. **◇ Skew**
  (in place of Auto on those screens) releases the corners; **▭ Rect** snaps back.
- Label shots crop as a **circle** (saved on a white square): drag inside the circle to
  move it, drag its edge to resize.
- Matrix/Runout entries are **typed** (keyboard or 🎤 dictation) and export as `.txt`.
  Dictation converts spoken symbol words: numbers, `dash - slash / dot . hash # star *
  plus + equals =`, the stamped shapes `triangle △ square □ circle ○ diamond ◇`, and
  "space", which types a space like the spacebar ("M R space triangle" → `MR △`).
  Each side also holds up to **4 optional photos** — pick a slot in the dropdown on the
  text screen, tap 📷, and the photos export as `… Matrix Runout A1.jpg`–`A4.jpg`
  (B/C/D for sides 2–4).

## Privacy

Everything (photos, album info, settings) is stored locally in the browser's IndexedDB on
the phone. Nothing leaves the phone except when you explicitly Share, download the ZIP, or
upload to your own Google Drive.

## Local testing on a PC

Run `powershell -ExecutionPolicy Bypass -File serve.ps1` in this folder and open
http://localhost:8321/ — on localhost the camera works without https (or use the 🖼 import
button to test with existing image files).

When testing an app change locally, unregister the service worker first (DevTools →
Application → Service Workers → Unregister, and Clear storage) — otherwise the previous
build is served from cache and your change looks like it did nothing.

## Shipping an update

Edit, commit, `git push` — Pages redeploys. Installed phones then show a bar
("A new version is ready") and reload when the user taps **Update**.

That relies on the service worker's cache name changing, so `bump-version.ps1` rewrites it
— along with `APP_VERSION` in app.js, which Settings displays — on every commit that
touches `index.html`, `app.js` or `detect.js`. The hook that runs it is in `hooks/`, and
hooks don't survive a clone, so install it once per working copy:

    cp hooks/pre-commit .git/hooks/pre-commit

`make-icons.ps1` regenerates the PNG icons from `icon.svg`'s artwork (Safari ignores SVG
manifest icons and Chrome's install prompt wants raster). Re-run it if you change the
artwork, and update the `$art` table in it to match.

## License

© 2026 pnicol66. Shared for personal use; please don't redistribute the app, the sheet
template, or the script without permission — contact pnicol66@gmail.com.
