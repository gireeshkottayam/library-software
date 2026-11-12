; Public Library Kooroppada - custom NSIS installer behaviour.
;
; Two things the default electron-builder installer did not do:
;   1. It replaced an existing installation silently, with no hint that a
;      previous copy was found.
;   2. It exited immediately after copying files, with no page confirming that
;      setup had finished.
;
; This include adds both. It is referenced from package.json via
; "nsis": { "include": "build/installer.nsh" }.
;
; Only registers are used (no Var declarations) so the uninstaller pass, which
; never calls these macros, does not produce "variable never set" warnings.

; Runs inside .onInit, after initMultiUser has read the previous install
; location, and before any page is shown.
;   $0 = install folder found, $1 = version found, $2 = version text
!macro customInit
  StrCpy $0 ""
  StrCpy $1 ""
  StrCpy $2 ""

  ; Every installer from v1.0.1 onwards writes the install folder here.
  ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${If} $0 == ""
    ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${EndIf}

  ${If} $0 != ""
    ReadRegStr $1 HKCU "${UNINSTALL_REGISTRY_KEY}" DisplayVersion
    ${If} $1 == ""
      ReadRegStr $1 HKLM "${UNINSTALL_REGISTRY_KEY}" DisplayVersion
    ${EndIf}
    ${If} $1 == ""
      StrCpy $2 "an earlier version"
    ${Else}
      StrCpy $2 "version $1"
    ${EndIf}
    MessageBox MB_OK|MB_ICONINFORMATION "Public Library Kooroppada is already installed on this computer.$\r$\n$\r$\nFound: $2$\r$\nLocation: $0$\r$\n$\r$\nSetup will upgrade that installation in place. Your books, members, fees and settings will be kept." /SD IDOK
  ${ElseIf} ${FileExists} "$APPDATA\kooroppada-library\db\library.db"
    ; An older or portable copy left its database behind; the books are there.
    MessageBox MB_OK|MB_ICONINFORMATION "A Public Library Kooroppada library database was found on this computer.$\r$\n$\r$\nSetup will install the application and your books, members, fees and settings will be kept." /SD IDOK
  ${EndIf}
!macroend

; Replaces the default finish page so setup ends with an unmistakable
; confirmation instead of closing without a word.
; The launch code is inlined instead of using !insertmacro StartApp, because that
; macro declares "Var /GLOBAL startAppArgs" and the install section expands it a
; second time (NSIS aborts on a duplicated variable).
!macro customFinishPage
  Function StartApp
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${Else}
      StrCpy $1 ""
    ${EndIf}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  !define MUI_FINISHPAGE_TITLE "Installation completed successfully"
  !define MUI_FINISHPAGE_TEXT "Public Library Kooroppada ${VERSION} has been installed on this computer.$\r$\n$\r$\nYour books, members, fees and settings were kept.$\r$\n$\r$\nClick Finish to close Setup."
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_TEXT "Open Public Library Kooroppada now"
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
  !insertmacro MUI_PAGE_FINISH
!macroend
