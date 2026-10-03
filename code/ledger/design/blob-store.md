# 附件存储抽象

## 1. 目标与边界

**问题**：报销附件与付款回单各自 `mkdir/writeFile`，换对象存储时要改两处；也没有统一的读接口。

**预期结果**：统一 `BlobStore`：`put` / `get` / `exists`；默认本地目录实现；业务只存返回的 `storageKey`。

**非目标**：本版不上真实 OSS SDK、CDN 签名 URL、多租户桶策略。环境变量预留 `BLOB_STORE=local`。

**关键约束**：`storagePath`/`storageKey` 仍是相对键；旧本地文件继续可读。

## 2. 调研结论

| 做法 | 采用/拒绝 | 理由 |
|---|---|---|
| 业务里继续直接写盘 | 拒绝 | 两处复制，换存储成本高 |
| 先抽象接口 + 本地实现 | 采用 | 当下够用，OSS 只加适配器 |
| 立刻接阿里云 OSS | 拒绝 | 无密钥与桶，提前绑死 |

## 3. 接口

```ts
put(keyPrefix, fileName, bytes) -> { storageKey, byteSize }
get(storageKey) -> Buffer
exists(storageKey) -> boolean
```

本地根目录：`data/blobs/`；key 形如 `claim-attachments/{claimId}/{itemId}/{ts}-{safeName}`。

## 4. 文件变更

| 操作 | 路径 | 原因 |
|---|---|---|
| 新增 | `lib/blob-store.ts` | 抽象 + 本地实现 |
| 修改 | `lib/attachment.ts` / `payment.ts` / 下载路由 | 走 BlobStore |
| 修改 | overview / AGENTS | 现状 |

## 5. 验证

上传附件、提交、下载、付款回单仍可用；单元路径不依赖绝对盘符。
