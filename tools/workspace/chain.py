"""注意力链条检查:每份文档是否还能从 `AGENTS.md` 走到。

一份没人指向的文档等于不存在 —— 它不会报错,只会静静地没有人(和没有 AI)用。
这个检查把「链条」这件事变成可验证的:从 `AGENTS.md` 出发,
沿着文件之间的相互提及一路走,走不到的就是孤儿。

只判断,不输出。渲染在 `render.chain_report`。
"""

import os
import re
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from workspace.git import Repo

ROOT_DOC = "AGENTS.md"

DOC_SUFFIXES = frozenset({".md", ".html"})

# 基础设施目录:里面的文档全部纳入检查。
# 团队把某个目录也当基础设施维护时(比如一个自建系统的 code/),加进来即可。
INFRA_PREFIXES = ("docs/", "tools/", ".codex/", ".claude/")

# 其余顶层目录是团队自己开的工作目录(财务、HR、代码、内容……)。
# 只有目录自己的 README 算结构说明,要能被找到;
# 再往下是工作内容,靠约定组织、不靠互相指向,要求它们登记只会制造噪音。
WORK_DIR_DEPTH = 1


@dataclass(frozen=True, slots=True)
class ChainReport:
    root: str
    paths: dict[str, tuple[str, ...]]
    """每份可达文档 → 从根走到它的一条路径。"""

    orphans: tuple[str, ...]
    """从根走不到的文档。"""

    @property
    def ok(self) -> bool:
        return not self.orphans


def check_chain(repo: Repo) -> ChainReport:
    """从 ROOT_DOC 出发遍历文档之间的提及,找出走不到的。"""
    docs = _documents(repo.root)
    texts = {d: (repo.root / d).read_text(encoding="utf-8", errors="replace") for d in docs}

    # 只在 basename 全局唯一时才认它,否则 README.md 会让所有目录互相"可达"。
    seen: dict[str, int] = {}
    for d in docs:
        seen[Path(d).name] = seen.get(Path(d).name, 0) + 1
    unique_names = {Path(d).name for d in docs if seen[Path(d).name] == 1}

    def tokens(target: str, source: str) -> list[str]:
        """在 source 里指向 target 的几种写法。命中任意一个就算可达。

        链接是相对的,所以既要认仓库相对路径(反引号里常这么写),
        也要认相对于 source 所在目录的写法(Markdown 链接就是这种)。
        """
        path = Path(target)
        here = Path(source).parent
        try:
            relative = os.path.relpath(target, here)
        except ValueError:
            relative = target

        found = [target, relative]
        if path.name in unique_names:      # basename,仅在全库唯一时才认
            found.append(path.name)
        if path.name == "SKILL.md":
            # 技能靠名字被调用(/draft-from-raw),不靠路径
            found.append(path.parent.name)
        if path.name == "README.md":
            # 目录的门面:指到目录就等于指到了它的 README
            for form in (path.parent.as_posix(), os.path.relpath(path.parent, here)):
                if form not in (".", ""):
                    found.append(form + "/")
        return [t for t in found if t not in (".", "", "./")]

    def references(source: str) -> list[str]:
        text = texts[source]
        hits = []
        for target in docs:
            if target == source:
                continue
            for token in tokens(target, source):
                # 后面不能再跟路径字符,否则 `a/b/` 会被 `a/b/c.md` 蒙混过关
                if re.search(re.escape(token) + r"(?![\w./-])", text):
                    hits.append(target)
                    break
        return hits

    paths: dict[str, tuple[str, ...]] = {ROOT_DOC: (ROOT_DOC,)}
    queue = deque([ROOT_DOC])
    while queue:
        current = queue.popleft()
        for target in references(current):
            if target not in paths:
                paths[target] = paths[current] + (target,)
                queue.append(target)

    return ChainReport(
        root=ROOT_DOC,
        paths=paths,
        orphans=tuple(sorted(d for d in docs if d not in paths)),
    )


def _documents(root: Path) -> list[str]:
    """纳入检查的文档:仓库里的 .md / .html,排除内容目录和 .venv 之类。"""
    found: list[str] = []
    for path in sorted(root.rglob("*")):
        if path.suffix not in DOC_SUFFIXES or not path.is_file():
            continue
        if path.is_symlink():          # CLAUDE.md 指向 AGENTS.md,不是独立文档
            continue
        rel = path.relative_to(root).as_posix()
        if rel.startswith((".git/", ".venv/")):
            continue
        if not rel.startswith(INFRA_PREFIXES) and rel.count("/") > WORK_DIR_DEPTH:
            continue
        found.append(rel)
    return found
