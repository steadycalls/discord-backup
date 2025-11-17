<#
.SYNOPSIS
    A2P Scraper Installer
.DESCRIPTION
    Installs and configures the A2P scraper with Windows Task Scheduler
.NOTES
    Must be run as Administrator
#>

#Requires -RunAsAdministrator

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ScraperScript = Join-Path $ScriptDir "A2PScraper.ps1"
$TaskName = "LogicInbound-A2PScraper"
$TaskDescription = "Daily A2P status scraper for Logic Inbound Systems Manager"

function Write-Banner {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "   A2P Scraper Installation Wizard" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Test-Prerequisites {
    Write-Host "Checking prerequisites..." -ForegroundColor Yellow
    
    # Check PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion.Major -lt 7) {
        Write-Host "ERROR: PowerShell 7 or higher is required" -ForegroundColor Red
        Write-Host "Current version: $psVersion" -ForegroundColor Red
        Write-Host "Download from: https://aka.ms/powershell" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "  ✓ PowerShell $psVersion" -ForegroundColor Green
    
    # Check if script exists
    if (-not (Test-Path $ScraperScript)) {
        Write-Host "ERROR: Scraper script not found at $ScraperScript" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  ✓ Scraper script found" -ForegroundColor Green
    
    # Check admin rights
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  ✓ Running as Administrator" -ForegroundColor Green
    Write-Host ""
}

function Install-Dependencies {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    
    # Install NuGet provider
    if (-not (Get-PackageProvider -Name NuGet -ErrorAction SilentlyContinue)) {
        Write-Host "  Installing NuGet provider..."
        Install-PackageProvider -Name NuGet -Force -Scope CurrentUser | Out-Null
    }
    
    # Set PSGallery as trusted
    if ((Get-PSRepository -Name PSGallery).InstallationPolicy -ne 'Trusted') {
        Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
    }
    
    # Install Playwright module
    Write-Host "  Installing Playwright module (this may take a few minutes)..."
    if (-not (Get-Module -ListAvailable -Name Playwright)) {
        Install-Module -Name Playwright -Force -Scope CurrentUser -AllowClobber
    }
    
    # Install Playwright browsers
    Write-Host "  Installing Chromium browser..."
    Import-Module Playwright
    Install-PlaywrightBrowser -Chromium
    
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
    Write-Host ""
}

function Start-ScraperSetup {
    Write-Host "Running scraper setup wizard..." -ForegroundColor Yellow
    Write-Host ""
    
    & pwsh -File $ScraperScript -Setup
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Setup failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
}

function New-ScheduledTask {
    Write-Host "Configuring Windows Task Scheduler..." -ForegroundColor Yellow
    
    # Remove existing task if present
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "  Removing existing task..."
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    
    # Get execution time
    Write-Host "`nWhen should the scraper run daily?" -ForegroundColor Yellow
    $hour = Read-Host "Hour (0-23, default: 9)"
    if ([string]::IsNullOrWhiteSpace($hour)) { $hour = 9 }
    $minute = Read-Host "Minute (0-59, default: 0)"
    if ([string]::IsNullOrWhiteSpace($minute)) { $minute = 0 }
    
    # Create action
    $actionArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$ScraperScript`""
    $action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument $actionArgs -WorkingDirectory $ScriptDir
    
    # Create daily trigger
    $triggerTime = [DateTime]::Today.AddHours($hour).AddMinutes($minute)
    $dailyTrigger = New-ScheduledTaskTrigger -Daily -At $triggerTime
    
    # Create startup trigger (run on system boot)
    $startupTrigger = New-ScheduledTaskTrigger -AtStartup
    
    # Combine triggers
    $triggers = @($dailyTrigger, $startupTrigger)
    
    # Create settings
    $settingsParams = @{
        AllowStartIfOnBatteries = $true
        DontStopIfGoingOnBatteries = $true
        StartWhenAvailable = $true
        RestartCount = 3
        RestartInterval = (New-TimeSpan -Minutes 5)
        ExecutionTimeLimit = (New-TimeSpan -Hours 2)
    }
    $settings = New-ScheduledTaskSettingsSet @settingsParams
    
    # Create principal (run as current user)
    $principalParams = @{
        UserId = $env:USERNAME
        LogonType = 'Interactive'
        RunLevel = 'Highest'
    }
    $principal = New-ScheduledTaskPrincipal @principalParams
    
    # Register task
    $registerParams = @{
        TaskName = $TaskName
        Description = $TaskDescription
        Action = $action
        Trigger = $triggers
        Settings = $settings
        Principal = $principal
    }
    Register-ScheduledTask @registerParams | Out-Null
    
    Write-Host "  ✓ Scheduled task created" -ForegroundColor Green
    Write-Host "    - Daily execution: $($hour.ToString().PadLeft(2,'0')):$($minute.ToString().PadLeft(2,'0'))" -ForegroundColor Gray
    Write-Host "    - Runs on system startup" -ForegroundColor Gray
    Write-Host "    - Auto-restart on failure (3 attempts)" -ForegroundColor Gray
    Write-Host ""
}

function Test-Installation {
    Write-Host "Testing installation..." -ForegroundColor Yellow
    
    # Test configuration
    & pwsh -File $ScraperScript -Test
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Configuration test failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    
    # Ask to run test scrape
    $runTest = Read-Host "Run a test scrape now? (Y/N)"
    if ($runTest -eq "Y") {
        Write-Host "`nRunning test scrape..." -ForegroundColor Yellow
        Write-Host "This may take a few minutes...`n"
        
        & pwsh -File $ScraperScript
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n  ✓ Test scrape completed successfully" -ForegroundColor Green
        }
        else {
            Write-Host "`n  ✗ Test scrape failed. Check logs for details." -ForegroundColor Red
        }
    }
    
    Write-Host ""
}

