# EdVidura — Railway / container image (API + built SPA)
FROM node:22-bookworm-slim AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
ENV VITE_BASE=/app/
RUN npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ENVIRONMENT=production

WORKDIR /app

RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY app ./app
COPY db ./db
COPY scripts ./scripts
COPY templates ./templates
COPY docs/RAILWAY.md ./docs/RAILWAY.md
COPY docs/SAAS_ROADMAP.md ./docs/SAAS_ROADMAP.md
COPY --from=frontend /fe/dist ./frontend/dist

RUN mkdir -p keys app/static/uploads \
    && printf '' > keys/.gitkeep \
    && printf '' > app/static/uploads/.gitkeep \
    && sed -i 's/\r$//' scripts/docker_entrypoint.sh \
    && chmod +x scripts/docker_entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/bin/sh", "/app/scripts/docker_entrypoint.sh"]
