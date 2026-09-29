/**
 * 線上表決的純邏輯自檢（不連資料庫）。
 *   npm run verify:voting
 *
 * 檢查（任一不過就 exit 1）：
 *   1. 每一筆法定表決方式都判得出記名／無記名，且與條文用詞一致
 *      （法規用「無記名」「不記名」「記名」三種寫法；判錯就會開出違法的表決）
 *   2. 投票連結：同一人同一版本簽得出、驗得過；換版本、換人、改一個字都驗不過
 *   3. 候選人名單解析、票數統計、寫進決議欄的那句話
 */
import { VOTE_RULES } from "@/lib/meetings/vote-rules";
import { parseCandidates, resolutionLine, secretFromLawMethod, summarize } from "@/lib/meetings/voting";
import { gmailComposeUrl, parseVoteToken, verifyVoteSig, voteToken } from "@/lib/meetings/vote-link";
import { buildBody, type MeetingForNotice } from "@/lib/meetings/notice";
import { normStudentId, phoneLast4 } from "@/lib/meetings/voter-login";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${name}`);
  else {
    failed++;
    console.log(`✗ ${name}${detail ? `：${detail}` : ""}`);
  }
}

// 1. 法定表決方式：逐案寫死預期（人工讀條文確認過），不拿同一套規則驗自己。
//    vote-rules.json 新增了有表決方式的條目而這裡沒登記，也算失敗 —— 逼人回來讀條文。
const EXPECTED: Record<string, boolean> = {
  consent: true, // 2.3 §30「無記名投票」
  reconsider: false, // 2.3 §35「記名投票」
  impeach: true, // 2.6 §3「不記名投票」
  "speaker-election": true, // 2.7 §2「無記名投票」
  "committee-chair-election": true, // 2.1 §4「無記名投票」
};
for (const r of VOTE_RULES) {
  const got = secretFromLawMethod(r.method);
  const label = got === null ? "主席選定" : got ? "無記名" : "記名";
  if (r.method === null) check(`${r.id}（法未指定）→ ${label}`, got === null);
  else check(`${r.id}（${r.method}）→ ${label}`, r.id in EXPECTED && got === EXPECTED[r.id], r.id in EXPECTED ? "" : "未登記於 EXPECTED");
}

// 2. 投票連結
process.env.AUTH_SECRET ??= "verify-voting-secret-0123456789";
const id = "cm1abcdefghijklmnopqrstu";
const t = voteToken(id, 1);
const p = parseVoteToken(t);
check("連結格式可解析", !!p && p.recipientId === id);
check("同人同版本驗得過", !!p && verifyVoteSig(id, 1, p.sig));
check("作廢重發（版本 +1）後舊連結驗不過", !!p && !verifyVoteSig(id, 2, p.sig));
check("換成別人的 id 驗不過", !!p && !verifyVoteSig("cm1zzzzzzzzzzzzzzzzzzzzz", 1, p.sig));
const flipped = t.slice(0, -1) + (t.endsWith("A") ? "B" : "A");
const pf = parseVoteToken(flipped);
check("簽章改一個字驗不過", !pf || !verifyVoteSig(id, 1, pf.sig));
check("亂七八糟的字串解析失敗", parseVoteToken("../../etc/passwd") === null && parseVoteToken("") === null);
const gm = new URL(gmailComposeUrl("a@example.com", "主旨", "第一行\n第二行 https://x/v/y"));
check("Gmail 撰寫網址帶齊收件人、主旨、內文", gm.searchParams.get("to") === "a@example.com" && gm.searchParams.get("su") === "主旨" && gm.searchParams.get("body") === "第一行\n第二行 https://x/v/y");

// 3. 候選人、統計、決議句
const c1 = parseCandidates("  王小明\n\n李小華\n王小明\n");
check("候選人去空白、去重複", c1.ok && c1.names.join(",") === "王小明,李小華");
check("沒有候選人回錯誤", !parseCandidates("\n \n").ok);
check("超過 20 位回錯誤", !parseCandidates(Array.from({ length: 21 }, (_, i) => `候選人${i}`).join("\n")).ok);

const s = summarize(
  [
    { id: "b", label: "不同意", order: 1, count: 3 },
    { id: "a", label: "同意", order: 0, count: 10 },
  ],
  15,
  13
);
check("廢票＝出席 − 投票", s.notVoted === 2);
check("選項依原順序", s.options[0].label === "同意");
check("票數核對一致", s.consistent);
check("票數核對不一致會被抓到", !summarize([{ id: "a", label: "同意", order: 0, count: 5 }], 10, 6).consistent);
check(
  "表決的決議句",
  resolutionLine("motion", true, s) === "表決結果（無記名投票）：出席 15 人，同意 10 票、不同意 3 票，未投票（廢票）2 人。",
  resolutionLine("motion", true, s)
);
const e = summarize(
  [
    { id: "x", label: "甲", order: 0, count: 2 },
    { id: "y", label: "乙", order: 1, count: 5 },
  ],
  8,
  7
);
check(
  "選舉的決議句依得票排序",
  resolutionLine("election", false, e) === "選舉結果（記名投票）：出席 8 人，乙 5 票、甲 2 票，未投票（廢票）1 人。",
  resolutionLine("election", false, e)
);

// 4. /vote 登入的比對規則、開會通知的網址行
check("學號去空白、轉大寫", normStudentId(" b110 11001 ") === "B11011001");
check("手機末四碼：連字號、空白、+886 都只取數字", phoneLast4("0912-345-678") === "5678" && phoneLast4("0922 111 222") === "1222" && phoneLast4("+886933000333") === "0333");
check("沒有手機或太短回 null", phoneLast4(null) === null && phoneLast4("12") === null);
const meeting: MeetingForNotice = {
  session: 21, kind: "SPECIAL", academicYear: "115學年度第1學期", name: "十月議會臨時會",
  meetingAt: new Date("2026-10-20T19:00:00+08:00"), location: null, meetingUrl: "https://meet.google.com/abc",
  docNumber: null, proposalDeadline: null, notes: null,
};
const withUrl = buildBody(meeting, "notice", { voteUrl: "https://nttuspcodex.zeabur.app/vote" });
const without = buildBody(meeting, "notice");
check("通知附網址：緊接在會議連結下一行", withUrl.includes("會議連結：https://meet.google.com/abc\n線上表決：https://nttuspcodex.zeabur.app/vote（以學號及手機末四碼登入）"));
check("沒給網址時通知內文與原本完全相同", without === withUrl.replace("\n線上表決：https://nttuspcodex.zeabur.app/vote（以學號及手機末四碼登入）", ""));

console.log(failed ? `\n${failed} 項未通過` : "\n全部通過");
process.exit(failed ? 1 : 0);
