# Changelog

All notable changes to the Public Library Kooroppada management system.

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
