document.addEventListener(
  "DOMContentLoaded",
  () => {

    const path =
      location.pathname;

    if (
      path.includes("members.html")
    ) {
      initMembersPage();
    }

    if (
      path.includes("member.html")
    ) {
      initMemberPage();
    }

    if (
      path.includes("birthdays.html")
    ) {
      initBirthdaysPage();
    }

    if (
      path.includes("days.html")
    ) {
      initDaysPage();
    }

  }
);

const GROUPS = [
  "akb48",
  "ske48",
  "nmb48",
  "hkt48",
  "ngt48",
  "stu48"
];

async function loadAllMembers() {

  const results =
    await Promise.all(

      GROUPS.map(
        async group => {

          try {

            const response =
              await fetch(
                `data/members/${group}.json`
              );

            if (!response.ok) {

              console.error(
                `${group}.json の読み込み失敗`
              );

              return [];
            }

            return await response.json();

          } catch (error) {

            console.error(
              `${group}.json エラー`,
              error
            );

            return [];
          }

        }
      )
    );

  return results.flat();
}

async function initMembersPage() {

  const groupSelect =
    document.getElementById(
      "group-select"
    );

  const statusFilter =
    document.getElementById(
      "status-filter"
    );

  const sortSelect =
    document.getElementById(
      "sort-select"
    );

  if (
    !groupSelect ||
    !statusFilter ||
    !sortSelect
  ) {
    return;
  }

  groupSelect.addEventListener(
    "change",
    updateMembers
  );

  statusFilter.addEventListener(
    "change",
    updateMembers
  );

  sortSelect.addEventListener(
    "change",
    updateMembers
  );

  updateMembers();
}

async function updateMembers() {

  const group =
    document.getElementById(
      "group-select"
    ).value;

  const status =
    document.getElementById(
      "status-filter"
    ).value;

  const sort =
    document.getElementById(
      "sort-select"
    ).value;

  let members = [];

  if (group === "all") {

    members =
      await loadAllMembers();

  } else {

    try {

      const response =
        await fetch(
          `data/members/${group}.json`
        );

      if (!response.ok) {

        console.error(
          `${group}.json の読み込み失敗`
        );

        return;
      }

      members =
        await response.json();

    } catch (error) {

      console.error(
        `${group}.json エラー`,
        error
      );

      return;
    }

  }

  if (status === "member") {

    members =
      members.filter(
        member =>
          member.status === "member"
      );

  }

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

  renderMembers(members);
}

