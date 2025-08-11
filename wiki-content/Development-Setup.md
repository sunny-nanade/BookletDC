# 🛠️ Development Setup

## 🎯 Prerequisites

### Required Software:
- **Python 3.9+** (3.9.13 recommended)
- **Git** for version control
- **Modern web browser** (Chrome/Firefox recommended)
- **Code editor** (VS Code recommended)

### Optional Tools:
- **Anaconda/Miniconda** (for conda environments)
- **Postman** (for API testing)
- **Python debugger** (built into VS Code)

## 🚀 Quick Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/sunny-nanade/BookletDC.git
cd BookletDC
```

### 2. Environment Setup

#### Option A: Automatic Setup (Recommended)
```bash
# Windows
start.bat

# This will:
# - Install Python 3.9.13 if needed
# - Create virtual environment
# - Install all dependencies
# - Start development server
```

#### Option B: Manual Setup
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn backend.main:app --host 0.0.0.0 --port 9000 --reload
```

### 3. Verify Installation
- Open browser to `http://127.0.0.1:9000`
- Camera feed should be visible
- QR scanner should be functional
- PDF generation should work

## 📁 Project Structure

### Development Directory Layout:
```
BookletDC/
├── 📁 backend/                 # Python backend server
│   ├── main.py                 # FastAPI application entry
│   ├── 📁 api/                 # API endpoints
│   │   ├── camera.py           # Camera operations
│   │   ├── pdf_api.py          # PDF generation
│   │   ├── scanner.py          # QR code processing
│   │   ├── settings.py         # Configuration
│   │   └── websocket_handler.py # Real-time communication
│   └── 📁 core/                # Core business logic
│
├── 📁 frontend/                # Web interface
│   └── 📁 static/              # Static assets
│       ├── 📁 css/             # Stylesheets
│       ├── 📁 js/              # JavaScript modules
│       └── 📁 workers/         # Web Workers
│
├── 📁 data/                    # Configuration storage
│   └── 📁 settings/            # Application settings
│
├── 📁 storage/                 # Runtime data
│   ├── 📁 scanned_images/      # Captured images
│   ├── 📁 processed_images/    # Enhanced images
│   ├── 📁 generated_pdfs/      # Created PDFs
│   └── 📁 temp_images/         # Temporary files
│
├── requirements.txt            # Python dependencies
├── start.bat                   # Development launcher
└── 📁 deployment/              # Deployment scripts
```

## 🔧 Development Environment

### Python Virtual Environment:
```bash
# Create new environment
python -m venv booklet-dev

# Activate environment
booklet-dev\Scripts\activate  # Windows
source booklet-dev/bin/activate  # Linux/Mac

# Install development dependencies
pip install -r requirements.txt
pip install pytest  # For testing
pip install black   # For code formatting
```

### IDE Configuration (VS Code):

#### Recommended Extensions:
- **Python** - Python language support
- **Pylance** - Python language server
- **FastAPI** - FastAPI framework support
- **Live Server** - Frontend development server
- **GitLens** - Enhanced Git capabilities

#### Settings (.vscode/settings.json):
```json
{
    "python.defaultInterpreterPath": "./venv/Scripts/python.exe",
    "python.formatting.provider": "black",
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,
    "files.exclude": {
        "**/__pycache__": true,
        "**/venv": true,
        "**/storage": true
    }
}
```

## 🐛 Development Tools

### Backend Development:

#### FastAPI Development Server:
```bash
# Start with auto-reload
uvicorn backend.main:app --host 0.0.0.0 --port 9000 --reload

# Debug mode
uvicorn backend.main:app --host 0.0.0.0 --port 9000 --reload --log-level debug
```

#### API Documentation:
- **Swagger UI:** `http://127.0.0.1:9000/docs`
- **ReDoc:** `http://127.0.0.1:9000/redoc`

### Frontend Development:

#### Static File Server:
```bash
# Using Python (from frontend/ directory)
cd frontend
python -m http.server 8080

# Access at: http://localhost:8080
```

