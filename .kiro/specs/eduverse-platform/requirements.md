# Requirements Document

## Introduction

EduVerse is an AI-powered smart learning platform that connects students, instructors, and administrators in a unified ecosystem. The platform delivers adaptive learning experiences through AI tutoring (Groq + Gemini routing), live face-to-face classes via WebRTC, quiz-based knowledge tracking, and real-time analytics. It is composed of three deployable units: a Node.js/Express/PostgreSQL/Redis backend, a React 18 student-and-instructor portal (student-frontend), and a React 18 standalone admin panel (admin-frontend).

---

## Glossary

- **System**: The EduVerse platform as a whole
- **Auth_Service**: The backend module responsible for authentication and session management
- **Course_Service**: The backend module responsible for course CRUD, lesson management, and enrollment
- **AI_Router**: The backend module that routes AI tutor queries between Groq and Gemini APIs
- **AI_Tutor**: The AI-powered question-answering feature available to students
- **Adaptive_Engine**: The backend module that tracks quiz performance and adjusts difficulty and recommendations
- **Quiz_Service**: The backend module responsible for quiz creation, delivery, grading, and analytics
- **Notification_Service**: The backend module responsible for email alerts, badges, streaks, and leaderboards
- **Audit_Service**: The backend module that records all privileged actions with actor, timestamp, and IP
- **Live_Class_Service**: The backend module managing WebRTC signaling and Socket.io rooms for live classes
- **Student_Portal**: The student-frontend React application used by students and instructors
- **Admin_Panel**: The admin-frontend React application used by platform administrators
- **Student**: A registered user with the student role
- **Instructor**: A registered user with the instructor role
- **Admin**: A registered user with the admin role
- **JWT**: JSON Web Token used for stateless authentication
- **Refresh_Token**: A long-lived token used to obtain new access tokens without re-authentication
- **Knowledge_Graph**: A per-student data structure tracking mastery levels across course topics
- **Spaced_Repetition**: A scheduling algorithm that resurfaces review material at increasing intervals based on recall performance
- **2FA**: Two-factor authentication using a time-based one-time password (TOTP)
- **AES-256**: Advanced Encryption Standard with a 256-bit key, used for encrypting sensitive data at rest
- **TLS 1.3**: Transport Layer Security version 1.3, used for encrypting data in transit
