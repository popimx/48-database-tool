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
   INIT MEMBERS
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

  // ===== ソート =====

  if (group === "nmb48" && sort === "default") {
    members = nmbDefaultSort(members);
  }

  else if (sort === "kana") {
    members.sort((a, b) =>
      (a.kana || "").localeCompare(b.kana || "", "ja")
    );
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
    members.sort((a, b) =>
      new Date(a.birthday) - new Date(b.birthday)
    );
  }

  else if (sort === "days") {
    members.sort((a, b) =>
      calcDays(b.joinDate) - calcDays(a.joinDate)
    );
  }

  else if (sort !== "default") {
    members = defaultSort(members);
  }

  renderMembers(members, group, sort);
}

/* =========================
   NMB専用デフォルト順
========================= */

function nmbDefaultSort(members) {

  const rank = (m) => {
    if (m.role !== "kenkyuusei") return 1;

    const gen = String(m.generation || "");

    if (gen.includes("10")) return 2;
    if (gen.includes("11")) return 3;

    return 4;
  };

  return [...members].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    return (a.kana || "").localeCompare(b.kana || "", "ja");
  });
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
   render members
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
      sub = `${formatMonthDay(m.birthday)} (あと${days}日)`;
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

  if (!id || !group) return;

  const members = await loadMembers(group);
  const member = members.find(m => m.id === id);

  if (member) renderMember(member, group);
}

function renderMember(m, group) {

  const el = document.getElementById("member-detail");
  if (!el) return;

  const img = getImagePath(m);
  const label = getMemberLabel(m, group);
  const badgeClass = getBadgeClass(m);

  el.innerHTML = `
    <a href="members.html" class="back-button">← 一覧</a>

    <div class="member-detail">

      <img class="detail-image"
        src="${img.png}"
        onerror="this.onerror=null;this.src='${img.jpeg}'">

      <div class="detail-name">${m.name}</div>

      <div class="member-badge ${badgeClass}">
        ${label}
      </div>

      <div class="detail-kana">${m.kana || ""}</div>

      <div class="detail-info">
        <div>ニックネーム: ${m.nickname || "-"}</div>
        <div>生年月日: ${formatDate(m.birthday)} (${calcAge(m.birthday)}歳)</div>
        <div>出身地: ${m.prefecture || "-"}</div>
        <div>加入日: ${formatDate(m.joinDate)}</div>
        <div>在籍日数: ${calcDays(m.joinDate)}日</div>
        <div>期生: ${formatGeneration(m)}</div>
      </div>

    </div>
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

    const diff = getNextBirthday(m.birthday) - new Date();
    const days = Math.ceil(diff / 86400000);

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
        ${formatMonthDay(m.birthday)} (あと${days}日)
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

  members.sort((a, b) =>
    calcDays(b.joinDate) - calcDays(a.joinDate)
  );

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

function formatMonthDay(date) {
  const d = new Date(date);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatGeneration(m) {
  if (m.role === "kenkyuusei") {
    const g = String(m.generation || "").replace("期", "");
    return `${g}期研究生`;
  }

  return m.generation ? `${m.generation}期生` : "-";
}
