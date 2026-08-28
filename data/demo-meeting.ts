/**
 * 長久示範會議 — 一場把整條會議流程走完的樣本，供展示與新任承辦上手。
 *
 *   npx tsx data/demo-meeting.ts          # 建立／更新示範資料
 *   npx tsx data/demo-meeting.ts --drop   # 移除示範資料
 *   （npm run demo:seed / npm run demo:drop）
 *
 * 冪等：以 slug「demo」為鍵 upsert，重跑只會刷新，不會長出第二場。
 *
 * ── 這份資料是虛構的，設計上刻意讓人一眼認得出來 ──
 * 會議名稱帶「（系統示範）」、收件人是「示範議員一～五」配 example.com、
 * 會議連結是明顯的佔位字串。
 * 之所以要這樣，是因為這場會議在畫面上與真實會議長得一模一樣：
 * 若不標示，學生會誤以為議會真的開過這場、真的做過這些決議。
 *
 * 會議資料取材自 115 學年度第 1 學期八月議會臨時會的公開開會通知（時間、地點、文號），
 * 但**提案內容、決議、收件人全為虛構**，不是該場會議的實際紀錄。
 *
 * isPublic 預設 false：示範資料不進免登入的議事公開頁。
 * 要對外展示再由 admin 於後台逐場開啟（toggleMeetingPublic 已限 admin）。
 */
import { prisma } from "@/lib/db";
import { generateNotice, type MeetingForNotice } from "@/lib/meetings/notice";

const SLUG = "demo";
const DEMO_SESSION = 0; // 示範收件人用第 0 屆，與真實名冊（第 21 屆）完全隔開
const DEMO_EMAIL = "demo@nttuspcodex.invalid";

const MEETING_AT = new Date("2026-08-27T19:00:00+08:00");
const NOTICE_DATE = new Date("2026-08-23T10:00:00+08:00");
const DEADLINE = new Date("2026-08-20T23:59:00+08:00");

const RECIPIENTS = [
  { name: "示範議員一", email: "demo1@example.com", roleTag: "議員" },
  { name: "示範議員二", email: "demo2@example.com", roleTag: "議員" },
  { name: "示範議員三", email: "demo3@example.com", roleTag: "議員" },
  { name: "示範列席一", email: "demo4@example.com", roleTag: "列席" },
  { name: "示範祕書處", email: "demo5@example.com", roleTag: "祕書處" },
];

/**
 * 提案刻意涵蓋不同議案類型，讓「法定表決方式提示」四種情況都看得到：
 * 法定無記名（人事同意權）、法定記名（覆議案）、法未指定（一般決議）、
 * 以及程委審定不列入議程者。
 */
const PROPOSALS = [
  {
    serialNo: 2,
    section: "報告事項",
    title: "祕書處一一五學年度第一學期工作報告",
    matterType: null,
    proposer: "祕書處",
    explanation: "報告本學期會務推動情形、議事文書處理量與待辦事項。",
    resolution: "洽悉。",
    reviewStatus: "passed",
    order: 0,
  },
  {
    serialNo: 3,
    section: "討論事項",
    title: "茲提名示範同學擔任財務部部長，請審議案",
    matterType: "consent",
    proposer: "學生會會長",
    explanation:
      "依《國立臺東大學學生會組織章程》第二十一條規定提請行使人事同意權。\n" +
      "被提名人簡歷與政見詳附件。",
    // 人事同意權：2.3 §30 法定無記名投票、出席二分之一以上
    resolution: "同意任命。出席 18 人，同意 13 票、不同意 5 票，達出席二分之一以上，通過。",
    reviewStatus: "passed",
    order: 1,
  },
  {
    serialNo: 4,
    section: "討論事項",
    title: "一一五學年度學生會總預算案，請審議案",
    matterType: "assembly-general",
    proposer: "行政中心財務部",
    explanation: "預算書、收支明細與各部會編列說明詳附件。本案依 2.3 §8② 應經三讀會議決。",
    resolution: "修正後通過。\n修正為：刪除第三項第二款，其餘照案通過。",
    reviewStatus: "passed",
    order: 2,
  },
  {
    serialNo: 5,
    section: "選舉事項",
    title: "第二十一屆學生議會正、副議長選舉案",
    matterType: "speaker-election",
    proposer: null,
    // 相對多數決無固定票數門檻，正好示範「無法換算」該長什麼樣。
    explanation:
      "依《國立臺東大學學生會組織章程》第三十三條及《國立臺東大學學生議會正、副議長產生及繼任與補選辦法》" +
      "第二條第二項，由議員以無記名投票互選之，並採相對多數決。",
    resolution: null, // 刻意留空，示範議程會印出空白的「決議：」供現場手寫
    reviewStatus: "passed",
    order: 3,
  },
  {
    serialNo: 6,
    section: "討論事項",
    title: "（示範：程序委員會審定不列入本次議程之提案）",
    matterType: null,
    proposer: "示範單位",
    explanation: "本案用來示範程委標記「不列入議程」後，該提案不會出現在議程文字上。",
    resolution: null,
    reviewStatus: "rejected",
    order: 4,
  },
];

