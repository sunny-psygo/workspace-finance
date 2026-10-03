import { access } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AuthUser, userHasRole } from "./auth";
import { ClaimError } from "./claim";
import { db } from "./db";

const uploadInput = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.string().trim().max(120).optional().default("application/octet-stream"),
  fileBase64: z.string().min(1),
});

export type UploadAttachmentInput = z.input<typeof uploadInput>;

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_").slice(0, 120);
}

export async function fileExists(storagePath: string) {
  try {
    await access(path.isAbsolute(storagePath) ? storagePath : path.join(process.cwd(), storagePath));
    return true;
  } catch {
    return false;
  }
}

export async function assertClaimItemsHaveAttachments(
  items: Array<{ id: string; memo: string; attachments: Array<{ storagePath: string }> }>,
) {
  const missing: string[] = [];
  for (const item of items) {
    if (!item.attachments.length) {
      missing.push(item.memo);
      continue;
    }
    let ready = 0;
    for (const attachment of item.attachments) {
      if (await fileExists(attachment.storagePath)) ready += 1;
    }
    if (ready < 1) missing.push(item.memo);
  }
  if (missing.length) {
    throw new ClaimError(
      `这些明细还没有有效附件：${missing.join("、")}。`,
      "CLAIM_ATTACHMENT_REQUIRED",
      "先给每条明细上传附件，再提交。",
    );
  }
}

export async function uploadClaimItemAttachment(
  user: AuthUser,
  claimId: string,
  itemId: string,
  input: UploadAttachmentInput,
) {
  if (!userHasRole(user, "employee")) {
    throw new ClaimError("只有员工可以上传报销附件。", "CLAIM_FORBIDDEN", "换员工账号登录。");
  }
  const parsed = uploadInput.safeParse(input);
  if (!parsed.success) {
    throw new ClaimError(
      "附件字段不合要求。",
      "CLAIM_INVALID",
      parsed.error.issues.map((issue) => issue.path.join(".") + " " + issue.message).join("；"),
    );
  }
  const data = parsed.data;
  const claim = await db.claim.findUnique({
    where: { id: claimId },
    include: { items: true },
  });
  if (!claim) throw new ClaimError("单据不存在。", "CLAIM_NOT_FOUND", "核对单据号。");
  if (claim.status !== "draft" && claim.status !== "rejected") {
    throw new ClaimError(
      `状态 ${claim.status} 不能再上传明细附件。`,
      "CLAIM_STATUS_CHANGED",
      "只在草稿或驳回后补附件。",
    );
  }
  const item = claim.items.find((row) => row.id === itemId);
  if (!item) throw new ClaimError("明细不存在。", "CLAIM_NOT_FOUND", "核对明细 id。");

  let fileBytes: Buffer;
  try {
    fileBytes = Buffer.from(data.fileBase64, "base64");
  } catch {
    throw new ClaimError("附件内容不是合法 base64。", "CLAIM_INVALID", "重新编码后再传。");
  }
  if (!fileBytes.length) throw new ClaimError("附件是空的。", "CLAIM_INVALID", "上传非空文件。");
  if (fileBytes.length > 5 * 1024 * 1024) {
    throw new ClaimError("附件超过 5MB。", "CLAIM_INVALID", "压缩后再传。");
  }

  const dir = path.join(process.cwd(), "data", "claim-attachments", claim.id, item.id);
  await mkdir(dir, { recursive: true });
  const storedName = `${Date.now()}-${safeFileName(data.fileName)}`;
  const absolute = path.join(dir, storedName);
  await writeFile(absolute, fileBytes);
  const storagePath = path.relative(process.cwd(), absolute);

  return db.claimAttachment.create({
    data: {
      id: randomUUID(),
      claimItemId: item.id,
      fileName: data.fileName,
      contentType: data.contentType || "application/octet-stream",
      byteSize: fileBytes.length,
      storagePath,
      uploadedBy: user.displayName,
    },
  });
}
