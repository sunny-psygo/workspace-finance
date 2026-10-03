# 账本

这是公司财务的记账内核，外加登录、报销（附件+发票查重）、银行流水匹配付款。完整判断见 `overview.html`。

三块积木：账户、分录、过账。业务都往账本送分录：

- 总经理通过：借费用、贷应付（`design/claims.md`）
- 出纳匹配流水：借应付、贷银行，可分次（`design/bank-match.md` / `design/payment.md`）
- 登录与角色：`design/auth.md`
- 明细附件：`design/attachments.md`
- 发票号查重：`design/invoice-dedup.md`

界面与 HTTP 调用同一套领域函数；角色来自服务端会话。

本地数据库是系统 PostgreSQL：`127.0.0.1:5432`，库/用户 `ledger`。演示账号：`npm run seed`（zhangsan/finance/gm/cashier，密码 `Passw0rd!`）。

改动这些能力时，同一提交更新 `overview.html` 顶部的「上次以来 / 需要你 / 现状」。
