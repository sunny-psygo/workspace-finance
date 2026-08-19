"""工作区的工具库。

**AI 是这个库的主要使用者。** 所以这里的函数都返回结构化数据,
而不是往终端打字 —— 渲染只发生在 `render` 和 `cli` 两个模块里。
需要判断某个文件合不合规、某台机器配没配好,直接调用,不要去解析命令行输出。

    from workspace import Repo, inspect_staged, check_environment

规范本身(禁用哪些格式、体积上限、slug 规则)在 `policy` 模块,
是 `AGENTS.md` 里那些规则的机器可读版本。改规范先改那里。
"""

from workspace.chain import ChainReport, check_chain
from workspace.environment import Check, Status, check_environment
from workspace.git import Repo
from workspace.policy import (
    BLOCKED_SUFFIXES,
    MAX_PLAIN_BYTES,
    SLUG_PATTERN,
    Problem,
    is_valid_slug,
)
from workspace.precommit import Finding, inspect_staged

__all__ = [
    "BLOCKED_SUFFIXES",
    "MAX_PLAIN_BYTES",
    "SLUG_PATTERN",
    "ChainReport",
    "Check",
    "Finding",
    "Problem",
    "Repo",
    "Status",
    "check_chain",
    "check_environment",
    "inspect_staged",
    "is_valid_slug",
]
