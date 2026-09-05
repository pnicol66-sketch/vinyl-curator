# Vinyl Curator — User Manual

**Version 2.11 · 5 September 2026**

Contact: pnicol66@gmail.com · Personal use by permission; please don't redistribute.

## Version history

| Version | Date | Changes |
|---|---|---|
| 2.11 | 2026-09-05 | **Dealer retail for reissues, and out of print.** For every record the sheet now also reads the specialist dealers (Acoustic Sounds, Elusive Disc) and lists new copies of the same edition, used copies they offer, and whether the edition is discontinued. A dealer's new price of your copy's edition is a comparable for a reissue or audiophile pressing: the ceiling for a used copy while the edition is in print, and the guide to a near-mint one (roughly 60-85% of new). When the dealers list the edition as out of print, the Price Guide and Valuation Basis say so, because used prices tend to rise once new copies are gone. The Value audit's coverage line counts the rows with a dealer price and the out-of-print ones. |
| 2.10 | 2026-09-05 | **Auction and fixed price are told apart.** Popsike results are what copies fetched on eBay (auction closes and Buy It Now); Discogs price suggestions are computed from Discogs's own fixed-price sales by grade. The evidence, the Price Guide and the Valuation Basis now say which kind each figure is, the comparable is tagged [auction] or [fixed-price], and where documented auction results for your copy's edition run 10% or more above the fixed-price figure for its grade, an "Auction potential" line states it with both figures. Every source now runs for every record: Discogs is looked up by catalogue number when the research cited no release. The Value audit prints a coverage line (Popsike, Discogs, both, neither, this-edition, unvalued). |
| 2.9 | 2026-09-05 | **The comparable rule, and your own valuation.** A valuation must now open with the one documented sale it priced against ("Comparable: $X …"), that sale must be on the evidence list, and the figure must stay within ten percent of it; a valuation that breaks the rule is not written and the basis says why, so you can re-run it. The values review screen also has an "Or enter your own valuation" box: type a figure and a note, approve, and it is recorded as the collector's figure, never as the AI's. |
| 2.8 | 2026-09-05 | **Popsike login.** Popsike's free searches stop after about a dozen a day, and the sheet answers that wall honestly ("Price evidence unavailable", never "no sale found"). With **Vinyl Values > Set Popsike login…** the sheet fetches price evidence logged in to your own Popsike account, so batches never hit the wall. The login is stored privately in your Google account, like the API keys. |
| 2.7 | 2026-09-04 | **Prices now rest on documented sales.** Before the AI writes a Price Guide or a Value Estimate, the sheet itself fetches the documented sales for that record (the Popsike auction archive, plus Discogs stats and, with your Discogs token, Discogs's own price suggestions by grade) and stores them in a new **Price Evidence** column. Those sales are the only numbers the AI may use; its own earlier price cells are kept out of the prompt. If no documented sale exists, the Price Guide says so and the Value Estimate is left blank rather than guessed. The review screen shows the sales and a price check light (red when a figure is above the highest documented sale, or when VG-or-below vinyl is valued above the near-mint median). Two new items under Vinyl Values: **Fetch price evidence for all albums…** and **Value audit (read only)**, which lists every valued row against its evidence and saves a dated copy in Drive. Run "Update my sheet" once to add the column. |
| 2.6 | 2026-09-04 | **Price Guide and Valuation Basis are catalogue copy.** The Price Guide is now two to four sentences you could show a buyer: the band for this pressing from documented sales, what drives it, and where your copy's grades place it. It may no longer discuss how thin the data was, what the guide or your other copy "claims", or what should be corrected elsewhere. The Valuation Basis names the variant, the comparables and the condition math for this copy only, and may say at most that it is the earlier or later of your copies. Two copies of one catalogue number share one set of variant bands. |
| 2.5 | 2026-09-04 | **Two copies of one record are now researched together.** When you own more than one copy of the same catalogue number, the AI is shown the other copy too — its runouts, grades, notes and value, plus its front cover and side-1 label photos — and must say which copy is the earlier issue and why, from what is visible: cover design, the type setting of the label credits, lacquer and stamper marks, pressing-plant stamps. The label address alone no longer counts as proof of a first pressing, and the AI may not claim a difference between two copies that it cannot see in the photos. The review screen lists the other copies in blue and warns in red if the findings still call both copies the first issue. Valuations get the same comparison. |
| 2.4 | 2026-09-04 | **Retry this round** on every research, valuation and saved-research review screen: when a research round fails (typically *"Exceeded maximum execution time"* — one slow AI call ran past Google's six-minute limit), the album is no longer lost. The button re-runs just the failed round from where it stood, reusing the photos and every round already completed. Background albums that fail are resumed when their turn comes; review-later batches resume a failed album once by themselves. |
| 2.3 | 2026-09-04 | **Album folders shared with you view-only** (someone else's collection — a client's, say) now import cleanly. The importer used to stop with "Access denied" *after* it had written the row, because it could not stamp its bookkeeping tag on a folder you don't own; the result line now simply notes "folder tag not written (folder is shared view-only)". The sheet also keeps its own record of every folder it has ever imported, so the picker's **"imported before but no longer has a row"** list works for those folders too (it used to depend on the folder tag) — **Update my sheet** and every picker open bring that record up to date. **eBay draft exports** copy the photos of such albums into your own Drive ("Vinyl Curator eBay exports", one subfolder per album) and link the copies, because eBay can only fetch photos you are allowed to share; the export dialog says how many were copied or reused. |
| 2.2 | 2026-09-04 | New **Condition check** on every research review: the AI now reports what it can *see* about condition in the front cover, back cover and side-label photos — a name in pen, a seam split, a sticker, ring wear, writing on a label — each with its location, plus the grade each cover photo alone would support. The findings appear in a panel above the Runout check with a tick-box per surface; **Approve + import** appends the ticked lines to **Cover Comments** ("Front: …" / "Back: …") and to a new **Label Comments** column ("Side 1: …") — never replacing what you wrote and never touching a grade. Where a cover photo suggests a *lower* grade than you typed, a "Photo suggests VG — you typed VG+" line offers **Use VG** / **Keep mine**. Label Comments prints in eBay descriptions ("Labels:"), on the price estimate and catalogue condition line, and travels into the shareable sheet; **Update my sheet** adds the column. |
| 2.1 | 2026-09-03 | New **Vinyl Curator → Remove an album row (duplicate)…**: remove one chosen row — a duplicate import or a copy you no longer keep — after seeing its evidence (Album ID, Drive folder, and the row's typed runout beside the folder's), with the option to move its Drive folder to the Trash. Rows with a live Discogs listing, an eBay item number or a Website entry are refused until those are cleared; a folder another row still claims is never trashed. Moving albums between tabs now keeps the Drive folder tags of the rows beneath up to date. |
| 2.0 | 2026-08-31 | Research at scale: batches now research **up to 10 albums in parallel** while you review, and a new **"Research everything now, review later"** mode runs a whole selection unattended — each finished result is saved the moment it completes, and a new **Vinyl Research → Review saved research…** item opens the queue any time (approve + import, research further, keep for later, or discard). New **completeness lights** on every research review: a green / orange / red dot beside each field, measured against what the research brief asked that field to contain, with the reason written next to it ("2 sentences — the spec asks for 3–6"), a **"⚠ N fields look thin"** summary beside the Approve button, and live re-scoring as you edit — an orange dot turns green as you flesh a field out. The saved-research queue opens with a **worst-first triage list** (click any album to jump to it). Research and review dialogs open larger and stay drag-resizable. |
| 1.9 | 2026-08-30 | New **Vinyl Reports** menu: **Collection schedule** (one line per record, values and a total), **Researched price estimate** (a full record-by-record document), printed **Catalogue / brochure** (photo-forward 1-up/2-up/4-up pages, auto-split for big collections), and the **Shareable sheet** — a copy you can send that carries its own Reports menu, so the recipient can build the schedule, the estimate and now the **catalogue/book themselves** (record picker, style presets, their own photo access). New **Insured Value** / **Suggested Insured Value** columns with one-click seeding from researched values. Listing boilerplate moved from the supplement columns to named **listing policies** (Vinyl Sales → Manage listing policies…), and eBay descriptions gained a per-block **content picker** (Full / Brief / Off). |
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

Open **https://pnicol66-sketch.github.io/vinyl-curator/** on the phone and install it — Android: tap **Install app on this phone** (or menu ⋮ → **Install app**); iPhone: **Share** → **Add to Home Screen**, which the app reminds you to do, because Safari allows no install button. It works offline afterwards, and tells you when a new version is ready. Installing also stops iPhone clearing your saved albums after a week of not opening it.

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
- **Matrix/Runout shots crop as a strict rectangle.** The frame stays square-on however you drag it — a corner carries its two neighbours — so a run-out photo can't be knocked out of square and is never stretched to straighten it. Those screens swap the **Auto** button (which only ever meant "whole frame" for run-outs) for **◇ Skew**, which releases the corners if you do need to straighten a photo taken at an angle; **▭ Rect** snaps it back to a rectangle. Cover and Other shots keep the free four-corner frame as before.
- For matrix/runout shots: get close, use the **🔦 torch**, and tilt the disc so the etching catches shadows. The **Zoom** and **Focus** sliders appear when the camera supports them.
- If the picture goes blurry up close, drag the **Focus** slider (left = nearest) to focus manually, or tap **AF** to trigger an autofocus pass. Releasing the Zoom slider also re-runs autofocus.
- If your phone doesn't offer focus control in the browser (common on iPhone), use **🖼 import** and take the close-up with the phone's own camera app instead — it will be pulled straight into the same crop/save flow.
- **🖼 Import** loads a photo taken with the phone's own camera app instead.
- Optional shots show a **Skip** button.

### Typed entries

- **Grades (02, 04, 07–13)**: tapping the row goes straight to a text screen — type the grade (e.g. `NM`, `VG+`) and **Save text**. No camera involved.
- **Matrix/Runout (14/16/18/20)**: tapping the row opens the text screen — type or **🎤 dictate** the runout inscription exactly as etched (include anything you'd previously have put in "Dead Wax Other", on its own line) and **Save text**. The checklist tick means the text is entered; photos are optional extras.
    - **Dictation converts symbol words as you speak them**, so you never have to hunt for a character your keyboard doesn't have. Numbers spell out (“six eight” → `68`), and: “dash” `-`, “slash” `/`, “dot” `.`, “hash” `#`, “star” `*`, “plus” `+`, “equals” `=`, “triangle” `△`, “square” `□`, “circle” `○`, “diamond” `◇`. Saying **“space”** types a space, exactly like the spacebar — useful for setting a stamped shape apart from the code, e.g. “M R space triangle space nine eight seven” → `MR △ 987`. Punctuation symbols close up against what's either side of them (“S T dash A six eight” → `ST-A68`); shapes stay as their own mark.
- Typed entries export as `.txt` files alongside the photos and show a ⌨ tag with the text in the checklist.

### Matrix/Runout photos (optional)

- On a Matrix/Runout text screen, the **Matrix/Runout photos** section holds up to **4 photos per side**: pick a slot in the dropdown (it auto-selects the next empty one), tap **📷 Take photo**, shoot and crop as usual — you're returned to the text screen with the slot filled, ready to take the next one.
- Tap a filled thumbnail to view, retake, or delete that photo. Any text you've typed but not yet saved survives the round-trip to the camera.
- Photos upload alongside everything else as `… 14 Side 1 Matrix Runout A1.jpg` … `A4.jpg` (B/C/D for the other sides).

Recognised grades (best → worst): **M, NM (M-), EX+, EX, VG+, VG, VG-, G+, G, G-, F, P**.

### Exporting an album

From the checklist tap **Save photos**, then **Upload to Google Drive**: it uploads straight into the right `Artist – Album` folder, updating files in place on re-shoots. If your copy of the app came ready to go, there is nothing to set up — tap it, sign in with your own Google account, allow access. The first upload also asks whether to share that one folder, read-only, with the archive; say yes and your photos are collected automatically from then on. (If the button says "needs setup", see Settings ⚙.)

After a successful upload the app returns to the home screen, ready for the next album.

### Uploaded albums (the 📁 archive)

After a save, the album moves off the home screen into **📁 Uploaded albums**. From there you can browse each album's files in Drive (direct-upload setup required), and bring an album back to work on it:

- **↩ Move back to home screen** — shown when the album's photos are still on this phone; instant.
- **⬇ Bring back into this app** — shown when they aren't (new phone, app data wiped): downloads the album's files from Drive and rebuilds the checklist — covers, labels, grades, matrix/runout text, and deadwax photo slots all land back where they belong. Add to it, then re-upload; existing Drive files are updated in place, so the sheet import stays consistent.
- Albums are uploaded with the app's **direct Drive upload**, so they can be browsed in Drive and re-downloaded here later, even on a new phone.

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
3. Reload the sheet; the **Vinyl Curator**, **Vinyl Research**, **Vinyl Values**, **Vinyl Sales**, and **Vinyl Reports** menus are live.

Access is by permission — if you see a "not licensed" message, contact pnicol66@gmail.com.

### The Vinyl Curator menu

- **Add albums to sheet…** — pick album folders from Drive; photos appear as thumbnails in the matching columns, typed matrix text and grades fill their cells. The picker shows only albums **not yet in the sheet** — a "Show N previously added" link expands the rest if you need to re-import one. Existing cell values are **never overwritten**; re-importing only fills blanks. Each row is linked to its Drive folder, so sorting or renaming doesn't break the connection. Folders you have never imported are ticked by default; a folder with the same artist and title as a row but a *different* Drive folder (a second copy of the record) and a folder that was **imported before but no longer has a row** (a duplicate upload whose row you deleted, say) are each listed separately, unticked, so nothing comes back in by accident. A folder that someone else owns and **shared with you view-only** imports the same way — the only difference is that the importer cannot stamp its bookkeeping tag on a folder you don't own, and the result line says so ("folder tag not written"). That tag is not what links a row to its folder: the row's Album ID does, and the sheet keeps its own record of every folder it has imported, so the "imported before" list works for shared folders too.
- **Rotate selected photo 90°…** — click a photo cell first; rewrites the actual Drive file so research and future imports see the corrected orientation.
- **Sort entries by artist, then title**.
- **Move albums to For Sale / Sold / back to Collection** — moves whole rows between the three tabs.
- **Remove an album row (duplicate)…** — removes ONE row you choose (a duplicate import, or a copy you no longer keep). It first shows the evidence for that row — Album ID, Drive folder, and the runout typed in the row beside the runout in the folder — and refuses while the row still has a live Discogs listing, an eBay item number or a Website entry. Tick "Also move its Drive folder to the Trash" to trash the folder too; that box is locked whenever another row still claims the same folder. Type REMOVE to confirm. A removed row comes back from File › Version history; a trashed folder comes back from Drive Trash for 30 days.
- **Refresh folder tags / check duplicates**.
- **Format sheets** — text wrap, column widths, row heights, frozen headers, on all tabs.
- **Recalculate cover + vinyl grades (all tabs)** — see aggregates below.
- **Open collection webpage… / Set collection webpage address…** — see the collection webpage below.
- **Update my sheet (after a script update)** — run this once after pasting a new script version: it adds any new columns and layout changes to all three tabs (it has replaced the old one-off "Add … column" items), and brings the sheet's record of imported folders up to date from the Album IDs already in it. Safe to run any time — it does nothing if your sheet is already current.
- **Merge Matrix/Runout files in Drive (one-time)** — for albums exported **before v1.6**: per side, folds the old "Dead Wax Other" text file into the Matrix/Runout text file and renames old-scheme files and photos to the new names (photo slots A1–D4), so future imports and re-imports find everything. Run it once; it works through your whole import folder.

### Grade aggregates

Typed grades import into **Front/Back Cover Grade** and **Vinyl Grade Side 1–4** columns, and the sheet fills the aggregate columns automatically on import:

- **Cover Grade** = average of Front + Back Cover Grade.
- **Vinyl Grade** = average of **only the sides that have grades** — a 1-disc album averages sides 1–2; an ungraded side is left out rather than counted against the album.
- Averages use the Goldmine-style scale (M=12 … P=1) and **round down** (conservative) to the nearest grade. Example: NM + VG+ + VG → VG+.
- A grade the sheet doesn't recognise is kept visibly (values joined with `/`) instead of being averaged away.
- Aggregates fill on import and refresh as more sides arrive; a value you typed yourself is never overwritten by a plain import. **Recalculate cover + vinyl grades** re-derives everything from the current side/cover grades.
- **Cover Comments** and **Label Comments** (the latter added by **Update my sheet**, right after Vinyl Grade Side 4) hold the specific defects behind the grades — a seam split, a name in pen, a sticker over the catalogue number. Type them yourself or accept them from the research review's **Condition check** (below); they print with the grades on eBay descriptions, the price estimate and the catalogue, and the AI valuation reads them when it prices your copy.

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

**Completeness lights.** Every field in the review screen carries a coloured dot measured against what the research brief asked that field to contain: **green** = meets its spec, **orange** = present but thin, hedged, or off-format (the reason is written right beside it — e.g. *"2 sentences — the spec asks for 3–6"* or *"uncertain ('likely')"*), **red** = required but missing, **grey** = legitimately blank (composer on a jazz record, sides 3–4 on a single LP). A bold **"⚠ N field(s) look thin: …"** line sits directly above the Approve button so a weak result can't scroll past unseen, and the dots re-score live as you type — fixing a thin Album Story flips its dot green on the spot. The lights only ever advise: nothing blocks your Approve.

**Condition check.** The same photos the AI reads for the pressing — front cover, back cover and the side labels — also show condition, so every review now carries a **Condition check** panel just above the Runout check. Per surface it lists the defects the AI could actually *see*, each with a location ("name in pen, top-right; 1-inch seam split, bottom edge" — "small sticker over the catalogue number"), in an editable box with a tick. A finding is ticked by default only when it names a place (a vague "some wear" is greyed until you say where), and unticked when the words are already in your comments. **Approve + import** appends the ticked lines: front and back go to **Cover Comments** as "Front: …" / "Back: …", label findings to **Label Comments** as "Side 1: …" — always added beneath what you already wrote, never replacing it, never written into a grade cell. If a cover photo supports a *lower* grade than the one you typed (or the grade is blank), the panel says so — "Photo suggests VG — you typed VG+" — with **Use VG** and **Keep mine** buttons; your typed grade wins unless you press Use. A clean copy simply shows "✓ Nothing visible in the photos worth noting". Two limits worth knowing: the AI never describes an undamaged surface (so an empty panel means nothing seen, not nothing checked), and it cannot see the playing surface — label shots are cropped to the label — so vinyl condition stays yours to grade. Defects it reports are reflected in its price guide, and once approved they feed the eBay listing, the reports and the AI valuation.

**Prices rest on documented sales.** Before the AI prices a record, the sheet fetches that record's documented sales itself: the Popsike auction archive (the top sales, with signed copies, reissues and Japanese pressings set aside), Discogs marketplace stats, and, if you have set a Discogs token, Discogs's own price suggestions by grade. The result is written to the **Price Evidence** column and handed to the AI as the only permitted source of dollar figures; the AI's own earlier Price Guide, hierarchy bands, Value Estimate and Valuation Basis are kept out of its prompt, so a guess can never be laundered into a valuation. If no documented sale exists, the Price Guide reads "No documented sale found for this variant.", the hierarchy carries no bands, and the Value Estimate is left blank (an old figure is cleared, and so is the suggested insured value). The review screen shows the sales under "Documented sales the price rests on" and a price check: red when a figure is above the highest documented sale or when VG-or-below vinyl is valued above the near-mint median, orange when it is more than one and a half times the top-five median. Evidence is kept for seven days, so a batch never fetches one record twice. Two items under **Vinyl Values** help you catch up: **Fetch price evidence for all albums…** fills the column for every row (it stops before the six-minute limit and can be run again), and **Value audit (read only)** lists every valued row against its evidence, red first, and saves a dated copy of the report in Drive. Run "Update my sheet" once to add the column.

**The comparable rule.** Even with the band anchored to real sales, two valuations of the same copy on the same evidence can differ by a quarter through the condition arithmetic alone. So a valuation must now name the one documented sale it priced against, at the very start of the Valuation Basis ("Comparable: $95 - Sep 12, 2022 - 1956 original Ex+/NM"), that sale must be one of the documented sales on file, and the Value Estimate must lie within ten percent of it. If your copy is in materially different condition, the AI must choose a different comparable rather than stretch the adjustment. A valuation that breaks any of the three is not written: the Value Estimate stays blank and the basis reads "Not valued: …" with the reason and the rejected text, so you can run it again.

**Your own valuation.** The values review screen always offers "Or enter your own valuation": a figure and a short note (a dealer quote, what you paid, your own judgement). Approve, and that figure is written with the basis "Collector's valuation: …", so the sheet records that it is yours, not the AI's. It is not subject to the comparable rule, but the Value audit still lists it against the documented sales like any other figure. Every AI figure the rule refused for that record, across re-runs, is listed under the box with its comparable and how far off it was, so you can price with them in view.

**Popsike login.** Popsike allows only a handful of free searches a day and then answers every search with its login page. The sheet recognises that page and marks the run "Price evidence unavailable (Popsike search quota)" rather than pretending the market is empty; nothing is cached from it, and "Fetch price evidence for all albums" stops and tells you. To remove the limit, open **Vinyl Values > Set Popsike login…**, enter your Popsike username and password and press "Save and test". The sheet logs in, keeps the session, sends it with every search, and logs in again by itself if the session lapses. The login is stored privately in your Google account, never in the sheet, and can be removed from the same dialog. A free Popsike registration still has a daily query limit ("depends on server load", in Popsike's words; about twenty searches was the observed figure); when it is reached the sheet says so ("the saved account's daily query limit is reached"), stops the batch, and never records that page as "no sale found". **Editions are separate markets.** The evidence lists the originals' sales, the lowest of them (played copies, later stampers), the other editions (reissues, Japanese and audiophile pressings, each tagged with what marked it), and a short list of signed, sealed and test-pressing sales that are no comparable for an ordinary copy. A copy that is itself a reissue or audiophile edition must take its comparable from the other editions or from its own Discogs price suggestion, never from an original's sale; the sheet enforces that and shows "Not valued" with the reason when the AI gets it wrong, so you can re-run or enter your own figure. Each sale is classified for your copy, not by keywords alone: a listing that carries your copy's catalogue number, its edition family (Analogue Productions, Classic Records, MoFi, OJC, a Japanese pressing…) or, for a later edition, its year is tagged a sale of this edition and listed first as "SALES OF THIS EDITION"; the comparable comes from there, and the light and the evidence cell speak for that edition when one is identified. Two copies of one title with different catalogue numbers share one fetch and each get their own grouping. Searches in a batch are paced about a second and a half apart so Popsike is never asked faster than a person would click; a single valuation is not slowed.

**Auction and fixed price are different figures.** Popsike records what copies actually fetched on eBay, mostly auction closes and some Buy It Now sales, above its own threshold: the collectible end of the market, skewed to the best copies and the keenest bidders. Discogs price suggestions are computed from Discogs's completed fixed-price sales for that release, by grade: the steady market, and the only one a common record has. The sheet keeps them apart everywhere a price appears. The evidence lists "AUCTION RESULTS" and "FIXED-PRICE MARKET" separately; the Price Guide says which figures are which; the Valuation Basis tags its comparable [auction] or [fixed-price]. Where documented auction results for your copy's edition run 10% or more above the fixed-price figure for its grade, an "Auction potential" line states it with both figures (top-five auction median against the Discogs figure for the grade), in the evidence, the Price Guide and the Valuation Basis, and the evidence cell shows "auction +N% vs fixed". That is the number to know before choosing between a fixed-price listing and an auction.

**Reissues are checked against the dealers, and out of print is noted.** Original pressings have no new price; reissues and audiophile editions do, and the specialist dealers (Acoustic Sounds, Elusive Disc) are the reference for it. For every record the sheet reads both dealers and lists, under "DEALER RETAIL" in the evidence and in the review panel, the new copies of your copy's edition (matched by catalogue number or edition family and marked "this edition"), any preowned copies they offer with the dealer's own note, and whether the edition is discontinued. A dealer's new price of the same edition is a documented figure the valuation may rest on, tagged [dealer new] in the Valuation Basis: it is the ceiling for a used copy while the edition is in print (a value above it is refused unless a documented auction sale of the edition reaches it), and the guide to a near-mint one, which sits at roughly 60-85% of new, lower grades lower. A dealer's used listing is an asking price, not a sale, and is shown for context only. An original pressing is never priced against a reissue's dealer price. When every new listing of the edition is marked discontinued, the evidence, the Price Guide and the Valuation Basis carry an "Out of print" line with the dealer's last listed price: once new copies are gone the used market for an edition tends to rise, so that estimate is one to revisit, and its auction results are the ones to watch. That last listed price is a dealer's asking price for a discontinued item, so it is never used as the comparable; the number still rests on documented sales. The evidence cell shows "dealer new $X" or "dealer OUT OF PRINT, last listed $X", and the Value audit's coverage line counts both. Your copy is matched to a dealer's item by catalogue number (the dealers' own stock codes are read too: Acoustic Sounds' "AMOB 1375" is Mobile Fidelity 1-375) or by edition family plus the edition's number, so a 45 rpm cut is never taken for the 33 of the same family.

**Recommended: take Popsike's full membership** (about 21 USD for six months, per its FAQ). It removes the daily limit, and a whole-collection fetch, a batch valuation or a Value audit before an insurance schedule all need it; the price evidence behind every figure in the sheet comes from that archive, so the membership is the cheapest part of getting the numbers right. Without it, "Fetch price evidence for all albums" simply picks up where it stopped the next day.

**Price Guide is catalogue copy.** The Price Guide states the band for this pressing from documented sales (Popsike, Discogs sales history, dealer and eBay solds), what drives it, and where your copy's grades sit, in two to four sentences. It is not a research diary: nothing about thin data, what "would tighten" the figure, what your other copy's notes say, or what should be corrected elsewhere. If the AI found no sale of the exact variant, one short clause says which variant's sales the band rests on. Read the band against the Valuation Basis and your own sense of the market; a figure with no documented sale behind it is an estimate, not a price.

**Two copies of one record.** If another row on any tab carries the same catalogue number, the research runs with that copy in view: the AI is given the other copy's runouts, grades, notes and value, and its front cover and side-1 label photos (marked "OTHER COPY"), and it has to rank the two — which is the earlier issue, and on which visible tells (cover design, the type setting of the label credits, lacquer and stamper marks, plant stamps). It may not treat a label address as proof of a first pressing, and it may not claim a difference between the copies that it cannot see in the photos. The review screen shows a blue line naming the other copies and a red warning if the findings still call both copies the first issue — when you see that, compare the covers and label typography yourself and use **Research further…** with what you found. After approving, glance at the other row: its notes may now need the same correction. Valuations make the same comparison.

**Batches research themselves.** While you review one album, the rest of your selection researches in the background — **up to 10 albums in parallel** — and a blue line under the status shows what's running and how many results are already waiting. **Approve + import** or **Skip** opens the next result instantly once it's ready. Nothing is ever written to the sheet without your Approve, and closing the dialog stops the pipeline (only the steps already running finish).

**If a round fails.** Research runs in rounds, and one round is one call to the AI. When a round fails — most often *"Exceeded maximum execution time"*, which means a single slow call (or its web searches) ran past Google's six-minute limit; sometimes a rate limit that outlasted the automatic retries — the review screen offers **Retry this round**. It re-runs just that round from where the album stood: the photos, the guide and every round already completed are reused, so nothing is paid for twice. A background album that failed is resumed the same way when its turn comes, and in review-later mode a failed album is resumed once automatically before it is counted as failed. **Skip** still moves on. (If a saved research result's **Research further…** fails, the saved result comes back on screen — you can still approve it — beside the same Retry button.)

**Research now, review later.** Tick **"Research everything now, review later"** in the picker and the whole selection runs unattended through the same parallel pool with no approvals — each album's result is **saved the moment it finishes**, so even closing the dialog mid-batch only loses the albums still mid-research (a failed album is not saved and stays un-researched, so the picker offers it again). Review the queue any time via **Vinyl Research → Review saved research…**: it opens with a **triage list of every saved result, worst lights first** — click any album to jump straight to it — and each result gets the same review screen (edit, lights, **Approve + import**, **Research further…**, **Keep for later**, or **Discard**). Saved results wait as long as you like; they're paid-for research and are only removed when you import or discard them.

**Vinyl Values → Calculate album values with AI…** works the same way for valuations, including the parallel background batching and the "not yet valued" default view (the completeness lights and review-later mode are research-only).

### The collection webpage

A private, live card view of your catalogue — one card per record with the fields you choose — usable from any phone or tablet browser (no desktop needed, unlike the menus). Artist and album dropdowns, free-text search, and Collection / For Sale / Sold tabs. The default fields include the key pressing columns plus **Value Estimate** and the sales columns; money amounts show **$** signs, and any web address in a cell is a tappable link.

One-time setup on your copy: **Vinyl Curator → Open collection webpage…** walks you through deploying it (Extensions → Apps Script → Deploy → New deployment → Web app, executing as you, access "Only me"), then paste the web-app address into **Set collection webpage address…**. After that, **Open collection webpage…** shows your link any time — bookmark it on your phone. Only you can open it; it reads the sheet live, so it's always current.

### The Vinyl Sales menu

Puts **For Sale** rows up for sale on the two big marketplaces — always as **drafts** you review and publish there:

- **List albums on Discogs…** — needs your own Discogs personal access token (discogs.com → Settings → Developers → **Set Discogs token…**) and a Discogs seller account. Per album it searches Discogs (catalogue number first), you pick the exact pressing from the candidates (or paste a release link), review the suggested condition/sleeve grades and price, and it creates the listing through the Discogs API as a **draft** — publish from Discogs after checking it. The prefilled comments are deliberately **compact** — your grades plus the typed matrix/runout, e.g. `Vinyl: VG+. Cover: VG. Matrix/runout - A: MG-36137A-1` — and stay fully editable before the listing is created.
- **Export albums to eBay draft file…** — no eBay developer account needed. Writes a Seller Hub bulk-upload CSV to the Drive folder **"Vinyl Curator eBay exports"**; upload it at eBay → Seller Hub → Reports → Uploads and it creates listing **drafts** with title, price, description, and the item specifics (artist, label, year, gradings, matrix numbers, format/genre and more) filled in — you add shipping on eBay and publish from there. Titles lead with **"1st Press"** when the AI research verdict confirms one, followed by cat# → year → label → mono/stereo → grade as the 80 characters allow. **Photos**: an album published on your site is listed with its website photo links; for anything unpublished, tick **include Drive photo links** in the export dialog and each photo is shared by link so eBay can fetch it at upload time. Photos that live in a folder someone **shared with you view-only** can't be shared from there, so the export **copies them into "Vinyl Curator eBay exports"** (one subfolder per album, named with the album's folder id) and links the copies — the dialog says how many were copied, and a re-export reuses them unless the original has been re-shot. Those copies are viewable by anyone with the link, exactly like any photo on an eBay listing; delete the subfolder any time and the next export makes it again.

Both flows record what they did and when in the **Discogs Listing** and **eBay Status** columns.

**Setting your asking prices.** The For Sale tab has three price columns — **eBay Start Price**, **eBay Buy Now Price**, and **Discogs List Price** — and they decide what kind of eBay draft each row becomes:

- Buy Now price only → a **Fixed Price** listing at that price.
- Start price only → an **Auction** starting there.
- Both → an **Auction with Buy It Now**.
- Neither → Fixed Price at the **Value Estimate** (or the first number in the Price Guide/Range) — same fallback the Discogs lister uses when there's no typed Discogs List Price. Either way, every price is shown for your approval before anything is created.

The columns ride along when a row moves to Sold, so your sold records keep their listing prices.

**Listing policies.** Your standard boilerplate (grading notes, packing, shipping, returns) lives in named **listing policies**: **Vinyl Sales → Manage listing policies…** opens a card editor where each policy can be enabled for eBay, Discogs, or both. Enabled eBay policies are appended to the bottom of every eBay draft description automatically; Discogs-scoped ones are added when a Discogs listing is created (mind Discogs' 1,000-character comment cap). The eBay export dialog also has a **content picker** — per description block (pressing notes, album story, fidelity, musicians, label variant) choose Full, Brief, or Off. If your sheet still carries the old **eBay/Discogs Listing Supplement** columns, run **Vinyl Sales → Remove old supplement columns…** once — any text in them is saved as a "General" policy before the column is deleted.

### The Vinyl Reports menu

Turns the catalogue into documents you can print, send, or hand to a broker. Everything it makes is created **privately** in a Drive folder called **"Vinyl Curator Reports"** — nothing is shared until you share it.

- **Collection schedule…** — one line per record (artist, title, label, year, format, grades, insured value) with an item count and grand total, as a Google Sheet and a PDF. Pick the records, the tabs, the sort and an optional grouping with subtotals. Records without a value go into a short "not yet valued" appendix — never silently dropped from the total.
- **Researched price estimate…** — the full record-by-record document: pressing details, label notes, condition, the valuation with its basis and price guide, personnel, tracklists and the album story, plus a methodology note and an owner's declaration to sign.
- **Catalogue / brochure (print)…** — a designed, photo-forward book of the collection. Start from a preset (**Coffee-table book**, **Catalogue**, or **For-sale brochure**) and adjust anything: records (with a filter and select-all), **1, 2 or 4 albums per page**, portrait or landscape, hero-cover or equal-grid image layout, whether prices appear (none, asking price, or estimated value), the order (artist, title, year, genre, label or value), optional grouping into sections (genre, label, decade or artist — a grouped run prints its section label down the left), a title page, and Letter or A4 paper. Large selections split into parts automatically; each finished part opens in a browser tab with a **Print / Save as PDF** button (margins Default, Background graphics ON) and an **Edit text** toggle for last-minute tweaks that bake into the printed PDF.
- **Personal notes** — every report picker has an "include personal notes" option, **off by default**: the schedule gains a Personal Note column, the estimate a Personal note section per record, and the catalogue prints the note on each record's page. Untouched, no report ever shows them.
- **Report settings (name, currency)…** — the collection owner's name and currency symbol printed on every report.
- **Seed suggested insured values from researched values** — fills the **Suggested Insured Value** column from the research's value estimates (it never overwrites). Type your own figure in **Insured Value** to override any record; reports use **Insured Value → Suggested → research estimate**, in that order. **Add Insured Value columns (one-time)** creates the two columns and then removes itself from the menu.

### The shareable sheet (client sheet)

**Vinyl Reports → Shareable sheet (recipient can re-run)…** builds a spreadsheet you can **send** — to a client, a broker, a buyer, or family — that carries its own **Reports** menu, so the recipient can produce the documents themselves from the records you chose to include:

- **Make Collection schedule (Sheet + PDF)**
- **Make Researched price estimate (Sheet + PDF)**
- **Make catalogue / book (print PDF)** — with the same choices you have: tick the records to include (all selected by default, with a filter and select-all), choose **Coffee-table book** (one album per page), **Lookbook** (two) or **Catalogue** (four), portrait or landscape, hero-cover or equal-grid image layout, whether prices appear (not shown, asking price, or estimated value), the order and an optional grouping (genre, label, decade or artist), a title page, and Letter or A4 paper. Big selections split into parts, each with its own **Open & print** button.

Good to know about the file you send:

- It's created privately in your **"Vinyl Curator Reports"** folder — share it (edit access) when you're ready. It opens on a friendly **Start Here** page that explains everything to the recipient.
- The first time the recipient runs a report, Google asks them to **authorise the file** — a normal one-time consent for a personal spreadsheet. The built-in script reads only the data inside the file and writes new documents to the **recipient's own Drive**; it cannot see their other files and sends nothing anywhere.
- **The catalogue is built from the album photographs**, so the recipient's Google account needs access to the album photo folders. A client whose collection was documented in their own Drive already owns them — it just works. A recipient without folder access gets a clear message instead; the schedule and price estimate still work for them.
- When you create a shareable sheet, it warns if any included album has no resolvable photo folder — those records would print without photos in a catalogue.
- The data is a **static copy** at the moment you send it: nothing the recipient does reaches back to your sheet, and later changes in your sheet don't appear in their copy (send a fresh one instead).
- **Personal notes**: the Personal Note column travels with the data, and every report picker — yours and the recipient's — has an "include personal notes" option that is **off by default**, so notes only ever print when deliberately ticked.

## 4. Day-to-day workflow

1. Shoot the album on the phone (photos + grades + matrix).
2. **Save photos** → **Upload to Google Drive**.
3. In the sheet: **Vinyl Curator → Add albums to sheet…** → tick the new albums → Go.
4. Optionally: **Vinyl Research** on the new rows, approve, done.

## 5. Good to know

- **Custom menus need a desktop browser.** The Sheets app on iPad/iPhone/Android can't show script menus — on a tablet, open the sheet in the browser with "Request Desktop Website". (The **collection webpage** works everywhere, though.)
- **The app updates itself, but asks first.** When a new version is ready, a bar appears at the bottom: **A new version is ready** → tap **Update** and it reloads into it. On iPhone that tap is the only way to refresh an installed app, as there's no address bar. **Settings** shows the version you're running — quote it if you report a problem. **Sheet script updates take two steps**: (1) Extensions → Apps Script → select all → paste the new version → save → reload the sheet; (2) run **Vinyl Curator → Update my sheet (after a script update)** so any new columns are added to your tabs. Your data, keys, and folder links all survive. New versions are announced by pnicol66.
- **Camera needs https** — the app runs from its https address; if the camera is unavailable it offers gallery import instead.
- **Import skipped a cell?** It never overwrites — clear the cell and re-run, or check the file is named `… - NN Entry Name` in the album's folder.

*Vinyl Curator — User Manual v2.11 · © 2026 pnicol66*
