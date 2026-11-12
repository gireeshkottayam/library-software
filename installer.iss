; Public Library Kooroppada - Professional Installer Script
; Optimized for Windows 10/11

#define MyAppName "Public Library Kooroppada"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Public Library Kooroppada"
#define MyAppExeName "Public Library Kooroppada.exe"
#define MyAppID "{A98B7C6E-5D4F-4B3A-9210-C8D7E6F5A4B3}"

[Setup]
AppId={{#MyAppID}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
; UI Customization
WizardStyle=modern
Compression=lzma2/ultra64
InternalCompressLevel=ultra
SolidCompression=yes
; Metadata
UninstallDisplayIcon={app}\{#MyAppExeName}
SetupIconFile=D:\Kooroppada Library\software\public\icon.ico
OutputDir=D:\Kooroppada Library\INSTALLERS
OutputBaseFilename=KPL_Library_Setup_v1.0
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Source files from the release folder
Source: "D:\Kooroppada Library\software\release\Public Library Kooroppada-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Code]
// Logic for modern look and logging can be added here if needed
