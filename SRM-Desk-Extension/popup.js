const lg = (m, c) => {
  const e = document.getElementById("lg");
  e.style.color = c || "#7c3aed";
  e.textContent = m;
};

function refresh() {
  chrome.storage.local.get(["srmData"], (res) => {
    const d = res.srmData;
    const bdg = document.getElementById("bdg");
    if (!d) { bdg.textContent = "NO DATA"; return; }

    const set = (id, v, ok) => {
      const e = document.getElementById(id);
      e.textContent = v;
      e.className = "sv " + (ok ? "ok" : "none");
    };
    set("sa", d.attendance?.length ? `✓ ${d.attendance.length} subjects` : "✗ not synced", d.attendance?.length > 0);
    set("sm", d.marks?.length ? `✓ ${d.marks.length} subjects` : "✗ not synced", d.marks?.length > 0);
    set("st", d.timetable?.length ? `✓ ${d.timetable.length} slots` : "✗ not synced", d.timetable?.length > 0);

    if (d.attendance?.length > 0) { bdg.textContent = "SYNCED ✓"; bdg.style.color = "#22c55e"; }
    else { bdg.textContent = "NO DATA"; }

    if (d.info && d.info.scrapedAt) {
      const mins = Math.round((Date.now() - new Date(d.info.scrapedAt)) / 60000);
      lg("Last sync: " + (mins < 1 ? "just now" : mins + "m ago"), "#475569");
    }

    if (!d.attendance?.length && d._debug) {
      const dbg = document.getElementById("dbg");
      dbg.style.display = "block";
      dbg.textContent = "Debug:\n" + JSON.stringify(d._debug, null, 2);
    }
  });
}

document.getElementById("sync").addEventListener("click", async () => {
  const btn = document.getElementById("sync");
  btn.disabled = true;
  btn.textContent = "⏳ Finding tab...";
  lg("Searching for SRM tab...");

  const tabs = await chrome.tabs.query({ url: "https://academia.srmist.edu.in/*" });
  if (!tabs.length) {
    lg("⚠ Open academia.srmist.edu.in first!", "#ef4444");
    btn.disabled = false;
    btn.textContent = "⚡ Sync Data from SRM";
    return;
  }

  const tabId = tabs[0].id;
  lg("Injecting scraper...", "#f59e0b");
  btn.textContent = "⏳ Injecting...";

  try {
    // Inject content.js into the tab
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });

    btn.textContent = "⏳ Scraping (~60s)...";
    lg("Scraping... keep SRM tab open!", "#f59e0b");

    // Call scrapeAll() inside the tab
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return new Promise((resolve) => {
          if (typeof window.scrapeAll !== "function") {
            resolve({ ok: false, error: "scrapeAll not defined" });
            return;
          }
          window.scrapeAll()
            .then(() => resolve({ ok: true }))
            .catch((e) => resolve({ ok: false, error: e.message }));
        });
      },
    });

    btn.disabled = false;
    btn.textContent = "⚡ Sync Data from SRM";

    const result = results && results[0] && results[0].result;
    if (result && result.ok) {
      lg("✓ Sync complete!", "#22c55e");
      setTimeout(refresh, 2000);
    } else {
      lg("✗ " + (result && result.error || "Unknown error"), "#ef4444");
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "⚡ Sync Data from SRM";
    lg("✗ " + e.message, "#ef4444");
  }
});

document.getElementById("dash").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

document.getElementById("clr").addEventListener("click", () => {
  if (confirm("Clear all synced data?")) {
    chrome.storage.local.remove(["srmData"], () => {
      refresh();
      lg("Cleared.", "#475569");
    });
  }
});

refresh();
