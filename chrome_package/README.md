# Vallanx Privacy Shield


Vallanx Privacy Shield is a browser extension that blocks trackers, protects your browser fingerprint, and gives you full control over what websites can do.

## Installation (Development)

### Installation in Chrome Browser

1. Clone the repository or download the zipped "chrome_package"
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project root directory
5. The extension icon appears in the toolbar

### Installation in Firefox / Mozilla

1. Clone the repository or download the zipped "mozilla_package"
2. Open about:debugging 
3. "This Firefox" → "Load Temporary Add-on"
4. Select /mozilla_package/manifest.json


## Quick Start

After installation you will find the pop-up of the Vallanx Privacy Shield extension in your extensions overview. Click on the browser extension shield icon to open the pop-up.


### 1. The Pop-Up

This quick overview allows you to make **site-specific** configurations, like blocking JavaScript, activate "Do Not Track" and more. For defining **global** configurations, you can find the button to the **dashboard**. More on that below.

Other elements you will see in the pop-up:

#### Stats

In the top area of the pop-up you find the current statistics, which derrive from your previous usage.

#### Report a website

If you find a suspicious website, like a phishing attempt, use the red "Report suspicious website". A short notice will be send to Vallanx, which will review the website and, if necessary, add it to  blocklists for future filtering.

#### Open dashboard

This button will open the dashboard with its four tabs "Statistics", "Settings", "Filter", "About Vallanx". Under "Settings" you can configure many more settings, activate special features, and define **global** settings, which will apply to all websites once set.


### 2. Configure your settings

To configure your global settings, like your preferred language, click on the browser extension icon shield icon and then click on "Open Dashboard". Click on the tab "Settings" to find all (global) settings, you want to configure. Below you will find a quick overview of the options

On the tab "Filter" you can enter own blocklist rules, upload a blocklist file or enter a direct url to a blocklist.


### 3. Overview of functions in the dashboard

| Option                                  | Explaination                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language                                | Switch to your preferred language. The pop-up and the dashboard will be changed to your language.                                                                                                                                                                                                                                                                                                                                                                    |
| Dark Mode                               | Change the appearance of the dashboard and pop-up.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Colorblind mode                         | A mode to help people with colorblid sight.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Simple language                         | Active the "Simple language" option, if you find it hard to understand the options and configurations.                                                                                                                                                                                                                                                                                                                                                               |
| Anti-fingerprinting                     | Activate this option for "disturbing" fingerprinting attempts from ad trackers and privacy-ignoring websites. Be aware, there might be methods of fingerprinting a user, which do not get affected by this method. <br><br>**In the dashboard, this is a global setting for all websites. If you'd like to apply this to one specific website only, use the pop-up switch.**                                                                                         |
| "Do Not Track" / Global Privacy Control | If activted, this sends a "Do Not Track", respective Global Privacy Control info to every website you visit.<br><br>**In the dashboard, this is a global setting for all websites. If you'd like to apply this to one specific website only, use the pop-up switch.**                                                                                                                                                                                                |
| Geolocation Spoofing                    | Change the geolocation of your browser to a latitude / longitude you specify.                                                                                                                                                                                                                                                                                                                                                                                        |
| Change User Agent                       | Change the user agent of your browser.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| IP Header Manipulation                  | Change the IP address in the "x-forward-for"-Header of your browser. Please keep in mind, this won't change the real network-based IP address, as the network connection can not be influenced by a browser extension.                                                                                                                                                                                                                                               |
| Block JavaScript                        | Block any JavaScript elements / execution on websites.<br><br>**In the dashboard, this is a global setting for all websites. If you'd like to apply this to one specific website only, use the pop-up switch.**                                                                                                                                                                                                                                                      |
| Block pop-ups                           | Disallow pop-ups on websites you visit.<br><br>**In the dashboard, this is a global setting for all websites. If you'd like to apply this to one specific website only, use the pop-up switch.**                                                                                                                                                                                                                                                                     |
| Block media elements                    | Block media elements on website, such as images, videos, canvases etc.                                                                                                                                                                                                                                                                                                                                                                                               |
| From size (KB)                          | Define the size of media elements to be blocked. In Kilobytes.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Block external fonts                    | For extra privacy you can activate this option, which blocks externally loaded fonts from content delivery networks.                                                                                                                                                                                                                                                                                                                                                 |
| Disable prefetch                        | Prevents the browser from speculatively loading pages or resources that you haven't explicitly requested yet.<br><br>Browsers normally prefetch links they predict you might click next — this speeds up navigation but sends network requests to sites you may never actually visit, revealing browsing behavior and consuming bandwidth without your intent.<br>  <br>Disabling prefetch ensures no requests leave your device unless you explicitly trigger them. |
| Disable hyperlink auditing              | Blocks the ping attribute on HTML anchor tags. When a link has \<a href="..." ping="https://tracker.example.com">, clicking it sends a background POST request to the ping URL — typically used by websites to track which links you click, when, and from where.<br><br>Disabling this suppresses those silent tracking pings entirely, so click behavior is not reported back to third parties.                                                                    |
| Low bandwidth mode                      | For devices and connections with limited bandwidth, you can activate this option. Any website visited will be shown with minimal settings and data use. E. g. images, stylings, or videos will not be loaded.                                                                                                                                                                                                                                                        |

