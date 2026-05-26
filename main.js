// main.js

const GROUPS = [
  "akb48",
  "ske48",
  "nmb48",
  "hkt48",
  "ngt48",
  "stu48"
];

async function loadAllMembers() {

  const results = await Promise.all(

    GROUPS.map(async group => {

      const response =
        await fetch(`data/members/${group}.json`);

      return await response.json();

    })

  );

  return results.flat();

}

function formatJapaneseDate(dateString) {

  const date = new Date(dateString);

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

}

function calculateAge(birthday) {

  const today = new Date();

  const birth = new Date(birthday);

  let age =
    today.getFullYear() - birth.getFullYear();

  const monthDiff =
    today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (
      monthDiff === 0 &&
      today.getDate() < birth.getDate()
    )
  ) {
    age--;
  }

  return age;

}

function calculateTenure(joinDate) {

  const today = new Date();

  const join = new Date(joinDate);

  const diff =
    today - join;

  return Math.floor(
    diff / (1000 * 60 * 60 * 24)
  );

}

async function initMembersPage() {

  const members = await loadAllMembers();

  const list =
    document.getElementById("members-list");

  const groupSelect =
    document.getElementById("group-select");

  const statusFilter =
    document.getElementById("status-filter");

  function render() {

    let filtered = [...members];

    // グループ絞り込み
    if (groupSelect.value !== "all") {

      filtered = filtered.filter(
        member =>
          member.groupId === groupSelect.value
      );

    }

    // 現役のみ
    if (statusFilter.value === "member") {

      filtered = filtered.filter(
        member =>
          member.status === "member"
      );

    }

    // 加入日順 → kana順
    filtered.sort((a, b) => {

      const dateA =
        new Date(a.joinDate);

      const dateB =
        new Date(b.joinDate);

      if (dateA - dateB !== 0) {
        return dateA - dateB;
      }

      return a.kana.localeCompare(
        b.kana,
        "ja"
      );

    });

    list.innerHTML = filtered.map(member => {

      const imageUrl =
        `images/members/${member.groupId}/${member.image}_${member.imageYear}.PNG`;

      return `
        <a class="member-card"
           href="member.html?id=${member.id}&group=${member.groupId}">

          <img
            src="${imageUrl}"
            alt="${member.name}">

          <div class="member-info">
            <div class="member-name">
              ${member.name}
            </div>

            <div class="member-kana">
              ${member.kana}
            </div>
          </div>

        </a>
      `;

    }).join("");

  }

  groupSelect.addEventListener(
    "change",
    render
  );

  statusFilter.addEventListener(
    "change",
    render
  );

  render();

}

async function initBirthdaysPage() {

  const members =
    await loadAllMembers();

  const list =
    document.getElementById("birthday-list");

  const sortSelect =
    document.getElementById("birthday-sort");

  function getUpcomingDiff(birthday) {

    const today =
      new Date();

    const birth =
      new Date(birthday);

    const next =
      new Date(
        today.getFullYear(),
        birth.getMonth(),
        birth.getDate()
      );

    if (next < today) {
      next.setFullYear(
        today.getFullYear() + 1
      );
    }

    return next - today;

  }

  function render() {

    let sorted = [...members];

    if (sortSelect.value === "calendar") {

      sorted.sort((a, b) => {

        const aDate =
          new Date(a.birthday);

        const bDate =
          new Date(b.birthday);

        const aMonthDay =
          (aDate.getMonth() + 1) * 100 +
          aDate.getDate();

        const bMonthDay =
          (bDate.getMonth() + 1) * 100 +
          bDate.getDate();

        return aMonthDay - bMonthDay;

      });

    } else {

      sorted.sort((a, b) => {

        return (
          getUpcomingDiff(a.birthday) -
          getUpcomingDiff(b.birthday)
        );

      });

    }

    list.innerHTML = sorted.map(member => {

      const imageUrl =
        `images/members/${member.groupId}/${member.image}_${member.imageYear}.PNG`;

      return `
        <a class="member-card"
           href="member.html?id=${member.id}&group=${member.groupId}">

          <img
            src="${imageUrl}"
            alt="${member.name}">

          <div class="member-info">

            <div class="member-name">
              ${member.name}
            </div>

            <div class="member-kana">
              ${formatJapaneseDate(member.birthday)}
              （${calculateAge(member.birthday)}歳）
            </div>

          </div>

        </a>
      `;

    }).join("");

  }

  sortSelect.addEventListener(
    "change",
    render
  );

  render();

}

async function initDaysPage() {

  const members =
    await loadAllMembers();

  const list =
    document.getElementById("days-list");

  members.sort((a, b) => {

    return (
      calculateTenure(b.joinDate) -
      calculateTenure(a.joinDate)
    );

  });

  list.innerHTML = members.map(member => {

    const imageUrl =
      `images/members/${member.groupId}/${member.image}_${member.imageYear}.PNG`;

    return `
      <a class="member-card"
         href="member.html?id=${member.id}&group=${member.groupId}">

        <img
          src="${imageUrl}"
          alt="${member.name}">

        <div class="member-info">

          <div class="member-name">
            ${member.name}
          </div>

          <div class="member-kana">
            在籍 ${calculateTenure(member.joinDate)}日
          </div>

        </div>

      </a>
    `;

  }).join("");

}

async function initMemberPage() {

  const params =
    new URLSearchParams(location.search);

  const id =
    params.get("id");

  const group =
    params.get("group");

  if (!id || !group) return;

  const response =
    await fetch(
      `data/members/${group}.json`
    );

  const members =
    await response.json();

  const member =
    members.find(
      m => m.id === id
    );

  if (!member) return;

  const imageUrl =
    `images/members/${member.groupId}/${member.image}_${member.imageYear}.PNG`;

  const container =
    document.getElementById("member-detail");

  container.innerHTML = `
    <div class="member-detail">

      <img
        src="${imageUrl}"
        alt="${member.name}">

      <div class="member-detail-content">

        <h2>${member.name}</h2>

        <p>${member.kana}</p>

        <p>
          ニックネーム：
          ${member.nickname || "-"}
        </p>

        <p>
          誕生日：
          ${formatJapaneseDate(member.birthday)}
          （${calculateAge(member.birthday)}歳）
        </p>

        <p>
          出身地：
          ${member.prefecture}
        </p>

        <p>
          加入日：
          ${formatJapaneseDate(member.joinDate)}
        </p>

        <p>
          在籍日数：
          ${calculateTenure(member.joinDate)}日
        </p>

        <p>
          ${member.generation}
        </p>

      </div>

    </div>
  `;

}

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const path =
      location.pathname;

    if (path.includes("members.html")) {
      initMembersPage();
    }

    if (path.includes("birthdays.html")) {
      initBirthdaysPage();
    }

    if (path.includes("days.html")) {
      initDaysPage();
    }

    if (path.includes("member.html")) {
      initMemberPage();
    }

  }
);
