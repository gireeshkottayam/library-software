# Public Library Kooroppada — Library Management System

Desktop library management software for Public Library Kooroppada (Kerala, India).
It runs fully offline on Windows and keeps all data in a local SQLite database.

![Electron](https://img.shields.io/badge/Electron-30.5.1-47848F)
![React](https://img.shields.io/badge/React-18-61DAFB)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57)
![Version](https://img.shields.io/badge/version-1.0.3-orange)

## Features

- **Books** — add, edit, delete, search; QR labels; cover-page OCR autofill;
  selectable author list with duplicate detection and merge; manual amount entry
  with a quick editor for books that still miss an amount.
- **Members** — registration, photos, ID cards, membership fees, status.
- **Circulation** — issue, renew and return books, overdue tracking, fines.
- **Fees & payments** — record member payments and library income.
- **Sponsors** — track book sponsors, both members and external donors.
- **Reports** — inventory, circulation and fee summaries; printable output.
- **WhatsApp notifications** — optional UltraMsg integration for due reminders.
- **Settings** — library identity, membership rates, users, backup and restore.
- **Licensing** — trial mode plus offline activation with an Ed25519 key pair.

## Requirements

- Windows 10 or 11, 64-bit
- 4 GB RAM, 500 MB free disk space
- Webcam (optional, for QR/cover scanning)

## Install (end user)

Download the latest setup from the releases page and run it:

- `KPL_Setup_v1.0.7.exe` — installer with desktop shortcut
- `KPL_Portable_v1.0.7.exe` — portable, no installation

The setup is a guided installer:

- it tells you when a **previous installation is found**, with the version and
  the folder, and upgrades that installation in place;
- it ends on an **"Installation completed successfully"** page and offers to
  open the application.

Existing data is preserved when upgrading. The database lives at:

```
%APPDATA%\kooroppada-library\db\library.db
```

Automatic backups are written to `%APPDATA%\kooroppada-library\db\backups`. A
backup can be restored from **Settings → Backup**; the page also offers to put
the newest automatic backup back in place.

A backup that was taken with an older version of the software holds no book
amounts. Restoring it does not throw the amounts away: they are looked up in
the library that was replaced and in the automatic backups, and written back
into the books that the backup had no amount for. If the amounts are in
another file, **Settings → Backup → Find the amounts again** looks there as
well — no restore needed.

Default first-run login: `admin` / `admin123`. Change it after signing in.

## Build from source

```powershell
cd software
npm install
npm run dev      # Vite dev server + Electron
npm run build    # renderer bundle + NSIS installer + portable exe
npm run package  # renderer bundle + unpacked app (release-builds/win-unpacked)
```

Output lands in `software/release-builds/`:

- `Public Library Kooroppada Setup <version>.exe`
- `Public Library Kooroppada <version>.exe`
- `win-unpacked/` (unpacked application)

The release copies are renamed to `KPL_Setup_v<version>.exe` and
`KPL_Portable_v<version>.exe` inside `KPL_Installer_Package/`.

> The builds are currently **unsigned**, so Windows SmartScreen shows a
> "Windows protected your PC" warning. Choose *More info → Run anyway*.

## Project layout

```
software/                  Electron + React application
  electron/                main process, preload bridge, SQLite layer
  src/                     renderer (React pages, components, styles)
  public/                  static assets (icon)
  build/installer.nsh      custom NSIS installer pages (upgrade notice, finish page)
Setup.cs, Uninstall.cs     C# helper installers
installer.iss              Inno Setup script
DOCUMENTATION.md           end-user manual
CHANGELOG.md               version history
RELEASE_NOTES_v1.0.7.md    notes for the current release
```

`AGENTS.md` describes the architecture, build quirks and verification steps in
more detail.

## Data safety

- Every write operation triggers an automatic database backup.
- Manual backup and restore live in **Settings → Backup**. A restore takes a
  safety backup of the current data first, refuses files that are not library
  backups, and works with backups taken by any version of the app.
- The newest automatic backup can be restored with one click on the same page.
- After a restore the app reports what came back and how many books have no
  amount, and the Books page offers the editor to type them in.
- Backups are unlimited; prune the `backups` folder if disk use matters.
- The database path is identical in installed and portable builds, so switching
  between them keeps the same data.

## Licence key generation

Licence keys are signed with an Ed25519 private key. The key-generation tooling
is intentionally **not** part of this repository; `software/electron/db.js`
contains only the public key needed to verify a key.

## Changelog

See [CHANGELOG.md](CHANGELOG.md). Current release: **v1.0.3**.
