# SRM-Desk
A Chrome extension + local Next.js dashboard that pulls your SRM Academia attendance, marks, and timetable into a clean UI — with skip calculators, Day Order-based scheduling, and zero data leaving your machine.



SRM Desk is an unofficial companion for SRM Academia students. It replaces the clunky Zoho portal with a fast, beautiful dashboard built entirely on your local machine.
Features

📊 Attendance — per-subject percentage, skip margin calculator (how many more you can bunk while staying above 75%), and color-coded warnings
📝 Marks — CAT/FT scores per subject with running totals
📅 Today's Schedule — resolves your slot codes (A, B, C, P47-P48...) against the Unified Time Table using the day's actual Day Order (not Mon/Tue/Wed)
🗓 Browse any Day Order — see the schedule for Day 1 through Day 5 anytime
🔒 Fully private — your credentials go directly to SRM's servers. Nothing is stored or sent anywhere else. Ever.

How it works
The Chrome extension injects into your already-logged-in SRM Academia session and reads the rendered DOM directly — no scraping APIs, no third-party servers. Data is stored in chrome.storage.local and read by the dashboard page bundled with the extension.
Stack
Chrome Extension (MV3) · Vanilla JS · HTML/CSS
Disclaimer
Unofficial project. Not affiliated with SRM Institute of Science and Technology. Use responsibly.
