"""环境体检:本机 Git 环境是否按 README 的「首次配置」配好。

同样只判断、不输出。渲染在 `render.environment_report`。
"""

import json
import shutil
import subprocess
from collections.abc import Iterator
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path

from workspace.git import Repo

REQUIRED_TOOLS: tuple[str, ...] = ("git", "git-lfs", "gh", "uv")

# git-lfs 自己的钩子。平时它们装在 .git/hooks/,但本仓库设了 core.hooksPath,
# 于是它们落到 .githooks/ 里 —— 所以要跟着仓库走。
# 其中 pre-push 才是真正把 LFS 内容上传到服务器的那个:少了它,
# push 只会推上去指针而不推文件,别人拉下来是一堆空壳,而且当时不报错。
LFS_HOOKS: tuple[str, ...] = ("pre-push", "post-checkout", "post-merge", "post-commit")

REQUIRED_CONFIG: tuple[tuple[str, str, str], ...] = (
    ("pull.rebase", "true", "保持提交历史是直线"),
    ("core.quotepath", "false", "中文文件名正常显示"),
    ("core.precomposeunicode", "true", "中文文件名编码"),
)


class Status(StrEnum):
    OK = "ok"
    WARN = "warn"
    FAIL = "fail"


@dataclass(frozen=True, slots=True)
class Check:
    """一项检查的结果。"""

    group: str
    label: str
    status: Status
    fix: str | None = None
    """FAIL 时给出可以直接复制执行的修复命令。"""

    @property
    def passed(self) -> bool:
        return self.status is not Status.FAIL


def check_environment(repo: Repo) -> list[Check]:
    """跑完所有检查。顺序即展示顺序。"""
    return [*_tools(), *_lfs(repo), *_identity(repo), *_config(repo), *_repo(repo)]


def _tools() -> Iterator[Check]:
    for tool in REQUIRED_TOOLS:
        if path := shutil.which(tool):
            yield Check("必备工具", f"{tool} — {_version(path)}", Status.OK)
        else:
            yield Check("必备工具", f"{tool} 未安装", Status.FAIL, _install_hint(tool))


def _lfs(repo: Repo) -> Iterator[Check]:
    if repo.config("filter.lfs.clean"):
        yield Check("Git LFS", "LFS 过滤器已生效", Status.OK)
    else:
        yield Check(
            "Git LFS",
            "LFS 没有生效 —— 图片会被原样写进 Git 历史,而且不会报错",
            Status.FAIL,
            "git lfs install",
        )


def _identity(repo: Repo) -> Iterator[Check]:
    name = repo.config("user.name")
    yield (
        Check("身份", f"user.name  = {name}", Status.OK)
        if name
        else Check("身份", "user.name 未设置", Status.FAIL,
                   'git config --global user.name "你的名字"')
    )

    email = repo.config("user.email")
    if not email or "@" not in email:
        yield Check("身份", f"user.email 未设置或不是邮箱:{email or '空'}", Status.FAIL,
                    'git config --global user.email "你注册 GitHub 用的邮箱"')
        return

    yield Check("身份", f"user.email = {email}", Status.OK)
    # GitHub 靠邮箱把提交关联到账号。邮箱不在账号里,提交就不算在你头上。
    if (known := _github_emails()) and email.lower() not in known:
        yield Check(
            "身份",
            "这个邮箱不在你的 GitHub 账号里 —— 提交不会关联到你的头像和主页",
            Status.WARN,
            "改成账号里已有的邮箱,或去 GitHub → Settings → Emails 把它加进去",
        )


def _config(repo: Repo) -> Iterator[Check]:
    for key, want, why in REQUIRED_CONFIG:
        got = repo.config(key)
        if got == want:
            yield Check("全局配置", f"{key} = {want}", Status.OK)
        else:
            yield Check("全局配置", f"{key} 应为 {want}(当前:{got or '未设置'})",
                        Status.FAIL, f"git config --global {key} {want}   # {why}")


def _repo(repo: Repo) -> Iterator[Check]:
    if repo.config("core.hooksPath") == ".githooks":
        yield Check("本仓库", "提交检查已启用", Status.OK)
        hook = repo.root / ".githooks" / "pre-commit"
        yield (
            Check("本仓库", "pre-commit 可执行", Status.OK)
            if hook.exists() and hook.stat().st_mode & 0o111
            else Check("本仓库", "pre-commit 没有执行权限", Status.FAIL,
                       "chmod +x .githooks/pre-commit")
        )
        missing = [h for h in LFS_HOOKS if not (repo.root / ".githooks" / h).exists()]
        yield (
            Check("本仓库", "LFS 钩子齐全", Status.OK)
            if not missing
            else Check("本仓库",
                       f"缺少 LFS 钩子 {' '.join(missing)} —— push 只会推指针,不推文件内容",
                       Status.FAIL, "git lfs install")
        )
    else:
        yield Check("本仓库", "提交检查未启用 —— 违规格式和超大文件不会被拦截",
                    Status.FAIL, "git config core.hooksPath .githooks")

    yield (
        Check("本仓库", f"远端 = {repo.remote_url}", Status.OK)
        if repo.remote_url
        else Check("本仓库", "没有配置远端 origin", Status.WARN,
                   "确认你是 clone 下来的,而不是自己 git init 的")
    )


def _version(executable: str) -> str:
    try:
        out = subprocess.run([executable, "--version"], stdout=subprocess.PIPE,
                             stderr=subprocess.DEVNULL, text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return "?"
    return out.stdout.strip().splitlines()[0] if out.stdout.strip() else "?"


def _github_emails() -> set[str]:
    """gh 已登录时,取账号下的邮箱列表;取不到就返回空集合(不影响检查)。"""
    try:
        out = subprocess.run(["gh", "api", "user/emails"], stdout=subprocess.PIPE,
                             stderr=subprocess.DEVNULL, text=True, timeout=15)
        return {entry["email"].lower() for entry in json.loads(out.stdout)}
    except (OSError, subprocess.SubprocessError, ValueError, KeyError, TypeError):
        return set()


def _install_hint(tool: str) -> str:
    import sys
    return (f"brew install {tool}" if sys.platform == "darwin"
            else f"sudo apt install -y {tool}   # 或 dnf / pacman")
