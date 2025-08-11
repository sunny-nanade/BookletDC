"""
WebSocket handler for real-time communication
Handles camera streaming and live updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
import asyncio
import logging

router = APIRouter()

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
        
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove disconnected connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

@router.websocket("/camera-stream")
async def camera_stream_endpoint(websocket: WebSocket):
    """WebSocket endpoint for camera streaming"""
    await manager.connect(websocket)
    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            
            if message_type == "start_stream":
                # Start camera stream
                camera_side = message.get("side", "left")
                await handle_start_stream(websocket, camera_side)
                
            elif message_type == "stop_stream":
                # Stop camera stream
                camera_side = message.get("side", "left")
                await handle_stop_stream(websocket, camera_side)
                
            elif message_type == "capture_frame":
                # Capture a frame from camera
                camera_side = message.get("side", "left")
                await handle_capture_frame(websocket, camera_side)
                
            elif message_type == "ping":
                # Respond to ping for connection health check
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": "now"
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logging.info("Client disconnected from camera stream")

@router.websocket("/scanner-updates")
async def scanner_updates_endpoint(websocket: WebSocket):
    """WebSocket endpoint for scanner status updates"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            
            if message_type == "subscribe_updates":
                # Subscribe to scanner updates
                await websocket.send_text(json.dumps({
                    "type": "subscription_confirmed",
                    "message": "Subscribed to scanner updates"
                }))
                
            elif message_type == "spread_captured":
                # Broadcast spread capture to all clients
                await manager.broadcast(json.dumps({
                    "type": "spread_update",
                    "action": "captured",
                    "spread_data": message.get("spread_data")
                }))
                
            elif message_type == "session_started":
                # Broadcast session start
                await manager.broadcast(json.dumps({
                    "type": "session_update",
                    "action": "started",
                    "session_data": message.get("session_data")
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logging.info("Client disconnected from scanner updates")

async def handle_start_stream(websocket: WebSocket, camera_side: str):
    """Handle starting camera stream"""
    try:
        # In real implementation, this would start the actual camera stream
        # For now, send a mock stream start confirmation
        response = {
            "type": "stream_started",
            "side": camera_side,
            "status": "success",
            "message": f"{camera_side.capitalize()} camera stream started"
        }
        await websocket.send_text(json.dumps(response))
        
        # Start sending mock frame data
        await send_mock_frames(websocket, camera_side)
        
    except Exception as e:
        error_response = {
            "type": "error",
            "message": f"Failed to start {camera_side} camera stream: {str(e)}"
        }
        await websocket.send_text(json.dumps(error_response))

async def handle_stop_stream(websocket: WebSocket, camera_side: str):
    """Handle stopping camera stream"""
    try:
        response = {
            "type": "stream_stopped",
            "side": camera_side,
            "status": "success",
            "message": f"{camera_side.capitalize()} camera stream stopped"
        }
        await websocket.send_text(json.dumps(response))
        
    except Exception as e:
        error_response = {
            "type": "error",
            "message": f"Failed to stop {camera_side} camera stream: {str(e)}"
        }
        await websocket.send_text(json.dumps(error_response))

async def handle_capture_frame(websocket: WebSocket, camera_side: str):
    """Handle capturing a frame from camera"""
    try:
        # In real implementation, this would capture from actual camera
        # For now, send mock captured frame data
        response = {
            "type": "frame_captured",
            "side": camera_side,
            "timestamp": "now",
            "frame_data": "mock_base64_image_data",
            "metadata": {
                "width": 1920,
                "height": 1080,
                "format": "jpeg"
            }
        }
        await websocket.send_text(json.dumps(response))
        
    except Exception as e:
        error_response = {
            "type": "error",
            "message": f"Failed to capture frame from {camera_side} camera: {str(e)}"
        }
        await websocket.send_text(json.dumps(error_response))

async def send_mock_frames(websocket: WebSocket, camera_side: str):
    """Send mock frame data for testing"""
    try:
        frame_count = 0
        while True:
            frame_data = {
                "type": "frame_data",
                "side": camera_side,
                "frame_number": frame_count,
                "timestamp": "now",
                "data": f"mock_frame_data_{frame_count}"
            }
            
            await websocket.send_text(json.dumps(frame_data))
            frame_count += 1
            
            # Send frame every 100ms (10 FPS)
            await asyncio.sleep(0.1)
            
    except WebSocketDisconnect:
        logging.info(f"Mock frame streaming stopped for {camera_side} camera")
    except Exception as e:
        logging.error(f"Error in mock frame streaming: {str(e)}")

# Utility functions for broadcasting updates
async def broadcast_spread_update(spread_data: Dict[str, Any]):
    """Broadcast spread update to all connected clients"""
    message = {
        "type": "spread_update",
        "data": spread_data,
        "timestamp": "now"
    }
    await manager.broadcast(json.dumps(message))

async def broadcast_session_update(session_data: Dict[str, Any]):
    """Broadcast session update to all connected clients"""
    message = {
        "type": "session_update",
        "data": session_data,
        "timestamp": "now"
    }
    await manager.broadcast(json.dumps(message))
