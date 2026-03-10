from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1.endpoints.auth import router as auth_router
from backend.api.v1.endpoints.package_api import router as package_router
from backend.api.v1.endpoints.exam import router as exam_router

app = FastAPI(
    title="CPNS Platform API",
    description="Latest Tech Stack CPNS Exam Practice Platform",
    version="1.0.0"
)

# Configure CORS for Next.js 16
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(package_router, prefix="/api/v1")
app.include_router(exam_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "CPNS Platform API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
