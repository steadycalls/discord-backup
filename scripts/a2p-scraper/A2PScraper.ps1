<#
.SYNOPSIS
    GoHighLevel A2P Status Scraper
.DESCRIPTION
    Automatically scrapes A2P campaign status from GoHighLevel and uploads to Logic Inbound Systems Manager
.NOTES
    Requires: PowerShell 7+, Playwright for PowerShell
#>

param(
    [switch]$Setup,
    [switch]$Test
)

# Script configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigFile = Join-Path $ScriptDir "config.json"
$LogFile = Join-Path $ScriptDir "scraper.log"
$MaxLogSizeMB = 10

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Console output
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage }
    }
    
    # File output
    Add-Content -Path $LogFile -Value $logMessage
    
    # Rotate log if too large
    if ((Get-Item $LogFile -ErrorAction SilentlyContinue).Length -gt ($MaxLogSizeMB * 1MB)) {
        $archiveLog = Join-Path $ScriptDir "scraper_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
        Move-Item $LogFile $archiveLog
        Write-Log "Log rotated to $archiveLog"
    }
}

# Load configuration
function Get-Config {
    if (-not (Test-Path $ConfigFile)) {
        Write-Log "Configuration file not found. Run with -Setup flag." "ERROR"
        exit 1
    }
    
    try {
        $config = Get-Content $ConfigFile | ConvertFrom-Json
        return $config
    }
    catch {
        Write-Log "Failed to load configuration: $_" "ERROR"
        exit 1
    }
}

# Save configuration
function Save-Config {
    param($Config)
    
    try {
        $Config | ConvertTo-Json -Depth 10 | Set-Content $ConfigFile
        Write-Log "Configuration saved successfully" "SUCCESS"
    }
    catch {
        Write-Log "Failed to save configuration: $_" "ERROR"
        exit 1
    }
}

# Setup wizard
function Start-Setup {
    Write-Host "`n=== GoHighLevel A2P Scraper Setup ===" -ForegroundColor Cyan
    Write-Host "This wizard will configure the scraper for your environment.`n"
    
    $config = @{}
    
    # API Endpoint
    Write-Host "Enter your Logic Inbound Systems Manager API URL:" -ForegroundColor Yellow
    Write-Host "Example: https://systems.logicinbound.com" -ForegroundColor Gray
    $config.ApiBaseUrl = Read-Host "API URL"
    
    # GHL Credentials
    Write-Host "`nEnter your GoHighLevel credentials:" -ForegroundColor Yellow
    $config.GhlEmail = Read-Host "GHL Email"
    $ghlPassword = Read-Host "GHL Password" -AsSecureString
    $config.GhlPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($ghlPassword)
    )
    
    # GHL Agency URL
    Write-Host "`nEnter your GoHighLevel agency URL:" -ForegroundColor Yellow
    Write-Host "Example: https://app.gohighlevel.com" -ForegroundColor Gray
    $config.GhlAgencyUrl = Read-Host "Agency URL"
    
    # Scraper options
    Write-Host "`nScraper Configuration:" -ForegroundColor Yellow
    $config.HeadlessMode = (Read-Host "Run browser in headless mode? (Y/N)") -eq "Y"
    $config.ScreenshotOnError = (Read-Host "Take screenshots on errors? (Y/N)") -eq "Y"
    $config.MaxRetries = [int](Read-Host "Max retry attempts (default: 3)")
    if ($config.MaxRetries -eq 0) { $config.MaxRetries = 3 }
    
    # Save configuration
    Save-Config $config
    
    Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
    Write-Host "Configuration saved to: $ConfigFile"
    Write-Host "Run the script without -Setup flag to start scraping.`n"
}

# Install Playwright if needed
function Install-Playwright {
    Write-Log "Checking Playwright installation..."
    
    try {
        $playwrightModule = Get-Module -ListAvailable -Name Playwright
        if (-not $playwrightModule) {
            Write-Log "Installing Playwright module..."
            Install-Module -Name Playwright -Force -Scope CurrentUser
        }
        
        Import-Module Playwright
        
        # Install browsers
        Write-Log "Installing Playwright browsers..."
        Install-PlaywrightBrowser -Chromium
        
        Write-Log "Playwright installation complete" "SUCCESS"
    }
    catch {
        Write-Log "Failed to install Playwright: $_" "ERROR"
        Write-Log "Please install manually: Install-Module Playwright; Install-PlaywrightBrowser -Chromium" "ERROR"
        exit 1
    }
}

