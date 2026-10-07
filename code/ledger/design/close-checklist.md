# 统一结账检查清单

## 1. 目标与边界

**问题**：结账失败时错误码分散；财务希望一次看到期间全部缺口。

**预期结果**：`GET /api/books/{bookId}/periods/{yearMonth}/close-checklist` 返回可勾稽的缺口列表；与 `closePeriod` 同一套规则，不重复造检查。

**非目标**：自动修缺口、批量结多月、工作流引擎。

## 2. 认知

清单是**结账门槛的只读投影**。权威仍在 closePeriod；清单不得与 close 规则漂移——实现上共用同一查询函数。

## 3. 缺口项

| code | 含义 |
|---|---|
| OPEN_CLAIMS | 未完报销 |
| UNMATCHED_STATEMENTS | 未匹配流水 |
| OPEN_PAYROLL | 未完工资 |
| OPEN_DEPRECIATION | 应提未提折旧 |
| ALREADY_CLOSED | 期间已锁（信息项） |

每项含 count、samples、next。

## 4. 验证

有应提折旧时 checklist.ready=false 且含 OPEN_DEPRECIATION；计提后 ready=true。
