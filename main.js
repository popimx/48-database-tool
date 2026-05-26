document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname;

  if (path.includes("members.html")) initMembersPage();
  if (path.includes("member.html")) initMemberPage();
  if (path.includes("birthdays.html")) initBirthdaysPage();
  if (path.includes("days.html")) initDaysPage();
});

const GROUPS = ["akb48", "ske48", "nmb48", "hkt48", "ngt48", "stu48"];

const groupNameMap = {
  akb48: "AKB48",
  ske48: "SKE48",
  nmb48: "NMB48",
  hkt48: "HKT48",
  ngt48: "NGT48",
  stu48: "STU48"
};

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
   表示ラベル（超重要）
========================= */
function getMemberLabel(member, selectedGroup) {

  // ALL表示 → グループ名
  if (selectedGroup === "all") {
    return groupNameMap[member.groupId] || "";
  }

  // SKE（チーム制）
  if (member.groupId === "ske48") {
    return member.team || "研究生";
  }

  // その他グループ
  if (member.role === "regular") return "正規メンバー";
  if (member.role === "kenkyuusei") return "研究生";

  return "メンバー";
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

  let members = [];

  if (group === "all") {
    members = await loadAllMembers();
  } else {
    members = await loadMembers(group);
  }

  // status filter
  if (status === "member") {
    members = members.filter(m => m.status === "member");
  }

  // sort
  if (sort === "kana") {
    members.sort((a, b) => a.kana.localeCompare(b.kana, "ja"));
  }

  else if (sort === "age") {
    members.sort((a, b) => new Date(a.birthday) - new Date(b.birthday));
  }

  else if (sort === "days") {
    members.sort((a, b) => calcDays(b.joinDate) - calcDays(a.joinDate));
  }

  renderMembers(members, group);
}

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

    card.innerHTML = `
      <img class="member-image" src="${imagePath}" alt="${m.name}">
      <div class="member-name">${m.name}</div>
      <div class="member-kana">${m.kana}</div>
      <div class="member-label">${getMemberLabel(m, selectedGroup)}</div>
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

/* =========================
   共通ユーティリティ
========================= */
function calcDays(joinDate) {
  const start = new Date(joinDate);
  const today = new Date();

  const diff = Math.floor(
    (today - start) / (1000 * 60 * 60 * 24)
  );

  return diff + 1;
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

/* =========================
   detail
========================= */
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
        <div>期生: ${m.generation}</div>
      </div>
    </div>
  `;
}

/* =========================
   birthdays
========================= */
async function initBirthdaysPage() {
  const groupSelect = document.getElementById("group-select");
  const statusFilter = document.getElementById("status-filter");
  const sortSelect = document.getElementById("birthday-sort");

  if (!groupSelect || !statusFilter || !sortSelect) return;

  groupSelect.addEventListener("change", updateBirthdays);
  statusFilter.addEventListener("change", updateBirthdays);
  sortSelect.addEventListener("change", updateBirthdays);

  updateBirthdays();
}

async function updateBirthdays() {
  const group = document.getElementById("group-select").value;
  const status = document.getElementById("status-filter").value;
  const sort = document.getElementById("birthday-sort").value;

  let members = group === "all"
    ? await loadAllMembers()
    : await loadMembers(group);

  if (status === "member") {
    members = members.filter(m => m.status === "member");
  }

  if (sort === "calendar") {
    members.sort((a, b) => {
      const av = new Date(a.birthday);
      const bv = new Date(b.birthday);
      return (av.getMonth() + 1) * 100 + av.getDate()
           - (bv.getMonth() + 1) * 100 - bv.getDate();
    });
  } else {
    members.sort((a, b) =>
      getBirthdayDiff(a.birthday) - getBirthdayDiff(b.birthday)
    );
  }

  renderBirthdayMembers(members);
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

function renderBirthdayMembers(members) {
  const container = document.getElementById("birthday-list");
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

    card.innerHTML = `
      <img class="member-image" src="${imagePath}">
      <div class="member-name">${m.name}</div>
      <div class="member-kana">${formatDate(m.birthday)} (${calcAge(m.birthday)}歳)</div>
    `;

    container.appendChild(card);
  });
}

/* =========================
   days
========================= */
async function initDaysPage() {
  const groupSelect = document.getElementById("group-select");
  const statusFilter = document.getElementById("status-filter");

  if (!groupSelect || !statusFilter) return;

  groupSelect.addEventListener("change", updateDays);
  statusFilter.addEventListener("change", updateDays);

  updateDays();
}

async function updateDays() {
  const group = document.getElementById("group-select").value;
  const status = document.getElementById("status-filter").value;

  let members = group === "all"
    ? await loadAllMembers()
    : await loadMembers(group);

  if (status === "member") {
    members = members.filter(m => m.status === "member");
  }

  members.sort((a, b) =>
    calcDays(b.joinDate) - calcDays(a.joinDate)
  );

  renderDaysMembers(members);
}

function renderDaysMembers(members) {
  const container = document.getElementById("days-list");
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

    card.innerHTML = `
      <img class="member-image" src="${imagePath}">
      <div class="member-name">${m.name}</div>
      <div class="member-kana">在籍 ${calcDays(m.joinDate)}日</div>
    `;

    container.appendChild(card);
  });
}
