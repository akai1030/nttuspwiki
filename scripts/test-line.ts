/**
 * scripts/test-line.ts · LINE 會前提醒的測試
 *
 * 不引入測試框架，純 tsx 執行：npm run test:line。不連資料庫、不連網。
 *   1. webhook 簽章：對的過、內容改一個字或簽章不對就擋
 *   2. 排程密鑰：Bearer 取值、常數時間比對
 *   3. 發送規劃：到期才發、會議開過不發、同一場只發最接近開會那則、發送中與重試上限不重發、
 *      改了會議時間以新時間重算
 *   4. retry key：同一則同一群組固定、換群組或重發時換一把、符合 UUID 格式
 *   5. 提醒狀態與訊息文字
 *   6. 原始碼檢查：webhook 先驗簽才解析與寫庫；發送端點先比密鑰；LINE 後台 action 只給 admin/officer
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { bearerToken, safeEqual, verifyLineSignature } from '../lib/line/signature';
import {
  CLAIM_TTL_MS,
  MAX_ATTEMPTS,
  isLineGroupId,
  planDispatch,
  reminderState,
  retryKeyFor,
  type PlanRow,
} from '../lib/line/plan';
import { buildReminderText, type MeetingForLine } from '../lib/line/message';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}
const ROOT = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const SECRET = 'test-channel-secret';
const sign = (body: string | Buffer) => createHmac('sha256', SECRET).update(body).digest('base64');

test('webhook 簽章：原始內容與簽章對得上才過', () => {
  const body = '{"destination":"U1","events":[{"type":"join","source":{"type":"group","groupId":"C' + 'a'.repeat(32) + '"}}]}';
  assert.equal(verifyLineSignature(body, sign(body), SECRET), true);
  assert.equal(verifyLineSignature(Buffer.from(body), sign(body), SECRET), true);
  assert.equal(verifyLineSignature(body.replace('join', 'joim'), sign(body), SECRET), false);
  assert.equal(verifyLineSignature(body, sign(body), 'other-secret'), false);
  assert.equal(verifyLineSignature(body, null, SECRET), false);
  assert.equal(verifyLineSignature(body, '', SECRET), false);
  assert.equal(verifyLineSignature(body, sign(body) + 'x', SECRET), false);
  assert.equal(verifyLineSignature(body, sign(body), ''), false);
  // 中文內容：要拿位元組算，跟 LINE 一樣
  const zh = '{"events":[{"type":"message","message":{"text":"開會"}}]}';
  assert.equal(verifyLineSignature(Buffer.from(zh, 'utf8'), sign(Buffer.from(zh, 'utf8')), SECRET), true);
});

test('排程密鑰：只接受 Bearer 格式，比對長度不同直接 false', () => {
  assert.equal(bearerToken('Bearer abc123'), 'abc123');
  assert.equal(bearerToken('bearer abc123'), 'abc123');
  assert.equal(bearerToken('Basic abc123'), '');
  assert.equal(bearerToken('Bearer a b'), '');
  assert.equal(bearerToken(null), '');
  assert.equal(safeEqual('same-secret-value', 'same-secret-value'), true);
  assert.equal(safeEqual('same-secret-value', 'same-secret-valuf'), false);
  assert.equal(safeEqual('', 'x'), false);
});

const NOW = new Date('2026-11-15T10:00:00+08:00');
const DAY = 24 * 60 * 60 * 1000;
function row(p: Partial<PlanRow> & { id: string }): PlanRow {
  return {
    meetingId: 'm1',
    meetingAt: new Date(NOW.getTime() + 2 * DAY),
    offsetDays: 3,
    attempts: 0,
    claimedAt: null,
    ...p,
  };
}

test('發送規劃：到期才發，還沒到時間、會議已開過都不發', () => {
  const p = planDispatch(
    [
      row({ id: 'due', offsetDays: 3 }), // 開會前 2 天，會前 3 天的提醒已到期
      row({ id: 'later', meetingId: 'm2', offsetDays: 1 }), // 會前 1 天，還沒到
      row({ id: 'past', meetingId: 'm3', meetingAt: new Date(NOW.getTime() - 1000), offsetDays: 1 }),
      row({ id: 'now', meetingId: 'm4', meetingAt: NOW, offsetDays: 0 }), // 開會那一刻也不發
    ],
    NOW
  );
  assert.deepEqual(p.send.map((r) => r.id), ['due']);
  assert.deepEqual(p.skip, []);
});

test('發送規劃：同一場一起到期，只發最接近開會的那則，其他略過', () => {
  const meetingAt = new Date(NOW.getTime() + 12 * 60 * 60 * 1000); // 半天後開會：7、3、1 天都到期
  const p = planDispatch(
    [
      row({ id: 'd7', offsetDays: 7, meetingAt }),
      row({ id: 'd1', offsetDays: 1, meetingAt }),
      row({ id: 'd3', offsetDays: 3, meetingAt }),
      row({ id: 'd1b', offsetDays: 1, meetingAt }), // 同一天數重複加
    ],
    NOW
  );
  assert.deepEqual(p.send.map((r) => r.id), ['d1']);
  assert.deepEqual(p.skip.map((r) => r.id).sort(), ['d1b', 'd3', 'd7']);
});

test('發送規劃：別支排程發送中、或達重試上限的不發；鎖過期可接手', () => {
  const live = new Date(NOW.getTime() - 60 * 1000);
  const stale = new Date(NOW.getTime() - CLAIM_TTL_MS - 1000);
  assert.deepEqual(planDispatch([row({ id: 'a', claimedAt: live })], NOW).send, []);
  assert.deepEqual(planDispatch([row({ id: 'a', claimedAt: stale })], NOW).send.map((r) => r.id), ['a']);
  assert.deepEqual(planDispatch([row({ id: 'a', attempts: MAX_ATTEMPTS })], NOW).send, []);
  assert.deepEqual(planDispatch([row({ id: 'a', attempts: MAX_ATTEMPTS - 1 })], NOW).send.map((r) => r.id), ['a']);
  // 最接近的那則發送中：這一場這次整個不發，較早的照樣略過（不會趁機發出舊的那則）
  const meetingAt = new Date(NOW.getTime() + 6 * 60 * 60 * 1000);
  const p = planDispatch([row({ id: 'near', offsetDays: 1, meetingAt, claimedAt: live }), row({ id: 'far', offsetDays: 3, meetingAt })], NOW);
  assert.deepEqual(p.send, []);
  assert.deepEqual(p.skip.map((r) => r.id), ['far']);
});

test('發送規劃：以會議時間重算提醒時間（會議延後，原本到期的提醒變成還沒到）', () => {
  const moved = new Date(NOW.getTime() + 10 * DAY);
  assert.deepEqual(planDispatch([row({ id: 'a', offsetDays: 3, meetingAt: moved })], NOW).send, []);
});

test('retry key：同一則同一群組固定；換群組、重發時換一把；UUID 格式', () => {
  const g1 = 'C' + '1'.repeat(32);
  const g2 = 'C' + '2'.repeat(32);
  const k = retryKeyFor('rem1', g1, null);
  assert.match(k, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(retryKeyFor('rem1', g1, null), k);
  assert.notEqual(retryKeyFor('rem1', g2, null), k);
  assert.notEqual(retryKeyFor('rem2', g1, null), k);
  assert.notEqual(retryKeyFor('rem1', g1, 'req-abc'), k);
});

test('groupId 格式：C 加 32 位十六進位，其他（含路徑字元）都不收', () => {
  assert.equal(isLineGroupId('C' + 'a1'.repeat(16)), true);
  assert.equal(isLineGroupId('U' + 'a'.repeat(32)), false);
  assert.equal(isLineGroupId('C' + 'a'.repeat(31)), false);
  assert.equal(isLineGroupId('C' + 'A'.repeat(32)), false);
  assert.equal(isLineGroupId('C' + 'a'.repeat(31) + '/'), false);
  assert.equal(isLineGroupId(undefined), false);
});

test('提醒狀態：已發、手動、略過、會議已過、失敗、重試中、到期、待發送', () => {
  const at = new Date(NOW.getTime() + 2 * DAY);
  const base = { offsetDays: 3, sentAt: null, sentVia: null, attempts: 0, lastError: null };
  assert.equal(reminderState({ ...base, sentAt: NOW, sentVia: 'line' }, at, NOW), 'sent');
  assert.equal(reminderState({ ...base, sentAt: NOW }, at, NOW), 'manual');
  assert.equal(reminderState({ ...base, sentAt: NOW, sentVia: 'skipped' }, at, NOW), 'skipped');
  assert.equal(reminderState(base, new Date(NOW.getTime() - 1), NOW), 'missed');
  assert.equal(reminderState({ ...base, attempts: MAX_ATTEMPTS, lastError: '429 x' }, at, NOW), 'failed');
  assert.equal(reminderState({ ...base, attempts: 1, lastError: '500 x' }, at, NOW), 'retrying');
  assert.equal(reminderState(base, at, NOW), 'due');
  assert.equal(reminderState({ ...base, offsetDays: 1 }, at, NOW), 'pending');
});

const MEETING: MeetingForLine = {
  id: 'cm1',
  slug: '21-115-1-1118-regular',
  name: '十一月議會常會',
  meetingAt: new Date('2026-11-18T19:00:00+08:00'),
  location: '線上視訊會議室',
  meetingUrl: 'https://meet.google.com/abc-defg-hij',
  proposalDeadline: new Date('2026-11-16T23:59:00+08:00'),
  isPublic: true,
};

test('訊息文字：會議名稱、倒數、時間、地點、連結、提案截止、公開頁連結', () => {
  const t = buildReminderText(MEETING, NOW, 'https://example.org');
  assert.match(t, /^【會前提醒】十一月議會常會\n3 天後開會\n/);
  assert.match(t, /時間：115年11月18日（星期三）晚間19:00/);
  assert.match(t, /地點：線上視訊會議室/);
  assert.match(t, /會議連結：https:\/\/meet\.google\.com\/abc-defg-hij/);
  assert.match(t, /提案截止：115年11月16日（星期一）23時59分\n/);
  assert.ok(!t.includes('（已截止）'));
  assert.match(t, /議程與會議資料：https:\/\/example\.org\/meetings\/21-115-1-1118-regular$/);
});

test('訊息文字：沒填的欄位不出現；截止已過標示；未公開不放連結；當天與隔天', () => {
  const t = buildReminderText(
    { ...MEETING, location: null, meetingUrl: '  ', isPublic: false, proposalDeadline: new Date(NOW.getTime() - 1) },
    NOW,
    'https://example.org'
  );
  assert.ok(!t.includes('地點：'));
  assert.ok(!t.includes('會議連結：'));
  assert.ok(!t.includes('議程與會議資料：'));
  assert.match(t, /（已截止）/);
  const today = buildReminderText(MEETING, new Date('2026-11-18T08:00:00+08:00'), '');
  assert.match(today, /\n今天開會\n/);
  const tomorrow = buildReminderText(MEETING, new Date('2026-11-17T23:30:00+08:00'), '');
  assert.match(tomorrow, /\n明天開會\n/);
});

test('webhook：先擋未設定與大小，驗過簽章才解析 JSON、才寫資料庫', () => {
  const src = read('app/api/line/webhook/route.ts');
  const body = src.slice(src.indexOf('export async function POST'));
  const iCfg = body.indexOf('if (!cfg) return');
  const iVerify = body.indexOf('verifyLineSignature(');
  const iParse = body.indexOf('JSON.parse(');
  const iDb = body.search(/record(Join|Leave|Seen)\(/);
  assert.ok(iCfg > 0 && iCfg < iVerify, '沒設定要先回 404');
  assert.ok(iVerify < iParse && iParse < iDb, '順序要是 驗簽 → 解析 → 寫庫');
  assert.match(body.slice(iVerify - 10, iVerify + 160), /return new Response\("Unauthorized", \{ status: 401 \}\)/);
});

test('發送端點：沒設密鑰回 404，密鑰不對回 401，都在發送之前', () => {
  const src = read('app/api/line/dispatch/route.ts');
  const iSecret = src.indexOf('if (!secret) return');
  const iCompare = src.indexOf('safeEqual(');
  const iDispatch = src.indexOf('await dispatchDueReminders(');
  assert.ok(iSecret > 0 && iSecret < iCompare && iCompare < iDispatch);
});

test('LINE 後台 action：每一支第一個 await 都是 admin/officer 守衛', () => {
  const src = read('app/(dashboard)/console/line/actions.ts');
  const fns = [...src.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)];
  assert.ok(fns.length >= 6, `只讀到 ${fns.length} 支`);
  for (const m of fns) {
    const first = m[2].match(/await [^;]+;/)?.[0] ?? '';
    assert.match(first, /^await requireRole\(\["admin", "officer"\]\);$|^const user = await requireRole\(\["admin", "officer"\]\);$/, `${m[1]}：${first}`);
  }
});

test('發送：搶鎖在推播之前，成功與 409 都寫 sentAt，失敗放掉鎖', () => {
  const src = read('lib/line/dispatch.ts');
  const loop = src.slice(src.indexOf('for (const r of plan.send)'));
  const iClaim = loop.indexOf('claimedAt: now, attempts: { increment: 1 }');
  const iPush = loop.indexOf('pushText(');
  assert.ok(iClaim > 0 && iClaim < iPush, '要先搶到才發');
  assert.match(loop, /if \(claim\.count !== 1\) continue;/);
  assert.match(loop, /res\.ok \|\| res\.status === 409/);
  assert.match(loop, /data: \{ claimedAt: null, lastError: err \}/);
  assert.match(loop, /retryKeyFor\(r\.id, group\.id, r\.lineRequestId\)/);
});

console.log(`\n全部通過 · ${passed} 項`);
