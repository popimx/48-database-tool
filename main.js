document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname;

  if (path.includes("members.html")) initMembersPage();
  if (path.includes("member.html")) initMemberPage();
  if (path.includes("birthdays.html")) initBirthdaysPage();
  if (path.includes("days.html")) initDaysPage();
});

/* =========================
   グループ
========================= */

const GROUPS = ["akb48", "ske48", "nmb48", "hkt48", "ngt48", "stu48"];

const GROUP_ORDER = ["akb48", "ske48", "nmb48", "hkt48", "ngt48", "stu48"];

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

/* =========================
   データ
========================= */

async function loadMembers(group) {
  const url = `data/members/${group}.json?t=${Date.now()}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    console.error("LOAD FAILED:", group);
    return [];
  }

  const data = await res.json();

  console.log(`LOADED ${group}:`, data.length);

  memberCache[group] = data;
  return data;
}

async function loadAllMembers() {
  const all = await Promise.all(GROUPS.map(loadMembers));
  return all.flat();
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
   ラベル（★修正版）
========================= */

function getMemberLabel(member, selectedGroup, sortMode) {

  const isTeam8Member = isTeam8(member);

  /* =====================
     在籍日数だけ特別ルール
  ===================== */
  if (sortMode === "days") {
    if (isTeam8Member) return "チーム8";
    return `${member.generation}生`;
  }

  /* =====================
     その他ソート
  ===================== */

  const isNormalMember =
    member.role !== "kenkyuusei" && !isTeam8Member;

  if (isTeam8Member) {
    if (selectedGroup === "all") return "AKB48";
    return "正規メンバー";
  }

  if (member.role === "kenkyuusei") {
    if (selectedGroup === "all") return groupNameMap[member.groupId];
    return `${member.generation}研究生`;
  }

  return "正規メンバー";
}

/* =========================
   INIT MEMBERS
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

  let members = group === "all"
    ? await loadAllMembers()
    : await loadMembers(group);

  if (status === "member") {
    members = members.filter(m => m.status === "member");
  }

  if (sort === "default") members.sort(globalDefaultSort);

  else if (sort === "kana")
    members.sort((a, b) =>
      (a.kana || "").localeCompare(b.kana || "", "ja")
    );

  else if (sort === "birthday")
    members.sort((a, b) =>
      (a.birthday || "").slice(5).localeCompare((b.birthday || "").slice(5))
    );

  else if (sort === "nearestBirthday")
    members.sort((a, b) =>
      getNextBirthday(a.birthday) - getNextBirthday(b.birthday)
    );

  else if (sort === "age")
    members.sort((a, b) =>
      new Date(a.birthday) - new Date(b.birthday)
    );

  else if (sort === "days")
    members.sort((a, b) => {
      const daysDiff = calcDays(b.joinDate) - calcDays(a.joinDate);
      if (daysDiff !== 0) return daysDiff;

      const groupDiff =
        GROUP_ORDER.indexOf(a.groupId) -
        GROUP_ORDER.indexOf(b.groupId);

      if (groupDiff !== 0) return groupDiff;

      return (a.kana || "").localeCompare(b.kana || "", "ja");
    });

  renderMembers(members, group, sort);
}

/* =========================
   AKBランク
========================= */

function akbRank(m) {
  const gen = String(m.generation || "");
  for (let i = 0; i < AKB_ORDER.length; i++) {
    if (gen.includes(AKB_ORDER[i])) return i;
  }
  return 999;
}

/* =========================
   NMBランク
========================= */

function nmbRank(m) {
  if (m.role !== "kenkyuusei") return 1;

  const gen = String(m.generation || "");
  if (gen.includes("10")) return 2;
  if (gen.includes("11")) return 3;

  return 4;
}

/* =========================
   全体ソート
========================= */

function globalDefaultSort(a, b) {

  const groupDiff =
    GROUP_ORDER.indexOf(a.groupId) -
    GROUP_ORDER.indexOf(b.groupId);

  if (groupDiff !== 0) return groupDiff;

  if (a.groupId === "akb48" && b.groupId === "akb48") {
    const r = akbRank(a) - akbRank(b);
    if (r !== 0) return r;
  }

  if (a.groupId === "nmb48" && b.groupId === "nmb48") {
    const r = nmbRank(a) - nmbRank(b);
    if (r !== 0) return r;
  }

  const aKey = a.role === "kenkyuusei" ? 2 : 1;
  const bKey = b.role === "kenkyuusei" ? 2 : 1;

  if (aKey !== bKey) return aKey - bKey;

  return (a.kana || "").localeCompare(b.kana || "", "ja");
}

/* =========================
   RENDER
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

  if (member) renderMember(member); // ★修正済み
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
   DAYS / BIRTHDAY
========================= */

function getNextBirthday(date) {
  const today = new Date();
  const birth = new Date(date);

  let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);

  return next;
}

async function initDaysPage() {
  document.getElementById("group-select")?.addEventListener("change", updateDays);
  document.getElementById("status-filter")?.addEventListener("change", updateDays);
  updateDays();
}

async function updateDays() {

  const group = document.getElementById("group-select")?.value || "all";
  const status = document.getElementById("status-filter")?.value || "all";

  let members = group === "all"
    ? await loadAllMembers()
    : await loadMembers(group);

  if (status === "member") {
    members = members.filter(m => m.status === "member");
  }

  members.sort((a, b) => {
    const daysDiff = calcDays(b.joinDate) - calcDays(a.joinDate);
    if (daysDiff !== 0) return daysDiff;

    const groupDiff =
      GROUP_ORDER.indexOf(a.groupId) -
      GROUP_ORDER.indexOf(b.groupId);

    if (groupDiff !== 0) return groupDiff;

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
  return Math.floor((new Date() - new Date(joinDate)) / 86400000) + 1;
}

function calcAge(birthday) {
  if (!birthday) return "-";

  const today = new Date();
  const birth = new Date(birthday);

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

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
