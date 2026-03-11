@echo off
echo Menyiapkan environment Test-CPNS...

start "Next.js Frontend" cmd /k "cd /d D:\ProjectAI\Test-CPNS\frontend && npm run dev"
start "FastAPI Backend" cmd /k "cd /d D:\ProjectAI\Test-CPNS && uvicorn backend.main:app --reload --port 8001"
start "Celery Worker" cmd /k "cd /d D:\ProjectAI\Test-CPNS && set PYTHONPATH=. && python -m celery -A backend.core.tasks worker --loglevel=info --pool=solo"

echo Semua proses telah dijalankan di window terpisah!
echo - Tutup window command prompt masing-masing untuk menghentikan proses.
