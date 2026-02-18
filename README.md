# Xmoji

**Slack-style `:emoji_name:` shortcodes for X (Twitter)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Release](https://img.shields.io/github/v/release/EshginGuluzade/xmoji)](https://github.com/EshginGuluzade/xmoji/releases)

Type `:wave:` and get 👋 — right inside X's compose box. Xmoji is a Chrome extension that brings Slack-style emoji shortcodes to X/Twitter with real-time autocomplete.

## Features

- **Shortcode conversion** — Type `:shortcode:` and it instantly converts to the real emoji
- **Autocomplete popup** — Start typing `:smi` and pick from matching suggestions
- **Keyboard navigation** — Use arrow keys to select, Enter/Tab to confirm, Escape to dismiss
- **3,500+ emoji** — Full coverage from Slack's canonical emoji-datasource
- **Frequency ranking** — Your most-used emoji appear first in suggestions
- **Custom shortcodes** — Define your own mappings in the options page
- **Theme-aware** — Popup matches X's light, dark, and dim themes automatically
- **Zero dependencies at runtime** — Vanilla JS, Shadow DOM isolation, minimal permissions

## Installation

### From source (developer)

1. Clone the repository:
   ```bash
   git clone https://github.com/EshginGuluzade/xmoji.git
   cd xmoji
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the `dist/` folder

### From release

1. Download `xmoji-v*.zip` from the [latest release](https://github.com/EshginGuluzade/xmoji/releases/latest)
2. Unzip the file
3. Load the unzipped folder as an unpacked extension (see step 3 above)

## Usage

1. Navigate to [x.com](https://x.com) and open a compose box (new post, reply, or DM)
2. Type a shortcode like `:smile:` — it converts to 😄 automatically
3. For autocomplete, type `:` followed by at least 2 characters (e.g., `:fi`) and pick from the popup
4. Click the extension icon to toggle Xmoji on/off or view quick stats
5. Open the options page to manage custom shortcodes and settings

### Common shortcodes

| Shortcode | Emoji | Shortcode | Emoji |
|-----------|-------|-----------|-------|
| `:smile:` | 😄 | `:heart:` | ❤️ |
| `:thumbsup:` | 👍 | `:fire:` | 🔥 |
| `:wave:` | 👋 | `:rocket:` | 🚀 |
| `:eyes:` | 👀 | `:100:` | 💯 |

## Development

```bash
# Build once
npm run build

# Watch mode (rebuilds on file changes)
npm run dev

# Clean build output
npm run clean
```

### Build pipeline

The build runs three steps in sequence:

1. **`build:data`** — Generates emoji lookup maps from the `emoji-datasource` package → `src/data/*.json`
2. **`build:content`** — Bundles the content script with esbuild → `dist/src/content/content.js`
3. **`build:copy`** — Copies all extension files to `dist/`

### Project structure

```
src/
├── background/       # Service worker (extension lifecycle)
├── content/          # Content script (injected into X pages)
│   ├── content.js    # Main entry point
│   ├── autocomplete.js   # Shadow DOM popup UI
│   ├── shortcode-engine.js  # Detection & matching
│   ├── editor.js     # Draft.js text insertion
│   ├── caret.js      # Cursor position detection
│   ├── observer.js   # DOM mutation observer
│   └── theme.js      # X theme detection
├── popup/            # Extension popup (toggle & stats)
├── options/          # Options page (custom shortcodes)
├── shared/           # Shared utilities (storage, messaging, constants)
└── data/             # Generated emoji data (JSON)
scripts/              # Build scripts
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test by loading the built extension in Chrome and verifying on x.com
5. Commit and push to your fork
6. Open a Pull Request

## License

[MIT](LICENSE)
