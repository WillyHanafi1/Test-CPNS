FROM python:3.12-slim-bookworm

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

# Schema changes are explicit operations, including in development.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
