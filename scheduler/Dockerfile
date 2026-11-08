FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

COPY scheduler/requirements.txt /app/scheduler/requirements.txt
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/scheduler/requirements.txt \
    && pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend /app/backend
COPY collectors /app/collectors
COPY config /app/config
COPY scheduler /app/scheduler

CMD ["python", "-m", "scheduler.main"]
