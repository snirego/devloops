#!/bin/sh
set -e

# ── Ollama Entrypoint ────────────────────────────────────────────────────────
#
# Starts Ollama server and ensures the model is ready.
# If OLLAMA_MODEL env var is changed at runtime (different from what was
# baked in), it will pull the new model on first start.
# ─────────────────────────────────────────────────────────────────────────────

MODEL="${OLLAMA_MODEL:-qwen2.5-coder:7b-instruct}"

echo "[ollama] Starting Ollama server..."
ollama serve &
SERVER_PID=$!

# Wait for server to be ready
echo "[ollama] Waiting for server to be ready..."
for i in $(seq 1 30); do
    if ollama list >/dev/null 2>&1; then
        echo "[ollama] Server is ready."
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "[ollama] ERROR: Server failed to start after 30s"
        exit 1
    fi
    sleep 1
done

# Check if model is already downloaded (baked in during build)
if ollama list | grep -q "${MODEL}"; then
    echo "[ollama] Model '${MODEL}' is already available."
else
    echo "[ollama] Model '${MODEL}' not found. Pulling..."
    ollama pull "${MODEL}"
    echo "[ollama] Model '${MODEL}' pulled successfully."
fi

# Warm up: run a tiny inference to load model into memory
echo "[ollama] Warming up model..."
echo '{"model":"'"${MODEL}"'","messages":[{"role":"user","content":"hi"}],"stream":false,"options":{"num_predict":1}}' \
    | curl -s -X POST http://localhost:11434/api/chat -H "Content-Type: application/json" -d @- > /dev/null 2>&1 || true
echo "[ollama] Model loaded and ready to serve."

# Keep the server running
wait $SERVER_PID
