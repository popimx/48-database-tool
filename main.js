import { GENERATION_ORDER_MAP } from "./config/generationOrder.js";
import { GENERATION_MEMBER_ORDER } from "./config/generationMemberOrder.js";
import { STAGE_LIST } from "./config/stageList.js";

document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname;

  if (path.includes("members.html")) initMembersPage();
  if (path.includes("birthdays.html")) initBirthdaysPage();
  if (path.includes("days.html")) initDaysPage();
  if (path.includes("timeline.html")) initTimelinePage();
  if (path.includes("theaterstage.html")) initTheaterStagePage();
  
  scheduleMidnightUpdate();
});

/* =========================
   グループ
========================= */

const GROUPS = [
  "akb48",
  "ske48",
  "nmb48",
  "hkt48",
  "ngt48",
  "stu48"
];

const GROUP_ORDER = [
  "akb48",
  "ske48",
  "nmb48",
  "hkt48",
  "ngt48",
  "stu48"
];

const groupNameMap = {
  akb48: "AKB48",
  ske48: "SKE48",
  nmb48: "NMB48",
  hkt48: "HKT48",
  ngt48: "NGT48",
  stu48: "STU48"
};

/* =========================
   AKB順
========================= */

const AKB_ORDER = [
  "13期",
  "15期",
  "チーム8",
  "ドラフト2期",
  "16期",
  "ドラフト3期",
  "17期",
  "18期",
  "19期",
  "20期",
  "21期"
];

/* =========================
   キャッシュ
========================= */

const memberCache = {};
const timelineCache = {};
const memberStateCache = {};

/* =========================
   データ取得
========================= */

async function loadMembers(group) {
  if (memberCache[group]) return memberCache[group];

  const url = `data/members/${group}.json?t=${Date.now()}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    console.error("LOAD FAILED:", group);
    return [];
  }

  const data = await res.json();
  memberCache[group] = data;

  return data;
}

async function loadAllMembers() {
  const all = await Promise.all(GROUPS.map(loadMembers));
  return all.flat();
}

/* =========================
   TIMELINE（グループ対応）
========================= */

async function loadTimeline(group) {
  if (timelineCache[group]) return timelineCache[group];

  const res = await fetch(
    `data/members/${group}_timeline.json?t=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("TIMELINE LOAD FAILED:", group);
    return [];
  }

  const data = await res.json();
  timelineCache[group] = data;

  return data;
}

/* =========================
   MEMBER STATE（グループ対応）
========================= */

