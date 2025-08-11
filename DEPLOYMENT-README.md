# Booklet Scanner - GitHub Deployment System

This deployment system allows users to easily install and update your Booklet Scanner project directly from GitHub.

## 📁 Deployment Files

### 1. **`install-booklet-scanner.bat`** - One-Click Installer
- **Simplest option** for end users
- Single file that downloads and starts the application
- Perfect for quick testing or sharing

### 2. **`deploy-manager.bat`** - Full Deployment Manager  
- **Recommended for regular users**
- Handles updates, backups, and error recovery
- More robust with detailed status messages
- Works with both Git and ZIP downloads

### 3. **`deploy-simple.bat`** - Simple ZIP-based Installer
- Uses ZIP download (no Git required)
- Good balance between simplicity and features
- Handles existing installations

### 4. **`deploy-booklet-scanner.bat`** - Git-based Installer
- **For advanced users** with Git installed
- Uses `git clone` and `git pull` for updates
- Most efficient for frequent updates

### 5. **`deploy-config.bat`** - Configuration File
- Central configuration for all deployment scripts
- Edit once to set your GitHub repository details

## 🚀 Setup Instructions

### Step 1: Configure Your Repository
1. Edit `deploy-config.bat`
2. Change `your-username` to your GitHub username
3. Update repository name if different from "BookletDC"
4. Save the file

### Step 2: Choose Your Deployment Method
Pick ONE of these approaches:

#### Option A: Full Featured (Recommended)
- Upload `deploy-manager.bat` and `deploy-config.bat` to your GitHub repository
- Users download both files to an empty folder and run `deploy-manager.bat`

#### Option B: Single File
- Edit `install-booklet-scanner.bat` and update the repository settings at the top
- Upload to GitHub repository  
- Users download just this one file and run it

#### Option C: Git-based
- Upload `deploy-booklet-scanner.bat` to your repository
- Users need Git installed, but get the most efficient updates

## 📝 User Instructions

### For Option A (Recommended):
1. Download `deploy-manager.bat` and `deploy-config.bat`
2. Put them in an empty folder
3. Run `deploy-manager.bat`
4. Follow the prompts

### For Option B (Simplest):
1. Download `install-booklet-scanner.bat`
2. Put it in an empty folder  
3. Run it
4. Everything happens automatically

## 🔄 How Updates Work

When users run the deployment script again:
- **Existing installation detected** → Offers to update
- **Downloads latest version** from GitHub
- **Backs up existing** version (if updating)
- **Replaces with new version**
- **Starts the application** automatically

## 🛠️ Features

### ✅ What It Does:
- Downloads/clones your project from GitHub
- Handles Python auto-installation (via your `start.bat`)
- Updates existing installations
- Provides detailed status messages
- Automatic error recovery
- Backup/restore functionality

### ✅ Works With:
- Public GitHub repositories
- Private repositories (with authentication)
- Any branch (configurable)
- Windows 7, 8, 10, 11
- Both Git and non-Git environments

### ✅ Handles:
- Network connectivity issues
- Corrupted downloads
- Missing dependencies
- Update conflicts
- User interruptions

## 🎯 Distribution Strategy

### For Public Release:
1. **GitHub Releases**: Attach `install-booklet-scanner.bat` to your releases
2. **Repository Root**: Keep `deploy-manager.bat` + `deploy-config.bat` in root
3. **Documentation**: Add installation instructions to your README

### For Team/Private Use:
1. Use Git-based deployment for team members
2. Configure private repository access
3. Include in your development workflow

## 🔧 Customization

### Branding:
- Edit the ASCII art and app name in the scripts
- Update version numbers
- Modify status messages

### Repository Structure:
- Scripts expect `start.bat` in the project root
- Update paths if your structure is different
- Add additional verification steps as needed

### Advanced Options:
- Support multiple branches
- Add checksum verification
- Include pre/post installation hooks
- Custom dependency checking

## 🚨 Important Notes

1. **Repository Configuration**: Users must update `GITHUB_USER` in config files
2. **Internet Required**: All methods require internet for initial download
3. **PowerShell Dependency**: ZIP-based methods require PowerShell (standard on Windows)
4. **Git Dependency**: Git-based method requires Git installation
5. **Admin Rights**: May be needed for Python installation

## 📖 Example Usage

```batch
REM User downloads deploy-manager.bat and deploy-config.bat
REM Edits deploy-config.bat to set repository details
REM Runs the deployment manager

deploy-manager.bat

REM Output:
REM ================================================================
REM  Booklet Scanner - GitHub Deployment Manager v1.0
REM ================================================================
REM Repository: https://github.com/yourusername/BookletDC
REM Branch: main
REM Target: C:\Users\Username\Desktop\Test\BookletDC
REM ================================================================
REM 
REM [STEP 1/6] Checking system requirements...
REM [OK] PowerShell available
REM [OK] Internet connectivity confirmed
REM 
REM [STEP 2/6] Analyzing existing installation...
REM [INFO] No existing installation found
REM 
REM [STEP 3/6] Installing Booklet Scanner from GitHub...
REM [INFO] Downloading from: https://github.com/yourusername/BookletDC/archive/refs/heads/main.zip
REM [INFO] Please wait, this may take a few minutes...
REM [OK] Download completed
REM 
REM [STEP 4/6] Extracting project files...
REM [OK] Files extracted successfully
REM 
REM [STEP 5/6] Verifying installation...
REM [OK] Installation verified successfully
REM 
REM [STEP 6/6] Starting Booklet Scanner...
REM ================================================================
REM  Launching Booklet Scanner...
REM ================================================================
REM 
REM Starting Booklet Scanner Application...
REM [Continues with your start.bat...]
```

This system makes it incredibly easy for users to install and keep your Booklet Scanner project updated! 🎉
