# Release v1.0.5 — 12 November 2026

Public Library Kooroppada management system.

## Highlights

### The app now says what a restore did

A restore restarts the software. The window that started the restore was
closed in the middle of it, so the result never reached the screen — the
librarian came back to a changed library with no explanation at all. This is
what made the problem look like a lost backup.

From v1.0.5 the result is written next to the database and shown after the
restart: how many books came back, how many of them have no amount, and what
to do about it. The message is shown once.

### A restore warns before it replaces the amounts

The confirmation now tells the librarian what the backup really holds: how
many books it has and how many of them have an amount. A backup that was
taken with a version that never saved the price is recognised as such, so
nobody loses the amounts they entered without a warning first.

The check is the `amount_unknown_migrated` setting inside the file. A file
that has it stores a real `0` for a free book; a file without it holds the
column default `0` for every book, which means "not recorded".

### The Books page names the cause

The banner says that the amount of these books was never stored, so it is
neither in the database nor in the old backups, and that no restore can bring
it back — and that every backup from now on holds the amount.

### Entering many amounts is safe

The amount editor shows how many of the books already have an amount, has a
search field to find a book in a large library, and saves every amount right
away when the field is left or Enter is pressed. A long session cannot lose
the typing any more.

## The backup that was sent in

The file `library-backup-2026-11-12.db` that was copied into the project
folder was examined with the SQLite engine of the app. It is a healthy
database (integrity check ok, 282 pages, no free pages), with 1224 books, 3
members, 3 borrowings, 2 payments, 57 publishers and the library settings.

**It holds no amount at all.** `SELECT DISTINCT price FROM books` returns one
single value: `0`, for all 1224 books. The column was added with
`ALTER TABLE books ADD COLUMN price REAL DEFAULT 0`, so every row kept the
default — the file has never been written to by a version that stored the
price. There is no amount in any text field either, and no free page holds
an older value.

So the prices cannot be recovered from that file, and no restore can bring
them back. The restore itself works: the file was restored in a test, all
1224 books came back and the app now says exactly that.

## What to tell the library

1. Close the software.
2. Install `KPL_Setup_v1.0.5.exe`. It detects the installed copy and upgrades
   it in place.
3. To restore a backup: **Settings → Backup → Restore from Backup**, pick the
   `.db` file, read the warning and press **Restore**. The app restarts and
   reports what came back.
4. Books that show **Set amount** need the price typed in once with
   **Set amounts** on the Books page. The editor saves every entry right away,
   so it can be done in as many sittings as needed.

## Installers

| File | Size | SHA-256 |
| --- | --- | --- |
| `KPL_Setup_v1.0.5.exe` | 110,302,067 bytes | `712226E419E8CA99527C93379009E5A274045757DF2BF69E839345E4DACBF567` |
| `KPL_Portable_v1.0.5.exe` | 110,021,506 bytes | `26D243F4148D33D0D9EEB6878C629B2E792A62C736C9D01954C07A9C50DBEE3A` |

Both are unsigned; Windows SmartScreen asks for confirmation on first run.

## Upgrade notes

- Close the application before running the installer. The database stays at
  `%APPDATA%\kooroppada-library\db\library.db`.
- Automatic backups continue to be written to
  `%APPDATA%\kooroppada-library\db\backups`. Retention is unchanged
  (unlimited).
- The file `restore-report.json` next to the database holds the result of the
  last restore. It is removed as soon as it has been shown.

## Verification performed

- Restore tests under Electron's Node: a backup holds the amount that was
  just written, a restore brings the backup back and survives a restart, a
  backup from an old version is restored and gets the missing columns, a file
  that is not a database is refused without touching the data, a safety backup
  is taken before every restore, the result of a restore is written and read
  again, a legacy `0` is recognised as "not recorded" while a `0` of a new
  backup counts as a free book, and the backup file that was sent in is
  restored with all 1224 books. 43 checks passed.
- The existing database and migration suites still pass: 32 checks and 13
  checks.
- End-to-end UI test against the packaged 1.0.5 build through the Chrome
  DevTools Protocol: the restore was started from **Settings → Backup**, the
  confirmation of the main process was answered, the app restarted itself, the
  report of the restore was shown with the right numbers, the Books page
  showed the books of the backup, the banner named the cause, the amount
  editor opened, its search worked and one amount was saved right away. 33
  checks passed.
- The existing UI tests still pass against the new build: 24 checks for the
  amount flow and 23 checks for the author flow.
- Installer check on this machine: a silent install writes the registry entry
  with version 1.0.5 and the desktop shortcut; a second run reports
  "Public Library Kooroppada is already installed on this computer" with the
  version and folder and upgrades it in the same folder; the wizard ends on the
  "Installation completed successfully" page; the uninstaller removes the
  program, the registry entries and the shortcut again.

## Repository

<https://github.com/gireeshkottayam/library-software>
