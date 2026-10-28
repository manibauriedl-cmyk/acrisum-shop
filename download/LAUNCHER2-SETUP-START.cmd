@echo off
REM Launcher 2 — Setup starten wenn Doppelklick „nichts tut“ (Test-PC / Kunde).
REM 1) Diese CMD in denselben Ordner wie launcher2-setup-2.0.3.exe legen, Doppelklick.
REM 2) Oder: Setup-EXE auf diese Datei ziehen (Drag & Drop).
chcp 65001 >nul
setlocal EnableExtensions

set "EXE=%~1"
if "%EXE%"=="" (
  for %%F in ("%~dp0launcher2-setup-*.exe") do set "EXE=%%~fF"
)
if not exist "%EXE%" (
  echo.
  echo Setup-EXE nicht gefunden.
  echo Bitte launcher2-setup-2.0.3.exe in diesen Ordner legen
  echo oder die EXE auf LAUNCHER2-SETUP-START.cmd ziehen.
  echo.
  pause
  exit /b 1
)

echo.
echo === Launcher 2 Setup-Start ===
echo Datei: %EXE%
echo.

echo Windows-Version:
ver
echo Prozessor: %PROCESSOR_ARCHITECTURE%
if /I not "%PROCESSOR_ARCHITECTURE%"=="AMD64" if /I not "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
  echo.
  echo ABBRUCH: Launcher 2 braucht Windows 64 Bit ^(AMD64 oder ARM64^).
  echo 32-Bit-Windows wird nicht unterstuetzt.
  echo.
  pause
  exit /b 2
)

echo.
echo Entsperre Download ^(Mark-of-the-Web / Entsperren-Kasten^)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '%EXE%' -ErrorAction SilentlyContinue; if (Test-Path -LiteralPath '%EXE%') { Get-Item -LiteralPath '%EXE%' | ForEach-Object { if ($_.Attributes -band [IO.FileAttributes]::ReadOnly) { $_.Attributes = $_.Attributes -band (-bnot [IO.FileAttributes]::ReadOnly) } } }"

set "LOG=%USERPROFILE%\Desktop\acrisum-setup.log"
if exist "%LOG%" del /f /q "%LOG%" >nul 2>&1

echo.
echo Starte Setup-Assistent — Log: %LOG%
echo Wenn eine BLAUE Meldung kommt: Weitere Informationen -^> Trotzdem ausfuehren.
echo.

start "" /wait "%EXE%" /LOG="%LOG%"
set "RC=%ERRORLEVEL%"

echo.
echo Setup beendet. Exit-Code: %RC%
if %RC% equ 0 (
  echo Installation laut Setup OK. Launcher 2 sollte im Startmenue stehen.
) else (
  echo Setup nicht fertig ^(Code %RC%^). Siehe Log auf dem Desktop.
)
if exist "%LOG%" (
  echo Log: %LOG%
) else (
  echo Kein Log — Windows hat das Setup vermutlich blockiert ^(Virenschutz^).
  echo Windows-Sicherheit -^> Virenschutz -^> Schutzverlauf pruefen.
)
echo.
pause
exit /b %RC%
