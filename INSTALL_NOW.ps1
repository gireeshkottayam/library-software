$Desktop = [Environment]::GetFolderPath('Desktop')
$InstallDir = "C:\Kooroppada_Library"

Write-Host "--------------------------------------------------" -ForegroundColor Gray
Write-Host "✨ KOOROPPADA LIBRARY INSTALLER v1.0" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Gray

if (Test-Path $InstallDir) { 
    Write-Host "Cleaning previous installation..." -ForegroundColor Gray
    Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Extracting files to $InstallDir..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Set-Location $InstallDir
tar -xf "$PSScriptRoot\KPL_Software_v1.zip"

Write-Host "Creating Desktop Shortcut..." -ForegroundColor Yellow
$WsShell = New-Object -ComObject WScript.Shell
$Shortcut = $WsShell.CreateShortcut("$Desktop\Kooroppada Library.lnk")
$Shortcut.TargetPath = "$InstallDir\Public Library Kooroppada.exe"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.IconLocation = "$InstallDir\Public Library Kooroppada.exe,0"
$Shortcut.Save()

Write-Host "--------------------------------------------------"
Write-Host "✅ INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "Launching software..."
Start-Process "$InstallDir\Public Library Kooroppada.exe"
Write-Host "--------------------------------------------------"
Pause
