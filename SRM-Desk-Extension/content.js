// SRM Desk — Content Script v11
// Dynamic batch detection — works for Batch 1, 2, 3, 4 etc.

var PAGES = {
  WELCOME:   "#WELCOME",
  ATT_MARKS: "#Page:My_Attendance",
  TIMETABLE: "#Page:My_Time_Table_2023_24",
};

// Slot grid URL is built dynamically after detecting batch from timetable page
// Pattern: #Page:Unified_Time_Table_2025_Batch_1
//          #Page:Unified_Time_Table_2025_Batch_2  etc.

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

function toast(msg, color) {
  color = color || "#7c3aed";
  var el = document.getElementById("srmd-t");
  if (!el) {
    el = document.createElement("div"); el.id = "srmd-t";
    el.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#0f0f1a;border-radius:12px;padding:12px 18px;font-family:monospace;font-size:12px;color:#e2e8f0;box-shadow:0 8px 24px rgba(0,0,0,.5);max-width:340px;line-height:1.7;";
    document.body.appendChild(el);
  }
  el.style.border = "1px solid " + color;
  el.innerHTML = '<b style="color:' + color + '">SRM DESK</b><br>' + msg;
  clearTimeout(el._t);
  el._t = setTimeout(function() { el.style.opacity = "0"; }, 8000);
}

function getAllText() {
  var parts = [document.body.innerText || ""];
  Array.from(document.querySelectorAll("iframe")).forEach(function(f) {
    try {
      var doc = f.contentDocument || f.contentWindow.document;
      if (doc && doc.body) parts.push(doc.body.innerText || "");
    } catch(e) {}
  });
  return parts.join("\n");
}

function getAllTables() {
  var tables = Array.from(document.querySelectorAll("table"));
  Array.from(document.querySelectorAll("iframe")).forEach(function(f) {
    try {
      var doc = f.contentDocument || f.contentWindow.document;
      if (doc) tables = tables.concat(Array.from(doc.querySelectorAll("table")));
    } catch(e) {}
  });
  return tables;
}

async function goTo(hash, minLen) {
  minLen = minLen || 5000;
  window.location.hash = hash;
  await sleep(1500);
  var deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    await sleep(800);
    var text = getAllText();
    if (text.length >= minLen) {
      await sleep(2000);
      return getAllText();
    }
  }
  return getAllText();
}

// ── Batch detector ────────────────────────────────────────
// The timetable page has a clear "Batch:\t2" label (visible as red text in the UI)
// We target that specifically first, then fall back to broader patterns.
function detectBatch(text) {
  var patterns = [
    // Exact label from the page: "Batch:\t2" or "Batch:\n2" or "Batch:  2"
    /^Batch\s*:\s*(\d+)\s*$/im,
    /Batch\s*:\s*(\d+)/i,
    // Inside Unified TT URL references
    /Unified_Time_Table_\d{4}[_-][Bb]atch[_-](\d+)/i,
    // Generic fallback
    /\bBatch\s+(\d+)\b/i,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = text.match(patterns[i]);
    if (m && m[1]) {
      var n = parseInt(m[1]);
      if (n >= 1 && n <= 10) return n;
    }
  }
  return null;
}

// Build all candidate slot grid hashes to try for a batch number.
// SRM uses inconsistent casing — Batch 1 uses "Batch_1", Batch 2 uses "batch_2" etc.
// We try all variants so it always works.
function slotGridCandidates(batchNum) {
  return [
    "#Page:Unified_Time_Table_2025_Batch_" + batchNum,
    "#Page:Unified_Time_Table_2025_batch_" + batchNum,
    "#Page:Unified_Time_Table_2024_Batch_" + batchNum,
    "#Page:Unified_Time_Table_2024_batch_" + batchNum,
    "#Page:Unified_Time_Table_Batch_" + batchNum,
  ];
}

// ── Attendance parser ─────────────────────────────────────
function parseAttendance(text) {
  var att = [];
  var HEADER = "Hours Conducted\tHours Absent\tAttn %";
  var idx = text.indexOf(HEADER);
  if (idx === -1) return att;

  var after = text.slice(idx + HEADER.length);
  var endIdx = after.indexOf("Course Code\tCourse Type\tTest Performance");
  if (endIdx === -1) endIdx = after.indexOf("Internal Marks Detail");
  var section = endIdx > 0 ? after.slice(0, endIdx) : after.slice(0, 5000);

  var lines = section.split("\n").map(function(l){ return l.trim(); }).filter(Boolean);

  var i = 0;
  while (i < lines.length) {
    var codeMatch = lines[i].match(/^(\d{2}[A-Z]{2,3}\d{3}[A-Z0-9]*)$/);
    if (!codeMatch) { i++; continue; }
    var code = codeMatch[1];
    i++;
    if (i >= lines.length) break;

    var dataLine = lines[i];
    var parts = dataLine.split("\t");

    if (parts.length >= 8 && /^(Regular|Elective|Lateral|Audit|Mandatory)$/i.test(parts[0])) {
      var conducted = parseInt(parts[6]) || 0;
      var absent    = parseInt(parts[7]) || 0;
      var attn      = parseFloat(parts[8]) || 0;
      if (conducted > 0) {
        att.push({
          courseCode:  code,
          courseTitle: parts[1] || "Unknown",
          type:        parts[2] || "Theory",
          faculty:     parts[3] || "",
          slot:        parts[4] || "",
          room:        parts[5] || "",
          attended:    conducted - absent,
          total:       conducted,
          percentage:  attn,
        });
      }
    }
    i++;
  }
  return att;
}

