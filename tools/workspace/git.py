"""对 git 命令行的薄封装。

只包装本仓库工具真正用到的那几条。返回值是 Python 类型,不是待解析的文本。
"""

import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class Repo:
    """一个 git 仓库。默认指向当前工作目录所在的仓库。"""

    root: Path

    @classmethod
    def discover(cls, start: Path | None = None) -> "Repo":
        """从 start(默认当前目录)向上找到仓库根目录。"""
        out = _run("git", "rev-parse", "--show-toplevel", cwd=start or Path.cwd())
        if not out:
            raise RuntimeError("当前目录不在一个 git 仓库里")
        return cls(Path(out.decode().strip()))

    # ── 配置 ────────────────────────────────────────────────
    def config(self, key: str) -> str | None:
        """读一条 git 配置;没设置返回 None。"""
        out = _run("git", "config", "--get", key, cwd=self.root)
        return out.decode().strip() or None if out else None

    @property
    def remote_url(self) -> str | None:
        out = _run("git", "remote", "get-url", "origin", cwd=self.root)
        return out.decode().strip() if out else None

    # ── 暂存区 ──────────────────────────────────────────────
    def staged_paths(self) -> list[str]:
        """本次提交中新增/修改/重命名的文件路径。

        用 -z 分隔,所以带空格和中文的路径也能正确解析。
        """
        out = _run(
            "git", "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z",
            cwd=self.root,
        )
        if not out:
            return []
        return [p.decode("utf-8", "surrogateescape") for p in out.split(b"\0") if p]

    def is_lfs_tracked(self, path: str) -> bool:
        """.gitattributes 是否声明这个文件走 LFS。"""
        out = _run("git", "check-attr", "filter", "--", path, cwd=self.root)
        return b"filter: lfs" in (out or b"")

    def staged_size(self, path: str) -> int:
        """暂存区里这个文件的字节数。走 LFS 的话这里是指针的大小。"""
        out = _run("git", "cat-file", "-s", f":{path}", cwd=self.root)
        text = out.decode().strip() if out else ""
        return int(text) if text.isdigit() else 0

    def staged_is_lfs_pointer(self, path: str) -> bool:
        """暂存的内容是不是 LFS 指针文件。

        用来识别「.gitattributes 说走 LFS,但 LFS 没装好」这种静默故障。
        """
        out = _run("git", "cat-file", "-p", f":{path}", cwd=self.root)
        return (out or b"")[:23] == b"version https://git-lfs"


def _run(*args: str, cwd: Path | None = None) -> bytes | None:
    """跑一条命令,成功返回 stdout,失败返回 None。"""
    try:
        result = subprocess.run(
            args, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return result.stdout if result.returncode == 0 else None
