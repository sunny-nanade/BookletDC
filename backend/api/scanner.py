"""
Scanner API endpoints
Handles scanning workflow and spread management
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter()

# Store scanning session data
scanning_sessions = {}
current_session = None

@router.post("/start-session")
async def start_scanning_session(config: Dict[str, Any]):
    """Start a new scanning session"""
    try:
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        session_config = {
            "session_id": session_id,
            "total_pages": config.get("total_pages", 32),
            "supplement_count": config.get("supplement_count", 0),
            "trim_settings": config.get("trim_settings", {}),
            "created_at": datetime.now().isoformat(),
            "spreads": [],
            "status": "active"
        }
        
        scanning_sessions[session_id] = session_config
        global current_session
        current_session = session_id
        
        return {
            "status": "success",
            "message": "Scanning session started",
            "session": session_config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start session: {str(e)}")

@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get details of a specific scanning session"""
    if session_id not in scanning_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "status": "success",
        "session": scanning_sessions[session_id]
    }

@router.get("/current-session")
async def get_current_session():
    """Get the current active scanning session"""
    if not current_session or current_session not in scanning_sessions:
        raise HTTPException(status_code=404, detail="No active session")
    
    return {
        "status": "success",
        "session": scanning_sessions[current_session]
    }

@router.post("/capture-spread")
async def capture_spread(spread_data: Dict[str, Any]):
    """Capture a new spread in the current session"""
    try:
        if not current_session or current_session not in scanning_sessions:
            raise HTTPException(status_code=404, detail="No active session")
        
        session = scanning_sessions[current_session]
        spread_index = len(session["spreads"])
        
        # Process the spread data
        spread = {
            "spread_index": spread_index,
            "timestamp": datetime.now().isoformat(),
            "left_page": spread_data.get("left_page"),
            "right_page": spread_data.get("right_page"),
            "page_numbers": spread_data.get("page_numbers", []),
            "images": {
                "left": spread_data.get("left_image_path"),
                "right": spread_data.get("right_image_path")
            },
            "status": "captured"
        }
        
        session["spreads"].append(spread)
        
        return {
            "status": "success",
            "message": f"Spread {spread_index + 1} captured",
            "spread": spread,
            "total_spreads": len(session["spreads"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to capture spread: {str(e)}")

@router.put("/retake-spread/{spread_index}")
async def retake_spread(spread_index: int, spread_data: Dict[str, Any]):
    """Retake a specific spread"""
    try:
        if not current_session or current_session not in scanning_sessions:
            raise HTTPException(status_code=404, detail="No active session")
        
        session = scanning_sessions[current_session]
        
        if spread_index >= len(session["spreads"]):
            raise HTTPException(status_code=404, detail="Spread not found")
        
        # Update the existing spread
        spread = session["spreads"][spread_index]
        spread.update({
            "timestamp": datetime.now().isoformat(),
            "left_page": spread_data.get("left_page", spread["left_page"]),
            "right_page": spread_data.get("right_page", spread["right_page"]),
            "images": {
                "left": spread_data.get("left_image_path", spread["images"]["left"]),
                "right": spread_data.get("right_image_path", spread["images"]["right"])
            },
            "status": "retaken"
        })
        
        return {
            "status": "success",
            "message": f"Spread {spread_index + 1} retaken",
            "spread": spread
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retake spread: {str(e)}")

@router.get("/spreads")
async def get_all_spreads():
    """Get all spreads from the current session"""
    if not current_session or current_session not in scanning_sessions:
        raise HTTPException(status_code=404, detail="No active session")
    
    session = scanning_sessions[current_session]
    
    return {
        "status": "success",
        "session_id": current_session,
        "spreads": session["spreads"],
        "total_spreads": len(session["spreads"]),
        "total_pages": session["total_pages"]
    }

@router.post("/end-session")
async def end_scanning_session():
    """End the current scanning session"""
    global current_session
    try:
        if not current_session or current_session not in scanning_sessions:
            raise HTTPException(status_code=404, detail="No active session")
        
        session = scanning_sessions[current_session]
        session["status"] = "completed"
        session["completed_at"] = datetime.now().isoformat()
        
        completed_session_id = current_session
        current_session = None
        
        return {
            "status": "success",
            "message": "Scanning session completed",
            "session_id": completed_session_id,
            "total_spreads": len(session["spreads"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to end session: {str(e)}")

@router.get("/sessions")
async def list_sessions():
    """List all scanning sessions"""
    return {
        "status": "success",
        "sessions": list(scanning_sessions.values()),
        "total_sessions": len(scanning_sessions),
        "current_session": current_session
    }

@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a specific scanning session"""
    if session_id not in scanning_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    global current_session
    if current_session == session_id:
        current_session = None
    
    del scanning_sessions[session_id]
    
    return {
        "status": "success",
        "message": f"Session {session_id} deleted"
    }