#### Proxy Settings

If you want to use a fixed proxy server, you can set up the connection here. Username and password are optional. HTTP/SOCKS connections can be created.


### 4. Parental Control

You can configure parental controls, if this browser is used by kids. To configure the parental contro, first you have to set up a password. After saving the password, you can begin to configure the parental controls. This allows you mainly two options:


**Define a timeframe**

Define the starting time and end time. Time format is HH:MM 24h, e. g. 18:45. The time control is based on a global time service. Changing the local computer time does not affect the control. Select the correct timezone for your settings.


**Apply a special blocklist to block adult content / social media / gambling etc**

Switching to the dashboard tab "Filter" you now can add a special blocklist for parental control. This blocklist blocks the specified content and sites, once the parental controls are activated. This allows to separate between content filtering for children while maintaining a general content filter for malicious sites in general.

You can find a freely available for your convenience directly provided by Vallanx, updated on a daily basis. You can find the list here:

```
https://blocklist.vallanx.com/parental-controls-list.txt
```


**Click on the "Lock" button, if you want to protect the settings with a password. **

***Keep in mind, this is just a very basic form of protection as there a several ways to quickly circumvent this measures.***


### 5. Filter

In the "Filter" section of the dashboard, you have several options to implement a blocklist or allowlist. Blocklists are rule sets to tell the browser, which sites are not allowed to open, because of there malicious and dangerous content.

You can either **upload** a blocklist in txt-file format, **include a URL** to a blocklist, which is provided online, or you can **manually type in rules** to add them to a list.


**Universal Blocklist Syntax**

Vallanx Privacy Shield uses Universal Blocklist Syntax. Universal Blocklist Syntax (UBS) is a comprehensive content filtering framework, which is designed to work with various formats (AdBlock, uBlock, Suricata, DNS etc). UBS is designed to create powerful rule sets for blocklistst & allowlists. More about Universal Blocklist Syntax can be found at
https://github.com/vallanx-team/universal_blocklist_syntax


---
## Features Overview of Current Version

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
- **Localization** — Currently supporting 12 differente languages built in; extensible to further locales. Default is English (EN) 


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

Vallanx uses the Universal Blocklist Syntax. Therefore, Vallanx Privacy Shield is compatible with common AdBlock / uBlock and other syntax:

| Syntax                                    | Effect                            |
| ----------------------------------------- | --------------------------------- |
| evil.com                                  | Block domain                      |
| *.ads.example.com                         | Block wildcard domain             |
| tracker.net^                              | AdBlock-style domain block        |
| @@paypal.com^                             | Allow (whitelist)                 |
| @trusted.com                              | Allow shorthand                   |
| ##.advertisement                          | Hide element globally             |
| facebook.com##div[data-testid="sponsored" | Hide element on specific domain   |
| ads.net^ $third-party,script              | Block with resource-type modifier |
| evil.com :category=malware                | Category metadata                 |
| ! comment                                 | Comment line                      |
| [Section]                                 | Section header (ignored)          |


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

---

🗓️ Release: March 2025
🔖 Version: 0.2.2
💪 Supporter: www.vallanx.com

## License
MIT