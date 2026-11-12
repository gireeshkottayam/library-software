# create_setup.ps1
# Senior Engineer Custom Setup Generator (Fixed)

$AppDir = "D:\Kooroppada Library\software\release\Public Library Kooroppada-win32-x64"
$OutDir = "D:\Kooroppada Library"

Write-Host "🚀 Engineering your Professional Setup Package..." -ForegroundColor Cyan

# 1. Create High-Speed Archive
Write-Host "📦 Compressing 400MB into a high-speed archive..." -ForegroundColor Yellow
$ZipPath = "$OutDir\KPL_Software_v1.zip"
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
# Use tar for speed
Set-Location $AppDir
tar -acf $ZipPath *

# 2. Create the Setup Script
Write-Host "🛠 Generating Setup Logic..." -ForegroundColor Yellow
$SetupScript = @'
$Desktop = [Environment]::GetFolderPath('Desktop')
$InstallDir = "C:\Kooroppada_Library"

Write-Host "--------------------------------------------------" -ForegroundColor Gray
Write-Host "✨ KOOROPPADA LIBRARY INSTALLER v1.0" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Gray

# Safety check: ensure software is not running
$AppProcess = Get-Process -Name "Public Library Kooroppada" -ErrorAction SilentlyContinue
if ($AppProcess) {
    Write-Host "⚠️ Warning: The library software is currently running." -ForegroundColor Yellow
    Write-Host "Please close the application and then press Enter to try installing again." -ForegroundColor Red
    Pause
    exit
}

# Backup database if it exists anywhere in the installation directory
$LegacyDb1 = "$InstallDir\resources\db\library.db"
$LegacyDb2 = "$InstallDir\db\library.db"
$TempDb = [System.IO.Path]::GetTempFileName()
$HasOldDb = $false

if (Test-Path $LegacyDb1) {
    Copy-Item $LegacyDb1 -Destination $TempDb -Force
    $HasOldDb = $true
} elseif (Test-Path $LegacyDb2) {
    Copy-Item $LegacyDb2 -Destination $TempDb -Force
    $HasOldDb = $true
}

# Ensure destination exists
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "Extracting files to $InstallDir..." -ForegroundColor Yellow
Set-Location $InstallDir
tar -xf "$PSScriptRoot\KPL_Software_v1.zip"

# Restore database to both legacy locations and AppData (to guarantee data safety and migration)
if ($HasOldDb) {
    Write-Host "Restoring existing database configurations..." -ForegroundColor Green
    
    # 1. Restore to AppData persistent storage
    $AppDataDbDir = "$env:APPDATA\kooroppada-library\db"
    if (!(Test-Path $AppDataDbDir)) {
        New-Item -ItemType Directory -Path $AppDataDbDir -Force | Out-Null
    }
    if (!(Test-Path "$AppDataDbDir\library.db")) {
        Copy-Item $TempDb -Destination "$AppDataDbDir\library.db" -Force
    }

    # 2. Restore to legacy location
    $LegacyDbDir = "$InstallDir\resources\db"
    if (!(Test-Path $LegacyDbDir)) {
        New-Item -ItemType Directory -Path $LegacyDbDir -Force | Out-Null
    }
    Copy-Item $TempDb -Destination "$LegacyDbDir\library.db" -Force

    Remove-Item $TempDb -Force
}

Write-Host "Creating Desktop Shortcut..." -ForegroundColor Yellow
$WsShell = New-Object -ComObject WScript.Shell
$Shortcut = $WsShell.CreateShortcut("$Desktop\Kooroppada Library.lnk")
$Shortcut.TargetPath = "$InstallDir\Public Library Kooroppada.exe"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.IconLocation = "$InstallDir\Public Library Kooroppada.exe,0"
$Shortcut.Save()

Write-Host "✅ INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "Launching software..."
Start-Process "$InstallDir\Public Library Kooroppada.exe"
Pause
'@

$SetupScript | Out-File -FilePath "$OutDir\INSTALL_NOW.ps1" -Encoding utf8

# 3. Create a Launcher .bat so the client doesn't need to know PowerShell
$Launcher = "@echo off`ntitle KPL Setup`npowershell -ExecutionPolicy Bypass -File `"%~dp0INSTALL_NOW.ps1`"`npause"
$Launcher | Out-File -FilePath "$OutDir\CLICK_TO_INSTALL.bat" -Encoding ascii

Write-Host "--------------------------------------------------" -ForegroundColor Gray
Write-Host "✨ SUCCESS! Release Package Ready." -ForegroundColor Green
Write-Host "FOLDER: $OutDir" -ForegroundColor White
Write-Host "SEND THESE TO CLIENT: KPL_Software_v1.zip, INSTALL_NOW.ps1, CLICK_TO_INSTALL.bat" -ForegroundColor Yellow
Write-Host "--------------------------------------------------" -ForegroundColor Gray

