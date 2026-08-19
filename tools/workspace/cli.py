"""命令行入口。逻辑在各自的模块里,这里只负责取参数和调渲染。

    uv run check-env
    uv run precommit                # 提交检查,也由 .githooks/pre-commit 调用
    uv run check-chain              # 每份文档是否还能从 AGENTS.md 走到
"""

import sys

from workspace.chain import check_chain
from workspace.environment import check_environment
from workspace.git import Repo
from workspace.precommit import inspect_staged
from workspace.render import chain_report, commit_report, environment_report


def check_chain_cmd() -> int:
    """检查每份文档是否还能从 AGENTS.md 走到。"""
    return 0 if chain_report(check_chain(Repo.discover())) else 1


def precommit() -> int:
    """提交检查。返回非零表示这次提交应当被拦下。"""
    findings = inspect_staged(Repo.discover())
    if not findings:
        return 0
    commit_report(findings)
    return 1


def check_env() -> int:
    """体检:本机 Git 环境是否配好。"""
    return 0 if environment_report(check_environment(Repo.discover())) else 1



if __name__ == "__main__":
    sys.exit(check_env())
