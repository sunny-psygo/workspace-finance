export type AppView =
  | "claims"
  | "payment"
  | "payroll"
  | "fixedAssets"
  | "bookSetup"
  | "periodClose"
  | "journal"
  | "reports"
  | "archive"
  | "trialBalance"
  | "users";

export type NavItem = {
  view: AppView;
  label: string;
  /** 任一角色可见；空=全员 */
  roles?: string[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

/** 对齐旧系统信息架构，但只挂新系统已有积木。 */
export const navGroups: NavGroup[] = [
  {
    title: "报销与付款",
    items: [
      { view: "claims", label: "报销与审批" },
      { view: "payment", label: "银行流水与付款", roles: ["cashier", "finance", "gm"] },
    ],
  },
  {
    title: "工资",
    items: [{ view: "payroll", label: "工资批次", roles: ["hr", "finance", "gm", "cashier"] }],
  },
  {
    title: "账务处理",
    items: [
      { view: "bookSetup", label: "账套与科目", roles: ["finance", "gm"] },
      { view: "journal", label: "凭证查询", roles: ["finance", "gm"] },
      { view: "fixedAssets", label: "固定资产", roles: ["finance", "gm"] },
      { view: "periodClose", label: "期末结账", roles: ["finance", "gm"] },
      { view: "trialBalance", label: "科目余额表" },
      { view: "reports", label: "会计报表", roles: ["finance", "gm"] },
      { view: "archive", label: "电子档案", roles: ["finance", "gm"] },
    ],
  },
  {
    title: "管理工具",
    items: [{ view: "users", label: "账号管理", roles: ["gm"] }],
  },
];

export const viewTitles: Record<AppView, string> = {
  claims: "报销与审批",
  payment: "银行流水与付款",
  payroll: "工资批次",
  fixedAssets: "固定资产",
  bookSetup: "账套与科目",
  periodClose: "期末结账",
  journal: "凭证查询",
  reports: "会计报表",
  archive: "电子档案",
  trialBalance: "科目余额表",
  users: "账号管理",
};

export function visibleNavGroups(roles: string[]) {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.some((role) => roles.includes(role))),
    }))
    .filter((group) => group.items.length > 0);
}

export function defaultView(roles: string[]): AppView {
  const first = visibleNavGroups(roles)[0]?.items[0]?.view;
  return first ?? "claims";
}
