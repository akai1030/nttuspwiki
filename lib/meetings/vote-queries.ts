/**
 * 線上表決的資料讀取。
 *
 * 誰看得到什麼（同一份資料，依 audience 裁切）：
 *   console（祕書處，已登入）：全部表決（含作廢），進行中可看「還沒投的人」，截止後看票數。
 *   public（看板、公開頁）：只有進行中與已截止的表決；進行中只給「已投幾人」，不給票數。
 *   兩者：記名表決截止後列出每位議員投了什麼；無記名永遠只有票數。
 *
 * 進行中不給任何人看票數（含祕書處）：邊投邊看得到數字，會讓人跟票，
 * 也能從「誰剛投完、哪一項加一」反推無記名的選擇。
 */
import { prisma } from "@/lib/db";
import { idList, summarize, type VoteKind, type VoteStatus, type VoteSummary } from "./voting";
import { verifyVoteSig, parseVoteToken } from "./vote-link";

export type VoteView = {
  id: string;
  kind: VoteKind;
  secret: boolean;
  title: string;
  seats: number | null;
  status: VoteStatus;
  proposalId: string | null;
  matterType: string | null;
  openedAt: Date;
  closedAt: Date | null;
  eligibleCount: number;
  castCount: number;
  /** 截止後才有。 */
  summary: VoteSummary | null;
  /** 記名表決截止後：每個選項投給它的議員。 */
  named: { label: string; names: string[] }[] | null;
  /** 記名表決截止後：出席但沒投（廢票）的議員。 */
  notVotedNames: string[] | null;
  /** 只有 console、進行中：還沒投的人。 */
  pendingNames: string[] | null;
};

const MISSING_NAME = "（名冊已刪除）";

export async function loadVoteViews(
  meetingId: string,
  audience: "console" | "public"
): Promise<VoteView[]> {
  const votes = await prisma.vote.findMany({
    where: { meetingId, ...(audience === "public" ? { status: { in: ["open", "closed"] } } : {}) },
    orderBy: { openedAt: "desc" },
    include: {
      options: { select: { id: true, label: true, order: true, count: true } },
      voters: { select: { recipientId: true } },
      ballots: { select: { recipientId: true, optionId: true } },
    },
  });
  if (votes.length === 0) return [];

  const allIds = new Set<string>();
  for (const v of votes) for (const id of idList(v.eligibleIds)) allIds.add(id);
  const people = await prisma.recipient.findMany({
    where: { id: { in: [...allIds] } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const name = (id: string) => nameOf.get(id) ?? MISSING_NAME;

  return votes.map((v) => {
    const eligible = idList(v.eligibleIds);
    const voted = new Set(v.voters.map((x) => x.recipientId));
    const closed = v.status === "closed";
    const showNames = closed && !v.secret;
    return {
      id: v.id,
      kind: v.kind as VoteKind,
      secret: v.secret,
      title: v.title,
      seats: v.seats,
      status: v.status as VoteStatus,
      proposalId: v.proposalId,
      matterType: v.matterType,
      openedAt: v.openedAt,
      closedAt: v.closedAt,
      eligibleCount: eligible.length,
      castCount: voted.size,
      // 作廢的表決在後台仍給票數（祕書處要能說明為什麼作廢），公開頁根本不會拿到作廢的。
      summary: v.status === "open" ? null : summarize(v.options, eligible.length, voted.size),
      named: showNames
        ? [...v.options]
            .sort((a, b) => a.order - b.order)
            .map((o) => ({
              label: o.label,
              names: v.ballots.filter((b) => b.optionId === o.id).map((b) => name(b.recipientId)),
            }))
        : null,
      notVotedNames: showNames ? eligible.filter((id) => !voted.has(id)).map(name) : null,
      pendingNames:
        audience === "console" && v.status === "open"
          ? eligible.filter((id) => !voted.has(id)).map(name)
          : null,
    };
  });
}

/**
 * 點名用的名冊：該屆、啟用中的議員。
 * 依建立順序排：名冊由 data/import-recipients.ts 照選舉結果原檔逐筆匯入，建立順序就是名冊順序
 * （依姓名排的話中文是照字碼，對點名的人沒有意義）。
 */
export function sessionMembers(session: number) {
  return prisma.recipient.findMany({
    where: { session, active: true, roleTag: "議員" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true, district: true, department: true },
  });
}

// ── 議員投票頁 ──

export type MemberContext =
  | { state: "invalid" }
  | { state: "noMeeting"; member: { name: string } }
  | {
      state: "ready";
      member: { id: string; name: string };
      meeting: { id: string; slug: string | null; name: string };
      open: {
        id: string;
        kind: VoteKind;
        secret: boolean;
        title: string;
        seats: number | null;
        options: { id: string; label: string }[];
        eligible: boolean;
        voted: boolean;
        /** 記名表決才查得到自己投了什麼。 */
        myChoice: string | null;
      } | null;
      /** 最近一次截止的表決（給剛投完的人看結果）。 */
      lastClosed: VoteView | null;
    };

/**
 * 以連結找議員與他這一屆正在開的會。
 * 驗章失敗、停用、查無此人一律回 invalid，不區分原因（不讓人拿來試探名冊）。
 */
export async function memberContext(token: string): Promise<MemberContext> {
  const parsed = parseVoteToken(token);
  if (!parsed) return { state: "invalid" };
  const r = await prisma.recipient.findUnique({
    where: { id: parsed.recipientId },
    select: { id: true, name: true, session: true, active: true, voteLinkVersion: true },
  });
  if (!r || !r.active || !verifyVoteSig(r.id, r.voteLinkVersion, parsed.sig)) return { state: "invalid" };

  const meeting = await prisma.meeting.findFirst({
    where: { liveOpen: true, session: r.session },
    orderBy: { liveUpdatedAt: "desc" },
    select: { id: true, slug: true, name: true },
  });
  if (!meeting) return { state: "noMeeting", member: { name: r.name } };

  const vote = await prisma.vote.findFirst({
    where: { meetingId: meeting.id, status: "open" },
    orderBy: { openedAt: "desc" },
    select: {
      id: true,
      kind: true,
      secret: true,
      title: true,
      seats: true,
      eligibleIds: true,
      // 刻意不選 count：進行中不給票數。
      options: { orderBy: { order: "asc" }, select: { id: true, label: true } },
    },
  });

  let open: Extract<MemberContext, { state: "ready" }>["open"] = null;
  if (vote) {
    const [voter, ballot] = await Promise.all([
      prisma.voteVoter.findUnique({ where: { voteId_recipientId: { voteId: vote.id, recipientId: r.id } } }),
      vote.secret
        ? null
        : prisma.voteBallot.findUnique({
            where: { voteId_recipientId: { voteId: vote.id, recipientId: r.id } },
            select: { option: { select: { label: true } } },
          }),
    ]);
    open = {
      id: vote.id,
      kind: vote.kind as VoteKind,
      secret: vote.secret,
      title: vote.title,
      seats: vote.seats,
      options: vote.options,
      eligible: idList(vote.eligibleIds).includes(r.id),
      voted: !!voter,
      myChoice: ballot?.option.label ?? null,
    };
  }

  const lastClosed = (await loadVoteViews(meeting.id, "public")).find((v) => v.status === "closed") ?? null;

  return { state: "ready", member: { id: r.id, name: r.name }, meeting, open, lastClosed };
}
