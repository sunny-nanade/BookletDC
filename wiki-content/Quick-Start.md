# 🚀 Quick Start Guide

Get up and running with Booklet Scanner in just 5 minutes!

## ⚡ Installation (2 minutes)

1. **Download** [`install-booklet-scanner.bat`](https://github.com/sunny-nanade/BookletDC/raw/main/install-booklet-scanner.bat)
2. **Create** empty folder and place the file there
3. **Double-click** the installer
4. **Wait** for automatic setup
5. **Application starts automatically!**

## 📱 First Scan (3 minutes)

### Step 1: Camera Setup
- Browser opens to `http://127.0.0.1:9000`
- **Allow camera access** when prompted
- Position your document in camera view
- Adjust lighting for clear visibility

### Step 2: QR Code Detection
Choose your scanning method:

#### 📷 Camera QR Detection
- Point camera at QR code
- Wait for automatic detection
- Green highlight indicates successful scan

#### 🔫 Scanner Gun (if available)
- Connect USB barcode scanner
- Focus on QR code input field
- Scan QR code with scanner gun
- Filename automatically populated

### Step 3: Document Capture
- **Position document** in camera frame
- **Click "Capture"** button for each page
- **Review** captured images in preview
- **Rotate** images if needed

### Step 4: PDF Generation
- **Click "Generate PDF"** button
- **Enter filename** (auto-filled from QR code)
- **Download** your PDF automatically
- **Find files** in `storage/generated_pdfs/`

## 🎯 Basic Workflow

```
📋 Place Document → 🔍 Scan QR Code → 📸 Capture Pages → 📄 Generate PDF
```

### Typical 5-Page Document:
1. **Scan QR code** (automatic filename)
2. **Capture page 1** → click Capture
3. **Capture page 2** → click Capture  
4. **Capture page 3** → click Capture
5. **Capture page 4** → click Capture
6. **Capture page 5** → click Capture
7. **Generate PDF** → download complete!

## ⚙️ Essential Settings

### Camera Configuration:
- **Resolution:** Auto-detected (usually 1280x720)
- **Quality:** High (adjustable in settings)
- **Rotation:** Manual rotation controls available

### PDF Settings:
- **Format:** A4 (default)
- **Quality:** High compression
- **Naming:** QR code + timestamp
- **Storage:** Local `storage/` folder

### QR Scanner Options:
- **Camera detection:** Always enabled
- **Scanner gun:** Auto-detected when connected
- **Manual entry:** Available as fallback

## 🔧 Quick Tips

### 📸 Better Image Quality:
- **Good lighting** - avoid shadows
- **Steady hands** - use capture button, not keyboard
- **Document flat** - place on flat surface
- **Fill frame** - document should fill most of camera view

### 🔍 QR Code Best Practices:
- **Clean codes** - ensure QR code is not damaged
- **Proper size** - QR code should be clearly visible
- **Good contrast** - dark QR on light background
- **Scanner position** - hold scanner 4-6 inches from code

### 📄 PDF Organization:
- **Consistent naming** - use QR codes for automatic naming
- **Regular cleanup** - periodically clean `storage/` folder
- **Backup important** - copy important PDFs to safe location

## 🚨 Quick Troubleshooting

### Camera Issues:
- **No camera feed?** → Check camera permissions in browser
- **Poor quality?** → Improve lighting, clean camera lens
- **Wrong camera?** → Select correct camera in settings

### QR Code Issues:
- **Not detecting?** → Ensure QR code is clean and well-lit
- **Scanner gun not working?** → Check USB connection, try different port
- **Manual entry?** → Click QR input field and type filename

### PDF Issues:
- **PDF not generating?** → Check that images were captured
- **Download failed?** → Check browser download permissions
- **File not found?** → Look in `storage/generated_pdfs/` folder

## 📚 Next Steps

Once you're comfortable with basic scanning:

- **Explore [Settings](Settings-Configuration)** - customize your experience
- **Learn [Advanced Features](User-Guide)** - boost your productivity  
- **Read [QR Code Guide](QR-Code-Features)** - maximize QR scanner potential
- **Check [Troubleshooting](Troubleshooting)** - solve common issues

## 📞 Need Help?

- **[Full User Guide](User-Guide)** - detailed instructions
- **[FAQ](FAQ)** - frequently asked questions
- **[GitHub Issues](https://github.com/sunny-nanade/BookletDC/issues)** - report problems
- **[Discussions](https://github.com/sunny-nanade/BookletDC/discussions)** - community support

---

**Happy Scanning!** 📸✨

*Time to first PDF: Under 5 minutes!*
