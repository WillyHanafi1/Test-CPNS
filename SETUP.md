# Local Development Setup Guide

Follow these steps to run the CPNS Platform on your machine.

## Prerequisites
- **Docker Desktop**: For running PostgreSQL and Redis.
- **Python 3.10+**: For the FastAPI backend.
- **Node.js 18+**: For the Next.js frontend.

---

## 1. Start Infrastructure (Docker)
Open a terminal in the project root and run:
```bash
docker-compose up -d
```
This will start:
- **PostgreSQL** at `localhost:5432`
- **Redis** at `localhost:6379`

---

## 2. Backend Setup (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. (Optional) Create a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run database migrations:
   ```bash
   alembic upgrade head
   ```
5. Start the server:
   ```bash
   python -m uvicorn main:app --reload
   ```
   > [!NOTE]
   > The backend will be available at `http://localhost:8000`. 
   > Interactive docs: `http://localhost:8000/docs`

---

## 3. Frontend Setup (Next.js)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   > [!NOTE]
   > The frontend will be available at `http://localhost:3000`.

---

## 4. Testing the Auth Flow
1. Open `http://localhost:3000/register` and create an account.
2. Login at `http://localhost:3000/login`.
3. You should be redirected to the dashboard.
