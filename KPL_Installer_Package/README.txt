KPL Library Management System - v1.0.2
Public Library Kooroppada
=========================================

INSTALLATION INSTRUCTIONS
--------------------------

Option 1: Standard Installer (Recommended)
  Run: KPL_Setup_v1.0.2.exe
  This will install the software with a desktop shortcut.

Option 2: Portable Version
  Run: KPL_Portable_v1.0.2.exe
  No installation needed. Runs from any folder.

WHAT IS NEW IN v1.0.2
----------------------
* Author is now a selectable list in the Add Book form.
* A + button beside Author adds a new author from the same form.
* Similar author names are detected. Choose Merge into an existing
  author, or Keep both.
* Price entry is replaced by a manual Amount (INR) field.
* The Books list shows the saved amount instead of 0.

UPGRADE INSTRUCTIONS (IMPORTANT)
---------------------------------
If you already have the software installed:
  1. Close the library software BEFORE running the installer.
  2. Run KPL_Setup_v1.0.2.exe to upgrade.
  3. Your data and configurations will be PRESERVED automatically.
  4. DO NOT manually delete C:\Kooroppada_Library before upgrading.

ABOUT AMOUNTS ENTERED IN OLDER VERSIONS
---------------------------------------
Versions 1.0.0 and 1.0.1 did not save the price field, so existing
books show a dash (-) for Amount. Open each book, enter the amount,
and save to store it.

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
