FROM python:3.11-slim

# Install system dependencies for GPIO access
RUN apt-get update && apt-get install -y \
    python3-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Create non-root user for security (but GPIO needs root on Pi)
# RUN useradd -m appuser && chown -R appuser:appuser /app
# USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:3001/health')" || exit 1

# Run the application
CMD ["python", "app.py"]
