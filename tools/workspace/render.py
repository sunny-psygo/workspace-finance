"""把结构化结果画到终端。**这个模块是本库唯一往终端输出的地方。**

其余模块只返回数据 —— 这样 AI 调用时拿到的是可以判断的对象,
而不是需要正则去抠的一段文本。
"""

from rich.console import Console
from rich.table import Table
from rich.theme import Theme

from workspace.chain import ChainReport
from workspace.environment import Check, Status
from workspace.policy import BLOCKED_SUFFIXES, Problem
from workspace.precommit import Finding

THEME = Theme({
    "ok": "green",
    "warn": "yellow",
    "fail": "red",
    "cmd": "cyan",
    "dim": "dim",
})

console = Console(theme=THEME)
stderr_console = Console(theme=THEME, stderr=True)

_MARK = {Status.OK: "[ok]✓[/]", Status.WARN: "[warn]![/]", Status.FAIL: "[fail]✗[/]"}

# 每类问题的说明:为什么拦、怎么办。放在这里而不是散在代码里,
# 是因为这些话的质量直接决定了用户是理解了还是只是被挡住了。
_EXPLAIN: dict[Problem, tuple[str, tuple[str, ...]]] = {
    Problem.BLOCKED_FORMAT: (
        "包含不符合格式规范的文件",
        (
            "Office / iWork 文档是压缩后的二进制包。对 Git 而言它们是一团乱码:",
            "看不出改了哪一句、两个人同时改必然冲突、AI 也无法直接读取内容。",
            "",
            "转换可以直接交给 AI,或者 [cmd]pandoc 输入.docx -t markdown -o 输出.md[/]",
        ),
    ),
    Problem.TOO_LARGE: (
        "文件过大且未走 Git LFS",
        (
            "大文件一旦进了 Git 历史就永久留在里面,之后每个人克隆都要下载它 ——",
            "即使文件早已删除。清理需要重写整个仓库历史。这是不可逆的。",
            "",
            "如果这是素材文件,把它的扩展名补进 [cmd].gitattributes[/] 交给 LFS。",
            "[b]不要压缩它[/] —— 公司用的是付费 LFS 方案,原图进仓库没问题。",
            "真正不该进来的只有相机原片、长时间屏幕录制这类只该留在本地的东西。",
        ),
    ),
    Problem.LFS_BROKEN: (
        "Git LFS 没有生效",
        (
            "这些文件按规范该由 LFS 存储,但你这台机器上 LFS 没装好,",
            "它们正被原样写进 Git 历史 —— [b]而且 git 不会报任何错[/]。",
            "",
            "修复:[cmd]git lfs install[/](没装过先 [cmd]brew install git-lfs[/])",
            "然后重新 git add 并提交。",
        ),
    ),
}


def commit_report(findings: list[Finding]) -> None:
    """渲染提交检查的拦截报告。"""
    by_problem: dict[Problem, list[Finding]] = {}
    for finding in findings:
        by_problem.setdefault(finding.problem, []).append(finding)

    for problem, group in by_problem.items():
        title, why = _EXPLAIN[problem]
        stderr_console.print(f"\n[fail b]✗ 提交被拦截:{title}[/]\n")
        for finding in group:
            suffix = f"  [dim]{finding.detail}[/]" if finding.detail else ""
            stderr_console.print(f"  [fail]•[/] {finding.path}{suffix}")
        stderr_console.print()
        for line in why:
            stderr_console.print(f"  {line}" if line else "")

    stderr_console.print(
        "\n[warn]确信是例外的话可以 [b]git commit --no-verify[/b] 跳过 —— "
        "但你要能向团队解释理由。[/]\n"
    )


def format_guide() -> Table:
    """禁用格式与替代方案对照表。"""
    table = Table("不要用", "改用", title="格式规范", title_style="b")
    seen: set[str] = set()
    for suffix, instead in BLOCKED_SUFFIXES.items():
        if instead not in seen:
            table.add_row(suffix, instead)
            seen.add(instead)
    return table


def environment_report(checks: list[Check]) -> bool:
    """渲染体检结果,返回是否全部通过。"""
    console.print("\n[b]工作区 · 环境检查[/]")

    current = ""
    for check in checks:
        if check.group != current:
            current = check.group
            console.print(f"\n[b]{current}[/]")
        console.print(f"  {_MARK[check.status]} {check.label}")
        if check.fix:
            label = "修复" if check.status is Status.FAIL else "建议"
            console.print(f"      [dim]{label}:[/] [cmd]{check.fix}[/]")

    passed = all(check.passed for check in checks)
    console.print()
    if passed:
        console.print("[ok b]全部通过。[/] 第一次用 Git 的话打开 docs/tutorial/index.html")
    else:
        console.print("[fail b]有项目需要修复。[/] 按上面的命令逐条执行,然后重新运行。")
        console.print("[dim]看不懂就把整段输出复制给 AI,或者问同事。[/]")
    console.print()
    return passed


def chain_report(report: ChainReport) -> bool:
    """渲染注意力链条检查,返回是否全部可达。"""
    console.print(f"\n[b]注意力链条[/] · 从 {report.root} 出发")

    for path in sorted(report.paths):
        if path == report.root:
            continue
        console.print(f"  [ok]✓[/] {path}")
        console.print(f"      [dim]{' → '.join(report.paths[path])}[/]")

    if report.ok:
        console.print(f"\n[ok b]{len(report.paths) - 1} 份文档全部可达。[/]\n")
        return True

    console.print(f"\n[fail b]{len(report.orphans)} 份文档从 {report.root} 走不到:[/]\n")
    for orphan in report.orphans:
        console.print(f"  [fail]✗[/] {orphan}")
    console.print(
        "\n  没人指向的文档等于不存在 —— 不会报错,只会静静地没人用。\n"
        "  在链条上某个已可达的文档里提一句它(通常是 [cmd]AGENTS.md[/] 的"
        "「手上有什么」),或者确认它已经没用了,[b]直接删掉[/]。\n"
    )
    return False
