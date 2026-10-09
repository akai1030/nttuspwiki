/**
 * scripts/test-auth.ts · 登入與權限的測試
 *
 * 不引入測試框架，純 tsx 執行：npm run test:auth。不連資料庫、不連網。
 *   1. safeNext：登入後回跳只接受站內路徑（擋 //evil、/\evil、/%09/evil 這類開放重導）
 */
import assert from 'node:assert/strict';
import { safeNext } from '../lib/auth/safe-next';

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

console.log(`\n全部通過 · ${passed} 項`);
