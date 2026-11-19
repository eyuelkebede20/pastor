import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const stageDir = path.join(rootDir, 'dist-cpanel');
const rootAppDir = path.join(stageDir, 'pastor');
const bundleDir = path.join(rootAppDir, 'app');
const zipFile = path.join(rootDir, 'pastor-cpanel-bundle.zip');

console.log('🚀 Starting Pastor CloudLinux-compliant packager (subfolder: pastor/app)...');

function copyDirSafe(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  if (process.platform === 'win32') {
    try {
      execSync(`robocopy "${src}" "${dest}" /s /e /xj /r:1 /w:1 /nfl /ndl /njh /njs`, {
        stdio: 'ignore',
        shell: 'cmd.exe'
      });
    } catch (e) {
      if (e.status > 7) {
        throw new Error(`Robocopy failed with status ${e.status}`);
      }
    }
  } else {
    execSync(`cp -r "${src}/." "${dest}/"`, { stdio: 'inherit' });
  }
}

// 1. Build Next.js standalone application if needed
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticDir = path.join(rootDir, '.next', 'static');

if (!fs.existsSync(standaloneDir)) {
  console.log('🔨 Building Next.js standalone bundle...');
  execSync('pnpm build', { stdio: 'inherit', cwd: rootDir, shell: true });
} else {
  console.log('ℹ️ Next.js standalone build already exists, packaging bundle...');
}

if (!fs.existsSync(standaloneDir)) {
  throw new Error(`Standalone directory not found at ${standaloneDir}. Ensure next.config.ts has output: "standalone"`);
}

