const emojiData = require('emoji-datasource/emoji.json');
const fs = require('fs');
const path = require('path');

const shortcodeMap = {};

// Process iamcal/emoji-data (Slack's canonical source)
for (const entry of emojiData) {
  const codepoints = entry.unified.split('-').map(cp => parseInt(cp, 16));
  const emoji = String.fromCodePoint(...codepoints);

  for (const name of entry.short_names) {
    shortcodeMap[name] = emoji;
  }
}

// Ensure output directory exists
const dataDir = path.resolve(__dirname, '../src/data');
fs.mkdirSync(dataDir, { recursive: true });

// Write outputs
fs.writeFileSync(
  path.join(dataDir, 'shortcode-map.json'),
  JSON.stringify(shortcodeMap)
);
fs.writeFileSync(
  path.join(dataDir, 'sorted-shortcodes.json'),
  JSON.stringify(Object.keys(shortcodeMap).sort())
);

console.log(`Generated ${Object.keys(shortcodeMap).length} shortcode mappings`);
console.log(`File size: ${(JSON.stringify(shortcodeMap).length / 1024).toFixed(1)} KB`);
