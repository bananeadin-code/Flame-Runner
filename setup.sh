#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Flame in Freefall - Local Setup Script (Edge AI)
# Sets up the Python environment, Ollama, the Gemma 4 E4B (Q4) model,
# the SQLite database, and frontend dependencies.
#
# Usage:
#   ./setup.sh          # Interactive mode (prompts before system installs)
#   ./setup.sh --yes    # Non-interactive mode (auto-confirms all prompts)
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODEL_NAME="gemma4:e4b"
LOCAL_OLLAMA_HOST="http://127.0.0.1:11434"
AUTO_YES=false

for arg in "$@"; do
    case "$arg" in
        -y|--yes) AUTO_YES=true ;;
        -h|--help)
            echo "Usage: ./setup.sh [-y|--yes]"
            echo "  -y, --yes    Install system dependencies and pull the model without prompting."
            exit 0
            ;;
    esac
done

# Output colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

confirm() {
    if [ "$AUTO_YES" = true ]; then
        return 0
    fi
    read -r -p "$1 [y/N]: " response
    [[ "$response" =~ ^([yY]|[yY][eE][sS])$ ]]
}

echo "============================================================"
echo "  Flame in Freefall - Local Setup (NASA Space Apps)"
echo "============================================================"

# ------------------------------------------------------------------------------
# 1. Operating System and RAM Check
# ------------------------------------------------------------------------------
OS="$(uname -s)"
info "Detected OS: $OS"

if [ "$OS" = "Linux" ] && command -v free >/dev/null 2>&1; then
    TOTAL_RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$TOTAL_RAM_GB" -lt 10 ]; then
        warn "Detected ${TOTAL_RAM_GB} GB RAM. Gemma 4 E4B (Q4) requires ~6.6 GB; performance may be tight."
    else
        ok "Available RAM: ${TOTAL_RAM_GB} GB"
    fi
fi

# ------------------------------------------------------------------------------
# 2. Python Environment and Backend Dependencies
# ------------------------------------------------------------------------------
if ! command -v python3 >/dev/null 2>&1; then
    error "python3 is not installed. Please install Python 3.10+ and run this script again."
fi

cd "$ROOT_DIR"

if [ ! -d ".venv" ]; then
    info "Creating virtual environment in .venv..."
    python3 -m venv .venv
fi

info "Installing Python dependencies (requirements.txt)..."
.venv/bin/python -m pip install --upgrade pip -q
.venv/bin/pip install -r requirements.txt -q
ok "Python environment ready."

# ------------------------------------------------------------------------------
# 3. Initial .env Configuration (Local Mode)
# ------------------------------------------------------------------------------
if [ ! -f ".env" ]; then
    info "Creating .env file for local execution..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        touch .env
    fi

    # Ensure local Ollama URL is set if not already present
    grep -q "^OLLAMA_BASE_URL=" .env || echo "OLLAMA_BASE_URL=$LOCAL_OLLAMA_HOST" >> .env
    ok ".env file created."
else
    info ".env file already exists; keeping current configuration."
fi

# ------------------------------------------------------------------------------
# 4. Check / Install Local Ollama
# ------------------------------------------------------------------------------
export PATH="$HOME/.local/bin:$PATH"

if command -v ollama >/dev/null 2>&1; then
    ok "Ollama is already installed: $(command -v ollama)"
else
    warn "Ollama is not installed on this machine."
    if confirm "Do you want to install Ollama now?"; then
        if [ "$OS" = "Linux" ]; then
            command -v curl >/dev/null 2>&1 || error "'curl' is required to install Ollama."
            info "Installing Ollama (may prompt for sudo password)..."
            curl -fsSL https://ollama.com/install.sh | sh
        elif [ "$OS" = "Darwin" ]; then
            if command -v brew >/dev/null 2>&1; then
                info "Installing Ollama via Homebrew..."
                brew install ollama
            else
                error "Please install Homebrew or download Ollama manually from https://ollama.com/download"
            fi
        else
            error "Unsupported OS for auto-install. Download Ollama from https://ollama.com/download"
        fi
        ok "Ollama installed successfully."
    else
        error "Ollama is required to run the AI model locally."
    fi
fi

# Force setup operations to target the LOCAL daemon (127.0.0.1)
export OLLAMA_HOST="127.0.0.1:11434"

# Ensure the local Ollama server is responding
if ! curl -sf "$LOCAL_OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
    info "Starting local Ollama service in the background..."
    nohup ollama serve >/tmp/ollama_setup.log 2>&1 &
    OLLAMA_READY=false
    for _ in $(seq 1 15); do
        if curl -sf "$LOCAL_OLLAMA_HOST/api/tags" >/dev/null 2>&1; then
            OLLAMA_READY=true
            break
        fi
        sleep 1
    done
    if [ "$OLLAMA_READY" = false ]; then
        error "Failed to start local Ollama server. Check /tmp/ollama_setup.log"
    fi
fi
ok "Local Ollama server active at $LOCAL_OLLAMA_HOST"

# ------------------------------------------------------------------------------
# 5. Pull Gemma 4 E4B (Q4) Model
# ------------------------------------------------------------------------------
if ollama list | awk 'NR>1 {print $1}' | grep -qx "$MODEL_NAME"; then
    ok "Model $MODEL_NAME is already downloaded locally."
else
    warn "Model $MODEL_NAME is not installed locally (~6.6 GB download)."
    if confirm "Do you want to download $MODEL_NAME now?"; then
        info "Pulling $MODEL_NAME..."
        ollama pull "$MODEL_NAME"
        ok "Model $MODEL_NAME downloaded and installed."
    else
        warn "Download skipped. You can pull it later with: OLLAMA_HOST=127.0.0.1:11434 ollama pull $MODEL_NAME"
    fi
fi

# ------------------------------------------------------------------------------
# 6. Database Ingestion (PSI Experimental Tables & Documents)
# ------------------------------------------------------------------------------
info "Loading PSI experimental tables into SQLite..."
.venv/bin/python -m backend.ingest.load_tables

info "Loading documents and FTS5 search index..."
.venv/bin/python -m backend.ingest.load_documents
ok "Database built successfully."

# ------------------------------------------------------------------------------
# 7. Frontend Dependencies (React + Vite)
# ------------------------------------------------------------------------------
if command -v npm >/dev/null 2>&1; then
    info "Installing frontend dependencies..."
    (cd "$ROOT_DIR/frontend" && npm install --silent)
    ok "Frontend ready."
else
    warn "npm not found. Skipping frontend installation."
fi

echo ""
echo "============================================================"
echo -e "${GREEN}  Setup completed successfully.${NC}"
echo "============================================================"
echo "  To start the backend:"
echo "    .venv/bin/uvicorn backend.main:app --reload"
echo ""
echo "  To start the frontend:"
echo "    cd frontend && npm run dev"
echo "============================================================"
