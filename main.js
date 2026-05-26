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

async function initMembersPage() {

  const groupSelect =
    document.getElementById(
      "group-select"
    );

  groupSelect.addEventListener(
    "change",
    () => {
      loadMembers(
        groupSelect.value
      );
    }
  );

  loadMembers("nmb48");
}

async function loadMembers(group) {

  const response = await fetch(
    `data/members/${group}.json`
  );

  const members =
    await response.json();

  renderMembers(members);
}

function renderMembers(members) {

  const container =
    document.getElementById(
      "member-list"
    );

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

  renderMember(member);
}

function calcDays(joinDate) {

  const start =
    new Date(joinDate);

  const today =
    new Date();

  return Math.floor(
    (today - start) /
    (1000 * 60 * 60 * 24)
  );
}

function renderMember(member) {

  const container =
    document.getElementById(
      "member-detail"
    );

  const imagePath =
    `images/members/${member.groupId}/${member.image}_${member.imageYear}.PNG`;

  container.innerHTML = `

    <a
      href="members.html"
      class="back-button"
    >
      ← メンバー一覧へ戻る
    </a>

    <img
      class="detail-image"
      src="${imagePath}"
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

        ${member.nickname}
      </div>

      <div>
        <span class="label">
          生年月日:
        </span>

        ${member.birthday}
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

        ${member.joinDate}
      </div>

      <div>
        <span class="label">
          在籍日数:
        </span>

        ${calcDays(
          member.joinDate
        )}日
      </div>

      <div>
        <span class="label">
          期生:
        </span>

        ${member.generation}
      </div>

    </div>
  `;
}
