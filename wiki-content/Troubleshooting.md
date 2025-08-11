# 🚨 Troubleshooting Guide

## 🔍 Quick Diagnostics

### System Health Check:
1. **Camera Access** - Can you see camera feed?
2. **QR Detection** - Does QR scanner work?
3. **PDF Generation** - Can you create PDFs?
4. **File Access** - Are files saving to storage folder?

### Common Quick Fixes:
- **Restart application** - Close and run `start.bat` again
- **Refresh browser** - Press F5 or Ctrl+F5
- **Check permissions** - Run as Administrator
- **Clear cache** - Clear browser cache and temp files

## 📸 Camera Issues

### ❌ No Camera Feed Visible

#### **Cause:** Browser permissions denied
**Solution:**
1. Click camera icon in browser address bar
2. Select "Allow" for camera access
3. Refresh the page
4. Try different browser if issue persists

#### **Cause:** Wrong camera selected
**Solution:**
1. Open browser settings → Privacy & Security → Camera
2. Ensure correct camera is selected
3. Try accessing from `chrome://settings/content/camera`

#### **Cause:** Camera in use by another application
**Solution:**
```bash
# Check running processes
tasklist | findstr -i camera
tasklist | findstr -i skype
tasklist | findstr -i teams

# Close conflicting applications
taskkill /IM skype.exe /F
taskkill /IM teams.exe /F
```

### ❌ Poor Image Quality

#### **Solution: Lighting and positioning**
- **Improve lighting** - Use bright, even lighting
- **Clean camera lens** - Wipe camera with soft cloth
- **Stable positioning** - Keep camera steady during capture
- **Document positioning** - Fill camera frame with document

#### **Solution: Camera settings**
1. Check camera resolution in settings
2. Adjust quality settings in application
3. Try different camera if multiple available

### ❌ Camera Freezing or Lagging

#### **Solution: Performance optimization**
```javascript
// Check browser performance
console.log(navigator.hardwareConcurrency); // CPU cores
console.log(navigator.deviceMemory); // RAM GB
```

- **Close other browser tabs**
- **Close unnecessary applications**
- **Lower camera resolution** in settings
- **Restart browser**

## 🔍 QR Code Detection Issues

### ❌ QR Code Not Detected

#### **Camera-based detection:**
- **Better lighting** - Ensure QR code is well-lit
- **Clean QR code** - Remove smudges or damage
- **Proper distance** - Hold 4-6 inches from camera
- **Steady hands** - Keep QR code stable in view

#### **Scanner gun issues:**
```bash
# Check USB connection
# Windows Device Manager → Ports (COM & LPT)
# Look for "USB Serial Port" or similar

# Test scanner gun
# Open Notepad and scan QR code
# Should type text directly
```

### ❌ Scanner Gun Not Working

#### **USB Connection Issues:**
1. **Try different USB port**
2. **Check device manager** for unrecognized devices
3. **Restart computer** with scanner connected
4. **Test with notepad** - scan should type text

#### **Driver Issues:**
- Most scanner guns work as HID devices (no drivers needed)
- If not working, check manufacturer website for drivers
- Try "USB HID" mode in scanner settings

#### **Configuration Issues:**
```
Scanner Gun Settings:
- Mode: USB HID or Keyboard Wedge
- Terminator: CR+LF (Enter key)
- Format: Plain text (no formatting)
```

## 📄 PDF Generation Issues

### ❌ PDF Not Generating

#### **Cause:** No images captured
**Solution:**
1. Ensure images are captured first
2. Check preview shows captured images
3. Verify images in `storage/scanned_images/`

#### **Cause:** Insufficient disk space
**Solution:**
```bash
# Check disk space
dir /s storage\

# Clean temporary files
del /q storage\temp_images\*
del /q storage\processed_images\*
```

#### **Cause:** Permission errors
**Solution:**
- Run application as Administrator
- Check folder permissions for `storage/` directory
- Ensure antivirus isn't blocking file creation

### ❌ PDF Download Failed

#### **Browser download issues:**
1. **Check browser download settings**
2. **Clear browser downloads folder**
3. **Try different browser**
4. **Check browser download permissions**

#### **File access issues:**
```bash
# Check if PDF was created
dir storage\generated_pdfs\

# Manual download
# Navigate to storage/generated_pdfs/ in file explorer
# Copy desired PDF file
```

## 🐍 Python Installation Issues

### ❌ Python Not Found

#### **Error:** `'python' is not recognized as internal or external command`

**Solution 1: Automatic Python installation**
```bash
# Run installer again
install-booklet-scanner.bat

# Or run start script (auto-installs Python)
start.bat
```

