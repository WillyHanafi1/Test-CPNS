from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1.endpoints.auth import router as auth_router
from backend.api.v1.endpoints.package_api import router as package_router
from backend.api.v1.endpoints.exam import router as exam_router
from backend.api.v1.endpoints.admin_questions import router as admin_questions_router
from backend.api.v1.endpoints.admin_import import router as admin_import_router
from backend.api.v1.endpoints.admin_packages import router as admin_packages_router

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CPNS Platform API",
    description="Latest Tech Stack CPNS Exam Practice Platform",
    version="1.0.0"
)

# Configure CORS for Next.js 16
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    logger.info(f"Cookies: {request.cookies}")
    logger.info(f"Authorization Header: {request.headers.get('Authorization')}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

app.include_router(auth_router, prefix="/api/v1")
app.include_router(package_router, prefix="/api/v1")
app.include_router(exam_router, prefix="/api/v1")
app.include_router(admin_questions_router, prefix="/api/v1")
app.include_router(admin_import_router, prefix="/api/v1")
app.include_router(admin_packages_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "CPNS Platform API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
