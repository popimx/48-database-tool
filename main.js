import { GENERATION_ORDER_MAP } from "./config/generationOrder.js";
import { GENERATION_MEMBER_ORDER } from "./config/generationMemberOrder.js";
import { STAGE_LIST } from "./config/stageList.js";

document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname;

  if (path.includes("members.html")) initMembersPage();
  if (path.includes("member.html")) initMemberPage();
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
      sub = `在籍 ${calcDays(m.joinDate)}日`;
    } else {
      sub = m.kana || "";
    }

    const card = document.createElement("div");
    card.className = "member-card";

    card.onclick = () => {
      location.href = `member.html?id=${m.id}&group=${m.groupId}`;
    };

    card.innerHTML = `
      <img class="member-image"
        src="${img.png}"
        onerror="this.onerror=null;this.src='${img.jpeg}'">

      <div class="member-name-row">
        <span class="member-name">${m.name}</span>
        <span class="member-badge ${getBadgeClass(m)}">${label}</span>
      </div>

      <div class="member-kana">${sub}</div>
    `;

    container.appendChild(card);
  });
}

/* =========================
   MEMBER PAGE
========================= */

async function initMemberPage() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const group = params.get("group");

  if (!id || !group) return;

  const members = await loadMembers(group);
  const member = members.find(m => m.id === id);

  if (member) renderMember(member);
}

function renderMember(m) {
  const el = document.getElementById("member-detail");
  if (!el) return;

  const img = getImagePath(m);

  el.innerHTML = `
    <a href="members.html" class="back-button">← 一覧</a>

    <div class="member-detail">
      <img class="detail-image"
        src="${img.png}"
        onerror="this.onerror=null;this.src='${img.jpeg}'">

      <div class="detail-name">${m.name}</div>
      <div class="detail-kana">${m.kana || ""}</div>

      <div class="detail-info">
        <div>ニックネーム: ${m.nickname || "-"}</div>
        <div>生年月日: ${formatDate(m.birthday)} (${calcAge(m.birthday)}歳)</div>
        <div>出身地: ${m.prefecture || "-"}</div>
        <div>加入日: ${formatDate(m.joinDate)}</div>
        <div>在籍日数: ${calcDays(m.joinDate)}日</div>
        <div>期生: ${formatGenerationClean(m)}</div>
      </div>
    </div>
  `;
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

    card.onclick = () => {
      location.href = `member.html?id=${m.id}&group=${m.groupId}`;
    };

    card.innerHTML = `
      <img class="member-image"
        src="${img.png}"
        onerror="this.onerror=null;this.src='${img.jpeg}'">

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
   THEATER STAGE INIT
========================= */

async function initTheaterStagePage() {
  const groupSelect = document.getElementById("group-select");
  const stageSelect = document.getElementById("stage-select");

  if (!groupSelect || !stageSelect) return;

  populateStageSelect(groupSelect.value);

  const firstStage = STAGE_LIST[groupSelect.value]?.[0];

  if (firstStage) {
    stageSelect.value = firstStage.file;
    await updateTheaterStagePage(firstStage.file);
  }

  groupSelect.addEventListener("change", async (e) => {
    const group = e.target.value;

    populateStageSelect(group);

    const firstStage = STAGE_LIST[group]?.[0];

    if (!firstStage) return;

    stageSelect.value = firstStage.file;

    await updateTheaterStagePage(firstStage.file);
  });

  stageSelect.addEventListener("change", async (e) => {
    await updateTheaterStagePage(e.target.value);
  });
}

/* =========================
   STAGE SELECT
========================= */

function populateStageSelect(group) {
  const stageSelect = document.getElementById("stage-select");

  if (!stageSelect) return;

  stageSelect.innerHTML = "";

  (STAGE_LIST[group] || []).forEach((stage) => {
    const option = document.createElement("option");

    option.value = stage.file;
    option.textContent = stage.name;

    stageSelect.appendChild(option);
  });
}

/* =========================
   THEATER STAGE MAIN UPDATE
========================= */

async function updateTheaterStagePage(file) {

  const elTable = document.getElementById("stage-table-container");

  if (!elTable) return;

  const stageData = await loadStageData(file);

  renderStageTable(stageData);

  setupStageSearch(stageData);

}

/* =========================
   THEATER STAGE DATA LOADER
========================= */

async function loadStageData(file) {
  const res = await fetch(`data/stage/${file}.json`);

  if (!res.ok) {
    console.error(`stage load failed: ${file}`);

    return {
      stage: "未設定",
      fixedMembers: [],
      positions: []
    };
  }

  return await res.json();
}

/* =========================
   FIXED POSITION TABLE
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
          ${fixedMembers.map(member => `
            <th>${member}</th>
          `).join("")}
        </tr>
      </thead>
      <tbody>
  `;

  stageData.positions.forEach(day => {
    html += `
      <tr>
        <td>${formatDate(day.date)}</td>

        ${day.members.map(member => `
          <td>
            <span class="member">
              ${member}
            </span>
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
   THEATER STAGE / POSITION PREDICTION (ENHANCED)
========================= */

function calculatePositionPrediction(stageData, inputText) {
  const fixedMembers = stageData.fixedMembers || [];
  const positions = stageData.positions || [];

  // ① 入力メンバー配列化
  const inputMembers = inputText
    .split(/[・、\n\s]+/)
    .map(s => s.trim())
    .filter(Boolean);

  // ② ポジション別統計
  const positionStats = {};

  // 全体出現回数（未経験検出用）
  const globalStats = {};

  positions.forEach(day => {
    day.members.forEach((member, index) => {
      const fixed = fixedMembers[index];
      if (!fixed) return;

      if (!positionStats[fixed]) {
        positionStats[fixed] = {};
      }

      positionStats[fixed][member] =
        (positionStats[fixed][member] || 0) + 1;

      globalStats[member] =
        (globalStats[member] || 0) + 1;
    });
  });

  // ③ 未経験メンバー検出
  const unknownMembers = inputMembers.filter(m => !globalStats[m]);

  // ④ ポジションごとの「空き度・経験多様性」分析
  const positionAnalysis = fixedMembers.map(fixed => {
    const members = positionStats[fixed] || {};
    const total = Object.values(members).reduce((a, b) => a + b, 0);

    const uniqueMembers = Object.keys(members);

    const inputHits = uniqueMembers.filter(m =>
      inputMembers.includes(m)
    );

    const diversity = uniqueMembers.length;

    return {
      fixed,
      diversity,                     // 何人経験しているか
      totalAppearances: total,       // 総出演回数
      inputCoverage: inputHits.length, // 入力メンバーがどれだけ入ってるか
      opennessScore: 1 / (diversity + 1), // 空き度（小さいほど激戦）
      isVacant: diversity <= 1,      // ほぼ固定 or 空き枠
      topCandidates: Object.entries(members)
        .filter(([name]) => inputMembers.includes(name))
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count
        }))
    };
  });

  // ⑤ 未経験でも入りやすいポジションランキング
  const openPositionRanking = [...positionAnalysis]
    .sort((a, b) => {
      if (a.isVacant !== b.isVacant) return b.isVacant - a.isVacant;
      return b.opennessScore - a.opennessScore;
    });

  // ⑥ 表データ（従来互換 + 拡張情報）
  const result = fixedMembers.map(fixed => {
    const analysis = positionAnalysis.find(p => p.fixed === fixed);

    return {
      fixed,
      candidates: analysis.topCandidates,
      stats: {
        diversity: analysis.diversity,
        totalAppearances: analysis.totalAppearances,
        opennessScore: analysis.opennessScore,
        isVacant: analysis.isVacant
      }
    };
  });

  // ⑦ 最終返却（全部入り）
  return {
    table: result,
    analysis: {
      openPositionRanking,
      unknownMembers,
      mostOpenPositions: openPositionRanking.slice(0, 3),
      mostCompetitivePositions: [...openPositionRanking]
        .sort((a, b) => a.opennessScore - b.opennessScore)
        .slice(0, 3)
    }
  };
}