**Solution 2: Manual Python installation**
1. Download Python 3.9.13 from python.org
2. **Important:** Check "Add Python to PATH" during installation
3. Restart Command Prompt
4. Verify: `python --version`

### ❌ Anaconda Conflicts

#### **Error:** `batch label not found` or similar conda errors

**Solution: Use Anaconda-safe launcher**
```bash
# Run Anaconda-compatible installer
start_anaconda_safe.bat

# Or detect and use appropriate launcher
install-booklet-scanner.bat
```

**Manual Anaconda fix:**
```bash
# Activate base conda environment
conda activate base

# Install in conda environment
conda install pip
pip install -r requirements.txt

# Run with conda
conda run python backend/main.py
```

### ❌ Package Installation Failed

#### **Pip errors:**
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Clear pip cache
pip cache purge

# Install with verbose output
pip install -r requirements.txt -v

# Force reinstall
pip install -r requirements.txt --force-reinstall
```

#### **Network issues:**
```bash
# Try different index
pip install -r requirements.txt -i https://pypi.org/simple/

# Use trusted hosts
pip install -r requirements.txt --trusted-host pypi.org --trusted-host pypi.python.org
```

## 🌐 Network and Firewall Issues

### ❌ Server Won't Start

#### **Port 9000 already in use:**
```bash
# Find process using port 9000
netstat -ano | findstr :9000

# Kill process (replace PID with actual process ID)
taskkill /PID 1234 /F

# Or use different port
uvicorn backend.main:app --port 9001
```

### ❌ Firewall Blocking Application

#### **Windows Firewall:**
1. **Windows Security** → **Firewall & network protection**
2. **Allow an app through firewall**
3. **Add Python.exe** and **uvicorn** to allowed apps
4. **Allow both private and public networks**

#### **Corporate networks:**
- Contact IT department for firewall exceptions
- Use application on local machine only (127.0.0.1)
- Request ports 9000-9010 to be opened for local development

## 💾 Storage and File Issues

### ❌ Files Not Saving

#### **Permission errors:**
```bash
# Check folder permissions
icacls storage\

# Grant full control to current user
icacls storage\ /grant %USERNAME%:F /T

# Create directories if missing
mkdir storage\scanned_images
mkdir storage\generated_pdfs
mkdir storage\processed_images
mkdir storage\temp_images
```

### ❌ Disk Space Issues

#### **Clean temporary files:**
```bash
# Clean application temp files
del /q storage\temp_images\*
del /q storage\processed_images\*

# Clean system temp files
del /q %TEMP%\*

# Check disk space
dir /s storage\
```

## 🔧 Advanced Troubleshooting

### Debug Mode

#### **Enable detailed logging:**
```python
# Add to backend/main.py
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

#### **Browser debug console:**
```javascript
// Open browser DevTools (F12)
// Check Console tab for errors
// Enable verbose logging
localStorage.setItem('debug', 'true');
location.reload();
```

### Performance Issues

#### **Memory usage:**
```bash
# Check Python memory usage
tasklist /FI "IMAGENAME eq python.exe"

# Restart if memory usage > 500MB
taskkill /IM python.exe /F
start.bat
```

#### **Camera performance:**
```javascript
// Check camera frame rate
// Browser DevTools → Console
navigator.mediaDevices.getSupportedConstraints();
```

### System Information Collection

#### **For bug reports, collect:**
```bash
# System information
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"

# Python version
python --version

# Installed packages
pip list

# Camera devices
# Browser: chrome://settings/content/camera

# Recent errors
# Check Windows Event Viewer → Application logs
```

## 📞 Getting Additional Help

### Before Reporting Issues:

1. **Try all solutions** in this troubleshooting guide
2. **Collect system information** (OS version, Python version, error messages)
3. **Screenshots** of error messages
4. **Steps to reproduce** the issue

### Report Issues:

- **GitHub Issues:** [Create New Issue](https://github.com/sunny-nanade/BookletDC/issues/new)
- **Include system info, error messages, and screenshots**
- **Tag with appropriate labels** (bug, help wanted, etc.)

### Community Support:

- **GitHub Discussions:** [Join Discussion](https://github.com/sunny-nanade/BookletDC/discussions)
- **Search existing issues** before creating new ones
- **Help others** with similar issues

---

## ✅ Prevention Tips

### Regular Maintenance:
- **Weekly cleanup** of temp files
- **Monthly restart** of application
- **Keep Windows updated**
- **Update browser regularly**

### Best Practices:
- **Run as Administrator** when needed
- **Close other camera applications** before starting
- **Ensure good lighting** for scanning
- **Regular backup** of important PDFs

---

**Most issues resolved in under 5 minutes!** ⚡

*Need more help? Check our [FAQ](FAQ) or [Community Discussions](https://github.com/sunny-nanade/BookletDC/discussions)*
