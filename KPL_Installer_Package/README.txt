KPL Library Management System - v1.0.4
Public Library Kooroppada
=========================================

INSTALLATION INSTRUCTIONS
--------------------------

Option 1: Standard Installer (Recommended)
  Run: KPL_Setup_v1.0.4.exe
  The setup shows a few pages:
    - it tells you if a previous copy of the software is already on this
      computer (with its version and folder) and upgrades that copy in place;
    - you can confirm the installation folder;
    - at the end it shows "Installation completed successfully" and offers to
      open the software.
  A desktop shortcut is created.

Option 2: Portable Version
  Run: KPL_Portable_v1.0.4.exe
  No installation needed. Runs from any folder.

WHAT IS NEW IN v1.0.4
---------------------
* RESTORING A BACKUP NOW WORKS. Before, the backup file was copied over the
  running database, and the old data came back when the app closed - the
  restore was lost without any message. The database is now closed first, the
  backup is put in place properly and the app restarts with the restored
  data.
* A BACKUP NOW HOLDS EVERYTHING. A backup that was taken right after you
  entered an amount now really contains that amount.
* A backup from an older version of the software can be restored again.
* A file that is not a library backup is refused instead of replacing your
  data, and a safety backup of your current data is taken before every
  restore.
* NEW: "Restore the newest automatic backup" on the Backup page in the
  Settings - one click back to the last automatic backup.
* The installer detects a previous installation and confirms that it finished
  (new in v1.0.3).
* Books whose amount was never stored show a "Set amount" button, and the
  "Set amounts" editor fills them in (new in v1.0.3).

UPGRADE INSTRUCTIONS (IMPORTANT)
---------------------------------
If you already have the software installed:
  1. Close the library software BEFORE running the installer.
  2. Run KPL_Setup_v1.0.4.exe to upgrade.
  3. The setup detects the installed copy and upgrades it in place.
  4. Your data and configurations will be PRESERVED automatically.
  5. DO NOT manually delete the installed folder before upgrading.

HOW TO RESTORE A BACKUP
------------------------
1. Close the software.
2. Open the software and go to Settings > Backup.
3. Press "Restore from Backup" and pick the backup file (.db) - for example
   the one on your USB drive.
4. Confirm. The software replaces the current data with the backup and
   restarts. The Books page then shows the books of the backup, with the
   amounts that were saved in it.
5. If the backup was taken with a version that did not save the price, those
   books show "Set amount" and you type the amounts in once with
   "Set amounts" on the Books page.

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
