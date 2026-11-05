# 🚀 Pastor — Shared Hosting Deployment Guide (`api/pastor`)

> **Application**: Pastor — Modern Digital Card & QR Profile Platform (`pastor`)  
> **Architecture**: Next.js 16 (App Router + React 19 + Better Auth + Drizzle ORM + Neon PostgreSQL)  
> **Target Environment**: cPanel Shared Hosting with CloudLinux LVE / LiteSpeed & Phusion Passenger  
> **Domain / Application URL**: `https://pastor.senaycreatives.com`  
> **Server Destination**: `/home/<username>/api/pastor/`  
> **Archive Artifact**: `pastor-cpanel-bundle.zip` (~7.0 MB)  
> **Status**: ✅ Pre-compiled, Standalone Packaged, and CI/CD Configured  

---

## 📋 Table of Contents
1. [Architecture & CloudLinux Hardening](#1-architecture--cloudlinux-hardening)
2. [One-Time Database Setup (Neon or cPanel PostgreSQL)](#2-one-time-database-setup-neon-or-cpanel-postgresql)
3. [One-Time cPanel Node.js App Configuration](#3-one-time-cpanel-nodejs-app-configuration)
4. [GitHub Secrets Configuration (for CI/CD)](#4-github-secrets-configuration-for-cicd)
5. [Method 1: Automated CI/CD via GitHub Actions (Recommended)](#5-method-1-automated-cicd-via-github-actions-recommended)
6. [Method 2: Manual Deployment via cPanel File Manager (Zip Bundle)](#6-method-2-manual-deployment-via-cpanel-file-manager-zip-bundle)
7. [Environment Variables Reference (`.env`)](#7-environment-variables-reference-env)
8. [Database Migrations](#8-database-migrations)
9. [Post-Deployment Verification & Testing](#9-post-deployment-verification--testing)
10. [Troubleshooting & Diagnostic Playbook](#10-troubleshooting--diagnostic-playbook)

---

## 1. Architecture & CloudLinux Hardening

Pastor is configured to run smoothly within the resource and process constraints of shared hosting:

- **Isolated `./app` Subfolder Architecture**: CloudLinux's `nodevenv` creates and manages a virtual environment symlink named `node_modules` at the application root (`/home/<user>/api/pastor/node_modules`). By keeping our self-contained Next.js standalone bundle and its real runtime dependencies inside `./app/node_modules`, we completely prevent symlink overwrites, file locking, and permission collisions.
- **Next.js Standalone Build (`output: "standalone"`)**: Traces only the minimal production dependencies needed to run the server (~18 MB instead of hundreds of MBs in dev dependencies). No compilation or `npm install` runs on the shared host, avoiding resource exhaustion (`pthread_create: Resource temporarily unavailable`).
- **Dedicated Startup Error Boundary**: If an environment variable is missing or a database is temporarily unreachable, [`app.cjs`](file:///D:/Apps/2018/pastor/app.cjs) intercepts the crash, writes the full stack trace to `logs/startup-error.log`, and prevents generic, unhelpful 503 Passenger screens.
- **Entrypoint Fallback Bridge**: Both `app.cjs` and `app.js` are provided at the root so Pastor boots regardless of whether cPanel defaulted to `app.cjs` or `app.js`.
- **Zero-Downtime Passenger Worker Reload**: Every deployment updates `tmp/restart.txt` with the release ID, prompting Phusion Passenger to gracefully reload workers with zero downtime.

---

## 2. One-Time Database Setup (Neon or cPanel PostgreSQL)

Pastor uses Drizzle ORM with PostgreSQL. You can use your existing Neon database or create one in cPanel.

### Option A: Neon Serverless PostgreSQL (Already Configured)
Pastor is built with `@neondatabase/serverless` (HTTP driver), which connects directly to Neon over HTTPS (port 443).
Use your Neon connection string in `.env`:
```text
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-soft-frost-atx0u8e5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Option B: Local cPanel PostgreSQL (Alternative)
1. In cPanel, navigate to **Databases** > **PostgreSQL Databases**.
2. **Create Database**: e.g. `pastor` (becomes `cpaneluser_pastor`).
3. **Create User**: e.g. `pastoruser` (becomes `cpaneluser_pastoruser`) with a strong password.
4. **Assign User**: Grant **ALL PRIVILEGES**.
5. Form your connection string:
   ```text
   DATABASE_URL=postgresql://cpaneluser_pastoruser:YOUR_PASSWORD@127.0.0.1:5432/cpaneluser_pastor
   ```

---

## 3. One-Time cPanel Node.js App Configuration

Configure the application in your cPanel dashboard:

1. Log into **cPanel**.
2. In the **Software** section, click **Setup Node.js App**.
3. Click **Create Application** (top right).
4. Fill in the fields:

| Field | Setting | Explanation |
| :--- | :--- | :--- |
| **Node.js version** | `22.x` (or `20.x`) | Select Node 22 or 20 from dropdown. |
| **Application mode** | `Production` | Enables Next.js production optimizations. |
| **Application root** | `api/pastor` | **Required**: Path relative to `/home/<username>/`. |
| **Application URL** | `pastor.senaycreatives.com` | Select your domain / subdomain. |
| **Application startup file** | `app.cjs` | **Critical**: Points to our Passenger bootstrap shim. |

5. Under **Environment variables**, click **Add Variable**:
   - `NODE_ENV` &rarr; `production`
   - `PORT` &rarr; `5000`
   - `NEXT_PUBLIC_APP_URL` &rarr; `https://pastor.senaycreatives.com`
   - `BETTER_AUTH_URL` &rarr; `https://pastor.senaycreatives.com`
6. Click **Create**.
> [!IMPORTANT]
> Do **NOT** click **Run NPM Install** in cPanel! Pastor ships with its pre-compiled standalone bundle and dependencies.

---

## 4. GitHub Secrets Configuration (for CI/CD)

To enable automatic zero-touch deployment on every `git push`, configure your secrets in GitHub:

1. Open your repository: `https://github.com/eyuelkebede20/pastor`
2. Go to **Settings** > **Secrets and variables** > **Actions**.
3. Under **Repository secrets**, click **New repository secret** and add:

| Secret Name | Example Value | Description |
| :--- | :--- | :--- |
| `FTP_SERVER` | `ftp.senaycreatives.com` (or server IP) | Shared hosting FTP hostname. |
| `FTP_USERNAME` | `deployer@senaycreatives.com` or cPanel user | FTP user with write access to `api/pastor/`. |
| `FTP_PASSWORD` | `••••••••••••••••` | FTP account password. |
| `FTP_PORT` | `21` | Standard FTP port (`21` for FTP/FTPS, `22` for SFTP). |
| `FTP_PROTOCOL` | `ftp` | `ftp` or `ftps`. |
| `FTP_PASTOR_DIR` | `api/pastor/` | Destination folder on server (defaults to `api/pastor/`). |

---

## 5. Method 1: Automated CI/CD via GitHub Actions (Recommended)

The CI/CD pipeline is located at [`.github/workflows/deploy.yml`](file:///D:/Apps/2018/pastor/.github/workflows/deploy.yml).

### How the Pipeline Operates:
1. Pushing code to `main` (or `master`) triggers GitHub Actions.
2. The runner checks out code, sets up pnpm and Node 22, and runs `pnpm pack:cpanel`.
3. Next.js compiles with `output: "standalone"`, bundles `.next/static` and `public/`, and prepares the CloudLinux `./app` structure in `dist-cpanel/pastor/`.
4. `FTP-Deploy-Action` uses differential hashing (`.ftp-deploy-sync-state.json`) to sync only changed files to `/home/<username>/api/pastor/`.
5. It touches `tmp/restart.txt`, triggering Phusion Passenger to reload workers cleanly.

### First-Time Node Modules Sync:
To ensure pushes remain fast (~10–15 seconds), `app/node_modules/**` is excluded by default on subsequent runs:
- For the **first CI/CD deployment**, or when adding new npm dependencies:
  1. In GitHub, go to **Actions** > **Deploy Pastor to cPanel Shared Hosting**.
  2. Click **Run workflow**.
  3. Check the box **`sync_node_modules`** and click **Run workflow**.
  4. Subsequent git pushes can then be standard fast pushes without re-uploading dependencies.

---

## 6. Method 2: Manual Deployment via cPanel File Manager (Zip Bundle)

If you prefer to deploy manually or initialize the server immediately without waiting for GitHub Actions:

### Step 1: Pre-Generated Bundle Ready
A production bundle has been generated locally:
- **`pastor-cpanel-bundle.zip`** (~7.0 MB)
*(To regenerate anytime in the future, run: `pnpm pack:cpanel`)*

### Step 2: Upload to cPanel
1. In cPanel, open **File Manager**.
2. Navigate to your Application Root: `/home/<username>/api/pastor/`.
3. Click **Upload** and upload `pastor-cpanel-bundle.zip`.
4. Right-click `pastor-cpanel-bundle.zip` in File Manager and select **Extract**.
5. Confirm files extract directly into `/home/<username>/api/pastor/`.

#### On-Disk Layout Verification:
```text
/home/<username>/api/pastor/
├── app.cjs                     <-- Passenger bootstrap shim
├── app.js                      <-- Bridge forwarding to app.cjs
├── .htaccess                   <-- CloudLinux Passenger configuration
├── .env.example                <-- Environment template
├── logs/                       <-- Error and access logs (startup-error.log)
├── tmp/                        <-- Passenger reload trigger
│   └── restart.txt
└── app/                        <-- Isolated production container
    ├── server.js               <-- Next.js standalone server
    ├── package.json
    ├── .next/                  <-- Next server code & static assets
    │   └── static/
    ├── public/                 <-- Public static assets
    └── node_modules/           <-- Traced production runtime dependencies
```

---

## 7. Environment Variables Reference (`.env`)

In cPanel File Manager inside `/home/<username>/api/pastor/`:
1. Copy `.env.example` to `.env`.
2. Edit `.env` and configure your production values:

```env
# ==============================================================================
# Pastor Production Environment Configuration
# Target: https://pastor.senaycreatives.com (served from /api/pastor)
# ==============================================================================

NODE_ENV=production
PORT=5000

# Canonical URLs for Pastor
NEXT_PUBLIC_APP_URL=https://pastor.senaycreatives.com
BETTER_AUTH_URL=https://pastor.senaycreatives.com

# PostgreSQL Connection String (Neon or cPanel)
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-soft-frost-atx0u8e5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require

# Better Auth Secret (generate random 32+ characters)
BETTER_AUTH_SECRET=YOUR_SECURE_BETTER_AUTH_SECRET_STRING_32_CHARS
```

> [!TIP]
> Our startup shim [`app.cjs`](file:///D:/Apps/2018/pastor/app.cjs) automatically reads variables from either the root `.env`, `./app/.env`, or the cPanel Node.js App environment variables settings.

---

## 8. Database Migrations

To apply Drizzle schema migrations to your production database, run from your local terminal:

```bash
pnpm db:migrate
```

*(Ensure your `DATABASE_URL` in `.env` points to the target database)*.

---

## 9. Post-Deployment Verification & Testing

Once deployed, verify the application:

1. **Check Application Status**:
   Visit [https://pastor.senaycreatives.com](https://pastor.senaycreatives.com). The Pastor homepage should load cleanly.
2. **Authentication Check**:
   Navigate to [https://pastor.senaycreatives.com/login](https://pastor.senaycreatives.com/login) and [https://pastor.senaycreatives.com/signup](https://pastor.senaycreatives.com/signup).
3. **Card & QR Generation**:
   Test creating a card at `/cards` or scanning a QR code at `/qr/scan`.
4. **Passenger Restart Check**:
   In cPanel > **Setup Node.js App**, click **Restart** on `pastor.senaycreatives.com`, or touch `tmp/restart.txt`.

---

## 10. Troubleshooting & Diagnostic Playbook

| Symptom | Root Cause | Fix |
| :--- | :--- | :--- |
| **503 Service Unavailable** | Server crashed at startup. | Check `/home/<user>/api/pastor/logs/startup-error.log` in cPanel File Manager to view the exact error trace. |
| **"Cannot find module"** | `node_modules` was not uploaded on first deploy. | Run GitHub Action with `sync_node_modules` checked, or extract `pastor-cpanel-bundle.zip`. |
| **Redirect loops or Auth errors** | `BETTER_AUTH_URL` or `NEXT_PUBLIC_APP_URL` mismatch. | Ensure both are set to `https://pastor.senaycreatives.com` (no trailing slash). |
| **Changes not appearing after deploy** | Passenger worker cached old processes. | In cPanel click **Restart Application**, or verify `tmp/restart.txt` updated timestamp. |
| **Static files 404 (`/_next/static/...`)** | `.next/static` missing in `app/.next/static`. | Ensure `pack-cpanel.mjs` copied `.next/static` into `app/.next/static/`. |
