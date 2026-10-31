/**
 * scripts/test-auth.ts · 登入與權限的測試
 *
 * 不引入測試框架，純 tsx 執行：npm run test:auth。不連資料庫、不連網。
 *   1. safeNext：登入後回跳只接受站內路徑（擋 //evil、/\evil、/%09/evil 這類開放重導）
 *   2. 後台 server action 的權限：讀原始碼，確認每支匯出的 action 第一行就是守衛，
 *      動到名冊（個資）與點名（決定誰能投票）的只給 admin/officer。
 *      server action 可以被任何登入者直接 POST，畫面藏按鈕擋不住，所以守衛一定要寫在 action 裡。
 *   3. firstParam：?next=a&next=b、?q=a&q=b 這種重複參數不能讓頁面 500
 *   4. clampQuery：公開搜尋的字數上限
 *   5. parseLimit：/api/search 的 limit 取整數、1～100
 *   6. 公開議事頁的查詢：程委退回的提案不出現在公開議程（讀原始碼）
 *   7. 登入次數限制：同時送來的請求不能繞過上限（tryAttempt 先記再驗）
 *   8. 籌備時程的「N 天後／今天／N 天前」照臺北日曆日算
 *   9. 後台表單：整數超出 Postgres Int、提醒天數太大不寫進資料庫；編輯會議的必填跟建立一樣
 *  10. 投票 action：參數型別不對就退回 invalid，不丟進 Prisma（讀原始碼）
 *  11. 開表決：同一場會議同時只能有一張進行中的表決，並發也擋得住（讀原始碼）
 *  12. 成員管理：對象已被別的管理員刪掉、或同時新增同一個 email，不 500（讀原始碼）
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { safeNext } from '../lib/auth/safe-next';
import { isLimited, MAX_FAILURES, recordFailure, releaseAttempt, tryAttempt } from '../lib/auth/rate-limit';
import { daysBetween } from '../lib/meetings/timeline';
import { INT_MAX, parseIntField } from '../lib/form-int';
import { computeFireAt, MAX_REMINDER_OFFSET_DAYS } from '../lib/meetings/reminders';
import { clampQuery, firstParam, MAX_QUERY_CHARS, parseLimit } from '../lib/search-param';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

test('safeNext：站內路徑原樣放行（含查詢字串）', () => {
  assert.equal(safeNext('/console'), '/console');
  assert.equal(safeNext('/console/meetings/abc?tab=live'), '/console/meetings/abc?tab=live');
});

test('safeNext：空值、相對路徑、絕對網址退回 /console', () => {
  for (const v of [undefined, null, '', 'console', 'https://evil.example', 'javascript:alert(1)']) {
    assert.equal(safeNext(v), '/console', String(v));
  }
});

test('safeNext：會被瀏覽器解析到別的網域的寫法一律擋下', () => {
  for (const v of ['//evil.example', '/\\evil.example', '/\\/evil.example', '/\t/evil.example', '/\n/evil.example']) {
    assert.equal(safeNext(v), '/console', JSON.stringify(v));
    // 對照：瀏覽器的 URL 解析確實會把這些當成外站（證明測的是真風險）
    if (v !== '//evil.example') assert.equal(new URL(v, 'https://site.example').host, 'evil.example');
  }
});

const ACTIONS_DIR = path.join(__dirname, '..', 'app', '(dashboard)', 'console');

/** 回傳 { 函式名: 函式本體第一個 await 那一行 }。 */
function guards(file: string): Record<string, string> {
  const src = fs.readFileSync(path.join(ACTIONS_DIR, file), 'utf8');
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)) {
    const firstAwait = m[2].match(/await [^;]+;/);
    out[m[1]] = firstAwait ? firstAwait[0] : '';
  }
  return out;
}

const OFFICER = /^await require(Role\(\["admin", "officer"\]\)|Admin\(\));$/;

