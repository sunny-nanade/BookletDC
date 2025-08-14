# Development Setup

## Prerequisites

### System Requirements
- **Operating System:** Windows 10/11, macOS 10.14+, or Linux Ubuntu 18.04+
- **RAM:** Minimum 4GB, Recommended 8GB+
- **Storage:** 2GB free space
- **Camera:** Built-in webcam or external USB camera
- **Internet:** Required for initial setup and package downloads

### Required Software
- **Python 3.9+** (3.9.13 recommended)
- **Git** (for cloning repository)
- **Modern web browser** (Chrome 90+, Firefox 88+, Edge 90+)
- **Code editor** (VS Code recommended)

## Development Environment Setup

### 1. Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/sunny-nanade/BookletDC.git
cd BookletDC

# Or download and extract ZIP
# Right-click download link → "Save link as"
# Extract to desired directory
```

### 2. Python Environment Setup

#### Option A: Automatic Setup (Recommended)
```bash
# Windows
start.bat

# macOS/Linux
chmod +x start.sh
./start.sh
```

#### Option B: Manual Setup
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Verify Installation

```bash
# Check Python version
python --version
# Should output: Python 3.9.x

# Check installed packages
pip list

# Test application
python backend/main.py
```

### 4. Development Tools Setup

#### VS Code Extensions (Recommended)
```json
{
    "recommendations": [
        "ms-python.python",
        "ms-python.pylint",
        "ms-python.black-formatter",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-json"
    ]
}
```

#### Git Configuration
```bash
# Set up Git (if not already configured)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Create development branch
git checkout -b development
```

## Project Structure

### Directory Overview
```
BookletDC/
├── README.md                   # Project documentation
├── requirements.txt            # Python dependencies
├── start.bat                   # Windows launcher
├── start.sh                    # Unix launcher
├── .gitignore                  # Git ignore rules
├── LICENSE                     # MIT License
│
├── backend/                    # Python backend
│   ├── main.py                 # FastAPI application entry
│   ├── api/                    # API modules
│   │   ├── __init__.py
│   │   ├── camera.py           # Camera handling
│   │   ├── scanner.py          # QR/barcode scanning
│   │   ├── pdf_api.py          # PDF generation
│   │   ├── image_storage.py    # File management
│   │   ├── settings.py         # Configuration
│   │   └── websocket_handler.py # WebSocket communication
│   └── core/                   # Core utilities
│
├── frontend/                   # Web frontend
│   └── static/                 # Static web assets
│       ├── css/                # Stylesheets
│       │   ├── main.css        # Main styles
│       │   ├── camera.css      # Camera interface
│       │   └── controls.css    # UI controls
│       └── js/                 # JavaScript modules
│           ├── main.js         # Main application
│           ├── camera-manager.js # Camera control
│           ├── qr-detector.js  # QR scanning
│           └── pdf-generator.js # PDF creation
│
└── storage/                    # Data storage
    ├── scanned_images/         # Captured images
    ├── generated_pdfs/         # Created PDFs
    ├── processed_images/       # Enhanced images
    └── temp_images/            # Temporary files
```

### Key Files

#### Backend Entry Point (`backend/main.py`)
```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from api import camera, scanner, pdf_api

app = FastAPI(title="Booklet Scanner", version="1.0.0")

# Mount static files
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# Include API routers
app.include_router(camera.router, prefix="/api")
app.include_router(scanner.router, prefix="/api")
app.include_router(pdf_api.router, prefix="/api")
```

#### Frontend Entry Point (`frontend/static/js/main.js`)
```javascript
// Main application initialization
class BookletScanner {
    constructor() {
        this.cameraManager = new CameraManager();
        this.qrDetector = new QRDetector();
        this.pdfGenerator = new PDFGenerator();
    }
    
