# Vinyl Curator — User Manual

**Version 1.8 · 14 August 2026**

Contact: pnicol66@gmail.com · Personal use by permission; please don't redistribute.

## Version history

| Version | Date | Changes |
|---|---|---|
| 1.8 | 2026-08-14 | New optional **Side 1–4 Vinyl** checklist entries (numbers 22–25): a full-disc surface shot per side, cropped as a circle, appearing right after each side's Label entry. The sheet gains matching **Side N Vinyl** photo columns directly right of each Side N Label column (**Update my sheet** adds them). Album-page galleries and eBay photo exports order them beside their side's label photo. |
| 1.7 | 2026-08-14 | Sales polish: **Discogs listing comments are now compact** — grades and matrix/runout only, and the Discogs Listing Supplement is no longer auto-appended (eBay descriptions keep theirs). **eBay titles** flag verified first pressings ("1st Press") and order the extras 1st Press → cat# → year → label → mono/stereo → grade. **Collection webpage**: Value Estimate and the sales columns join the default fields, prices show $ signs, and web addresses in cells are tappable links. |
| 1.6 | 2026-08-12 | **Matrix/Runout rework**, app and sheet: checklist entries renamed Side N Matrix/Runout with up to **4 optional photos per side**, "Dead Wax Other" merged in (numbers 15/17/19/21 retired); sheet columns renamed **Matrix/Runout A–D** with 16 photo columns that appear as photos arrive; one-time Drive merge for older albums. New **Label Variant Hierarchy** research column. Sales upgrades: **asking-price columns** (eBay Start / Buy Now, Discogs List Price) choose Fixed Price vs Auction drafts, and **Listing Supplement** columns append your boilerplate to every listing. Pickers now hide already-processed albums. Slimmer menus with a single **Update my sheet** item for migrations. App: camera **Focus** controls, the **📁 Uploaded albums** archive with re-import from Drive, multiple upload folders in Settings. |
| 1.5 | 2026-08-07 | Eight new **detail columns** (Format → Country Of Origin) filled by AI research, which now also writes **Label Notes** (label provenance). New **Vinyl Sales** menu — Discogs draft listings and eBay draft-file export. New **collection webpage** — a private card view of the catalogue for any device. Batch research now runs ahead in the background while you review, with a live progress line. New **Kimi K3** model option. |
| 1.4 | 2026-08-06 | New **Album Story** sheet column (right after Side 4): the album's background and history, filled in by AI pressing research. Existing sheets add it via **Vinyl Curator → Add Album Story column**. |
| 1.3 | 2026-08-06 | After a successful save (Share, Drive upload, or ZIP) the app returns to the home screen. |
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
| 22 | Side 1 Vinyl | 📷 | optional — the whole disc surface, cropped as a circle |
| 07 | Vinyl Grade Side 1 | ⌨ | |
| 08 | Side 2 Label | 📷 | |
| 23 | Side 2 Vinyl | 📷 | optional |
| 09 | Vinyl Grade Side 2 | ⌨ | |
| 10 | Side 3 Label | 📷 | 2-disc albums only |
| 24 | Side 3 Vinyl | 📷 | optional · 2-disc albums only |
| 11 | Vinyl Grade Side 3 | ⌨ | 2-disc albums only |
| 12 | Side 4 Label | 📷 | 2-disc albums only |
| 25 | Side 4 Vinyl | 📷 | optional · 2-disc albums only |
| 13 | Vinyl Grade Side 4 | ⌨ | 2-disc albums only |
| 14 | Side 1 Matrix/Runout | ⌨ + 📷×4 | typed text + up to 4 optional photos |
| 16 | Side 2 Matrix/Runout | ⌨ + 📷×4 | |
| 18 | Side 3 Matrix/Runout | ⌨ + 📷×4 | 2-disc albums only |
| 20 | Side 4 Matrix/Runout | ⌨ + 📷×4 | 2-disc albums only |

Numbers 15/17/19/21 are retired — they belonged to the old "Dead Wax Other" entries, whose text now lives in the Matrix/Runout entry for that side. And the **Side Vinyl** entries carry numbers 22–25 even though they sit beside their side's Label entry — new entries keep new numbers so older files in Drive never need renaming. The out-of-sequence numbering is deliberate in both cases.

**Side Vinyl shots** are a photo of the record surface itself — the honest condition evidence a buyer wants next to your typed grade. Angle the disc slightly under light so scuffs and marks show truthfully; the disc edge is detected and cropped as a circle like a label shot.

