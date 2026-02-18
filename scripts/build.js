const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Ensure dist exists
fs.mkdirSync(DIST, { recursive: true });

// Copy manifest
fs.cpSync(path.join(ROOT, 'manifest.json'), path.join(DIST, 'manifest.json'));

// Copy icons
fs.cpSync(path.join(ROOT, 'icons'), path.join(DIST, 'icons'), { recursive: true });

// Copy data files
fs.cpSync(path.join(ROOT, 'src/data'), path.join(DIST, 'src/data'), { recursive: true });

// Copy background (service worker uses native ES modules, no bundling needed)
fs.mkdirSync(path.join(DIST, 'src/background'), { recursive: true });
fs.cpSync(
  path.join(ROOT, 'src/background/service-worker.js'),
  path.join(DIST, 'src/background/service-worker.js')
);

// Copy popup
fs.cpSync(path.join(ROOT, 'src/popup'), path.join(DIST, 'src/popup'), { recursive: true });

// Copy options
fs.cpSync(path.join(ROOT, 'src/options'), path.join(DIST, 'src/options'), { recursive: true });

// Copy shared (for service worker imports)
fs.cpSync(path.join(ROOT, 'src/shared'), path.join(DIST, 'src/shared'), { recursive: true });

// content.js is already built by esbuild into dist/src/content/content.js

console.log('Build complete — dist/ ready to load as unpacked extension');
