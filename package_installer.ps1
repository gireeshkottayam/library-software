$OutDir = "D:\Kooroppada Library\KPL_Installer_Package"
$DistDir = "D:\Kooroppada Library\software\dist"
$BaseDir = "D:\Kooroppada Library"

# Clean up previous package
if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
New-Item -ItemType Directory -Path $OutDir | Out-Null

Write-Host "Copying installers..." -ForegroundColor Cyan

# Copy NSIS installer (standard)
Copy-Item "$DistDir\Public Library Kooroppada Setup 1.0.0.exe" -Destination "$OutDir\KPL_Setup_v1.0.0.exe" -Force
Write-Host "  + KPL_Setup_v1.0.0.exe" -ForegroundColor Green

# Copy Portable version
Copy-Item "$DistDir\Public Library Kooroppada 1.0.0.exe" -Destination "$OutDir\KPL_Portable_v1.0.0.exe" -Force
Write-Host "  + KPL_Portable_v1.0.0.exe" -ForegroundColor Green

# Copy compiled custom Setup.exe (safe C# installer)
if (Test-Path "$BaseDir\Setup.exe") {
    Copy-Item "$BaseDir\Setup.exe" -Destination "$OutDir\Setup.exe" -Force
    Write-Host "  + Setup.exe" -ForegroundColor Green
}

# Copy Uninstall.exe
if (Test-Path "$BaseDir\Uninstall.exe") {
    Copy-Item "$BaseDir\Uninstall.exe" -Destination "$OutDir\Uninstall.exe" -Force
    Write-Host "  + Uninstall.exe" -ForegroundColor Green
}

# Copy icon
if (Test-Path "$DistDir\icon.ico") {
    Copy-Item "$DistDir\icon.ico" -Destination "$OutDir\icon.ico" -Force
    Write-Host "  + icon.ico" -ForegroundColor Green
}

# Write README
$readme = @"
KPL Library Management System - v1.0.0
Public Library Kooroppada
=========================================

INSTALLATION INSTRUCTIONS
--------------------------

Option 1: Standard Installer (Recommended)
  Run: KPL_Setup_v1.0.0.exe
  This will install the software with a desktop shortcut.

Option 2: Portable Version
  Run: KPL_Portable_v1.0.0.exe
  No installation needed. Runs from any folder.

UPGRADE INSTRUCTIONS (IMPORTANT)
---------------------------------
If you already have the software installed:
  1. Close the library software BEFORE running the installer.
  2. Run KPL_Setup_v1.0.0.exe to upgrade.
  3. Your data and configurations will be PRESERVED automatically.
  4. DO NOT manually delete C:\Kooroppada_Library before upgrading.

DATABASE LOCATION
-----------------
Your library database is stored safely in:
  %APPDATA%\kooroppada-library\db\library.db

This location is NEVER erased during upgrades.

SUPPORT
-------
Contact your system administrator for technical assistance.
"@

$readme | Out-File -FilePath "$OutDir\README.txt" -Encoding utf8
Write-Host "  + README.txt" -ForegroundColor Green

Write-Host ""
Write-Host "Package Contents:" -ForegroundColor Yellow
Get-ChildItem $OutDir | ForEach-Object {
    $sizeMB = if ($_.PSIsContainer) { "DIR" } else { "{0:N2} MB" -f ($_.Length / 1MB) }
    Write-Host ("  {0,-50} {1}" -f $_.Name, $sizeMB)
}

Write-Host ""
Write-Host "SUCCESS! KPL_Installer_Package is ready at:" -ForegroundColor Green
Write-Host "  $OutDir" -ForegroundColor White