// ── Marks parser ──────────────────────────────────────────
function parseMarks(codeToTitle) {
  var marks = [];
  var target = null;

  getAllTables().forEach(function(table) {
    if (target) return;
    var rows = Array.from(table.querySelectorAll("tr"));
    for (var ri = 0; ri < Math.min(rows.length, 4); ri++) {
      var cells = Array.from(rows[ri].querySelectorAll("th,td"))
                      .map(function(c){ return c.innerText.trim(); });
      if (cells[0]==="Course Code" && cells[1]==="Course Type"
          && cells.length <= 6 && cells.indexOf("Course Title") === -1) {
        target = table; break;
      }
    }
  });
  if (!target) return marks;

  var rows = Array.from(target.querySelectorAll("tr"));
  var hIdx = -1;
  for (var ri = 0; ri < rows.length; ri++) {
    var c = Array.from(rows[ri].querySelectorAll("th,td")).map(function(x){ return x.innerText.trim(); });
    if (c[0]==="Course Code" && c[1]==="Course Type") { hIdx=ri; break; }
  }
  if (hIdx < 0) return marks;

  var seenCodes = {};
  for (var ri2 = hIdx+1; ri2 < rows.length; ri2++) {
    var tds = Array.from(rows[ri2].querySelectorAll("td"));
    if (!tds.length) continue;
    var code2 = tds[0] ? tds[0].innerText.trim() : "";
    if (!code2.match(/^\d{2}[A-Z]/)) continue;
    var type2 = tds[1] ? tds[1].innerText.trim() : "";
    var key = code2 + "|" + type2;
    if (seenCodes[key]) continue;
    seenCodes[key] = true;

    var tests = [];
    var seenTests = {};

    for (var ci = 2; ci < tds.length; ci++) {
      var subTables = tds[ci].querySelectorAll("table");
      if (subTables.length > 0) {
        Array.from(subTables).forEach(function(st) {
          var lines = st.innerText.trim().split("\n")
                        .map(function(l){ return l.trim(); }).filter(Boolean);
          if (lines.length >= 2) {
            var hm = lines[0].match(/^(.+?)\/(\d+\.?\d*)$/);
            if (hm && !seenTests[hm[1].trim()]) {
              seenTests[hm[1].trim()] = true;
              tests.push({ testName:hm[1].trim(), scored:parseFloat(lines[1])||0, maximum:parseFloat(hm[2])||100 });
            }
          }
        });
      } else {
        tds[ci].innerText.trim().split("\t").forEach(function(chunk) {
          var lines2 = chunk.trim().split("\n").map(function(l){ return l.trim(); }).filter(Boolean);
          if (lines2.length >= 2) {
            var hm2 = lines2[0].match(/^(.+?)\/(\d+\.?\d*)$/);
            if (hm2 && !seenTests[hm2[1].trim()]) {
              seenTests[hm2[1].trim()] = true;
              tests.push({ testName:hm2[1].trim(), scored:parseFloat(lines2[1])||0, maximum:parseFloat(hm2[2])||100 });
            }
          }
        });
      }
    }

    marks.push({
      courseCode:      code2,
      courseTitle:     codeToTitle[code2] || code2,
      courseType:      type2,
      testPerformance: tests,
    });
  }
  return marks;
}

// ── Timetable ─────────────────────────────────────────────
function parseTimetable(text) {
  var tt = [], seen = {};
  var idx = text.indexOf("S.No\t");
  if (idx === -1) return tt;
  text.slice(idx).split("\n").slice(1).forEach(function(line) {
    var p = line.trim().split("\t");
    if (p.length < 9 || !/^\d+$/.test(p[0].trim())) return;
    var slot = p[8].replace(/-+$/, "").trim();
    var code = p[1].trim();
    var key  = slot + "|" + code;
    if (seen[key]) return;
    seen[key] = true;
    tt.push({ slot:slot, courseTitle:p[2].trim(), courseCode:code, faculty:p[7].trim(), room:p[9]?p[9].trim():"", type:p[6]?p[6].trim():"Theory" });
  });
  return tt;
}

