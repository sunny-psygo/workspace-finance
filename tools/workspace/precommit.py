"""提交前检查:判断暂存区里有没有不该提交的东西。

只做判断,不做输出 —— 渲染在 `render.check_report`。
AI 想知道某次改动会不会被拦下,直接调 `inspect_staged`。
"""

from dataclasses import dataclass
from pathlib import PurePosixPath

from workspace.git import Repo
from workspace.policy import MAX_PLAIN_BYTES, Problem, replacement_for


@dataclass(frozen=True, slots=True)
class Finding:
    """一个待处理的问题。"""

    problem: Problem
    path: str
    detail: str = ""
    """补充信息,比如文件多大、该换成什么格式。"""


def inspect_staged(repo: Repo) -> list[Finding]:
    """检查暂存区,返回所有问题。没问题就返回空列表。"""
    findings: list[Finding] = []

    for path in repo.staged_paths():
        suffix = PurePosixPath(path).suffix
        if instead := replacement_for(suffix):
            findings.append(
                Finding(Problem.BLOCKED_FORMAT, path, f"改用 {instead}")
            )
            continue

        if repo.is_lfs_tracked(path):
            # .gitattributes 说走 LFS,那暂存的就该是个几百字节的指针。
            # 不是的话,说明本机没执行过 git lfs install —— 而 git 对此毫无怨言。
            if not repo.staged_is_lfs_pointer(path):
                findings.append(Finding(Problem.LFS_BROKEN, path))
            continue

        size = repo.staged_size(path)
        if size > MAX_PLAIN_BYTES:
            findings.append(
                Finding(Problem.TOO_LARGE, path, f"{size / 1024 / 1024:.0f} MB")
            )

    return findings
