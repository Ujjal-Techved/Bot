#!/bin/bash

# ==== Configuration ====
APP_NAME="myapi"
APP_DIR="/d/Bot/backend"  # Change to your actual project path
PYTHON_PATH="/c/Users/Parivartan/AppData/Local/Programs/Python/Python313/python.exe"

# ==== Move to project directory ====
cd "$APP_DIR" || { echo "Error: Directory $APP_DIR not found"; exit 1; }

# ==== Install pm2 globally if missing ====
if ! command -v pm2 &> /dev/null; then
    echo "Installing pm2..."
    npm install -g pm2
fi

# ==== Start Uvicorn with pm2 ====
pm2 start "$PYTHON_PATH" --name "$APP_NAME" -- -m uvicorn main:app --host 0.0.0.0 --port 3000

# ==== Save process list so it restarts after reboot ====
pm2 save

# ==== Enable startup on boot ====
pm2 startup
