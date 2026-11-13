# Release v1.0.8 — 13 November 2026

Public Library Kooroppada management system.

## Highlights

### The Amount field is a field you write the amount into

The Amount field of the Add Book window was a number field of the browser.
That means it showed the little step buttons on the right and it stepped
through the values when the arrow keys were pressed — which is not what
you want in a form that is filled in with a keyboard.

It is now a plain field. The amount is written the way it is read:

| | |
| --- | --- |
| before | the browser's number field, with step buttons |
| now | a plain field with the number pad of the phone |

The year and the stock of a book keep their number field, but the step
buttons are taken away there as well.

### A field that does not hold a number is no longer saved as 0

This was a real trap. The old code turned the amount into a number with
`Number(value) || 0`, so a stray letter in the field became **0** — and 0
means "this book is free". A mistake in the field could quietly change the
value of a book.

Now only digits and one dot are accepted. Anything else is refused with a
message: *"The amount must be a number, 0 or more"*. The same holds for the
amount editor on the Books page.

### The books without an amount can be written into a list

This is the way out of the last dead end. When the amount of a book is in
no file of the software — it was never entered, and it is in no backup —
the amounts have to come from somewhere else. Now the app writes that
somewhere else for you:

1. **Export the books without an amount** — on the Books page, in the
   banner of the books that have no amount, or in **Settings → Backup**.
2. The list holds the ISBN, the title, the author and an empty `Amount`
   column. Open it in a spreadsheet and fill in the column.
3. Save the file and give it back with **Take the amounts from another
   file**.
4. The amounts are written into the books that belong to them.

The list is written the way a spreadsheet writes it, so a title with a comma
or a quote in it survives the round trip, and the Malayalam titles are shown
the way they are written.

### The version of the app is shown

At the bottom of the side bar: **Developed by Girish Kottayam · v1.0.8**.
When something does not work, the build on the computer can be named
instead of guessed.

### A message is no longer taken away by the message before it

Every message of the app sets a timer of three seconds. When a second
message came while the first one was still on the screen, the timer of the
first one took the second one away — so a message that said a number was
wrong could disappear before it was read.

## What to tell the library

The amounts of `library-backup-2026-11-12.db` are not in that file — that
was established in v1.0.7 and it has not changed: the file was written by
a version of the software before v1.0.3, and every one of its 1224 books
carries the column default, never a price that was typed in.

So the way the amounts get into the library is one of these:

1. **They are on this computer.** Install v1.0.8, open **Settings → Backup
   → Find the amounts again**. The software looks in the library and in the
   automatic backups and writes what it finds into the books. The panel says
   where the amounts came from.
2. **They are in another file.** **Take the amounts from another file** —
   a backup on the USB stick, an old copy of the library, or a price list
   from a spreadsheet.
3. **They are nowhere.** **Export the books without an amount** writes the
   list of the 1224 books. Fill in the Amount column of the list in your
   spreadsheet — you may still have the prices there — and give the file
   back. The amounts are written into the books, and every backup from then
   on holds them.

## Installers

| File | Size | SHA-256 |
| --- | --- | --- |
| `KPL_Setup_v1.0.8.exe` | 110,399,797 bytes | `75DB5ED859EACFD10A827582435FFB8C8AB5A282CE8EA3B340B49099021794DB` |
| `KPL_Portable_v1.0.8.exe` | 110,119,240 bytes | `8A905C76855599DBA16520EB4AA295325700C42B9ED5354831482B1C00D58B26` |

Both are unsigned; Windows SmartScreen asks for confirmation on first run.

## Upgrade notes

- Close the application before running the installer. The database stays at
  `%APPDATA%\kooroppada-library\db\library.db`.
- Automatic backups continue to be written to
  `%APPDATA%\kooroppada-library\db\backups`. Retention is unchanged
  (unlimited).
- Nothing about the database changes in this release. The list of the books
  without an amount is an ordinary CSV file, and it can be opened, filled in
  and given back with any spreadsheet.

## Repository

<https://github.com/gireeshkottayam/library-software>
