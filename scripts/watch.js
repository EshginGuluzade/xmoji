const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const watchDirs = ['src', 'manifest.json', 'icons'];

console.log('Watching for changes...');

let debounce = null;

for (const dir of watchDirs) {
  const target = path.join(ROOT, dir);
  if (!fs.existsSync(target)) continue;

  fs.watch(target, { recursive: true }, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log('\nChange detected, rebuilding...');
      try {
        execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
        console.log('Rebuild complete.');
      } catch (e) {
        console.error('Build failed:', e.message);
      }
    }, 300);
  });
}