#### Browser Developer Tools:
- **F12** - Open DevTools
- **Console** - JavaScript debugging
- **Network** - API call monitoring
- **Sources** - Breakpoint debugging

## 🧪 Testing Setup

### Unit Testing:
```bash
# Install testing dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/

# Run with coverage
pytest --cov=backend tests/
```

### API Testing:
```bash
# Test specific endpoint
curl -X GET "http://127.0.0.1:9000/api/camera/settings"

# Test POST endpoint
curl -X POST "http://127.0.0.1:9000/api/camera/capture" \
     -H "Content-Type: application/json" \
     -d '{"quality": 95}'
```

### Frontend Testing:
- **Browser Console** - JavaScript error checking
- **Lighthouse** - Performance auditing
- **Camera simulation** - Use browser dev tools to simulate camera

## 🔄 Development Workflow

### 1. Feature Development:
```bash
# Create feature branch
git checkout -b feature/new-scanner-mode

# Make changes
# ... edit files ...

# Test changes
start.bat  # Verify functionality

# Commit changes
git add .
git commit -m "Add new scanner mode feature"

# Push branch
git push origin feature/new-scanner-mode
```

### 2. Code Quality:
```bash
# Format code
black backend/

# Lint code
pylint backend/

# Check imports
isort backend/

# Type checking
mypy backend/
```

### 3. Testing Cycle:
```bash
# Unit tests
pytest tests/unit/

# Integration tests
pytest tests/integration/

# End-to-end tests
pytest tests/e2e/

# Performance tests
pytest tests/performance/
```

## 🚀 Building and Deployment

### Development Build:
```bash
# Start development server
start.bat

# Or manual start
uvicorn backend.main:app --reload
```

### Production Build:
```bash
# Install production dependencies only
pip install -r requirements.txt --no-dev

# Start production server
uvicorn backend.main:app --host 0.0.0.0 --port 9000
```

### Creating Deployment Package:
```bash
# Run deployment manager
deploy-manager.bat

# Or create ZIP manually
7z a BookletScanner.zip * -x!venv -x!__pycache__ -x!.git
```

## 🔧 Configuration Files

### requirements.txt:
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
opencv-python==4.8.1.78
Pillow==10.0.1
reportlab==4.0.7
websockets==12.0
python-multipart==0.0.6
```

### .gitignore:
```gitignore
# Python
__pycache__/
*.pyc
*.pyo
venv/
env/

# Storage
storage/scanned_images/*
storage/processed_images/*
storage/generated_pdfs/*
storage/temp_images/*

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

## 📝 Development Best Practices

### Code Style:
- **PEP 8** compliance for Python
- **Consistent naming** conventions
- **Type hints** for function parameters
- **Docstrings** for all functions and classes

### Git Workflow:
- **Feature branches** for new development
- **Meaningful commit messages**
- **Small, focused commits**
- **Pull request reviews**

### Testing:
- **Unit tests** for all new functions
- **Integration tests** for API endpoints
- **Manual testing** for UI changes
- **Performance testing** for critical paths

## 🐛 Debugging Tips

### Common Issues:

#### Camera Not Working:
```python
# Check camera permissions in browser
# Try different camera indices
cv2.VideoCapture(0)  # Try 0, 1, 2...
```

#### Import Errors:
```python
# Check Python path
import sys
print(sys.path)

# Check virtual environment
import subprocess
subprocess.run(["pip", "list"])
```

#### Port Already in Use:
```bash
# Find process using port 9000
netstat -ano | findstr :9000

# Kill process
taskkill /PID <PID> /F
```

### Debug Mode:
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# FastAPI debug mode
app = FastAPI(debug=True)
```

## 📚 Additional Resources

- **[Architecture Overview](Architecture-Overview)** - System design
- **[API Documentation](API-Documentation)** - Endpoint reference
- **[Troubleshooting](Troubleshooting)** - Common issues
- **[Contributing Guide](Contributing-Guide)** - Contribution guidelines

---

**Happy Coding!** 💻✨

*Development environment setup complete in under 5 minutes!*
