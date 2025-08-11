# 🏗️ Architecture Overview

## 🎯 System Design

Booklet Scanner is built as a **modular web-based application** with clear separation between frontend interface and backend processing.

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Browser Interface                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Camera View   │ │  QR Detection   │ │  PDF Preview    ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/WebSocket API
┌──────────────────────▼──────────────────────────────────────┐
│                FastAPI Backend Server                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │  Camera API     │ │   PDF Engine    │ │  Settings API   ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└──────────────────────┬──────────────────────────────────────┘
                       │ File System
┌──────────────────────▼──────────────────────────────────────┐
│                   Storage Layer                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ Captured Images │ │ Generated PDFs  │ │  Configuration  ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Core Components

### 1. Frontend Layer (`frontend/`)

#### **Static Web Interface**
- **Technology:** HTML5, CSS3, Modern JavaScript
- **Framework:** Vanilla JavaScript with Web APIs
- **Features:** Camera access, real-time preview, responsive design

#### **Key Modules:**
- **`camera-manager.js`** - Camera stream handling and capture
- **`qr-detector.js`** - QR code detection using multiple methods
- **`pdf-generator.js`** - Client-side PDF coordination
- **`settings-manager.js`** - Configuration management
- **`websocket-handler.js`** - Real-time communication

### 2. Backend Layer (`backend/`)

#### **FastAPI Server**
- **Technology:** Python 3.9+, FastAPI, Uvicorn
- **Architecture:** Async/await, RESTful APIs, WebSocket support
- **Port:** 9000 (configurable)

#### **API Modules:**
```python
backend/
├── main.py              # FastAPI application entry point
├── api/
│   ├── camera.py        # Camera stream and capture endpoints
│   ├── pdf_api.py       # PDF generation and management
│   ├── scanner.py       # QR code processing
│   ├── settings.py      # Configuration management
│   ├── image_storage.py # Image file operations
│   └── websocket_handler.py # Real-time communication
└── core/                # Core business logic
```

### 3. Storage Layer (`storage/`)

#### **File Organization:**
```
storage/
├── scanned_images/      # Raw captured images
├── processed_images/    # Enhanced/rotated images
├── temp_images/         # Temporary processing files
├── generated_pdfs/      # Final PDF outputs
└── final_pdfs/          # User-downloaded PDFs
```

#### **Configuration:**
```
data/
└── settings/
    └── global_settings.json # Application configuration
```

## 🔄 Data Flow

### 1. Image Capture Flow
```
Camera → WebRTC → Canvas → Base64 → API → OpenCV → Storage
```

1. **Browser** captures camera stream via WebRTC
2. **Canvas** renders current frame
3. **JavaScript** converts to Base64 image data
4. **API call** sends image to backend
5. **OpenCV** processes and enhances image
6. **Storage** saves processed image with metadata

### 2. QR Code Detection Flow
```
Input → Multiple Detectors → Validation → Filename Extraction
```

1. **Camera** or **Scanner Gun** provides QR data
2. **Multiple detection methods** process input:
   - Browser-based detection (jsQR)
   - Backend OpenCV detection
   - Hardware scanner gun input
3. **Validation** ensures QR code format
4. **Filename extraction** for PDF naming

### 3. PDF Generation Flow
```
Images → PDF Engine → Compression → Storage → Download
```

1. **Collected images** from capture session
2. **PDF engine** (ReportLab/PIL) creates document
3. **Compression** optimizes file size
4. **Storage** saves with metadata
5. **Download** provides file to user

## 🔌 API Architecture

### RESTful Endpoints

#### **Camera Operations:**
```http
GET  /api/camera/stream          # Camera stream access
POST /api/camera/capture         # Capture single image
GET  /api/camera/settings        # Camera configuration
POST /api/camera/settings        # Update camera config
```

#### **PDF Operations:**
```http
POST /api/pdf/generate           # Create PDF from images
GET  /api/pdf/list              # List generated PDFs
GET  /api/pdf/download/{id}     # Download specific PDF
DELETE /api/pdf/{id}            # Delete PDF
```

#### **QR Scanner:**
```http
POST /api/scanner/detect        # Process QR code data
GET  /api/scanner/history       # QR scan history
POST /api/scanner/validate      # Validate QR format
```

#### **Settings Management:**
```http
GET  /api/settings              # Get all settings
POST /api/settings              # Update settings
GET  /api/settings/{category}   # Get category settings
```

### WebSocket Endpoints

#### **Real-time Communication:**
```
/ws/camera          # Live camera feed updates
/ws/scanner         # QR scanner events
/ws/pdf             # PDF generation progress
/ws/system          # System status updates
```

## 🧵 Concurrency Model

### Backend Threading:
- **Main thread** - FastAPI server and API handling
- **Camera thread** - OpenCV camera operations
- **Processing thread** - Image enhancement and PDF generation
- **WebSocket thread** - Real-time event broadcasting

### Frontend Asynchronous:
- **Main UI thread** - User interface and interactions
- **Camera worker** - Video stream processing
- **PDF worker** - Client-side PDF coordination
- **WebSocket handler** - Real-time updates

## 🔧 Technology Stack

### **Backend Technologies:**
- **FastAPI** - Modern Python web framework
- **OpenCV** - Computer vision and image processing
- **ReportLab** - PDF generation and manipulation
- **Pillow (PIL)** - Image processing library
- **WebSockets** - Real-time bidirectional communication
- **Uvicorn** - ASGI server for production

### **Frontend Technologies:**
- **HTML5** - Modern web standards
- **CSS3** - Responsive design and animations
- **JavaScript ES6+** - Modern JavaScript features
- **WebRTC** - Camera and media access
- **Canvas API** - Image manipulation
- **jsQR** - Client-side QR detection

### **Development Tools:**
- **Python 3.9+** - Backend development
- **Git** - Version control
- **GitHub** - Repository hosting and deployment
- **Batch Scripts** - Windows automation and deployment

## 🚀 Performance Considerations

### **Optimization Strategies:**

#### **Image Processing:**
- **Lazy loading** - Images processed only when needed
- **Compression** - Automatic image size optimization
- **Caching** - Temporary storage for faster access
- **Threading** - Non-blocking image operations

#### **PDF Generation:**
- **Streaming** - Large PDFs generated in chunks
- **Compression** - Optimized file sizes
- **Background processing** - Non-blocking generation
- **Progress tracking** - Real-time user feedback

#### **Memory Management:**
- **Cleanup** - Automatic temporary file removal
- **Limits** - Maximum image count per session
- **Garbage collection** - Python memory optimization
- **Storage rotation** - Automatic old file cleanup

## 🔒 Security Architecture

### **Input Validation:**
- QR code format validation
- Image size and type restrictions
- API parameter sanitization
- File upload security

### **Access Control:**
- Local-only server binding (127.0.0.1)
- No external network exposure
- File system access restrictions
- Browser same-origin policy

### **Data Protection:**
- Temporary file cleanup
- No persistent user data storage
- Local-only processing
- No cloud data transmission

---

## 📚 Further Reading

- **[API Documentation](API-Documentation)** - Detailed API reference
- **[Development Setup](Development-Setup)** - Setting up development environment
- **[Performance Optimization](Performance-Optimization)** - Advanced performance tuning
- **[Security Considerations](Security-Considerations)** - Security best practices

---

*This architecture supports scalable, maintainable, and secure document scanning operations.*
