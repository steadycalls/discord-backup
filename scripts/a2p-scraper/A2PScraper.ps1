#Requires -Version 7.0

<#
.SYNOPSIS
    A2P Campaign Status Scraper for GoHighLevel using Selenium
.DESCRIPTION
    Automatically scrapes A2P campaign status from GoHighLevel and uploads to Logic Inbound Systems Manager
.PARAMETER Test
    Run in test mode without uploading data
.PARAMETER Setup
    Reconfigure credentials and settings
#>

param(
    [switch]$Test,
    [switch]$Setup
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigFile = Join-Path $ScriptDir "config.json"
$LogFile = Join-Path $ScriptDir "scraper.log"
$ScreenshotDir = Join-Path $ScriptDir "screenshots"
$MaxLogSize = 10MB

# Ensure screenshot directory exists
if (-not (Test-Path $ScreenshotDir)) {
    New-Item -ItemType Directory -Path $ScreenshotDir | Out-Null
}

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logMessage
    
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage }
    }
}

# Rotate log if too large
if ((Test-Path $LogFile) -and ((Get-Item $LogFile).Length -gt $MaxLogSize)) {
    $backupLog = $LogFile -replace '\.log$', "_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
    Move-Item $LogFile $backupLog
    Write-Log "Log rotated to $backupLog"
}

# Load or create configuration
function Get-Configuration {
    if (Test-Path $ConfigFile) {
        return Get-Content $ConfigFile | ConvertFrom-Json
    }
    return $null
}

function Save-Configuration {
    param($config)
    $config | ConvertTo-Json | Set-Content $ConfigFile
    Write-Log "Configuration saved"
}

# Setup wizard
if ($Setup -or -not (Test-Path $ConfigFile)) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  A2P Scraper Configuration Setup" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    $config = @{}
    $config.apiUrl = Read-Host "Enter API URL (e.g., https://systems.logicinbound.com)"
    $config.ghlEmail = Read-Host "Enter GoHighLevel email"
    $config.ghlPassword = Read-Host "Enter GoHighLevel password" -AsSecureString | ConvertFrom-SecureString
    $config.agencyUrl = Read-Host "Enter Agency URL (e.g., https://app.gohighlevel.com)"
    $config.headless = (Read-Host "Run browser in headless mode? (Y/N)") -eq 'Y'
    $config.screenshotOnError = (Read-Host "Take screenshots on error? (Y/N)") -eq 'Y'
    $config.maxRetries = [int](Read-Host "Max retries on failure (default: 3)")
    
    Save-Configuration $config
    Write-Host "`nConfiguration saved successfully!`n" -ForegroundColor Green
    
    if (-not $Setup) {
        $runNow = Read-Host "Run scraper now? (Y/N)"
        if ($runNow -ne 'Y') {
            exit 0
        }
    } else {
        exit 0
    }
}

# Load configuration
$config = Get-Configuration
if (-not $config) {
    Write-Log "No configuration found. Run with -Setup parameter." "ERROR"
    exit 1
}

Write-Log "========== A2P Scraper Started =========="
Write-Log "Test mode: $Test"

# Check Selenium module
if (-not (Get-Module -ListAvailable -Name Selenium)) {
    Write-Log "Selenium module not found. Installing..." "WARN"
    try {
        Install-Module -Name Selenium -Force -Scope CurrentUser -ErrorAction Stop
        Write-Log "Selenium module installed successfully" "SUCCESS"
    } catch {
        Write-Log "Failed to install Selenium module: $_" "ERROR"
        exit 1
    }
}

Import-Module Selenium

# Decrypt password
$securePassword = $config.ghlPassword | ConvertTo-SecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Initialize Selenium WebDriver
function Initialize-WebDriver {
    Write-Log "Initializing Chrome WebDriver..."
    
    try {
        $options = New-Object OpenQA.Selenium.Chrome.ChromeOptions
        
        if ($config.headless) {
            $options.AddArgument("--headless=new")
        }
        
        $options.AddArgument("--no-sandbox")
        $options.AddArgument("--disable-dev-shm-usage")
        $options.AddArgument("--disable-gpu")
        $options.AddArgument("--window-size=1920,1080")
        $options.AddArgument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        
        $driver = New-Object OpenQA.Selenium.Chrome.ChromeDriver($options)
        $driver.Manage().Timeouts().ImplicitWait = [TimeSpan]::FromSeconds(10)
        $driver.Manage().Timeouts().PageLoad = [TimeSpan]::FromSeconds(30)
        
        Write-Log "WebDriver initialized successfully" "SUCCESS"
        return $driver
    } catch {
        Write-Log "Failed to initialize WebDriver: $_" "ERROR"
        throw
    }
}

# Take screenshot on error
function Save-ErrorScreenshot {
    param($driver, $errorContext)
    
    if (-not $config.screenshotOnError) { return }
    
    try {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $filename = "error_${errorContext}_${timestamp}.png"
        $filepath = Join-Path $ScreenshotDir $filename
        
        $screenshot = $driver.GetScreenshot()
        $screenshot.SaveAsFile($filepath)
        
        Write-Log "Screenshot saved: $filepath" "WARN"
    } catch {
        Write-Log "Failed to save screenshot: $_" "ERROR"
    }
}