// =========================
// THEATER STAGE POSITION grouping（完全安定版）
// =========================

// 位置予測テーブル描画（stage-table形式）
function renderPredictionTable(prediction) {
  const el = document.getElementById("result");
  if (!el) return;

  const fixedMembers = prediction.map(p => p.fixed);

  // 最大ランキング深さ
  const maxRows = Math.max(
    ...prediction.map(p => p.candidates.length)
  );

  let html = `
    <div class="prediction-scroll">
      <table class="stage-table prediction">
        <thead>
          <tr>
            <th>順位</th>
            ${fixedMembers.map(m => `<th>${m}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
  `;

  for (let i = 0; i < maxRows; i++) {
    html += `
      <tr>
        <td>${i + 1}</td>
        ${prediction.map(p => {
          const c = p.candidates[i];
          return `
            <td>
              <span class="member">
                ${c ? c.name : ""}
              </span>
            </td>
          `;
        }).join("")}
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  el.innerHTML = html;
}


// 予測ボタンイベント
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("assign-btn");

  btn?.addEventListener("click", async () => {
    const text = document.getElementById("member-input").value;

    const group = document.getElementById("group-select")?.value;
    const file = document.getElementById("stage-select")?.value;

    if (!group || !file) return;

    // ★ここが変更ポイント（グループ付きファイル名）
    const stageData = await loadStageData(file);

    const prediction = calculatePositionPrediction(stageData, text);

    renderPredictionTable(prediction);
  });
});

/* =========================
   THEATER STAGE SEARCH + ANALYSIS
========================= */

function setupStageSearch(stageData) {
  const input = document.getElementById("stage-search-input");

  if (!input) return;

  const newInput = input.cloneNode(true);

  input.parentNode.replaceChild(newInput, input);

  newInput.addEventListener("input", (e) => {
    const name = e.target.value.trim();

    document.querySelectorAll(".member").forEach((el) => {

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

    const result = document.getElementById("stage-analysis");

    if (!result) return;

    if (!name) {
      result.textContent = "";
      return;
    }

    const positionCount = {};

    stageData.positions.forEach((day) => {
      day.members.forEach((member, index) => {
        if (member === name) {
          const fixedMember = stageData.fixedMembers[index];

          positionCount[fixedMember] =
            (positionCount[fixedMember] || 0) + 1;
        }
      });
    });

    const entries = Object.entries(positionCount);

    if (!entries.length) {
      result.textContent = "出演データがありません。";
      return;
    }

    result.innerHTML = entries
      .map(([fixedMember, count]) =>
        `${fixedMember}ポジ : ${count}回`
      )
      .join("<br>");
  });
}

/* =========================
   BIRTHDAYS
========================= */

function initBirthdaysPage() {
  // 必要なら実装
}
