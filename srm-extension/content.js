// SRM Desk — Content Script v10
// CONFIRMED FORMAT from headerSnippet:
//
// ...Hours Conducted\tHours Absent\tAttn %\n
// 21MAB204T\n
// Regular\tProbability and Queueing Theory\tTheory\tDr. Karthik...\tA\tTP 403\t38\t10\t73.68\n
// 21CSC204J\n
// Regular\tDesign and Analysis...\tTheory\t...\tB\tTP 403\t26\t1\t96.15\n
//
// So: code is alone on one line, next line is "Regular\t[Title]\t[Cat]\t[Faculty]\t[Slot]\t[Room]\t[Conducted]\t[Absent]\t[Attn%]"

var PAGES = {
  WELCOME:   "#WELCOME",
  ATT_MARKS: "#Page:My_Attendance",
  TIMETABLE: "#Page:My_Time_Table_2023_24",
  SLOTS:     "#Page:Unified_Time_Table_2025_Batch_1",
};

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

// ── Attendance parser ─────────────────────────────────────
// EXACT FORMAT (confirmed from headerSnippet):
// "21MAB204T\n"
// "Regular\tProbability and Queueing Theory\tTheory\tDr. Karthik Chinnasamy (103246)\tA\tTP 403\t38\t10\t73.68\n"
function parseAttendance(text) {
  var att = [];
  var HEADER = "Hours Conducted\tHours Absent\tAttn %";
  var idx = text.indexOf(HEADER);
  if (idx === -1) return att;

  // Slice from after the header
  var after = text.slice(idx + HEADER.length);
  // End at marks section
  var endIdx = after.indexOf("Course Code\tCourse Type\tTest Performance");
  if (endIdx === -1) endIdx = after.indexOf("Internal Marks Detail");
  var section = endIdx > 0 ? after.slice(0, endIdx) : after.slice(0, 5000);

  var lines = section.split("\n").map(function(l){ return l.trim(); }).filter(Boolean);

  var i = 0;
  while (i < lines.length) {
    // Look for a line that is JUST a course code
    var codeMatch = lines[i].match(/^(\d{2}[A-Z]{2,3}\d{3}[A-Z0-9]*)$/);
    if (!codeMatch) { i++; continue; }
    var code = codeMatch[1];
    i++;
    if (i >= lines.length) break;

    // Next line: "Regular\tTitle\tCategory\tFaculty\tSlot\tRoom\tConducted\tAbsent\tAttn%"
    var dataLine = lines[i];
    var parts = dataLine.split("\t");

    // parts[0] = "Regular" (enrolment type)
    // parts[1] = Course Title
    // parts[2] = Category (Theory/Practical)
    // parts[3] = Faculty Name
    // parts[4] = Slot
    // parts[5] = Room No
    // parts[6] = Hours Conducted
    // parts[7] = Hours Absent
    // parts[8] = Attn %
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
    attendance: [], marks: [], timetable: [], slotGrid: {},
    _debug: {}
  };

  toast("🗓 Getting Day Order... (1/4)", "#7c3aed");
  var wt = await goTo(PAGES.WELCOME, 5000);
  var dm = wt.match(/Day\s*Order\s*[:\-]?\s*(\d+)/i);
  saved.todayDayOrder   = dm ? "Day "+dm[1] : null;
  saved._debug.dayOrder = saved.todayDayOrder || "NOT FOUND";

  toast("📊 Reading attendance & marks... (2/4)", "#7c3aed");
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

  toast("📅 Reading timetable... (3/4)", "#f59e0b");
  var ttText = await goTo(PAGES.TIMETABLE, 5000);
  saved.timetable      = parseTimetable(ttText);
  saved._debug.ttCount = saved.timetable.length;

  toast("⏰ Reading slot grid... (4/4)", "#22c55e");
  await goTo(PAGES.SLOTS, 5000);
  await sleep(500);
  saved.slotGrid        = parseSlotGrid();
  saved._debug.slotDays = Object.keys(saved.slotGrid);

  await chrome.storage.local.set({ srmData: saved });

  var ok = saved.attendance.length > 0;
  toast(
    ok ? "✓ Done! "+saved.attendance.length+" subjects • "+saved.marks.length+" marks"
       : "⚠ hasHeader:"+saved._debug.hasHeader+" bodyLen:"+saved._debug.bodyLen+" att:0",
    ok ? "#22c55e" : "#ef4444"
  );
}

window.scrapeAll = scrapeAll;
