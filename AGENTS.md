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
- **The database runs in WAL mode**, so a plain copy of `library.db` can be
  missing the changes that are still in `library.db-wal`. Every backup
  therefore checkpoints the log first (`checkpointWal()`), and the manual
  "Create Backup" uses the SQLite backup API (`db.backup()`). Copying the file
  by hand is not a backup.
- **A restore must close the database first.** The old restore copied the
  backup file over the live database while the connection was still open; the
  write-ahead log was then checkpointed into the new file when the app closed
  and the old data came back, so the restore was silently lost.
  `restoreFromFile()` in `db.js` now closes the connection, removes the `-wal`
  and `-shm` files, copies the file and reopens the database. If the log files
  cannot be removed, another program still holds the database and the restore
  is refused instead of doing something wrong.
- **The schema has to be re-applied after a restore.** `refreshSchema()` runs
  the tables, the column migrations, the indexes, the amount migration and the
  author seeding. The indexes come **after** the columns: an index on a column
  an old database file does not have makes the whole schema update fail.
  `ensureAllColumns()` adds any column that is missing, so a backup from any
  version of the app can be restored.
- **A restore restarts the app, so its result cannot be shown by the window
  that started it.** The result is written to `restore-report.json` next to the
  database (`%APPDATA%\kooroppada-library\db\`) and read by `App.jsx` after
  the next start. It is a file and not a setting, because a restore replaces
  the database file and a setting written into the restored file would be
  lost with the old one.
- **The main process owns the restore confirmation.** Only there is the
  content of the picked file known, so `main.js` inspects it
  (`inspectBackupFile()`) and shows how many books it holds and how many of
  them have an amount before anything is replaced. The renderer must not ask
  a second time.
- **A `0` in a file without the `amount_unknown_migrated` setting means
  "not recorded", not "free".** `countAmountsIn()` in `db.js` reads that
  setting to tell the two apart: the migration sets it, so a file that has it
  stores a real `0` for a free book. Without this check the app would report
  a backup from before v1.0.3 as holding an amount for every book.
- **A restore brings the amounts back.** A backup that was taken with a
  version that never saved the price holds no amounts at all, but the amounts
  are still on the computer: the library that is replaced has them, and every
  automatic backup holds every amount that was ever entered, because
  `performAutoBackup()` runs on every change. `restoreFromFile()` therefore
  builds an index of the amounts (`buildAmountIndex()`) from the library that
  is replaced and from the automatic backups, and writes them into the
  restored books (`recoverAmounts()`). A backup that holds its own amounts
  keeps them; only the books without one are looked at.
- **A book is only given an amount when there is no doubt.** The keys of the
  index, from the safest to the least safe one: the same id with the same
  title, the ISBN, the title with the author, and last a title that is on
  exactly one book. Two books with the same key and different amounts make
  the key unusable (`ambiguous`), so no amount can ever be invented. The
  newest source wins, so a price that was corrected later is the one that is
  used. The number of backup files that are looked at is bounded (1000), because
  the retention of the automatic backups is unlimited.
- **The recovery is an operation of its own, not a part of the restore.**
  `recoverMissingAmounts()` does the same work as a restore and can be run at
  any time, on its own. It is needed because the recovery of v1.0.6 only ran
  *during* a restore: a librarian whose library was already replaced by a
  restore could not reach the amounts any more. The places that are looked
  at, in this order, are the files the librarian named, the library that is
  there now and the automatic backups (newest first). The report names only
  the places that really supplied an amount, and says how many places were
  looked at, so the librarian can tell "nothing was found" from "nothing was
  looked at".
- **A price list is read like a database.** A file that is not a `.db` is
  read as a price list: one book per line, the ISBN or the title of the book
  and its amount, separated by a comma, a semicolon or a tab
  (`buildAmountIndexFromList()`). The first line may be a heading, in which
  case the columns `isbn`, `title`, `author` and `amount` (also `price`,
  `cost`, `value` and `വില`) are used by their name. Without a heading the
  amount is the last number of the line. This is the only way to bring back
  amounts that are in none of the files of the software itself — for example
  a spreadsheet the librarian kept. The same rules apply as everywhere else:
  a line that could be two books is never used.
- **The automatic backups of v1.0.0 and v1.0.1 can be missing the newest
  changes.** The database has been in WAL mode since v1.0.0, and the old
  `performAutoBackup()` copied the database file without a WAL checkpoint. In
  WAL mode a commit goes into `library.db-wal` and only reaches
  `library.db` at a checkpoint, so those old backups are copies of a state
  that is up to one checkpoint behind — they can be missing the amounts that
  were entered last. The checkpoint before every copy (`checkpointWal()`) was
  added in v1.0.4; keep it.
- **The recovery fills in every missing amount, also a cleared one.** A book
  whose amount was deliberately cleared in the editor gets the amount back on
  the next restore, because the restore only knows that the amount is missing.
  This is the trade-off of the automatic recovery: it is meant to bring back
  what a restore would otherwise throw away, and the report after the restart
  says how many amounts were written back.

## Verification

There is no automated test suite. Changes are verified by:

1. `npm run build` — must produce both installers without errors. NSIS warnings
   are build errors here, so the custom include has to compile cleanly.
2. A database script run under Electron's Node (see above) covering the changed
   queries, including failure paths. The v1.0.7 scripts live in the session
   temp folder: `kpl-db-test.js` (query behaviour),
   `kpl-amount-migration-test.js` (upgrade from an old database file),
   `kpl-restore-test.js` (backup, restore and the restore report),
   `kpl-amount-recovery-test.js` (the amounts that are found again after a
   restore, including the backup file of the library that reported the
   problem), `kpl-amount-recovery-standalone-test.js` (the recovery that
   runs without a restore, with a file the librarian names) and
   `kpl-price-list-test.js` (a price list that is read like a database).
3. Driving the packaged app with the Chrome DevTools Protocol
   (`--remote-debugging-port=9222`) to check the real UI, IPC round-trips and
   console errors. The restore confirmation of the main process is a native
   window, so it is answered with a `BM_CLICK` on its **Restore** button
   (`run-restore-test.ps1`), not with a key stroke.

Electron resolves the user data folder through the Windows known-folder API,
not through `%APPDATA%`. A UI test therefore has to seed and delete
`%APPDATA%\kooroppada-library` itself.

Delete `%APPDATA%\kooroppada-library` after UI testing so test data does not
leak into a real installation.

## Conventions

- Keep SQL in `electron/db.js`; IPC handlers stay thin.
- Renderer talks to the database only through `window.api`.
- UI copy is bilingual (English + Malayalam) via `.lang-en` / `.lang-ml`.
- Mobile-first CSS with the shared design tokens in `src/index.css`.
