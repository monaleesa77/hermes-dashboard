#!/bin/bash
# Hermes Dashboard Launcher

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"

echo "🚀 Hermes Dashboard Starter"
echo "============================"

# Check if Hermes gateway is running
check_hermes() {
    if curl -s http://localhost:8642/health > /dev/null 2>&1; then
        echo "✅ Hermes Gateway is running on port 8642"
        return 0
    else
        echo "⚠️  Hermes Gateway is not running on port 8642"
        echo "   Please start it first with: hermes gateway run"
        return 1
    fi
}

# Start backend
start_backend() {
    echo ""
    echo "📦 Starting Bridge Server..."
    cd "$SCRIPT_DIR/backend"

    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "   Creating Python virtual environment..."
        python3 -m venv venv
    fi

    # Activate and install dependencies
    source venv/bin/activate
    pip install -q -r requirements.txt

    # Start the server in background
    python main.py &
    BACKEND_PID=$!

    # Wait for it to be ready
    echo "   Waiting for Bridge Server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8643/api/health > /dev/null 2>&1; then
            echo "✅ Bridge Server is ready on port 8643"
            return 0
        fi
        sleep 1
    done

    echo "❌ Bridge Server failed to start"
    kill $BACKEND_PID 2>/dev/null || true
    return 1
}

# Start frontend
start_frontend() {
    echo ""
    echo "🎨 Starting Frontend..."
    cd "$SCRIPT_DIR/frontend"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "   Installing npm dependencies..."
        npm install
    fi

    # Start dev server
    npm run dev &
    FRONTEND_PID=$!

    echo "✅ Frontend is starting on port 10007"
    echo ""
    echo "🌐 Open http://localhost:10007 in your browser"

    return 0
}

# Main
check_hermes || exit 1
start_backend || exit 1
start_frontend

echo ""
echo "============================"
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
trap 'kill $(jobs -p) 2>/dev/null || true; exit 0' INT
wait
