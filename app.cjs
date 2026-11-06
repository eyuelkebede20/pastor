// Phusion Passenger / CloudLinux Node Selector startup shim
// CloudLinux owns root 'node_modules' as a symlink to its virtualenv.
// Our real Next.js standalone bundle lives in './app', clear of that symlink.
const path = require('node:path');
const fs = require('node:fs');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '--disable-wasm-trap-handler';
process.env.HOSTNAME = '0.0.0.0';

const appDir = path.resolve(__dirname, 'app');
const appNodeModules = path.join(appDir, 'node_modules');
const rootNodeModules = path.join(__dirname, 'node_modules');
const candidatePaths = [appNodeModules, rootNodeModules];

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

// 1. Prepend candidate module paths to NODE_PATH
process.env.NODE_PATH = candidatePaths.concat(process.env.NODE_PATH || '').filter(Boolean).join(path.delimiter);
require('node:module').Module._initPaths();

// 2. Switch working directory to app/ so relative paths and process.cwd() resolve cleanly
try {
  if (fs.existsSync(appDir)) {
    process.chdir(appDir);
  }
} catch (e) {
  console.warn('Could not chdir to app directory:', e);
}

// 3. Ensure logs and tmp exist
const logsDir = path.join(__dirname, 'logs');
const tmpDir = path.join(__dirname, 'tmp');
try { if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true }); } catch (_) {}
try { if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true }); } catch (_) {}

// 4. Load environment variables from root .env or app/.env (zero dependency parser)
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
    console.warn('[app.cjs] Could not read env file ' + envPath + ':', err.message);
  }
}

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(appDir, '.env'));

// 5. Default URLs for pastor.senaycreatives.com if not provided
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pastor.senaycreatives.com';
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'https://pastor.senaycreatives.com';

// Normalize @localhost to @127.0.0.1 so cPanel PostgreSQL does not attempt IPv6 (::1) which lacks pg_hba.conf entry
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    .replace('@localhost:', '@127.0.0.1:')
    .replace('@localhost/', '@127.0.0.1/');
}

// 6. Boot the Next.js standalone server with startup error boundary
try {
  const entryCandidates = [
    path.join(appDir, 'server.js'),
    path.join(__dirname, 'server.js')
  ];
  const targetEntry = entryCandidates.find(p => fs.existsSync(p));
  if (!targetEntry) {
    throw new Error('Could not find server.js in ./app or .');
  }
  require(targetEntry);
} catch (err) {
  const errorLog = path.join(logsDir, 'startup-error.log');
  fs.writeFileSync(errorLog, '[ ' + new Date().toISOString() + ' ] Pastor server startup failed:\n' + (err.stack || err) + '\n', 'utf8');
  console.error('[Fatal Pastor Startup Error]', err);
  process.exit(1);
}
