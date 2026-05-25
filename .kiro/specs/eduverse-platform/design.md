# Design Document: EduVerse AI-Powered Smart Learning Platform

## Overview

EduVerse is a full-stack, AI-augmented learning platform composed of three independently deployable units:

- `backend/` — Node.js + Express REST API + Socket.io signaling server, backed by PostgreSQL (via Prisma ORM) and Redis
- `student-frontend/` — React 18 SPA serving students and instructors (course browsing, AI tutoring, live classes, quizzes, analytics)
- `admin-frontend/` — React 18 standalone SPA serving platform administrators (user management, system health, audit logs)

The platform's distinguishing capabilities are:
1. **Dual-model AI tutoring** — Groq (fast, ≤500 ms) for conversational Q&A, Gemini (deep reasoning, >500 ms) for complex explanations, with automatic routing
2. **Adaptive learning engine** — per-student knowledge graphs, spaced repetition scheduling, and difficulty adjustment
3. **Live face-to-face classes** — WebRTC peer connections brokered by a Socket.io signaling layer
4. **Role-based access control** — three distinct roles (Student, Instructor, Admin) with separate UI surfaces

---

## Architecture

### High-Level System Diagram

```mermaid
graph TB
    subgraph Clients
        SF[student-frontend<br/>React 18 SPA]
        AF[admin-frontend<br/>React 18 SPA]
    end

    subgraph Backend["backend (Node.js / Express)"]
        GW[API Gateway / Router]
        AS[Auth Service]
        CS[Course Service]
        AIR[AI Router]
        AE[Adaptive Engine]
        QS[Quiz Service]
        NS[Notification Service]
        AUD[Audit Service]
        LCS[Live Class Service<br/>Socket.io]
    end

    subgraph Data
        PG[(PostgreSQL<br/>via Prisma)]
        RD[(Redis<br/>sessions / cache / pub-sub)]
    end

    subgraph External
        GR[Groq API]
        GM[Gemini API]
        GO[Google OAuth2]
        EM[Email Provider<br/>SMTP / SES]
    end

    SF -->|HTTPS REST + WSS| GW
    AF -->|HTTPS REST| GW
    GW --> AS
    GW --> CS
    GW --> AIR
    GW --> AE
    GW --> QS
    GW --> NS
    GW --> AUD
    GW --> LCS
    AS --> PG
    AS --> RD
    CS --> PG
    AIR --> GR
    AIR --> GM
    AIR --> PG
    AE --> PG
    QS --> PG
    NS --> EM
    NS --> PG
    LCS --> RD
    AUD --> PG
```

### Deployment Architecture

```mermaid
graph LR
    subgraph Docker Compose / K8s
        BE[backend container<br/>:3000]
        SFE[student-frontend container<br/>Nginx :80]
        AFE[admin-frontend container<br/>Nginx :80]
        PGC[postgres container<br/>:5432]
        RDC[redis container<br/>:6379]
    end
    CDN[CDN / Load Balancer] --> SFE
    CDN --> AFE
    CDN -->|/api, /socket.io| BE
    BE --> PGC
    BE --> RDC
```

Each unit has its own `Docker