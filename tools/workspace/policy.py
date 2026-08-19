"""仓库规范的机器可读定义。

`AGENTS.md` 用散文写给人看,这里用数据结构写给代码和 AI 看。
两边说的是同一件事 —— **改了规范,两边都要改。**
"""

import re
from enum import StrEnum
from typing import Final

# 非 LFS 文件的体积上限。这条限制与容量无关(公司用付费 LFS 方案),
# 与不可逆有关:绕过 LFS 进了 Git 历史的大文件永久留在里面,清理要重写整个历史。
MAX_PLAIN_BYTES: Final[int] = 5 * 1024 * 1024

# 禁用的后缀 → 应该改用什么。既是拦截名单,也是给用户的建议。
BLOCKED_SUFFIXES: Final[dict[str, str]] = {
    ".doc": ".md", ".docx": ".md", ".dot": ".md", ".dotx": ".md", ".rtf": ".md",
    ".pages": ".md", ".odt": ".md",
    ".xls": ".csv", ".xlsx": ".csv", ".xlsm": ".csv", ".numbers": ".csv", ".ods": ".csv",
    ".ppt": "Marp / Slidev", ".pptx": "Marp / Slidev", ".pot": "Marp / Slidev",
    ".potx": "Marp / Slidev", ".key": "Marp / Slidev", ".odp": "Marp / Slidev",
}

# 目录/文件 slug:小写 ASCII 加连字符。
# 用 ASCII 是因为没配置 core.quotepath 时,git status 会把中文显示成
# \344\270\255 这样的转义码 —— 而最需要看懂 git status 的正是新人。
SLUG_PATTERN: Final[re.Pattern[str]] = re.compile(r"^[a-z0-9][a-z0-9-]*$")


class Problem(StrEnum):
    """提交检查会拦下的三类问题。"""

    BLOCKED_FORMAT = "blocked_format"
    """Office / iWork 格式 —— AI 读不了,历史失效,无法合并。"""

    TOO_LARGE = "too_large"
    """超过 MAX_PLAIN_BYTES 且没走 LFS —— 进了历史就不可逆。"""

    LFS_BROKEN = "lfs_broken"
    """.gitattributes 说走 LFS,但本机 LFS 没装好,文件正被原样写入。"""


def is_valid_slug(slug: str) -> bool:
    return SLUG_PATTERN.match(slug) is not None


def replacement_for(suffix: str) -> str | None:
    """这个后缀该改用什么格式;不在禁用名单里则返回 None。"""
    return BLOCKED_SUFFIXES.get(suffix.lower())
