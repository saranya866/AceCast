<div align="center">

<img src="https://img.shields.io/badge/AceCast-v2.0-FF4B4B?style=for-the-badge&logo=rocket&logoColor=white" />

# 🎯 AceCast — Next-Gen Career Launchpad

### *Ace It. Cast It. Own It.*

> *"Your Future Starts with the Next Question"*

A **production-grade, full-stack interview training platform** with persistent cloud storage, JWT authentication, live competitive leaderboard, and a proctored exam simulator — built for students and professionals who are serious about cracking placements.




[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-acecastbyksaranya.netlify.app-00C7B7?style=for-the-badge)](https://acecastbyksaranya.netlify.app/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT-FB015B?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Netlify](https://img.shields.io/badge/Frontend-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://netlify.com/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![Aiven](https://img.shields.io/badge/Database-Aiven-FF3D00?style=for-the-badge)](https://aiven.io/)
[![Resend](https://img.shields.io/badge/Email-Resend-000000?style=for-the-badge&logo=resend&logoColor=white)](https://resend.com/)
[![License](https://img.shields.io/badge/License-All_Rights_Reserved-red?style=for-the-badge)](./LICENSE)

</div>


## 🚀 Live Demo

🌐 **(https://acecastbyksaranya.netlify.app/)**
 


---

## 📋 Table of Contents

1. [What is AceCast?](#-what-is-acecast)
2. [Who is it For?](#-who-is-it-for)
3. [Features](#-features)
4. [XP & Level System](#-xp--level-system)
5. [Security Architecture](#-security-architecture)
6. [Tech Stack](#-tech-stack)
7. [How to Use](#-how-to-use)
8. [Project Structure](#-project-structure)
9. [Deployment Guide](#-deployment-guide)
10. [API Endpoints](#-api-endpoints)
11. [Roadmap](#-roadmap)
12. [License](#-license)
13. [Contact](#-contact)

---

## 💡 What is AceCast?

**AceCast** is a production-grade, full-stack web application built for serious interview preparation. Unlike static, frontend-only quiz platforms, AceCast features **persistent cloud storage**, **real JWT authentication**, a **live competitive leaderboard**, and a **proctored exam simulator**.
 
| Feature | Description |
|---------|-------------|
| 🗄️ **MySQL Cloud Database** | All user data, XP, streaks, and leaderboard rankings persist in Aiven's managed cloud |
| 🔐 **JWT + bcrypt Authentication** | Secure registration and login with 12-round bcrypt password hashing |
| 🏆 **Live Leaderboard** | Real-time global rankings updated across all registered users |
| 🔒 **Proctored Exam Simulator** | Anti-cheat detection: tab switching, copy/paste blocking, fullscreen enforcement |
| 🔥 **XP & Daily Streaks** | Saved to database — persists across refreshes, devices, and sessions |
| 🔑 **Multi-Method Login** | Email/Password, Google OAuth, and Email OTP — all production-ready |
| 🛡️ **2FA Support** | TOTP-based two-factor authentication with Google Authenticator |
| ☁️ **Cloud Deployed** | Frontend on Netlify · Backend on Render · Database on Aiven |

---

## 👥 Who is it For?
 
| Audience | Pain Point | How AceCast Helps |
|----------|------------|--------------------------|
| 🎓 **B.Tech / BCA / MCA Students** | Campus placements are competitive, syllabus is vast | Topic-wise tests, DSA coding challenges, and a 10-week structured roadmap to cover everything before D-Day |
| 💼 **Freshers & Job Seekers** | Don't know what FAANG actually asks | 1000+ curated real-world questions, mock interviews with model answers, and a proctored exam simulator |
| 🔁 **Working Professionals** | Switching roles after years in industry | Targeted practice by category (System Design, SQL, OS) with XP-based progress tracking to stay motivated |
| 🏫 **Colleges & Bootcamps** | Need an internal placement prep portal | Deployable with your own database — leaderboard, streaks, and badges keep students engaged and competitive |
| 🌍 **Self-Learners** | No structure, no accountability | Daily streaks, milestone badges, weekly competitions, and a live leaderboard to keep the habit going |
---

## ✨ Features

### 🧠 1000+ Interview Questions
Curated Q&A across 40+ categories including Java, DSA, Algorithms, System Design, SQL, OS, Networking, Python, Spring Boot, Design Patterns, and Behavioral.
 
| Format | Description |
|--------|-------------|
| **MCQ** | 4 options, instant feedback, correct answer revealed on submission |
| **Open-ended** | Text answer, model answer shown after submission |
---

### 💻 Coding Challenges
8 real LeetCode-style problems with full descriptions, examples, hints, and editorial solutions:

| Problem | Difficulty | XP Reward |
|---------|------------|-----------|
| Two Sum | 🟢 Easy | +20 XP |
| Reverse Linked List | 🟢 Easy | +20 XP |
| Valid Parentheses | 🟢 Easy | +20 XP |
| Binary Search | 🟢 Easy | +20 XP |
| Climbing Stairs | 🟢 Easy | +25 XP |
| Maximum Subarray | 🟡 Medium | +35 XP |
| Merge Intervals | 🟡 Medium | +35 XP |
| LRU Cache | 🔴 Hard | +60 XP |

---

### 📝 Topic-wise Tests

Timed, auto-graded subject tests on Java, DSA, SQL, OS, Networking, and System Design. Grades scale from A+ to D. XP awarded is proportional to your final score.

---

### 🎮 Skill Games

| Game | Description | XP Reward |
|------|-------------|-----------|
| 🃏 Tech Flashcards | Flip through 50 key CS concepts | +15 XP |
| ⚡ Quiz Blitz | 10 MCQs against the clock | Up to +30 XP |
| 🐛 Bug Hunt | Find and fix bugs in code snippets | +10 XP/round |
| 📚 Term Sprint | Match CS terms to definitions | +20 XP |

---

### 🎯 Mock Interview

Simulate a real interview with configurable category, difficulty, and question count. Timed, scored, with model answers revealed after each question.

---

### 🔒 Proctored Exam

A full anti-cheat suite to simulate real exam conditions:


| Detection | Behaviour |
|-----------|-----------|
| **Tab Switch** | Warning issued; exam auto-terminates after 3 violations |
| **Copy / Paste** | Ctrl+C, Ctrl+V, Ctrl+X all blocked |
| **Context Menu** | Right-click disabled during the exam |
| **DevTools Access** | F12, Ctrl+Shift+I blocked |
| **Fullscreen Exit** | Warning issued; fullscreen re-requested automatically |

**Integrity Score Formula:**
```
Integrity = 100 - (tabSwitches × 15) - (fullscreenExits × 10) - (pasteAttempts × 8)
```

---

### 🗺️ 10-Week Learning Roadmap

| Phase | Weeks | Topics |
|-------|-------|--------|
| Phase 1 | 1–2 | Foundations: Big O, Arrays, Linked Lists, Stacks |
| Phase 2 | 3–5 | Core DSA: Trees, Graphs, DP, Sorting |
| Phase 3 | 6–7 | System Design: Scalability, Caching, API Design |
| Phase 4 | 8–9 | Tech Stack: Java, SQL/NoSQL, OS, Cloud |
| Phase 5 | 10 | Soft Skills: STAR Method, HR Questions, Salary Negotiation |

---

### 💼 Job Board

12 curated listings from top companies with direct links to official career pages and salary ranges:

`Google` · `Amazon` · `Microsoft` · `Meta` · `Flipkart` · `Swiggy` · `Razorpay` · `PhonePe` · `TCS` · `Infosys` · `Zomato` · `Wipro`

---

### 🏅 Weekly Competitions

Live coding contests and quiz battles every week. Join live events to earn XP multipliers and exclusive Champion badges.

---

### 🔥 Streaks & Badges

Daily login streaks with milestone XP rewards. 12 unlockable achievement badges at 3, 7, 14, 30, 60, and 100 day milestones.

---

## 🏆 XP & Level System

| Level | Title | XP Required |
|-------|-------|-------------|
| 🌱 | Novice | 0 |
| 🔵 | Apprentice | 500 |
| 🟡 | Practitioner | 1,500 |
| 🟠 | Expert | 3,500 |
| 🔴 | Master | 7,500 |
| 👑 | Grandmaster | 15,000 |

XP is earned from questions, coding challenges, tests, games, mock interviews, and daily streaks. All progress is saved to the cloud.

---
### 📧 Email OTP (Passwordless Login)

AceCast supports **passwordless login** via email OTP powered by **Resend**.

| Feature | Description |
|---------|-------------|
| **Provider** | Resend.com (free tier: 3,000 emails/month) |
| **OTP Length** | 6 digits |
| **Expiry** | 5 minutes |
| **Security** | OTPs stored in memory, deleted after use |
| **Delivery** | Beautiful HTML email template |

**Why Resend?**
- ✅ Works on Render's free tier (HTTP API, not SMTP)
- ✅ Free 3,000 emails/month
- ✅ 30-second setup
- ✅ Excellent deliverability
---

## 🛡️ Security Architecture

AceCast implements **12+ production-level security features**.

### Password Security
| Feature | Implementation |
|---------|----------------|
| Password Hashing | bcryptjs with 12 salt rounds |
| Minimum Length | 12 characters required |
| Complexity Rules | Uppercase + Lowercase + Number + Special character |
| Sequential Block | Blocks patterns like `123`, `234`, `345` |
| Breached Password Check | Checked against Have I Been Pwned (HIBP) API |
| Password Expiry | Forces password change every 6 months |

### Account Lockout & Rate Limiting
| Feature | Implementation |
|---------|----------------|
| **Max Failed Attempts** | 5 attempts |
| **Lockout Duration** | 24 hours |
| **Tracking** | Per email address |
| **Auto-Reset** | After 24 hours or successful login |
| **User Message** | "Account locked for X hours" |

**How it works:**
- 1-4 wrong passwords → "Invalid credentials"
- 5th wrong password → Account locked for 24 hours
- Successful login → Resets attempt counter
  
### Authentication Security
| Feature | Implementation |
|---------|----------------|
| JWT Tokens | Expires in 7 days; verified server-side |
| Multiple Login Methods | Email/Password · Google OAuth · Email OTP |
| Account Lockout | 5 failed attempts → 24-hour lockout |
| Rate Limiting | Per-email rate limiting |

### Two-Factor Authentication (2FA)
| Feature | Implementation |
|---------|----------------|
| TOTP Support | Compatible with Google Authenticator |
| QR Code Setup | Easy scan-to-configure |
| Recovery Codes | 8 one-time backup codes per account |

### Email OTP Security
| Feature | Implementation |
|---------|----------------|
| 6-Digit OTP | Random generation |
| 5-Minute Expiry | Auto-expires |
| In-Memory Storage | Never persisted in database |
| One-Time Use | Deleted after verification |

### Google OAuth Security
| Feature | Implementation |
|---------|----------------|
| Client ID Validation | Verified with Google servers |
| No Auto-Creation | Users must register first |
| Redirect URI Validation | Only registered URIs accepted |

### Database & API Security
| Feature | Implementation |
|---------|----------------|
| SSL/TLS | Encrypted database connections |
| SQL Injection Prevention | Prepared statements throughout |
| No Plain-Text Passwords | Only bcrypt hashes stored |
| CORS Protection | Only registered frontend origin allowed |

### Email OTP Security (Resend)

| Feature | Implementation |
|---------|----------------|
| **Provider** | Resend.com |
| **Free Tier** | 3,000 emails/month |
| **Delivery Method** | HTTP API (not SMTP) |
| **6-Digit OTP** | Cryptographically random generation |
| **5-Minute Expiry** | OTP auto-expires |
| **In-Memory Storage** | OTPs never persisted in database |
| **One-Time Use** | OTP deleted after successful verification |
| **Works on Render** | ✅ Yes (bypasses SMTP blocking) |

> **Why Resend?** Render's free tier blocks SMTP ports (25, 465, 587). Resend uses HTTP API, so emails work perfectly on Render's free tier.

### Security Features Summary

| Feature | Status |
|---------|--------|
| Password Hashing (bcrypt, 12 rounds) | ✅ Implemented |
| JWT Authentication with Expiry | ✅ Implemented |
| Google OAuth with Server Verification | ✅ Implemented |
| Email OTP (5 min expiry, 1-time use) | ✅ Implemented |
| Two-Factor Authentication (TOTP) | ✅ Implemented |
| **Account Lockout (24h after 5 failures)** | ✅ **Implemented** |
| **Rate Limiting (per email)** | ✅ **Implemented** |
| Password Expiry (6 months) | ✅ Implemented |
| Breached Password Check (HIBP) | ✅ Implemented |
| SQL Injection Prevention | ✅ Implemented |
| SSL/TLS Database Connections | ✅ Implemented |
| CORS Protection | ✅ Implemented |
| Proctored Exam Anti-Cheat | ✅ Implemented |

---

## 🛠️ Tech Stack

| Component | Technology | Built/Developed | Hosted On |
|-----------|------------|-----------------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript | VS Code | Netlify |
| **Backend** | Node.js, Express | VS Code | Render |
| **Database** | MySQL 8.0 | MySQL Workbench | Aiven |
| **Authentication** | JWT + bcryptjs | Implemented in server.js | 
| **OAuth** | Google OAuth 2.0 | — |
| **Email** | Resend API | Resend |
| **2FA** | speakeasy (TOTP) | — |

 
---

## 🚀 How to Use

**No setup required — it's live!**

1. Open: **[https://acecastbyksaranya.netlify.app](https://acecastbyksaranya.netlify.app/)**
2. Click **"Get Started"** → Create your account
3. Login and start practicing
4. Your XP, streaks, and rank are saved in the cloud

---

## 📁 Project Structure

```
AceCast/
├── index.html              # Complete frontend (HTML + CSS + JS, single file)
├── server.js               # Express backend with all API routes
├── package.json            # Node.js dependencies
├── package-lock.json       # Dependency lock file
├── schema.sql              # MySQL database schema & seed data
├── fix-db.js               # Database reset / repair
└── README.md               # This file
```

---

## 🚢 Deployment Guide

### Architecture Overview

| Component | Service | Free Tier | Purpose |
|-----------|---------|-----------|---------|
| **Frontend** | Netlify | Unlimited bandwidth | Hosts HTML/CSS/JS |
| **Backend** | Render | 750 hours/month | Runs Node.js/Express API |
| **Database** | Aiven | 5GB free | MySQL cloud database |
| **Email** | Resend | 3,000 emails/month | OTP & verification emails |

> No credit card required for any of these services.

---

### Step 1 — Database Setup (Aiven)

1. Go to [https://aiven.io](https://aiven.io) and sign in with GitHub
2. Click **"Create Service"** → Select **MySQL**
3. Choose **"Free – Hobbyist"** plan ($0/month)
4. Select region:

| Region | Location |
|--------|----------|
| `ap-south-1` | Mumbai, India *(recommended for Indian users)* |
| `ap-southeast-1` | Singapore |
| `us-east-1` | Virginia, USA |
| `eu-central-1` | Frankfurt, Germany |

5. Click **"Create"** and wait 1–2 minutes
6. Click on your service → **"Connection Information"** tab
7. Copy: `host`, `port`, `user`, `password`, `database name`
8. In the **"Databases"** tab, run `schema.sql` via the query console or a MySQL client
9. SERVICES NEED TO BE TURNED ON WHEN USED 

---

### Step 2 — Backend Deployment (Render)

1. Go to [https://render.com](https://render.com) and sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo: `saranya866/AceCast`
4. Configure:

| Setting | Value |
|---------|-------|
| **Environment** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |

5. Add all Environment Variables (see section below)
6. Click **"Create Web Service"**
7. Copy your Render URL: `(https://interviewforge-4lvh.onrender.com/)`
8. `THE PROJECT WAS ORIGINALLY NAMED AS InterviewForge AND LATER RENAMED AS AceCast`

---

### Step 3 — Frontend Deployment (Netlify)

1. Go to [https://netlify.com](https://netlify.com) and sign in with GitHub
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repo: `saranya866/AceCast`
4. Configure:

| Setting | Value |
|---------|-------|
| **Publish directory** | `/` (root) |
| **Build command** | *(leave empty)* |

5. In `index.html`, update the API base URL to your Render backend URL
6. Click **"Deploy site"**

 ---

### Step 4 — Email Service Setup (Resend)

AceCast uses **Resend** for all email communications (OTP, password reset, email verification).
| Feature | Detail |
|---------|--------|
| **Why Resend?** | Works on Render free tier (HTTP API, not SMTP) |
| **Free Tier** | 3,000 emails/month |
| **Setup Time** | 30 seconds |
| **Used For** | Login OTP, Password Reset, Email Verification |
**How to get API key:**
1. Sign up at [resend.com](https://resend.com)
2. Verify your email
3. Copy API key from dashboard
4. Add to Render environment: `RESEND_API_KEY=re_xxxxx`

---
### Environment Variables (Render)

| Variable | Description |
|----------|-------------|
| `DB_HOST` | Aiven MySQL host |
| `DB_PORT` | MySQL port (usually 12345) |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `JWT_SECRET` | JWT signing secret |
| `RESEND_API_KEY` | Resend email API key |

---

## 🗺️ Roadmap (Future Implementations)

- [ ] AI-generated feedback on answers (LLM integration)
- [ ] Resume builder with ATS scoring
- [ ] Voice-based mock interview mode
- [ ] Company-specific question banks
- [ ] Mobile app (React Native)
- [ ] Admin portal for colleges
- [ ] PWA support

---

## 📄 License

```
© 2026 SARANYA KIT.
 All Rights Reserved.

This project and its source code are proprietary.
Unauthorized copying, distribution, or use of this
software, in whole or in part, is strictly prohibited
without explicit written permission from the author.
```

---

## 👩‍💻 Contact

**Saranya Kit**

[![GitHub](https://github.com/saranya866)
[![LinkedIn](https://in.linkedin.com/in/saranya-kit-6a6360324)
[![Mail](support.acecast@gmail.com)

> Built with ❤️ for every student who ever panicked before an interview.

---

<div align="center">

⭐ **If this project helped you, please star the repo!** ⭐

[🌐 Live Demo](https://acecastbyksaranya.netlify.app/) · [🐛 Report Bug](https://github.com/saranya866/AceCast/issues) · [💡 Request Feature](https://github.com/saranya866/AceCast/issues)


</div>