    async initialize() {
        await this.cameraManager.initialize();
        this.qrDetector.start();
        this.setupEventListeners();
    }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new BookletScanner();
    app.initialize();
});
```

## Development Workflow

### 1. Starting Development Server

```bash
# Navigate to project directory
cd BookletDC

# Activate virtual environment (if using manual setup)
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Start development server
python backend/main.py

# Or use uvicorn directly
uvicorn backend.main:app --reload --host 127.0.0.1 --port 9000
```

### 2. Accessing Application

Open web browser and navigate to:
- **Application:** http://127.0.0.1:9000
- **API Documentation:** http://127.0.0.1:9000/docs
- **Alternative API Docs:** http://127.0.0.1:9000/redoc

### 3. Development Process

#### Making Changes
1. **Edit code** in your preferred editor
2. **Save changes** (auto-reload enabled)
3. **Test in browser** (refresh if needed)
4. **Check console** for errors
5. **Commit changes** when ready

#### Testing Changes
```bash
# Frontend testing
# Open browser DevTools (F12)
# Check Console tab for JavaScript errors
# Test camera functionality
# Verify QR scanning works

# Backend testing
# Check terminal output for Python errors
# Test API endpoints in browser or Postman
# Verify file operations work correctly
```

### 4. Code Quality

#### Python Code Style
```bash
# Install development tools
pip install black pylint pytest

# Format code
black backend/

# Lint code
pylint backend/

# Run tests (when available)
pytest tests/
```

#### JavaScript Code Style
```javascript
// Use consistent formatting
// Add comments for complex logic
// Follow ES6+ best practices
// Use async/await for promises
```

## Debugging

### Frontend Debugging

#### Browser DevTools
```javascript
// Open DevTools: F12 or Ctrl+Shift+I

// Console debugging
console.log('Debug message');
console.error('Error message');
console.warn('Warning message');

// Breakpoint debugging
debugger; // Pauses execution

// Network tab
// Monitor API requests and responses
// Check for failed requests
```

#### Camera Issues
```javascript
// Check camera permissions
navigator.permissions.query({name: 'camera'})
    .then(result => console.log(result.state));

// Test camera access
navigator.mediaDevices.getUserMedia({video: true})
    .then(stream => console.log('Camera OK'))
    .catch(error => console.error('Camera error:', error));
```

### Backend Debugging

#### Python Debugging
```python
# Add debug prints
print(f"Debug: {variable_name}")

# Use Python debugger
import pdb; pdb.set_trace()

# Enable FastAPI debug mode
app = FastAPI(debug=True)

# Detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### API Testing
```bash
# Test API endpoints with curl
curl -X GET http://127.0.0.1:9000/api/health

# Test file upload
curl -X POST -F "file=@test.jpg" http://127.0.0.1:9000/api/images/upload

# Check server logs
# Monitor terminal output for errors
```

## Common Development Tasks

### Adding New Features

#### 1. Frontend Feature
```javascript
// 1. Add HTML structure
<div id="new-feature">
    <button id="feature-button">New Feature</button>
</div>

// 2. Add CSS styling
#new-feature {
    /* Feature styles */
}

// 3. Add JavaScript functionality
class NewFeature {
    constructor() {
        this.button = document.getElementById('feature-button');
        this.setupEvents();
    }
    
    setupEvents() {
        this.button.addEventListener('click', this.handleClick.bind(this));
    }
    
    handleClick() {
        // Feature logic
    }
}
```

#### 2. Backend Feature
```python
# 1. Create API endpoint (backend/api/new_feature.py)
from fastapi import APIRouter

router = APIRouter()

@router.post("/new-feature")
async def handle_new_feature(data: dict):
    # Feature logic
    return {"status": "success"}

# 2. Add to main.py
from api import new_feature
app.include_router(new_feature.router, prefix="/api")
```

### Adding Dependencies

#### Python Dependencies
```bash
# Install new package
pip install package-name

# Update requirements.txt
pip freeze > requirements.txt

# Or add manually to requirements.txt
echo "package-name==1.0.0" >> requirements.txt
```

