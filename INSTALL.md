# Vinyl Curator — New User Install Guide

Everything below takes about 10 minutes and costs nothing to set up. You get two things:

- **The phone app** — walks you through a fixed photo checklist per album (covers, labels,
  matrix/dead-wax), auto-crops each shot, names the files, and saves them to your Google Drive.
- **The Google Sheet** — imports those photos into a collection catalogue, and (optionally)
  runs AI pressing research on each album: label, year, mono/stereo, pressing notes, and a
  price guide, researched with live web search and shown to you for approval before anything
  is written.

Nothing is shared with anyone else: photos stay on your phone until you export them to your
own Drive, the sheet copy is private to your Google account, and the AI runs on your own key.

## Part 1 — The phone app (2 minutes)

1. On your phone, open **https://pnicol66-sketch.github.io/vinyl-curator/** in Chrome.
2. Menu (⋮) → **Add to Home screen**. It installs like an app and works offline afterwards.
3. That's it. To save photo sets to Drive, tap **Share…** on the export screen and pick
   **Drive** — zero setup. (There's also a direct-upload mode that needs a free Google
   OAuth Client ID; see the README if you want that later.)

Shooting tip: save albums into Drive as `My Drive / Vinyl Curator / <Artist>_<Album>` —
the Share-to-Drive flow and direct upload both do this for you. The sheet imports from
that folder.

## Part 2 — Your own copy of the sheet (5 minutes, on a computer)

1. Open the template:
   **https://docs.google.com/spreadsheets/d/1yB7PvMQU4R2pLpuuX_Dr13Eob8cUR2kKNTOAKARwJcY/copy**
2. Click **Make a copy**. You now own a private, fully-wired copy — the menus and all the
   machinery travel with it automatically.
3. Open your copy and click the **Vinyl Curator** menu → any item. Google will ask you to
   authorize the script:
   - You'll see a **"Google hasn't verified this app"** warning. That's normal for personal
     scripts — click **Advanced → Go to … (unsafe)** and continue.
   - The script only asks for access to this spreadsheet and the Drive folders it manages.
4. Reload the sheet. Both menus (**Vinyl Curator** and **Vinyl Research**) are now live.

Day to day: shoot an album on your phone → export to Drive → in the sheet,
**Vinyl Curator → Add albums to sheet** pulls the photos and typed matrix text into a new row.

## Part 3 — AI pressing research (3 minutes, optional)

The research feature uses Claude (Anthropic's AI) with your own API key, so you pay only
for what you use — typically **$0.10–0.50 and 1–4 minutes per album**.

1. Create a key at **console.anthropic.com**: sign up → Billing → add credits ($5 goes a
   long way) → API Keys → **Create Key** → copy it.
2. In the sheet: **Vinyl Research → Set Anthropic API key…** → paste.
   The key is stored privately in *your* Google account — never in the sheet, never visible
   to anyone else.
3. **Vinyl Research → Research albums with AI…** → tick albums → pick a model
   (Claude Opus 5 = deepest research; Claude Sonnet 5 = faster, about a third of the cost).
   Results appear in an approval screen — edit anything, then **Approve + import**.

## Getting updates

Your copied sheet doesn't auto-update. When the script improves, pnicol66 will send you
the new version — paste it in (30 seconds): **Extensions → Apps Script** → select
everything in the editor → paste the new script over it → save (💾) → reload the sheet.
The phone app updates itself.

## License

Vinyl Curator is shared for **personal use** by permission of the author, and the sheet
menus check that your Google account has been given access — if you see a "not licensed"
message, or to ask for access in the first place, contact **pnicol66@gmail.com**. Please
don't redistribute the app, sheet template, or script without asking first.
