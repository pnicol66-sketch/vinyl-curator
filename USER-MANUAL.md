# Vinyl Curator — User Manual

**Version 1.2 · 6 August 2026**

Contact: pnicol66@gmail.com · Personal use by permission; please don't redistribute.

## Version history

| Version | Date | Changes |
|---|---|---|
| 1.2 | 2026-08-06 | The Drive folder for direct uploads is now configurable in the app's Settings (default "Vinyl Curator"). |
| 1.1 | 2026-08-05 | First edition. Checklist in display order (01–21), typed cover & vinyl grade entries, automatic grade aggregates in the sheet, header-row locks, streamlined user menu. |

---

## 1. What Vinyl Curator is

Two parts that work together:

- **The phone app** — walks you through a fixed checklist per album: cover photos, label photos, matrix/dead-wax close-ups, and typed condition grades. It auto-crops each shot, names every file consistently, and saves the set to your Google Drive.
- **The Google Sheet** — imports those files into a collection catalogue (photo thumbnails inside the matching cells, typed text in the right columns), calculates aggregate grades, and can run AI pressing research on each album with your approval before anything is written.

Everything is private: photos stay on the phone until you export them to your own Drive, the sheet is your own copy, and the AI runs on your own API key.

## 2. The phone app

### Installing

Open **https://pnicol66-sketch.github.io/vinyl-curator/** in Chrome on the phone → menu (⋮) → **Add to Home screen**. It works offline afterwards and updates itself automatically.

### Creating an album

Tap **＋ New Album**, enter the **label artist name** and **album title** (these become the file names), and pick **1 disc** (sides 1–2) or **2 discs** (sides 1–4).

### The checklist

Entries are numbered in the order you work through them. 📷 = photo, ⌨ = typed text.

| # | Entry | Type | Notes |
|---|---|---|---|
| 01 | Front Cover | 📷 | |
| 02 | Front Cover Grade | ⌨ | e.g. VG+ |
| 03 | Back Cover | 📷 | |
| 04 | Back Cover Grade | ⌨ | |
| 05 | Other | 📷 | optional — inserts, inner sleeve, hype sticker |
| 06 | Side 1 Label | 📷 | cropped as a circle |
| 07 | Vinyl Grade Side 1 | ⌨ | |
| 08 | Side 2 Label | 📷 | |
| 09 | Vinyl Grade Side 2 | ⌨ | |
| 10 | Side 3 Label | 📷 | 2-disc albums only |
| 11 | Vinyl Grade Side 3 | ⌨ | 2-disc albums only |
| 12 | Side 4 Label | 📷 | 2-disc albums only |
| 13 | Vinyl Grade Side 4 | ⌨ | 2-disc albums only |
| 14 | Side 1 Matrix | 📷/⌨ | can be typed instead of photographed |
| 15 | Side 1 Dead Wax Other | 📷/⌨ | optional |
| 16 | Side 2 Matrix | 📷/⌨ | |
| 17 | Side 2 Dead Wax Other | 📷/⌨ | optional |
| 18 | Side 3 Matrix | 📷/⌨ | 2-disc albums only |
| 19 | Side 3 Dead Wax Other | 📷/⌨ | optional, 2-disc albums only |
| 20 | Side 4 Matrix | 📷/⌨ | 2-disc albums only |
| 21 | Side 4 Dead Wax Other | 📷/⌨ | optional, 2-disc albums only |

Files are named `Artist - Title - NN Entry Name.jpg` (photos) or `.txt` (typed entries), e.g.:

    Fleetwood Mac - Rumours - 01 Front Cover.jpg
    Fleetwood Mac - Rumours - 07 Vinyl Grade Side 1.txt
    Fleetwood Mac - Rumours - 14 Side 1 Matrix.jpg

### Taking photos

- Lay the cover or disc on a **plain, contrasting background** — that is what the outline detection keys on.
- After the shot, the app auto-detects the outline: a four-corner frame for covers/matrix, a **circle** for labels. Drag the amber corners (or the circle edge) to fine-tune; **Auto** retries detection, **Full** keeps the whole frame, **⟳** rotates in 90° steps, then **Save**.
- For matrix / dead-wax shots: get close, use the **🔦 torch**, and tilt the disc so the etching catches shadows. The **zoom slider** appears when the camera supports it.
- **🖼 Import** loads a photo taken with the phone's own camera app instead.
- Optional shots show a **Skip** button.

### Typed entries

- **Grades (02, 04, 07–13)**: tapping the row goes straight to a text screen — type the grade (e.g. `NM`, `VG+`) and **Save text**. No camera involved.
- **Matrix / dead-wax (14–21)**: tap **⌨** on the camera screen to type the runout inscription exactly as etched instead of photographing it.
- Typed entries export as `.txt` files alongside the photos and show a ⌨ tag with the text in the checklist.

Recognised grades (best → worst): **M, NM (M-), EX+, EX, VG+, VG, VG-, G+, G, G-, F, P**.

### Exporting an album

