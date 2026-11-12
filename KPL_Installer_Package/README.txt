KPL Library Management System - v1.0.7
Public Library Kooroppada
=========================================

INSTALLATION INSTRUCTIONS
--------------------------

Option 1: Standard Installer (Recommended)
  Run: KPL_Setup_v1.0.7.exe
  The setup shows a few pages:
    - it tells you if a previous copy of the software is already on this
      computer (with its version and folder) and upgrades that copy in place;
    - you can confirm the installation folder;
    - at the end it shows "Installation completed successfully" and offers to
      open the software.
  A desktop shortcut is created.

Option 2: Portable Version
  Run: KPL_Portable_v1.0.7.exe
  No installation needed. Runs from any folder.

WHAT IS NEW IN v1.0.7
---------------------
* FIND THE AMOUNTS AGAIN - WITHOUT RESTORING A BACKUP.
  A backup that was taken with an older version of the software holds no book
  amounts. When such a backup is restored, the software looks for the amounts
  that are still on this computer - in the library and in the automatic
  backups - and writes them into the books that have none.
  Until now this only happened WHILE a backup was restored. If your library
  was already replaced by a restore, the amounts could not be reached any
  more. Now you can do it at any time:
    Settings > Backup > "Find the amounts again"
  You do not have to restore anything, and nothing else changes.
  The panel tells you how many amounts were found, WHERE they came from and
  how many books still wait for one.
* TAKE THE AMOUNTS FROM ANOTHER FILE.
  If the prices are in a backup on a USB stick, in an old copy of the
  library or in a list you kept, use "Take the amounts from another file"
  in the same panel and pick that file. The software looks in it as well.
  Two kinds of files are read:
    - a library backup (.db)
    - a price list (.csv, .txt, .tsv) - one book per line, with the ISBN
      or the title of the book and its amount. The columns may be separated
      by a comma, a semicolon or a tab, and the first line may be a
      heading (ISBN, Title, Author, Amount).
  A file that cannot be read is skipped and does not stop the search.
* THE APP SAYS WHERE IT LOOKED. The report after a restore and the new panel
  name every place that supplied an amount, and say how many places were
  looked at.
* MORE OF THE AUTOMATIC BACKUPS ARE LOOKED AT: up to 1000 instead of 300.

FROM v1.0.6
-----------
* A restore brings the amounts back. A backup that was taken with a version
  that never saved the price holds no amounts, but they are still on the
  computer: the library that is replaced has them, and every automatic
  backup holds every amount that was ever entered. The software looks in
  both places and writes the amounts it finds into the books of the backup.
* A book is only given an amount when there is no doubt. A book is
  recognised by its number and title, by its ISBN, or by its title and
  author. A book that cannot be told apart from another one gets no
  amount, so a wrong amount can never be written.

FROM v1.0.5
-----------
* The app now says what a restore did. Before, the app restarted and the
  library simply looked different - with no explanation at all.
* A restore warns before it replaces your amounts: the confirmation tells
  you how many books the backup holds and how many of them have an amount.
* Entering many amounts is safe: the editor counts what is done, has a
  search field and saves every amount right away.

UPGRADE INSTRUCTIONS (IMPORTANT)
---------------------------------
If you already have the software installed:
  1. Close the library software BEFORE running the installer.
  2. Run KPL_Setup_v1.0.7.exe to upgrade.
  3. The setup detects the installed copy and upgrades it in place.
  4. Your data and configurations will be PRESERVED automatically.
  5. DO NOT manually delete the installed folder before upgrading.

HOW TO GET YOUR BOOK AMOUNTS BACK
---------------------------------
1. Open the software and go to Settings > Backup.
2. Press "Find the amounts again".
3. If it says that amounts were found, they are back - open the Books page.
4. If it says that nothing was found, press "Take the amounts from another
   file" and pick the file that holds your prices (a backup on the USB
   stick, or the copy of the library from before the restore).
5. Books that are still empty afterwards are the ones whose price was never
   entered and is in no file. Type those in once with "Set amounts" on the
   Books page.

HOW TO RESTORE A BACKUP
------------------------
1. Close the software.
2. Open the software and go to Settings > Backup.
3. Press "Restore from Backup" and pick the backup file (.db) - for example
   the one on your USB drive.
4. Read the warning. It says how many books the backup holds and how many of
   them have an amount. Press "Restore".
5. The software replaces the current data with the backup and restarts.
6. After the restart it shows what came back and how many amounts it found
   again. Only the books that still show "Set amount" need the price typed
   in once with "Set amounts" on the Books page.

DATABASE LOCATION
-----------------
Your library database is stored safely in:
  %APPDATA%\kooroppada-library\db\library.db

Automatic backups are written to:
  %APPDATA%\kooroppada-library\db\backups

This location is NEVER erased during upgrades.

SUPPORT
-------
Contact your system administrator for technical assistance.
