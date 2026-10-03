# 账本

这是公司财务的记账内核，外加最小报销审批。完整判断见 `overview.html`，报销设计见 `design/claims.md`。

三块积木：账户、分录、过账。报销单据只是审批状态机；总经理通过时调用 `postEntry`，借费用贷应付。界面与 HTTP 调用同一套领域函数。

本地数据库是系统 PostgreSQL：`127.0.0.1:5432`，库/用户 `ledger`。连接串见 `.env.example`。

改动这些能力时，同一提交更新 `overview.html` 顶部的「上次以来 / 需要你 / 现状」。
