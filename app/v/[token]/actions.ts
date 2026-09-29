"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseVoteToken, verifyVoteSig } from "@/lib/meetings/vote-link";
import { idList } from "@/lib/meetings/voting";
import { readVoterToken } from "@/lib/meetings/voter-login";

export type CastResult = { ok: true } | { ok: false; error: "invalid" | "closed" | "notEligible" | "already" | "badOption" };

class Refuse extends Error {
  constructor(public code: Exclude<CastResult, { ok: true }>["error"]) {
    super(code);
  }
}

/**
 * 議員投票。身分來自專屬連結（token），或 /vote 登入後的 cookie（token 傳 null）；
 * 兩者內容相同，都是驗過簽章才認人。
 *
 * 一次交易內完成三件事：記「這個人投過了」、該選項加一、（記名時）記下這張票。
 * 無記名不寫 VoteBallot，所以網站上任何人（含祕書處）都查不到誰投了什麼。
 * 保證範圍到網站為止：有資料庫管理權限的人理論上能從交易紀錄比對時間，這跟紙本投票要信任監票人是同一件事。
 */
export async function castVote(token: string | null, voteId: string, optionId: string): Promise<CastResult> {
  const t = token ?? (await readVoterToken());
  const parsed = t ? parseVoteToken(t) : null;
  if (!parsed) return { ok: false, error: "invalid" };
  const r = await prisma.recipient.findUnique({
    where: { id: parsed.recipientId },
    select: { id: true, active: true, voteLinkVersion: true },
  });
  if (!r || !r.active || !verifyVoteSig(r.id, r.voteLinkVersion, parsed.sig)) return { ok: false, error: "invalid" };

  try {
    await prisma.$transaction(async (tx) => {
      // FOR SHARE：多張票可以同時寫，但「截止」的 UPDATE 必須等這些交易結束；
      // 截止生效後進來的交易會讀到 closed 而被擋下。
      const rows = await tx.$queryRaw<{ status: string; secret: boolean; eligibleIds: unknown; liveOpen: boolean }[]>`
        SELECT v."status", v."secret", v."eligibleIds", m."liveOpen"
        FROM "Vote" v JOIN "Meeting" m ON m."id" = v."meetingId"
        WHERE v."id" = ${voteId}
        FOR SHARE OF v`;
      const v = rows[0];
      if (!v || v.status !== "open" || !v.liveOpen) throw new Refuse("closed");
      if (!idList(v.eligibleIds).includes(r.id)) throw new Refuse("notEligible");

      await tx.voteVoter.create({ data: { voteId, recipientId: r.id } });
      const bumped = await tx.voteOption.updateMany({
        where: { id: optionId, voteId },
        data: { count: { increment: 1 } },
      });
      if (bumped.count !== 1) throw new Refuse("badOption");
      if (!v.secret) {
        await tx.voteBallot.create({ data: { voteId, recipientId: r.id, optionId } });
      }
    });
  } catch (e) {
    if (e instanceof Refuse) return { ok: false, error: e.code };
    // VoteVoter 主鍵衝突＝這個人已經投過（兩個分頁同時按也只會算一次）。
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "already" };
    throw e;
  }
  return { ok: true };
}
