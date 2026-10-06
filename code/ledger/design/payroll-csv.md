# 工资与税局 CSV 解析

## 1. 目标与边界

**问题**：人事与财务实际用表格交数；当前只能 JSON/单行表单，约百人时不可用。

**预期结果**：

1. 纯函数解析 CSV 文本 → 结构化行（金额转分）。
2. 人事：CSV 写入批次并试算（复用 `setPayrollLines`）。
3. 财务：CSV 作为税局结果导入（复用 `importBureauTax`，按人员编号匹配）。

**非目标**：XLSX、多 sheet、在线税局、自动下载模板文件服务（模板字符串由 API 返回即可）。

## 2. 调研

沿用旧 `payroll-ui.js` 的表头别名与引号 CSV 解析；不引 xlsx 库（features before necessity）。

## 3. 格式

**人事工资**（表头别名中英皆可）：

`人员编号,姓名,应发,个人社保,个人公积金,其他扣款`

金额可为元（带小数）或整数；解析后 ×100 为分（若值已像「分」即 ≥1000 且无小数，仍按「元」理解：用户表默认元）。

**税局结果**：

`人员编号,本期个税` 或 `姓名,本期个税`（有编号优先；仅姓名时与批次行姓名精确匹配）。

## 4. 接口

- `POST /api/payroll/parse-csv` body `{ kind: "hr"|"bureau", csv }` → `{ rows }`
- `PUT /api/payroll/batches/{id}/lines-csv` → 解析后 setLines
- `POST /api/payroll/batches/{id}/bureau-tax-csv` → 解析后 importBureauTax

## 5. 验证

样例 CSV 解析金额与编号；缺列报错；导入后批次状态正确。
