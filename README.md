# 📖 Booklet Scanner

A powerful web-based document scanning application with QR code detection, automatic PDF generation, and professional document processing capabilities.

## ✨ Features

- 📷 **Live Camera Scanning** - Real-time document capture with OpenCV
- 🔍 **QR Code Detection** - Multiple detection methods including scanner gun support
- 📄 **PDF Generation** - Automatic PDF creation with customizable settings
- 🖼️ **Image Processing** - Advanced image enhancement and rotation
- 📱 **Web Interface** - Modern, responsive web UI
- 🔧 **Settings Management** - Persistent configuration storage
- 🚀 **Easy Installation** - One-click installer with automatic Python setup

## 🚀 Quick Installation

### Option 1: One-Click Installer (Recommended)
1. Download `install-booklet-scanner.bat` from this repository
2. Create an empty folder and put the file there
3. Double-click the file
4. Wait for automatic installation
5. **Booklet Scanner starts automatically with desktop shortcut created!**

### Option 2: Full Deployment Manager
1. Download `deploy-manager.bat` and `deploy-config.bat`
2. Put both files in an empty folder
3. Run `deploy-manager.bat`
4. Follow the prompts
5. **Desktop shortcut with NMIMS logo created automatically!**

## 📋 System Requirements

- **Windows 7/8/10/11** (32-bit or 64-bit)
- **50 MB** free disk space
- **Internet connection** (for initial download)
- **Webcam or camera** (for scanning)
- **Administrator rights** (for Python installation)

## 🔧 What's Included

### Core Components:
- **Backend Server** - Python-based API server
- **Frontend Interface** - Modern web application
- **Camera System** - OpenCV-powered camera management
- **PDF Engine** - Advanced PDF generation and processing
- **Settings System** - Persistent configuration management

### Advanced Features:
- **QR Code Integration** - Support for barcode scanner guns
- **Image Enhancement** - Automatic image processing
- **Multi-threading** - Responsive user interface
- **WebSocket Support** - Real-time communication
- **Auto-shutdown** - Power management features

## 🎯 Usage

1. **Start the Application** - Run the installer or `start.bat`
2. **Open Web Interface** - Browser opens automatically to scanner interface
3. **Position Document** - Place document in camera view
4. **Scan QR Code** - Use camera or scanner gun for QR detection
5. **Capture Images** - Click capture for each page
6. **Generate PDF** - Automatic PDF creation with detected QR code filename
7. **Download Results** - PDFs saved to local storage

## 🔄 Updating

To update your installation:
- Run the same installer file again
- It will detect existing installation and offer to update
- Automatic backup of previous version
- Seamless upgrade process

## 📁 Project Structure

```
BookletDC/
├── backend/          # Python server and APIs
├── frontend/         # Web interface and static files
├── data/            # Settings and configuration
├── storage/         # Generated PDFs and images
├── PythonSetup/     # Python installer (included)
├── start.bat        # Application launcher
└── deploy-*.bat     # Installation scripts
```

## 🛠️ Development

### Manual Setup (Developers):
```bash
git clone https://github.com/sunny-nanade/BookletDC.git
cd BookletDC
# Run start.bat (Python will auto-install)
start.bat
```

### Dependencies:
- Python 3.9.13 (auto-installed)
- OpenCV (camera processing)
- FastAPI (web server)
- WebSockets (real-time communication)
- PIL/Pillow (image processing)

## 📞 Support

### Having Issues?
1. **Check** that you have internet connectivity
2. **Run as Administrator** if installation fails
3. **Create an issue** on this GitHub repository
4. **Include** your Windows version and any error messages

### Common Solutions:
- **Permission errors:** Run as Administrator
- **Network issues:** Check firewall settings
- **Camera problems:** Ensure camera permissions are enabled
- **Python issues:** Use included Python installer

## 📄 License

Check the repository for licensing information.

## 🏗️ Built With

- **Python** - Backend server and processing
- **FastAPI** - Web framework
- **OpenCV** - Computer vision and camera handling
- **JavaScript** - Frontend interactivity
- **HTML/CSS** - User interface
- **WebSockets** - Real-time communication

## 🎉 Getting Started

Ready to start scanning? Download the installer and you'll be up and running in minutes!

[📥 Download Install-booklet-scanner.bat](https://github.com/sunny-nanade/BookletDC/raw/main/install-booklet-scanner.bat)

---

**Happy Scanning!** 📸✨
