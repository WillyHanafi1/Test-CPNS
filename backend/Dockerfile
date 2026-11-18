FROM python:3.12-slim-bookworm

WORKDIR /app

# Install system dependencies for build
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt build_requirements.py ./

# Install python dependencies
ARG INSTALL_DEV_TOOLS=true
RUN --mount=type=cache,target=/root/.cache/pip \
    if [ "$INSTALL_DEV_TOOLS" = "true" ]; then cp requirements.txt /tmp/install-requirements.txt; \
    else python build_requirements.py > /tmp/install-requirements.txt; fi \
    && pip install --timeout=120 --retries=5 -r /tmp/install-requirements.txt \
    && rm /tmp/install-requirements.txt

# Copy backend code into a subdirectory named 'backend' 
# This preserves the 'from backend.xxx' import structure
COPY . backend/

# Add current directory to PYTHONPATH
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8001

# Schema changes are explicit operations, including in development.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
