"""
Image Storage API for Booklet Scanner
Handles temporary image storage, processing, and cleanup
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import aiofiles
import os
import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path
import uuid
from typing import Optional, List
import cv2
import numpy as np
from PIL import Image
import asyncio

router = APIRouter()

# Storage configuration
BASE_DIR = Path(__file__).parent.parent
TEMP_STORAGE_DIR = BASE_DIR / "storage" / "temp_images"
PROCESSED_STORAGE_DIR = BASE_DIR / "storage" / "processed_images"
FINAL_STORAGE_DIR = BASE_DIR / "storage" / "final_pdfs"

# Ensure directories exist
for directory in [TEMP_STORAGE_DIR, PROCESSED_STORAGE_DIR, FINAL_STORAGE_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Session management
active_sessions = {}
MAX_SESSION_AGE = timedelta(hours=2)

class ImageProcessor:
    """Handles image processing operations using OpenCV"""
    
    @staticmethod
    def apply_trim(image_path: str, trim_settings: dict) -> str:
        """Apply trim settings to an image"""
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Could not read image")
            
            height, width = img.shape[:2]
            
            # Calculate trim boundaries
            top = max(0, trim_settings.get('top', 0))
            bottom = max(0, trim_settings.get('bottom', 0))
            left = max(0, trim_settings.get('left', 0))
            right = max(0, trim_settings.get('right', 0))
            
            # Apply trim
            y1 = top
            y2 = height - bottom
            x1 = left
            x2 = width - right
            
            # Validate boundaries
            if y2 <= y1 or x2 <= x1:
                print(f"Warning: Invalid trim boundaries, skipping trim")
                return image_path
            
            # Crop image
            cropped = img[y1:y2, x1:x2]
            
            # Save processed image
            processed_path = image_path.replace('.jpg', '_trimmed.jpg')
            cv2.imwrite(processed_path, cropped)
            
            return processed_path
            
        except Exception as e:
            print(f"Error applying trim: {e}")
            return image_path
    
    @staticmethod
    def enhance_image(image_path: str) -> str:
        """Apply basic image enhancement"""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return image_path
            
            # Convert to LAB color space
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE to L channel
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            l = clahe.apply(l)
            
            # Merge channels and convert back
            enhanced = cv2.merge([l, a, b])
            enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
            
            # Save enhanced image
            enhanced_path = image_path.replace('.jpg', '_enhanced.jpg')
            cv2.imwrite(enhanced_path, enhanced)
            
            return enhanced_path
            
        except Exception as e:
            print(f"Error enhancing image: {e}")
            return image_path
    
    @staticmethod
    def generate_thumbnail(image_path: str, max_width: int = 150, max_height: int = 190) -> str:
        """Generate thumbnail for preview"""
        try:
            img = Image.open(image_path)
            img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            thumbnail_path = image_path.replace('.jpg', '_thumb.jpg')
            img.save(thumbnail_path, 'JPEG', quality=70)
            
            return thumbnail_path
            
        except Exception as e:
            print(f"Error generating thumbnail: {e}")
            return image_path

@router.post("/store-temp")
async def store_temporary_image(
    image: UploadFile = File(...),
    metadata: str = Form(...)
):
    """Store temporary image during scanning session"""
    try:
        print(f"🔍 DEBUG: Received image upload request")
        print(f"🔍 DEBUG: Image filename: {image.filename}")
        print(f"🔍 DEBUG: Image content type: {image.content_type}")
        print(f"🔍 DEBUG: Metadata: {metadata}")
        
        # Parse metadata
        meta = json.loads(metadata)
        session_id = meta.get('sessionId')
        image_id = meta.get('id')
        
        print(f"🔍 DEBUG: Parsed session_id: {session_id}")
        print(f"🔍 DEBUG: Parsed image_id: {image_id}")
        
        if not session_id or not image_id:
            raise HTTPException(status_code=400, detail="Missing session ID or image ID")
        
        # Create session directory
        session_dir = TEMP_STORAGE_DIR / session_id
        session_dir.mkdir(exist_ok=True)
        print(f"🔍 DEBUG: Created session directory: {session_dir}")
        
        # Save image
        image_path = session_dir / f"{image_id}.jpg"
        print(f"🔍 DEBUG: Image will be saved to: {image_path}")
        
        async with aiofiles.open(image_path, 'wb') as f:
            content = await image.read()
            print(f"🔍 DEBUG: Read {len(content)} bytes from upload")
            await f.write(content)
        
        print(f"🔍 DEBUG: Image file written successfully")
        
        # Update session info
        if session_id not in active_sessions:
            active_sessions[session_id] = {
                'created': datetime.now(),
                'images': [],
                'pdf_name': None
            }
        
        active_sessions[session_id]['images'].append({
            'id': image_id,
            'path': str(image_path),
            'metadata': meta,
            'stored_at': datetime.now().isoformat()
        })
        
        print(f"✅ Stored temporary image: {image_id}")
        
        return {
            "success": True,
            "path": str(image_path),
            "image_id": image_id,
            "session_id": session_id
        }
        
    except Exception as e:
        print(f"❌ Error storing temporary image: {type(e).__name__}: {e}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-image")
async def process_image(
    session_id: str,
    image_id: str,
    trim_settings: Optional[dict] = None,
    enhance: bool = True
):
    """Process a stored image with trim and enhancement"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Find image in session
        session = active_sessions[session_id]
        image_info = None
        
        for img in session['images']:
            if img['id'] == image_id:
                image_info = img
                break
        
        if not image_info:
            raise HTTPException(status_code=404, detail="Image not found")
        
        original_path = image_info['path']
        processed_path = original_path
        
        # Apply trim if settings provided
        if trim_settings:
            processed_path = ImageProcessor.apply_trim(processed_path, trim_settings)
        
        # Apply enhancement
        if enhance:
            processed_path = ImageProcessor.enhance_image(processed_path)
        
        # Generate thumbnail
        thumbnail_path = ImageProcessor.generate_thumbnail(processed_path)
        
        # Update image info
        image_info.update({
            'processed_path': processed_path,
            'thumbnail_path': thumbnail_path,
            'processed_at': datetime.now().isoformat(),
            'trim_applied': bool(trim_settings),
            'enhanced': enhance
        })
        
        print(f"✅ Processed image: {image_id}")
        
        return {
            "success": True,
            "image_id": image_id,
            "processed_path": processed_path,
            "thumbnail_path": thumbnail_path
        }
        
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/thumbnail/{session_id}/{image_id}")
async def get_thumbnail(session_id: str, image_id: str):
    """Get thumbnail for preview"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = active_sessions[session_id]
        
        for img in session['images']:
            if img['id'] == image_id:
                thumbnail_path = img.get('thumbnail_path')
                if thumbnail_path and os.path.exists(thumbnail_path):
                    return FileResponse(thumbnail_path, media_type="image/jpeg")
                break
        
        raise HTTPException(status_code=404, detail="Thumbnail not found")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/set-pdf-name")
async def set_pdf_name(session_id: str, pdf_name: str):
    """Set PDF name for session (from QR code or fallback)"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        active_sessions[session_id]['pdf_name'] = pdf_name
        
        print(f"📄 PDF name set for session {session_id}: {pdf_name}")
        
        return {
            "success": True,
            "session_id": session_id,
            "pdf_name": pdf_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session-info/{session_id}")
async def get_session_info(session_id: str):
    """Get session information"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = active_sessions[session_id]
        
        return {
            "session_id": session_id,
            "created": session['created'].isoformat(),
            "pdf_name": session.get('pdf_name'),
            "image_count": len(session['images']),
            "images": [
                {
                    "id": img['id'],
                    "metadata": img['metadata'],
                    "processed": 'processed_path' in img,
                    "has_thumbnail": 'thumbnail_path' in img
                }
                for img in session['images']
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cleanup-session/{session_id}")
async def cleanup_session(session_id: str):
    """Clean up session and temporary files"""
    try:
        if session_id in active_sessions:
            # Remove session directory
            session_dir = TEMP_STORAGE_DIR / session_id
            if session_dir.exists():
                shutil.rmtree(session_dir)
            
            # Remove from active sessions
            del active_sessions[session_id]
            
            print(f"🧹 Cleaned up session: {session_id}")
        
        return {"success": True, "session_id": session_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cleanup-old-sessions")
async def cleanup_old_sessions():
    """Clean up old sessions automatically"""
    try:
        current_time = datetime.now()
        sessions_to_remove = []
        
        for session_id, session_info in active_sessions.items():
            if current_time - session_info['created'] > MAX_SESSION_AGE:
                sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            await cleanup_session(session_id)
        
        print(f"🧹 Cleaned up {len(sessions_to_remove)} old sessions")
        
        return {
            "success": True,
            "cleaned_sessions": len(sessions_to_remove)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Background task to clean up old sessions
async def periodic_cleanup():
    """Periodic cleanup of old sessions"""
    while True:
        try:
            await cleanup_old_sessions()
            await asyncio.sleep(3600)  # Run every hour
        except Exception as e:
            print(f"Error in periodic cleanup: {e}")
            await asyncio.sleep(3600)