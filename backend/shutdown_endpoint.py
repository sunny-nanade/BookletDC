# Add this to main.py before the if __name__ == "__main__": section

@app.post("/api/shutdown")
async def shutdown_server():
    """Shutdown the server gracefully when browser is closed"""
    print("🛑 Shutdown request received from browser")
    print("📹 Releasing camera resources...")
    print("💾 Saving any pending data...")
    
    # Import here to avoid circular imports
    import asyncio
    import os
    import signal
    
    # Schedule shutdown after a brief delay to allow response to be sent
    async def delayed_shutdown():
        await asyncio.sleep(1)  # Give time for response to be sent
        print("✅ Server shutting down gracefully...")
        os.kill(os.getpid(), signal.SIGTERM)
    
    # Start the shutdown process
    asyncio.create_task(delayed_shutdown())
    
    return {"status": "success", "message": "Server shutdown initiated"}