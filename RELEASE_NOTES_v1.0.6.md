# Release v1.0.6 — 12 November 2026

Public Library Kooroppada management system.

## Highlights

### The amounts come back by themselves when a backup is restored

A backup that was taken with a version of the software that never saved the
price holds no amounts at all. Restoring it left every book showing **Set
amount**, so a library with more than a thousand books had to be typed in
again — even though the amounts were still on the computer.

They were, because:

- the library that the restore replaces still holds them, and
- every automatic backup holds every amount that was ever entered, because
  one backup is written on every change.

From v1.0.6 the software looks in both places and writes the amounts it finds
back into the books of the restored backup. The Books page shows them right
after the restore; nothing has to be typed a second time.

### A book only gets an amount when there is no doubt

A book is recognised, from the safest way to the least safe one, by

1. its number and title together,
2. its ISBN,
3. its title and author, and
4. a title that is on exactly one book.

Two books with the same key and different amounts make that key unusable, so
the software never writes an amount that could belong to a different book. No
amount is invented and no wrong amount is put on a book. The newest amount
wins, so a price that was corrected later is the one that is used. A backup
that holds its own amounts keeps them; only the books without one are looked
at.

### The app says what it found

The confirmation before a restore says that the amounts of the current
library and of the automatic backups are looked up for the books that the
backup has no amount for. After the restart the report says how many amounts
were found and written back, and how many books still wait for one. Only
those books are listed under **Set amounts** on the Books page.

## The backup that was sent in

The file `library-backup-2026-11-12.db` that was copied into the project
folder was examined with the SQLite engine of the app. It is a healthy
database (integrity check ok, 282 pages, no free pages), with 1224 books, 3
members, 3 borrowings, 2 payments, 57 publishers and the library settings.

**It holds no amount at all.** `SELECT DISTINCT price FROM books` returns one
single value: `0`, for all 1224 books. The column was added with
`ALTER TABLE books ADD COLUMN price REAL DEFAULT 0`, so every row kept the
default — the file has never been written to by a version that stored the
price. There is no amount in any text field either, and no free page holds an
older value.

The prices of that file therefore cannot be read out of it. What v1.0.6 does
is look for them where they are: in the library that is being replaced and in
the automatic backups of the folder `%APPDATA%\kooroppada-library\db\backups`.
In the test with that very file, all 1224 amounts that had been entered were
found again after the same file was restored a second time.

## What to tell the library

1. Close the software.
2. Install `KPL_Setup_v1.0.6.exe`. It detects the installed copy and upgrades
   it in place.
3. To restore a backup: **Settings → Backup → Restore from Backup**, pick the
   `.db` file, read the warning and press **Restore**. The app restarts and
   reports what came back and how many amounts it found again.
4. Books that still show **Set amount** are the ones whose amount was nowhere
   to be found — it was never entered and is in no backup. Type those in once
   with **Set amounts** on the Books page. The editor saves every entry right
   away, so it can be done in as many sittings as needed.

## Installers

| File | Size | SHA-256 |
| --- | --- | --- |
| `KPL_Setup_v1.0.6.exe` | 110,299,487 bytes | `0A69BFB3CCCBAA7886E9E061B615AC13499BB714AAC8078B5B5E3357AB752B25` |
| `KPL_Portable_v1.0.6.exe` | 110,018,947 bytes | `2D43DB1FBF0F00A11634C98F15AF21B252F2036D22E50556144922292F81EC1E` |

Both are unsigned; Windows SmartScreen asks for confirmation on first run.

## Upgrade notes

- Close the application before running the installer. The database stays at
  `%APPDATA%\kooroppada-library\db\library.db`.
- Automatic backups continue to be written to
  `%APPDATA%\kooroppada-library\db\backups`. Retention is unchanged
  (unlimited).
- The file `restore-report.json` next to the database holds the result of the
  last restore. It is removed as soon as it has been shown.
- One thing to know: the recovery fills in every amount that is missing, so
  an amount that was deliberately cleared in the editor comes back on the next
  restore. Clear it again after the restore if it should stay empty.

## Verification performed

- Amount recovery tests under Electron's Node: the amounts of the replaced
  library are written back after a restore, a free book keeps its 0, the
  amounts are found in the automatic backups when the library has none, a
  backup that holds its own amounts keeps them, two books that cannot be told
  apart get no amount, and the backup file that was sent in was restored,
  given all 1224 amounts, and restored again — all 1224 amounts were found
  again. 28 checks passed.
- The existing restore, database and migration suites still pass: 43, 32 and
  13 checks.
- End-to-end UI test against the packaged 1.0.6 build through the Chrome
  DevTools Protocol: the restore was started from **Settings → Backup**, the
  confirmation of the main process was answered, the app restarted itself, the
  report of the restore was shown with the right numbers, the Books page showed
  the books of the backup with their amounts, the one book whose amount was
  nowhere to be found still asked for one, and the amount editor saved an
  entry right away. 35 checks passed.
- The existing UI tests still pass against the new build: 24 checks for the
  amount flow and 23 checks for the author flow.
- Installer check on this machine: a silent install writes the registry entry
  with version 1.0.6 and the desktop shortcut; a second run reports
  "Public Library Kooroppada is already installed on this computer" with the
  version and folder and upgrades it in the same folder; the wizard ends on the
  "Installation completed successfully" page; the uninstaller removes the
  program, the registry entries and the shortcut again.

## Repository

<https://github.com/gireeshkottayam/library-software>
