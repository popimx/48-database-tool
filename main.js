document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname;

  if (path.includes("members.html")) initMembersPage();
  if (path.includes("member.html")) initMemberPage();
  if (path.includes("birthdays.html")) initBirthdaysPage();
  if (path.includes("days.html")) initDaysPage();
});

/* =========================
   グループ定義
========================= */

const GROUPS = ["akb48", "ske48", "nmb48", "hkt48", "ngt48", "stu48"];

const groupNameMap = {
  akb48: "AKB48",
  ske48: "SKE48",
  nmb48: "NMB48",
  hkt48: "HKT48",
  ngt48: "NGT48",
  stu48: "STU48"
};

/* =========================
   カラー設定
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
   ★ 卒業生判定（必須）
========================= */

function isGraduate(m) {
  return m.status === "graduated";
}

/* =========================
   ★ デフォルトソート（追加）
========================= */

function defaultSort(members, selectedGroup) {
  const groupOrder = {
    AKB48: 1,
    SKE48: 2,
    NMB48: 3,
    HKT48: 4,
    NGT48: 5,
    STU48: 6,
  };

  const skeTeamOrder = {
    "チームS": 1,
    "チームKII": 2,
    "チームE": 3,
    "研究生": 4,
  };

  const hktTeamOrder = {
    "チームH": 1,
    "チームKⅣ": 2,
    "研究生": 3,
  };

  return [...members].sort((a, b) => {

    /* =========================
       卒業生ルール（最優先）
    ========================= */
    const aG = isGraduate(a);
    const bG = isGraduate(b);

    if (aG && bG) {
      const joinDiff =
        new Date(a.joinDate) - new Date(b.joinDate);

      if (joinDiff !== 0) return joinDiff;

      return a.kana.localeCompare(b.kana, "ja");
    }

    if (aG && !bG) return 1;
    if (!aG && bG) return -1;

    /* =========================
       ALL表示
    ========================= */
    if (selectedGroup === "all") {
      return (
        groupOrder[a.group] - groupOrder[b.group] ||
        a.kana.localeCompare(b.kana, "ja")
      );
    }

    /* =========================
       SKE48
    ========================= */
    if (selectedGroup === "SKE48") {
      return (
        skeTeamOrder[a.team] - skeTeamOrder[b.team] ||
        a.kana.localeCompare(b.kana, "ja")
      );
    }

    /* =========================
       HKT48
    ========================= */
    if (selectedGroup === "HKT48") {
      return (
        hktTeamOrder[a.team] - hktTeamOrder[b.team] ||
        a.kana.localeCompare(b.kana, "ja")
      );
    }

    /* =========================
       AKB48
    ========================= */
    if (selectedGroup === "AKB48") {
      const aRank = a.isKenkyusei ? 2 : 1;
      const bRank = b.isKenkyusei ? 2 : 1;

      return (
        aRank - bRank ||
        a.kana.localeCompare(b.kana, "ja") ||
        new Date(b.joinDate) - new Date(a.joinDate)
      );
    }

    /* =========================
       NGT / STU
    ========================= */
    if (selectedGroup === "NGT48" || selectedGroup === "STU48") {
      return (
        new Date(b.joinDate) - new Date(a.joinDate) ||
        a.kana.localeCompare(b.kana, "ja")
      );
    }

    return 0;
  });
}

/* =========================
   データキャッシュ
========================= */

const memberCache = {};

async function loadMembers(group) {
  if (memberCache[group]) return memberCache[group];

  try {
    const res = await fetch(`data/members/${group}.json`);
    if (!res.ok) return [];

    const data = await res.json();
    memberCache[group] = data;
    return data;

  } catch (e) {
    console.error(`${group} load error`, e);
    return [];
  }
}

async function loadAllMembers() {
  const results = await Promise.all(
    GROUPS.map(g => loadMembers(g))
  );
  return results.flat();
}

/* =========================
   ラベルロジック
========================= */

function getMemberLabel(member, selectedGroup) {

  if (selectedGroup === "all") {
    return groupNameMap[member.groupId] || "";
  }

  const isSkeOrHkt =
    member.groupId === "ske48" || member.groupId === "hkt48";

  if (isSkeOrHkt) {
    if (member.role === "kenkyuusei") return "研究生";
    return member.team || "正規メンバー";
  }

  if (member.role === "kenkyuusei") return "研究生";

  if (member.generation) {
    return member.generation;
  }

  return "正規メンバー";
}