Files are named `Artist - Title - NN Entry Name.jpg` (photos) or `.txt` (typed entries). Matrix/Runout photos add a per-side letter and slot number (A1–A4 for side 1, B for side 2, C/D for sides 3/4), e.g.:

    Fleetwood Mac - Rumours - 01 Front Cover.jpg
    Fleetwood Mac - Rumours - 07 Vinyl Grade Side 1.txt
    Fleetwood Mac - Rumours - 14 Side 1 Matrix Runout.txt
    Fleetwood Mac - Rumours - 14 Side 1 Matrix Runout A1.jpg
    Fleetwood Mac - Rumours - 22 Side 1 Vinyl.jpg

### Taking photos

- Lay the cover or disc on a **plain, contrasting background** — that is what the outline detection keys on.
- After the shot, the app auto-detects the outline: a four-corner frame for covers/matrix, a **circle** for labels. To fine-tune the frame you can drag any amber **corner**, drag the amber **bar on a side** to move that whole edge (top, bottom, left or right) straight in or out, or drag **inside the frame** to slide the whole crop box. Circles drag from the middle to move and from the ring to resize. While you drag a corner, a side, or the circle's ring, a round **magnifier** appears in the top corner away from your finger, showing that spot at 3× with the crop line drawn through it — so you can see the sleeve edge your thumb is covering. **Auto** retries detection, **Full** keeps the whole frame, **⟳** rotates in 90° steps, then **Save**.
- For matrix/runout shots: get close, use the **🔦 torch**, and tilt the disc so the etching catches shadows. The **Zoom** and **Focus** sliders appear when the camera supports them.
- If the picture goes blurry up close, drag the **Focus** slider (left = nearest) to focus manually, or tap **AF** to trigger an autofocus pass. Releasing the Zoom slider also re-runs autofocus.
- If your phone doesn't offer focus control in the browser (common on iPhone), use **🖼 import** and take the close-up with the phone's own camera app instead — it will be pulled straight into the same crop/save flow.
- **🖼 Import** loads a photo taken with the phone's own camera app instead.
- Optional shots show a **Skip** button.

### Typed entries