test('後台 action：每一支第一個 await 都是守衛', () => {
  for (const file of ['meetings/actions.ts', 'meetings/vote-actions.ts', 'members/actions.ts']) {
    const g = guards(file);
    assert.ok(Object.keys(g).length > 0, `${file} 沒有讀到任何 action`);
    for (const [fn, line] of Object.entries(g)) {
      assert.match(line, /await require(User|Role|Admin)\(/, `${file} ${fn} 沒先檢查登入`);
    }
  }
});

test('後台 action：名冊與點名只給 admin/officer（viewer 不能改）', () => {
  const g = guards('meetings/actions.ts');
  for (const fn of ['addRecipient', 'toggleRecipient', 'updateRecipient', 'deleteRecipient', 'setLiveAttendance']) {
    assert.ok(fn in g, `找不到 ${fn}`);
    assert.match(g[fn], OFFICER, `${fn} 的守衛是「${g[fn]}」`);
  }
  for (const [fn, line] of Object.entries(guards('meetings/vote-actions.ts'))) {
    assert.match(line, OFFICER, `vote-actions ${fn} 的守衛是「${line}」`);
  }
});

test('firstParam：重複參數取第一個，缺值給空字串', () => {
  assert.equal(firstParam('預算'), '預算');
  assert.equal(firstParam(['/a', '/b']), '/a');
  assert.equal(firstParam([]), '');
  assert.equal(firstParam(undefined), '');
  // 登入頁實際的組合：重複的 next 不會丟例外，也照樣過 safeNext
  assert.equal(safeNext(firstParam(['/\\evil.example', '/console/members'])), '/console');
});

test('clampQuery：超過上限的查詢截短，短的不動', () => {
  assert.equal(clampQuery('預算'), '預算');
  assert.equal(clampQuery('預'.repeat(5000)).length, MAX_QUERY_CHARS);
});

test('parseLimit：取整數、1～100，其他用預設值', () => {
  assert.equal(parseLimit(null), 30);
  assert.equal(parseLimit(''), 30);
  assert.equal(parseLimit('abc'), 30);
  assert.equal(parseLimit('0.5'), 30); // 以前會變成 LIMIT 0.5 → 0 筆
  assert.equal(parseLimit('-3'), 30);
  assert.equal(parseLimit('2.7'), 2);
  assert.equal(parseLimit('1e9'), 100);
  assert.equal(parseLimit('Infinity'), 30);
  assert.equal(parseLimit('15'), 15);
});

test('公開議事頁：程委退回（rejected）的提案不列入公開議程', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'meetings', 'queries.ts'), 'utf8');
  for (const fn of ['getPublicMeetingByKey', 'getLiveMeetingByKey']) {
    const body = src.match(new RegExp(`export function ${fn}\\([\\s\\S]*?\\n\\}`));
    assert.ok(body, `找不到 ${fn}`);
    const proposals = body[0].match(/proposals: \{[\s\S]*?select:/);
    assert.ok(proposals, `${fn} 沒有選 proposals`);
    assert.match(proposals[0], /where: \{ reviewStatus: \{ not: "rejected" \} \}/, `${fn} 的 proposals 沒排除 rejected`);
  }
});