#### Frontend Dependencies
```html
<!-- Add to HTML head -->
<script src="https://cdn.jsdelivr.net/npm/package-name@1.0.0/dist/package.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/package-name@1.0.0/dist/package.min.css">
```

## Testing

### Manual Testing Checklist

#### Camera Functionality
- [ ] Camera initializes without errors
- [ ] Video preview displays correctly
- [ ] Image capture works
- [ ] Multiple cameras can be selected
- [ ] Camera permissions handled properly

#### QR Code Scanning
- [ ] QR codes detected from camera
- [ ] Scanner gun input works (if available)
- [ ] Invalid QR codes handled gracefully
- [ ] QR content displayed correctly

#### PDF Generation
- [ ] Images can be selected for PDF
- [ ] PDF generates without errors
- [ ] PDF downloads correctly
- [ ] Multiple images in single PDF work
- [ ] PDF quality is acceptable

#### File Operations
- [ ] Images save to storage directory
- [ ] Generated PDFs accessible
- [ ] Temporary files cleaned up
- [ ] Storage quota respected

### Automated Testing (Future)

```python
# Example test structure (tests/test_api.py)
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_image_upload():
    with open("test_image.jpg", "rb") as f:
        response = client.post("/api/images/upload", files={"file": f})
    assert response.status_code == 200
```

## Performance Optimization

### Frontend Optimization
```javascript
// Lazy load images
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.src = entry.target.dataset.src;
        }
    });
});

// Debounce user input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

### Backend Optimization
```python
# Use async/await for I/O operations
async def process_image(image_data):
    # Non-blocking image processing
    result = await some_async_operation(image_data)
    return result

# Implement caching
from functools import lru_cache

@lru_cache(maxsize=100)
def expensive_operation(param):
    # Cached expensive operation
    return result
```

## Deployment Preparation

### Production Checklist
- [ ] Remove debug code and console.log statements
- [ ] Update configuration for production
- [ ] Test with production-like data
- [ ] Verify all dependencies are in requirements.txt
- [ ] Check file permissions and security
- [ ] Test installation process on clean system

### Build Process
```bash
# Clean development artifacts
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} +

# Create distribution package
# (Future: setup.py or build scripts)

# Test installation package
# Run installer on clean virtual machine
```

## Contributing Guidelines

### Code Standards
- **Python:** Follow PEP 8 style guide
- **JavaScript:** Use ES6+ features, consistent indentation
- **Comments:** Document complex logic and API endpoints
- **Commits:** Use clear, descriptive commit messages

### Pull Request Process
1. **Create feature branch** from development
2. **Make changes** following code standards
3. **Test thoroughly** on multiple browsers/systems
4. **Update documentation** if needed
5. **Submit pull request** with clear description

### Issue Reporting
- **Use GitHub Issues** for bug reports and feature requests
- **Include system information** (OS, Python version, browser)
- **Provide steps to reproduce** for bugs
- **Add screenshots** when helpful

---

## Getting Help

### Documentation
- **README.md:** Getting started guide
- **API Docs:** http://127.0.0.1:9000/docs (when server running)
- **GitHub Wiki:** Comprehensive documentation

### Community
- **GitHub Discussions:** Ask questions and share ideas
- **Issues:** Report bugs and request features
- **Pull Requests:** Contribute code improvements

### Development Resources
- **FastAPI Documentation:** https://fastapi.tiangolo.com/
- **JavaScript MDN:** https://developer.mozilla.org/en-US/docs/Web/JavaScript
- **Python Documentation:** https://docs.python.org/3/

---

**Ready to start developing? Run `start.bat` and open http://127.0.0.1:9000**

---

**Copyright © 2025 NMIMS (Narsee Monjee Institute of Management Studies)**

Made with ❤️ in MPSTME
