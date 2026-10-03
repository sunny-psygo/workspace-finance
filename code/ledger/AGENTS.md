# 账本

公司财务记账内核 + 费用报销闭环。完整判断见 `overview.html`。

## 这是什么

三块积木：账户、分录、过账。报销、付款、作废都只是往账本送分录；`postEntry` 是唯一入账门。

## 已有能力

| 能力 | 设计 |
|---|---|
| 登录/改密/GM 管账号 | `design/auth.md` |
| 报销审批入应付 | `design/claims.md` |
| 明细附件 | `design/attachments.md` |
| 发票号查重 | `design/invoice-dedup.md` |
| 银行流水分次付款 | `design/bank-match.md` |
| 付款匹配撤销红冲 | `design/allocation-reverse.md` |
| 银行调节汇总 | `design/bank-reconciliation.md` |
| 期间锁定与未完单检查 | `design/period-close.md` |

## 本地

- PostgreSQL：`127.0.0.1:5432`，库/用户 `ledger`
- 页面：`npm run dev` → http://127.0.0.1:3210
- 种子账号：`npm run seed`（zhangsan/finance/gm/cashier，密码 `Passw0rd!`）

改能力时，同一提交更新 `overview.html` 顶部三节。
