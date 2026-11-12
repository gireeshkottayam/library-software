# AGENTS.md — Public Library Kooroppada

Desktop library management system for a single offline Windows machine. Written
with Electron 30.5.1, React 18 (Vite) and `better-sqlite3` 9.6.0.

## Install / run / build

```powershell
cd software
npm install
npm run dev        # Vite on :5173 + Electron
npm run build      # vite build, then electron-builder (nsis + portable)
npm run package    # vite build, then electron-builder --dir
```

`npm run build` writes installers to `software/release-builds/`. Signing is not
configured, so the installers are unsigned and SmartScreen warns on first run.

## Directory layout

```
software/
  electron/main.js       Electron main process, IPC handlers, window setup
  electron/preload.js    contextBridge surface exposed as window.api
  electron/db.js         schema, migrations, every SQL statement, licence check
  electron/db/           legacy development database (git-ignored)
  build/installer.nsh    custom NSIS pages (upgrade notice, finish page)
  src/App.jsx            router, settings context, auth gate
  src/pages/             one component per screen
  src/components/        layout, scanners, ID card, onboarding
  src/translations.js    English/Malayalam strings
  src/index.css          global design tokens and component styles
```

Runtime data is not in the repository:

- Database: `%APPDATA%\kooroppada-library\db\library.db`
- Automatic backups: `%APPDATA%\kooroppada-library\db\backups`
- The app copies a legacy `electron/db/library.db` into `%APPDATA%` on first run.

## Non-obvious decisions

- **`better-sqlite3` is a native module.** It is compiled for Electron's ABI, so
  it does **not** load under plain `node`. Run any database script with:
  `$env:ELECTRON_RUN_AS_NODE=1; .\node_modules\electron\dist\electron.exe script.js`.
  To load `electron/db.js` outside Electron, stub the module:
  `{ app: { getPath: () => userDataDir, isPackaged: false } }`.
- **`books.author` is free text**, while `authors` is a separate table used for
  the picker. Authors are split on `,`, `;`, `&` and `and`. `ensureAuthorsFromBook`
  registers each part on save, so multi-author books feed the picker too.
- **Duplicate author detection** is shared logic in two places: `findSimilarAuthors`
  in `electron/db.js` (authoritative, used for merging) and a copy in
  `src/pages/Books.jsx` (instant UI pre-check). Keep the thresholds and the
  name normalisation rules in sync.
- **Merge semantics**: `mergeAuthors` rewrites the matching names inside every
  book's author string, removes duplicates, deletes the source author rows and
  takes an automatic backup. "Keep both" simply inserts the new name.
- **Amounts** (`books.price`) were never written before v1.0.2, so old rows hold
  the column default `0`. From v1.0.3 the column is nullable and the meaning is:
  `NULL` = amount not recorded, `0` = free, `> 0` = the amount. A one-time
  migration (guarded by the `amount_unknown_migrated` setting) turns the legacy
  zeros into `NULL` after taking a backup, so an amount the librarian later sets
  to `0` is never cleared again. `toMoney()` returns `null` for blank or
  unusable input. The list shows `₹` with Indian digit grouping, `Free` for a
  zero and a **Set amount** button when nothing is known. The original amounts
  of books added in 1.0.0/1.0.1 cannot be recovered — the software never stored
  them.
- **The installer is a guided (assisted) NSIS installer**, not one-click:
  `oneClick: false` in `software/package.json` gives the install-mode page, the
  install-location page and a finish page. `software/build/installer.nsh` is
  included through `nsis.include` and adds `customInit` (reports a previous
  installation, found through `INSTALL_REGISTRY_KEY` or the library database)
  and `customFinishPage` (the "Installation completed successfully" page).
  Both macros must stay free of `Var` declarations: the uninstaller pass
  compiles the same include and electron-builder turns NSIS warnings into
  build errors. NSIS 3 wants the message text **before** the silent-mode
  switch (`MessageBox MB_OK "text" /SD IDOK`); the other order fails to
  compile.
- **Licensing** verifies an Ed25519 signature with the public key embedded in
  `db.js`. The private key and keygen app are deliberately excluded from this
  repository. Do not commit them.
- **Backups on every write** call `performAutoBackup()` in `db.js`. Retention is
  unlimited by design.

## Verification

There is no automated test suite. Changes are verified by:

1. `npm run build` — must produce both installers without errors. NSIS warnings
   are build errors here, so the custom include has to compile cleanly.
2. A database script run under Electron's Node (see above) covering the changed
   queries, including failure paths. The v1.0.3 scripts live in the session
   temp folder: `kpl-db-test.js` (query behaviour) and
   `kpl-amount-migration-test.js` (upgrade from an old database file).
3. Driving the packaged app with the Chrome DevTools Protocol
   (`--remote-debugging-port=9222`) to check the real UI, IPC round-trips and
   console errors.

Delete `%APPDATA%\kooroppada-library` after UI testing so test data does not
leak into a real installation.

## Conventions

- Keep SQL in `electron/db.js`; IPC handlers stay thin.
- Renderer talks to the database only through `window.api`.
- UI copy is bilingual (English + Malayalam) via `.lang-en` / `.lang-ml`.
- Mobile-first CSS with the shared design tokens in `src/index.css`.
