const MIN = 75;
const ALL_DAYS = ["Day 1","Day 2","Day 3","Day 4","Day 5"];

function pctColor(p) { return p>=85?"var(--green)":p>=MIN?"var(--amber)":"var(--red)"; }
function skipCalc(a,t){ return Math.max(0,Math.floor((a-t*MIN/100)/(MIN/100))); }
function needCalc(a,t){ const mn=MIN/100; return Math.max(0,Math.ceil((t*mn-a)/(1-mn))); }
function parseTime(t) {
  if (!t) return 0;
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  let h = parseInt(m[1]);
  if (h < 8) h += 12; // SRM afternoon times: 01:25 = 13:25
  return h*60+parseInt(m[2]);
}

// Tab switching
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
    document.getElementById(tab).classList.add("active");
  });
});

function buildSchedule(timetable, slotGrid, dayOrder) {
  if (!dayOrder || !slotGrid[dayOrder]) return [];
  const daySlots = slotGrid[dayOrder];
  const schedule = [];
  const seen = new Set();

  (timetable||[]).forEach(entry => {
    // Handle "P47-P48" — split on dash, each is a slot code
    const rawSlots = entry.slot.split(/[-,]/).map(s=>s.trim()).filter(Boolean);
    rawSlots.forEach(code => {
      if (!daySlots[code]) return;
      const key = entry.courseCode + "|" + code;
      if (seen.has(key)) return;
      seen.add(key);
      const times = daySlots[code];
      schedule.push({
        slotCode: entry.slot,
        displaySlot: code,
        courseTitle: entry.courseTitle,
        courseCode:  entry.courseCode,
        faculty:     entry.faculty,
        room:        entry.room,
        type:        entry.type,
        start:       times.start,
        end:         times.end,
      });
    });
  });
  return schedule.sort((a,b)=>parseTime(a.start)-parseTime(b.start));
}

let globalData = null;
let selectedDay = null;

function renderToday(dayOrder) {
  selectedDay = dayOrder;
  document.getElementById("dayChip").textContent = dayOrder || "—";

  // Update day selector buttons
  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-day") === dayOrder);
  });

  if (!globalData) return;
  const d = globalData;
  const att = d.attendance || [];
  const todaySlots = buildSchedule(d.timetable, d.slotGrid||{}, dayOrder);

  // Update TODAY count in summary
  const todayCard = document.querySelector(".today-count");
  if (todayCard) todayCard.textContent = todaySlots.length;

  const now = new Date().getHours()*60+new Date().getMinutes();
  const isToday = dayOrder === d.todayDayOrder;

  if (todaySlots.length === 0) {
    document.getElementById("sched").innerHTML = `<div class="empty">🎉 No classes for ${dayOrder}!</div>`;
    return;
  }

  document.getElementById("sched").innerHTML = todaySlots.map(s => {
    const start = parseTime(s.start), end = parseTime(s.end);
    const isNow  = isToday && start<=now && now<end;
    const isPast = isToday && end>0 && end<=now;
    const isLab  = s.type.toLowerCase().includes("lab") || s.slotCode.startsWith("P") || s.slotCode.startsWith("L");
    return `<div class="cls${isNow?" now":""}${isPast?" past":""}">
      ${isNow?'<div class="nowbar"></div>':""}
      <div class="ctime">
        <div class="ctm">${s.start||"?"}</div>
        <div class="cte">${s.end||""}</div>
        <div style="font-family:monospace;font-size:.55rem;color:var(--accent);margin-top:.1rem">${s.displaySlot}</div>
      </div>
      <div class="cbody">
        <div>
          <div class="cname">${s.courseTitle||"Unknown"}</div>
          <div class="cmeta">${s.faculty?s.faculty+" ":""}${s.room?"📍"+s.room:""}</div>
        </div>
        <span class="typbadge ${isLab?"t-lab":"t-theory"}">${isLab?"LAB":"THEORY"}</span>
      </div>
    </div>`;
  }).join("");
}

