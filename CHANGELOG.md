# Changelog

All notable changes to the Public Library Kooroppada management system.

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
