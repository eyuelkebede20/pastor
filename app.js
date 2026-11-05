// cPanel Default Entrypoint Bridge
// If cPanel Node.js Selector is pointing to app.js instead of app.cjs,
// this forwards directly to app.cjs so Pastor runs cleanly.
require('./app.cjs');
