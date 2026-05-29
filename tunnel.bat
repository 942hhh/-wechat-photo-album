@echo off
setlocal

:: ============================================================
:: 内网穿透 启动/关闭脚本 (Cloudflare Tunnel)
:: 用法: tunnel.bat start | stop | status
::       或直接双击，选择操作
:: ============================================================

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "RUNTIME_DIR=%SCRIPT_DIR%\.runtime"
set "PID_FILE=%RUNTIME_DIR%\tunnel.pid"
set "URL_FILE=%RUNTIME_DIR%\tunnel.url"
set "LOG_FILE=%RUNTIME_DIR%\tunnel.log"
set "CLOUDFLARED=%SCRIPT_DIR%\cloudflared.exe"
set "PORT=3000"

if not exist "%RUNTIME_DIR%" mkdir "%RUNTIME_DIR%"

:: ---- 无参数时显示菜单 ----
if "%~1"=="" goto MENU
if /I "%~1"=="start"  goto DO_START
if /I "%~1"=="stop"   goto DO_STOP
if /I "%~1"=="status" goto DO_STATUS
echo 用法: tunnel.bat [start^|stop^|status]
echo 或直接双击 tunnel.bat 打开菜单
pause
goto EOF

:MENU
cls
echo ============================================================
echo                 内网穿透 - 控制面板
echo ============================================================
call :CHECK_STATUS_QUIET
if exist "%URL_FILE%" (
    set /p U=<"%URL_FILE%"
    echo  域名: !U!
)
echo.
echo  [1] 启动隧道
echo  [2] 停止隧道
echo  [3] 查看状态
echo  [0] 退出
echo.
set "choice="
set /p "choice=请输入选项: "
if "%choice%"=="1" goto DO_START
if "%choice%"=="2" goto DO_STOP
if "%choice%"=="3" goto DO_STATUS
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
    echo [tunnel] 隧道已在运行中
    if exist "%URL_FILE%" (
        set /p U=<"%URL_FILE%"
        echo [tunnel] 域名: !U!
    )
    goto PAUSE_EXIT
)

if not exist "%CLOUDFLARED%" (
    echo [tunnel] 错误: 未找到 cloudflared.exe
    echo [tunnel] 请确保 cloudflared.exe 位于:
    echo [tunnel]   %CLOUDFLARED%
    goto PAUSE_EXIT
)

:: 检查相册状态
curl -s -o nul http://localhost:%PORT% 2>nul
if errorlevel 1 (
    echo [tunnel] ========================================
    echo [tunnel]  警告: 相册 (localhost:%PORT%) 未启动
    echo [tunnel]  隧道可以建立，但访问时会无法连接
    echo [tunnel] ========================================
    set /p "ans=是否继续？[y/N] "
    if /I not "!ans!"=="y" (
        echo [tunnel] 已取消
        goto PAUSE_EXIT
    )
)

echo [tunnel] 正在启动 Cloudflare Tunnel...

:: 写入后台启动脚本
(
    echo @echo off
    echo cd /d "%SCRIPT_DIR%"
    echo "%CLOUDFLARED%" tunnel --url http://localhost:%PORT% 1^>"%LOG_FILE%" 2^>^&1
) > "%RUNTIME_DIR%\_run_tunnel.bat"

start /B "" cmd /c "%RUNTIME_DIR%\_run_tunnel.bat" >nul 2>&1

:: 等待域名出现
echo [tunnel] 正在获取域名...
call :WAIT_URL 20
if %ERRORLEVEL%==0 (
    call :SAVE_PID
    echo [tunnel] ==========================================
    set /p U=<"%URL_FILE%"
    echo [tunnel]  域名: !U!
    echo [tunnel] ==========================================
    echo [tunnel] 隧道已建立
) else (
    echo [tunnel] 隧道已启动，但暂未获取到域名
    echo [tunnel] 请稍后运行 tunnel.bat status 查看
    call :SAVE_PID
)
goto PAUSE_EXIT

:: ============================================================
:: 停止
:: ============================================================
:DO_STOP
call :IS_RUNNING
if %RUNNING%==0 (
    echo [tunnel] 隧道未在运行
    goto PAUSE_EXIT
)

if exist "%PID_FILE%" (
    set /p P=<"%PID_FILE%"
    echo [tunnel] 正在关闭隧道 (PID: !P!)...
    taskkill /PID !P! /F >nul 2>&1
)
del "%PID_FILE%" 2>nul
del "%URL_FILE%" 2>nul
echo [tunnel] 隧道已关闭
goto PAUSE_EXIT

:: ============================================================
:: 状态
:: ============================================================
:DO_STATUS
call :IS_RUNNING
if %RUNNING%==1 (
    echo [tunnel] 隧道运行中
    if exist "%PID_FILE%" (
        set /p P=<"%PID_FILE%"
        echo [tunnel] PID: !P!
    )
    if exist "%URL_FILE%" (
        set /p U=<"%URL_FILE%"
        echo [tunnel] 域名: !U!
    ) else (
        echo [tunnel] 域名获取中...
    )
) else (
    echo [tunnel] 隧道未运行
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
        echo  当前状态: [运行中]
    ) else (
        echo  当前状态: [未运行]
    )
    goto EOF

:WAIT_URL
    set "MAX=%~1"
    if "%MAX%"=="" set "MAX=20"
    set "N=0"
    :TURL_LOOP
        findstr /C:"trycloudflare.com" "%LOG_FILE%" >nul 2>&1
        if not errorlevel 1 goto EXTRACT_URL
        timeout /t 1 /nobreak >nul
        set /a "N+=1"
        if !N! LSS %MAX% goto TURL_LOOP
    exit /b 1

:EXTRACT_URL
    powershell -NoProfile -Command "(Select-String -Path '%LOG_FILE%' -Pattern 'https://[a-z0-9.-]+\.trycloudflare\.com' | Select -First 1).Matches.Value" > "%URL_FILE%" 2>nul
    exit /b 0

:SAVE_PID
    for /f "tokens=2 delims=," %%a in ('tasklist /FI "IMAGENAME eq cloudflared.exe" /FO CSV 2^>nul ^| find "cloudflared"') do (
        set "P=%%a"
        set "P=!P:"=!"
        echo !P! > "%PID_FILE%"
        exit /b 0
    )
    goto EOF

:PAUSE_EXIT
    if "%~1"=="" pause
    goto EOF

:EOF