# Scrape A2P status
function Get-A2PStatus {
    param($driver)
    
    Write-Log "Navigating to GoHighLevel..."
    $driver.Navigate().GoToUrl($config.agencyUrl)
    Start-Sleep -Seconds 3
    
    # Login
    Write-Log "Logging in..."
    try {
        $emailField = $driver.FindElement([OpenQA.Selenium.By]::CssSelector("input[type='email'], input[name='email']"))
        $emailField.SendKeys($config.ghlEmail)
        
        $passwordField = $driver.FindElement([OpenQA.Selenium.By]::CssSelector("input[type='password'], input[name='password']"))
        $passwordField.SendKeys($plainPassword)
        
        $loginButton = $driver.FindElement([OpenQA.Selenium.By]::CssSelector("button[type='submit']"))
        $loginButton.Click()
        
        Start-Sleep -Seconds 5
        Write-Log "Login successful" "SUCCESS"
    } catch {
        Write-Log "Login failed: $_" "ERROR"
        Save-ErrorScreenshot $driver "login"
        throw
    }
    
    # Navigate to A2P section
    Write-Log "Navigating to A2P campaigns..."
    try {
        # This selector will need to be updated based on actual GHL UI
        $driver.Navigate().GoToUrl("$($config.agencyUrl)/settings/phone/a2p")
        Start-Sleep -Seconds 5
    } catch {
        Write-Log "Failed to navigate to A2P section: $_" "ERROR"
        Save-ErrorScreenshot $driver "navigation"
        throw
    }
    
    # Scrape campaign data
    Write-Log "Scraping campaign data..."
    $campaigns = @()
    
    try {
        # Find all location rows (selectors need to be updated based on actual GHL UI)
        $rows = $driver.FindElements([OpenQA.Selenium.By]::CssSelector("tr.location-row, .campaign-item"))
        
        foreach ($row in $rows) {
            try {
                $campaign = @{
                    locationId = $row.FindElement([OpenQA.Selenium.By]::CssSelector(".location-id")).Text
                    locationName = $row.FindElement([OpenQA.Selenium.By]::CssSelector(".location-name")).Text
                    brandStatus = $row.FindElement([OpenQA.Selenium.By]::CssSelector(".brand-status")).Text
                    campaignStatus = $row.FindElement([OpenQA.Selenium.By]::CssSelector(".campaign-status")).Text
                    submittedDate = $row.FindElement([OpenQA.Selenium.By]::CssSelector(".submitted-date")).Text
                    wizardUrl = $row.FindElement([OpenQA.Selenium.By]::CssSelector("a.wizard-link")).GetAttribute("href")
                }
                
                $campaigns += $campaign
            } catch {
                Write-Log "Failed to parse row: $_" "WARN"
            }
        }
        
        Write-Log "Scraped $($campaigns.Count) campaigns" "SUCCESS"
        return $campaigns
    } catch {
        Write-Log "Failed to scrape campaign data: $_" "ERROR"
        Save-ErrorScreenshot $driver "scraping"
        throw
    }
}

# Upload to API
function Send-ToAPI {
    param($data)
    
    if ($Test) {
        Write-Log "TEST MODE: Would upload $($data.Count) campaigns" "WARN"
        $data | ForEach-Object {
            Write-Log "  - $($_.locationName): Brand=$($_.brandStatus), Campaign=$($_.campaignStatus)"
        }
        return $true
    }
    
    Write-Log "Uploading data to API..."
    
    try {
        $url = "$($config.apiUrl)/api/trpc/a2p.import"
        $body = @{ campaigns = $data } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
        
        Write-Log "Data uploaded successfully" "SUCCESS"
        return $true
    } catch {
        Write-Log "Failed to upload data: $_" "ERROR"
        return $false
    }
}

# Main execution with retry logic
$attempt = 1
$success = $false

while ($attempt -le $config.maxRetries -and -not $success) {
    Write-Log "Attempt $attempt of $($config.maxRetries)"
    
    $driver = $null
    try {
        $driver = Initialize-WebDriver
        $campaigns = Get-A2PStatus $driver
        $success = Send-ToAPI $campaigns
        
        if ($success) {
            Write-Log "Scraper completed successfully" "SUCCESS"
        }
    } catch {
        Write-Log "Attempt $attempt failed: $_" "ERROR"
        
        if ($attempt -lt $config.maxRetries) {
            $waitTime = [Math]::Pow(2, $attempt) * 5
            Write-Log "Waiting $waitTime seconds before retry..."
            Start-Sleep -Seconds $waitTime
        }
    } finally {
        if ($driver) {
            $driver.Quit()
            $driver.Dispose()
        }
    }
    
    $attempt++
}

if (-not $success) {
    Write-Log "Scraper failed after $($config.maxRetries) attempts" "ERROR"
    exit 1
}

Write-Log "========== A2P Scraper Finished =========="
exit 0