function Show-Summary {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   Installation Complete!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "Installation Directory:" -ForegroundColor Cyan
    Write-Host "  $ScriptDir`n"
    
    Write-Host "Key Files:" -ForegroundColor Cyan
    Write-Host "  Scraper: A2PScraper.ps1"
    Write-Host "  Config:  config.json"
    Write-Host "  Logs:    scraper.log`n"
    
    Write-Host "Scheduled Task:" -ForegroundColor Cyan
    Write-Host "  Name: $TaskName"
    Write-Host "  View in: Task Scheduler > Task Scheduler Library`n"
    
    Write-Host "Manual Commands:" -ForegroundColor Cyan
    Write-Host "  Run scraper:      pwsh -File `"$ScraperScript`""
    Write-Host "  Reconfigure:      pwsh -File `"$ScraperScript`" -Setup"
    Write-Host "  Test config:      pwsh -File `"$ScraperScript`" -Test"
    $logPath = Join-Path $ScriptDir 'scraper.log'
    Write-Host "  View logs:        Get-Content `"$logPath`" -Tail 50`n"
    
    Write-Host "Task Scheduler Commands:" -ForegroundColor Cyan
    Write-Host "  Run now:          Start-ScheduledTask -TaskName '$TaskName'"
    Write-Host "  Disable:          Disable-ScheduledTask -TaskName '$TaskName'"
    Write-Host "  Enable:           Enable-ScheduledTask -TaskName '$TaskName'"
    Write-Host "  Remove:           Unregister-ScheduledTask -TaskName '$TaskName'`n"
    
    Write-Host "Support:" -ForegroundColor Cyan
    Write-Host "  If you encounter issues, check scraper.log for details.`n"
    
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Main installation flow
try {
    Write-Banner
    Test-Prerequisites
    Install-Dependencies
    Start-ScraperSetup
    New-ScheduledTask
    Test-Installation
    Show-Summary
}
catch {
    Write-Host "`nERROR: Installation failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nPress any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
