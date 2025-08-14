# Architecture Overview

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │     Backend     │    │   File System  │
│                 │    │     (Python)    │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │ Frontend  │  │◄──►│  │ FastAPI   │  │◄──►│  │  Storage  │  │
│  │   (HTML/  │  │    │  │  Server   │  │    │  │  System   │  │
│  │ CSS/JS)   │  │    │  └───────────┘  │    │  └───────────┘  │
│  └───────────┘  │    │                 │    │                 │
│                 │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  ┌───────────┐  │    │  │   PDF     │  │    │  │   Temp    │  │
│  │  Camera   │  │    │  │Generator  │  │    │  │   Files   │  │
│  │  Access   │  │    │  └───────────┘  │    │  └───────────┘  │
│  └───────────┘  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Scanner Gun    │    │   WebSocket     │    │   Generated     │
│   (USB HID)     │    │ Communication   │    │     PDFs       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Breakdown

#### 1. Frontend Layer (Web Browser)
- **Technology:** HTML5, CSS3, JavaScript (ES6+)
- **Purpose:** User interface and camera interaction
- **Key Components:**
  - Camera capture interface
  - Real-time preview
  - QR code detection
  - PDF generation controls

#### 2. Backend Layer (Python)
- **Technology:** FastAPI, Uvicorn ASGI server
- **Purpose:** API services and business logic
- **Key Components:**
  - REST API endpoints
  - WebSocket handlers
  - PDF processing
  - File management

#### 3. Storage Layer (File System)
- **Technology:** Local file system
- **Purpose:** Persistent data storage
- **Key Components:**
  - Image storage
  - PDF generation
  - Configuration files
  - Temporary file management

## Detailed Component Architecture

### Frontend Components

#### Camera Manager
```javascript
class CameraManager {
    // Handles camera initialization, stream management
    // Real-time video preview
    // Image capture functionality
    // Device selection and configuration
}
```

**Responsibilities:**
- Initialize camera access
- Manage video stream
- Handle device switching
- Capture high-quality images

#### QR Detector
```javascript
class QRDetector {
    // Real-time QR code scanning
    // Integration with scanner gun input
    // Barcode format detection
    // Event handling for scanned codes
}
```

**Responsibilities:**
- Process camera frames for QR codes
- Handle scanner gun USB input
- Validate and decode barcodes
- Trigger scanning events

#### PDF Generator (Frontend)
```javascript
class PDFGenerator {
    // Client-side PDF creation
    // Image processing and optimization
    // Layout management
    // Download handling
}
```

**Responsibilities:**
- Collect captured images
- Apply image enhancements
- Generate PDF documents
- Handle file downloads

### Backend Components

#### API Layer (`backend/main.py`)
```python
from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Core API endpoints
@app.get("/api/health")
@app.post("/api/images/capture")
@app.post("/api/pdf/generate")
@app.get("/api/settings")
```

**Responsibilities:**
- HTTP request handling
- WebSocket communication
- Static file serving
- CORS management

#### Image Processing (`backend/api/scanner.py`)
```python
class ImageProcessor:
    def process_image(self, image_data):
        # Image enhancement algorithms
        # Noise reduction
        # Contrast optimization
        # Format conversion
```

**Responsibilities:**
- Image enhancement
- Format standardization
- Quality optimization
- Metadata extraction

#### PDF Service (`backend/api/pdf_api.py`)
```python
class PDFService:
    def create_pdf(self, images, metadata):
        # PDF document creation
        # Page layout management
        # Image embedding
        # Metadata addition
```

**Responsibilities:**
- PDF document generation
- Layout optimization
- Compression management
- Metadata embedding

#### Storage Manager (`backend/api/image_storage.py`)
```python
class StorageManager:
    def save_image(self, image, path):
        # File system operations
        # Directory management
        # Cleanup routines
        # Path validation
```

**Responsibilities:**
- File system operations
- Directory structure management
- Temporary file cleanup
- Storage optimization

## Data Flow Architecture

### Image Capture Flow

```
1. User Interaction
   ├── Camera capture button clicked
   ├── QR code scanned (camera or gun)
   └── Image preview displayed

2. Frontend Processing
   ├── Capture image from video stream
   ├── Apply initial enhancements
   ├── Generate thumbnail
   └── Add to capture queue

3. Backend Processing
   ├── Receive image data via API
   ├── Enhance image quality
   ├── Save to storage system
   └── Return confirmation

4. Storage System
   ├── Save original image
   ├── Generate processed version
   ├── Create metadata record
   └── Update file index
```

### PDF Generation Flow

```
1. User Request
   ├── Select captured images
   ├── Configure PDF settings
   └── Initiate generation

2. Frontend Preparation
   ├── Collect selected images
   ├── Apply user preferences
   ├── Prepare metadata
   └── Send generation request

3. Backend Processing
   ├── Validate image selection
   ├── Process images for PDF
   ├── Create PDF document
   └── Save to output directory

4. File Delivery
   ├── Generate download link
   ├── Stream file to client
   ├── Clean temporary files
   └── Update usage statistics
```

## Communication Protocols

### HTTP REST API

#### Endpoints Structure:
```
GET  /api/health              # System status
POST /api/images/capture      # Save captured image
GET  /api/images/list         # Get captured images
POST /api/pdf/generate        # Create PDF
GET  /api/pdf/download/{id}   # Download PDF
GET  /api/settings            # Get configuration
POST /api/settings            # Update configuration
```

#### Request/Response Format:
```javascript
// Image Capture Request
{
    "image_data": "base64_encoded_image",
    "metadata": {
        "timestamp": "2025-01-02T10:30:00Z",
        "qr_code": "scanned_qr_content",
        "quality": "high"
    }
}

// PDF Generation Request
{
    "images": ["image1.jpg", "image2.jpg"],
    "settings": {
        "page_size": "A4",
        "orientation": "portrait",
        "quality": "high"
    }
}
```

