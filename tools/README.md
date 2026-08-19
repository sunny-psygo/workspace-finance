# tools/

模板自带的工具链。`workspace` 是一个 Python 包,不是一堆各自为政的脚本。
Python 3.14,依赖写在根目录 `pyproject.toml`。

> **这不是唯一的位置,也不是唯一的包。** 工作区可以有任意多个包,
> 放在任何目录 —— 服务于财务的放 `budgets/` 下,服务于某个系统的跟着那个系统走。
> 只有真正跨领域通用的东西才值得放进 `tools/`。
> 新包在 `pyproject.toml` 的 `packages` 里加一行。

```bash
uv run check-env     # 环境体检
uv run precommit     # 手动跑一遍提交检查
uv run check-chain   # 每份文档是否还能从 AGENTS.md 走到
```

`uv sync` 一次即可,之后 `uv run` 自动用对环境。不要动系统 Python。

---

## 结构

| 模块 | 职责 |
|---|---|
| `policy.py` | 规范的机器可读版本:禁用格式、体积上限、slug 规则 |
| `git.py` | git 命令封装,返回 Python 类型而不是待解析的文本 |
| `precommit.py` | 提交检查,返回 `Finding` 列表 |
| `environment.py` | 环境体检,返回 `Check` 列表 |
| `chain.py` | 注意力链条:从 `AGENTS.md` 出发遍历文档提及,找出孤儿 |
| `render.py` | rich 渲染。**全库只有这里往终端输出** |
| `cli.py` | 命令行入口 |

**这里东西不多,是刻意的。** 什么该写成工具、什么该由 AI 照约定直接做,
见 `AGENTS.md` 的「方法论 → 工具链设计」——
简单说:确定性的检查、不可逆操作的守门、需要精确重复的机械变换才值得写成工具;
每次都不一样的结构性工作交给 AI。

**AI 是这个库的主要使用者**,所以领域逻辑一律返回结构化数据,渲染单独一层:

```python
from workspace import Repo, inspect_staged

findings = inspect_staged(Repo.discover())   # 拿到对象,不是一段要正则去抠的文本
```

`.githooks/pre-commit` 也是这么用的 —— 它只有几行,真正的判断在 `precommit.py`。

---

## 加东西

**不用请示。** 你在这里干活一定会遇到重复的、繁琐的、容易出错的步骤 ——
多数人的反应是忍着,这里的反应是写成工具提交上来,让所有人不用再忍。

- 新命令:在 `cli.py` 加入口,`pyproject.toml` 的 `[project.scripts]` 注册一下
- 新依赖:加进 `pyproject.toml` 然后 `uv sync`。**别用 PEP 723 内联依赖** ——
  这是一个包,依赖属于包
- 改规范:改 `policy.py`,同时改 `AGENTS.md`

代码按能力正常的开发者的标准写:类型标注、dataclass、合理拆分、自解释的命名。
**但不要过度抽象,也不要写单元测试套件** —— 这套基础设施一直在变,
没有「开发完了进入维护期」那一刻,保持易改比保持稳定更重要。

**报错要给出路** —— 说清哪里错了、执行什么能修好。用户看不懂报错时,
责任在报错,不在用户。

**环境是可以改的。** 缺什么依赖就加进 `pyproject.toml`;需要更新的 Python
就跟用户提 —— 不要为了迁就现有环境把代码写差。
