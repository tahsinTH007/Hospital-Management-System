<div align="center">

# 🏥 MedFlow AI — Hospital Management System

**A full-stack hospital management platform with AI-assisted patient triage, X-ray analysis, real-time updates and integrated billing.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.x-black?logo=bun&logoColor=white)](https://bun.sh)
[![React Router](https://img.shields.io/badge/React_Router-v7-CA4245?logo=reactrouter&logoColor=white)](https://reactrouter.com)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](#-deploying-to-vercel)

</div>

---

## ✨ Features

- **Role-based portal** — admin, doctor, nurse, lab tech, pharmacist and patient roles with per-route access control
- **Staff & patient management** — create, edit, ban and delete accounts; searchable, paginated directories
- **AI triage on admission** — Gemini matches a newly admitted patient with the best available doctor and nurse and records the clinical reasoning
- **AI radiology** — upload X-rays (UploadThing); Gemini produces a structured analysis, doctors add clinical notes
- **Billing** — charges accumulate on a draft invoice, patients pay through Polar checkout, webhooks mark invoices as paid, admins get a revenue ledger with monthly stats
- **Notifications & activity log** — in-app notifications for assignments and results, full audit trail of staff actions
- **Real-time updates** — Socket.IO pushes changes to every connected client (with polling fallback on serverless hosts)
- **Dark / light theme**, responsive layout, accessible shadcn/ui components

## 🧱 Tech stack

| Layer      | Technology                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Frontend   | React 19 · React Router v7 (framework mode, SSR) · Tailwind CSS v4 · shadcn/ui · TanStack Query · Recharts |
| Backend    | Bun · Express 5 · TypeScript                                                                            |
| Auth       | Better Auth (email/username + password, admin plugin)                                                   |
| Database   | MongoDB (Mongoose)                                                                                      |
| Workflows  | Inngest (durable background jobs)                                                                       |
| AI         | Google Gemini                                                                                           |
| Payments   | Polar                                                                                                   |
| Uploads    | UploadThing                                                                                             |
| Real-time  | Socket.IO                                                                                               |

## 🗺️ Architecture

```
 Browser ──► React Router app (SSR, Vercel)
               │  /api/*  (same-origin proxy)
               ▼
           Express API ──► MongoDB Atlas
               │  ├─► Better Auth (sessions, roles)
               │  ├─► Inngest  ──► Gemini (triage, x-ray analysis)
               │  ├─► Polar    (checkout, webhooks)
               │  └─► UploadThing (files)
               └─► Socket.IO (real-time, long-lived hosts only)
```

## 🚀 Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.x (Node.js 20+ also works for the backend)
- A MongoDB database (local or [Atlas](https://www.mongodb.com/atlas))
- API keys for the integrations you want to use (Gemini, UploadThing, Polar)

### 1. Clone & install

```bash
git clone https://github.com/tahsinTH007/Hospital-Management-System.git
cd Hospital-Management-System

cd backend && bun install
cd ../frontend && bun install
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env   # then fill in the values
```

| Variable               | Required | Description                                                                                 |
| ---------------------- | :------: | ------------------------------------------------------------------------------------------- |
| `MONGO_URI`            |    ✅    | MongoDB connection string **including a database name**, e.g. `mongodb+srv://…/medflow`     |
| `BETTER_AUTH_SECRET`   |    ✅    | Long random string (`openssl rand -base64 32`)                                              |
| `BETTER_AUTH_URL`      |    ✅    | Public URL of the API (`http://localhost:5000` locally)                                     |
| `FRONTEND_URL`         |    ✅    | Allowed frontend origin(s), comma separated (`http://localhost:5173`)                       |
| `PORT`                 |          | API port (default `5000`)                                                                   |
| `NODE_ENV`             |          | `development` or `production`                                                               |
| `GEMINI_KEY`           |    ✅    | Google AI Studio key (triage & x-ray analysis)                                              |
| `GEMINI_MODEL`         |          | Override the Gemini model (default `gemini-3-flash-preview`)                                |
| `UPLOADTHING_TOKEN`    |    ✅    | UploadThing app token (x-ray uploads)                                                       |
| `POLAR_ACCESS_TOKEN`   |    ✅    | Polar organization access token                                                             |
| `POLAR_PRODUCT_ID`     |    ✅    | Polar product used for hospital invoices (custom amount)                                    |
| `POLAR_WEBHOOK_SECRET` |    ✅    | Secret of the Polar webhook pointing at `/api/auth/polar/webhooks`                          |
| `POLAR_SERVER`         |          | `sandbox` (default) or `production`                                                         |
| `INNGEST_EVENT_KEY`    |   prod   | Inngest event key (not needed with the local dev server)                                    |
| `INNGEST_SIGNING_KEY`  |   prod   | Inngest signing key (not needed with the local dev server)                                  |
| `CROSS_SITE_COOKIES`   |          | `true` only when the frontend calls the API on another origin without the `/api` proxy      |

### 3. Create the first administrator

```bash
cd backend
bun run seed:admin                       # username: tahsin  password: tahsin  email: tahsin@medflow.com
# or choose your own credentials
bun run seed:admin -- --username admin --password "s3cret!" --email admin@hospital.com --name "Jane Doe"
```

The script is idempotent — running it again updates the role/password of the existing account. Every other account is created by an admin from the UI.

#### Optional: load demo data

```bash
bun run seed:demo
```

Fills every collection with realistic sample data: an extra admin, 5 doctors, 4 nurses, a lab technician, a pharmacist, 10 patients (with AI triage assignments), 15 invoices across the year, X-ray results with analyses, notifications and an activity trail. All demo accounts use the password `medflow123` (override with `DEMO_PASSWORD`). Safe to re-run — generated records are replaced, existing passwords are kept.

| Role       | Username              | Email                             |
| ---------- | --------------------- | --------------------------------- |
| admin      | `amina.khan`          | amina.khan@medflow.com            |
| doctor     | `grace.hopper`        | grace.hopper@medflow.com          |
| doctor     | `alan.turing`         | alan.turing@medflow.com           |
| nurse      | `florence.nightingale`| florence.nightingale@medflow.com  |
| lab tech   | `ravi.patel`          | ravi.patel@medflow.com            |
| pharmacist | `nadia.rahman`        | nadia.rahman@medflow.com          |
| patient    | `john.carter`         | john.carter@medflow.com           |
| patient    | `carlos.silva`        | carlos.silva@medflow.com          |

### 4. Run it

```bash
# terminal 1 – API + Inngest dev server
cd backend && bun run dev

# terminal 2 – web app
cd frontend && bun run dev
```

Open <http://localhost:5173> and sign in with the admin credentials. The frontend needs no `.env` locally: `/api/*` is proxied to the backend by Vite, so the session cookie stays first-party (see `frontend/.env.example` for optional overrides).

### Scripts

| Location   | Command              | What it does                                                  |
| ---------- | -------------------- | ------------------------------------------------------------- |
| `backend`  | `bun run dev`        | API with hot reload + Inngest dev server                      |
| `backend`  | `bun run start`      | API only (production style)                                   |
| `backend`  | `bun run seed:admin` | Create/update the admin account                               |
| `backend`  | `bun run seed:demo`  | Load sample data into every collection                        |
| `backend`  | `bun run typecheck`  | TypeScript check                                              |
| `frontend` | `bun run dev`        | Vite dev server with `/api` proxy                             |
| `frontend` | `bun run build`      | Production build (`build/client` + `build/server`)            |
| `frontend` | `bun run start`      | Serve the production build                                    |
| `frontend` | `bun run typecheck`  | Route typegen + TypeScript check                              |

## ☁️ Deploying to Vercel

The repository is deployed as **two Vercel projects** pointing at the same GitHub repo.

### Backend project

| Setting        | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Root Directory | `backend`                                                                |
| Framework      | Express (auto-detected, `src/app.ts` exports the app)                    |

Environment variables:

| Variable               | Value                                                    |
| ---------------------- | -------------------------------------------------------- |
| `NODE_ENV`             | `production`                                             |
| `MONGO_URI`            | your Atlas connection string (with database name)        |
| `BETTER_AUTH_SECRET`   | long random secret                                       |
| `BETTER_AUTH_URL`      | `https://<backend-project>.vercel.app`                   |
| `FRONTEND_URL`         | `https://<frontend-project>.vercel.app`                  |
| `GEMINI_KEY`           | Gemini API key                                           |
| `UPLOADTHING_TOKEN`    | UploadThing token                                        |
| `POLAR_ACCESS_TOKEN`   | Polar token                                              |
| `POLAR_PRODUCT_ID`     | Polar product id                                         |
| `POLAR_WEBHOOK_SECRET` | Polar webhook secret                                     |
| `POLAR_SERVER`         | `sandbox` or `production`                                |
| `INNGEST_EVENT_KEY`    | from the Inngest dashboard                               |
| `INNGEST_SIGNING_KEY`  | from the Inngest dashboard                               |

After the first deploy:

1. Inngest dashboard → *Sync app* with `https://<backend-project>.vercel.app/api/inngest`
2. Polar dashboard → webhook URL `https://<backend-project>.vercel.app/api/auth/polar/webhooks`
3. Run `bun run seed:admin` locally with `MONGO_URI` pointing at the production database

> **Note:** Vercel Functions cannot keep WebSocket connections open, so Socket.IO is disabled there and the UI falls back to refetching/polling (`GET /api/health` reports `"realtime": false`). For true real-time updates host the backend on a long-lived server (Render, Railway, Fly.io, a VPS) with `bun run start`.

### Frontend project

| Setting        | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| Root Directory | `frontend`                                                   |
| Framework      | React Router (auto-detected, uses `@vercel/react-router`)    |

Environment variables:

| Variable          | Value                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `BACKEND_URL`     | `https://<backend-project>.vercel.app` — target of the `/api/*` proxy route in `frontend/vercel.json` |
| `VITE_SOCKET_URL` | *(optional)* Socket.IO server URL, only if the backend runs on a host with WebSocket support        |

The proxy keeps the API same-origin so the auth cookie works in every browser. If you prefer calling the backend directly, set `VITE_API_URL=https://<backend-project>.vercel.app` here and `CROSS_SITE_COOKIES=true` on the backend instead of `BACKEND_URL`.

## 👥 Roles & access

| Role       | Dashboard | Patients | Doctors | Nurses | Admins | Activity log | Financial ledger | Own profile & billing |
| ---------- | :-------: | :------: | :-----: | :----: | :----: | :----------: | :--------------: | :-------------------: |
| admin      |    ✅     |    ✅    |   ✅    |   ✅   |   ✅   |      ✅      |        ✅        |          ✅           |
| doctor     |    ✅     |    ✅    |   ✅    |        |        |              |                  |          ✅           |
| nurse      |    ✅     |    ✅    |         |        |        |              |                  |          ✅           |
| patient    |           |          |         |        |        |              |                  |          ✅           |

Pharmacy, laboratory, appointments/telemedicine and settings appear in the navigation as **coming soon**.

## 📁 Project structure

```
backend/
  scripts/seed-admin.ts     first admin account
  scripts/seed-demo.ts      sample data for every collection
  src/app.ts                Express app (Vercel entry, no listen)
  src/server.ts             local runner: HTTP server + Socket.IO
  src/config/               env + cached MongoDB connection
  src/lib/                  better-auth, polar, uploadthing, socket
  src/controllers/ routes/ models/ middleware/
  src/inngest/              AI triage, x-ray analysis and billing workflows
frontend/
  app/routes.ts             route table (protected routes under routes/protected/)
  app/lib/config.ts         API / socket URL resolution
  app/lib/api.ts            typed API client
  app/components/           ui (shadcn), navigation, dashboard, users, global
  vercel.json               /api proxy route for Vercel
```

## 🗓️ Roadmap

- [ ] Pharmacy: prescriptions, dispensing and inventory
- [ ] Laboratory: test requests and results entry
- [ ] Appointments & telemedicine
- [ ] Settings: roles & permissions, billing configuration
- [ ] Email notifications and password reset

## 📄 License

Released under the [MIT License](LICENSE) © 2026 Tahsin Hassan.
