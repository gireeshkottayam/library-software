# Changelog

All notable changes to the Public Library Kooroppada management system.

## v1.0.6 — 2026-11-12

### Fixed

- **A restore brings the amounts back.** A backup that was taken with a version
  that never saved the price holds no amounts. Restoring it left every book
  showing "Set amount" although the amounts were still on the computer: the
  library that was replaced has them, and every automatic backup holds every
  amount that was ever entered, because one backup is written on every change.
  The amounts are now looked up in those places and written back into the
  restored books — the librarian does not type them a second time.
- **A book is only given an amount when there is no doubt.** A book is
  recognised by its id and title, by its ISBN, by its title and author, and
  last by a title that is on exactly one book. A match that could be more than
  one book is never used, so no amount can be invented. A backup that holds
  its own amounts keeps them.
- **The report says how many amounts were found.** After the restart the app
  says how many amounts were found and written back, and how many books still
  wait for one. The confirmation before the restore says the same.

### Changed

- **The Books page names the cause in the same way.** The banner says that the
  amounts are looked up in the library and in the automatic backups when a
  backup is restored, and that the books listed there are the ones that were
  nowhere to be found.

## v1.0.5 — 2026-11-12

### Fixed

- **The app now says what a restore did.** A restore restarts the software,
  so the window that started it could no longer show the result — the app came
  back with a changed library and no explanation. The result is now written
  next to the database and shown after the restart: how many books came back,
  how many of them have no amount, and what to do about it.
- **A restore warns before it replaces the amounts.** The confirmation now
  tells the librarian how many books the backup holds and how many of them
  have an amount. A backup from a version that never saved the price is
  recognised as such, so nobody loses amounts without a warning.
- **The Books page names the cause.** The banner says that the amount of
  these books was never stored, so it is neither in the database nor in the
  old backups, and that no restore can bring it back.

### Changed

- **Entering many amounts is safe now.** The amount editor shows how many of
  the books already have an amount, has a search field to find a book, and
  saves every amount right away when the field is left or Enter is pressed.
  A long session cannot lose the typing any more.

## v1.0.4 — 2026-11-12

### Fixed

- **Restoring a backup now works.** The restore copied the backup file over the
  live database while the database was still open. The database runs in WAL
  mode, so the write-ahead log was written back into the new file when the app
  closed and **the old data came back** — the restore was silently lost. The
  database is closed now, the write-ahead log is removed, the backup is put in
  place and the schema is applied to it again.
- **A backup now holds everything.** "Create Backup" copied the database file
  while it was open, so the copy could be missing the changes that were still
  in the write-ahead log — the amounts that were just entered, for example.
  The backup is now written with the SQLite backup API, which includes them.
  The automatic backups do the same before they are written.
- **An old backup can be restored again.** A backup from a version before
  v1.0.2 was missing columns the app needs, and the schema update failed on
  it. Every missing column is added now, so a backup from any version of the
  app can be restored.
- **A wrong file no longer risks the data.** A file that is not a library
  backup is refused with a clear message, and the current data is kept.

### Added

- **Restore the newest automatic backup.** The Backup page of the Settings has
  a button that puts the newest file from the automatic backup folder back in
  place — a quick way back to a known state when something went wrong.
- A safety backup of the current data is taken before every restore.

### Upgrade notes

- Close the software before restoring a backup.
- The database stays at `%APPDATA%\kooroppada-library\db\library.db`.

## v1.0.3 — 2026-11-12

### Fixed

- **The installer now detects a previous installation.** The setup window reports
  the version and folder of the copy already on the computer ("Public Library
  Kooroppada is already installed on this computer") before anything is
  replaced, and the upgrade happens in place instead of leaving a second copy.
- **The installer now confirms that it finished.** The one-click, silent
  installer was replaced by a guided setup with a welcome page, an install
  location page, a progress page and a final **"Installation completed
  successfully"** page that also offers to open the application.
- **Books that show an amount again.** Amounts entered before v1.0.1 were never
  written to the database, so every old row held the column default `0`. That
  `0` is now migrated to "amount not recorded" instead of being shown as a
  price, and the Books page offers a quick editor to fill the amounts in.
- A book with no amount is no longer displayed as `—` or `₹0`: it shows a
  **Set amount** button, and the page header explains how many books still miss
  an amount.

### Added

- **Set Book Amounts editor.** One click on **Set amount** (or the banner
  button) opens a list of the books that still need an amount, with a number
  field per book. Enter the amount and press `Enter` to move to the next book.
  `0` marks a free copy, a blank field keeps the book as "not recorded".
- **Amount column states.** `₹1,234.50` for a recorded amount, `Free` for a
  deliberate zero, and a clickable **Set amount** button when nothing is known.
- **Bulk amount write** (`books-set-amounts` IPC) that saves every amount in a
  single transaction and takes a single automatic backup.

### Changed

- The Books page shows a banner when the list contains books without an amount,
  with a **Set amounts** button that opens the editor for all of them at once.

### Upgrade notes

- The installer keeps the database at
  `%APPDATA%\kooroppada-library\db\library.db` and takes an automatic backup
  before the amount migration runs.
- The original amounts of books added in 1.0.0 or 1.0.1 cannot be recovered:
  the old versions never stored them. Use **Set amounts** on the Books page to
  record them once; the list then shows them.

## v1.0.2 — 2026-11-12

### Added

- **Author picker in Add Book.** The Author field is now a select list of every
  author already saved in the library. Authors are registered from both single
  and multi-author book strings (`A, B & C`).
- **Add author with `+`.** A `+` button beside Author opens an Add Author modal,
  matching the existing Publisher flow, and selects the saved author in the form.
- **Duplicate author detection.** Similar names (case, punctuation and spacing
  insensitive, Levenshtein based) are shown with a match percentage. The user can
  merge the new name into an existing author or keep both names.
- **Author merging.** Merging rewrites the author inside every affected book,
  removes duplicate names in a multi-author string, deletes the duplicate author
  row and takes an automatic backup.
- **Book count per author** in the picker, counted across multi-author strings.

### Changed

- The book **price** field is now a manual **Amount (₹)** entry (`step="0.01"`,
  no negative values, blank allowed).
- The Books table column is now **Amount** and shows `₹` with Indian digit
  grouping, or `—` when no amount is set.

### Fixed

- **Book amounts were never saved.** `addBook` and `updateBook` did not include
  the `price` column, so every row fell back to `0` and the list always showed
  `0`. Both statements now persist a normalised amount.
- Authors typed as part of a multi-author book were stored as one row; each name
  is now registered separately.

### Upgrade notes

- Books created in 1.0.0/1.0.1 have no stored amount because the value was never
  written. Open each book, enter the amount and save.
- Existing data and settings are preserved by the installer.

## v1.0.1

Previous shipped build: author dropdown and Add Author modal, cover-page OCR
autofill and online book lookup.

## v1.0.0

First public release: books, members, circulation, fees, sponsors, reports,
WhatsApp notifications, settings, backups and offline licence activation.