// ── Slot grid ─────────────────────────────────────────────
function parseSlotGrid() {
  var grid = {};
  getAllTables().forEach(function(table) {
    var rows = Array.from(table.querySelectorAll("tr")).map(function(tr){
      return Array.from(tr.querySelectorAll("th,td")).map(function(c){ return c.innerText.trim(); });
    });
    var fi = -1;
    for (var ri = 0; ri < rows.length; ri++) {
      if (rows[ri][0]==="FROM" || (rows[ri].length>3 && rows[ri][1] && rows[ri][1].match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/))) {
        fi=ri; break;
      }
    }
    if (fi < 0) return;
    var ct = rows[fi].map(function(c){
      var m = c.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      return m ? {start:m[1], end:m[2]} : null;
    });
    for (var ri2 = fi+1; ri2 < rows.length; ri2++) {
      var cells = rows[ri2];
      var dm = cells[0] && cells[0].match(/^Day\s*(\d+)$/i);
      if (!dm) continue;
      var dk = "Day " + dm[1];
      if (!grid[dk]) grid[dk] = {};
      for (var ci = 1; ci < cells.length; ci++) {
        if (!cells[ci] || cells[ci]==="-") continue;
        var t = ct[ci]; if (!t) continue;
        cells[ci].split("/").forEach(function(code){
          code = code.trim();
          if (!code || code.toUpperCase()==="X") return;
          if (!grid[dk][code]) grid[dk][code] = {start:t.start, end:t.end};
        });
      }
    }
  });
  return grid;
}

// ── Main ──────────────────────────────────────────────────
async function scrapeAll() {
  var saved = {
    info: {scrapedAt: new Date().toISOString()},
    todayDayOrder: null,
    batchNumber: null,
    attendance: [], marks: [], timetable: [], slotGrid: {},
    _debug: {}
  };

  // 1. Day Order from welcome
  toast("Getting Day Order... (1/4)", "#7c3aed");
  var wt = await goTo(PAGES.WELCOME, 5000);
  var dm = wt.match(/Day\s*Order\s*[:\-]?\s*(\d+)/i);
  saved.todayDayOrder   = dm ? "Day "+dm[1] : null;
  saved._debug.dayOrder = saved.todayDayOrder || "NOT FOUND";

  // 2. Attendance + marks
  toast("Reading attendance & marks... (2/4)", "#7c3aed");
  var attText = await goTo(PAGES.ATT_MARKS, 12000);
  saved._debug.bodyLen   = attText.length;
  saved._debug.hasHeader = attText.includes("Hours Conducted\tHours Absent\tAttn %");

  if (saved._debug.hasHeader) {
    saved.attendance = parseAttendance(attText);
  }
  var codeToTitle = {};
  saved.attendance.forEach(function(a){ codeToTitle[a.courseCode] = a.courseTitle; });
  saved.marks = parseMarks(codeToTitle);
  saved._debug.attCount  = saved.attendance.length;
  saved._debug.markCount = saved.marks.length;

  // 3. Timetable + batch detection
  toast("Reading timetable & detecting batch... (3/4)", "#f59e0b");
  var ttText = await goTo(PAGES.TIMETABLE, 5000);
  saved.timetable      = parseTimetable(ttText);
  saved._debug.ttCount = saved.timetable.length;

  // Detect batch — "Batch:\t2" is clearly visible in the timetable page text
  var batchNum = detectBatch(ttText);

  // If not found in text, scan full DOM text (iframes included)
  if (!batchNum) {
    batchNum = detectBatch(getAllText());
  }

  // Default to 1 if still nothing
  if (!batchNum) {
    batchNum = 1;
    saved._debug.batchDetectionFallback = true;
  }

  saved.batchNumber     = batchNum;
  saved._debug.batchNum = batchNum;

  // 4. Try all URL variants for this batch until one returns data
  toast("Reading slot grid for Batch " + batchNum + "... (4/4)", "#22c55e");
  var candidates = slotGridCandidates(batchNum);
  var usedHash = null;

  for (var i = 0; i < candidates.length; i++) {
    await goTo(candidates[i], 5000);
    await sleep(500);
    saved.slotGrid = parseSlotGrid();
    if (Object.keys(saved.slotGrid).length > 0) {
      usedHash = candidates[i];
      break;
    }
  }

  saved._debug.slotHash = usedHash || "none worked";
  saved._debug.slotDays = Object.keys(saved.slotGrid);

  await chrome.storage.local.set({ srmData: saved });

  var ok = saved.attendance.length > 0;
  toast(
    ok
      ? "Done! " + saved.attendance.length + " subjects · Batch " + batchNum
      : "hasHeader:" + saved._debug.hasHeader + " bodyLen:" + saved._debug.bodyLen + " att:0",
    ok ? "#22c55e" : "#ef4444"
  );
}

window.scrapeAll = scrapeAll;
