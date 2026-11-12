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
  the default `0`. The list now renders `—` for zero and `₹` with Indian digit
  grouping otherwise.
- **Licensing** verifies an Ed25519 signature with the public key embedded in
  `db.js`. The private key and keygen app are deliberately excluded from this
  repository. Do not commit them.
- **Backups on every write** call `performAutoBackup()` in `db.js`. Retention is
  unlimited by design.

## Verification

There is no automated test suite. Changes are verified by:

1. `npm run build` — must produce both installers without errors.
2. A database script run under Electron's Node (see above) covering the changed
   queries, including failure paths.
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
