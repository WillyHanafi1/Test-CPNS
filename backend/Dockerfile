FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for build
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code into a subdirectory named 'backend' 
# This preserves the 'from backend.xxx' import structure
COPY . backend/

# Add current directory to PYTHONPATH
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8001

# Run migrations and start uvicorn
# We use 'backend.main:app' because the folder 'backend' is inside '/app'
CMD ["sh", "-c", "alembic -c backend/alembic.ini upgrade head && uvicorn backend.main:app --host 0.0.0.0 --port 8001 --workers ${UVICORN_WORKERS:-4} --loop uvloop --http httptools"]
