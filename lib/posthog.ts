/**
 * PostHog（2026-10-04，昀楷：轉駅各站共用一個 PostHog 專案，EU 機房）。看流量、操作方式（熱點、錄影）與前端錯誤。
 *
 * 只在瀏覽器呼叫（components/PostHogTracker.tsx）。posthog-js 用動態 import 載入，
 * 不符合條件的瀏覽器連程式都不下載。
 *
 * 不啟用：
 *   - 網域不是正式站（本機、預覽一律不送，免得灌假資料進共用專案）
 *   - 在不記的路徑（EXCLUDED）：/console、/login、/v/、/vote、/styleguide
 *   - 這個瀏覽器開過 /console（NO_TRACK_KEY）：幹部自己的操作不算進數字
 *   - 瀏覽器送出 Global Privacy Control 或 Do Not Track
 *
 * 已啟用後才換到不記的路徑（網站多半是整頁載入，只有表單送出後的轉址會在同一頁換）：
 *   - /console：opt_out_capturing()（PostHog 記在瀏覽器）＋ 寫 NO_TRACK_KEY，之後整站不送
 *   - 其他：暫停錄影、丟掉事件（before_send），回到公開頁再繼續
 * 兩道保險：/v/<權杖> 在任何網址字串裡都遮掉；不記的頁面最外層加 ph-no-capture（錄影只留空白框）。
 *
 * 不送任何識別資料：不呼叫 identify，事件不帶 email、學號、姓名。
 */

import type { CaptureResult, PostHog } from "posthog-js";

const TOKEN = "phc_yZUKsvCpCgWyzLLzGQbsvsxp2YegZEw4bU8CTbdyLwXz";
const PROD_HOSTS = ["nttuspcodex.zeabur.app"];

/** 不記的路徑。/v/<權杖> 是發給議員個人的投票連結，網址本身就是憑證，絕對不能送出去 */
const EXCLUDED = ["/console", "/login", "/v/", "/vote", "/styleguide"];
const ADMIN = "/console";
/** 開過後台的瀏覽器從此不記（存 localStorage，清除瀏覽器資料才會消失） */
export const NO_TRACK_KEY = "nttuspwiki:no-track";

/** 網址參數：/login?next= 會帶著後台路徑，遮掉 */
const SENSITIVE_PARAMS = ["next"];
const PARAM_RE = new RegExp(`([?&](?:${SENSITIVE_PARAMS.join("|")})=)[^&#"'\\s]*`, "g");
const VOTE_TOKEN_RE = /\/v\/[^/?#"'\s]+/g;

let ph: PostHog | null = null;
let loading = false;
let paused = false;

function matches(pathname: string, prefix: string): boolean {
  return prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isExcluded(pathname: string): boolean {
  return EXCLUDED.some((p) => matches(pathname, p));
}

function noTrack(): boolean {
  try {
    return window.localStorage.getItem(NO_TRACK_KEY) === "1";
  } catch {
    return false;
  }
}

function markNoTrack(): void {
  try {
    window.localStorage.setItem(NO_TRACK_KEY, "1");
  } catch {
    /* 存不進去就算了 */
  }
}

function privacySignal(): boolean {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
    const w = window as Window & { doNotTrack?: string };
    return (
      nav.globalPrivacyControl === true ||
      nav.doNotTrack === "1" ||
      nav.doNotTrack === "yes" ||
      nav.msDoNotTrack === "1" ||
      w.doNotTrack === "1"
    );
  } catch {
    return false;
  }
}

function maskUrl(s: string): string {
  return s.replace(VOTE_TOKEN_RE, "/v/<masked>").replace(PARAM_RE, "$1<masked>");
}

/** 在不記的頁面一律丟掉；其餘事件裡所有字串屬性（網址、來源、點擊的連結）遮掉投票權杖與 next */
function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  if (paused || isExcluded(window.location.pathname)) return null;
  const mask = (bag: Record<string, unknown> | undefined) => {
    if (!bag) return;
    for (const [k, v] of Object.entries(bag)) {
      if (typeof v === "string" && (v.includes("/v/") || v.includes("="))) bag[k] = maskUrl(v);
    }
  };
  mask(event.properties);
  mask(event.$set as Record<string, unknown> | undefined);
  mask(event.$set_once as Record<string, unknown> | undefined);
  return event;
}

function allowed(pathname: string): boolean {
  return PROD_HOSTS.includes(window.location.hostname) && !isExcluded(pathname) && !noTrack() && !privacySignal();
}

/** 每次換頁呼叫（PostHogTracker） */
export function syncPostHog(pathname: string): void {
  try {
    if (matches(pathname, ADMIN)) {
      markNoTrack();
      ph?.opt_out_capturing();
      paused = true;
      return;
    }
    if (isExcluded(pathname)) {
      if (ph && !paused) {
        paused = true;
        ph.stopSessionRecording();
      }
      return;
    }
    if (ph) {
      if (paused && !noTrack()) {
        paused = false;
        ph.startSessionRecording(); // 不帶參數：照專案設定，只是撤掉剛才的暫停
      }
      return;
    }
    if (loading || !allowed(pathname)) return;
    loading = true;
    import("posthog-js")
      .then(({ default: posthog }) => {
        loading = false;
        if (!allowed(window.location.pathname)) return;
        posthog.init(TOKEN, {
          api_host: "/ingest", // next.config.mjs 的 rewrites 轉送到 eu.i.posthog.com；proxy.ts 先拿掉 cookie 與 referer
          ui_host: "https://eu.posthog.com",
          person_profiles: "identified_only", // 不 identify 任何人，匿名事件
          capture_pageview: "history_change",
          capture_pageleave: true, // 停留時間
          capture_exceptions: true, // 前端錯誤
          respect_dnt: true, // 上面已經擋過，留著當第二道
          // 訪客編號只存在本站網域，轉駅各站一致（2026-10）。zeabur.app 在公共後綴清單（Public Suffix List）上，
          // 瀏覽器本來就不准把 cookie 設在 .zeabur.app，這站從沒跟別站共用；寫明是為了之後換成自己的網域也不會共用
          cross_subdomain_cookie: false,
          session_recording: {
            maskAllInputs: true,
            // 錄影裡記下的網址（換頁、網路請求）一樣遮掉投票權杖
            maskCapturedNetworkRequestFn: (req) => ({ ...req, name: maskUrl(req.name) }),
          },
          mask_personal_data_properties: true,
          custom_personal_data_properties: SENSITIVE_PARAMS,
          before_send: beforeSend,
        });
        ph = posthog;
      })
      .catch(() => {
        loading = false; // 被擋或斷線：不影響畫面
      });
  } catch {
    /* 量測壞了不影響畫面 */
  }
}
