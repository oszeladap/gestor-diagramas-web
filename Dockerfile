# ── Stage 1: Build Angular frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Runtime (Python + Java) ─────────────────────────────────────────
FROM python:3.11-slim

# Install Java for PlantUML + font libs required by Java AWT for PNG rendering
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        default-jre-headless \
        curl \
        graphviz \
        libharfbuzz0b \
        libfontconfig1 \
        fonts-dejavu-core && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend source code
COPY backend/ ./

# Download PlantUML JAR
RUN curl -fsSL \
    "https://github.com/plantuml/plantuml/releases/download/v1.2024.8/plantuml-1.2024.8.jar" \
    -o plantuml.jar

# Angular build output (FastAPI serves it as static files)
COPY --from=frontend-builder /frontend/dist /app/frontend/dist

EXPOSE 8000

# Railway injects PORT; default to 8000 for local Docker use
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
