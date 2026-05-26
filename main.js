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
   カラー
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
   卒業判定
========================= */

function isGraduate(m) {
  return m.status === "graduated";
}

/* =========================
   期表示（詳細用）
========================= */

function formatGeneration(gen, mode = "list") {
  if (!gen) return "";
  if (mode === "detail") return gen + "生";
  return gen;
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
   データ取得
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
    console.error(e);
    return [];
  }
}

async function loadAllMembers() {
  const results = await Promise.all(GROUPS.map(g => loadMembers(g)));
  return results.flat();
}

/* =========================
   ラベル（★修正版）
========================= */

function getMemberLabel(member, selectedGroup) {

  if (selectedGroup === "all") {
    return groupNameMap[member.groupId] || "";
  }

  // ★研究生統一（10期期バグ修正済み）
  if (member.role === "kenkyuusei") {

    if (!member.generation) return "研究生";

    const gen = String(member.generation).replace("期", "");
    return `${gen}期研究生`;
  }

  if (member.groupId === "ske48" || member.groupId === "hkt48") {
    return member.team || "正規メンバー";
  }

  return "正規メンバー";
}

/* =========================
   members
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

  members = defaultSort(members, group);

  if (sort === "kana") {
    members.sort((a, b) => a.kana.localeCompare(b.kana, "ja"));
  } else if (sort === "age") {
    members.sort((a, b) => new Date(a.birthday) - new Date(b.birthday));
  } else if (sort === "days") {
    members.sort((a, b) => calcDays(b.joinDate) - calcDays(a.joinDate));
  }

  renderMembers(members, group);
}

/* =========================
   defaultSort
========================= */

function defaultSort(members, selectedGroup) {

  const groupOrder = {
    AKB48: 1,
    SKE48: 2,
    NMB48: 3,
    HKT48: 4,
    NGT48: 5,
    STU48: 6
  };

  return [...members].sort((a, b) => {

    const aG = isGraduate(a);
    const bG = isGraduate(b);

    if (aG && bG) {
      return new Date(a.joinDate) - new Date(b.joinDate)
        || a.kana.localeCompare(b.kana, "ja");
    }

    if (aG && !bG) return 1;
    if (!aG && bG) return -1;

    return a.kana.localeCompare(b.kana, "ja");
  });
}

/* =========================
   render members
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

    const img = getImagePath(m);
    const label = getMemberLabel(m, selectedGroup);
    const badgeClass = getBadgeClass(m);

    card.innerHTML = `
      <img class="member-image"
        src="${img.png}"
        onerror="this.onerror=null;this.src='${img.jpeg}'">

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
   member page
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
      <div class="detail-kana">${m.kana}</div>

      <div class="detail-info">
        <div>ニックネーム: ${m.nickname || "-"}</div>
        <div>生年月日: ${formatDate(m.birthday)} (${calcAge(m.birthday)}歳)</div>
        <div>出身地: ${m.prefecture}</div>
        <div>加入日: ${formatDate(m.joinDate)}</div>
        <div>在籍日数: ${calcDays(m.joinDate)}日</div>
        <div>期生: ${formatGeneration(m.generation, "detail") || "-"}</div>
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

function getNextBirthday(date) {
  const today = new Date();
  const birth = new Date(date);

  const next = new Date(
    today.getFullYear(),
    birth.getMonth(),
    birth.getDate()
  );

  if (next < today) next.setFullYear(today.getFullYear() + 1);

  return next;
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

  // ★誕生日順
  if (sort === "birthday") {
    members.sort((a, b) =>
      new Date(a.birthday) - new Date(b.birthday)
    );
  }

  // ★今日から近い順
  else if (sort === "near") {
    members.sort((a, b) =>
      getNextBirthday(a.birthday) - getNextBirthday(b.birthday)
    );
  }

  renderBirthdayMembers(members);
}

/* =========================
   birthday render
========================= */

function renderBirthdayMembers(members) {

  const container = document.getElementById("birthday-list");
  if (!container) return;

  container.innerHTML = "";

  const group = document.getElementById("group-select").value;

  members.forEach(m => {

    const card = document.createElement("div");
    card.className = "member-card";

    card.onclick = () => {
      location.href = `member.html?id=${m.id}&group=${m.groupId}`;
    };

    const img = getImagePath(m);
    const label = getMemberLabel(m, group);
    const badgeClass = getBadgeClass(m);

    card.innerHTML = `
      <img class="member-image"
        src="${img.png}"
        onerror="this.onerror=null;this.src='${img.jpeg}'">

      <div class="member-name-row">
        <span class="member-name">${m.name}</span>
        <span class="member-badge ${badgeClass}">
          ${label}
        </span>
      </div>

      <div class="member-kana">
        ${formatDate(m.birthday)} (${calcAge(m.birthday)}歳)
      </div>
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

  members.sort((a, b) => calcDays(b.joinDate) - calcDays(a.joinDate));

  renderDaysMembers(members);
}

/* =========================
   days render
========================= */

function renderDaysMembers(members) {

  const container = document.getElementById("days-list");
  if (!container) return;

  container.innerHTML = "";

  const group = document.getElementById("group-select").value;

  members.forEach(m => {

    const card = document.createElement("div");
    card.className = "member-card";

    card.onclick = () => {
      location.href = `member.html?id=${m.id}&group=${m.groupId}`;
    };

    const img = getImagePath(m);
    const label = getMemberLabel(m, group);
    const badgeClass = getBadgeClass(m);

    card.innerHTML = `
      <img class="member-image"
        src="${img.png}"
        onerror="this.onerror=null;this.src='${img.jpeg}'">

      <div class="member-name-row">
        <span class="member-name">${m.name}</span>
        <span class="member-badge ${badgeClass}">
          ${label}
        </span>
      </div>

      <div class="member-kana">
        在籍 ${calcDays(m.joinDate)}日
      </div>
    `;

    container.appendChild(card);
  });
}

/* =========================
   共通
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
