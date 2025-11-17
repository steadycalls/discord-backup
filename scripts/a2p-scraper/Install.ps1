#Requires -RunAsAdministrator

param()

$ErrorActionPreference = "Stop"

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScraperScript = Join-Path $ScriptDir "A2PScraper.ps1"
$TaskName = "LogicInbound-A2PScraper"
$TaskDescription = "Daily A2P status scraper for Logic Inbound Systems Manager"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   A2P Scraper Installation Wizard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check PowerShell version
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$psVersion = $PSVersionTable.PSVersion
if ($psVersion.Major -lt 7) {
    Write-Host "ERROR: PowerShell 7 or higher is required" -ForegroundColor Red
    Write-Host "Current version: $psVersion" -ForegroundColor Red
    Write-Host "Download from: https://aka.ms/powershell" -ForegroundColor Yellow
    exit 1
}
Write-Host "  OK: PowerShell $psVersion" -ForegroundColor Green

# Check if script exists
if (-not (Test-Path $ScraperScript)) {
    Write-Host "ERROR: Scraper script not found at $ScraperScript" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Scraper script found" -ForegroundColor Green

# Check admin rights
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Running as Administrator" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow

if (-not (Get-PackageProvider -Name NuGet -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing NuGet provider..."
    Install-PackageProvider -Name NuGet -Force -Scope CurrentUser | Out-Null
}

if ((Get-PSRepository -Name PSGallery).InstallationPolicy -ne 'Trusted') {
    Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
}

Write-Host "  Installing Selenium module (this may take a few minutes)..."
if (-not (Get-Module -ListAvailable -Name Selenium)) {
    Install-Module -Name Selenium -Force -Scope CurrentUser -AllowClobber
}

Write-Host "  Checking for Chrome/Edge browser..."
$chromeExists = Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe"
$edgeExists = Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if ($chromeExists -or $edgeExists) {
    Write-Host "  OK: Browser found" -ForegroundColor Green
} else {
    Write-Host "  WARN: Chrome or Edge not found. Please install Google Chrome." -ForegroundColor Yellow
    Write-Host "  Download: https://www.google.com/chrome/" -ForegroundColor Yellow
}

Write-Host "  OK: Dependencies installed" -ForegroundColor Green
Write-Host ""

# Run scraper setup
Write-Host "Running scraper setup wizard..." -ForegroundColor Yellow
Write-Host ""

$setupCmd = "& `"$ScraperScript`" -Setup"
Invoke-Expression $setupCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Setup failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Configure Task Scheduler
Write-Host "Configuring Windows Task Scheduler..." -ForegroundColor Yellow

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "  Removing existing task..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Write-Host ""
Write-Host "When should the scraper run daily?" -ForegroundColor Yellow
$hour = Read-Host "Hour (0-23, default: 9)"
if ([string]::IsNullOrWhiteSpace($hour)) { $hour = 9 }
$minute = Read-Host "Minute (0-59, default: 0)"
if ([string]::IsNullOrWhiteSpace($minute)) { $minute = 0 }

$actionArgs = "-NoProfile -ExecutionPolicy Bypass -File " + [char]34 + $ScraperScript + [char]34
$action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument $actionArgs -WorkingDirectory $ScriptDir

$triggerTime = [DateTime]::Today.AddHours([int]$hour).AddMinutes([int]$minute)
$dailyTrigger = New-ScheduledTaskTrigger -Daily -At $triggerTime
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$triggers = @($dailyTrigger, $startupTrigger)

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -ExecutionTimeLimit (New-TimeSpan -Hours 2)

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Description $TaskDescription -Action $action -Trigger $triggers -Settings $settings -Principal $principal | Out-Null

Write-Host "  OK: Scheduled task created" -ForegroundColor Green
$hourStr = $hour.ToString().PadLeft(2,'0')
$minuteStr = $minute.ToString().PadLeft(2,'0')
$timeStr = "$hourStr" + ":" + "$minuteStr"
Write-Host "    - Daily execution: $timeStr" -ForegroundColor Gray
Write-Host "    - Runs on system startup" -ForegroundColor Gray
Write-Host "    - Auto-restart on failure (3 attempts)" -ForegroundColor Gray
Write-Host ""

# Test installation
Write-Host "Testing installation..." -ForegroundColor Yellow

$testCmd = "& `"$ScraperScript`" -Test"
Invoke-Expression $testCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Configuration test failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

$runTest = Read-Host "Run a test scrape now? (Y/N)"
if ($runTest -eq "Y") {
    Write-Host ""
    Write-Host "Running test scrape..." -ForegroundColor Yellow
    Write-Host "This may take a few minutes..." -ForegroundColor Yellow
    Write-Host ""
    
    $runCmd = "& `"$ScraperScript`""
    Invoke-Expression $runCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "  OK: Test scrape completed successfully" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "  ERROR: Test scrape failed. Check logs for details." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Installation Directory:" -ForegroundColor Cyan
Write-Host "  $ScriptDir" -ForegroundColor White
Write-Host ""

Write-Host "Key Files:" -ForegroundColor Cyan
Write-Host "  Scraper: A2PScraper.ps1" -ForegroundColor White
Write-Host "  Config:  config.json" -ForegroundColor White
Write-Host "  Logs:    scraper.log" -ForegroundColor White
Write-Host ""

Write-Host "Scheduled Task:" -ForegroundColor Cyan
Write-Host "  Name: $TaskName" -ForegroundColor White
Write-Host "  View in: Task Scheduler > Task Scheduler Library" -ForegroundColor White
Write-Host ""

Write-Host "Manual Commands:" -ForegroundColor Cyan
Write-Host "  Run scraper:" -ForegroundColor White
Write-Host "    pwsh -File " + [char]34 + $ScraperScript + [char]34 -ForegroundColor Gray
Write-Host "  Reconfigure:" -ForegroundColor White
Write-Host "    pwsh -File " + [char]34 + $ScraperScript + [char]34 + " -Setup" -ForegroundColor Gray
Write-Host "  Test config:" -ForegroundColor White
Write-Host "    pwsh -File " + [char]34 + $ScraperScript + [char]34 + " -Test" -ForegroundColor Gray
$logPath = Join-Path $ScriptDir 'scraper.log'
Write-Host "  View logs:" -ForegroundColor White
Write-Host "    Get-Content " + [char]34 + $logPath + [char]34 + " -Tail 50" -ForegroundColor Gray
Write-Host ""

Write-Host "Task Scheduler Commands:" -ForegroundColor Cyan
Write-Host "  Run now:    Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "  Disable:    Disable-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "  Enable:     Enable-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "  Remove:     Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host ""

Write-Host "Support:" -ForegroundColor Cyan
Write-Host "  If you encounter issues, check scraper.log for details." -ForegroundColor White
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
