; Custom NSIS installer script for S3 Migration Scheduler

; Add custom installer pages and logic
!include MUI2.nsh
!include FileFunc.nsh

; Custom functions for the installer
!macro preInit
  ; Check if application is already running
  ${nsProcess::FindProcess} "S3 Migration Scheduler.exe" $R0
  ${If} $R0 = 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "S3 Migration Scheduler is currently running. Please close it before installing."
    Abort
  ${EndIf}
!macroend

; Custom page for prerequisites
Function CheckPrerequisites
  ; Check for Node.js (if needed for development builds)
  ReadRegStr $0 HKLM "SOFTWARE\Node.js" "InstallPath"
  ${If} $0 == ""
    ReadRegStr $0 HKCU "SOFTWARE\Node.js" "InstallPath"
  ${EndIf}
  
  ; Create application data directories
  CreateDirectory "$APPDATA\S3MigrationScheduler"
  CreateDirectory "$APPDATA\S3MigrationScheduler\data"
  CreateDirectory "$APPDATA\S3MigrationScheduler\logs"
  
  ; Set proper permissions
  AccessControl::GrantOnFile "$APPDATA\S3MigrationScheduler" "(S-1-5-32-545)" "FullAccess"
FunctionEnd

; Custom uninstaller functions
Function un.onInit
  ; Check if application is running before uninstall
  ${nsProcess::FindProcess} "S3 Migration Scheduler.exe" $R0
  ${If} $R0 = 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "S3 Migration Scheduler is currently running. Please close it before uninstalling."
    Abort
  ${EndIf}
FunctionEnd

; Post-install actions
Function PostInstall
  ; Create shortcuts
  CreateShortCut "$DESKTOP\S3 Migration Scheduler.lnk" "$INSTDIR\S3 Migration Scheduler.exe"
  CreateShortCut "$SMPROGRAMS\S3 Migration Scheduler.lnk" "$INSTDIR\S3 Migration Scheduler.exe"
  
  ; Add to Windows Firewall exceptions (if needed)
  ; ExecWait 'netsh advfirewall firewall add rule name="S3 Migration Scheduler" dir=in action=allow program="$INSTDIR\S3 Migration Scheduler.exe"'
  
  ; Register file associations (if needed)
  ; WriteRegStr HKCR ".s3migration" "" "S3MigrationFile"
  ; WriteRegStr HKCR "S3MigrationFile" "" "S3 Migration Configuration File"
  ; WriteRegStr HKCR "S3MigrationFile\DefaultIcon" "" "$INSTDIR\S3 Migration Scheduler.exe,0"
  ; WriteRegStr HKCR "S3MigrationFile\shell\open\command" "" '"$INSTDIR\S3 Migration Scheduler.exe" "%1"'
FunctionEnd

; Pre-uninstall actions
Function un.PreUninstall
  ; Ask about keeping user data
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to keep your migration data and settings?" IDYES keep_data IDNO remove_data
  
  remove_data:
    RMDir /r "$APPDATA\S3MigrationScheduler"
    Goto end_data_choice
  
  keep_data:
    DetailPrint "Keeping user data in $APPDATA\S3MigrationScheduler"
  
  end_data_choice:
  
  ; Remove shortcuts
  Delete "$DESKTOP\S3 Migration Scheduler.lnk"
  Delete "$SMPROGRAMS\S3 Migration Scheduler.lnk"
  
  ; Remove firewall rules (if added)
  ; ExecWait 'netsh advfirewall firewall delete rule name="S3 Migration Scheduler"'
  
  ; Remove file associations (if added)
  ; DeleteRegKey HKCR ".s3migration"
  ; DeleteRegKey HKCR "S3MigrationFile"
FunctionEnd

; Call our custom functions
!insertmacro MUI_CUSTOMFUNCTION_GUIINIT CheckPrerequisites
!insertmacro MUI_CUSTOMFUNCTION_INSTFILES_POST PostInstall
!insertmacro MUI_CUSTOMFUNCTION_UNGUIINIT un.PreUninstall