From the checklist tap **Save photos** — three options:

- **Share…** (recommended, zero setup): pick **Drive** in the share sheet and save into **My Drive / Vinyl Curator / Artist_Album**. The sheet imports from that folder.
- **Upload to Google Drive** (direct, one-time setup): uploads straight into the right folder, updating files in place on re-shoots. Needs a free Google OAuth Client ID — see Settings ⚙ for the steps.
- **Download all as ZIP**.

### Settings ⚙

Google OAuth Client ID (for direct upload), the **Drive folder for uploads** (default `Vinyl Curator` — leave it unless you have a reason to change it; the sheet imports from the folder of the same name), photo size (1600/2400/3200 px), JPEG quality, and **Delete ALL app data** (wipes the phone's local albums, photos, and settings — exported files in Drive are untouched).

## 3. The Google Sheet

### Getting your copy

1. Open the template link you were sent and click **Make a copy** — the menus and machinery travel with it.
2. First use of any menu item: authorize the script. The **"Google hasn't verified this app"** warning is normal — Advanced → Go to … → continue.
3. Reload the sheet; the **Vinyl Curator**, **Vinyl Research**, and **Vinyl Values** menus are live.

Access is by permission — if you see a "not licensed" message, contact pnicol66@gmail.com.

### The Vinyl Curator menu

- **Add albums to sheet…** — pick album folders from Drive; photos appear as thumbnails in the matching columns, typed matrix text and grades fill their cells. Existing cell values are **never overwritten**; re-importing only fills blanks. Each row is linked to its Drive folder, so sorting or renaming doesn't break the connection.
- **Rotate selected photo 90°…** — click a photo cell first; rewrites the actual Drive file so research and future imports see the corrected orientation.
- **Sort entries by artist, then title**.
- **Move albums to For Sale / Sold / back to Collection** — moves whole rows between the three tabs.
- **Refresh folder tags / check duplicates**.
- **Format sheets** — text wrap, column widths, row heights, frozen headers, on all tabs.
- **Recalculate cover + vinyl grades (all tabs)** — see aggregates below.
- **Protect header rows (all tabs)** — see header lock below.

### Grade aggregates

Typed grades import into **Front/Back Cover Grade** and **Vinyl Grade Side 1–4** columns, and the sheet fills the aggregate columns automatically on import:

- **Cover Grade** = average of Front + Back Cover Grade.
- **Vinyl Grade** = average of **only the sides that have grades** — a 1-disc album averages sides 1–2; an ungraded side is left out rather than counted against the album.
- Averages use the Goldmine-style scale (M=12 … P=1) and **round down** (conservative) to the nearest grade. Example: NM + VG+ + VG → VG+.
- A grade the sheet doesn't recognise is kept visibly (values joined with `/`) instead of being averaged away.
- Aggregates fill on import and refresh as more sides arrive; a value you typed yourself is never overwritten by a plain import. **Recalculate cover + vinyl grades** re-derives everything from the current side/cover grades.

### The header row is locked

Row 1's column names drive the import — the script finds columns by header text. The header row therefore carries a protection: editing it pops **"are you sure?"** first. Click through only if you genuinely mean to change a header.

### AI pressing research (optional)

1. Create an API key at **console.anthropic.com** (add ~$5 credits), then **Vinyl Research → Set Anthropic API key…** and paste it. The key is stored privately in your Google account, never in the sheet.
2. **Vinyl Research → Research albums with AI…** — tick albums, pick the model (Claude Opus 5 = deepest, ~$0.10–0.50/album; Claude Sonnet 5 = faster and about a third of the cost).
3. The AI sees the row's photos, typed matrix numbers, and current data, then researches with live web search (Discogs variant first, label-dating references, real sales history — always pricing your pressing, not the master release).
4. Results appear in an approval screen with current values alongside — edit anything, then **Approve + import**, **Research further…** (with your guidance), or **Skip**.

**Vinyl Values → Calculate album values with AI…** works the same way for valuations.

## 4. Day-to-day workflow

1. Shoot the album on the phone (photos + grades + matrix).
2. Export → **Share…** → Drive.
3. In the sheet: **Vinyl Curator → Add albums to sheet…** → tick the new albums → Go.
4. Optionally: **Vinyl Research** on the new rows, approve, done.

## 5. Good to know

- **Custom menus need a desktop browser.** The Sheets app on iPad/iPhone/Android can't show script menus — on a tablet, open the sheet in the browser with "Request Desktop Website".
- **The app updates itself** (it may take one extra app-launch to pick up a new version). **Sheet script updates are pasted**: Extensions → Apps Script → select all → paste the new version → save → reload the sheet. New versions are announced by pnicol66.
- **Camera needs https** — the app runs from its https address; if the camera is unavailable it offers gallery import instead.
- **Import skipped a cell?** It never overwrites — clear the cell and re-run, or check the file is named `… - NN Entry Name` in the album's folder.

*Vinyl Curator — User Manual v1.2 · © 2026 pnicol66*