async function drop() {
  const m = await prisma.meeting.findFirst({ where: { slug: SLUG }, select: { id: true } });
  if (m) {
    // Proposal / MeetingNotice 皆為 onDelete: Cascade，刪會議即一併清乾淨。
    await prisma.meeting.delete({ where: { id: m.id } });
    console.log("已刪除示範會議。");
  } else {
    console.log("找不到示範會議，無須刪除。");
  }
  const { count } = await prisma.recipient.deleteMany({ where: { session: DEMO_SESSION } });
  console.log(`已刪除示範收件人 ${count} 筆。`);
  const u = await prisma.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true } });
  if (u) {
    await prisma.user.delete({ where: { id: u.id } });
    console.log("已刪除示範建立者帳號。");
  }
}

async function seed() {
  // 建立者：passwordHash 為 null ＝ 白名單已建但不得登入（見 schema User.passwordHash）。
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "系統示範", role: "viewer" },
    select: { id: true },
  });

  // 示範收件人：第 0 屆、active=false，不會混進真實名冊的勾選清單。
  const recipientIds: string[] = [];
  for (const r of RECIPIENTS) {
    const existing = await prisma.recipient.findFirst({
      where: { session: DEMO_SESSION, email: r.email },
      select: { id: true },
    });
    const row = existing
      ? await prisma.recipient.update({
          where: { id: existing.id },
          data: { ...r, active: false },
          select: { id: true },
        })
      : await prisma.recipient.create({
          data: { ...r, session: DEMO_SESSION, active: false },
          select: { id: true },
        });
    recipientIds.push(row.id);
  }

  const data = {
    session: 21,
    academicYear: "115學年度第1學期",
    name: "八月議會臨時會（系統示範）",
    kind: "SPECIAL" as const,
    meetingAt: MEETING_AT,
    location: "線上視訊會議",
    // 絕不放真實 Meet 房號：這場示範可能被設為公開，真房號等於對外開門。
    meetingUrl: "https://meet.google.com/demo-only-xxx",
    docNumber: "東議字第0000000號（示範）",
    proposalDeadline: DEADLINE,
    notes:
      "二、本場為系統示範資料，提案內容與決議均為虛構，非議會實際紀錄。\n" +
      "三、示範用途：法定表決方式提示、附件檔名產生、程委審核、決議上網、通知格式複製。",
    status: "HELD" as const,
    isPublic: false,
    createdById: user.id,
  };

  const existing = await prisma.meeting.findFirst({ where: { slug: SLUG }, select: { id: true } });
  const meeting = existing
    ? await prisma.meeting.update({ where: { id: existing.id }, data, select: { id: true } })
    : await prisma.meeting.create({ data: { ...data, slug: SLUG }, select: { id: true } });

  // 提案與通知整批換掉，確保重跑結果一致。
  await prisma.proposal.deleteMany({ where: { meetingId: meeting.id } });
  await prisma.meetingNotice.deleteMany({ where: { meetingId: meeting.id } });
  for (const p of PROPOSALS) {
    await prisma.proposal.create({ data: { ...p, meetingId: meeting.id, fileUrl: null } });
  }

  // 兩種通知都生一份，示範「複製內文（含格式）」與格式預覽。
  const forNotice: MeetingForNotice = {
    session: data.session,
    academicYear: data.academicYear,
    name: data.name,
    meetingAt: data.meetingAt,
    location: data.location,
    meetingUrl: data.meetingUrl,
    docNumber: data.docNumber,
    proposalDeadline: data.proposalDeadline,
    notes: data.notes,
  };
  const listed = PROPOSALS.filter((p) => p.reviewStatus !== "rejected").length;
  for (const kind of ["agenda", "notice"] as const) {
    const g = generateNotice(forNotice, kind, {
      proposalCount: listed,
      noticeDate: NOTICE_DATE,
      audience: "議員",
      signer: "祕書處 祕書長 示範",
      contactPhone: "0900-000-000",
      contactEmail: "demo@example.com",
    });
    await prisma.meetingNotice.create({
      data: {
        meetingId: meeting.id,
        kind,
        subject: g.subject,
        bodyText: g.body,
        bodyHtml: g.html,
        recipientIds,
        createdById: user.id,
      },
    });
  }

  console.log("示範會議已就緒。");
  console.log(`  後台：/console/meetings/${SLUG}`);
  console.log(`  提案 ${PROPOSALS.length} 件（其中 1 件程委標為不列入議程）、通知 2 份、收件人 ${recipientIds.length} 位`);
  console.log("  isPublic = false；要對外展示請在後台以 admin 開啟。");
}

const run = process.argv.includes("--drop") ? drop : seed;
run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
