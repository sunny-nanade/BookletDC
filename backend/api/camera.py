"""
Camera API endpoints
Handles camera discovery, configuration, and streaming
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
import asyncio

router = APIRouter()

# Store connected cameras and their configurations
connected_cameras = {}
camera_streams = {}

@router.get("/list")
async def list_cameras():
    """Get list of available cameras"""
    try:
        # This will be implemented with actual camera detection
        # For now, return mock data
        cameras = [
            {
                "id": "camera_0",
                "name": "USB Camera 1",
                "capabilities": {
                    "resolutions": ["720p", "1080p", "1440p"],
                    "formats": ["MJPEG", "YUYV"]
                }
            },
            {
                "id": "camera_1", 
                "name": "USB Camera 2",
                "capabilities": {
                    "resolutions": ["720p", "1080p"],
                    "formats": ["MJPEG", "YUYV"]
                }
            }
        ]
        return {"cameras": cameras}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list cameras: {str(e)}")

@router.post("/configure")
async def configure_camera(config: Dict[str, Any]):
    """Configure a camera with specific settings"""
    try:
        camera_id = config.get("camera_id")
        side = config.get("side")  # "left" or "right"
        resolution = config.get("resolution", "720p")
        rotation = config.get("rotation", 0)
        
        if not camera_id or not side:
            raise HTTPException(status_code=400, detail="camera_id and side are required")
        
        # Store camera configuration
        connected_cameras[side] = {
            "camera_id": camera_id,
            "resolution": resolution,
            "rotation": rotation,
            "active": False
        }
        
        return {
            "status": "success",
            "message": f"{side.capitalize()} camera configured",
            "config": connected_cameras[side]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure camera: {str(e)}")

@router.post("/start/{side}")
async def start_camera(side: str):
    """Start streaming from a specific camera"""
    try:
        if side not in ["left", "right"]:
            raise HTTPException(status_code=400, detail="Side must be 'left' or 'right'")
        
        if side not in connected_cameras:
            raise HTTPException(status_code=404, detail=f"{side.capitalize()} camera not configured")
        
        # Start camera stream (placeholder implementation)
        connected_cameras[side]["active"] = True
        camera_streams[side] = {"status": "streaming", "timestamp": "now"}
        
        return {
            "status": "success",
            "message": f"{side.capitalize()} camera started",
            "stream_info": camera_streams[side]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start camera: {str(e)}")

@router.post("/stop/{side}")
async def stop_camera(side: str):
    """Stop streaming from a specific camera"""
    try:
        if side not in ["left", "right"]:
            raise HTTPException(status_code=400, detail="Side must be 'left' or 'right'")
        
        if side in connected_cameras:
            connected_cameras[side]["active"] = False
        
        if side in camera_streams:
            del camera_streams[side]
        
        return {
            "status": "success",
            "message": f"{side.capitalize()} camera stopped"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop camera: {str(e)}")

@router.get("/status")
async def get_camera_status():
    """Get status of all connected cameras"""
    return {
        "connected_cameras": connected_cameras,
        "active_streams": list(camera_streams.keys()),
        "total_cameras": len(connected_cameras)
    }

@router.post("/capture/{side}")
async def capture_image(side: str):
    """Capture an image from a specific camera"""
    try:
        if side not in ["left", "right"]:
            raise HTTPException(status_code=400, detail="Side must be 'left' or 'right'")
        
        if side not in connected_cameras or not connected_cameras[side]["active"]:
            raise HTTPException(status_code=404, detail=f"{side.capitalize()} camera not active")
        
        # Capture image (placeholder implementation)
        # In real implementation, this would capture from the actual camera
        image_data = {
            "side": side,
            "timestamp": "now",
            "format": "jpeg",
            "size": {"width": 1920, "height": 1080},
            "image_path": f"/storage/scanned_images/{side}_capture_now.jpg"
        }
        
        return {
            "status": "success",
            "message": f"Image captured from {side} camera",
            "image": image_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to capture image: {str(e)}")
