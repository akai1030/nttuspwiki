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
  order: number;
};

export type MeetingForAgenda = {
  session: number;
  name: string;
  meetingAt: Date;
  location: string | null;
  meetingUrl: string | null;
};

const CASE_SECTIONS = new Set(["討論事項", "選舉事項"]);

export function buildAgendaText(m: MeetingForAgenda, proposals: ProposalForAgenda[]): string {
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
        lines.push(`　　決議：`);
      });
    } else {
      items.forEach((p, i) => {
        lines.push(`　${zhParenIndex(i + 1)}${p.title}`);
        if (p.explanation?.trim()) lines.push(`　　　${p.explanation.trim()}`);
      });
    }
    lines.push("");
  }

  if (sectionIdx === 0) {
    lines.push("（尚無提案，請先新增提案後再生成議程。）");
  }

  return lines.join("\n").trimEnd() + "\n";
}
