# Python Setup for Booklet Scanner

## ✅ Automatic Python Installation (Ready to Use!)

This folder contains the Python installer for automatic setup.

### 🎉 **INCLUDED:** 
The Python installer (`python-3.9.13-amd64.exe`) is **already included** in this project!
**No download required** - everything is ready to go!

### How It Works:
When you run `start.bat` and Python is not installed, it will:

✅ **Automatically install Python 3.9.13 with these options:**
- Add Python to PATH
- Install for all users
- Disable path length limit (Windows limitation fix)
- Include pip (package manager)
- Include tcl/tk and IDLE
- Associate .py files with Python
- Show installation progress in the command window

### 🚀 **Quick Start:**
1. Run `start.bat` 
2. If Python is missing, it will auto-install (no user action needed!)
3. Your Booklet Scanner app will start automatically

### Installation Options Explained:

| Option | What it does |
|--------|-------------|
| **Add to PATH** | Makes `python` and `py` commands available from any folder |
| **Install for all users** | All Windows users can use Python (requires admin rights) |
| **Disable path limit** | Fixes Windows 260-character path limitation (recommended) |
| **Include pip** | Installs package manager for additional Python libraries |
| **Associate files** | Double-clicking .py files runs them with Python |

### Manual Installation:
If automatic installation doesn't work:
1. Navigate to `D:\BookletDC\PythonSetup\`
2. Double-click `python-3.9.13-amd64.exe` to run it manually
3. Check these options during installation:
   - ✅ "Add Python to PATH"
   - ✅ "Install for all users" (optional)
   - ✅ Under "Advanced Options": "Add Python to environment variables"

### Verification:
- Run `check-python.bat` to verify your Python installation
- Or run `start.bat` which will check and install if needed

### Troubleshooting:
- If installation fails, try running `start.bat` as Administrator
- If Python still not found after installation, restart your computer
- The installer is already included - no download needed!
