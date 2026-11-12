# Release v1.0.7 — 12 November 2026

Public Library Kooroppada management system.

## Highlights

### The amounts can be found again — without a restore

The amount recovery of v1.0.6 only ran **while a backup was restored**. That
left a real gap: a library that had already been replaced by a restore could
not reach its amounts any more. That happens when

- the restore was made with a version of the software that had no recovery
  (everything before v1.0.6), or
- the restore was made before v1.0.6 was installed.

From v1.0.7 the recovery is an operation of its own:

**Settings → Backup → Find the amounts again**

It does the same work as a restore — looks for the amounts of the books that
have none and writes them into those books — but it runs on the library that
is there now, at any time. No backup has to be restored, and nothing else
changes.

The panel says

- how many amounts were found and written in,
- **where** they came from (the library, or the name of the backup file),
- how many places were looked at, and
- how many books still wait for an amount.

"Nothing was found" can now be told apart from "nothing was looked at".

### The amounts can be taken from a file the librarian names

If the amounts are in a backup on a USB stick, in an old copy of the library
or in a list the librarian kept, **Take the amounts from another file** in the
same panel looks in that file as well. The file is tried first, before the
automatic backups.

Two kinds of files are read:

| File | What it is |
| --- | --- |
| `.db` | a library backup — the books and the amounts they hold |
| `.csv`, `.txt`, `.tsv` | a price list — one book per line, with the ISBN or the title of the book and its amount |

A price list is what a spreadsheet is exported to. The columns may be
separated by a comma, a semicolon or a tab, and the first line may be a
heading (`ISBN`, `Title`, `Author`, `Amount` — `Price` and `Cost` are
understood as well). Without a heading the amount is the last number of the
line:

```
ISBN,Title,Author,Amount
978-81-1234,Ardra Manas,Basheer,250
978-81-5678,ഉമ്മൻ ചാണ്ടി,ഉമ്മൻ ചാണ്ടി,75.50
```

A file that cannot be read is skipped and does not stop the search, so a
wrong file can never break the recovery. A line that could be two books is
never used, exactly as everywhere else — no amount is ever invented.

### More of the automatic backups are looked at

The search now opens up to **1000** automatic backups instead of 300, and it
stops as soon as every book has an amount. The retention of the automatic
backups is unchanged (unlimited).

## The backup file that was sent in

`library-backup-2026-11-12.db` was examined again with the SQLite engine of
the app. It holds **no amount at all**:

| | |
| --- | --- |
| books | 1224 |
| distinct values of `books.price` | one: `0`, for all 1224 books |
| the `price` column | `REAL DEFAULT 0` — added by `ALTER TABLE` |
| `amount_unknown_migrated` | not set |
| amounts in any text column | none |
| free pages (deleted rows) | none |
| integrity check | ok |

The missing `amount_unknown_migrated` setting and the `DEFAULT 0` column show
that the file was written by a version of the software **before v1.0.3** —
a version whose book form had no amount field. Every book in it carries the
column default, never a price that was typed in. The prices of that file
therefore cannot be read out of it, by any version of the software.

Two more findings that matter for the recovery:

- **The automatic backups of v1.0.0 and v1.0.1 can be missing the newest
  changes.** The database has been in WAL mode since v1.0.0, and the old
  backup code copied the database file without a WAL checkpoint. In WAL mode
  a change is written into `library.db-wal` and only reaches `library.db` at
  a checkpoint, so those old backups are copies of a state that is up to one
  checkpoint behind — they can be missing the amounts that were entered last.
  The checkpoint before every copy was added in v1.0.4; every backup written
  since then is complete.
- **The restore of v1.0.0 and v1.0.1 never worked.** The backup file was
  copied over the open database, so the write-ahead log was checkpointed
  into the new file when the app closed and the old data came back. A
  working restore came with v1.0.4. A librarian who restored with v1.0.4 or
  later has the newest automatic backup with the prices, and the recovery
  finds them there.

## What to tell the library

1. Close the software.
2. Install `KPL_Setup_v1.0.7.exe`. It detects the installed copy and upgrades
   it in place.
3. Open **Settings → Backup** and press **Find the amounts again**.
   - If it says that amounts were found, the books have them again — open
     the **Books** page to see them.
   - If it says that nothing was found, press **Take the amounts from another
     file** and pick the file that holds the prices: a library backup
     (`.db`) on the USB stick, the copy of the library from before the
     amounts were typed in, or the price list from a spreadsheet (`.csv`).
4. Only the books that are still empty afterwards have to be typed in, with
   **Set amounts** on the Books page.

## Installers

| File | Size | SHA-256 |
| --- | --- | --- |
| `KPL_Setup_v1.0.7.exe` | 110,397,872 bytes | `2E8FDDD484F80C44964A5FD2E56419CC7449E42717457A9CF18B2FE484034AD1` |
| `KPL_Portable_v1.0.7.exe` | 110,117,315 bytes | `5F39FBC617D383FC8B300A73647D6E8336A77A30896F330A8C22E0E2E5B68A4E` |

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
  an amount that was deliberately cleared in the editor comes back the next
  time it runs. Clear it again afterwards if it should stay empty.

## Repository

<https://github.com/gireeshkottayam/library-software>