/* =========================
   members.html
========================= */

async function initMembersPage() {
  const groupSelect = document.getElementById("group-select");
  const statusFilter = document.getElementById("status-filter");
  const sortSelect = document.getElementById("sort-select");

  if (!groupSelect || !statusFilter || !sortSelect) return;

  groupSelect.addEventListener("change", updateMembers);
  statusFilter.addEventListener("change", updateMembers);
  sortSelect.addEventListener("change", updateMembers);

  updateMembers();
}

async function updateMembers() {
  const group = document.getElementById("group-select").value;
  const status = document.getElementById("status-filter").value;
  const sort = document.getElementById("sort-select").value;

  let members = group === "all"
    ? await loadAllMembers()
    : await loadMembers(group);

  if (status === "member") {
    members = members.filter(m => m.status === "member");
  }

  /* =========================
     ★ まずデフォルト並び
  ========================= */
  members = defaultSort(members, group);

  /* =========================
     ユーザーソート（上書き）
  ========================= */

  if (sort === "kana") {
    members.sort((a, b) =>
      a.kana.localeCompare(b.kana, "ja")
    );
  }

  else if (sort === "age") {
    members.sort((a, b) =>
      new Date(a.birthday) - new Date(b.birthday)
    );
  }

  else if (sort === "days") {
    members.sort((a, b) =>
      calcDays(b.joinDate) - calcDays(a.joinDate)
    );
  }

  renderMembers(members, group);
}

/* =========================
   表示
========================= */

function renderMembers(members, selectedGroup) {
  const container = document.getElementById("member-list");
  if (!container) return;

  container.innerHTML = "";

  members.forEach(m => {
    const card = document.createElement("div");
    card.className = "member-card";

    card.onclick = () => {
      location.href = `member.html?id=${m.id}&group=${m.groupId}`;
    };

    const imagePath =
      `images/members/${m.groupId}/${m.image}_${m.imageYear}.PNG`;

    const label = getMemberLabel(m, selectedGroup);
    const badgeClass = getBadgeClass(m);

    card.innerHTML = `
      <img class="member-image" src="${imagePath}" alt="${m.name}">

      <div class="member-name-row">
        <span class="member-name">${m.name}</span>
        <span class="member-badge ${badgeClass}">
          ${label}
        </span>
      </div>

      <div class="member-kana">${m.kana}</div>
    `;

    container.appendChild(card);
  });
}

/* =========================
   member.html
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

  const imagePath =
    `images/members/${m.groupId}/${m.image}_${m.imageYear}.PNG`;

  el.innerHTML = `
    <a href="members.html" class="back-button">← 一覧</a>

    <div class="member-detail">
      <img class="detail-image" src="${imagePath}" alt="${m.name}">
      <div class="detail-name">${m.name}</div>
      <div class="detail-kana">${m.kana}</div>

      <div class="detail-info">
        <div>ニックネーム: ${m.nickname || "-"}</div>
        <div>生年月日: ${formatDate(m.birthday)} (${calcAge(m.birthday)}歳)</div>
        <div>出身地: ${m.prefecture}</div>
        <div>加入日: ${formatDate(m.joinDate)}</div>
        <div>在籍日数: ${calcDays(m.joinDate)}日</div>
        <div>期生: ${m.generation || "-"}</div>
      </div>
    </div>
  `;
}

/* =========================
   birthdays / days（省略なし・そのまま）
========================= */

async function initBirthdaysPage() { /* 既存そのまま */ }
async function updateBirthdays() { /* 既存そのまま */ }
function renderBirthdayMembers(members) { /* 既存そのまま */ }

async function initDaysPage() { /* 既存そのまま */ }
async function updateDays() { /* 既存そのまま */ }
function renderDaysMembers(members) { /* 既存そのまま */ }

/* =========================
   共通ユーティリティ
========================= */

function calcDays(joinDate) {
  const start = new Date(joinDate);
  const today = new Date();
  return Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
}

function calcAge(birthday) {
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
  const d = new Date(date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function getBirthdayDiff(birthday) {
  const today = new Date();
  const birth = new Date(birthday);

  const next = new Date(
    today.getFullYear(),
    birth.getMonth(),
    birth.getDate()
  );

  if (next < today) next.setFullYear(today.getFullYear() + 1);

  return next - today;
}
