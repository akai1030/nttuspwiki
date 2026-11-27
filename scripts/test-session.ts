/**
 * scripts/test-session.ts · 後台 session 要對資料庫
 *
 * node --import tsx scripts/test-session.ts。不連資料庫、不連網（查詢函式用假的）。
 *   1. 資料庫查不到這個人（已被刪除）→ 當作未登入
 *   2. 角色、姓名、email 以資料庫為準，不用 JWT 裡登入當下的值
 *   3. readSession 真的有走這道檢查（讀原始碼），guard.ts 與登入頁都經過 readSession
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { withCurrentUser, type UserRow } from '../lib/auth/current-user';
import type { SessionPayload } from '../lib/auth/token';

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

const jwt: SessionPayload = { sub: 'u1', email: 'old@example.test', role: 'admin', name: '舊名字' };
const db = (rows: Record<string, UserRow>) => async (id: string) => rows[id] ?? null;

(async () => {
  await test('已被刪除的成員：簽章還有效也當作未登入', async () => {
    assert.equal(await withCurrentUser(jwt, db({})), null);
  });

  await test('被降級的成員：角色立即照資料庫（admin → viewer）', async () => {
    const s = await withCurrentUser(jwt, db({ u1: { email: 'old@example.test', role: 'viewer', name: '舊名字' } }));
    assert.equal(s?.role, 'viewer');
    assert.equal(s?.sub, 'u1');
  });

  await test('姓名、email 以資料庫為準；資料庫沒填姓名就是 undefined', async () => {
    const s = await withCurrentUser(jwt, db({ u1: { email: 'new@example.test', role: 'officer', name: null } }));
    assert.deepEqual(s, { sub: 'u1', email: 'new@example.test', role: 'officer', name: undefined });
  });

  await test('查的是 JWT 的 sub，不是 email', async () => {
    const seen: string[] = [];
    await withCurrentUser(jwt, async (id) => (seen.push(id), null));
    assert.deepEqual(seen, ['u1']);
  });

  await test('readSession 驗完簽章後經過 withCurrentUser；守衛與登入頁都用 readSession', () => {
    const root = path.join(__dirname, '..');
    const session = fs.readFileSync(path.join(root, 'lib/auth/session.ts'), 'utf8');
    const body = session.slice(session.indexOf('export async function readSession'));
    assert.match(body, /verifySession\(token\)[\s\S]*withCurrentUser\(payload, findUser\)/);
    const guard = fs.readFileSync(path.join(root, 'lib/auth/guard.ts'), 'utf8');
    assert.match(guard, /await readSession\(\)/);
    assert.doesNotMatch(guard, /verifySession/);
    const login = fs.readFileSync(path.join(root, 'app/login/page.tsx'), 'utf8');
    assert.match(login, /await readSession\(\)/);
  });

  console.log(`\n全部通過 · ${passed} 項`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
