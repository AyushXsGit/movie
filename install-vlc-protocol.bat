@echo off
setlocal

set "VLC="
if exist "%ProgramFiles%\VideoLAN\VLC\vlc.exe" set "VLC=%ProgramFiles%\VideoLAN\VLC\vlc.exe"
if not defined VLC if exist "%ProgramFiles(x86)%\VideoLAN\VLC\vlc.exe" set "VLC=%ProgramFiles(x86)%\VideoLAN\VLC\vlc.exe"
if not defined VLC if exist "%LocalAppData%\Programs\VideoLAN\VLC\vlc.exe" set "VLC=%LocalAppData%\Programs\VideoLAN\VLC\vlc.exe"

if not defined VLC (
  echo.
  echo VLC was not found on this PC.
  echo Install VLC first, then run this file again.
  echo.
  pause
  exit /b 1
)

set "DIR=%LocalAppData%\MovieHub"
if not exist "%DIR%" mkdir "%DIR%"
copy /Y "%~dp0open-vlc.ps1" "%DIR%\open-vlc.ps1" >nul

REM Register a dedicated MovieHub URL protocol for the current Windows user.
REM This is required because a normal webpage cannot execute VLC.exe directly.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$k='HKCU:\Software\Classes\moviehub-vlc'; New-Item -Path $k -Force | Out-Null; New-ItemProperty -Path $k -Name '(default)' -Value 'URL:MovieHub VLC Protocol' -PropertyType String -Force | Out-Null; New-ItemProperty -Path $k -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null; $c=$k+'\shell\open\command'; New-Item -Path $c -Force | Out-Null; $cmd='powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+$env:LOCALAPPDATA+'\MovieHub\open-vlc.ps1" "%%1"'; New-ItemProperty -Path $c -Name '(default)' -Value $cmd -PropertyType String -Force | Out-Null"

if errorlevel 1 (
  echo.
  echo Could not register the MovieHub VLC protocol.
  echo Try running this file again.
  echo.
  pause
  exit /b 1
)

echo.
echo MovieHub VLC launcher installed successfully.
echo Close and reopen Chrome, then use the VLC button.
echo If Chrome asks to open MovieHub VLC, choose Open/Allow.
echo.
pause
