# Implementation Plan - CPNS Platform V2.0

This document outlines the phased development of the CPNS Exam Practice Platform using Next.js 16.1, FastAPI 0.135.1, PostgreSQL 16, and Redis 7.

---

## Phase 1: Authentication & User Management
**Goal**: Secure access and personalized experience.
- [ ] **Backend**:
  - Implement JWT authentication with HTTP-only cookies.
  - Setup User models (SQLAlchemy) and Pydantic schemas.
  - Integrate OAuth 2.0 (Login with Google).
- [ ] **Frontend**:
  - Build Login and Register pages using Shadcn UI.
  - Implement Client-side Auth provider (Context API or Zustand).
  - Create User Dashboard/Profile settings.

---

## Phase 2: Catalog & Package Management
**Goal**: Manage and sell exam packages.
- [ ] **Backend**:
  - CRUD for Exam Packages and Questions.
  - Implement search and category filtering (TWK, TIU, TKP, Mix).
  - Middleware for package access control (Premium vs Free).
- [ ] **Frontend**:
  - Build the Catalog page with responsive cards.
  - Search and filter UI.
  - Package detail view with "Buy Now" and "Start Tryout" triggers.

---

## Phase 3: Real-time CAT Interface
**Goal**: High-reliability exam engine.
- [ ] **Frontend**:
  - Build the CAT engine UI (Question view, Option selection).
  - Navigation panel (1-110) with reactive status indicators (Answered, Doubt, Skip).
  - Implement **Autosave** to Redis via background API calls.
  - LocalStorage sync for offline tolerance.
- [ ] **Backend**:
  - Exam Session management API.
  - Timer synchronization (Server-side source of truth).
  - Redis integration for temporary answer storage.

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
