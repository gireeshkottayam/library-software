# Release v1.0.2 — 12 November 2026

Public Library Kooroppada management system.

## Highlights

### Author selection and duplicate handling

- The **Author** field in Add Book / Edit Book is now a picker containing every
  author already stored in the library.
- A **+** button beside Author opens the Add Author modal, exactly like the
  Publisher field, and selects the new author when saved.
- New names are compared against existing authors (case, spacing and punctuation
  insensitive, edit-distance based). When close matches exist, the app lists them
  with a similarity percentage and offers:
  - **Merge into …** — reuse the existing author. Every book using the typed name
    is rewritten to the canonical name, duplicate names inside multi-author
    strings are removed, and an automatic backup is taken.
  - **Keep both** — store the new spelling as a separate author.
- Authors inside multi-author strings (`A, B & C`) are registered individually,
  and the picker shows how many books each author has.

### Amount instead of price

- The price field is replaced by a manual **Amount (₹)** entry. Blank is allowed,
  decimals up to two places are accepted, and negative values are rejected.
- The Books table now has an **Amount** column showing `₹` with Indian digit
  grouping (for example `₹1,23,456.50`), or `—` when no amount is set.

### Fixed: books showed ₹0

`addBook` and `updateBook` never wrote the `price` column, so every book fell
back to the database default of `0`. Both statements now persist a normalised
amount. The renderer also passes the amount explicitly through the existing IPC
contract.

## Installers

| File | Size | SHA-256 |
| --- | --- | --- |
| `KPL_Setup_v1.0.2.exe` | 110,254,122 bytes | `6DB8F6375BF5A9C52CEE9CCCBC550366185B7651A986A12CAE67BC243F4C47EB` |
| `KPL_Portable_v1.0.2.exe` | 110,027,062 bytes | `1F23127FDCE7B3C7C66ACA63D1CD9F1611CB387FB0A027A317DAE033C221CF97` |

Both are unsigned; Windows SmartScreen asks for confirmation on first run.

## Upgrade notes

- Close the application before running the installer. Data and settings are
  preserved; the database stays at `%APPDATA%\kooroppada-library\db\library.db`.
- Books created in 1.0.0 or 1.0.1 have no saved amount because the value was
  never written. Open each book, enter the amount and save once.
- Automatic backups continue to be written to
  `%APPDATA%\kooroppada-library\db\backups`. Retention is unchanged (unlimited).

## Verification performed

- Database tests under Electron's Node: price persistence for add/update,
  blank/negative/garbage values, author registration from multi-author strings,
  case-insensitive duplicate detection, similarity suggestions, merge rewriting
  and de-duplication, per-author book counts. 19 checks passed.
- End-to-end UI test against the packaged 1.0.2 build through the Chrome DevTools
  Protocol: author list contents, `+` modal, merge prompt, merge and keep-both
  paths, amount entry, persistence through preload → IPC → SQLite, and the list
  rendering `₹123.45`. 22 checks passed.
- `npm run build` produced the NSIS installer and portable executable.

## Repository

<https://github.com/gireeshkottayam/library-software>
