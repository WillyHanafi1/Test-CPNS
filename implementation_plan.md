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

## Phase 2.1: Security & Architecture Optimizations [COMPLETED]
**Goal**: Enterprise-grade security and professional UI.
- [x] **Backend**: Full migration to HttpOnly Cookies.
- [x] **Frontend**: Premium Landing Page (`page.tsx`) and automatic session restoration.
- [x] **Data**: Fixed database seeding and mock data population.

---

## Phase 3: Real-time CAT Interface [NEXT]
**Goal**: High-reliability exam engine with anti-lag features.
- [ ] **Frontend (Zustand State Management)**:
  - Build the CAT engine Layout (Main question view + Sidebar navigation).
  - **Pre-fetching**: Load all 110 questions into local state upon start.
  - **Reactive Indicators**: Color codes for answered (Green), doubt (Yellow), unanswered (Red).
  - **Autosave Logic**: Background API calls to Redis on every answer change.
  - **Offline Resilience**: Sync state to `localStorage`.
- [ ] **Backend (FastAPI & Redis)**:
  - `POST /exam/start/{package_id}`: Initialize session, record `start_time` in DB, return all questions.
  - `POST /exam/autosave`: Store answers in Redis Hash (`HSET exam_session:{user_id}:{session_id} {question_id} {answer}`).
  - **Server-side Timer**: Validate request time against `end_time` in DB.

---

## Phase 4: Scoring, Analytics & Background Tasks
**Goal**: Scalable scoring and deep insights.
- [ ] **Backend**:
  - Implement Scoring Algorithm (correct/wrong logic for TWK/TIU and graded logic for TKP).
  - Setup **Celery Workers** for asynchronous scoring processing.
  - Store "Pre-calculated" results in PostgreSQL to ensure fast result retrieval.
- [ ] **Frontend**:
  - Result dashboard with categorized charts (Radar charts for TWK/TIU/TKP).
  - Discussion mode (Showing correct answer vs user answer per question).

---

## Phase 5: Leaderboard & Social Features
**Goal**: Competition and engagement.
- [ ] **Backend**:
  - Implementation of **Redis ZSET (Sorted Sets)** for real-time ranking.
  - API for Global and Agency-specific leaderboards.
- [ ] **Frontend**:
  - National ranking page with search and pagination.
  - "My Rank" widget in the dashboard.

---

## Phase 6: Payment Integration & Final Polish
**Goal**: Monetization and SEO.
- [ ] **Backend**:
  - Integrate **Midtrans** (Snap/Core API) for transactions.
  - Webhook handlers for payment status updates.
- [ ] **Frontend**:
  - Payment success/failed landing pages.
  - SEO optimization and performance audit.

---

## Phase 7: Deployment (Production)
- [ ] Dockerizing the entire application (Multi-stage builds).
- [ ] CI/CD pipeline setup (e.g., GitHub Actions).
- [ ] SSL & Domain configuration on VPS.