chrome.storage.local.get(["srmData"], (res) => {
  const d = res.srmData;
  if (!d||(!d.attendance?.length&&!d.marks?.length)) {
    document.getElementById("nodata").style.display="flex";
    ["today","att","marks"].forEach(id=>{ const el=document.getElementById(id); if(el)el.style.display="none"; });
    return;
  }

  globalData = d;

  // Meta
  if (d.info?.scrapedAt) {
    const mins = Math.round((Date.now()-new Date(d.info.scrapedAt))/60000);
    document.getElementById("meta").textContent =
      "synced "+(mins<1?"just now":mins+"m ago")+" • "+
      (d.batchNumber ? "Batch "+d.batchNumber+" • " : "")+
      new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"});
  }

  const att = d.attendance||[];
  const totalAtt = att.reduce((s,r)=>s+(r.attended||0),0);
  const totalCls = att.reduce((s,r)=>s+(r.total||0),0);
  const overallPct = totalCls?Math.round(totalAtt/totalCls*100):0;
  const totalSkip  = att.reduce((s,r)=>s+skipCalc(r.attended||0,r.total||0),0);
  const todayDay   = d.todayDayOrder||"—";

  // Build day selector
  const daySelector = document.getElementById("daySelector");
  daySelector.innerHTML = ALL_DAYS.map(day => {
    const isToday = day === todayDay;
    return `<button class="day-btn${isToday?" active":""}" data-day="${day}">
      ${day}${isToday?'<span class="today-dot">●</span>':""}
    </button>`;
  }).join("");
  daySelector.querySelectorAll(".day-btn").forEach(btn => {
    btn.addEventListener("click", ()=>renderToday(btn.getAttribute("data-day")));
  });

  // Summary
  document.getElementById("sum").innerHTML = [
    ["OVERALL ATT.",`<span style="color:${pctColor(overallPct)}">${overallPct}%</span>`,"across all"],
    ["CAN SKIP",`<span style="color:var(--green)">${totalSkip}</span>`,"total classes"],
    ["TODAY",`<span class="today-count">${buildSchedule(d.timetable,d.slotGrid||{},todayDay).length}</span>`,todayDay],
    ["SUBJECTS",`${att.length}`,"enrolled"],
  ].map(([l,v,s])=>`<div class="sc"><div class="sl">${l}</div><div class="sv">${v}</div><div class="ss">${s}</div></div>`).join("");

  // Render today's schedule
  renderToday(todayDay);

  // Attendance cards
  document.getElementById("attGrid").innerHTML = att.map((r,i)=>{
    const p=r.total?Math.round((r.attended||0)/r.total*100):(r.percentage||0);
    const c=pctColor(p), skip=skipCalc(r.attended||0,r.total||0), need=needCalc(r.attended||0,r.total||0);
    const skipHtml = p>=MIN
      ?`<span class="skip ${skip>=4?"skip-ok":"skip-warn"}">✓ skip ${skip}</span>`
      :`<span class="skip skip-bad">⚠ need ${need}</span>`;
    return `<div class="card" style="--bar:${c};animation-delay:${i*.04}s">
      <div class="cn">${r.courseTitle}</div><div class="cc">${r.courseCode||""} ${r.slot?"· slot "+r.slot:""}</div>
      <div class="prow"><div class="pct" style="color:${c}">${p}%</div><div class="frac">${r.attended||0}/${r.total||0}</div></div>
      <div class="track"><div class="fill" style="width:${Math.min(p,100)}%;background:${c}"></div><div class="minline"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center">${skipHtml}<span style="font-family:monospace;font-size:.6rem;color:var(--muted)">min 75%</span></div>
    </div>`;
  }).join("");

  // Marks cards
  document.getElementById("marksGrid").innerHTML = (d.marks||[]).map((s,i)=>{
    const done=(s.testPerformance||[]).filter(t=>t.scored>=0);
    const ts=done.reduce((a,t)=>a+t.scored,0), tm=done.reduce((a,t)=>a+t.maximum,0);
    const tp=tm?Math.round(ts/tm*100):0;
    const rows=(s.testPerformance||[]).map(t=>{
      const cp=t.maximum?Math.round(t.scored/t.maximum*100):0;
      const cc=t.scored<0?"var(--muted)":pctColor(cp);
      return `<div class="cr"><span class="clbl">${t.testName} <span style="color:var(--muted);font-size:.6rem">/${t.maximum}</span></span><span class="cval" style="color:${cc}">${t.scored<0?"—":t.scored}</span></div>`;
    }).join("");
    return `<div class="mc" style="animation-delay:${i*.05}s">
      <div class="cn">${s.courseTitle}</div><div class="cc">${s.courseCode||""}</div>
      <div class="comp">${rows}
        <div class="ctot"><span style="font-size:.8rem;font-weight:600">Total so far</span>
        <span style="font-family:monospace;font-size:.95rem;font-weight:700;color:${pctColor(tp)}">${ts}/${tm} <span style="font-size:.7rem;color:var(--muted)">(${tp}%)</span></span></div>
      </div></div>`;
  }).join("");
});
