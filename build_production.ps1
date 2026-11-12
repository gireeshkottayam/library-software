# build_production.ps1
# Master Build Pipeline for Public Library Kooroppada v1.0.0

$ReleaseDir = "D:\Kooroppada Library\RELEASE_V1.0.0"
if (Test-Path $ReleaseDir) { Remove-Item -Path $ReleaseDir -Recurse -Force }
New-Item -ItemType Directory -Path $ReleaseDir

Write-Host "--------------------------------------------------" -ForegroundColor Gray
Write-Host "🚀 KPL PRODUCTION BUILD PIPELINE v1.0" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Gray

# 1. Build Main Library Software
Write-Host "[1/3] Packaging Main Library Software..." -ForegroundColor Yellow
Set-Location "D:\Kooroppada Library\software"
npm run package
if ($LASTEXITCODE -ne 0) { Write-Error "Main App Build Failed"; exit }
Copy-Item -Path "dist\win-unpacked" -Destination "$ReleaseDir\Library_Management" -Recurse

# 2. Build License Key Generator
Write-Host "[2/3] Packaging License Key Generator..." -ForegroundColor Yellow
Set-Location "D:\Kooroppada Library\License_Keygen_App"
npm run package
if ($LASTEXITCODE -ne 0) { Write-Error "Keygen Build Failed"; exit }
Copy-Item -Path "dist\win-unpacked" -Destination "$ReleaseDir\Admin_Tools\Keygen" -Recurse

# 3. Finalize & Add Deployment Tools
Write-Host "[3/3] Generating Release Package..." -ForegroundColor Yellow

$Instructions = @"
PUBLIC LIBRARY KOOROPPADA - PRODUCTION RELEASE v1.0
==================================================

INSTRUCTIONS FOR LIBRARIAN:
1. Copy this entire 'RELEASE_V1.0.0' folder to the Library Computer.
2. Right-click 'Install_Shortcuts.ps1' and select 'Run with PowerShell'.
3. Use 'Kooroppada Library' shortcut on Desktop to start the software.

INSTRUCTIONS FOR ADMIN:
- The 'Admin_Tools' folder contains the License Generator.
- Keep 'Admin_Tools' strictly for library management use.
"@
$Instructions | Out-File -FilePath "$ReleaseDir\READ_ME_FIRST.txt" -Encoding utf8

$DeployScript = @"
`$Desktop = [Environment]::GetFolderPath('Desktop')
`$WsShell = New-Object -ComObject WScript.Shell
`$Shortcut = `$WsShell.CreateShortcut("`$Desktop\Kooroppada Library.lnk")
`$Shortcut.TargetPath = "`$PSScriptRoot\Library_Management\Public Library Kooroppada.exe"
`$Shortcut.WorkingDirectory = "`$PSScriptRoot\Library_Management"
`$Shortcut.IconLocation = "`$PSScriptRoot\Library_Management\Public Library Kooroppada.exe,0"
`$Shortcut.Save()

Write-Host "--------------------------------------------------"
Write-Host "✅ SUCCESS: Kooroppada Library Installed!" -ForegroundColor Green
Write-Host "Desktop shortcut has been created."
Write-Host "--------------------------------------------------"
Pause
"@
$DeployScript | Out-File -FilePath "$ReleaseDir\Install_Shortcuts.ps1" -Encoding utf8

# ─── Organize Distribution Package (KPL_Installer_Package) ────────────────────
$RootDir = "D:\Kooroppada Library"
$AppSourceDir = "D:\Kooroppada Library\software\dist\win-unpacked"
$InstallerPackage = "$RootDir\KPL_Installer_Package"

# 1. Update the 'Data' folder inside KPL_Installer_Package
Write-Host "[4/4] Updating KPL_Installer_Package for distribution..." -ForegroundColor Yellow
if (Test-Path "$InstallerPackage\Data") { Remove-Item "$InstallerPackage\Data" -Recurse -Force }
New-Item -ItemType Directory -Path "$InstallerPackage\Data" -Force | Out-Null
Copy-Item -Path "$AppSourceDir\*" -Destination "$InstallerPackage\Data" -Recurse -Force

# 2. Sync binaries to KPL_Installer_Package (Ensure Setup/Uninstall/Icon are present)
Copy-Item -Path "$RootDir\Setup.exe" -Destination "$InstallerPackage\Setup.exe" -Force
Copy-Item -Path "$RootDir\Uninstall.exe" -Destination "$InstallerPackage\Uninstall.exe" -Force
if (Test-Path "$RootDir\icon.ico") { Copy-Item -Path "$RootDir\icon.ico" -Destination "$InstallerPackage\icon.ico" -Force }

# 3. Maintain root Data\ for local convenience (Optional but helpful)
if (Test-Path "$RootDir\Data") { Remove-Item "$RootDir\Data" -Recurse -Force }
New-Item -ItemType Directory -Path "$RootDir\Data" -Force | Out-Null
Copy-Item -Path "$AppSourceDir\*" -Destination "$RootDir\Data" -Recurse -Force

Write-Host "✅ KPL_Installer_Package is now ready for distribution!" -ForegroundColor Green
Write-Host "✅ Root Data\ updated for local Setup.exe" -ForegroundColor Green

Write-Host "--------------------------------------------------" -ForegroundColor Gray
Write-Host "✨ PRODUCTION RELEASE READY!" -ForegroundColor Green
Write-Host "Location: $InstallerPackage" -ForegroundColor White
Write-Host "--------------------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "  ► ZIP this folder to send to your client: $InstallerPackage" -ForegroundColor Cyan
Write-Host "  ► To test locally, run: $InstallerPackage\Setup.exe" -ForegroundColor Cyan
Write-Host ""
