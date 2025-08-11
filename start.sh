#!/bin/bash
echo "Starting Booklet Scanner Application..."
echo

echo "Checking Python installation..."
python3 --version
if [ $? -ne 0 ]; then
    echo "Error: Python 3 is not installed or not in PATH"
    exit 1
fi

echo
echo "Setting up virtual environment..."
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing/updating dependencies..."
pip install -r requirements.txt

echo
echo "Starting FastAPI server..."
cd backend
python main.py

echo
echo "Deactivating virtual environment..."
deactivate