async function loadMemberState(group) {
  if (memberStateCache[group]) return memberStateCache[group];

  const res = await fetch(
    `data/members/${group}_member_state.json?t=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("MEMBER STATE LOAD FAILED:", group);
    return {};
  }

  const data = await res.json();
  memberStateCache[group] = data;

  return data;
}

/* =========================
   バッジ
========================= */

function getBadgeClass(member) {
  if (member.status === "graduated") return "badge-graduate";

  switch (member.groupId) {
    case "akb48": return "badge-akb";
    case "ske48": return "badge-ske";
    case "nmb48": return "badge-nmb";
    case "hkt48": return "badge-hkt";
    case "ngt48": return "badge-ngt";
    case "stu48": return "badge-stu";
    default: return "";
  }
}

/* =========================
   画像
========================= */

function getImagePath(m) {
  const base = `images/members/${m.groupId}/${m.image}_${m.imageYear}`;

  return {
    png: `${base}.PNG`,
    jpeg: `${base}.JPEG`,
    jpg: `${base}.JPG`
  };
}

/* =========================
   チーム8判定
========================= */

function isTeam8(m) {
  return m.groupId === "akb48" && m.generation === "チーム8";
}

/* =========================
   チームマップ
========================= */

const TEAM_MAP = {
  "チームS": "チームS",
  "チームKⅡ": "チームKⅡ",
  "チームE": "チームE",
  "チームH": "チームH",
  "チームKⅣ": "チームKⅣ"
};

/* =========================
   メンバーラベル
========================= */

function getMemberLabel(member, selectedGroup, sortMode) {
  const isTeam8Member = isTeam8(member);

  const isSKEorHKT =
    member.groupId === "ske48" ||
    member.groupId === "hkt48";

  const isSingleGroup = selectedGroup !== "all";

  if (sortMode === "days") {
    return isTeam8Member ? "チーム8" : member.generation;
  }

  const useTeamLabel =
    isSingleGroup &&
    isSKEorHKT &&
    (
      sortMode === "default" ||
      sortMode === "kana" ||
      sortMode === "birthday" ||
      sortMode === "nearestBirthday" ||
      sortMode === "age"
    );

  if (useTeamLabel) {
    if (isTeam8Member) return "チーム8";
    if (member.role === "kenkyuusei") return "研究生";
    return TEAM_MAP[member.role] || "正規メンバー";
  }

  if (selectedGroup === "all") {
    if (
      sortMode === "default" ||
      sortMode === "kana" ||
      sortMode === "birthday" ||
      sortMode === "nearestBirthday" ||
      sortMode === "age"
    ) {
      return groupNameMap[member.groupId];
    }
  }

  if (isTeam8Member) {
    return selectedGroup === "all" ? "AKB48" : "正規メンバー";
  }

  if (member.role === "kenkyuusei") {
    return selectedGroup === "all"
      ? groupNameMap[member.groupId]
      : `${member.generation}研究生`;
  }

  return "正規メンバー";
}

/* =========================
   INIT
========================= */

async function initMembersPage() {
  document.getElementById("group-select")?.addEventListener("change", updateMembers);
  document.getElementById("status-filter")?.addEventListener("change", updateMembers);
  document.getElementById("sort-select")?.addEventListener("change", updateMembers);

  updateMembers();
}

/* =========================
   UPDATE MEMBERS
========================= */

async function updateMembers() {
  const group = document.getElementById("group-select")?.value || "all";
  const status = document.getElementById("status-filter")?.value || "all";
  const sort = document.getElementById("sort-select")?.value || "default";

  let members =
    group === "all"
      ? await loadAllMembers()
      : await loadMembers(group);

  if (status === "member") {
    members = members.filter(m => m.status === "member");
  }

  if (sort === "default") members.sort(globalDefaultSort);

  else if (sort === "kana") {
    members.sort((a, b) =>
      (a.kana || "").localeCompare(b.kana || "", "ja")
    );
  }

  else if (sort === "birthday") {
    members.sort((a, b) =>
      (a.birthday || "").slice(5).localeCompare((b.birthday || "").slice(5))
    );
  }

  else if (sort === "nearestBirthday") {
    members.sort((a, b) =>
      getNextBirthday(a.birthday) - getNextBirthday(b.birthday)
    );
  }

  else if (sort === "age") {
    members.sort((a, b) => new Date(a.birthday) - new Date(b.birthday));
  }

  else if (sort === "days") {
    members.sort((a, b) => {
      const d = calcDays(b.joinDate) - calcDays(a.joinDate);
      if (d !== 0) return d;

      const g = GROUP_ORDER.indexOf(a.groupId) - GROUP_ORDER.indexOf(b.groupId);
      if (g !== 0) return g;

      return (a.kana || "").localeCompare(b.kana || "", "ja");
    });
  }

  renderMembers(members, group, sort);
}

/* =========================
   ソート
========================= */

function akbRank(m) {
  const gen = String(m.generation || "");
  for (let i = 0; i < AKB_ORDER.length; i++) {
    if (gen.includes(AKB_ORDER[i])) return i;
  }
  return 999;
}

function nmbRank(m) {
  if (m.role !== "kenkyuusei") return 1;
  if (m.generation?.includes("10")) return 2;
  if (m.generation?.includes("11")) return 3;
  return 4;
}

function skeRank(m) {
  if (m.role === "チームS") return 1;
  if (m.role === "チームKⅡ") return 2;
  if (m.role === "チームE") return 3;
  if (m.role === "kenkyuusei") return 4;
  return 5;
}

function hktRank(m) {
  if (m.role === "チームH") return 1;
  if (m.role === "チームKⅣ") return 2;
  if (m.role === "kenkyuusei") return 3;
  return 4;
}

function globalDefaultSort(a, b) {
  const g = GROUP_ORDER.indexOf(a.groupId) - GROUP_ORDER.indexOf(b.groupId);
  if (g !== 0) return g;

  if (a.groupId === "akb48") {
    const r = akbRank(a) - akbRank(b);
    if (r !== 0) return r;
  }

  if (a.groupId === "nmb48") {
    const r = nmbRank(a) - nmbRank(b);
    if (r !== 0) return r;
  }

  if (a.groupId === "ske48") {
    const r = skeRank(a) - skeRank(b);
    if (r !== 0) return r;
  }

  if (a.groupId === "hkt48") {
    const r = hktRank(a) - hktRank(b);
    if (r !== 0) return r;
  }

  const aKey = a.role === "kenkyuusei" ? 2 : 1;
  const bKey = b.role === "kenkyuusei" ? 2 : 1;

  if (aKey !== bKey) return aKey - bKey;

  return (a.kana || "").localeCompare(b.kana || "", "ja");
}

/* =========================
   TIMELINE関連
========================= */

function getActiveMembersByDate(date, memberState, grouped) {
  const result = [];

  const targetDate = new Date(date).getTime();

  grouped.forEach(group => {
    const active = group.members.filter(name => {
      const periods = memberState[name];

      if (!Array.isArray(periods)) return false;

      return periods.some(p => {
        if (p.generation !== group.generation) {
          return false;
        }

        const start = new Date(p.start).getTime();

        const end = p.end
          ? new Date(p.end).getTime()
          : Infinity;

        return start <= targetDate &&
               targetDate < end;
      });
    });

    if (active.length) {
      result.push({
        generation: group.generation,
        members: active
      });
    }
  });

  return result;
}

function calculateTimelineCounts(timeline) {
  let current = 0;

  return timeline.map(card => {
    const events = card.events.map(event => {
      current += Number(event.delta || 0);

      return {
        ...event,
        currentValue: current
      };
    });

    return {
      ...card,
      events
    };
  });
}

/* =========================
   RENDER MEMBERS
========================= */

function renderMembers(members, selectedGroup, sortMode) {
  const container = document.getElementById("member-list");
  if (!container) return;

  container.innerHTML = "";

  members.forEach(m => {
    const img = getImagePath(m);
    const label = getMemberLabel(m, selectedGroup, sortMode);

    let sub = "";

    if (sortMode === "birthday" || sortMode === "age") {
      sub = `${formatDate(m.birthday)} (${calcAge(m.birthday)}歳)`;
    } else if (sortMode === "nearestBirthday") {
      const diff = getNextBirthday(m.birthday) - new Date();
      const days = Math.ceil(diff / 86400000);

      sub = `${formatMonthDay(m.birthday)} (あと${days}日)`;
    } else if (sortMode === "days") {
      sub = getMembershipText(m);
    } else {
      sub = m.kana || "";
    }

    const card = document.createElement("div");
    card.className = "member-card";

    card.innerHTML = `
      <div class="member-name-row">
        <span class="member-name">${m.name}</span>
        <span class="member-badge ${getBadgeClass(m)}">${label}</span>
      </div>

      <div class="member-kana">${sub}</div>
    `;

    container.appendChild(card);
  });
}

function getMembershipText(m) {
  if (!m?.joinDate) return "-";

  const start = new Date(m.joinDate);

  const end =
    m.status === "graduated" && m.graduationDate
      ? new Date(m.graduationDate)
      : new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const days =
    Math.floor((end - start) / 86400000) + 1;

  const startText = m.joinDate.replace(/-/g, "/");

  if (m.status === "graduated" && m.graduationDate) {
    const endText =
      m.graduationDate.replace(/-/g, "/");

    return `${days}日<br>(${startText} 〜 ${endText})`;
  }

  return `${days}日<br>(${startText} 〜)`;
}


/* =========================
   DAYS PAGE
========================= */

function getNextBirthday(date) {
  const today = new Date();
  const birth = new Date(date);

  let next = new Date(
    today.getFullYear(),
    birth.getMonth(),
    birth.getDate()
  );

  if (next < today) {
    next.setFullYear(today.getFullYear() + 1);
  }

  return next;
}

async function initDaysPage() {
  document.getElementById("group-select")?.addEventListener("change", updateDays);
  document.getElementById("status-filter")?.addEventListener("change", updateDays);
  updateDays();
}

/* =========================
   TIMELINE PAGE
========================= */

async function initTimelinePage() {
  const params = new URLSearchParams(location.search);
  const group = params.get("group") || "akb48";

  await updateTimelinePage(group);

  // SPA切り替え
  document.getElementById("group-select")?.addEventListener("change", (e) => {
    updateTimelinePage(e.target.value);
  });
}


/* =========================
   SPA core function
========================= */

async function updateTimelinePage(group) {
  const groupKey = groupNameMap[group] || "AKB48";

  // ★ URLも同期（戻る問題防止）
  const url = new URL(location.href);
  url.searchParams.set("group", group);
  history.replaceState({}, "", url);

  let timeline = await loadTimeline(group);
  timeline = calculateTimelineCounts(timeline);

  const memberState = await loadMemberState(group);

  // =========================
  // grouping（完全安定版）
  // =========================

  const groupedMap = new Map();
  let memberIndex = 0;

  Object.entries(memberState || {}).forEach(([name, periods]) => {
    if (!Array.isArray(periods)) return;

    periods.forEach(p => {
      if (!p?.generation) return;

      const gen = (p.generation || "").trim(); // ★重要：正規化

      if (!groupedMap.has(gen)) {
        groupedMap.set(gen, {
          generation: gen,
          members: new Map()
        });
      }

      const groupData = groupedMap.get(gen);

      if (!groupData.members.has(name)) {
        groupData.members.set(name, memberIndex);
      }
    });

    memberIndex++;
  });

  // =========================
  // 世代順リスト
  // =========================

  const orderList =
    GENERATION_ORDER_MAP?.[groupKey] ?? []; // ★ fallback削除済み安全版

  const grouped = Array.from(groupedMap.entries())
    .sort((a, b) => {
      const orderA = orderList.indexOf(a[0]);
      const orderB = orderList.indexOf(b[0]);

      return (orderA === -1 ? 9999 : orderA)
           - (orderB === -1 ? 9999 : orderB);
    })
    .map(([gen, data]) => ({
      generation: gen,

      members: Array.from(data.members.keys())
        .sort((a, b) => {
          const order =
            GENERATION_MEMBER_ORDER?.[groupKey]?.[gen] || [];

          const ai = order.indexOf(a);
          const bi = order.indexOf(b);

          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;

          return ai - bi;
        })
    }));

  // =========================
  // render
  // =========================

  renderTimelineSummary(timeline, group);
  renderYearTabs(timeline, group, grouped);
  renderTimelineCards(timeline, memberState, grouped);

  // ★ UI同期（超重要）
  const select = document.getElementById("group-select");
  if (select) select.value = group;
}

/* =========================
   TIMELINE SUMMARY
========================= */

function renderTimelineSummary(timeline, group) {
  const el = document.getElementById("timeline-summary");
  if (!el) return;

  if (!timeline.length) {
    el.innerHTML = "データがありません";
    return;
  }

  const latestCard = timeline[timeline.length - 1];
  const latestEvent = latestCard.events[latestCard.events.length - 1];

  const now = new Date();

  const currentDate =
    `${now.getFullYear()}年` +
    `${now.getMonth() + 1}月` +
    `${now.getDate()}日`;

  el.innerHTML = `
    <div class="timeline-summary-box">
      <div class="timeline-summary-title">
        ${groupNameMap[group]} 人数推移
      </div>

      <div class="timeline-summary-count">
        ${latestEvent.currentValue}人
      </div>

      <div class="timeline-summary-date">
        ${currentDate}現在
      </div>
    </div>
  `;
}


/* =========================
   YEAR TABS
========================= */

function renderYearTabs(timeline, group, grouped) {
  const container = document.getElementById("year-tabs");
  if (!container) return;

  const years = [...new Set(
    timeline.map(t => t.date.slice(0, 4))
  )];

  years.sort((a, b) => a - b);

  container.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.textContent = "全て";
  allBtn.className = "year-tab active";

  allBtn.onclick = () => {
    setActiveTab(allBtn);
    renderTimelineCards(
      timeline,
      memberStateCache[group],
      grouped
    );
  };

  container.appendChild(allBtn);

  years.forEach(year => {
    const btn = document.createElement("button");
    btn.textContent = year;
    btn.className = "year-tab";

    btn.onclick = () => {
      setActiveTab(btn);

      const filtered = timeline.filter(t =>
        t.date.startsWith(year)
      );

      renderTimelineCards(
        filtered,
        memberStateCache[group],
        grouped
      );
    };

    container.appendChild(btn);
  });
}

/* =========================
   TAB ACTIVE制御
========================= */

function setActiveTab(activeBtn) {
  document.querySelectorAll(".year-tab").forEach(btn => {
    btn.classList.remove("active");
  });

  activeBtn.classList.add("active");
}

/* =========================
   TIMELINE CARDS
========================= */

function renderTimelineCards(timeline, memberState, grouped) {
  const container = document.getElementById("timeline-list");
  if (!container) return;

  container.innerHTML = "";

  timeline.forEach(cardData => {
    const card = document.createElement("div");
    card.className = "timeline-card";

    let eventsHtml = "";

    cardData.events.forEach(event => {
      const deltaText =
        event.delta > 0
          ? `+${event.delta}`
          : `${event.delta}`;

      eventsHtml += `
        <div class="timeline-event">
          <div class="timeline-event-text">${event.text}</div>

          <div class="timeline-event-right">
            <span class="timeline-event-value">
              ${event.currentValue}人
            </span>

            ${
              event.delta
                ? `<span class="timeline-event-delta">${deltaText}</span>`
                : ""
            }
          </div>
        </div>
      `;
    });

    const activeGenerations =
      getActiveMembersByDate(cardData.date, memberState, grouped);

    let membersHtml = "";

    activeGenerations.forEach(group => {
      membersHtml += `
        <div class="timeline-generation">
          <div class="timeline-generation-title">${group.generation}</div>

          <div class="timeline-generation-members">
            ${group.members.join("・")}
          </div>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="timeline-date">${formatDate(cardData.date)}</div>
      <div class="timeline-events">${eventsHtml}</div>
      <div class="timeline-members">${membersHtml}</div>
    `;

    container.appendChild(card);
  });
}

/* =========================
   0:00更新
========================= */

function scheduleMidnightUpdate() {
  const now = new Date();
  const next = new Date();

  next.setHours(24, 0, 0, 0);

  const ms = next - now;

  setTimeout(() => {
    updateMembers();
    updateDays();
    scheduleMidnightUpdate();
  }, ms);
}

/* =========================
   DAYS UPDATE
========================= */

async function updateDays() {
  const group = document.getElementById("group-select")?.value || "all";
  const status = document.getElementById("status-filter")?.value || "all";

  let members =
    group === "all"
      ? await loadAllMembers()
      : await loadMembers(group);

  if (status === "member") {
    members = members.filter(m => m.status === "member");
  }

  members.sort((a, b) => {
    const d = calcDays(b.joinDate) - calcDays(a.joinDate);

    if (d !== 0) return d;

    const g = GROUP_ORDER.indexOf(a.groupId) - GROUP_ORDER.indexOf(b.groupId);

    if (g !== 0) return g;

    return (a.kana || "").localeCompare(b.kana || "", "ja");
  });

  renderDaysMembers(members);
}

/* =========================
   DAYS RENDER
========================= */

function renderDaysMembers(members) {
  const container = document.getElementById("days-list");

  if (!container) return;

  container.innerHTML = "";

  members.forEach(m => {
    const img = getImagePath(m);

    const card = document.createElement("div");
    card.className = "member-card";

    card.innerHTML = `
  <div class="member-name-row">
    <span class="member-name">${m.name}</span>
  </div>

  <div class="member-kana">
    ${getDaysLabel(m)} / 在籍 ${calcDays(m.joinDate)}日
  </div>
`;

    container.appendChild(card);
  });
}

/* =========================
   DAYS LABEL
========================= */

function getDaysLabel(m) {
  if (!m) return "-";
  if (isTeam8(m)) return "チーム8";

  const gen = (m.generation || "").trim();

  if (!gen) return "-";

  if (m.role === "kenkyuusei") return `${gen}研究生`;

  return gen;
}

/* =========================
   UTILS
========================= */

function calcDays(joinDate) {
  if (!joinDate) return 0;

  const start = new Date(joinDate);
  const today = new Date();

  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.floor((today - start) / 86400000) + 1;
}

function calcAge(birthday) {
  if (!birthday) return "-";

  const today = new Date();
  const birth = new Date(birthday);

  let age = today.getFullYear() - birth.getFullYear();

  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

function formatDate(date) {
  if (!date) return "-";

  const d = new Date(date);

  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatMonthDay(date) {
  if (!date) return "-";

  const d = new Date(date);

  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatGenerationClean(m) {
  if (!m?.generation) return "-";

  if (m.generation === "チーム8") return "チーム8";

  const gen = String(m.generation).replace("期", "");

  if (m.role === "kenkyuusei") return `${gen}期研究生`;

  return `${gen}期生`;
}

/* =========================
   THEATER STAGE
   POSITION PREDICTION
========================= */

let currentStageData = null;
let adminUnlocked = false;
let adminDraft = null;

/* =========================
   HELPERS & DEFENSIVE CHECKS
========================= */

// 未定義関数によるクラッシュを防止
function formatDate(dateStr) {
  if (!dateStr) return "";
  return dateStr;
}

// STAGE_LISTが未定義の場合のエラーを防止
function getStageList(group) {
  if (typeof STAGE_LIST === "undefined" || !STAGE_LIST) return [];
  return STAGE_LIST[group] || [];
}

/* =========================
   THEATER STAGE INIT
========================= */

async function initTheaterStagePage() {
  const groupSelect = document.getElementById("group-select");
  const stageSelect = document.getElementById("stage-select");

  if (!groupSelect || !stageSelect) return;

  populateStageSelect(groupSelect.value);

  const groupStages = getStageList(groupSelect.value);
  const firstStage = groupStages[0];

  if (firstStage) {
    stageSelect.value = firstStage.file;
    await updateTheaterStagePage(firstStage.file);
  }

  groupSelect.addEventListener("change", async (e) => {
    const group = e.target.value;
    populateStageSelect(group);

    const stages = getStageList(group);
    const first = stages[0];

    if (!first) return;

    stageSelect.value = first.file;
    await updateTheaterStagePage(first.file);
  });

  stageSelect.addEventListener("change", async (e) => {
    await updateTheaterStagePage(e.target.value);
  });

  setupAdmin();
}

/* =========================
   STAGE SELECT
========================= */

function populateStageSelect(group) {
  const stageSelect = document.getElementById("stage-select");
  if (!stageSelect) return;

  stageSelect.innerHTML = "";

  const stages = getStageList(group);
  stages.forEach(stage => {
    const option = document.createElement("option");
    option.value = stage.file;
    option.textContent = stage.name;
    stageSelect.appendChild(option);
  });
}

/* =========================
   STAGE DATA
========================= */

async function updateTheaterStagePage(file) {
  if (!file) return;

  const data = await loadStageData(file);
  currentStageData = loadLocalStageData(file, data);

  renderStageTable(currentStageData);
  setupStageSearch(currentStageData);
  renderPredictionInitial();

  if (adminUnlocked) {
    adminDraft = typeof structuredClone === "function" 
      ? structuredClone(currentStageData)
      : JSON.parse(JSON.stringify(currentStageData));
    renderAdminPanel();
  }
}

/* =========================
   LOAD JSON
========================= */

async function loadStageData(file) {
  try {
    const res = await fetch(`data/stage/${file}.json?t=${Date.now()}`);
    if (!res.ok) {
      throw new Error(`stage load failed: ${file}`);
    }
    const data = await res.json();
    return normalizeStageData(data);
  } catch (error) {
    console.error(error);
    return normalizeStageData({
      group: "",
      stage: "",
      debut: { date: "", members: [] },
      fixedMembers: [],
      positions: []
    });
  }
}

/* =========================
   NORMALIZE
========================= */

function normalizeStageData(data) {
  if (!data || typeof data !== "object") {
    data = {};
  }

  const fixedMembers = Array.isArray(data.fixedMembers) ? [...data.fixedMembers] : [];
  let debut = data.debut || null;

  if (!debut && fixedMembers.length) {
    const first = data.positions?.[0];
    debut = {
      date: first?.date || "",
      members: Array.isArray(first?.members) ? [...first.members] : [...fixedMembers]
    };
  }

  if (!debut) {
    debut = { date: "", members: [] };
  }

  if (!fixedMembers.length && debut.members?.length) {
    data.fixedMembers = [...debut.members];
  }

  return {
    group: data.group || "",
    stage: data.stage || "",
    debut: {
      date: debut.date || "",
      members: Array.isArray(debut.members) ? [...debut.members] : []
    },
    fixedMembers: Array.isArray(data.fixedMembers) ? [...data.fixedMembers] : [...fixedMembers],
    positions: Array.isArray(data.positions) ? [...data.positions] : []
  };
}

/* =========================
   LOCAL STORAGE
========================= */

function getStageStorageKey(file) {
  return `theater-stage-${file}`;
}

function loadLocalStageData(file, originalData) {
  try {
    const saved = localStorage.getItem(getStageStorageKey(file));
    if (!saved) return originalData;

    const parsed = JSON.parse(saved);
    return normalizeStageData(parsed);
  } catch (error) {
    console.error(error);
    return originalData;
  }
}

/* =========================
   HISTORY TABLE
========================= */

function renderStageTable(stageData) {
  const container = document.getElementById("stage-table-container");
  if (!container) return;

  const fixedMembers = stageData.fixedMembers || [];

  let html = `
    <table class="stage-table">
      <thead>
        <tr>
          <th>日付</th>
          ${fixedMembers.map(member => `<th>${escapeHtml(member)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  (stageData.positions || [])
    .slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .forEach(day => {
      const members = Array.isArray(day.members) ? day.members : [];
      html += `
        <tr>
          <td>${formatDate(day.date)}</td>
          ${members.map(member => `
            <td>
              <span class="member">${escapeHtml(member)}</span>
            </td>
          `).join("")}
        </tr>
      `;
    });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

/* =========================
   SEARCH
========================= */

function setupStageSearch(stageData) {
  const input = document.getElementById("stage-search-input");
  if (!input) return;

  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);

  newInput.addEventListener("input", e => {
    const name = e.target.value.trim();

    document.querySelectorAll(".stage-table .member").forEach(el => {
      const td = el.closest("td");
      if (!name) {
        td?.classList.remove("highlight");
        return;
      }

      if (el.textContent.includes(name)) {
        td?.classList.add("highlight");
      } else {
        td?.classList.remove("highlight");
      }
    });

    renderStageAnalysis(stageData, name);
  });
}

/* =========================
   SEARCH ANALYSIS
========================= */

function renderStageAnalysis(stageData, name) {
  const result = document.getElementById("stage-analysis");
  if (!result) return;

  if (!name) {
    result.innerHTML = "";
    return;
  }

  const positionCount = {};

  (stageData.positions || []).forEach(day => {
    (day.members || []).forEach((member, index) => {
      if (member !== name) return;
      const fixed = stageData.fixedMembers?.[index];
      if (!fixed) return;

      positionCount[fixed] = (positionCount[fixed] || 0) + 1;
    });
  });

  const entries = Object.entries(positionCount).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    result.textContent = "出演データがありません。";
    return;
  }

  result.innerHTML = `
    <strong>${escapeHtml(name)}のポジション履歴</strong>
    <br><br>
    ${entries.map(([position, count]) => `
      ${escapeHtml(position)}ポジ：${count}回
    `).join("<br>")}
  `;
}

/* =========================
   INPUT MEMBER PARSER
========================= */

function parseMembers(text) {
  if (!text) return [];
  return [
    ...new Set(
      text
        .split(/[、,・\n\r\t ]+/)
        .map(name => name.trim())
        .filter(Boolean)
    )
  ];
}

/* =========================
   POSITION STATISTICS
========================= */

function buildPositionStatistics(stageData) {
  const stats = {};
  const fixed = stageData.fixedMembers || [];

  fixed.forEach(position => {
    stats[position] = {};
  });

  const debut = stageData.debut?.members || [];
  debut.forEach((member, index) => {
    const position = fixed[index];
    if (!position || !member) return;

    if (!stats[position][member]) {
      stats[position][member] = 0;
    }
    stats[position][member] += 100;
  });

  (stageData.positions || []).forEach(day => {
    (day.members || []).forEach((member, index) => {
      const position = fixed[index];
      if (!position || !member) return;

      if (!stats[position][member]) {
        stats[position][member] = 0;
      }
      stats[position][member] += 1;
    });
  });

  return stats;
}

/* =========================
   MEMBER → POSITION
========================= */

function buildMemberPositionStats(stageData) {
  const result = {};
  const fixed = stageData.fixedMembers || [];

  function add(member, position, score) {
    if (!member || !position) return;
    if (!result[member]) result[member] = {};
    result[member][position] = (result[member][position] || 0) + score;
  }

  const debut = stageData.debut?.members || [];
  debut.forEach((member, index) => {
    add(member, fixed[index], 100);
  });

  (stageData.positions || []).forEach(day => {
    (day.members || []).forEach((member, index) => {
      add(member, fixed[index], 1);
    });
  });

  return result;
}

/* =========================
   POSITION PREDICTION (ブラウザ固まり防止版)
========================= */

function calculatePositionPrediction(stageData, inputText) {
  const inputMembers = parseMembers(inputText);
  const fixed = stageData.fixedMembers || [];

  if (inputMembers.length !== fixed.length) {
    return {
      error: `出演メンバーは${fixed.length}人必要です。現在${inputMembers.length}人です。`
    };
  }

  const memberStats = buildMemberPositionStats(stageData);

  const candidates = inputMembers.map(member => {
    const stats = memberStats[member] || {};
    const list = fixed.map(position => ({
      position,
      score: Number(stats[position] || 0)
    }));

    list.sort((a, b) => b.score - a.score);

    return {
      member,
      candidates: list
    };
  });

  const sorted = [...candidates].sort((a, b) => {
    const aCount = a.candidates.filter(x => x.score > 0).length;
    const bCount = b.candidates.filter(x => x.score > 0).length;
    return aCount - bCount;
  });

  let best = null;
  let searchCount = 0;
  const MAX_SEARCH_LIMIT = 50000; // ブラウザクラッシュを防ぐ上限

  function dfs(index, used, assignment, score) {
    if (searchCount > MAX_SEARCH_LIMIT) return;
    searchCount++;

    if (index === sorted.length) {
      if (!best || score > best.score) {
        best = {
          assignment: { ...assignment },
          score
        };
      }
      return;
    }

    const item = sorted[index];
    const possible = item.candidates.filter(c => !used.has(c.position));
    const positive = possible.filter(c => c.score > 0);
    const choices = positive.length ? positive : possible;

    for (const candidate of choices) {
      used.add(candidate.position);
      assignment[candidate.position] = item.member;

      dfs(index + 1, used, assignment, score + candidate.score);

      delete assignment[candidate.position];
      used.delete(candidate.position);

      // 完全一致等の最適解が見つかった場合は打ち切りも可能
    }
  }

  dfs(0, new Set(), {}, 0);

  if (!best) {
    return {
      error: "ポジションを割り当てられる組み合わせが見つかりませんでした。"
    };
  }

  const rows = fixed.map(position => {
    const member = best.assignment[position];
    const stats = memberStats[member] || {};
    const ranking = Object.entries(stats).sort((a, b) => b[1] - a[1]);

    return {
      position,
      member,
      candidates: ranking.map(([pos, score]) => ({ position: pos, score }))
    };
  });

  return {
    inputMembers,
    rows,
    score: best.score
  };
}

/* =========================
   PREDICTION RENDER
========================= */

function renderPrediction(prediction) {
  const result = document.getElementById("result");
  const summary = document.getElementById("prediction-summary");

  if (!result) return;

  if (prediction.error) {
    result.innerHTML = `
      <div class="prediction-error">
        ${escapeHtml(prediction.error)}
      </div>
    `;
    if (summary) summary.innerHTML = "";
    return;
  }

  if (summary) {
    summary.innerHTML = `
      <div class="prediction-summary-box">
        <strong>予想結果</strong>
        <span>過去データに基づいて自動割り当てしました</span>
      </div>
    `;
  }

  let html = `
    <div class="prediction-scroll">
      <table class="stage-table prediction">
        <thead>
          <tr>
            <th>ポジション</th>
            <th>予想メンバー</th>
          </tr>
        </thead>
        <tbody>
  `;

  (prediction.rows || []).forEach(row => {
    html += `
      <tr>
        <td>${escapeHtml(row.position)}</td>
        <td>
          <span class="member prediction-member">
            ${escapeHtml(row.member)}
          </span>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  result.innerHTML = html;
}

/* =========================
   PREDICTION INITIAL
========================= */

function renderPredictionInitial() {
  const result = document.getElementById("result");
  const summary = document.getElementById("prediction-summary");

  if (result) {
    result.innerHTML = `
      <div class="prediction-placeholder">
        出演メンバーを入力すると、過去のポジションデータから予想します。
      </div>
    `;
  }

  if (summary) {
    summary.innerHTML = "";
  }
}

/* =========================
   ADMIN
========================= */

function setupAdmin() {
  const button = document.getElementById("admin-edit-btn");
  if (!button) return;

  button.addEventListener("click", () => {
    if (!adminUnlocked) {
      const password = prompt("管理者パスワードを入力してください");
      if (password !== "CHANGE_THIS_PASSWORD") {
        alert("パスワードが違います。");
        return;
      }
      adminUnlocked = true;
      button.textContent = "🔓 管理者モード ON";
    }

    const panel = document.getElementById("admin-panel");
    if (!panel) return;

    panel.hidden = !panel.hidden;

    if (!panel.hidden && currentStageData) {
      adminDraft = typeof structuredClone === "function" 
        ? structuredClone(currentStageData)
        : JSON.parse(JSON.stringify(currentStageData));
      renderAdminPanel();
    }
  });

  document.getElementById("save-admin-btn")?.addEventListener("click", saveAdminData);
  document.getElementById("export-json-btn")?.addEventListener("click", exportStageJson);
  document.getElementById("add-performance-btn")?.addEventListener("click", addPerformance);
}

/* =========================
   ADMIN PANEL
========================= */

function renderAdminPanel() {
  if (!adminDraft) return;

  const debutInput = document.getElementById("debut-members-input");
  if (debutInput) {
    debutInput.value = adminDraft.debut?.members?.join("、") || "";
  }

  renderDebutPositionEditor();
  renderAdminHistory();
}

/* =========================
   DEBUT POSITION EDITOR
========================= */

function renderDebutPositionEditor() {
  const container = document.getElementById("debut-position-editor");
  if (!container || !adminDraft) return;

  if (!adminDraft.debut) adminDraft.debut = { date: "", members: [] };

  const fixed = adminDraft.fixedMembers || [];
  const debut = adminDraft.debut.members || [];

  let html = "";

  fixed.forEach((position, index) => {
    const selected = debut[index] || "";
    html += `
      <div class="position-editor-row">
        <span class="position-number">${index + 1}</span>
        <span class="position-name">${escapeHtml(position)}</span>
        <select class="debut-member-select" data-index="${index}">
          ${debut.map(member => `
            <option value="${escapeAttr(member)}" ${member === selected ? "selected" : ""}>
              ${escapeHtml(member)}
            </option>
          `).join("")}
        </select>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll(".debut-member-select").forEach(select => {
    select.addEventListener("change", e => {
      const index = Number(e.target.dataset.index);
      if (adminDraft.debut.members) {
        adminDraft.debut.members[index] = e.target.value;
      }
    });
  });
}

/* =========================
   ADMIN HISTORY
========================= */

function renderAdminHistory() {
  const container = document.getElementById("admin-history-list");
  if (!container || !adminDraft) return;

  const positions = adminDraft.positions || [];

  if (!positions.length) {
    container.innerHTML = "<p>登録された公演はありません。</p>";
    return;
  }

  container.innerHTML = positions
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map(day => `
      <div class="admin-history-item">
        <strong>${formatDate(day.date)}</strong>
        <span>${Array.isArray(day.members) ? day.members.length : 0}人</span>
        <button class="delete-performance" data-date="${escapeAttr(day.date)}">削除</button>
      </div>
    `)
    .join("");

  container.querySelectorAll(".delete-performance").forEach(button => {
    button.addEventListener("click", () => {
      const date = button.dataset.date;
      if (!confirm(`${date}の公演データを削除しますか？`)) return;

      adminDraft.positions = (adminDraft.positions || []).filter(day => day.date !== date);
      renderAdminHistory();
    });
  });
}

/* =========================
   ADD PERFORMANCE
========================= */

function addPerformance() {
  if (!adminDraft) return;

  const dateInput = document.getElementById("performance-date");
  const membersInput = document.getElementById("performance-members-input");

  const date = dateInput?.value;
  const text = membersInput?.value || "";

  const members = parseMembers(text);
  const required = (adminDraft.fixedMembers || []).length;

  if (!date) {
    alert("公演日を入力してください。");
    return;
  }

  if (members.length !== required) {
    alert(`${required}人入力してください。\n現在${members.length}人です。`);
    return;
  }

  if (!Array.isArray(adminDraft.positions)) {
    adminDraft.positions = [];
  }

  const existing = adminDraft.positions.find(day => day.date === date);

  if (existing) {
    if (!confirm("同じ日付の公演が存在します。上書きしますか？")) return;
    existing.members = members;
  } else {
    adminDraft.positions.push({ date, members });
  }

  adminDraft.positions.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (dateInput) dateInput.value = "";
  if (membersInput) membersInput.value = "";

  renderAdminHistory();
  showAdminMessage("公演データを追加しました。");
}

/* =========================
   SAVE ADMIN DATA
========================= */

function saveAdminData() {
  if (!adminDraft) return;

  const debutText = document.getElementById("debut-members-input")?.value || "";
  const debutMembers = parseMembers(debutText);
  const required = (adminDraft.fixedMembers || []).length;

  if (debutMembers.length !== required) {
    alert(`初日メンバーは${required}人必要です。\n現在${debutMembers.length}人です。`);
    return;
  }

  if (!adminDraft.debut) adminDraft.debut = { date: "", members: [] };
  adminDraft.debut.members = debutMembers;

  const debutDate = adminDraft.debut.date;
  if (!Array.isArray(adminDraft.positions)) adminDraft.positions = [];

  if (debutDate) {
    const existing = adminDraft.positions.find(day => day.date === debutDate);
    if (existing) {
      existing.members = [...debutMembers];
    } else {
      adminDraft.positions.unshift({
        date: debutDate,
        members: [...debutMembers]
      });
    }
  }

  currentStageData = normalizeStageData(adminDraft);

  const file = document.getElementById("stage-select")?.value;
  if (!file) return;

  localStorage.setItem(
    getStageStorageKey(file),
    JSON.stringify(currentStageData, null, 2)
  );

  renderStageTable(currentStageData);
  setupStageSearch(currentStageData);
  showAdminMessage("保存しました。この端末のブラウザに保存されています。");
}

/* =========================
   EXPORT JSON
========================= */

function exportStageJson() {
  if (!currentStageData) return;

  const file = document.getElementById("stage-select")?.value || "stage-data";
  const blob = new Blob([JSON.stringify(currentStageData, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${file}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showAdminMessage("JSONを書き出しました。");
}

/* =========================
   ADMIN MESSAGE
========================= */

function showAdminMessage(message) {
  const el = document.getElementById("admin-message");
  if (!el) return;

  el.textContent = message;
  setTimeout(() => {
    el.textContent = "";
  }, 4000);
}

/* =========================
   PREDICTION BUTTON
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("assign-btn");

  btn?.addEventListener("click", () => {
    if (!currentStageData) {
      alert("演目を選択してください。");
      return;
    }

    const text = document.getElementById("member-input")?.value || "";
    const prediction = calculatePositionPrediction(currentStageData, text);

    renderPrediction(prediction);
  });
});

/* =========================
   ESCAPE
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}


/* =========================
   BIRTHDAYS
========================= */

function initBirthdaysPage() {
  // 必要なら実装
}
