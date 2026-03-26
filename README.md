# Vallanx Privacy Shield

Release: March 2025
Version: 0.2.0

A Chrome extension (Manifest V3) that blocks trackers, protects your browser fingerprint, and gives you full control over what websites can do.

## Features

- **Ad & Tracker Blocking** — UBS (Universal Blocklist Syntax) parser with support for domain rules, wildcards, AdBlock-style `||domain^` patterns, allowlists (`@@`), and `$`-modifiers
- **Anti-Fingerprinting** — Canvas noise, AudioContext noise, randomized navigator properties (hardwareConcurrency, deviceMemory, platform), screen depth, and WebGL vendor masking
- **Privacy Headers** — Do Not Track / Global Privacy Control, custom User-Agent, custom X-Forwarded-For header
- **Geolocation Spoofing** — Override `getCurrentPosition` and `watchPosition` with configurable coordinates
- **Content Controls** — Block JavaScript (global or per site), pop-ups, media elements above a size threshold, external fonts, prefetch, and hyperlink auditing
- **Cosmetic Rules** — Element hiding via `##selector` UBS rules, applied in-page with a MutationObserver
- **Proxy Support** — Configure a fixed HTTP/SOCKS proxy with optional authentication
- **Parental Controls** — Time-based browsing restrictions using server time (worldtimeapi.org) with local time fallback
- **Per-Site Overrides** — Toggle JS blocking and popup blocking individually per hostname from the popup
- **Network Log** — Ring buffer (last 200 entries) of blocked/allowed requests, visible in the dashboard
- **Statistics** — Blocked request count, bandwidth saved (MB), and estimated time saved
- **Export / Import** — Save and restore all settings as JSON
- **Dark / Light / Auto Theme** — Follows system preference or manual override
- **Localization** — German (DE) and English (EN) built in; extensible to further locales

## Installation (Development)

1. Clone the repository
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project root directory
5. The extension icon appears in the toolbar

## Project Structure

```
├── manifest.json              # Manifest V3
├── background.js              # Service worker: blocking rules, proxy, stats, parental controls
├── content.js                 # Content script: fingerprint protection, geolocation, cosmetic rules
│
├── popup/
│   ├── popup.html
│   └── popup.js               # Quick stats, global toggles, per-site overrides
│
├── dashboard/
│   ├── dashboard.html
│   └── dashboard.js           # Full settings UI (4 tabs: Statistics, Settings, Filter, About)
│
├── blocked/
│   └── blocked.html           # Shown when a main-frame request is blocked
│
├── _locales/
│   ├── de/messages.json
│   └── en/messages.json
│
├── resources/
│   ├── css/styles.css         # Design system: variables, dark/light mode, components
│   └── js/
│       ├── storage.js         # chrome.storage wrapper, settings schema, defaults
│       ├── stats.js           # formatMb, formatMs, calcSavedMs
│       ├── ubs-parser.js      # UBS rule parser (ES module, fully unit-tested)
│       └── i18n.js            # i18n helper (wraps chrome.i18n.getMessage)
│
└── tests/
    ├── ubs-parser.test.js
    ├── stats.test.js
    └── i18n.test.js
```

## UBS — Universal Blocklist Syntax

Vallanx uses its own blocklist format, compatible with common AdBlock syntax:

| Syntax | Effect |
|--------|--------|
| `evil.com` | Block domain |
| `*.ads.example.com` | Block wildcard domain |
| `||tracker.net^` | AdBlock-style domain block |
| `@@||paypal.com^` | Allow (whitelist) |
| `@trusted.com` | Allow shorthand |
| `##.advertisement` | Hide element globally |
| `facebook.com##div[data-testid="sponsored"]` | Hide element on specific domain |
| `||ads.net^ $third-party,script` | Block with resource-type modifier |
| `evil.com :category=malware` | Category metadata |
| `! comment` | Comment line |
| `[Section]` | Section header (ignored) |

## Running Tests

```bash
npm test
```

Runs 25 unit tests covering the UBS parser, statistics engine, and i18n helper.

## Tech Stack

- Chrome Extension Manifest V3
- ES Modules (`type: module` in background service worker and popup/dashboard pages)
- `declarativeNetRequest` for network-level blocking and privacy header injection
- `chrome.webRequest` (observational) for network logging and statistics
- `chrome.alarms` for periodic parental control checks
- Jest 29 with `--experimental-vm-modules` for ES module test support

## License

MIT
