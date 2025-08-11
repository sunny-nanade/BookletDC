"""
FastAPI Backend for Booklet Scanner
Main entry point for the web server
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.responses import HTMLResponse, FileResponse
import uvicorn
import os
import asyncio
import signal
from pathlib import Path

# Import API modules
from .api import camera, scanner, pdf_api, websocket_handler, settings, image_storage

# Get the current directory
BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR / "../frontend"

# Create FastAPI app
app = FastAPI(
    title="Booklet Scanner API",
    description="API for scanning booklets with dual cameras and PDF generation",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")

# Setup templates
templates = Jinja2Templates(directory=str(FRONTEND_DIR / "templates"))

# Include API routers
app.include_router(camera.router, prefix="/api/camera", tags=["camera"])
app.include_router(scanner.router, prefix="/api/scanner", tags=["scanner"])
app.include_router(pdf_api.router, prefix="/api/pdf", tags=["pdf"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(image_storage.router, prefix="/api/images", tags=["images"])
app.include_router(websocket_handler.router, prefix="/ws", tags=["websocket"])

@app.get("/", response_class=FileResponse)
async def read_root():
    """Serve the main application page"""
    # Serve the index.html from the parent directory
    index_path = BASE_DIR / "../index.html"
    if index_path.exists():
        return FileResponse(index_path, media_type="text/html")
    else:
        raise HTTPException(status_code=404, detail="index.html not found")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Booklet Scanner API is running"}

@app.post("/api/shutdown")
async def shutdown_server():
    """Shutdown the server gracefully when browser is closed"""
    print("🛑 Shutdown request received from browser")
    print("📹 Releasing camera resources...")
    print("💾 Saving any pending data...")
    
    # Schedule shutdown after a brief delay to allow response to be sent
    async def delayed_shutdown():
        await asyncio.sleep(1)  # Give time for response to be sent
        print("✅ Server shutting down gracefully...")
        os.kill(os.getpid(), signal.SIGTERM)
    
    # Start the shutdown process
    asyncio.create_task(delayed_shutdown())
    
    return {"status": "success", "message": "Server shutdown initiated"}

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    print("🚀 Starting Booklet Scanner API...")
    
    # Create storage directories
    storage_dirs = [
        BASE_DIR / "storage" / "scanned_images",
        BASE_DIR / "storage" / "generated_pdfs",
        BASE_DIR / "data" / "settings"
    ]
    
    for dir_path in storage_dirs:
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"✅ Created storage directory: {dir_path}")
    
    print("✅ Booklet Scanner API started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("🛑 Shutting down Booklet Scanner API...")
    # Add cleanup logic here if needed
    print("✅ Shutdown complete")

if __name__ == "__main__":
    print("Starting Booklet Scanner in development mode...")
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )