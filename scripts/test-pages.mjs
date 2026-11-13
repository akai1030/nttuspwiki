/**
 * 頁面實跑測試：要先 next build。目前測找不到頁面（app/not-found.tsx）。
 * 起 next start、打一個不存在的網址，確認回 404、是中文頁（lang、標題、回站內的連結），不是 Next 內建的英文 404。
 * 不存在的網址在路由層就判定，不查資料庫，所以 CI 用佔位 DATABASE_URL 也跑得動。
 *
 *   npm run build && npm run test:pages
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.TEST_PORT ?? '3199';
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn(path.join(root, 'node_modules', '.bin', 'next'), ['start', '-p', PORT, '-H', '127.0.0.1'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'inherit'],
});

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${BASE}/robots.txt`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('next start 30 秒內沒起來');
}

let passed = 0;
try {
  await waitReady();

  const res = await fetch(`${BASE}/no-such-page-${Date.now()}`);
  const html = await res.text();
  assert.equal(res.status, 404, '要回 404');
  assert.match(html, /<html lang="zh-Hant"/, '要在站內 layout 裡（有 lang）');
  assert.match(html, /<h1[^>]*>找不到這一頁<\/h1>/, '要有中文 h1「找不到這一頁」');
  assert.doesNotMatch(html, /This page could not be found/, '不能是 Next 內建的英文 404');
  for (const href of ['/law', '/search', '/']) {
    assert.match(html, new RegExp(`href="${href}"`), `要有回 ${href} 的連結`);
  }
  assert.match(html, /<meta name="robots" content="noindex/, '找不到頁不讓搜尋引擎收錄');
  passed++;
  console.log('  ✓ 不存在的網址：404、中文找不到頁、附回全部法規／搜尋／首頁的連結');
} finally {
  server.kill();
}
console.log(`\n全部通過 · ${passed} 項`);