test('登入次數限制：30 個同時送來的請求只放 8 個去驗證', () => {
  // 模擬 30 個請求都在第一個 await（查資料庫、算 scrypt）結束前進來。
  // 舊寫法（isLimited 檢查、驗完失敗才 recordFailure）在這個時間點 30 個都會通過檢查。
  assert.equal(Array.from({ length: 30 }, () => isLimited(['test:old'])).filter((x) => !x).length, 30);
  const admitted = Array.from({ length: 30 }, () => tryAttempt([['test:new', MAX_FAILURES]])).filter(Boolean).length;
  assert.equal(admitted, MAX_FAILURES);
  // 兩個登入入口都要用 tryAttempt，不能退回先查後記
  for (const f of ['app/api/auth/login/route.ts', 'app/vote/actions.ts']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.match(src, /tryAttempt\(/, `${f} 沒用 tryAttempt`);
    assert.doesNotMatch(src, /isLimited\(|recordFailure\(/, `${f} 又用了先查後記`);
  }
});

test('登入次數限制：成功退回的那次不影響之前的失敗紀錄', () => {
  recordFailure(['test:ip']);
  recordFailure(['test:ip']);
  assert.ok(tryAttempt([['test:ip', 3]])); // 第 3 次，放行並先記
  assert.ok(!tryAttempt([['test:ip', 3]])); // 已滿 3
  releaseAttempt(['test:ip']); // 那次驗證成功，退回
  assert.ok(tryAttempt([['test:ip', 3]])); // 之前的 2 次還在，只剩 1 次額度
  assert.ok(!tryAttempt([['test:ip', 3]]));
  // 兩把鑰匙任一把滿了就整個不放，也不替另一把記數
  assert.ok(!tryAttempt([['test:other', 8], ['test:ip', 3]]));
  assert.ok(!isLimited(['test:other'], 1));
});

test('籌備時程：天數差照臺北的日曆日算，不照時數四捨五入', () => {
  const tw = (s: string) => new Date(`${s}+08:00`);
  // 早上 6 點看當天晚上 7 點的會議：今天（舊算法差 13 小時會四捨五入成 1 天後）
  assert.equal(daysBetween(tw('2026-10-16T06:00'), tw('2026-10-16T19:00')), 0);
  // 前一晚 23 點的期限，隔天早上 10 點看：1 天前（舊算法 11 小時四捨五入成今天）
  assert.equal(daysBetween(tw('2026-10-16T10:00'), tw('2026-10-15T23:00')), -1);
  // 跨日：23:59 看隔天 00:01 是 1 天後
  assert.equal(daysBetween(tw('2026-10-16T23:59'), tw('2026-10-17T00:01')), 1);
  // 跨月、跨年
  assert.equal(daysBetween(tw('2026-12-31T12:00'), tw('2027-01-07T09:00')), 7);
  // 臺北日期跟 UTC 日期不同的時段（臺北 07:00＝UTC 前一天 23:00）
  assert.equal(daysBetween(tw('2026-10-16T07:00'), tw('2026-10-16T08:30')), 0);
});

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('parseIntField：取整數，超出 Postgres Int 或不是數字就用 fallback', () => {
  assert.equal(parseIntField('21'), 21);
  assert.equal(parseIntField('3.9'), 3);
  assert.equal(parseIntField('-2'), -2);
  assert.equal(parseIntField(String(INT_MAX)), INT_MAX);
  for (const v of ['3000000000', '1e12', '-3000000000', 'abc', 'Infinity', 'NaN']) {
    assert.equal(parseIntField(v, 7), 7, v);
  }
  assert.equal(parseIntField(''), 0); // 空字串＝0，createMeeting／updateMeeting 會當成沒填退回
});

test('會前提醒：上限天數算得出日期；addReminder 擋負數與超過上限', () => {
  const at = new Date('2026-10-16T19:00+08:00');
  assert.ok(!Number.isNaN(computeFireAt(at, MAX_REMINDER_OFFSET_DAYS).getTime()));
  assert.ok(Number.isNaN(computeFireAt(at, INT_MAX).getTime())); // 沒有上限時會寫進 Invalid Date
  const src = read('app/(dashboard)/console/meetings/actions.ts');
  const add = src.slice(src.indexOf('export async function addReminder'));
  const guard = add.slice(0, add.indexOf('prisma.'));
  assert.match(guard, /int\(fd, "offsetDays", -1\)/); // 解析失敗要被擋，不能落到 0 天
  assert.match(guard, /offsetDays < 0 \|\| offsetDays > MAX_REMINDER_OFFSET_DAYS/);
});

test('編輯會議：屆別、學年度、名稱、時間跟建立時一樣必填', () => {
  const src = read('app/(dashboard)/console/meetings/actions.ts');
  const upd = src.slice(src.indexOf('export async function updateMeeting'), src.indexOf('export async function toggleMeetingPublic'));
  const guard = upd.slice(0, upd.indexOf('prisma.meeting.update'));
  assert.match(guard, /!id \|\| !meetingAt \|\| session <= 0 \|\| !academicYear \|\| !name/);
  // 編輯頁從 id 轉到 slug 時保留 error，退回的訊息才看得到
  assert.match(read('app/(dashboard)/console/meetings/[slug]/edit/page.tsx'), /edit\$\{err \? `\?error=/);
});

test('投票 action：參數型別不對直接退回 invalid', () => {
  const src = read('app/v/[token]/actions.ts');
  const body = src.slice(src.indexOf('export async function castVote'));
  const first = body.slice(0, body.indexOf('await '));
  for (const k of ['voteId', 'optionId']) assert.match(first, new RegExp(`typeof ${k} !== "string"`), k);
  assert.match(first, /token !== null && typeof token !== "string"/);
});

test('開表決：交易裡先鎖會議列再數進行中的表決，才建立', () => {
  const src = read('app/(dashboard)/console/meetings/vote-actions.ts');
  const body = src.slice(src.indexOf('export async function openVote'), src.indexOf('async function voteMeeting'));
  const tx = body.slice(body.indexOf('prisma.$transaction'));
  const lock = tx.indexOf('FOR UPDATE');
  const count = tx.indexOf('tx.vote.count');
  const create = tx.indexOf('tx.vote.create');
  assert.ok(lock > 0 && lock < count && count < create, '順序要是 鎖 → 數 → 建');
  assert.match(tx.slice(0, lock), /FROM "Meeting" WHERE "id" = \$\{m\.id\}/);
  assert.ok(!/prisma\.vote\.create/.test(body), '建立要在交易裡（tx），不能用外面的 prisma');
});

test('成員管理：改密碼／改角色／刪除找不到人不 500，並發新增撞唯一鍵照重複處理', () => {
  const src = read('app/(dashboard)/console/members/actions.ts');
  // update／delete 找不到列會丟 P2025；名單頁開著時另一位管理員可能已經刪掉這個人
  assert.ok(!/prisma\.user\.(update|delete)\(/.test(src), '用 updateMany／deleteMany');
  const create = src.slice(src.indexOf('export async function createMember'), src.indexOf('export async function resetMemberPassword'));
  assert.match(create, /e\.code === "P2002"\) redirect\(`\$\{BASE\}\?err=dup`\)/);
});

console.log(`\n全部通過 · ${passed} 項`);
