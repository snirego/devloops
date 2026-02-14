# ── Ollama with pre-baked model weights ──────────────────────────────────────
#
# This Dockerfile:
#   1. Starts from the official Ollama image
#   2. Downloads the model at BUILD time (baked into the image layer)
#   3. On container start, serves immediately — no download wait
#
# Deploy this as a separate Railway service in the same project.
# The devloops-llm service reaches it via private networking:
#   LLM_BASE_URL=http://ollama.railway.internal:11434/v1
#
# To change the model, update OLLAMA_MODEL below and rebuild.
# ─────────────────────────────────────────────────────────────────────────────

FROM ollama/ollama:latest

ENV OLLAMA_MODEL=qwen2.5-coder:7b-instruct

# Bake the model into the image at build time.
# We start the server in the background, pull the model, then stop it.
RUN ollama serve & \
    SERVER_PID=$! && \
    sleep 5 && \
    ollama pull ${OLLAMA_MODEL} && \
    kill $SERVER_PID && \
    wait $SERVER_PID 2>/dev/null || true

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 11434

ENTRYPOINT ["/entrypoint.sh"]
