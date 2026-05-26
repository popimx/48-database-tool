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

const groupNameMap = {
  akb48: "AKB48",
  ske48: "SKE48",
  nmb48: "NMB48",
  hkt48: "HKT48",
  ngt48: "NGT48",
  stu48: "STU48"
};

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
   卒業
========================= */

function isGraduate(m) {
  return m.status === "graduated";
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
   データ
========================= */

const memberCache = {};

async function loadMembers(group) {
  if (memberCache[group]) return memberCache[group];

  const res = await fetch(`data/members/${group}.json`);
  if (!res.ok) return [];

  const data = await res.json();
  memberCache[group] = data;
  return data;
}

async function loadAllMembers() {
  const results = await Promise.all(GROUPS.map(loadMembers));
  return results.flat();
}

/* =========================
   ラベル
========================= */

function getMemberLabel(member, selectedGroup) {

  if (selectedGroup === "all") {
    return groupNameMap[member.groupId] || "";
  }

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
   INIT
========================= */

async function initMembersPage() {

  document.getElementById("group-select").addEventListener("change", updateMembers);
  document.getElementById("status-filter").addEventListener("change", updateMembers);
  document.getElementById("sort-select").addEventListener("change", updateMembers);

  updateMembers();
}

/* =========================
   UPDATE MEMBERS
========================= */

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

  // ---- ソート ----
  if (sort === "kana") {
    members.sort((a, b) => (a.kana || "").localeCompare(b.kana || "", "ja"));
  }

  else if (sort === "birthday") {
    members.sort((a, b) =>
      a.birthday.slice(5).localeCompare(b.birthday.slice(5))
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
    members.sort((a, b) => calcDays(b.joinDate) - calcDays(a.joinDate));
  }

  else {
    members = defaultSort(members);
  }

  renderMembers(members, group, sort);
}

/* =========================
   default sort
========================= */

function defaultSort(members) {
  return [...members].sort((a, b) =>
    (a.kana || "").localeCompare(b.kana || "", "ja")
  );
}

/* =========================
   render
========================= */

function renderMembers(members, selectedGroup, sortMode) {

  const container = document.getElementById("member-list");
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

    let sub = "";

    if (sortMode === "birthday" || sortMode === "age") {
      sub = `${formatDate(m.birthday)} (${calcAge(m.birthday)}歳)`;
    }
    else if (sortMode === "nearestBirthday") {
      const diff = getNextBirthday(m.birthday) - new Date();
      const days = Math.ceil(diff / 86400000);
      sub = `あと ${days}日`;
    }
    else if (sortMode === "days") {
      sub = `在籍 ${calcDays(m.joinDate)}日`;
    }
    else {
      sub = m.kana;
    }

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

      <div class="member-kana">${sub}</div>
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

  const members = await loadMembers(group);
  const member = members.find(m => m.id === id);

  if (!member) return;

  document.getElementById("member-detail").innerHTML = `
    <div>${member.name}</div>
  `;
}

/* =========================
   birthdays
========================= */

async function initBirthdaysPage() {

  document.getElementById("group-select").addEventListener("change", updateBirthdays);
  document.getElementById("status-filter").addEventListener("change", updateBirthdays);
  document.getElementById("birthday-sort").addEventListener("change", updateBirthdays);

  updateBirthdays();
}

function getNextBirthday(date) {
  const today = new Date();
  const birth = new Date(date);

  let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());

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

  if (sort === "birthday") {
    members.sort((a, b) =>
      a.birthday.slice(5).localeCompare(b.birthday.slice(5))
    );
  }

  else if (sort === "near") {
    members.sort((a, b) =>
      getNextBirthday(a.birthday) - getNextBirthday(b.birthday)
    );
  }

  renderBirthdayMembers(members);
}

function renderBirthdayMembers(members) {

  const container = document.getElementById("birthday-list");
  container.innerHTML = "";

  const group = document.getElementById("group-select").value;

  members.forEach(m => {

    const img = getImagePath(m);
    const label = getMemberLabel(m, group);
    const badgeClass = getBadgeClass(m);

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

  document.getElementById("group-select").addEventListener("change", updateDays);
  document.getElementById("status-filter").addEventListener("change", updateDays);

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

function renderDaysMembers(members) {

  const container = document.getElementById("days-list");
  container.innerHTML = "";

  const group = document.getElementById("group-select").value;

  members.forEach(m => {

    const img = getImagePath(m);
    const label = getMemberLabel(m, group);
    const badgeClass = getBadgeClass(m);

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
   utils
========================= */

function calcDays(joinDate) {
  const start = new Date(joinDate);
  const today = new Date();
  return Math.floor((today - start) / 86400000) + 1;
}

function calcAge(birthday) {
  const today = new Date();
  const birth = new Date(birthday);

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  return age;
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
