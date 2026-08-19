# 工作区模板

**给非技术岗位的 Git 工作区。** 财务、HR、法务、运营、设计、市场 ——
任何「产出文件、需要协作、不想再用网盘」的工作都能放进来。

**这是一个 monorepo 工作区,不是一个项目。** 你的目录你自己开:
做预算的可能是 `budgets/` `reports/`,HR 可能是 `policies/` `onboarding/`,
有人会做工具于是有了 `code/` —— **没有预设布局**。

模板只提供基础设施:

```
docs/        入门教程 + 设计说明
tools/       工具链(Python 包)。这个目录该不断变大
.githooks/   提交检查
AGENTS.md    规范与方法论。人和 AI 读同一份
```

落地到你的团队:[docs/adapting-this-template.md](docs/adapting-this-template.md)

---

## 为什么不用网盘

网盘只能回答「文件现在长什么样」。Git 能回答:这句话是谁改的、当时为什么这么改、
上周那版更好能不能找回来、两个人同时改怎么合并。

更重要的是:**Git 管的是纯文本,而纯文本是 AI 唯一能真正读懂的东西。**
东西存成 Markdown 或 CSV,AI 就能读它、改它、基于它算出新东西;存成 `.docx`、`.xlsx`,
它看到的只是一坨二进制。

这不是技术洁癖,是工作方式的差别。在这里,不写代码的人也用命令行,也让 AI 替自己干活。
一开始会不习惯 —— 所有人都是这么过来的,但爬完这条曲线你会发现回不去了。

---

## 首次配置

**入职第一天做一次,大约 15 分钟。** 公司用 macOS 或 Linux(不用 Windows)。

### 1. 装工具

macOS —— 先装 [Homebrew](https://brew.sh),然后:

```bash
brew install git git-lfs gh uv
```

Linux:

```bash
sudo apt install -y git git-lfs        # Debian / Ubuntu
sudo dnf install -y git git-lfs gh     # Fedora / RHEL
sudo pacman -S git git-lfs github-cli  # Arch
```

Debian/Ubuntu 的 `gh` 不在默认源里,按
[官方说明](https://github.com/cli/cli/blob/trunk/docs/install_linux.md) 加一下源。
`uv`(Python 工具链管理器,`tools/` 下的工具靠它跑)在 Linux 上装:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Git LFS 是大文件扩展 —— 图片音视频单独存放,Git 里只留个指针。**装完让它生效:**

```bash
git lfs install
```

> ⚠️ 漏了这步,LFS 规则会静默失效,图片被原样塞进 Git 历史,**而且不会报任何错**。
> 等发现时几百 MB 已经推上去、清不掉了。提交检查会拦住,但最好一开始就装对。

### 2. 配置 Git

```bash
git config --global user.name  "你的名字"
git config --global user.email "你注册 GitHub 用的邮箱"
git config --global pull.rebase true              # 保持提交历史是直线
git config --global init.defaultBranch main
git config --global core.quotepath false          # 中文文件名正常显示
git config --global core.precomposeunicode true   # 中文文件名编码
```

公司没有统一邮箱 —— **用你自己的**,和 GitHub 账号上的保持一致,
否则提交不会关联到你的头像和主页(`check-env` 会提醒你)。

后两条是为了让偶尔出现的中文文件名不出乱码。
**新建的文件一律用 ASCII 命名**,中文写在文件内容里 —— 理由见
[AGENTS.md](AGENTS.md) 的「工作区结构」。

### 3. 登录并克隆

注册 GitHub,把用户名发给管理员加入组织,然后:

> 如果你们还没有自己的仓库,先从这个模板起一个 —— 见
> [docs/adapting-this-template.md](docs/adapting-this-template.md)。

```bash
gh auth login
```

选 `GitHub.com` → `HTTPS` → `Y` → `Login with a web browser`。

```bash
mkdir -p ~/work && cd ~/work
gh repo clone <你们组织>/<仓库名>
cd <仓库名>
git config core.hooksPath .githooks
uv sync
```

`git config core.hooksPath` 启用提交检查(拦截 Office 格式、超过 5 MB 没走 LFS
的文件、LFS 没装好)。**每个仓库配一次** —— 换电脑、重新克隆都要再来一遍。

`uv sync` 装好工具链。之后用 `uv run` 跑工具,不用管虚拟环境。

### 4. 验证

```bash
uv run check-env
```

逐项检查并告诉你哪里没配好、怎么修。全绿就完成了。

### 5. 装 AI 工具

**不是可选项** —— 这套东西是照着「你会用 AI」的前提设计的。
Claude Code(`brew install --cask claude-code`)或 Codex 都行,
`AGENTS.md` 和 `.codex/skills/` 两边通用。

---

## 然后

**第一次用 Git 的话,打开交互式教程**,边看边练,大约半小时:

```bash
open docs/tutorial/index.html        # macOS
xdg-open docs/tutorial/index.html    # Linux
```

它讲五条日常命令、冲突怎么解、出事了怎么办、文件存什么格式、
什么该自己做什么该交给 AI。

| 还有两份 | |
|---|---|
| [AGENTS.md](AGENTS.md) | 规范和红线。**人和 AI 读同一份**,AI 会自动读取 |
| [docs/design-rationale.md](docs/design-rationale.md) | 为什么这样设计。**觉得某条规定别扭时先看这个** |

---

## 三条铁律

1. **动手之前先 `git pull`。** 不拉最新就开始改,是所有冲突的源头。
2. **干完一段就提交推送,不要攒。**
3. **不确定就问,不要瞎试。** 绝大多数操作可以撤销,但有几个不行。
