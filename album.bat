@echo off
setlocal

:: ============================================================
:: 家庭相册 启动/关闭脚本
:: 用法: album.bat start | stop | status | restart
::       或直接双击，选择操作
:: ============================================================

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "RUNTIME_DIR=%SCRIPT_DIR%\.runtime"
set "PID_FILE=%RUNTIME_DIR%\album.pid"
set "LOG_FILE=%RUNTIME_DIR%\album.log"
set "PORT=3000"

if not exist "%RUNTIME_DIR%" mkdir "%RUNTIME_DIR%"

:: ---- 无参数时显示菜单 ----
if "%~1"=="" goto MENU
if /I "%~1"=="start"   goto DO_START
if /I "%~1"=="stop"    goto DO_STOP
if /I "%~1"=="status"  goto DO_STATUS
if /I "%~1"=="restart" goto DO_RESTART
echo 用法: album.bat [start^|stop^|status^|restart]
echo 或直接双击 album.bat 打开菜单
pause
goto EOF

:MENU
cls
echo ============================================================
echo                   家庭相册 - 控制面板
echo ============================================================
call :CHECK_STATUS_QUIET
echo.
echo  [1] 启动相册
echo  [2] 停止相册
echo  [3] 查看状态
echo  [4] 重启相册
echo  [0] 退出
echo.
set "choice="
set /p "choice=请输入选项: "
if "%choice%"=="1" goto DO_START
if "%choice%"=="2" goto DO_STOP
if "%choice%"=="3" goto DO_STATUS
if "%choice%"=="4" goto DO_RESTART
if "%choice%"=="0" goto EOF
echo 无效选项，请重试
pause
goto MENU

:: ============================================================
:: 启动
:: ============================================================
:DO_START
call :IS_RUNNING
if %RUNNING%==1 (
    echo [album] 相册已在运行中
    if exist "%PID_FILE%" (
        set /p P=<"%PID_FILE%"
        echo [album] PID: !P!
    )
    echo [album] 地址: http://localhost:%PORT%
    goto PAUSE_EXIT
)

echo [album] 正在启动相册...

:: 写入后台启动脚本（避免嵌套引号问题）
(
    echo @echo off
    echo cd /d "%SCRIPT_DIR%"
    echo npm run dev 1^>"%LOG_FILE%" 2^>^&1
) > "%RUNTIME_DIR%\_run_album.bat"

start /B "" cmd /c "%RUNTIME_DIR%\_run_album.bat" >nul 2>&1

:: 等待端口就绪
echo [album] 等待服务就绪（最长 40 秒）...
call :WAIT_PORT 40
if %ERRORLEVEL%==0 (
    call :SAVE_PID
    echo [album] 相册已启动
    if exist "%PID_FILE%" (
        set /p P=<"%PID_FILE%"
        echo [album] PID: !P!
    )
    echo [album] 地址: http://localhost:%PORT%
) else (
    echo [album] 启动可能超时，请稍后访问 http://localhost:%PORT%
    echo [album] 或查看日志: %LOG_FILE%
)
goto PAUSE_EXIT

:: ============================================================
:: 停止
:: ============================================================
:DO_STOP
call :IS_RUNNING
if %RUNNING%==0 (
    echo [album] 相册未在运行
    goto PAUSE_EXIT
)

if exist "%PID_FILE%" (
    set /p P=<"%PID_FILE%"
    echo [album] 正在停止相册 (PID: !P!)...
    taskkill /PID !P! /T /F >nul 2>&1
)
del "%PID_FILE%" 2>nul
echo [album] 相册已停止
goto PAUSE_EXIT

:: ============================================================
:: 状态
:: ============================================================
:DO_STATUS
call :IS_RUNNING
if %RUNNING%==1 (
    echo [album] 相册运行中
    if exist "%PID_FILE%" (
        set /p P=<"%PID_FILE%"
        echo [album] PID: !P!
    )
    echo [album] 地址: http://localhost:%PORT%
) else (
    echo [album] 相册未运行
)
goto PAUSE_EXIT

:: ============================================================
:: 重启
:: ============================================================
:DO_RESTART
echo [album] 正在重启相册...

if exist "%PID_FILE%" (
    set /p P=<"%PID_FILE%"
    taskkill /PID !P! /T /F >nul 2>&1
    del "%PID_FILE%" 2>nul
)

(
    echo @echo off
    echo cd /d "%SCRIPT_DIR%"
    echo npm run dev 1^>"%LOG_FILE%" 2^>^&1
) > "%RUNTIME_DIR%\_run_album.bat"

start /B "" cmd /c "%RUNTIME_DIR%\_run_album.bat" >nul 2>&1

echo [album] 等待服务就绪...
call :WAIT_PORT 40
if %ERRORLEVEL%==0 (
    call :SAVE_PID
    echo [album] 相册已重启
    if exist "%PID_FILE%" (
        set /p P=<"%PID_FILE%"
        echo [album] PID: !P!
    )
    echo [album] 地址: http://localhost:%PORT%
) else (
    echo [album] 启动可能超时，请稍后访问 http://localhost:%PORT%
)
goto PAUSE_EXIT

:: ============================================================
:: 辅助子程序
:: ============================================================

:IS_RUNNING
    set "RUNNING=0"
    if not exist "%PID_FILE%" goto EOF
    set /p P=<"%PID_FILE%"
    tasklist /FI "PID eq !P!" 2>nul | find "!P!" >nul 2>&1
    if not errorlevel 1 set "RUNNING=1"
    goto EOF

:CHECK_STATUS_QUIET
    call :IS_RUNNING
    if %RUNNING%==1 (
        echo  当前状态: [运行中]  http://localhost:%PORT%
    ) else (
        echo  当前状态: [未运行]
    )
    goto EOF

:WAIT_PORT
    set "MAX=%~1"
    if "%MAX%"=="" set "MAX=30"
    set "N=0"
    :WAIT_LOOP
        curl -s -o nul http://localhost:%PORT% 2>nul
        if not errorlevel 1 exit /b 0
        timeout /t 1 /nobreak >nul
        set /a "N+=1"
        if !N! LSS %MAX% goto WAIT_LOOP
    exit /b 1

:SAVE_PID
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%.*LISTENING"') do (
        echo %%a > "%PID_FILE%"
        exit /b 0
    )
    goto EOF

:PAUSE_EXIT
    if "%~1"=="" pause
    goto EOF

:EOF
