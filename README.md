# SRM Desk

An unofficial Chrome extension that replaces the SRM Academia portal with a clean, fast dashboard. Shows your attendance with skip margins, internal marks, and today's class schedule resolved from the Day Order system.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technical Notes](#technical-notes)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)

---

## Overview

SRM Academia is built on Zoho Creator and is notoriously slow and cluttered. SRM Desk runs as a Chrome extension inside your already-logged-in session, reads the rendered page data, and presents it in a minimal dashboard. No external servers, no login required beyond your normal Academia session.

---

## Features

**Attendance**
- Per-subject attendance percentage
- Hours attended vs hours conducted
- Skip margin calculator — shows exactly how many more classes you can miss while staying above 75%
- Color-coded warnings when you are close to the limit

**Marks**
- Internal assessment scores (CAT, FT, assignments) per subject
- Running total and percentage across all completed tests

**Timetable**
- Schedule resolved using the Day Order shown on the Academia welcome page, not the calendar weekday
- Supports Batch 1 unified timetable slot codes (A, B, C, D, E, F, G, P-slots, L-slots)
- Browse any Day Order (Day 1 through Day 5) from the dashboard
- Current class highlighted, past classes dimmed

**Privacy**
- All data stays in your browser via `chrome.storage.local`
- Nothing is sent to any external server
- The extension only reads from your existing authenticated session

---

## How It Works

SRM Academia is a single-page app built on Zoho Creator. When you navigate to a page like `#Page:My_Attendance`, Zoho renders the content into the DOM including inside iframes. The extension:

1. Navigates to each relevant hash page within the SPA
2. Waits for the content to fully render in the DOM and iframes
3. Parses the tab-separated text from the rendered tables
4. Cross-references your personal timetable slot codes against the unified batch timetable
5. Reads today's Day Order from the `#WELCOME` page to determine which slots are active

No API calls are made. No credentials are stored or transmitted.

---

## Installation

The extension is not on the Chrome Web Store. Install it manually in developer mode.

1. Download or clone this repository

2. Open Chrome and navigate to `chrome://extensions`

3. Enable **Developer Mode** using the toggle in the top-right corner

4. Click **Load unpacked**

5. Select the `srm-desk` folder — the one containing `manifest.json`

The SRM Desk icon will appear in your Chrome toolbar.

<img width="1600" height="806" alt="image" src="https://github.com/user-attachments/assets/73baa4c5-37a1-421a-9e12-def252e66df4" />
<img width="1600" height="899" alt="image" src="https://github.com/user-attachments/assets/8d1d34b9-f4ca-4607-bc7f-e3061f256166" />
<img width="1600" height="899" alt="image" src="https://github.com/user-attachments/assets/2514a319-0303-4a49-89ac-5e0ac9e142e9" />
<img width="1600" height="832" alt="image" src="https://github.com/user-attachments/assets/16e23f1d-ab9e-4b81-ad5b-f85eb13e1baa" />
<img width="1600" height="896" alt="image" src="https://github.com/user-attachments/assets/0c5b436d-ccc7-49ce-b9f5-ba09486fd250" />
<img width="1600" height="815" alt="image" src="https://github.com/user-attachments/assets/ef681fa3-290d-489f-8fac-5372f154c7be" />
<img width="1600" height="806" alt="image" src="https://github.com/user-attachments/assets/fc10fff9-9489-421a-bdbb-5d4e5548abfa" />
<img width="930" height="592" alt="image" src="https://github.com/user-attachments/assets/6cbe5dba-2c94-4f60-a4b8-90e90860d50b" />
<img width="1600" height="842" alt="image" src="https://github.com/user-attachments/assets/816e7455-44ba-48ff-b62d-1938b64d8286" />

---

## Usage

1. Go to [academia.srmist.edu.in](https://academia.srmist.edu.in) and log in normally

2. Click the SRM Desk icon in your toolbar

3. Click **Sync Data from SRM**

4. Keep the Academia tab open and wait approximately 60 seconds while the extension navigates through your attendance, timetable, and slot schedule pages

5. Once sync completes, click **Open Dashboard**

Re-sync whenever you want updated data — after new classes are conducted, after marks are published, or at the start of a new day to pick up the current Day Order.

---

## Project Structure

```
srm-desk/
├── manifest.json        Chrome extension manifest (MV3)
├── content.js           Injected into academia.srmist.edu.in — handles navigation and parsing
├── background.js        Service worker (handles install event)
├── popup.html           Extension popup UI
├── popup.js             Popup logic — sync trigger, status display
├── dashboard.html       Full dashboard page opened from the popup
├── dashboard.js         Dashboard rendering — attendance cards, marks, schedule
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Technical Notes

**Why not use the Zoho Creator API directly?**

SRM's Zoho instance blocks server-to-server requests via WAF (bot protection). The API returns 401 even with valid session cookies when called from Node.js or any non-browser HTTP client. The extension approach works because it runs inside the real browser with the real authenticated session.

**Why does sync take around 60 seconds?**

The SRM SPA re-renders on each hash navigation. The extension waits for the DOM to stabilize after each page change before reading. Rushing this causes empty reads. Four pages are visited in sequence: `#WELCOME`, `#Page:My_Attendance`, `#Page:My_Time_Table_2023_24`, and `#Page:Unified_Time_Table_2025_Batch_1`.

**Day Order vs Weekday**

SRM does not use a fixed Mon-Fri schedule. Instead it uses a rotating Day Order (Day 1 through Day 5) that is announced on the Academia welcome page each morning. The unified timetable maps Day Order and Hour to a slot code. The extension reads the current Day Order and resolves it against your personal slot assignments to build today's schedule.

**Iframe support**

The Academia page renders its main content inside iframes. The extension reads from both the main document and all accessible same-origin iframes to get the full page text and tables.

---

## Known Limitations

- Tested on SRM Kattankulathur only. Other SRM campuses may use different portal structures.
- If Academia is slow or under load, sync may time out and return partial data. Running sync again usually resolves this.
- Marks parsing depends on the nested table structure Zoho uses for test performance cells. If SRM changes the portal layout, the marks parser may break first.

---

## Contributing

Pull requests are welcome. Some things worth working on:

- Support for other SRM campus portals
- Attendance drop notification when a subject goes below 75%
- Support for the CGPA and grade report page
- Auto-sync on page load so data is always fresh

If you find the parser breaking due to a portal update, open an issue with the debug output from the popup — it logs exactly what was found on each page.

---

## Disclaimer

This is an unofficial project and is not affiliated with, endorsed by, or connected to SRM Institute of Science and Technology in any way. The extension accesses only the data you are already authorized to view through your own student account. Use it responsibly and in accordance with your institution's terms of service.
