#!/usr/bin/env python3
"""
Direct runner for BookletDC backend that handles import paths correctly
"""
import sys
import os
from pathlib import Path

# Add the project root to Python path so relative imports work
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Now we can import and run the backend
from backend.main import app
import uvicorn

if __name__ == "__main__":
    print("🚀 Starting BookletDC via direct runner...")
    uvicorn.run(
        "backend.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        reload_dirs=[str(project_root)]
    )
