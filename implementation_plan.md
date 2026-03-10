# Implementation Plan - CPNS Platform V2.0

This document outlines the phased development of the CPNS Exam Practice Platform using Next.js 16.1, FastAPI 0.135.1, PostgreSQL 16, and Redis 7.

---

## Phase 1: Authentication & User Management [COMPLETED]
**Goal**: Secure access and personalized experience.
- [x] **Backend**:
  - Implement JWT authentication with HTTP-only cookies.
  - Setup User models (SQLAlchemy) and Pydantic schemas.
  - Integrate OAuth 2.0 (Login with Google) - *Core Google Login logic partially ready, standard login fully implemented.*
- [x] **Frontend**:
  - Build Login and Register pages using Shadcn UI.
  - Implement Client-side Auth provider (Context API with HttpOnly support).
  - Create User Dashboard/Profile settings.

---

## Phase 2: Catalog & Package Management [COMPLETED]
**Goal**: Manage and sell exam packages.
- [x] **Backend**:
  - CRUD for Exam Packages and Questions.
  - Implement search and category filtering (TWK, TIU, TKP, Mix).
  - Redis caching for package list.
- [x] **Frontend**:
  - Build the Catalog page with responsive cards.
  - Search and filter UI.
  - Package detail view.

---

## Phase 2.2: Admin Dashboard & Stability [COMPLETED]
**Goal**: Enterprise-ready management tools and stable navigation.
- [x] **Backend**:
  - Robust `get_current_user` supporting both HttpOnly Cookies and Authorization Headers.
  - Fix Pydantic Serialization for complex SQLAlchemy models.
- [x] **Frontend**:
  - **Optimistic Auth Loading**: Instant user state restoration from localStorage.
  - **Navigation Guard**: Fixed "History Stack Trap" using `router.replace`.
  - **Admin Bank Soal**: Full integration for Package selection and Question management.

---

## Phase 3: Exam Engine & Real-time CAT [DONE - STABLE]
**Goal**: High-reliability exam engine with anti-lag features.
- [x] **Frontend (Zustand State Management)**:
  - Main question view + Sidebar navigation.
  - **Pre-fetching**: Load all questions into local state.
  - **Reactive Indicators**: Color codes for answered, doubt, unanswered.
  - **Optimistic Autosave**: Background API calls to Redis.
- [x] **Backend (FastAPI & Redis)**:
  - Session initialization and server-side timer.
  - Redis Hash-based answer storage.
  - **Synchronous Scoring**: (Currently implemented, will be refactored to Async).

---

## Phase 4: Async Processing & Scoring Refactor [NEXT]
**Goal**: Enterprise-grade background tasks.
- [ ] **Celery + RabbitMQ/Redis Implementation**:
  - Refactor `finish_exam` to dispatch scoring to a Celery worker.
  - Implement bulk-insert of answers from Redis to PostgreSQL in background.
  - **Pre-Calculation**: Store fixed result JSON in DB for fast retrieval.
- [ ] **Result Analytics Enhancement**:
  - Add Radar charts/Detailed statistics to the existing Result page.
  - Implement "Discussion Mode" UI to review individual questions.

---

## Phase 5: National Leaderboard & Analytics [STABLE - REFINING]
**Goal**: Competition and engagement.
- [x] **Backend**: Redis ZSET (Sorted Sets) implementation for real-time ranking.
- [x] **Frontend**: Premium National ranking page with Podium UI.
- [ ] **Next**: Optimize leaderboard queries (ZREVRANGE) and add "My Rank" widget.

---

## Phase 6: Payment Integration (Midtrans)
**Goal**: Monetization and RBAC protection.
- [ ] **Backend**:
  - Integrate Midtrans Snap/Core API.
  - Webhook handlers for payment status.
  - **RBAC Middleware**: Enforce transaction checks before starting exams.
- [ ] **Frontend**:
  - Transaction history page and checkout integration.

---

## Phase 7: Deployment (Production)
- [ ] Dockerizing the entire application (Multi-stage builds).
- [ ] CI/CD pipeline setup (e.g., GitHub Actions).
- [ ] SSL & Domain configuration on VPS.
