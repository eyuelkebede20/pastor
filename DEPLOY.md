# Deploying Pastor (`pastor.senaycreatives.com`)

This is a **Next.js** app built with `output: "standalone"` and deployed to a
**cPanel Passenger (CloudLinux Node Selector)** account over **FTP** via GitHub
Actions (`.github/workflows/deploy.yml`).

> **Target domain:** `pastor.senaycreatives.com`  
> **Server directory:** `api/pastor/` (relative to `/home/<username>/`)  
> **Startup shim:** `app.cjs`  
> **Full Guide:** See [`instruction.md`](file:///D:/Apps/2018/pastor/instruction.md)

---

## One-time setup

### 1. Create the Node app in cPanel
cPanel → **Setup Node.js App** → **Create Application**:

| Setting | Value |
| --- | --- |
| **Node.js version** | `22.x` (or `20.x`) |
| **Application mode** | `Production` |
| **Application root** | `api/pastor` |
| **Application URL** | `pastor.senaycreatives.com` |
| **Application startup file** | `app.cjs` |

> Do **not** click **Run NPM Install** — the bundle ships its own pre-compiled dependencies.

### 2. Set environment variables (in the same cPanel screen or in `.env`)
```env
NODE_ENV            = production
PORT                = 5000
NEXT_PUBLIC_APP_URL = https://pastor.senaycreatives.com
BETTER_AUTH_URL     = https://pastor.senaycreatives.com
DATABASE_URL        = postgresql://...
BETTER_AUTH_SECRET  = ...
```

### 3. Add GitHub secrets
In your GitHub repo (`eyuelkebede20/pastor`):
**Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Required | Notes |
| --- | --- | --- |
| `FTP_SERVER` | ✅ | e.g. `ftp.senaycreatives.com` |
| `FTP_USERNAME` | ✅ | FTP / cPanel user |
| `FTP_PASSWORD` | ✅ | FTP password |
| `FTP_PORT` | Optional | Default `21` |
| `FTP_PROTOCOL` | Optional | `ftp` or `ftps` |
| `FTP_PASTOR_DIR`| Optional | Default `api/pastor/` |

---

## Deploying

### Option 1: Automated CI/CD (GitHub Actions)
- **Automatic:** Push to `main` or `master`.
- **First-time / Dependency updates:** Go to **Actions** → **Deploy Pastor to cPanel Shared Hosting** → **Run workflow** → Check **`sync_node_modules`** → **Run workflow**.

### Option 2: Instant Manual Zip Upload
A pre-packaged archive is ready:
- Upload [`pastor-cpanel-bundle.zip`](file:///D:/Apps/2018/pastor/pastor-cpanel-bundle.zip) (~7.0 MB) to `/home/<user>/api/pastor/` in cPanel File Manager and extract.

---

## Architecture Layout in `api/pastor/`

```text
api/pastor/                      ← Application Root (CloudLinux node_modules symlink safely isolated)
├── app.cjs                      ← Application startup file (boots app/server.js)
├── app.js                       ← Fallback bridge to app.cjs
├── tmp/restart.txt              ← Touch to restart Phusion Passenger
├── logs/                        ← Startup error log (startup-error.log)
├── .htaccess                    ← CloudLinux Passenger configuration
├── .env.example                 ← Production configuration template
└── app/                         ← Self-contained standalone Next.js bundle
    ├── server.js                ← Built Next.js standalone server
    ├── package.json
    ├── .next/ (incl. static)
    ├── public/
    └── node_modules/            ← Real traced runtime dependencies (no root collision!)
```
