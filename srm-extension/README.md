# SRM Desk 🎓

> Your SRM Academia dashboard. No nonsense.

A Chrome extension that pulls your attendance, marks, and timetable from SRM Academia into a clean dashboard — with skip calculators, Day Order-based scheduling, and zero data leaving your machine.

![SRM Desk Dashboard](https://img.shields.io/badge/status-active-22c55e?style=flat-square) ![Manifest V3](https://img.shields.io/badge/manifest-v3-7c3aed?style=flat-square) ![Free](https://img.shields.io/badge/cost-free-06b6d4?style=flat-square)

---

## Features

- 📊 **Attendance** — per-subject % with skip margin calculator (how many more you can bunk and stay above 75%)
- 📝 **Marks** — CAT/FT scores with running totals per subject
- 📅 **Today's Schedule** — resolves your slot codes (A, B, C, P47-P48...) using the actual **Day Order** shown on the welcome page, not Mon/Tue/Wed
- 🗓 **Browse any Day Order** — see schedule for Day 1 through Day 5
- 🔒 **Fully private** — reads directly from your logged-in session, nothing sent anywhere

## How it works

```
You log in to academia.srmist.edu.in
        ↓
Click "Sync" in the extension
        ↓
Extension reads your attendance page, timetable, and unified slot grid
        ↓
Cross-references your slot codes with the Day Order timetable
        ↓
Shows everything in a clean dashboard
```

No API keys. No servers. No accounts. Just your browser reading your own data.

## Install

Since this isn't on the Chrome Web Store, load it manually:

1. Download or clone this repo
2. Open Chrome → go to `chrome://extensions`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `srm-desk` folder

## Usage

1. Go to [academia.srmist.edu.in](https://academia.srmist.edu.in) and log in
2. Click the **SRM Desk** icon in your toolbar
3. Click **⚡ Sync Data from SRM**
4. Wait ~60 seconds while it reads your pages
5. Click **🚀 Open Dashboard**

Re-sync whenever you want fresh data.

## Stack

Pure vanilla JS + HTML/CSS. No frameworks, no build step, no npm. Just load and use.

- Chrome Extension Manifest V3
- `chrome.storage.local` for data persistence
- Reads DOM + iframes from academia.srmist.edu.in

## Disclaimer

Unofficial project. Not affiliated with SRM Institute of Science and Technology. Use responsibly — don't abuse the portal.

## Contributing

PRs welcome! Known things to improve:
- Auto-detect batch number (currently hardcoded to Batch 1 timetable URL)
- Support for other SRM portals (srmuniv, srmrmp etc.)
- Notifications when attendance drops below 75%

---

Made for SRM-KTR students by a fellow student who was tired of the Zoho portal.
