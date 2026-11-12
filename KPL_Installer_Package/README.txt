KPL Library Management System - v1.0.3
Public Library Kooroppada
=========================================

INSTALLATION INSTRUCTIONS
--------------------------

Option 1: Standard Installer (Recommended)
  Run: KPL_Setup_v1.0.3.exe
  The setup shows a few pages:
    - it tells you if a previous copy of the software is already on this
      computer (with its version and folder) and upgrades that copy in place;
    - you can confirm the installation folder;
    - at the end it shows "Installation completed successfully" and offers to
      open the software.
  A desktop shortcut is created.

Option 2: Portable Version
  Run: KPL_Portable_v1.0.3.exe
  No installation needed. Runs from any folder.

WHAT IS NEW IN v1.0.3
---------------------
* The installer now DETECTS a previous installation and says so before it
  replaces it. It upgrades in place, so you do not end up with two copies.
* The installer now CONFIRMS that it finished, with a clear
  "Installation completed successfully" page.
* Books that were added in 1.0.0 or 1.0.1 no longer show a wrong 0 amount.
  They show a "Set amount" button instead.
* A new "Set amounts" editor lets you type the amount for every book that
  still misses one. Press Enter to move to the next book.
* The Amount column now shows the amount, or "Free" for a book that is given
  away, or a "Set amount" button when the amount is not known yet.

UPGRADE INSTRUCTIONS (IMPORTANT)
---------------------------------
If you already have the software installed:
  1. Close the library software BEFORE running the installer.
  2. Run KPL_Setup_v1.0.3.exe to upgrade.
  3. The setup detects the installed copy and upgrades it in place.
  4. Your data and configurations will be PRESERVED automatically.
  5. DO NOT manually delete the installed folder before upgrading.

ABOUT AMOUNTS ENTERED IN OLDER VERSIONS
----------------------------------------
Versions 1.0.0 and 1.0.1 never saved the price field, so the original amounts
of those books cannot be recovered by the software. Version 1.0.3 marks them as
"amount not recorded" instead of showing a wrong 0, and gives you a quick
editor: open the Books page, press "Set amounts", type the amount of each book
and press Enter to go to the next one. Save once and the list shows the
amounts from then on.

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
