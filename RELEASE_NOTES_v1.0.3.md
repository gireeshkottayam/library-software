# Release v1.0.3 — 12 November 2026

Public Library Kooroppada management system.

## Highlights

### The installer now detects the software that is already on the computer

The setup was a silent one-click installer: it replaced whatever was there
without a word. From v1.0.3 it is a guided setup that

- checks the computer before it changes anything and reports a previous copy
  when it finds one:

  > Public Library Kooroppada is already installed on this computer.
  > Found: version 1.0.2
  > Location: C:\Users\…\AppData\Local\Programs\kooroppada-library

  It also detects a library database left behind by an older or portable copy;
- upgrades that installation **in place**, in the same folder, with the same
  shortcuts, so there is never a second copy of the software on the computer;
- keeps everything: books, members, fees, settings and the licence.

### The installer now confirms that it finished

The last page reads **"Installation completed successfully"**, states that the
existing books, members, fees and settings were kept, and offers to open the
software. The setup no longer closes without a word.

### Books show their amount again

Versions before v1.0.1 never wrote the price column, so every book added with
them carried the database default `0`. That `0` was not a price, and the list
showed it as an amount.

- v1.0.3 migrates those legacy rows to **"amount not recorded"** (a backup is
  taken first), so a wrong `0` is never shown as a price again.
- The Amount column now has three clear states: `₹199.50` for a recorded
  amount, `Free` for a book that is given away, and a clickable **Set amount**
  button when nothing is known.
- A banner at the top of the Books page counts the books that still miss an
  amount and opens the new **Set amounts** editor: one field per book, `Enter`
  moves to the next book, `0` marks a free copy and **Save Amounts** writes
  every value in one go.

The original amounts of books added in 1.0.0 or 1.0.1 cannot be recovered —
those versions never stored them. They can now be entered once, in a couple of
minutes, instead of one book at a time.

## Installers

| File | Size | SHA-256 |
| --- | --- | --- |
| `KPL_Setup_v1.0.3.exe` | 110,304,031 bytes | `86CA732D0BF5F4788CA97B803CF82A8F6FF845D642E5F55B9A9BCB6614EA8EE9` |
| `KPL_Portable_v1.0.3.exe` | 110,023,478 bytes | `7B3799D997BE1C7B51FEF61666269439CE805F1DADDA0C5AD30DE2AFF70943C9` |

Both are unsigned; Windows SmartScreen asks for confirmation on first run.

## Upgrade notes

- Close the application before running the installer. The database stays at
  `%APPDATA%\kooroppada-library\db\library.db` and the installer takes an
  automatic backup before the amount migration runs.
- The amount migration runs once. After that, a book you deliberately mark as
  free (`0`) stays free.
- Automatic backups continue to be written to
  `%APPDATA%\kooroppada-library\db\backups`. Retention is unchanged (unlimited).

## Verification performed

- Database tests under Electron's Node: amount persistence for add and update,
  blank/negative/garbage values, free books kept at `0`, bulk amount writes in
  one transaction with one backup, author registration, duplicate detection and
  merging. 32 checks passed.
- Migration tests on copied databases: a v1.0.0 database (no price column) and
  a v1.0.2 database, checking that legacy zeros become "not recorded", real
  amounts are kept, the migration is not repeated on the next start and a
  deliberately free book survives. 13 checks passed.
- End-to-end UI test against the packaged 1.0.3 build through the Chrome DevTools
  Protocol: the missing-amount banner, the Set amount button, the bulk editor,
  saving amounts, the list showing `₹100`/`₹250.50`/`Free`, and the values
  reaching SQLite through preload → IPC. 22 checks passed, and the 22 checks of
  the earlier author flow still pass.
- Installer check on this machine: a silent install writes the registry entry
  with version 1.0.3 and the desktop shortcut; a second run reports
  "Public Library Kooroppada is already installed on this computer" with the
  version and folder and upgrades it in the same folder; the wizard ends on the
  "Installation completed successfully" page; the uninstaller removes the
  program, the registry entries and the shortcut again.

## Repository

<https://github.com/gireeshkottayam/library-software>
