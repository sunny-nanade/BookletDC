"""
Settings API for Booklet Scanner
Handles persistent storage of user preferences with server-side backup
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError
from typing import Dict, Any, Optional
import json
import os
from datetime import datetime
from pathlib import Path

router = APIRouter()

# Settings storage directory
SETTINGS_DIR = Path(__file__).parent.parent / "data" / "settings"
SETTINGS_FILE = SETTINGS_DIR / "global_settings.json"

# Ensure settings directory exists
SETTINGS_DIR.mkdir(parents=True, exist_ok=True)

class SettingsData(BaseModel):
    """Settings data model"""
    class Config:
        extra = "ignore"  # Ignore extra fields that aren't defined
    
    # Booklet settings
    mainPages: int = 32
    supplementCount: int = 0
    
    # Camera settings
    leftCameraDevice: str = ""
    leftCameraResolution: str = "720p"
    leftCameraRotate: int = 0
    rightCameraDevice: str = ""
    rightCameraResolution: str = "720p"
    rightCameraRotate: int = 0
    
    # Trim settings
    leftTrimTop: int = 0
    leftTrimBottom: int = 0
    leftTrimLeft: int = 0
    leftTrimRight: int = 0
    rightTrimTop: int = 0
    rightTrimBottom: int = 0
    rightTrimLeft: int = 0
    rightTrimRight: int = 0
    
    # Metadata
    lastModified: Optional[str] = None
    version: str = "1.0.0"

class SettingsResponse(BaseModel):
    """Settings response model"""
    settings: SettingsData
    success: bool = True
    message: str = "Settings retrieved successfully"

class SettingsUpdateRequest(BaseModel):
    """Settings update request model"""
    settings: SettingsData

def load_settings() -> SettingsData:
    """Load settings from file"""
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return SettingsData(**data)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Warning: Failed to load settings, using defaults: {e}")
    
    # Return default settings if file doesn't exist or is corrupted
    default_settings = SettingsData()
    default_settings.lastModified = datetime.now().isoformat()
    return default_settings

def save_settings(settings: SettingsData) -> bool:
    """Save settings to file"""
    try:
        # Update last modified timestamp
        settings.lastModified = datetime.now().isoformat()
        
        # Save to file
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(settings.dict(), f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        print(f"Error saving settings: {e}")
        return False

@router.get("/", response_model=SettingsResponse)
async def get_settings():
    """Get current settings"""
    try:
        settings = load_settings()
        return SettingsResponse(settings=settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load settings: {str(e)}")

@router.post("/", response_model=SettingsResponse)
async def update_settings(request: SettingsUpdateRequest):
    """Update settings"""
    try:
        success = save_settings(request.settings)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save settings")
        
        return SettingsResponse(
            settings=request.settings,
            message="Settings updated successfully"
        )
    except ValidationError as ve:
        print(f"Validation error in settings: {ve}")
        print(f"Validation error details: {ve.errors()}")
        raise HTTPException(status_code=422, detail=f"Validation error: {ve}")
    except Exception as e:
        print(f"Settings update error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

@router.post("/reset", response_model=SettingsResponse)
async def reset_settings():
    """Reset settings to defaults"""
    try:
        default_settings = SettingsData()
        default_settings.lastModified = datetime.now().isoformat()
        
        success = save_settings(default_settings)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to reset settings")
        
        return SettingsResponse(
            settings=default_settings,
            message="Settings reset to defaults successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset settings: {str(e)}")

@router.get("/sync")
async def get_sync_info():
    """Get sync information for client"""
    try:
        settings = load_settings()
        return {
            "lastModified": settings.lastModified,
            "version": settings.version,
            "available": True
        }
    except Exception as e:
        return {
            "lastModified": None,
            "version": "1.0.0",
            "available": False,
            "error": str(e)
        }
