/**
 * scripts/test-auth.ts · 登入與權限的測試
 *
 * 不引入測試框架，純 tsx 執行：npm run test:auth。不連資料庫、不連網。
 *   1. safeNext：登入後回跳只接受站內路徑（擋 //evil、/\evil、/%09/evil 這類開放重導）
 *   2. 後台 server action 的權限：讀原始碼，確認每支匯出的 action 第一行就是守衛，
 *      動到名冊（個資）與點名（決定誰能投票）的只給 admin/officer。
 *      server action 可以被任何登入者直接 POST，畫面藏按鈕擋不住，所以守衛一定要寫在 action 裡。
 *   3. firstParam：?next=a&next=b、?q=a&q=b 這種重複參數不能讓頁面 500
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { safeNext } from '../lib/auth/safe-next';
import { firstParam } from '../lib/search-param';

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

console.log(`\n全部通過 · ${passed} 項`);
