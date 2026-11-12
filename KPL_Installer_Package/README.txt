KPL Library Management System - v1.0.6
Public Library Kooroppada
=========================================

INSTALLATION INSTRUCTIONS
--------------------------

Option 1: Standard Installer (Recommended)
  Run: KPL_Setup_v1.0.6.exe
  The setup shows a few pages:
    - it tells you if a previous copy of the software is already on this
      computer (with its version and folder) and upgrades that copy in place;
    - you can confirm the installation folder;
    - at the end it shows "Installation completed successfully" and offers to
      open the software.
  A desktop shortcut is created.

Option 2: Portable Version
  Run: KPL_Portable_v1.0.6.exe
  No installation needed. Runs from any folder.

WHAT IS NEW IN v1.0.6
---------------------
* THE AMOUNTS COME BACK BY THEMSELVES WHEN YOU RESTORE A BACKUP.
  A backup that was taken with an older version of the software holds no
  book amounts - that version never saved the price. Restoring it used to
  leave every book showing "Set amount", so you had to type all of them
  again.
  Now the software looks for the amounts that are still on this computer:
    - the library that was replaced by the restore,
    - your automatic backups - one backup is written on every change, so
      every amount you ever entered is in one of them.
  The amounts that are found are written back into the books of the backup,
  and the Books page shows them right away. You do not type them again.
* A BOOK ONLY GETS AN AMOUNT WHEN THERE IS NO DOUBT. A book is recognised
  by its number and title, by its ISBN, or by its title and author. A book
  that cannot be told apart from another one gets no amount, so a wrong
  amount can never be written.
* THE APP SAYS HOW MANY AMOUNTS IT FOUND. After the restart it shows how
  many amounts were found and written back, and how many books still wait
  for one. The confirmation before the restore says the same.
* ONLY THE BOOKS THAT WERE NOWHERE TO BE FOUND ARE LEFT. The Books page
  lists those books under "Set amounts". Everything else has its amount.

FROM v1.0.5
-----------
* The app now says what a restore did. Before, the app restarted and the
  library simply looked different - with no explanation at all.
* A restore warns before it replaces your amounts: the confirmation tells
  you how many books the backup holds and how many of them have an amount.
* Entering many amounts is safe: the editor counts what is done, has a
  search field and saves every amount right away.

FROM v1.0.4
-----------
* Restoring a backup really replaces the data now. Before, the backup file
  was copied over the running database and the old data came back when the
  app closed - the restore was lost without any message.
* A backup now holds everything, a backup from an older version of the
  software can be restored again, a file that is not a library backup is
  refused, and a safety backup is taken before every restore.

UPGRADE INSTRUCTIONS (IMPORTANT)
---------------------------------
If you already have the software installed:
  1. Close the library software BEFORE running the installer.
  2. Run KPL_Setup_v1.0.6.exe to upgrade.
  3. The setup detects the installed copy and upgrades it in place.
  4. Your data and configurations will be PRESERVED automatically.
  5. DO NOT manually delete the installed folder before upgrading.

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
