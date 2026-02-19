// generate-promo-assets.js — Render Chrome Web Store promo assets via Puppeteer

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const PROMO_DIR = path.resolve(__dirname, '../promo');
const TEMPLATES_DIR = path.join(PROMO_DIR, 'templates');

const ASSETS = [
  {
    template: 'screenshot-autocomplete.html',
    output: 'screenshot-1-autocomplete.png',
    width: 1280,
    height: 800,
  },
  {
    template: 'small-promo-tile.html',
    output: 'small-promo-tile.png',
    width: 440,
    height: 280,
  },
  {
    template: 'marquee-promo-tile.html',
    output: 'marquee-promo-tile.png',
    width: 1400,
    height: 560,
  },
];

async function generateAssets() {
  const browser = await puppeteer.launch({ headless: 'new' });

  for (const asset of ASSETS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: asset.width,
      height: asset.height,
      deviceScaleFactor: 1,
    });

    const templatePath = path.join(TEMPLATES_DIR, asset.template);
    await page.goto(`file://${templatePath}`, { waitUntil: 'networkidle0' });

    const outputPath = path.join(PROMO_DIR, asset.output);
    await page.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: false,
    });

    await page.close();
    console.log(`  Generated ${asset.output} (${asset.width}x${asset.height})`);
  }

  // Generate store icon: render icon128.png on solid black to strip alpha
  await generateStoreIcon(browser);

  await browser.close();
  console.log(`\nAll assets saved to ${PROMO_DIR}/`);
}

async function generateStoreIcon(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 128, height: 128, deviceScaleFactor: 1 });

  const iconPath = path.resolve(__dirname, '../icons/icon128.png');
  const iconBase64 = fs.readFileSync(iconPath).toString('base64');

  await page.setContent(`
    <html>
    <body style="margin:0; padding:0; background:#000; width:128px; height:128px; overflow:hidden;">
      <img src="data:image/png;base64,${iconBase64}"
           style="width:128px; height:128px; display:block;">
    </body>
    </html>
  `);

  const outputPath = path.join(PROMO_DIR, 'store-icon-128.png');
  await page.screenshot({
    path: outputPath,
    type: 'png',
    omitBackground: false,
  });

  await page.close();
  console.log('  Generated store-icon-128.png (128x128)');
}

generateAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
