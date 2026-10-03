# 账本

这是公司财务的记账内核：登录、报销（附件+发票查重）、银行流水匹配、期间锁定。完整判断见 `overview.html`。

三块积木：账户、分录、过账。业务都往账本送分录；`postEntry` 是唯一入账门，已锁月份直接拒绝。

- 报销确认应付：`design/claims.md`
- 流水匹配付款：`design/bank-match.md`
- 期间锁定：`design/period-close.md`
- 登录：`design/auth.md`
- 附件：`design/attachments.md`
- 发票查重：`design/invoice-dedup.md`

本地 PostgreSQL：`127.0.0.1:5432` / `ledger`。演示账号：`npm run seed`（密码 `Passw0rd!`）。

改动这些能力时，同一提交更新 `overview.html` 顶部三节。
