@echo off
REM Schreibt ein Protokoll auf diesen Stick/Ordner UND auf den Desktop.
REM Kein Abschreiben. Datei acrisum-protokoll.txt mitnehmen oder mailen.
chcp 65001 >nul
setlocal EnableExtensions
set "STAMP=%DATE% %TIME%"
set "OUT=%~dp0acrisum-protokoll.txt"
set "DESK=%USERPROFILE%\Desktop\acrisum-protokoll.txt"

set "ROOT=%LOCALAPPDATA%\Programs\Launcher2"
if not exist "%ROOT%\launcher2.py" if exist "%~dp0launcher2.py" set "ROOT=%~dp0"
if not exist "%ROOT%\launcher2.py" if exist "%~dp0Launcher2\launcher2.py" set "ROOT=%~dp0Launcher2"

call :kopf "%OUT%"
if not "%OUT%"=="%DESK%" call :kopf "%DESK%"

call :sammeln "%OUT%"
if exist "%DESK%" if /I not "%OUT%"=="%DESK%" copy /Y "%OUT%" "%DESK%" >nul 2>&1

echo.
echo Fertig. Nichts abschreiben.
echo Datei:
echo   %OUT%
if exist "%DESK%" echo   %DESK%
echo Stick/Datei mitnehmen oder an manibauriedl@gmail.com schicken.
echo.
pause
exit /b 0

:kopf
echo Acrisum-Protokoll %STAMP%> "%~1"
echo Computer: %COMPUTERNAME%  Benutzer: %USERNAME%>> "%~1"
echo.>> "%~1"
goto :eof

:sammeln
set "L=%~1"
echo ===== Windows =====>> "%L%"
ver >> "%L%" 2>&1
echo PROCESSOR_ARCHITECTURE=%PROCESSOR_ARCHITECTURE%>> "%L%"
echo.>> "%L%"

echo ===== Installationsordner =====>> "%L%"
echo ROOT=%ROOT%>> "%L%"
if exist "%ROOT%\launcher2.py" (
  echo launcher2.py: da>> "%L%"
) else (
  echo launcher2.py: FEHLT>> "%L%"
)
if exist "%ROOT%\VERSION" type "%ROOT%\VERSION" >> "%L%" 2>&1
if exist "%ROOT%\python\python.exe" (
  echo python.exe: da>> "%L%"
) else (
  echo python.exe: FEHLT>> "%L%"
)
if exist "%ROOT%\python\pythonw.exe" (echo pythonw.exe: da>> "%L%") else (echo pythonw.exe: FEHLT>> "%L%")
echo.>> "%L%"

echo ===== Programme / AppData =====>> "%L%"
dir /b "%LOCALAPPDATA%\Programs\Launcher2" >> "%L%" 2>&1
echo.>> "%L%"
if exist "%APPDATA%\Launcher2" (
  dir /b "%APPDATA%\Launcher2" >> "%L%" 2>&1
) else (
  echo %%APPDATA%%\Launcher2: fehlt>> "%L%"
)
echo.>> "%L%"

set "PY=%ROOT%\python\python.exe"
if not exist "%PY%" (
  echo Python nicht gefunden — Setup ist nicht durchgekommen.>> "%L%"
  goto :eof
)

echo ===== Python-Version =====>> "%L%"
"%PY%" -c "import sys; print(sys.version)" >> "%L%" 2>&1
echo.>> "%L%"

echo ===== tkinter =====>> "%L%"
"%PY%" -c "import tkinter; print('tkinter', tkinter.TkVersion)" >> "%L%" 2>&1
echo.>> "%L%"

echo ===== Import launcher2 (ohne Fenster) =====>> "%L%"
pushd "%ROOT%"
"%PY%" -c "import launcher2; print('import launcher2: ok')" >> "%L%" 2>&1
popd
echo.>> "%L%"
echo ===== Ende =====>> "%L%"
goto :eof
