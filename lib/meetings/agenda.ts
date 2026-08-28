/**
 * 議程（附件1）文字生成 — 依提案的 section 分節、按《會議規範》順序排列。
 * 產出純文字供複製/檢視；討論、選舉類用「第N案」，報告、臨時動議類用（一）（二）。
 */
import { AGENDA_SECTIONS, zhNumber, zhParenIndex } from "./sections";
import { rocDateTimeFull } from "./roc";

export type ProposalForAgenda = {
  section: string;
  serialNo: number;
  title: string;
  proposer: string | null;
  explanation: string | null;
  /** 決議（會後補）。未填時討論/選舉類仍印空白的「決議：」供現場手寫。 */
  resolution: string | null;
  /** 程委審核狀態。只排除 rejected；pending 照舊列入，故既有資料輸出不變。 */
  reviewStatus?: string;
  order: number;
};

/** 決議可能多行；第一行接在「決議：」後，其餘行對齊縮排。 */
function resolutionLines(text: string, indent: string): string[] {
  const [first, ...rest] = text.split("\n");
  return [`${indent}決議：${first}`, ...rest.map((t) => `${indent}　　${t}`)];
}

export type MeetingForAgenda = {
  session: number;
  name: string;
  meetingAt: Date;
  location: string | null;
  meetingUrl: string | null;
};

const CASE_SECTIONS = new Set(["討論事項", "選舉事項"]);

export function buildAgendaText(m: MeetingForAgenda, all: ProposalForAgenda[]): string {
  // 程序委員會審定不列入者不出現在議程（2.3 §9② 應先送程序委員會）。
  const proposals = all.filter((p) => p.reviewStatus !== "rejected");
  const lines: string[] = [];
  lines.push(`國立臺東大學第${zhNumber(m.session)}屆議會 ${m.name} 議程`);
  lines.push("");
  lines.push(`會議時間：${rocDateTimeFull(m.meetingAt)}`);
  if (m.location?.trim()) lines.push(`會議地點：${m.location.trim()}`);
  if (m.meetingUrl?.trim()) lines.push(`會議連結：${m.meetingUrl.trim()}`);
  lines.push("");

  // 依 AGENDA_SECTIONS 順序分節；未知 section 收在最後。
  const known = AGENDA_SECTIONS as readonly string[];
  const seen = new Set<string>();
  const ordered = [...known, ...proposals.map((p) => p.section).filter((s) => !known.includes(s))];

  let sectionIdx = 0;
  for (const section of ordered) {
    if (seen.has(section)) continue;
    seen.add(section);
    const items = proposals
      .filter((p) => p.section === section)
      .sort((a, b) => a.order - b.order || a.serialNo - b.serialNo);
    if (items.length === 0) continue;

    sectionIdx += 1;
    lines.push(`${zhNumber(sectionIdx)}、${section}`);

    if (CASE_SECTIONS.has(section)) {
      items.forEach((p, i) => {
        lines.push(`　第${zhNumber(i + 1)}案`);
        lines.push(`　　案由：${p.title}`);
        if (p.proposer?.trim()) lines.push(`　　提案人：${p.proposer.trim()}`);
        if (p.explanation?.trim()) lines.push(`　　說明：${p.explanation.trim()}`);
        const res = p.resolution?.trim();
        if (res) lines.push(...resolutionLines(res, "　　"));
        else lines.push(`　　決議：`);
      });
    } else {
      items.forEach((p, i) => {
        lines.push(`　${zhParenIndex(i + 1)}${p.title}`);
        if (p.explanation?.trim()) lines.push(`　　　${p.explanation.trim()}`);
        // 報告事項類原本不印決議；有填才印，未填維持原樣（輸出不變）。
        const res = p.resolution?.trim();
        if (res) lines.push(...resolutionLines(res, "　　　"));
      });
    }
    lines.push("");
  }

  if (sectionIdx === 0) {
    lines.push("（尚無提案，請先新增提案後再生成議程。）");
  }

  return lines.join("\n").trimEnd() + "\n";
}