// 2. Clean staging and previous zip
try {
  if (fs.existsSync(stageDir)) {
    fs.rmSync(stageDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  }
} catch (e) {
  console.warn('⚠️ Note: Staging dir locked by explorer/scanner, reusing contents.');
}

try {
  if (fs.existsSync(zipFile)) {
    fs.rmSync(zipFile, { force: true, maxRetries: 3, retryDelay: 200 });
  }
} catch (e) {}

fs.mkdirSync(bundleDir, { recursive: true });

// 3. Copy Standalone output into bundleDir
console.log('📦 Copying Next.js standalone output into pastor/app...');
copyDirSafe(standaloneDir, bundleDir);

// 3.1 Dereference standalone symlinked packages (next, react, react-dom, etc.)
// pnpm symlinks are skipped by robocopy /xj and cannot be uploaded over FTP.
const standaloneNodeModules = path.join(standaloneDir, 'node_modules');
const targetNodeModules = path.join(bundleDir, 'node_modules');

if (fs.existsSync(standaloneNodeModules)) {
  fs.mkdirSync(targetNodeModules, { recursive: true });
  const standaloneItems = fs.readdirSync(standaloneNodeModules);
  for (const item of standaloneItems) {
    const itemPath = path.join(standaloneNodeModules, item);
    const targetPath = path.join(targetNodeModules, item);
    let real = null;
    try {
      const stat = fs.lstatSync(itemPath);
      if (stat.isSymbolicLink()) {
        try {
          const linkTarget = fs.readlinkSync(itemPath);
          real = path.resolve(standaloneNodeModules, linkTarget);
        } catch (_) {
          real = fs.realpathSync(itemPath);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not inspect dependency ${item}: ${err.message}`);
    }

    if (real && fs.existsSync(real)) {
      console.log(`📦 Dereferencing symlink "${item}" -> physical copy from ${real}...`);
      try {
        if (fs.existsSync(targetPath)) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
        fs.cpSync(real, targetPath, { recursive: true });
      } catch (copyErr) {
        console.warn(`⚠️ Error copying dereferenced ${item}: ${copyErr.message}`);
      }
    }
  }
}

// 4. Copy static assets (.next/static) into bundleDir/.next/static
if (fs.existsSync(staticDir)) {
  console.log('📦 Copying .next/static into pastor/app/.next/static...');
  const targetStaticDir = path.join(bundleDir, '.next', 'static');
  copyDirSafe(staticDir, targetStaticDir);
}

// 5. Copy public directory into bundleDir/public and rootAppDir/public for LiteSpeed & Next.js
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
  console.log('📦 Copying public/ into pastor/app/public and pastor/public...');
  const targetPublicDir = path.join(bundleDir, 'public');
  copyDirSafe(publicDir, targetPublicDir);
  const rootPublicDir = path.join(rootAppDir, 'public');
  copyDirSafe(publicDir, rootPublicDir);
}

// 6. Ensure root files in dist-cpanel/pastor/
console.log('📦 Creating CloudLinux Passenger bootstrap shim and root files...');

// Create logs directory
const logsDir = path.join(rootAppDir, 'logs');
fs.mkdirSync(logsDir, { recursive: true });
fs.writeFileSync(path.join(logsDir, '.gitkeep'), '', 'utf8');

// Create tmp directory with restart.txt
const tmpDir = path.join(rootAppDir, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const gitSha = process.env.GITHUB_SHA || Date.now().toString();
fs.writeFileSync(path.join(tmpDir, 'restart.txt'), `restart ${gitSha}\n`, 'utf8');

// Create root .htaccess with full CloudLinux Passenger configuration
const htaccessFile = path.join(rootAppDir, '.htaccess');
const htaccessContent = `# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot "/home/senaycre/api/pastor"
PassengerBaseURI "/"
PassengerNodejs "/home/senaycre/nodevenv/api/pastor/22/bin/node"
PassengerAppType node
PassengerStartupFile app.cjs
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END
# DO NOT REMOVE OR MODIFY. CLOUDLINUX ENV VARS BEGIN
<IfModule Litespeed>
</IfModule>
# DO NOT REMOVE OR MODIFY. CLOUDLINUX ENV VARS END
DirectoryIndex disabled
`;
fs.writeFileSync(htaccessFile, htaccessContent, 'utf8');

// Copy startup shim app.cjs from repository root
const appCjsPath = path.join(rootDir, 'app.cjs');
if (fs.existsSync(appCjsPath)) {
  fs.copyFileSync(appCjsPath, path.join(rootAppDir, 'app.cjs'));
}

// app.js fallback bridge
const appJs = `// cPanel Default Entrypoint Bridge
// If cPanel Node.js Selector is pointing to app.js instead of app.cjs,
// this forwards directly to app.cjs so Pastor runs cleanly.
require('./app.cjs');
`;
fs.writeFileSync(path.join(rootAppDir, 'app.js'), appJs, 'utf8');
fs.writeFileSync(path.join(rootDir, 'app.js'), appJs, 'utf8');

// Root .env.example
const envExample = `# ==============================================================================
# Pastor Production Environment Configuration
# Target: https://pastor.senaycreatives.com (served from /api/pastor)
# ==============================================================================

NODE_ENV=production
PORT=5000

# Canonical URLs for Pastor
NEXT_PUBLIC_APP_URL=https://pastor.senaycreatives.com
BETTER_AUTH_URL=https://pastor.senaycreatives.com

# PostgreSQL Connection (Neon or cPanel PostgreSQL)
# For Neon serverless:
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-soft-frost-atx0u8e5-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
# Or cPanel PostgreSQL:
# DATABASE_URL=postgresql://cpaneluser_pastoruser:PASSWORD@127.0.0.1:5432/cpaneluser_pastordb

# Better Auth Secret (generate with openssl rand -base64 32 or random 32+ characters)
BETTER_AUTH_SECRET=generate_a_random_secure_secret_at_least_32_chars_2026
`;
fs.writeFileSync(path.join(rootAppDir, '.env.example'), envExample, 'utf8');

// Write root package.json so cPanel Node.js Selector discovers scripts in the dashboard
const projectPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const rootPkg = {
  name: projectPkg.name || 'pastor',
  version: projectPkg.version || '0.1.0',
  private: true,
  type: 'commonjs',
  main: 'app.cjs',
  scripts: {
    start: 'node app.cjs',
    restart: 'touch tmp/restart.txt',
    ...projectPkg.scripts,
    start: 'node app.cjs'
  },
  dependencies: projectPkg.dependencies || {}
};
fs.writeFileSync(path.join(rootAppDir, 'package.json'), JSON.stringify(rootPkg, null, 2), 'utf8');

// 7. Create unified Zip Archive
console.log('🗜️ Creating unified zip archive: pastor-cpanel-bundle.zip using tar...');
if (fs.existsSync(zipFile)) {
  fs.rmSync(zipFile, { force: true, maxRetries: 3, retryDelay: 200 });
}
execSync(`tar -a -c -f "${zipFile}" -C "${rootAppDir}" .`, {
  stdio: 'inherit',
  cwd: rootDir,
  shell: true
});
console.log(`🎉 SUCCESS: Generated ${zipFile}`);

console.log(`
========================================================================
✅ CLOUDLINUX-COMPLIANT BUNDLE READY!
========================================================================
Archive: pastor-cpanel-bundle.zip
Folder:  dist-cpanel/pastor/

On-disk layout inside api/pastor/:
  api/pastor/                     ◄── Application Root (CloudLinux node_modules symlink safely isolated)
  ├── package.json                ◄── Discovered by cPanel Node.js Selector for npm scripts
  ├── app.cjs                     ◄── Application startup file (boots ./app/server.js)
  ├── app.js                      ◄── Fallback bridge to app.cjs
  ├── tmp/restart.txt             ◄── Touch to restart Passenger
  ├── logs/                       ◄── Startup error logs and application logs
  ├── .htaccess                   ◄── CloudLinux Passenger configuration
  ├── .env.example
  └── app/                        ◄── Real Next.js standalone bundle (NO ROOT node_modules collision!)
      ├── server.js               ◄── Built standalone Next.js server
      ├── package.json
      ├── .next/                  ◄── Compiled Next.js server chunks + static assets
      ├── public/                 ◄── Public assets
      └── node_modules/           ◄── Traced standalone production dependencies (dereferenced physical copies)
========================================================================
`);
