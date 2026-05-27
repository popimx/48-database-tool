document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname;

  if (path.includes("members.html")) initMembersPage();
  if (path.includes("member.html")) initMemberPage();
  if (path.includes("birthdays.html")) initBirthdaysPage();
  if (path.includes("days.html")) initDaysPage();
  if (path.includes("timeline.html")) initTimelinePage();

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

let akbTimelineCache = null;
let akbMemberStateCache = null;
let akbGroupedCache = null;

/* =========================
   データ
========================= */

async function loadMembers(group) {

  if (memberCache[group]) {
    return memberCache[group];
  }

  const url =
    `data/members/${group}.json?t=${Date.now()}`;

  const res = await fetch(url, {
    cache: "no-store"
  });

  if (!res.ok) {
    console.error("LOAD FAILED:", group);
    return [];
  }

  const data = await res.json();

  memberCache[group] = data;

  return data;
}

async function loadAllMembers() {

  const all =
    await Promise.all(
      GROUPS.map(loadMembers)
    );

  return all.flat();
}

async function loadAKBTimeline() {

  if (akbTimelineCache) {
    return akbTimelineCache;
  }

  const res = await fetch(
    `data/members/akb48_timeline.json?t=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("AKB TIMELINE LOAD FAILED");
    return [];
  }

  akbTimelineCache = await res.json();

  return akbTimelineCache;
}

async function loadAKBMemberState() {

  if (akbMemberStateCache) {
    return akbMemberStateCache;
  }

  const res = await fetch(
    `data/members/akb48_member_state.json?t=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("AKB MEMBER STATE LOAD FAILED");
    return {};
  }

  akbMemberStateCache = await res.json();

  return akbMemberStateCache;
}

