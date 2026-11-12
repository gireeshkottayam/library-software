# Release v1.0.4 — 12 November 2026

Public Library Kooroppada management system.

## Highlights

### Restoring a backup works now

The restore was lost without a word. The backup file was copied over the
database while the app was still running. The database keeps its recent
changes in a write-ahead log, and that log was written back into the new file
when the app closed — so the app came up with the **old** data again. A
restore looked like it had worked and had changed nothing.

From v1.0.4 the database is closed first, the write-ahead log is removed, the
backup is put in place and the app starts with the restored data. The Books
page then shows the books of the backup, with the amounts that were saved in
it.

The same fault was in the other direction: a backup that was taken right after
you entered an amount could be missing that amount, because the copy was made
before the write-ahead log was written into the file. Backups are now written
with the SQLite backup API, so a backup always holds everything.

### A backup from any version of the app can be restored

A backup taken with a version before v1.0.2 is missing columns that the app
needs, and the schema update failed on it — the restore could not be done at
all. Every missing column is added now, so a backup from any version works.

### A wrong file cannot destroy the data

A file that is not a library backup is refused with a clear message, and a
safety backup of the current data is taken before every restore. The backup
folder also gets a **Restore the newest automatic backup** button, a quick way
back to a known state when something was changed by mistake.

## What to tell the library

1. Close the software.
2. Install `KPL_Setup_v1.0.4.exe`. It detects the installed copy and upgrades
   it in place.
3. To restore a backup: **Settings → Backup → Restore from Backup**, pick the
   `.db` file, confirm. The app restarts with the restored data.
4. If a book still shows **Set amount** after the restore, that backup was
   taken with a version that never saved the price. The amount is not in the
   file and has to be typed in once with **Set amounts** on the Books page.

## Installers

| File | Size | SHA-256 |
| --- | --- | --- |
| `KPL_Setup_v1.0.4.exe` | 110,303,718 bytes | `B7568084685BEDFCC3494C0F4C7F01C5D7E63D69DEA1160599BFFAC18BFB578A` |
| `KPL_Portable_v1.0.4.exe` | 110,023,092 bytes | `92CC06186109829543F5C5F0F811A1E5B30DC302357F62354FCFE43BDF1FC034` |

Both are unsigned; Windows SmartScreen asks for confirmation on first run.

## Upgrade notes

- Close the application before running the installer. The database stays at
  `%APPDATA%\kooroppada-library\db\library.db`.
- Automatic backups continue to be written to
  `%APPDATA%\kooroppada-library\db\backups`. Retention is unchanged
  (unlimited).
- The automatic backups now hold the complete data as well. The backups that
  were written by v1.0.3 can still be missing a change that was made in the
  last moments before the copy; take a fresh backup with v1.0.4.

## Verification performed

- Database tests under Electron's Node: amount persistence for add and update,
  blank/negative/garbage values, free books kept at `0`, bulk amount writes in
  one transaction with one backup, author registration, duplicate detection and
  merging. 32 checks passed.
- Migration tests on copied databases: a v1.0.0 database (no price column) and
  a v1.0.2 database, checking that legacy zeros become "not recorded", real
  amounts are kept, the migration is not repeated on the next start and a
  deliberately free book survives. 13 checks passed.
- Restore tests: a backup holds the amount that was just written, a restore
  brings the backup back and survives a restart of the app, a backup from an
  old version is restored and gets the missing columns, a file that is not a
  database is refused without touching the data, and a safety backup is taken
  before every restore. 24 checks passed.
- End-to-end UI test against the packaged 1.0.4 build through the Chrome
  DevTools Protocol: the restore was started from **Settings → Backup**, the
  app restarted itself and the Books page showed the books and the amounts of
  the backup. 16 checks passed.
- The existing UI tests still pass against the new build: 24 checks for the
  amount flow and 23 checks for the author flow.
- Installer check on this machine: a silent install writes the registry entry
  with version 1.0.4 and the desktop shortcut; a second run reports
  "Public Library Kooroppada is already installed on this computer" with the
  version and folder and upgrades it in the same folder; the wizard ends on the
  "Installation completed successfully" page; the uninstaller removes the
  program, the registry entries and the shortcut again.

## Repository

<https://github.com/gireeshkottayam/library-software>
