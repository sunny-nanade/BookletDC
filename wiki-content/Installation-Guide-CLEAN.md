# Installation Guide

## Quick Install (Recommended)

### Method 1: One-Click Installer
1. **Download** [`install-booklet-scanner.bat`](https://github.com/sunny-nanade/BookletDC/raw/main/install-booklet-scanner.bat) from this repository ← *Right-click and "Save As"*
2. **Create** an empty folder on your computer
3. **Put** the downloaded file in that folder
4. **Double-click** `install-booklet-scanner.bat`
5. **Wait** for automatic download and installation
6. **Booklet Scanner will start automatically!**

### Method 2: Full Deployment Manager
1. **Download** both files (right-click and "Save As"):
   - [`deploy-manager.bat`](https://github.com/sunny-nanade/BookletDC/raw/main/deploy-manager.bat)
   - [`deploy-config.bat`](https://github.com/sunny-nanade/BookletDC/raw/main/deploy-config.bat)
2. **Create** an empty folder on your computer
3. **Put** both files in that folder
4. **Double-click** `deploy-manager.bat`
5. **Follow** the on-screen prompts
6. **Enjoy** your Booklet Scanner!

## What Happens During Installation

### Automatic Process:
- Downloads latest version from GitHub  
- Extracts all project files  
- Installs Python 3.9.13 automatically (if needed)  
- Sets up all dependencies  
- Creates desktop shortcut with custom branding  
- Starts the Booklet Scanner application  

### Installation Types:

#### Standard Installation
- Downloads and installs Python 3.9.13
- Suitable for most Windows systems
- Automatic dependency management

#### Anaconda-Safe Installation
- Detects Anaconda/Conda environments
- Uses conda-compatible launchers
- Prevents environment conflicts

#### Lightweight Installation
- Uses existing Python installation
- Minimal download requirements
- Fast setup for developers

## System Requirements

### Minimum Requirements:
- **OS:** Windows 7/8/10/11 (32-bit or 64-bit)
- **Storage:** 50 MB free disk space
- **Memory:** 2 GB RAM
- **Network:** Internet connection (for initial download)
- **Camera:** Webcam or external camera
- **Permissions:** Administrator rights (for Python installation)

### Recommended Requirements:
- **OS:** Windows 10/11 (64-bit)
- **Storage:** 200 MB free disk space
- **Memory:** 4 GB RAM
- **Network:** Broadband internet connection
- **Camera:** HD webcam (720p or higher)

## Installation Steps in Detail

### Step 1: Download Installer
- Visit the [GitHub repository](https://github.com/sunny-nanade/BookletDC)
- Download `install-booklet-scanner.bat` (right-click → Save As)
- Save to a dedicated folder (e.g., `C:\BookletScanner\`)

### Step 2: Run Installation
- **Right-click** → **Run as Administrator** (recommended)
- The installer will:
  - Check for existing Python installations
  - Download latest project files from GitHub
  - Install Python if needed
  - Set up all dependencies
  - Create desktop shortcuts

### Step 3: First Launch
- Application starts automatically after installation
- Browser opens to `http://127.0.0.1:9000`
- Camera permissions may be requested
- QR scanner gun can be configured if available

## Manual Installation (Developers)

### Git Clone Method:
```bash
git clone https://github.com/sunny-nanade/BookletDC.git
cd BookletDC
start.bat
```

### Direct Download:
1. Download ZIP from GitHub
2. Extract to desired location
3. Run `start.bat`
4. Python will auto-install if needed

## Updating

### Automatic Updates:
- Run the same installer again
- It detects existing installation
- Offers to update or reinstall
- Automatic backup of previous version

### Manual Updates:
- Download latest version
- Replace existing files
- Run `start.bat` to update dependencies

## Troubleshooting Installation

### Common Issues:

#### Permission Denied
**Solution:** Run installer as Administrator
```
Right-click → Run as Administrator
```

#### Network Connection Failed
**Solution:** Check internet connection and firewall
- Ensure internet connectivity
- Temporarily disable firewall if needed
- Use corporate network? Contact IT department

#### Python Installation Failed
**Solution:** Manual Python installation
1. Download Python 3.9.13 from python.org
2. Install with "Add to PATH" checked
3. Run installer again

#### Anaconda Conflicts
**Solution:** Use Anaconda-safe installer
- The installer automatically detects Anaconda
- Uses `start_anaconda_safe.bat` launcher
- Prevents environment conflicts

### Advanced Troubleshooting:

#### Debug Mode Installation:
1. Open Command Prompt as Administrator
2. Navigate to installer folder
3. Run: `install-booklet-scanner.bat debug`
4. Review detailed error messages

#### Clean Installation:
1. Delete existing BookletDC folder
2. Uninstall Python (if installed by our installer)
3. Clear temporary files
4. Run installer again

## Getting Help

### Before Reporting Issues:
1. Check this troubleshooting guide
2. Review [FAQ](FAQ)
3. Search existing [GitHub Issues](https://github.com/sunny-nanade/BookletDC/issues)

### Report a Bug:
1. Include Windows version
2. Attach error messages/screenshots
3. Describe steps to reproduce
4. Mention if you have Anaconda installed

### Contact Methods:
- **GitHub Issues:** [Create New Issue](https://github.com/sunny-nanade/BookletDC/issues/new)
- **Discussions:** [GitHub Discussions](https://github.com/sunny-nanade/BookletDC/discussions)

---

## Post-Installation Checklist

After successful installation:
- [ ] Desktop shortcut created
- [ ] Application opens in browser
- [ ] Camera access granted
- [ ] QR scanner gun connected (if available)
- [ ] Test scan and PDF generation
- [ ] Bookmark the application URL

**Ready to start scanning!**

---

**Copyright © 2025 NMIMS (Narsee Monjee Institute of Management Studies)**

Made with ❤️ in MPSTME
