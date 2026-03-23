# SRM Desk

A Chrome extension that replaces the clunky SRM Academia portal with a clean, fast dashboard.

## Features

- **Attendance** — per-subject percentage with a progress bar and exact skip margin (how many more you can bunk to stay above 75%, or how many you need to attend to recover)
- **Marks** — CAT, FT and assignment scores per subject with running totals
- **Today's Schedule** — resolves your slot codes against the Unified Time Table using the actual Day Order shown on the portal (not Mon/Tue/Wed)
- **Browse any Day Order** — tap Day 1 through Day 5 to see any day's schedule
- **Auto batch detection** — reads your batch number from your timetable and loads the correct Unified Time Table automatically (works for all batches)
- **Fully private** — your credentials go directly from your browser to SRM's servers. Nothing is stored or sent anywhere else

---

## Installation

Chrome Web Store is not required. Install in 3 steps:

**Step 1** — Download this repo as a ZIP

Click the green **Code** button → **Download ZIP** → extract the folder

**Step 2** — Load into Chrome

1. Open Chrome and go to `chrome://extensions`
2. Turn on **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the extracted `SRM-Desk` folder

**Step 3** — Use it

1. Go to [academia.srmist.edu.in](https://academia.srmist.edu.in) and log in
2. Click the **SRM Desk** icon in your Chrome toolbar
3. Click **Sync Data from SRM** and wait ~60 seconds
4. Click **Open Dashboard**

---

## How it works

The extension injects into your already logged-in SRM Academia session and reads the rendered page directly — no scraping APIs, no third-party servers.

| Page | What it reads |
|------|--------------|
| `#WELCOME` | Today's Day Order |
| `#Page:My_Attendance` | Attendance % and marks for all subjects |
| `#Page:My_Time_Table_2023_24` | Your courses, slot codes, and batch number |
| `#Page:Unified_Time_Table_2025_Batch_N` | Slot → day + time mapping for your batch |

Data is stored in `chrome.storage.local` — only accessible by you on your machine.

---

## Skip calculator logic

SRM requires 75% attendance. For each subject:

- **Can skip X** → `floor(attended - total × 0.75)`
- **Need X more** → `ceil((total × 0.75 - attended) / 0.25)`

---

## Compatibility

- Works with all SRM batches (auto-detected from your timetable page)
- Tested on Batch 1 and Batch 2, AY 2025-26 EVEN semester
- Chrome / Chromium only (Manifest V3)

---

## Disclaimer

Unofficial project. Not affiliated with SRM Institute of Science and Technology. Use responsibly.

---

## Stack

Chrome Extension (MV3) · Vanilla JS · HTML · CSS
