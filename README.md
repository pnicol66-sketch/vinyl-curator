# Vinyl Curator

A camera app for archiving vinyl records on a phone (built for a Motorola Razr, works on
any modern phone). It walks you through a fixed checklist of shots per album, detects the
record or sleeve outline and crops the photo (with draggable corners and side handles to
fine-tune), names every file from the artist + album, and saves the set to your own
Google Drive.

This repository holds the phone app only. The companion Google Sheet, its research and
valuation tools, and the user documentation are private and supplied to licensed users
directly. Contact pnicol66@gmail.com.

## The shot checklist (per album)

01 Front Cover · 02 Front Cover Grade · 03 Back Cover · 04 Back Cover Grade · 05 Other ·
06–13 Side 1–4 Labels and Vinyl Grades ·
14/16/18/20 Side 1–4 Matrix/Runout (typed text + up to 4 optional photos each)

Grade entries (02, 04, 07, 09, 11, 13) are typed, not photographed, and export as `.txt`.
A 1-disc album shows only sides 1–2; choosing "2 discs" adds sides 3–4.
The "Other" shot is optional and can be skipped.

Files are named like:

    Fleetwood Mac - Rumours - 01 Front Cover.jpg
    Fleetwood Mac - Rumours - 14 Side 1 Matrix Runout.txt
    Fleetwood Mac - Rumours - 14 Side 1 Matrix Runout A1.jpg

## Getting it on your phone

Open https://pnicol66-sketch.github.io/vinyl-curator/ on the phone and install it —
Android: **Install app on this phone** on the home screen (or menu ⋮ → Install app);
iPhone: **Share** → **Add to Home Screen**, which the app prompts for. It then runs
full-screen and works offline after the first load.

## Saving to Google Drive

Tap **Upload to Google Drive**, sign in with your own Google account, allow. The app
uploads into `My Drive / Vinyl Curator / <Artist>_<Album>/`, updating files in place if
you re-shoot, and queues the album so the files go up in the background while the next
record is being shot. The queue survives an app close and resumes on the next open; an
expired sign-in pauses it behind a sign-in button.

The app requests only Google's `drive.file` scope: it can see and write the folders it
created itself and nothing else in your Drive. On the first upload it asks whether to
share that one folder, read-only, with the curator; you stay the owner, nothing else in
your Drive is shared, and you can stop sharing at any time from Drive itself. Declining is
remembered too.

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
the phone. Nothing leaves the phone except when you explicitly upload to your own Google
Drive. See [privacy.html](privacy.html).

## Developer notes

**Local testing on a PC.** Run `powershell -ExecutionPolicy Bypass -File serve.ps1` in
this folder and open http://localhost:8321/ — on localhost the camera works without https
(or use the 🖼 import button to test with existing image files). Unregister the service
worker first (DevTools → Application → Service Workers → Unregister, and Clear storage),
otherwise the previous build is served from cache and a change looks like it did nothing.

**Shipping an update.** Edit, commit, `git push` — Pages redeploys. Installed phones then
show a bar ("A new version is ready") and reload when the user taps **Update**. That relies
on the service worker's cache name changing, so `bump-version.ps1` rewrites it — along with
`APP_VERSION` in app.js, which Settings displays — on every commit that touches
`index.html`, `app.js` or `detect.js`. The hook that runs it is in `hooks/`, and hooks
don't survive a clone, so install it once per working copy:

    cp hooks/pre-commit .git/hooks/pre-commit

`make-icons.ps1` regenerates the PNG icons from `icon.svg`'s artwork. Re-run it if you
change the artwork, and update the `$art` table in it to match.

## License

© 2026 pnicol66. Shared for personal use; please don't redistribute the app, the sheet
template, or the script without permission — contact pnicol66@gmail.com.
