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

async function loadMembers(group) {
  const response = await fetch(
    `data/members/${group}.json`
  );

  const members =
    await response.json();

  renderMembers(members);
}

function calcAge(birthday) {
  const today = new Date();

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

function calcDays(
  joinDate,
  graduateDate = null
) {
  const start =
    new Date(joinDate);

  const end =
    graduateDate
      ? new Date(
          graduateDate
        )
      : new Date();

  return Math.floor(
    (end - start) /
    (1000 * 60 * 60 * 24)
  );
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

    card.innerHTML = `
      <div class="member-name">
        ${member.name}
      </div>

      <div class="member-kana">
        ${member.kana}
      </div>

      <div class="member-info">

        <div>
          <span class="label">
            誕生日:
          </span>

          ${member.birthday}
        </div>

        <div>
          <span class="label">
            年齢:
          </span>

          ${calcAge(
            member.birthday
          )}歳
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
            member.joinDate,
            member.graduateDate
          )}日
        </div>

        <div>
          <span class="label">
            期生:
          </span>

          ${member.generation}
        </div>

        <div>
          <span class="label">
            出身地:
          </span>

          ${member.prefecture}
        </div>

        <div>
          <span class="label">
            status:
          </span>

          ${member.status}
        </div>

      </div>
    `;

    container.appendChild(card);
  });
}

loadMembers("nmb48");
