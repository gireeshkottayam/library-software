$PackageDir = "D:\Kooroppada Library\KPL_Installer_Package"
$ZipPath = "D:\Kooroppada Library\KPL_Installer_Package.zip"

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

Write-Host "Creating ZIP archive..." -ForegroundColor Cyan
Compress-Archive -Path "$PackageDir\*" -DestinationPath $ZipPath

$item = Get-Item $ZipPath
$sizeMB = [math]::Round($item.Length / 1MB)
Write-Host "ZIP created successfully!" -ForegroundColor Green
Write-Host "File: $ZipPath" -ForegroundColor White
Write-Host "Size: $sizeMB MB" -ForegroundColor Yellow
