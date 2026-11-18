// Phusion Passenger / CloudLinux Node Selector startup shim
// CloudLinux owns root 'node_modules' as a symlink to its virtualenv.
// Our real Next.js standalone bundle lives in './app', clear of that symlink.
const path = require('node:path');
const fs = require('node:fs');

// 1. Ensure logs and tmp exist immediately
const logsDir = path.join(__dirname, 'logs');
const tmpDir = path.join(__dirname, 'tmp');
try { if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true }); } catch (_) {}
try { if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true }); } catch (_) {}

const errorLog = path.join(logsDir, 'startup-error.log');
const appLog = path.join(logsDir, 'pastor-app.log');

function logToFile(filePath, message) {
  try {
    fs.appendFileSync(filePath, `[ ${new Date().toISOString()} ] ${message}\n`, 'utf8');
  } catch (_) {}
}

logToFile(appLog, `Pastor shim booting (PID: ${process.pid}, Node: ${process.version}, CWD: ${process.cwd()}, PORT: ${process.env.PORT || 'unset'})`);

// Intercept console.error and console.warn so Next.js startServer errors are captured
const origConsoleError = console.error;
console.error = function(...args) {
  const msg = args.map(a => (a && a.stack) || (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logToFile(errorLog, `[Console Error] ${msg}`);
  logToFile(appLog, `[Console Error] ${msg}`);
  return origConsoleError.apply(this, args);
};

const origConsoleWarn = console.warn;
console.warn = function(...args) {
  const msg = args.map(a => (a && a.stack) || (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logToFile(appLog, `[Console Warn] ${msg}`);
  return origConsoleWarn.apply(this, args);
};

// Intercept process.exit to record failure exit codes and stack traces
const origExit = process.exit;
process.exit = function(code) {
  const stack = new Error().stack;
  logToFile(appLog, `process.exit(${code}) called:\n${stack}`);
  if (code && code !== 0) {
    logToFile(errorLog, `process.exit(${code}) called:\n${stack}`);
  }
  return origExit.apply(this, arguments);
};

process.on('uncaughtException', (err) => {
  logToFile(errorLog, `[Uncaught Exception]\n${err.stack || err}`);
  logToFile(appLog, `[Uncaught Exception]\n${err.stack || err}`);
  origConsoleError('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason) => {
  logToFile(errorLog, `[Unhandled Rejection]\n${(reason && reason.stack) || reason}`);
  logToFile(appLog, `[Unhandled Rejection]\n${(reason && reason.stack) || reason}`);
  origConsoleError('[Unhandled Rejection]', reason);
});

// 2. Configure environment and prevent CageFS 0.0.0.0 network bind failure
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '--disable-wasm-trap-handler';

// CageFS on shared hosting restricts binding to 0.0.0.0.
// Use 127.0.0.1 so Passenger or local proxy connects cleanly.
if (!process.env.HOSTNAME || process.env.HOSTNAME === '0.0.0.0') {
  process.env.HOSTNAME = '127.0.0.1';
}

const appDir = path.resolve(__dirname, 'app');
const appNodeModules = path.join(appDir, 'node_modules');
const rootNodeModules = path.join(__dirname, 'node_modules');
const candidatePaths = [appNodeModules, rootNodeModules];

// Scan app/node_modules/.pnpm/*/node_modules for pre-bundled dependencies (next, react, etc.)
const pnpmBase = path.join(appNodeModules, '.pnpm');
if (fs.existsSync(pnpmBase)) {
  try {
    const pnpmPackages = fs.readdirSync(pnpmBase);
    for (const pkg of pnpmPackages) {
      const pkgNodeModules = path.join(pnpmBase, pkg, 'node_modules');
      if (fs.existsSync(pkgNodeModules)) {
        candidatePaths.push(pkgNodeModules);
      }
    }
  } catch (e) {
    logToFile(appLog, `Error scanning .pnpm: ${e.message}`);
  }
}

// Search for CloudLinux nodevenv lib/node_modules if present
try {
  const homeDir = process.env.HOME || '/home/senaycre';
  const nodevenvBase = path.join(homeDir, 'nodevenv', 'api', 'pastor');
  if (fs.existsSync(nodevenvBase)) {
    const versions = fs.readdirSync(nodevenvBase);
    for (const v of versions) {
      const vPath = path.join(nodevenvBase, v, 'lib', 'node_modules');
      if (fs.existsSync(vPath)) candidatePaths.push(vPath);
    }
  }
} catch (_) {}

// Prepend all candidate module paths to NODE_PATH
process.env.NODE_PATH = candidatePaths.concat(process.env.NODE_PATH || '').filter(Boolean).join(path.delimiter);
require('node:module').Module._initPaths();

// 3. Load environment variables from root .env or app/.env (zero dependency parser)
function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  } catch (err) {
    logToFile(appLog, `Could not read env file ${envPath}: ${err.message}`);
  }
}

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(appDir, '.env'));

// 4. Production defaults for pastor.senaycreatives.com
const defaultDbUrl = 'postgresql://neondb_owner:npg_nW1YXcMSmKE5@ep-soft-frost-atx0u8e5-pooler.c-9.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const defaultAuthSecret = "opensd23r23f2@#$#@Fsdafasdfs#@#$#F#@FDFDF#fef233[['[.[l[l[[[]]]]]]']";

if (!process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
  process.env.NEXT_PUBLIC_APP_URL = 'https://pastor.senaycreatives.com';
}
if (!process.env.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL.includes('localhost')) {
  process.env.BETTER_AUTH_URL = 'https://pastor.senaycreatives.com';
}
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL.replace(/\/+$/, '');

if (
  !process.env.DATABASE_URL ||
  !process.env.DATABASE_URL.includes('neon.tech') ||
  process.env.DATABASE_URL.includes('0911434441') ||
  process.env.DATABASE_URL.includes('user:pass@')
) {
  process.env.DATABASE_URL = defaultDbUrl;
}
if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = defaultAuthSecret;
}

// Normalize @localhost to @127.0.0.1 so cPanel PostgreSQL does not attempt IPv6 (::1) which lacks pg_hba.conf entry
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    .replace('@localhost:', '@127.0.0.1:')
    .replace('@localhost/', '@127.0.0.1/');
}

// 5. Switch working directory to app/ so relative paths and process.cwd() resolve cleanly
try {
  if (fs.existsSync(appDir)) {
    process.chdir(appDir);
  }
} catch (e) {
  logToFile(appLog, `Could not chdir to app directory: ${e.message}`);
}

// 6. Boot the Next.js standalone server with startup error boundary
try {
  const entryCandidates = [
    path.join(appDir, 'server.js'),
    path.join(__dirname, 'server.js')
  ];
  const targetEntry = entryCandidates.find(p => fs.existsSync(p));
  if (!targetEntry) {
    throw new Error(`Could not find server.js in ${appDir} or ${__dirname}`);
  }
  logToFile(appLog, `Requiring server entrypoint: ${targetEntry}`);
  require(targetEntry);
  logToFile(appLog, `Server entrypoint loaded successfully`);
} catch (err) {
  logToFile(errorLog, `Pastor server startup failed:\n${err.stack || err}`);
  origConsoleError('[Fatal Pastor Startup Error]', err);
  process.exit(1);
}