# Scrape A2P status from GHL
function Get-A2PStatus {
    param($Config)
    
    Write-Log "Starting A2P status scrape..."
    
    try {
        Import-Module Playwright
        
        $playwright = New-PlaywrightAsync
        $browser = $playwright.Chromium.LaunchAsync(@{
            Headless = $Config.HeadlessMode
        }).GetAwaiter().GetResult()
        
        $context = $browser.NewContextAsync().GetAwaiter().GetResult()
        $page = $context.NewPageAsync().GetAwaiter().GetResult()
        
        # Navigate to GHL login
        Write-Log "Navigating to GoHighLevel login..."
        $page.GotoAsync($Config.GhlAgencyUrl).GetAwaiter().GetResult()
        
        # Login
        Write-Log "Logging in to GoHighLevel..."
        $page.FillAsync("input[type='email']", $Config.GhlEmail).GetAwaiter().GetResult()
        $page.FillAsync("input[type='password']", $Config.GhlPassword).GetAwaiter().GetResult()
        $page.ClickAsync("button[type='submit']").GetAwaiter().GetResult()
        
        # Wait for navigation
        Start-Sleep -Seconds 5
        
        # Navigate to locations/subaccounts
        Write-Log "Fetching locations..."
        $page.GotoAsync("$($Config.GhlAgencyUrl)/locations").GetAwaiter().GetResult()
        Start-Sleep -Seconds 3
        
        # Scrape location data
        $locations = @()
        $locationElements = $page.QuerySelectorAllAsync(".location-card").GetAwaiter().GetResult()
        
        foreach ($element in $locationElements) {
            try {
                $locationId = $element.GetAttributeAsync("data-location-id").GetAwaiter().GetResult()
                $locationName = $element.QuerySelectorAsync(".location-name").GetAwaiter().GetResult().InnerTextAsync().GetAwaiter().GetResult()
                
                # Navigate to A2P page for this location
                $a2pUrl = "$($Config.GhlAgencyUrl)/location/$locationId/settings/phone/a2p"
                $page.GotoAsync($a2pUrl).GetAwaiter().GetResult()
                Start-Sleep -Seconds 2
                
                # Extract A2P status
                $brandStatus = "UNKNOWN"
                $campaignStatus = "UNKNOWN"
                
                try {
                    $brandStatusElement = $page.QuerySelectorAsync("[data-testid='brand-status']").GetAwaiter().GetResult()
                    if ($brandStatusElement) {
                        $brandStatus = $brandStatusElement.InnerTextAsync().GetAwaiter().GetResult()
                    }
                }
                catch { }
                
                try {
                    $campaignStatusElement = $page.QuerySelectorAsync("[data-testid='campaign-status']").GetAwaiter().GetResult()
                    if ($campaignStatusElement) {
                        $campaignStatus = $campaignStatusElement.InnerTextAsync().GetAwaiter().GetResult()
                    }
                }
                catch { }
                
                $locations += @{
                    locationId = $locationId
                    locationName = $locationName
                    brandStatus = $brandStatus
                    campaignStatus = $campaignStatus
                    sourceUrl = $a2pUrl
                    checkedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                }
                
                Write-Log "Scraped: $locationName - Brand: $brandStatus, Campaign: $campaignStatus"
            }
            catch {
                Write-Log "Error scraping location: $_" "WARN"
            }
        }
        
        # Cleanup
        $browser.CloseAsync().GetAwaiter().GetResult()
        
        Write-Log "Scraping complete. Found $($locations.Count) locations" "SUCCESS"
        return $locations
    }
    catch {
        Write-Log "Scraping failed: $_" "ERROR"
        
        if ($Config.ScreenshotOnError) {
            $screenshotPath = Join-Path $ScriptDir "error_$(Get-Date -Format 'yyyyMMdd_HHmmss').png"
            try {
                $page.ScreenshotAsync(@{ Path = $screenshotPath }).GetAwaiter().GetResult()
                Write-Log "Error screenshot saved to: $screenshotPath" "WARN"
            }
            catch { }
        }
        
        return @()
    }
}

# Upload data to API
function Send-A2PData {
    param(
        $Config,
        $Locations
    )
    
    if ($Locations.Count -eq 0) {
        Write-Log "No data to upload" "WARN"
        return
    }
    
    Write-Log "Uploading data to API..."
    
    $apiUrl = "$($Config.ApiBaseUrl)/api/trpc/a2p.importStatus"
    
    try {
        foreach ($location in $Locations) {
            $body = @{
                location = @{
                    id = $location.locationId
                    name = $location.locationName
                }
                status = @{
                    brandStatus = $location.brandStatus
                    campaignStatus = $location.campaignStatus
                    sourceUrl = $location.sourceUrl
                    checkedAt = $location.checkedAt
                }
            } | ConvertTo-Json -Depth 10
            
            $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json"
            Write-Log "Uploaded: $($location.locationName)"
        }
        
        Write-Log "Upload complete. $($Locations.Count) locations updated" "SUCCESS"
    }
    catch {
        Write-Log "Upload failed: $_" "ERROR"
        Write-Log "Response: $($_.Exception.Response)" "ERROR"
    }
}

# Main execution
function Start-Scraper {
    Write-Log "=== A2P Scraper Started ==="
    
    $config = Get-Config
    
    # Install Playwright if needed
    if (-not (Get-Module -ListAvailable -Name Playwright)) {
        Install-Playwright
    }
    
    # Scrape data
    $retryCount = 0
    $locations = @()
    
    while ($retryCount -lt $config.MaxRetries) {
        $locations = Get-A2PStatus -Config $config
        
        if ($locations.Count -gt 0) {
            break
        }
        
        $retryCount++
        if ($retryCount -lt $config.MaxRetries) {
            Write-Log "Retry $retryCount of $($config.MaxRetries)..." "WARN"
            Start-Sleep -Seconds 30
        }
    }
    
    if ($locations.Count -eq 0) {
        Write-Log "Failed to scrape data after $($config.MaxRetries) attempts" "ERROR"
        exit 1
    }
    
    # Upload data
    Send-A2PData -Config $config -Locations $locations
    
    Write-Log "=== A2P Scraper Completed ===" "SUCCESS"
}

# Entry point
if ($Setup) {
    Start-Setup
}
elseif ($Test) {
    Write-Host "Testing configuration..." -ForegroundColor Cyan
    $config = Get-Config
    Write-Host "Configuration loaded successfully:" -ForegroundColor Green
    Write-Host "  API URL: $($config.ApiBaseUrl)"
    Write-Host "  GHL Email: $($config.GhlEmail)"
    Write-Host "  Headless Mode: $($config.HeadlessMode)"
    Write-Host "`nTest complete." -ForegroundColor Green
}
else {
    Start-Scraper
}
