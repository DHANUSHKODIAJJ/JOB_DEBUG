# JOB DEBUG

A full-stack job application tracker with a built-in scam checker, made for freshers navigating the Indian job market. Track your applications, verify a job posting before you apply, and match your resume against a JD - in one place.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow)

## Why this exists

Freshers lose time (and sometimes money) to fake job posts: "registration fee" demands, paid-training institutes posing as employers, WhatsApp-only hiring, consultancy posts dressed up as direct openings. JOB DEBUG started as a personal job-hunt tracker and grew a scam checker on top of it, so the postings worth your time are separated from the ones that are not.

## Features

### Job Scam Checker (hero feature)

Paste a job description (plus optional company name, HR email, and salary text) and get back a verdict, a score, and the exact red flags that produced it.

- **Rule-based engine, not a black box.** 16 weighted rules written for Indian job-market scams, each returning a human-readable flag:
  - `fee-demand` - registration / security deposit / training-fee demands. A clause-aware parser (`hasCandidateFeeDemand`) understands negations ("no registration fee") and employer-paid phrasing ("we will cover training costs"), and can spot an amount tied to a payment action.
  - `free-email-hr` - HR recruiting from Gmail/Yahoo instead of a company domain.
  - `no-interview` - "direct joining, no interview" bait.
  - `paid-training-institute` - courses sold as jobs ("training cum placement").
  - `consultancy-pattern` - staffing/consultancy posts, not direct openings.
  - `phone-only-contact` - only an Indian mobile number, no email or website.
  - `guaranteed-job`, `weekly-payout-bait`, `chat-only-contact` - classic scam vocabulary.
  - `urgency-pressure`, `vague-jd`, `urgent-vague-eligibility`, `mixed-bulk-roles`, `classified-contact-hours`, `missing-company-with-classified-signals` - the classified-ad pattern set.
  - `poor-writing-quality` - clusters of the spelling mistakes scammers repeat ("vaccancy", "traning", "salery"...).
- **Three verdict levels:** `looks_ok` / `caution` / `danger` from rule weights and severity.
- **Category classification:** each post is labelled `legit`, `consultancy`, `institute`, or `scam` from the flags that fired.
- **AI second opinion (optional).** A Hugging Face zero-shot model (`facebook/bart-large-mnli`) can vote on top of the rules - capped at 6 points, ignored below 0.7 confidence, so it can nudge a verdict but never manufacture a `danger` on its own.
- **Company context.** A rule-based company-type classifier reads the name + JD clues (a JD never says "consultancy", so the name carries the signal), and a Google Maps embed shows where the company claims to be.

### JD vs Resume Matcher

Paste a JD and upload your resume PDF (parsed in memory, 3 MB cap). Get a match score with matched and missing skills - a skills-dictionary pass plus a candidate-term layer so non-tech and domain terms (ERP, CRM) are not silently dropped.

### Dashboard & Applications

- **Applications tracker** - full CRUD pipeline for the jobs you are pursuing.
- **Per-user dashboard** - your own scam / legit / caution check counts, computed with a MongoDB aggregation.

### Auth & Security

- JWT sessions in an httpOnly cookie, bcrypt password hashing.
- helmet, rate-limited auth endpoints (20 attempts / 15 min), strict CORS, Zod validation on every input.

## Tech Stack

| Layer    | Technology                                            |
|----------|-------------------------------------------------------|
| Frontend | React 18, TypeScript, Vite, React Router, plain CSS   |
| Backend  | Node.js, Express, TypeScript                          |
| Database | MongoDB with Mongoose                                 |
| AI       | Hugging Face free inference (zero-shot classification)|
| Auth     | JWT (httpOnly cookie), bcryptjs                       |

## Project Structure

```
JOB_DEBUG/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── api/                # API client + endpoint modules
│       ├── components/         # Reusable UI (e.g. CompanyMap)
│       ├── pages/              # Login, Register, Dashboard, Applications, CheckJob, Match
│       ├── styles/             # Page-wise stylesheets
│       └── lib/                # Helpers, constants, types
└── server/                     # Express + TypeScript API
    └── src/
        ├── config/             # Env + database setup
        ├── controllers/        # Route handlers
        ├── middleware/         # Auth, validation, error handling
        ├── models/             # Mongoose models (User, Company, Application, JobCheck)
        ├── routes/             # auth, applications, companies, checks, match
        ├── services/           # verdict, ai, company-type, resume-match, location, naukri
        ├── utils/              # ApiError, JWT helpers
        └── validators/         # Zod schemas
```

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB connection string (local or a free MongoDB Atlas cluster)

### Backend

```bash
cd server
npm install
```

Create `server/.env` (keys listed in the root `.env.example`):

```env
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Optional - enables the AI second opinion in the scam checker
HF_API_KEY=your-hugging-face-token
```

```bash
npm run dev          # starts on http://localhost:5000
```

### Frontend

```bash
cd client
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev            # starts on http://localhost:5173
```

## API Overview

| Method | Endpoint               | Description                                     | Auth |
|--------|------------------------|-------------------------------------------------|------|
| POST   | /api/auth/register     | Create account                                  | No   |
| POST   | /api/auth/login        | Log in, sets session cookie (rate-limited)      | No   |
| POST   | /api/auth/logout       | Clear session                                   | No   |
| GET    | /api/auth/me           | Current user                                    | Yes  |
| GET    | /api/applications      | List applications (filterable)                  | Yes  |
| POST   | /api/applications      | Create application                              | Yes  |
| GET    | /api/applications/:id  | Get one application                             | Yes  |
| PATCH  | /api/applications/:id  | Update application / status                     | Yes  |
| DELETE | /api/applications/:id  | Delete application                              | Yes  |
| GET    | /api/checks            | List past checks                                | Yes  |
| POST   | /api/checks            | Run the scam checker on a job post              | Yes  |
| GET    | /api/checks/stats      | Per-user verdict counts (dashboard)             | Yes  |
| GET    | /api/checks/:id        | Get one check                                   | Yes  |
| POST   | /api/checks/from-url   | Check from a job-post URL                       | Yes  |
| GET    | /api/companies         | List company records                            | Yes  |
| POST   | /api/companies         | Create company record                           | Yes  |
| GET    | /api/companies/:id     | Get one company                                 | Yes  |
| PATCH  | /api/companies/:id     | Update company record                           | Yes  |
| DELETE | /api/companies/:id     | Delete company record                           | Yes  |
| POST   | /api/match             | JD vs resume PDF match score                    | Yes  |
| GET    | /api/health            | Health check                                    | No   |

## Roadmap

- [ ] Deploy (backend + frontend) with a live demo link
- [ ] Fetch the JD directly from a pasted Naukri job URL (today: paste the text)
- [ ] Extract job location from the JD text
- [ ] Replace the general zero-shot model with a fine-tuned scam classifier trained on real postings
- [ ] Reminders and email notifications for application follow-ups

## License

MIT