function renderMembers(members) {

  const container =
    document.getElementById(
      "member-list"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  members.forEach(member => {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "member-card";

    card.onclick = () => {

      location.href =
        `member.html?id=${member.id}&group=${member.groupId}`;
    };

    const imagePath =
      `images/members/${member.groupId}/${member.image}_${member.imageYear}.PNG`;

    card.innerHTML = `
      <img
        class="member-image"
        src="${imagePath}"
        alt="${member.name}"
      >

      <div class="member-name">
        ${member.name}
      </div>

      <div class="member-kana">
        ${member.kana}
      </div>
    `;

    container.appendChild(card);
  });
}

async function initMemberPage() {

  const params =
    new URLSearchParams(
      location.search
    );

  const id =
    params.get("id");

  const group =
    params.get("group");

  if (!id || !group) {
    return;
  }

  try {

    const response =
      await fetch(
        `data/members/${group}.json`
      );

    if (!response.ok) {
      return;
    }

    const members =
      await response.json();

    const member =
      members.find(
        m => m.id === id
      );

    if (!member) {
      return;
    }

    renderMember(member);

  } catch (error) {

    console.error(error);

  }
}

function calcDays(joinDate) {

  const start =
    new Date(joinDate);

  const today =
    new Date();

  const diff =
    Math.floor(
      (today - start) /
      (1000 * 60 * 60 * 24)
    );

  // ★加入日を1日目としてカウント
  return diff + 1;
}

function calcAge(birthday) {

  const today =
    new Date();

  const birth =
    new Date(birthday);

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const month =
    today.getMonth() -
    birth.getMonth();

  if (
    month < 0 ||
    (
      month === 0 &&
      today.getDate() <
      birth.getDate()
    )
  ) {
    age--;
  }

  return age;
}

function formatDate(dateString) {

  const date =
    new Date(dateString);

  const year =
    date.getFullYear();

  const month =
    date.getMonth() + 1;

  const day =
    date.getDate();

  return `${year}年${month}月${day}日`;
}

function renderMember(member) {

  const container =
    document.getElementById(
      "member-detail"
    );

  if (!container) {
    return;
  }

  const imagePath =
    `images/members/${member.groupId}/${member.image}_${member.imageYear}.PNG`;

  container.innerHTML = `

    <a
      href="members.html"
      class="back-button"
    >
      ← メンバーの一覧
    </a>

    <div class="member-detail">

      <img
        class="detail-image"
        src="${imagePath}"
        alt="${member.name}"
      >

      <div class="detail-name">
        ${member.name}
      </div>

      <div class="detail-kana">
        ${member.kana}
      </div>

      <div class="detail-info">

        <div>
          <span class="label">
            ニックネーム:
          </span>

          ${member.nickname || "-"}
        </div>

        <div>
          <span class="label">
            生年月日:
          </span>

          ${formatDate(member.birthday)} (${calcAge(member.birthday)}歳)
        </div>

        <div>
          <span class="label">
            出身地:
          </span>

          ${member.prefecture}
        </div>

        <div>
          <span class="label">
            加入日:
          </span>

          ${formatDate(member.joinDate)}
        </div>

        <div>
          <span class="label">
            在籍日数:
          </span>

          ${calcDays(member.joinDate)}日
        </div>

        <div>
          <span class="label">
            期生:
          </span>

          ${member.generation}
        </div>

      </div>

    </div>
  `;
}

async function initBirthdaysPage() {

  const groupSelect =
    document.getElementById("group-select");

  const statusFilter =
    document.getElementById("status-filter");

  const sortSelect =
    document.getElementById("birthday-sort");

  if (!groupSelect || !statusFilter || !sortSelect) {
    return;
  }

  groupSelect.addEventListener("change", updateBirthdays);
  statusFilter.addEventListener("change", updateBirthdays);
  sortSelect.addEventListener("change", updateBirthdays);

  updateBirthdays();
}

async function updateBirthdays() {

  const group =
    document.getElementById("group-select").value;

  const status =
    document.getElementById("status-filter").value;

  const sortMode =
    document.getElementById("birthday-sort").value;

  let members = [];

  if (group === "all") {
    members = await loadAllMembers();
  } else {
    try {
      const response =
        await fetch(`data/members/${group}.json`);

      if (!response.ok) return;

      members = await response.json();
    } catch (error) {
      console.error(error);
      return;
    }
  }

  if (status === "member") {
    members = members.filter(m => m.status === "member");
  }

  if (sortMode === "calendar") {

    members.sort((a, b) => {

      const aDate = new Date(a.birthday);
      const bDate = new Date(b.birthday);

      const aValue = (aDate.getMonth() + 1) * 100 + aDate.getDate();
      const bValue = (bDate.getMonth() + 1) * 100 + bDate.getDate();

      return aValue - bValue;
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

  if (next < today) {
    next.setFullYear(today.getFullYear() + 1);
  }

  return next - today;
}

function renderBirthdayMembers(members) {

  const container =
    document.getElementById("birthday-list");

  if (!container) return;

  container.innerHTML = "";

  members.forEach(member => {

    const card = document.createElement("div");
    card.className = "member-card";

    card.onclick = () => {
      location.href =
        `member.html?id=${member.id}&group=${member.groupId}`;
    };

    const imagePath =
      `images/members/${member.groupId}/${member.image}_${member.imageYear}.PNG`;

    card.innerHTML = `
      <img class="member-image" src="${imagePath}" alt="${member.name}">
      <div class="member-name">${member.name}</div>
      <div class="member-kana">
        ${formatDate(member.birthday)} (${calcAge(member.birthday)}歳)
      </div>
    `;

    container.appendChild(card);
  });
}

async function initDaysPage() {

  const groupSelect =
    document.getElementById("group-select");

  const statusFilter =
    document.getElementById("status-filter");

  if (!groupSelect || !statusFilter) return;

  groupSelect.addEventListener("change", updateDays);
  statusFilter.addEventListener("change", updateDays);

  updateDays();
}

async function updateDays() {

  const group =
    document.getElementById("group-select").value;

  const status =
    document.getElementById("status-filter").value;

  let members = [];

  if (group === "all") {
    members = await loadAllMembers();
  } else {
    try {
      const response =
        await fetch(`data/members/${group}.json`);

      if (!response.ok) return;

      members = await response.json();
    } catch (error) {
      console.error(error);
      return;
    }
  }

  if (status === "member") {
    members = members.filter(m => m.status === "member");
  }

  members.sort((a, b) =>
    calcDays(b.joinDate) - calcDays(a.joinDate)
  );

  renderDaysMembers(members);
}

function renderDaysMembers(members) {

  const container =
    document.getElementById("days-list");

  if (!container) return;

  container.innerHTML = "";

  members.forEach(member => {

    const card = document.createElement("div");
    card.className = "member-card";

    card.onclick = () => {
      location.href =
        `member.html?id=${member.id}&group=${member.groupId}`;
    };

    const imagePath =
      `images/members/${member.groupId}/${member.image}_${member.imageYear}.PNG`;

    card.innerHTML = `
      <img class="member-image" src="${imagePath}" alt="${member.name}">
      <div class="member-name">${member.name}</div>
      <div class="member-kana">在籍 ${calcDays(member.joinDate)}日</div>
    `;

    container.appendChild(card);
  });
}
