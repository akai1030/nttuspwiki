"use client";

/**
 * PrintButton — 把一段純文字文件（議程/開會通知）開成乾淨的可列印頁面 → 使用者列印或「另存為 PDF」。
 * 用瀏覽器列印（零相依、CJK 字型由系統處理，Zeabur 免裝 headless Chrome/字型檔）。
 */
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return ch;
    }
  });
}

export function PrintButton({
  heading,
  body,
  label = "PDF／列印",
  filename = "文件",
}: {
  heading: string;
  body: string;
  label?: string;
  filename?: string;
}) {
  function open() {
    const w = window.open("", "_blank", "width=840,height=1000");
    if (!w) {
      window.alert("請允許本站開啟彈出視窗，才能列印／存 PDF。");
      return;
    }
    const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<title>${esc(filename)}</title>
<style>
  @page { margin: 2.2cm 2cm; }
  html,body { margin:0; padding:0; }
  body { font-family:"Noto Serif TC","Songti TC","PMingLiU","MingLiU",serif; color:#111; font-size:12.5pt; line-height:1.95; }
  .doc { max-width:52em; margin:0 auto; padding:1.5cm; }
  h1 { font-size:15pt; font-weight:700; text-align:center; letter-spacing:.02em; margin:0 0 1.3em; }
  pre { white-space:pre-wrap; word-break:break-word; font-family:inherit; font-size:inherit; margin:0; }
  @media screen { body { background:#f2f2f2; } .doc { background:#fff; margin:1.5cm auto; box-shadow:0 1px 12px rgba(0,0,0,.12); } }
</style></head>
<body onload="window.focus();window.print();">
  <div class="doc">${heading ? `<h1>${esc(heading)}</h1>` : ""}<pre>${esc(body)}</pre></div>
</body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <button
      type="button"
      onClick={open}
      className="border border-line px-3 py-1.5 font-ui text-caption font-medium leading-none tracking-snug text-ink transition-colors hover:border-accent hover:text-accent"
    >
      {label}
    </button>
  );
}
