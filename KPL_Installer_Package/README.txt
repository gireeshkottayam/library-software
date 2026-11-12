KPL Library Management System - v1.0.5
Public Library Kooroppada
=========================================

INSTALLATION INSTRUCTIONS
--------------------------

Option 1: Standard Installer (Recommended)
  Run: KPL_Setup_v1.0.5.exe
  The setup shows a few pages:
    - it tells you if a previous copy of the software is already on this
      computer (with its version and folder) and upgrades that copy in place;
    - you can confirm the installation folder;
    - at the end it shows "Installation completed successfully" and offers to
      open the software.
  A desktop shortcut is created.

Option 2: Portable Version
  Run: KPL_Portable_v1.0.5.exe
  No installation needed. Runs from any folder.

WHAT IS NEW IN v1.0.5
---------------------
* THE APP NOW SAYS WHAT A RESTORE DID. Before, the app restarted and the
  library simply looked different - with no explanation at all. Now it shows
  how many books came back, how many of them have no amount, and what to do
  about it.
* A RESTORE WARNS BEFORE IT REPLACES YOUR AMOUNTS. The confirmation tells
  you how many books the backup holds and how many of them have an amount.
  A backup that was taken with a version that never saved the price is
  recognised as such, so you are not surprised.
* THE BOOKS PAGE NAMES THE CAUSE. The banner says that the amount of these
  books was never stored, so it is neither in the database nor in the old
  backups - no restore can bring it back.
* ENTERING MANY AMOUNTS IS SAFE NOW. The amount editor shows how many books
  already have an amount, has a search field to find a book, and saves every
  amount right away when you leave the field or press Enter. A long session
  cannot lose the typing any more.

FROM v1.0.4
-----------
* Restoring a backup really replaces the data now. Before, the backup file
  was copied over the running database and the old data came back when the
  app closed - the restore was lost without any message.
* A backup now holds everything, a backup from an older version of the
  software can be restored again, a file that is not a library backup is
  refused, and a safety backup is taken before every restore.
* NEW in v1.0.3: the installer detects a previous installation and confirms
  that it finished. Books whose amount was never stored show a "Set amount"
  button, and the "Set amounts" editor fills them in.

UPGRADE INSTRUCTIONS (IMPORTANT)
---------------------------------
If you already have the software installed:
  1. Close the library software BEFORE running the installer.
  2. Run KPL_Setup_v1.0.5.exe to upgrade.
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
6. After the restart it shows what came back. If the books show "Set amount",
   the backup was taken with a version that never saved the price - the
   amounts are not inside the file. Type them in once with "Set amounts" on
   the Books page.

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