- **Grades (02, 04, 07–13)**: tapping the row goes straight to a text screen — type the grade (e.g. `NM`, `VG+`) and **Save text**. No camera involved.
- **Matrix/Runout (14/16/18/20)**: tapping the row opens the text screen — type or **🎤 dictate** the runout inscription exactly as etched (include anything you'd previously have put in "Dead Wax Other", on its own line) and **Save text**. The checklist tick means the text is entered; photos are optional extras.
- Typed entries export as `.txt` files alongside the photos and show a ⌨ tag with the text in the checklist.

### Matrix/Runout photos (optional)

- On a Matrix/Runout text screen, the **Matrix/Runout photos** section holds up to **4 photos per side**: pick a slot in the dropdown (it auto-selects the next empty one), tap **📷 Take photo**, shoot and crop as usual — you're returned to the text screen with the slot filled, ready to take the next one.
- Tap a filled thumbnail to view, retake, or delete that photo. Any text you've typed but not yet saved survives the round-trip to the camera.
- Photos upload alongside everything else as `… 14 Side 1 Matrix Runout A1.jpg` … `A4.jpg` (B/C/D for the other sides).

Recognised grades (best → worst): **M, NM (M-), EX+, EX, VG+, VG, VG-, G+, G, G-, F, P**.

### Exporting an album

From the checklist tap **Save photos** — three options:

- **Share…** (zero setup): pick **Drive** in the share sheet and choose where to save. Be aware the app has no control here — Android decides, so the files arrive **loose, with no Artist_Album folder**, in whatever folder the Drive dialog is pointing at. Every filename already carries the artist and album, so nothing is lost, but if you are sharing a folder with someone else use direct upload instead; Share… is the usual reason files never appear on their side.
- **Upload to Google Drive** (recommended): uploads straight into the right folder, updating files in place on re-shoots. If your copy of the app came ready to go, there is nothing to set up — tap it, sign in with your own Google account, allow access. The first upload also asks whether to share that one folder, read-only, with the archive; say yes and your photos are collected automatically from then on. (If the button says "needs setup", see Settings ⚙.)
- **Download all as ZIP**.

After a successful save the app returns to the home screen, ready for the next album.

### Uploaded albums (the 📁 archive)

After a save, the album moves off the home screen into **📁 Uploaded albums**. From there you can browse each album's files in Drive (direct-upload setup required), and bring an album back to work on it:

- **↩ Move back to home screen** — shown when the album's photos are still on this phone; instant.
- **⬇ Bring back into this app** — shown when they aren't (new phone, app data wiped): downloads the album's files from Drive and rebuilds the checklist — covers, labels, grades, matrix/runout text, and deadwax photo slots all land back where they belong. Add to it, then re-upload; existing Drive files are updated in place, so the sheet import stays consistent.
- Only albums uploaded with the app's **direct Drive upload** can be browsed and re-downloaded — albums sent via the Share sheet aren't visible to the app in Drive (Google's privacy rules), though "Move back" still works while their photos remain on the phone.

### Settings ⚙

**Share uploads with** (the address your folders are shared with — see below), an **Advanced** section holding the Google OAuth Client ID, API key and Cloud project number for anyone running their own Google project (leave these empty to use whatever the app was built with), the **Drive folders for uploads** (default `Vinyl Curator` — leave it unless you have a reason to change it; the sheet imports from the folder of the same name), photo size (1600/2400/3200 px), JPEG quality, and **Delete ALL app data** (wipes the phone's local albums, photos, and settings — exported files in Drive are untouched).

You can keep **more than one upload folder** (say, one per collection): add folders to the list in Settings, tap one to make it the default, ✕ to remove it. With two or more folders set up, the save screen shows an "upload into" dropdown, and a re-upload preselects the folder the album went to last time. (On the sheet side, switching import folders is a separate setting per sheet.)

#### Share uploads with

Your photos are saved into a folder in **your own** Google Drive, which by default nobody else can see. Rather than leave you to arrange sharing by hand — the step most likely to go wrong, and the reason photos used to go missing — the app offers to do it. The first time you upload into a folder it asks:

> Share "Vinyl Curator" with *(address)*? Your album photos are saved into this folder in your own Google Drive. Sharing it read-only lets the archive collect them automatically — otherwise they stay where only you can see them.

Say yes and that **one folder** is shared, **read-only**. You stay the owner, nothing else in your Drive is touched, and you can stop sharing at any time from Drive itself. Each album folder the app creates inside it is shared automatically too, so you are never asked again.

Say no and nothing is shared — the app remembers and won't ask again for that folder. Clear the address to switch sharing off entirely; change it and you'll be asked once more for the new address.

#### Link… — uploading into a folder that already exists

You normally don't need this — let the app make its own folder and share it, as above. Link… is for the two cases where a folder already exists: one you created by hand in Drive, and one someone else owns and shared with you.

By default an upload folder is just a **name**, and the app finds or creates a folder of that name in your own My Drive. The app can only see folders it created, so in both cases it would quietly make a **second folder of the same name** and upload into that — the files are safe, but invisible to whoever you meant to share them with.

**Link…** next to a folder entry fixes it. It opens Google's own folder picker (your My Drive and your **Shared with me**), and the folder you choose is the one the app uploads into from then on — its Drive id is remembered, not just its name. The entry then reads **🔗 linked to this folder in Drive**; tap **Linked** to unlink.

Anything uploaded into a linked folder is automatically visible to everyone that folder is shared with — including the per-album `Artist_Album` folders the app creates inside it, which inherit the sharing.

Link… needs the **API key** and **Cloud project number** in Settings as well as the Client ID, and the **Google Picker API** enabled in the same Cloud project — see the setup steps in Settings ⚙. If a linked folder is later deleted, or the owner stops sharing it with you, the next upload stops and asks you to re-link rather than inventing a new folder.

## 3. The Google Sheet

### Getting your copy

1. Open the template link you were sent and click **Make a copy** — the menus and machinery travel with it.
2. First use of any menu item: authorize the script. The **"Google hasn't verified this app"** warning is normal — Advanced → Go to … → continue.
3. Reload the sheet; the **Vinyl Curator**, **Vinyl Research**, **Vinyl Values**, and **Vinyl Sales** menus are live.

Access is by permission — if you see a "not licensed" message, contact pnicol66@gmail.com.

### The Vinyl Curator menu

- **Add albums to sheet…** — pick album folders from Drive; photos appear as thumbnails in the matching columns, typed matrix text and grades fill their cells. The picker shows only albums **not yet in the sheet** — a "Show N previously added" link expands the rest if you need to re-import one. Existing cell values are **never overwritten**; re-importing only fills blanks. Each row is linked to its Drive folder, so sorting or renaming doesn't break the connection.
- **Rotate selected photo 90°…** — click a photo cell first; rewrites the actual Drive file so research and future imports see the corrected orientation.
- **Sort entries by artist, then title**.
- **Move albums to For Sale / Sold / back to Collection** — moves whole rows between the three tabs.
- **Refresh folder tags / check duplicates**.
- **Format sheets** — text wrap, column widths, row heights, frozen headers, on all tabs.
- **Recalculate cover + vinyl grades (all tabs)** — see aggregates below.
- **Open collection webpage… / Set collection webpage address…** — see the collection webpage below.
- **Update my sheet (after a script update)** — run this once after pasting a new script version: it adds any new columns and layout changes to all three tabs (it has replaced the old one-off "Add … column" items). Safe to run any time — it does nothing if your sheet is already current.
- **Merge Matrix/Runout files in Drive (one-time)** — for albums exported **before v1.6**: per side, folds the old "Dead Wax Other" text file into the Matrix/Runout text file and renames old-scheme files and photos to the new names (photo slots A1–D4), so future imports and re-imports find everything. Run it once; it works through your whole import folder.

### Grade aggregates

Typed grades import into **Front/Back Cover Grade** and **Vinyl Grade Side 1–4** columns, and the sheet fills the aggregate columns automatically on import:

- **Cover Grade** = average of Front + Back Cover Grade.
- **Vinyl Grade** = average of **only the sides that have grades** — a 1-disc album averages sides 1–2; an ungraded side is left out rather than counted against the album.
- Averages use the Goldmine-style scale (M=12 … P=1) and **round down** (conservative) to the nearest grade. Example: NM + VG+ + VG → VG+.
- A grade the sheet doesn't recognise is kept visibly (values joined with `/`) instead of being averaged away.
- Aggregates fill on import and refresh as more sides arrive; a value you typed yourself is never overwritten by a plain import. **Recalculate cover + vinyl grades** re-derives everything from the current side/cover grades.

### Matrix/Runout columns

The typed runout inscriptions live in **Matrix/Runout A–D** (one column per side; the old separate "Deadwax" columns were merged into them in v1.6). Each side also has four photo columns — **Matrix/Runout A Photo 1–4** and so on — where the optional close-ups from the app land. To keep the sheet tidy, a photo column stays **hidden while it's empty** and appears automatically the first time an import puts a photo in it.

### Side Vinyl photo columns

The optional full-disc surface shots (checklist 22–25) import into **Side 1–4 Vinyl** columns, each directly right of its **Side N Label** column. If your sheet predates v1.8, **Update my sheet** adds them; albums shot before v1.8 simply leave them blank until you re-shoot a side and re-import.

### The header row is locked

Row 1's column names drive the import — the script finds columns by header text. The header row therefore carries a protection: editing it pops **"are you sure?"** first. Click through only if you genuinely mean to change a header.

### AI pressing research (optional)

1. Create an API key at **console.anthropic.com** (add ~$5 credits), then **Vinyl Research → Set Anthropic API key…** and paste it. The key is stored privately in your Google account, never in the sheet. (Alternative: a **Kimi K3** key from platform.kimi.ai via **Set Kimi API key…** — its billing is separate from Anthropic.)
2. **Vinyl Research → Research albums with AI…** — tick albums, pick the model (Claude Opus 5 = deepest, ~$0.10–0.50/album; Claude Sonnet 5 = faster and about a third of the cost; Kimi K3 = the alternative if you set a Kimi key). Like the import picker, the list shows only albums **not yet researched** — "Show N already researched" expands the rest.
3. The AI sees the row's cover and label photos, your typed matrix/runout transcriptions (its dead-wax evidence — type them carefully), and current data, then researches with live web search (Discogs variant first, label-dating references, real sales history — always pricing your pressing, not the master release). Besides the pressing fields it fills the **detail columns** (Country Of Origin = the pressing country of *your copy*, not the artist's nationality; the classical-music fields stay blank for non-classical records), writes **Label Notes** (what your exact label variant proves about the pressing's place in the label's timeline), a **Label Variant Hierarchy** — the label's variant chronology, one variant per line with year, distinguishing feature and value band, and your copy marked in place — and an **Album Story** — how the album came to be, its place in the artist's career, its reception and legacy.
4. Results appear in an approval screen with current values alongside — edit anything, then **Approve + import**, **Research further…** (with your guidance), or **Skip**.

**Batches research themselves.** While you review one album, the rest of your selection quietly researches one album at a time in the background — a blue line under the status shows which album is running, its round, and how many results are already waiting. **Approve + import** or **Skip** opens the next result instantly once it's ready. Nothing is ever written to the sheet without your Approve, and closing the dialog stops the pipeline (only the step already running finishes).

**Vinyl Values → Calculate album values with AI…** works the same way for valuations, including the background batching and the "not yet valued" default view.

### The collection webpage

A private, live card view of your catalogue — one card per record with the fields you choose — usable from any phone or tablet browser (no desktop needed, unlike the menus). Artist and album dropdowns, free-text search, and Collection / For Sale / Sold tabs. The default fields include the key pressing columns plus **Value Estimate** and the sales columns; money amounts show **$** signs, and any web address in a cell is a tappable link.

One-time setup on your copy: **Vinyl Curator → Open collection webpage…** walks you through deploying it (Extensions → Apps Script → Deploy → New deployment → Web app, executing as you, access "Only me"), then paste the web-app address into **Set collection webpage address…**. After that, **Open collection webpage…** shows your link any time — bookmark it on your phone. Only you can open it; it reads the sheet live, so it's always current.

### The Vinyl Sales menu

Puts **For Sale** rows up for sale on the two big marketplaces — always as **drafts** you review and publish there:

- **List albums on Discogs…** — needs your own Discogs personal access token (discogs.com → Settings → Developers → **Set Discogs token…**) and a Discogs seller account. Per album it searches Discogs (catalogue number first), you pick the exact pressing from the candidates (or paste a release link), review the suggested condition/sleeve grades and price, and it creates the listing through the Discogs API as a **draft** — publish from Discogs after checking it. The prefilled comments are deliberately **compact** — your grades plus the typed matrix/runout, e.g. `Vinyl: VG+. Cover: VG. Matrix/runout - A: MG-36137A-1` — and stay fully editable before the listing is created.
- **Export albums to eBay draft file…** — no eBay developer account needed. Writes a Seller Hub bulk-upload CSV to the Drive folder **"Vinyl Curator eBay exports"**; upload it at eBay → Seller Hub → Reports → Uploads and it creates listing **drafts** with title, price, description, and the item specifics (artist, label, year, gradings, matrix numbers, format/genre and more) filled in — you add photos and shipping on eBay and publish from there. Titles lead with **"1st Press"** when the AI research verdict confirms one, followed by cat# → year → label → mono/stereo → grade as the 80 characters allow.

Both flows record what they did and when in the **Discogs Listing** and **eBay Status** columns.

**Setting your asking prices.** The For Sale tab has three price columns — **eBay Start Price**, **eBay Buy Now Price**, and **Discogs List Price** — and they decide what kind of eBay draft each row becomes:

- Buy Now price only → a **Fixed Price** listing at that price.
- Start price only → an **Auction** starting there.
- Both → an **Auction with Buy It Now**.
- Neither → Fixed Price at the **Value Estimate** (or the first number in the Price Guide/Range) — same fallback the Discogs lister uses when there's no typed Discogs List Price. Either way, every price is shown for your approval before anything is created.

The columns ride along when a row moves to Sold, so your sold records keep their listing prices.

**Listing supplements.** The For Sale tab also has **eBay Listing Supplement** and **Discogs Listing Supplement** columns: type your standard boilerplate (shipping terms, grading notes, returns) down the column's cells — a blank cell makes a paragraph break. The eBay supplement is appended automatically to **every** eBay draft description. Since v1.7 the Discogs supplement is **not** added automatically (Discogs caps comments at 1,000 characters, so the prefill stays compact) — paste it into the comments box on the listings where you want it.

## 4. Day-to-day workflow

1. Shoot the album on the phone (photos + grades + matrix).
2. Export → **Share…** → Drive.
3. In the sheet: **Vinyl Curator → Add albums to sheet…** → tick the new albums → Go.
4. Optionally: **Vinyl Research** on the new rows, approve, done.

## 5. Good to know

- **Custom menus need a desktop browser.** The Sheets app on iPad/iPhone/Android can't show script menus — on a tablet, open the sheet in the browser with "Request Desktop Website". (The **collection webpage** works everywhere, though.)
- **The app updates itself** (it may take one extra app-launch to pick up a new version). **Sheet script updates take two steps**: (1) Extensions → Apps Script → select all → paste the new version → save → reload the sheet; (2) run **Vinyl Curator → Update my sheet (after a script update)** so any new columns are added to your tabs. Your data, keys, and folder links all survive. New versions are announced by pnicol66.
- **Camera needs https** — the app runs from its https address; if the camera is unavailable it offers gallery import instead.
- **Import skipped a cell?** It never overwrites — clear the cell and re-run, or check the file is named `… - NN Entry Name` in the album's folder.

*Vinyl Curator — User Manual v1.8 · © 2026 pnicol66*
