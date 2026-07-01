/**
 * SKT calendar QR setup
 * - QR links to this Worker URL.
 * - The Worker calculates the base date using Korea time (Asia/Seoul).
 * - It generates one .ics file containing two calendar events:
 *   D+190: [SKT] 요금제 변경 가능일
 *   D+555: [SKT] 요금할인 신청 가능일
 *
 * Deploy on Cloudflare Workers.
 */

const STORE_NAME = "SKT칠곡센터";
const CONTACT_NUMBER = "010-8335-7577";

// 10:00 KST event time. Korea is UTC+9, so 10:00 KST = 01:00 UTC.
const EVENT_UTC_HOUR = 1;
const EVENT_DURATION_MINUTES = 30;

const EVENTS = [
  {
    offsetDays: 190,
    title: "[SKT] 요금제 변경 가능일",
    description:
`오늘은 SKT 요금제 변경 가능일입니다.

요금제 변경이 필요하시면 114 또는 매장 방문으로 문의해주세요.

문의번호: ${CONTACT_NUMBER}`,
  },
  {
    offsetDays: 555,
    title: "[SKT] 요금할인 신청 가능일",
    description:
`오늘은 SKT 요금할인 신청 가능일입니다.

요금할인 신청이 필요하시면 114 또는 매장 방문으로 문의해주세요.

문의번호: ${CONTACT_NUMBER}`,
  },
];

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/calendar.ics") {
      const baseDate = getBaseDateFromUrlOrKstToday(url);
      const ics = buildCalendarIcs(baseDate);
      return new Response(ics, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="skt-calendar-${baseDate}.ics"`,
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    const baseDate = kstTodayYmd();
    const rows = EVENTS.map(event => {
      const target = addDays(baseDate, event.offsetDays);
      return `<li><b>D+${event.offsetDays}</b> ${escapeHtml(target)} · ${escapeHtml(event.title)}</li>`;
    }).join("");

    const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SKT 일정 등록</title>
  <style>
    :root {
      color-scheme: light;
      --blue: #2563eb;
      --text: #111827;
      --muted: #6b7280;
      --border: #e5e7eb;
      --bg: #f8fafc;
      --card: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "SamsungOne", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .wrap {
      max-width: 520px;
      margin: 0 auto;
      min-height: 100vh;
      padding: 28px 18px;
      display: flex;
      align-items: center;
    }
    .card {
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 26px 22px 22px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    }
    .badge {
      display: inline-flex;
      padding: 6px 10px;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 14px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 25px;
      line-height: 1.25;
      letter-spacing: -0.04em;
    }
    .lead {
      margin: 0 0 18px;
      color: var(--muted);
      font-size: 15px;
    }
    .datebox {
      background: #f9fafb;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 14px;
      margin: 16px 0;
      font-size: 15px;
    }
    .datebox b {
      display: block;
      margin-bottom: 4px;
      font-size: 16px;
    }
    ul {
      padding-left: 20px;
      margin: 12px 0 20px;
    }
    li { margin: 8px 0; }
    .btn {
      display: block;
      width: 100%;
      text-align: center;
      padding: 16px 14px;
      border-radius: 16px;
      background: var(--blue);
      color: #fff;
      text-decoration: none;
      font-weight: 800;
      font-size: 17px;
      margin-top: 8px;
    }
    .note {
      margin: 14px 0 0;
      font-size: 13px;
      color: var(--muted);
    }
    .small {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <div class="badge">${escapeHtml(STORE_NAME)}</div>
      <h1>개통 후 꼭 챙길 일정을<br>캘린더에 저장하세요</h1>
      <p class="lead">QR을 스캔한 오늘 한국시간 기준으로 190일 뒤, 555일 뒤 일정을 자동 계산합니다.</p>

      <div class="datebox">
        <b>기준일: ${escapeHtml(baseDate)}</b>
        <span>한국시간 기준으로 계산됩니다.</span>
      </div>

      <ul>${rows}</ul>

      <a class="btn" href="/calendar.ics?base=${encodeURIComponent(baseDate)}">삼성캘린더에 추가하기</a>
      <p class="note">버튼을 누른 뒤 삼성캘린더가 열리면 저장을 눌러주세요.</p>

      <div class="small">
        문의번호: ${escapeHtml(CONTACT_NUMBER)}<br>
        일정 알림: 하루 전 / 당일 오전 10시
      </div>
    </section>
  </main>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  },
};

function getBaseDateFromUrlOrKstToday(url) {
  const base = url.searchParams.get("base");
  if (/^\d{4}-\d{2}-\d{2}$/.test(base || "")) return base;
  return kstTodayYmd();
}

function kstTodayYmd() {
  // Server-side Korea date. Does not depend on customer's phone clock.
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // YYYY-MM-DD
}

function addDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  // Treat the date as UTC midnight for stable date arithmetic.
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toYmd(dt);
}

function toYmd(dt) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildCalendarIcs(baseDate) {
  const nowStamp = utcStamp(new Date());
  const eventBlocks = EVENTS.map(event => {
    const target = addDays(baseDate, event.offsetDays);
    const [y, m, d] = target.split("-").map(Number);

    const startUtc = new Date(Date.UTC(y, m - 1, d, EVENT_UTC_HOUR, 0, 0));
    const endUtc = new Date(startUtc.getTime() + EVENT_DURATION_MINUTES * 60 * 1000);

    return [
      "BEGIN:VEVENT",
      `UID:skt-${baseDate}-d${event.offsetDays}@skt-chilgok-center`,
      `DTSTAMP:${nowStamp}`,
      `CREATED:${nowStamp}`,
      `LAST-MODIFIED:${nowStamp}`,
      `SUMMARY:${icsEscape(event.title)}`,
      `DESCRIPTION:${icsEscape(event.description)}`,
      `DTSTART:${utcStamp(startUtc)}`,
      `DTEND:${utcStamp(endUtc)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(event.title)}`,
      "TRIGGER:-P1D",
      "END:VALARM",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(event.title)}`,
      "TRIGGER:-PT0M",
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  }).join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SKT Chilgok Center//Calendar QR//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    eventBlocks,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function utcStamp(dt) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const hh = String(dt.getUTCHours()).padStart(2, "0");
  const mm = String(dt.getUTCMinutes()).padStart(2, "0");
  const ss = String(dt.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function icsEscape(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
