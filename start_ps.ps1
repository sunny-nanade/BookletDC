# PowerShell script to start BookletDC with the correct import handling

# Activate virtual environment and start server
& ".\venv\Scripts\Activate.ps1"
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
