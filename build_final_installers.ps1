# build_final_installers.ps1
# Senior Engineer Build & Release Pipeline v2.0

$ErrorActionPreference = "Stop"
$StartTime = Get-Date

# Paths
$BaseDir = "D:\Kooroppada Library"
$InstallersDir = "$BaseDir\INSTALLERS"
$LogFile = "$BaseDir\build_log.txt"

function Write-Log($msg, $color = "White") {
    $timestamp = Get-Date -Format "HH:mm:ss"
    $line = "[$timestamp] $msg"
    Write-Host $line -ForegroundColor $color
    $line | Out-File -FilePath $LogFile -Append
}

# Initialize
if (Test-Path $InstallersDir) { Remove-Item $InstallersDir -Recurse -Force }
New-Item -ItemType Directory -Path $InstallersDir | Out-Null
"--- Build Started at $StartTime ---" | Out-File -FilePath $LogFile

Write-Log "🚀 Starting Full Automated Build Pipeline..." "Cyan"

try {
    # 1. Main App Package
    Write-Log "[1/4] Packaging Main App (Electron)..." "Yellow"
    Set-Location "$BaseDir\software"
    npm run package | Out-Null
    
    # 2. Keygen Package
    Write-Log "[2/4] Packaging License Generator..." "Yellow"
    Set-Location "$BaseDir\License_Keygen_App"
    npm run package | Out-Null

    # 3. Compile Installers (Requires Inno Setup installed)
    Write-Log "[3/4] Compiling Windows Installers (.exe)..." "Yellow"
    $ISCC = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    
    if (Test-Path $ISCC) {
        Write-Log "Found Inno Setup Compiler. Compiling..." "Green"
        & $ISCC "$BaseDir\installer.iss" | Out-File -FilePath $LogFile -Append
        & $ISCC "$BaseDir\keygen_installer.iss" | Out-File -FilePath $LogFile -Append
        Write-Log "✅ Installers generated successfully in /INSTALLERS" "Green"
    } else {
        Write-Log "⚠️ Inno Setup (ISCC.exe) not found at $ISCC" "Red"
        Write-Log "Please install Inno Setup 6 (https://jrsoftware.org/isdl.php) to finish the build." "White"
    }

    # 4. Finalize
    Write-Log "[4/4] Finalizing Build..." "Yellow"
    $Duration = (Get-Date) - $StartTime
    Write-Log "✨ PIPELINE COMPLETED in $($Duration.TotalSeconds.ToString("F1"))s" "Green"
    
} catch {
    Write-Log "❌ FATAL ERROR: $($_.Exception.Message)" "Red"
    exit 1
}
