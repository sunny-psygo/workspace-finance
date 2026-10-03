# 账本

这是公司财务的记账内核，外加登录鉴权、报销审批、付款核销。完整判断见 `overview.html`。

三块积木：账户、分录、过账。报销与付款都只是往账本送分录：

- 总经理通过：借费用、贷应付（`design/claims.md`）
- 出纳付款：借应付、贷银行（`design/payment.md`）
- 登录与角色：`design/auth.md`

界面与 HTTP 调用同一套领域函数；角色来自服务端会话，不信任请求体自称角色。

本地数据库是系统 PostgreSQL：`127.0.0.1:5432`，库/用户 `ledger`。连接串见 `.env.example`。演示账号：`npm run seed`（zhangsan/finance/gm/cashier，密码 `Passw0rd!`）。

改动这些能力时，同一提交更新 `overview.html` 顶部的「上次以来 / 需要你 / 现状」。
