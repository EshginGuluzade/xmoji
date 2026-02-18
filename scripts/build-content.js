const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: ['src/content/content.js'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/src/content/content.js',
  target: ['chrome120'],
  minify: false,
});

console.log('Content script bundled successfully');
