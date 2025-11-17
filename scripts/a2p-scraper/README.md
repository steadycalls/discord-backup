# GoHighLevel A2P Status Scraper

Automated PowerShell script that scrapes A2P (Application-to-Person) campaign status from GoHighLevel and uploads to Logic Inbound Systems Manager.

## Features

- **Automated Scraping**: Uses Selenium WebDriver to navigate GoHighLevel and extract A2P status
- **Automatic Upload**: Formats and uploads scraped data to Logic Inbound Systems Manager API
- **Daily Execution**: Runs automatically every day via Windows Task Scheduler
- **Auto-Restart**: Restarts on system reboot to ensure continuous monitoring
- **Retry Logic**: Automatically retries failed scrapes up to 3 times
- **Error Handling**: Takes screenshots on errors for debugging
- **Logging**: Comprehensive logging with automatic log rotation
- **Secure Credentials**: Stores GHL credentials in local configuration file

## Prerequisites

### System Requirements

- **Operating System**: Windows 10/11 or Windows Server 2016+
- **PowerShell**: Version 7.0 or higher ([Download](https://aka.ms/powershell))
- **Internet Connection**: Required for scraping and API uploads
- **Administrator Access**: Needed for initial installation only

### Account Requirements

- GoHighLevel agency account with access to locations
- Logic Inbound Systems Manager account

## Installation

### Step 1: Download PowerShell 7

If you don't have PowerShell 7 installed:

1. Download from: https://aka.ms/powershell
2. Run the installer (MSI package)
3. Follow the installation wizard
4. Restart your terminal/PowerShell window

**Verify installation:**
```powershell
pwsh --version
```

### Step 2: Download Scraper Files

1. Download the `a2p-scraper` folder to your computer
2. Recommended location: `C:\Scripts\a2p-scraper`
3. The folder should contain:
   - `A2PScraper.ps1` (main scraper script)
   - `Install.ps1` (installation wizard)
   - `README.md` (this file)

### Step 3: Run Installer

1. **Open PowerShell 7 as Administrator**:
   - Right-click on PowerShell 7 icon
   - Select "Run as Administrator"

2. **Navigate to the scraper directory**:
   ```powershell
   cd "C:\Scripts\a2p-scraper"
   ```

3. **Run the installer**:
   ```powershell
   .\Install.ps1
   ```

4. **Follow the installation wizard**:
   - The installer will check prerequisites
   - Install Selenium module
   - Check for Chrome/Edge browser
   - Prompt for your configuration:
     * **API URL**: Your Logic Inbound Systems Manager URL (e.g., `https://systems.logicinbound.com`)
     * **GHL Email**: Your GoHighLevel login email
     * **GHL Password**: Your GoHighLevel password
     * **Agency URL**: Your GHL agency URL (e.g., `https://app.gohighlevel.com`)
     * **Headless Mode**: Y (recommended) or N (shows browser window)
     * **Screenshots on Error**: Y (recommended) for debugging
     * **Max Retries**: 3 (recommended)
   - Configure daily execution time (default: 9:00 AM)
   - Optionally run a test scrape

5. **Installation Complete**:
   - The scraper is now installed and scheduled
   - It will run daily at your specified time
   - It will also run on system startup

## Configuration

### View Current Configuration

```powershell
pwsh -File "C:\Scripts\a2p-scraper\A2PScraper.ps1" -Test
```

### Reconfigure Settings

To change your configuration (credentials, API URL, etc.):

```powershell
pwsh -File "C:\Scripts\a2p-scraper\A2PScraper.ps1" -Setup
```

This will prompt you to re-enter all settings.

### Configuration File Location

Settings are stored in: `C:\Scripts\a2p-scraper\config.json`

**⚠️ Warning**: This file contains your GHL password. Keep it secure and do not share it.

## Usage

### Automatic Execution

The scraper runs automatically:
- **Daily**: At your configured time (default: 9:00 AM)
- **On Startup**: When your computer restarts

No manual intervention is needed.

### Manual Execution

To run the scraper manually:

```powershell
pwsh -File "C:\Scripts\a2p-scraper\A2PScraper.ps1"
```

### View Logs

To view recent log entries:

```powershell
Get-Content "C:\Scripts\a2p-scraper\scraper.log" -Tail 50
```

To monitor logs in real-time:

```powershell
Get-Content "C:\Scripts\a2p-scraper\scraper.log" -Wait
```

### How Data Upload Works

After successfully scraping A2P status from GoHighLevel, the script automatically:

1. **Formats the data** for each location:
   - Location ID and name
   - Brand approval status (e.g., "Approved", "In Review", "Yet to Start")
   - Campaign approval status
   - Direct link to GHL A2P Wizard page
   - Timestamp of the check

2. **Uploads to Logic Inbound Systems Manager**:
   - Sends data to `/api/webhooks/a2p` REST endpoint
   - Creates/updates location and records status in a single request
   - Each campaign is uploaded individually with error handling
   - Failed uploads are logged but don't stop the process

3. **Provides detailed feedback**:
   - Logs each successful upload: `Uploaded: [Location Name]`
   - Logs any failures: `Failed to upload [Location Name]: [Error]`
   - Summary at end: `Upload complete: X succeeded, Y failed`

**View uploaded data**: Log into https://systems.logicinbound.com and navigate to the A2P Status page to see all scraped campaigns with their status history.

### Task Scheduler Management

**Run scraper now**:
```powershell
Start-ScheduledTask -TaskName "LogicInbound-A2PScraper"
```

**Disable automatic execution**:
```powershell
Disable-ScheduledTask -TaskName "LogicInbound-A2PScraper"
```

**Re-enable automatic execution**:
```powershell
Enable-ScheduledTask -TaskName "LogicInbound-A2PScraper"
```

**View task status**:
```powershell
Get-ScheduledTask -TaskName "LogicInbound-A2PScraper"
```

**View task history**:
1. Open Task Scheduler (`taskschd.msc`)
2. Navigate to: Task Scheduler Library
3. Find: `LogicInbound-A2PScraper`
4. Click the "History" tab

## Troubleshooting

### Scraper Not Running

**Check if task is enabled**:
```powershell
Get-ScheduledTask -TaskName "LogicInbound-A2PScraper" | Select-Object State
```

If disabled, enable it:
```powershell
Enable-ScheduledTask -TaskName "LogicInbound-A2PScraper"
```

**Check last run result**:
```powershell
Get-ScheduledTaskInfo -TaskName "LogicInbound-A2PScraper"
```

### Login Failures

If the scraper fails to log in to GoHighLevel:

1. **Verify credentials**:
   ```powershell
   pwsh -File "C:\Scripts\a2p-scraper\A2PScraper.ps1" -Test
   ```

2. **Reconfigure with correct credentials**:
   ```powershell
   pwsh -File "C:\Scripts\a2p-scraper\A2PScraper.ps1" -Setup
   ```

3. **Check for 2FA**: If your GHL account has two-factor authentication enabled, you may need to disable it or use an app-specific password.

### Selenium/Browser Issues

If browser automation fails:

1. **Verify Chrome or Edge is installed**:
   - Chrome: https://www.google.com/chrome/
   - Edge: Pre-installed on Windows 10/11

2. **Reinstall Selenium module**:
   ```powershell
   Uninstall-Module -Name Selenium -Force
   Install-Module -Name Selenium -Force -Scope CurrentUser
   ```

3. **Run in non-headless mode** to see what's happening:
   - Reconfigure with `-Setup` flag
   - Set "Headless Mode" to `N`
   - Run scraper manually and observe browser behavior

### Upload Failures

If data scrapes successfully but fails to upload:

1. **Verify API URL** in configuration
2. **Check network connectivity** to your Logic Inbound Systems Manager
3. **Review logs** for specific error messages:
   ```powershell
   Get-Content "C:\Scripts\a2p-scraper\scraper.log" -Tail 100
   ```

### Error Screenshots

When screenshots are enabled, error screenshots are saved to:
```
C:\Scripts\a2p-scraper\error_YYYYMMDD_HHMMSS.png
```

Review these to see what the browser was showing when the error occurred.

## Uninstallation

### Remove Scheduled Task

```powershell
Unregister-ScheduledTask -TaskName "LogicInbound-A2PScraper" -Confirm:$false
```

### Remove Files

Delete the scraper directory:
```powershell
Remove-Item "C:\Scripts\a2p-scraper" -Recurse -Force
```

### Uninstall Selenium (Optional)

If you no longer need Selenium:
```powershell
Uninstall-Module -Name Selenium
```

## File Structure

```
a2p-scraper/
├── A2PScraper.ps1          # Main scraper script
├── Install.ps1             # Installation wizard
├── README.md               # This file
├── config.json             # Configuration (created during setup)
├── scraper.log             # Log file (created on first run)
└── error_*.png             # Error screenshots (if enabled)
```

## Security Notes

- **Credentials**: Your GHL password is stored in `config.json` in plain text. Ensure this file is protected with appropriate Windows file permissions.
- **Network**: The scraper communicates with GoHighLevel and your Logic Inbound Systems Manager. Ensure your firewall allows these connections.
- **Task Scheduler**: The scheduled task runs with your user account privileges. Do not run as a more privileged account unless necessary.

## Advanced Configuration

### Change Execution Time

1. Open Task Scheduler (`taskschd.msc`)
2. Find `LogicInbound-A2PScraper`
3. Right-click → Properties
4. Go to "Triggers" tab
5. Edit the daily trigger
6. Change the time
7. Click OK

### Add Additional Triggers

You can add more triggers (e.g., run twice daily):

1. Open Task Scheduler
2. Find `LogicInbound-A2PScraper`
3. Right-click → Properties
4. Go to "Triggers" tab
5. Click "New"
6. Configure additional trigger
7. Click OK

### Modify Retry Behavior

Edit `config.json` and change `MaxRetries` value:
```json
{
  "MaxRetries": 5
}
```

## Support

For issues or questions:

1. **Check logs**: Review `scraper.log` for error details
2. **Run test**: Use `-Test` flag to verify configuration
3. **Manual run**: Execute manually to see real-time output
4. **Contact support**: Provide log files and error screenshots

## Version History

- **1.0.0** (2025-01-17): Initial release
  - Automated A2P status scraping
  - Daily scheduling with Task Scheduler
  - Auto-restart on system reboot
  - Comprehensive error handling and logging

## License

Proprietary - Logic Inbound Systems Manager
