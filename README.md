<div align="center">

# 🎯 <span style="font-size: 3rem; font-weight: 900;">ACECAST - 🚀 Next-Gen Career Launchpad </span>
 <span style="font-size: 1.2rem; font-weight: 500;">Ace It. Cast It. Own It.</span>

</div>
<div align="center">

*"Your Future Starts with the Next Question"*

A full-stack interview training platform with real MySQL database, JWT authentication, live leaderboard, and proctored exam simulator.

![AceCast](https://img.shields.io/badge/AceCast-v2.0-red?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?style=flat-square)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?style=flat-square)
![JWT](https://img.shields.io/badge/Auth-JWT-orange?style=flat-square)
![Render](https://img.shields.io/badge/Backend-Render-purple?style=flat-square)
![Netlify](https://img.shields.io/badge/Frontend-Netlify-brightgreen?style=flat-square)
![Aiven](https://img.shields.io/badge/Database-Aiven-red?style=flat-square)
![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red?style=flat-square)

</div>

---

## 🚀 Live Demo

🌐 **(https://acecastbyksaranya.netlify.app/)**
 


---

## 📋 Table of Contents

1. [What is AceCast?](#-what-is-AceCast)
2. [Features](#-features)
3. [Tech Stack](#-tech-stack)
4. [How to Use](#-how-to-use)
5. [Project Structure](#-project-structure)
6. [Deployment Guide](#-deployment-guide)
7. [API Endpoints](#-api-endpoints)
8. [XP & Level System](#-xp--level-system)
9. [Roadmap](#-roadmap)
10. [Privacy & Security](#-privacy--security)
11. [License](#-license)
12. [Contact](#-contact)

---

## 💡 What is AceCast?

**AceCast** is a production-grade, full-stack web application built for interview preparation. Unlike static frontend-only platforms, AceCast features persistent cloud storage, real authentication, and a live competitive leaderboard.
 
| Feature | Description |
|---------|-------------|
| 🗄️ **MySQL Database** | All user data, XP, streaks, and leaderboard rankings persist in the cloud |
| 🔐 **JWT Authentication** | Secure login/register with bcrypt password hashing (12 salt rounds) |
| 🏆 **Live Leaderboard** | Real-time rankings across all registered users |
| 🔒 **Proctored Exam** | Anti-cheat detection with tab switching, copy/paste blocking, and integrity scoring |
| 🔥 **XP & Streaks** | Saved to database — survives browser refresh and device changes |
| ☁️ **Cloud Deployment** | Frontend on Netlify, Backend on Render, Database on Aiven |

### Who is it for?
 
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
Full anti-cheat suite to simulate real exam conditions:

| Detection | Behaviour |
|-----------|-----------|
| Tab switch | Warning issued; exam terminates after 3 violations |
| Copy / Paste | Ctrl+C, Ctrl+V, Ctrl+X all blocked |
| Context menu | Right-click disabled during exam |
| Keyboard shortcuts | F12, Ctrl+Shift+I, DevTools access blocked |
| Fullscreen exit | Warning issued; fullscreen re-requested automatically |

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

---

## 🛠️ Tech Stack

| Component | Technology | Built/Developed | Hosted On |
|-----------|------------|-----------------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript | VS Code | Netlify |
| **Backend** | Node.js, Express | VS Code | Render |
| **Database** | MySQL 8.0 | MySQL Workbench | Aiven |
| **Authentication** | JWT + bcryptjs | Implemented in server.js | — |

 
---

## 🚀 How to Use

###No Setup Required

1. Open the live site: [https://AceCastbysaranyak.netlify.app](https://acecastbysaranyakit.netlify.app/)
2. Click **Get Started** → Create your account
3. Login and start practicing
4. Your XP, streaks, and leaderboard rank are saved in the cloud — access from any device

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

## 🗺️ Roadmap (Future Implementations)

- [ ] AI-generated feedback on open-ended answers (GPT integration)
- [ ] Resume builder with ATS scoring
- [ ] Voice-based mock interview mode
- [ ] Company-specific question banks (Google, Amazon, etc.)
- [ ] Mobile app (React Native)
- [ ] College/bootcamp admin portal
- [ ] Interview room — peer-to-peer mock sessions
- [ ] Dark mode polish and PWA support

---

## 🔒 Privacy & Security

- Passwords hashed with **bcryptjs** (12 salt rounds) — never stored in plain text
- **JWT tokens** expire and are validated server-side on every protected request
- **CORS** is configured to allow only the registered frontend origin
- **SSL/TLS** enforced on all Aiven database connections
- No third-party trackers or analytics on user data
- User data is stored only in your own Aiven MySQL instance

## 🔐 Authentication

- **Technology:** JWT (JSON Web Token) + bcryptjs
- **Implementation:** Custom code in `server.js`
- **Password Storage:** bcrypt hashes in Aiven MySQL
- **Token Storage:** Browser localStorage (expires in 7 days)

### How It Works

1. User registers → Password hashed with bcrypt → Saved to database
2. User logs in → Password verified → JWT token generated
3. Token stored in browser → Sent with every API request
4. Backend verifies token → Grants access to protected routes
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

> Built with ❤️ for every student who ever panicked before an interview.

---

<div align="center">

⭐ **If this project helped you, please star the repo!** ⭐

[🌐 Live Demo](https://acecastbysaranyakit.netlify.app/) · [🐛 Report Bug](https://github.com/saranya866/AceCast/issues) · [💡 Request Feature](https://github.com/saranya866/AceCast/issues)


</div>