async function loadAKBGrouped() {

  if (akbGroupedCache) {
    return akbGroupedCache;
  }

  const res = await fetch(
    `data/members/akb48_grouped.json?t=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error("AKB GROUPED LOAD FAILED");
    return {};
  }

  akbGroupedCache = await res.json();

  return akbGroupedCache;
}

/* =========================
   バッジ
========================= */

function getBadgeClass(member) {

  if (member.status === "graduated") {
    return "badge-graduate";
  }

  switch (member.groupId) {

    case "akb48":
      return "badge-akb";

    case "ske48":
      return "badge-ske";

    case "nmb48":
      return "badge-nmb";

    case "hkt48":
      return "badge-hkt";

    case "ngt48":
      return "badge-ngt";

    case "stu48":
      return "badge-stu";

    default:
      return "";
  }
}

/* =========================
   画像
========================= */

function getImagePath(m) {

  const base =
    `images/members/${m.groupId}/${m.image}_${m.imageYear}`;

  return {
    png: `${base}.PNG`,
    jpeg: `${base}.JPEG`,
    jpg: `${base}.JPG`
  };
}

/* =========================
   チーム8
========================= */

function isTeam8(m) {

  return (
    m.groupId === "akb48" &&
    m.generation === "チーム8"
  );
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
   ラベル
========================= */

function getMemberLabel(
  member,
  selectedGroup,
  sortMode
) {

  const isTeam8Member =
    isTeam8(member);

  const isSKEorHKT =
    member.groupId === "ske48" ||
    member.groupId === "hkt48";

  const isSingleGroup =
    selectedGroup !== "all";

  if (sortMode === "days") {

    if (isTeam8Member) {
      return "チーム8";
    }

    return `${member.generation}`;
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

    if (isTeam8Member) {
      return "チーム8";
    }

    if (member.role === "kenkyuusei") {
      return "研究生";
    }

    return (
      TEAM_MAP[member.role] ||
      "正規メンバー"
    );
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

    if (selectedGroup === "all") {
      return "AKB48";
    }

    return "正規メンバー";
  }

  if (member.role === "kenkyuusei") {

    if (selectedGroup === "all") {
      return groupNameMap[member.groupId];
    }

    return `${member.generation}研究生`;
  }

  return "正規メンバー";
}

/* =========================
   INIT
========================= */

async function initMembersPage() {

  document.getElementById("group-select")
    ?.addEventListener("change", updateMembers);

  document.getElementById("status-filter")
    ?.addEventListener("change", updateMembers);

  document.getElementById("sort-select")
    ?.addEventListener("change", updateMembers);

  updateMembers();
}

/* =========================
   UPDATE MEMBERS
========================= */

async function updateMembers() {

  const group =
    document.getElementById("group-select")
      ?.value || "all";

  const status =
    document.getElementById("status-filter")
      ?.value || "all";

  const sort =
    document.getElementById("sort-select")
      ?.value || "default";

  let members =
    group === "all"
      ? await loadAllMembers()
      : await loadMembers(group);

  if (status === "member") {
    members =
      members.filter(
        m => m.status === "member"
      );
  }

  if (sort === "default") {
    members.sort(globalDefaultSort);
  }

  else if (sort === "kana") {

    members.sort((a, b) =>
      (a.kana || "")
        .localeCompare(
          b.kana || "",
          "ja"
        )
    );
  }

  else if (sort === "birthday") {

    members.sort((a, b) =>
      (a.birthday || "")
        .slice(5)
        .localeCompare(
          (b.birthday || "").slice(5)
        )
    );
  }

  else if (sort === "nearestBirthday") {

    members.sort((a, b) =>
      getNextBirthday(a.birthday) -
      getNextBirthday(b.birthday)
    );
  }

  else if (sort === "age") {

    members.sort((a, b) =>
      new Date(a.birthday) -
      new Date(b.birthday)
    );
  }

  else if (sort === "days") {

    members.sort((a, b) => {

      const daysDiff =
        calcDays(b.joinDate) -
        calcDays(a.joinDate);

      if (daysDiff !== 0) {
        return daysDiff;
      }

      const groupDiff =
        GROUP_ORDER.indexOf(a.groupId) -
        GROUP_ORDER.indexOf(b.groupId);

      if (groupDiff !== 0) {
        return groupDiff;
      }

      return (a.kana || "")
        .localeCompare(
          b.kana || "",
          "ja"
        );
    });
  }

  renderMembers(
    members,
    group,
    sort
  );
}

/* =========================
   ソート
========================= */

function akbRank(m) {

  const gen =
    String(m.generation || "");

  for (let i = 0; i < AKB_ORDER.length; i++) {

    if (gen.includes(AKB_ORDER[i])) {
      return i;
    }
  }

  return 999;
}

function nmbRank(m) {

  if (m.role !== "kenkyuusei") {
    return 1;
  }

  const gen =
    String(m.generation || "");

  if (gen.includes("10")) return 2;
  if (gen.includes("11")) return 3;

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

  const groupDiff =
    GROUP_ORDER.indexOf(a.groupId) -
    GROUP_ORDER.indexOf(b.groupId);

  if (groupDiff !== 0) {
    return groupDiff;
  }

  if (a.groupId === "akb48") {

    const r =
      akbRank(a) - akbRank(b);

    if (r !== 0) {
      return r;
    }
  }

  if (a.groupId === "nmb48") {

    const r =
      nmbRank(a) - nmbRank(b);

    if (r !== 0) {
      return r;
    }
  }

  if (a.groupId === "ske48") {

    const r =
      skeRank(a) - skeRank(b);

    if (r !== 0) {
      return r;
    }
  }

  if (a.groupId === "hkt48") {

    const r =
      hktRank(a) - hktRank(b);

    if (r !== 0) {
      return r;
    }
  }

  const aKey =
    a.role === "kenkyuusei"
      ? 2
      : 1;

  const bKey =
    b.role === "kenkyuusei"
      ? 2
      : 1;

  if (aKey !== bKey) {
    return aKey - bKey;
  }

  return (a.kana || "")
    .localeCompare(
      b.kana || "",
      "ja"
    );
}

/* =========================
   TIMELINE ACTIVE
========================= */

function isMemberActive(date, periods) {

  return periods.some(period => {

    const start = period.start;
    const end = period.end;

    return (
      start <= date &&
      (!end || end >= date)
    );
  });
}

function getActiveMembersByDate(
  date,
  memberState,
  grouped
) {

  const result = [];

  Object.entries(grouped).forEach(
    ([generation, members]) => {

      const active =
        members.filter(name => {

          const periods =
            memberState[name];

          if (!periods) {
            return false;
          }

          return isMemberActive(
            date,
            periods
          );
        });

      if (active.length) {

        result.push({
          generation,
          members: active
        });
      }
    }
  );

  return result;
},
/* =========================
   RENDER MEMBERS
========================= */

function renderMembers(
  members,
  selectedGroup,
  sortMode
) {

  const container =
    document.getElementById("member-list");

  if (!container) return;

  container.innerHTML = "";

  members.forEach(m => {

    const img = getImagePath(m);

    const label =
      getMemberLabel(
        m,
        selectedGroup,
        sortMode
      );

    let sub = "";

    if (
      sortMode === "birthday" ||
      sortMode === "age"
    ) {

      sub =
        `${formatDate(m.birthday)} ` +
        `(${calcAge(m.birthday)}歳)`;
    }

    else if (
      sortMode === "nearestBirthday"
    ) {

      const diff =
        getNextBirthday(m.birthday) -
        new Date();

      const days =
        Math.ceil(diff / 86400000);

      sub =
        `${formatMonthDay(m.birthday)} ` +
        `(あと${days}日)`;
    }

    else if (sortMode === "days") {

      sub =
        `在籍 ${calcDays(m.joinDate)}日`;
    }

    else {

      sub = m.kana || "";
    }

    const card =
      document.createElement("div");

    card.className = "member-card";

    card.onclick = () => {

      location.href =
        `member.html?id=${m.id}&group=${m.groupId}`;
    };

    card.innerHTML = `
      <img
        class="member-image"
        src="${img.png}"
        onerror="this.onerror=null;this.src='${img.jpeg}'">

      <div class="member-name-row">

        <span class="member-name">
          ${m.name}
        </span>

        <span class="
          member-badge
          ${getBadgeClass(m)}
        ">
          ${label}
        </span>

      </div>

      <div class="member-kana">
        ${sub}
      </div>
    `;

    container.appendChild(card);
  });
}

/* =========================
   MEMBER PAGE
========================= */

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

  const members =
    await loadMembers(group);

  const member =
    members.find(
      m => m.id === id
    );

  if (member) {
    renderMember(member);
  }
}

function renderMember(m) {

  const el =
    document.getElementById(
      "member-detail"
    );

  if (!el) return;

  const img =
    getImagePath(m);

  el.innerHTML = `
    <a
      href="members.html"
      class="back-button">
      ← 一覧
    </a>

    <div class="member-detail">

      <img
        class="detail-image"
        src="${img.png}"
        onerror="this.onerror=null;this.src='${img.jpeg}'">

      <div class="detail-name">
        ${m.name}
      </div>

      <div class="detail-kana">
        ${m.kana || ""}
      </div>

      <div class="detail-info">

        <div>
          ニックネーム:
          ${m.nickname || "-"}
        </div>

        <div>
          生年月日:
          ${formatDate(m.birthday)}
          (${calcAge(m.birthday)}歳)
        </div>

        <div>
          出身地:
          ${m.prefecture || "-"}
        </div>

        <div>
          加入日:
          ${formatDate(m.joinDate)}
        </div>

        <div>
          在籍日数:
          ${calcDays(m.joinDate)}日
        </div>

        <div>
          期生:
          ${formatGenerationClean(m)}
        </div>

      </div>

    </div>
  `;
}

/* =========================
   DAYS
========================= */

function getNextBirthday(date) {

  const today =
    new Date();

  const birth =
    new Date(date);

  let next = new Date(
    today.getFullYear(),
    birth.getMonth(),
    birth.getDate()
  );

  if (next < today) {

    next.setFullYear(
      today.getFullYear() + 1
    );
  }

  return next;
}

async function initDaysPage() {

  document.getElementById(
    "group-select"
  )?.addEventListener(
    "change",
    updateDays
  );

  document.getElementById(
    "status-filter"
  )?.addEventListener(
    "change",
    updateDays
  );

  updateDays();
}

/* =========================
   TIMELINE PAGE
========================= */

async function initTimelinePage() {

  const timeline =
    await loadAKBTimeline();

  const memberState =
    await loadAKBMemberState();

  const grouped =
    await loadAKBGrouped();

  renderTimelineSummary(
    timeline
  );

  renderCurrentMemberCount(
    memberState
  );

  renderGenerationCount(
    grouped,
    memberState
  );

  renderTimelineCards(
    timeline,
    memberState,
    grouped
  );
}

/* =========================
   TIMELINE SUMMARY
========================= */

function renderTimelineSummary(
  timeline
) {

  const el =
    document.getElementById(
      "timeline-summary"
    );

  if (!el) return;

  if (!timeline.length) {

    el.innerHTML =
      "データがありません";

    return;
  }

  const latest =
    timeline[timeline.length - 1];

  el.innerHTML = `
    <div class="timeline-summary-box">

      <div class="
        timeline-summary-title
      ">
        AKB48 人数推移
      </div>

      <div class="
        timeline-summary-count
      ">
        ${latest.value}人
      </div>

      <div class="
        timeline-summary-date
      ">
        ${formatDate(latest.date)}
      </div>

    </div>
  `;
}

/* =========================
   CURRENT COUNT
========================= */

function renderCurrentMemberCount(
  memberState
) {

  const el =
    document.getElementById(
      "current-member-count"
    );

  if (!el) return;

  const today =
    new Date();

  let count = 0;

  Object.values(memberState)
    .forEach(periods => {

      const active =
        periods.some(p => {

          const start =
            p.start
              ? new Date(p.start)
              : null;

          const end =
            p.end
              ? new Date(p.end)
              : null;

          if (
            start &&
            today < start
          ) {
            return false;
          }

          if (
            end &&
            today > end
          ) {
            return false;
          }

          return true;
        });

      if (active) {
        count++;
      }
    });

  el.innerHTML = `
    <div class="
      timeline-current-count
    ">
      現在の在籍人数:
      ${count}人
    </div>
  `;
}

/* =========================
   GENERATION COUNT
========================= */

function renderGenerationCount(
  grouped,
  memberState
) {

  const el =
    document.getElementById(
      "generation-count"
    );

  if (!el) return;

  const today =
    new Date();

  let html = "";

  Object.entries(grouped)
    .forEach(([gen, members]) => {

      let activeCount = 0;

      members.forEach(name => {

        const periods =
          memberState[name] || [];

        const active =
          periods.some(p => {

            const start =
              p.start
                ? new Date(p.start)
                : null;

            const end =
              p.end
                ? new Date(p.end)
                : null;

            if (
              start &&
              today < start
            ) {
              return false;
            }

            if (
              end &&
              today > end
            ) {
              return false;
            }

            return true;
          });

        if (active) {
          activeCount++;
        }
      });

      html += `
        <div class="
          generation-count-row
        ">

          <span>
            ${gen}
          </span>

          <span>
            ${activeCount}人
          </span>

        </div>
      `;
    });

  el.innerHTML = html;
}

/* =========================
   TIMELINE CARDS
========================= */

function renderTimelineCards(
  timeline,
  memberState,
  grouped
) {

  const container =
    document.getElementById(
      "timeline-list"
    );

  if (!container) return;

  container.innerHTML = "";

  timeline.forEach(cardData => {

    const card =
      document.createElement("div");

    card.className =
      "timeline-card";

    let eventsHtml = "";

    cardData.events.forEach(event => {

      eventsHtml += `
        <div class="
          timeline-event
        ">

          <div class="
            timeline-event-text
          ">
            ${event.text}
          </div>

          <div class="
            timeline-event-right
          ">

            <span class="
              timeline-event-value
            ">
              ${event.value}人
            </span>

            ${
              event.delta
                ? `
                  <span class="
                    timeline-event-delta
                  ">
                    ${event.delta}
                  </span>
                `
                : ""
            }

          </div>

        </div>
      `;
    });

    const activeGenerations =
      getActiveMembersByDate(
        cardData.date,
        memberState,
        grouped
      );

    let membersHtml = "";

    activeGenerations
      .forEach(group => {

        membersHtml += `
          <div class="
            timeline-generation
          ">

            <div class="
              timeline-generation-title
            ">
              ${group.generation}
            </div>

            <div class="
              timeline-generation-members
            ">
              ${group.members.join(" ・ ")}
            </div>

          </div>
        `;
      });

    card.innerHTML = `
      <div class="timeline-date">
        ${formatDate(cardData.date)}
      </div>

      <div class="timeline-events">
        ${eventsHtml}
      </div>

      <div class="
        timeline-members
      ">
        ${membersHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

/* =========================
   0:00更新
========================= */

function scheduleMidnightUpdate() {

  const now =
    new Date();

  const next =
    new Date();

  next.setHours(
    24,
    0,
    0,
    0
  );

  const ms =
    next - now;

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

  const group =
    document.getElementById(
      "group-select"
    )?.value || "all";

  const status =
    document.getElementById(
      "status-filter"
    )?.value || "all";

  let members =
    group === "all"
      ? await loadAllMembers()
      : await loadMembers(group);

  if (status === "member") {

    members =
      members.filter(
        m => m.status === "member"
      );
  }

  members.sort((a, b) => {

    const daysDiff =
      calcDays(b.joinDate) -
      calcDays(a.joinDate);

    if (daysDiff !== 0) {
      return daysDiff;
    }

    const groupDiff =
      GROUP_ORDER.indexOf(a.groupId) -
      GROUP_ORDER.indexOf(b.groupId);

    if (groupDiff !== 0) {
      return groupDiff;
    }

    return (a.kana || "")
      .localeCompare(
        b.kana || "",
        "ja"
      );
  });

  renderDaysMembers(members);
}

/* =========================
   DAYS RENDER
========================= */

function renderDaysMembers(
  members
) {

  const container =
    document.getElementById(
      "days-list"
    );

  if (!container) return;

  container.innerHTML = "";

  members.forEach(m => {

    const img =
      getImagePath(m);

    const card =
      document.createElement("div");

    card.className =
      "member-card";

    card.onclick = () => {

      location.href =
        `member.html?id=${m.id}&group=${m.groupId}`;
    };

    card.innerHTML = `
      <img
        class="member-image"
        src="${img.png}"
        onerror="this.onerror=null;this.src='${img.jpeg}'">

      <div class="
        member-name-row
      ">
        <span class="
          member-name
        ">
          ${m.name}
        </span>
      </div>

      <div class="
        member-kana
      ">
        ${getDaysLabel(m)}
        /
        在籍
        ${calcDays(m.joinDate)}日
      </div>
    `;

    container.appendChild(card);
  });
}

/* =========================
   DAYS LABEL
========================= */

function getDaysLabel(m) {

  if (!m) {
    return "-";
  }

  if (isTeam8(m)) {
    return "チーム8";
  }

  const gen =
    (m.generation || "").trim();

  if (!gen) {
    return "-";
  }

  if (
    m.role === "kenkyuusei"
  ) {
    return `${gen}研究生`;
  }

  return gen;
}

/* =========================
   UTILS
========================= */

function calcDays(joinDate) {

  if (!joinDate) {
    return 0;
  }

  const start =
    new Date(joinDate);

  const today =
    new Date();

  start.setHours(
    0,
    0,
    0,
    0
  );

  today.setHours(
    0,
    0,
    0,
    0
  );

  return Math.floor(
    (today - start) /
    86400000
  ) + 1;
}

function calcAge(birthday) {

  if (!birthday) {
    return "-";
  }

  const today =
    new Date();

  const birth =
    new Date(birthday);

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const m =
    today.getMonth() -
    birth.getMonth();

  if (
    m < 0 ||
    (
      m === 0 &&
      today.getDate() <
      birth.getDate()
    )
  ) {
    age--;
  }

  return age;
}

function formatDate(date) {

  if (!date) {
    return "-";
  }

  const d =
    new Date(date);

  return (
    `${d.getFullYear()}年` +
    `${d.getMonth() + 1}月` +
    `${d.getDate()}日`
  );
}

function formatMonthDay(date) {

  if (!date) {
    return "-";
  }

  const d =
    new Date(date);

  return (
    `${d.getMonth() + 1}月` +
    `${d.getDate()}日`
  );
}

function formatGenerationClean(m) {

  if (!m?.generation) {
    return "-";
  }

  if (
    m.generation === "チーム8"
  ) {
    return "チーム8";
  }

  const gen =
    String(m.generation)
      .replace("期", "");

  if (
    m.role === "kenkyuusei"
  ) {
    return `${gen}期研究生`;
  }

  return `${gen}期生`;
}

/* =========================
   BIRTHDAYS
========================= */

function initBirthdaysPage() {
  // 必要なら追加
}
