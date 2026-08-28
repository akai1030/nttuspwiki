/**
 * 剪貼簿：同時寫入 text/html 與 text/plain，讓內容貼進 Gmail 撰寫視窗時保留格式。
 *
 * 設計上的兩個刻意選擇：
 *
 * 1. **同步決定路徑**。能不能走 rich 在 await 之前就判斷完；write() 失敗後
 *    不再嘗試第二次寫入 —— 那時已離開使用者手勢（user activation）視窗，
 *    Firefox / Safari 會直接再拒絕一次，結果只是把一次失敗變成兩次。
 *    失敗就誠實回報 "failed"，由 UI 引導改按「純文字」那顆。
 *
 * 2. **不做 contenteditable + execCommand 的舊式退路**。那條路要 innerHTML
 *    塞進 DOM，等於在自己的信任邊界上開一個洞（<img onerror> 會執行），
 *    而它唯一的受眾是「非 secure context」——localhost 本來就算 secure context，
 *    正式站是 HTTPS，實務上打不到。
 */
export type CopyResult = "rich" | "plain" | "failed";

export async function copyRich(text: string, html?: string): Promise<CopyResult> {
  const canRich =
    Boolean(html) &&
    typeof ClipboardItem !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.write === "function";

  if (canRich) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html!], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return "rich";
    } catch {
      return "failed";
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "plain";
  } catch {
    return "failed";
  }
}