### WebSocket Communication

#### Real-time Features:
- **Live camera feed status**
- **QR code detection events**
- **Processing progress updates**
- **System notifications**

```javascript
// WebSocket Message Format
{
    "type": "qr_detected",
    "data": {
        "content": "QR_CODE_CONTENT",
        "timestamp": "2025-01-02T10:30:00Z"
    }
}
```

## Security Architecture

### Input Validation
- **Image data validation** (size, format, content)
- **QR code sanitization** (prevent code injection)
- **File path validation** (prevent directory traversal)
- **API rate limiting** (prevent abuse)

### File Security
- **Restricted file extensions** (images and PDFs only)
- **Safe file naming** (sanitized filenames)
- **Temporary file cleanup** (automatic cleanup)
- **Storage quotas** (prevent disk exhaustion)

### Network Security
- **CORS configuration** (controlled access)
- **Local-only binding** (127.0.0.1 default)
- **Input sanitization** (XSS prevention)
- **Safe file serving** (content-type validation)

## Performance Architecture

### Frontend Optimization
- **Lazy loading** of large images
- **Image compression** before transmission
- **Client-side caching** of frequently used data
- **Progressive enhancement** for better UX

### Backend Optimization
- **Asynchronous processing** (FastAPI async/await)
- **Background tasks** for heavy operations
- **Memory management** (garbage collection)
- **Connection pooling** for database operations

### Storage Optimization
- **Efficient file formats** (optimized JPEG/PNG)
- **Compression algorithms** (lossless when possible)
- **Cleanup routines** (automatic old file removal)
- **Directory structure** (organized by date/type)

## Scalability Considerations

### Current Architecture (Single User)
- **Local deployment** (single machine)
- **File-based storage** (local filesystem)
- **In-memory state** (process-based)
- **Direct camera access** (browser APIs)

### Future Scalability Options
- **Multi-user support** (user authentication)
- **Database backend** (PostgreSQL/MongoDB)
- **Cloud storage** (AWS S3/Azure Blob)
- **Microservices** (containerized components)

## Technology Stack

### Frontend Technologies
- **HTML5**: Structure and markup
- **CSS3**: Styling and responsive design
- **JavaScript ES6+**: Logic and interactivity
- **WebRTC**: Camera access and streaming
- **Canvas API**: Image manipulation
- **WebSockets**: Real-time communication

### Backend Technologies
- **Python 3.9+**: Core programming language
- **FastAPI**: Modern web framework
- **Uvicorn**: ASGI server
- **Pillow**: Image processing
- **ReportLab**: PDF generation
- **WebSockets**: Real-time features

### Development Tools
- **Git**: Version control
- **VS Code**: Development environment
- **Chrome DevTools**: Frontend debugging
- **Python debugger**: Backend debugging

## Deployment Architecture

### Local Development
```
┌─────────────────────────────────────────────┐
│              Development Machine            │
│  ┌─────────────┐    ┌─────────────────────┐  │
│  │   Browser   │    │   Python Backend   │  │
│  │ (Frontend)  │◄──►│   (uvicorn server)  │  │
│  │ localhost:  │    │   localhost:9000    │  │
│  │ 9000        │    │                     │  │
│  └─────────────┘    └─────────────────────┘  │
│                              │               │
│                              ▼               │
│                    ┌─────────────────────┐    │
│                    │   Local Storage     │    │
│                    │   (./storage/)      │    │
│                    └─────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Production Deployment
```
┌─────────────────────────────────────────────┐
│              Production Environment         │
│  ┌─────────────┐    ┌─────────────────────┐  │
│  │   Nginx     │    │   Python Backend   │  │
│  │  (Reverse   │◄──►│   (Gunicorn +      │  │
│  │   Proxy)    │    │    FastAPI)        │  │
│  │   Port 80   │    │   Port 9000        │  │
│  └─────────────┘    └─────────────────────┘  │
│                              │               │
│                              ▼               │
│                    ┌─────────────────────┐    │
│                    │  Persistent Storage │    │
│                    │  (Docker Volume)    │    │
│                    └─────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Error Handling Architecture

### Frontend Error Handling
```javascript
class ErrorHandler {
    handleCameraError(error) {
        // Camera access denied
        // Hardware not available
        // Permission issues
    }
    
    handleNetworkError(error) {
        // API connection failed
        // WebSocket disconnected
        // Timeout errors
    }
    
    handleProcessingError(error) {
        // Image processing failed
        // PDF generation error
        // File save error
    }
}
```

### Backend Error Handling
```python
from fastapi import HTTPException

async def handle_exceptions(request, call_next):
    try:
        response = await call_next(request)
        return response
    except ValidationError as e:
        # Input validation failed
        raise HTTPException(400, detail=str(e))
    except FileNotFoundError as e:
        # File operation failed
        raise HTTPException(404, detail="File not found")
    except Exception as e:
        # Unexpected errors
        raise HTTPException(500, detail="Internal server error")
```

## Monitoring and Logging

### Application Logging
```python
import logging

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
```

### Performance Monitoring
- **Response times** for API endpoints
- **Memory usage** tracking
- **File system** usage monitoring
- **Error rate** tracking

---

## Next Steps for Architecture

### Immediate Improvements
- Add comprehensive error logging
- Implement performance monitoring
- Add configuration management
- Enhance security measures

### Future Enhancements
- Microservices architecture
- Cloud deployment options
- Advanced image processing
- Multi-tenant support

---

**Copyright © 2025 NMIMS (Narsee Monjee Institute of Management Studies)**

Made with ❤️ in MPSTME
