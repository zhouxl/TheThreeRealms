# Mac mini Self-hosted Runner：TheThreeRealms CI

## 目标

本仓库将原有的 GitHub-hosted Ubuntu 工作流切换到你已注册的 **Mac mini Self-hosted Runner**。默认 GitHub macOS Runner 标签为 `self-hosted`、`macOS`，因此工作流选择 `runs-on: [self-hosted, macOS]`，不依赖未知自定义标签或芯片架构。

**注意：本仓库是公开仓库，GitHub 官方明确警告，不要让 Fork PR 在个人持久化 Self-hosted Runner 执行不受信任代码。** 本配置完全不监听 `pull_request` 或 `pull_request_target`，仅监听原仓库中的可信分支推送和维护者手动运行。外部 Fork PR 不会自动在 Mac mini 上测试。

## 自动运行

合并本配置 PR 后，下列分支推送将自动触发 Mac mini CI：

- `main`
- `feat/**`、`fix/**`、`chore/**`
- `docs/**`、`test/**`、`hotfix/**`

对于仓库内已有 Draft PR（包括 PR #5 / PR #6），合并本 CI 配置之后，需要**先将最新 main 合入各 PR 分支**（确保工作流文件已更新），下一次推送才会按新配置自动检查。**不要改写或覆盖未提交修改。**

也可以从 GitHub 仓库的 Actions 页面选择 **CI · Mac mini (Self-hosted)**，点击 Run workflow 手动执行，选定已包含该配置的目标分支。手动执行只供具有写权限的维护者操作。

工作流依次完成：

1. `actions/checkout@v4` 拉取当前仓库提交，关闭持久化 Git 凭证。
2. `actions/setup-node@v4` 根据仓库 `.nvmrc` 选择 Node 22。
3. 输出 Runner 名称、系统/芯片架构、提交 SHA、Node/npm 版本。
4. 执行仓库内已有的 `npm run ci:local`，即安装依赖、单元测试、TypeScript 类型检查和 Vite 构建。
5. 无论成功失败都上传 `.local-ci/last-run.log`，Artifact 保留七天。

GitHub Checks 显示 PASS 之前，仍不能宣称测试通过；浏览器中 GLB 穿模、镜头遮挡与动画质量仍需要手动视觉验收。

## 首次确认 Mac mini Runner

仓库 GitHub 网页：`Settings → Actions → Runners`，确认运行机 **Online**，并且标签里有 `self-hosted` 与 `macOS`。当前 GitHub 连接不允许直接读取 Runner 管理 API，因此未核实主机的真实名称、标签或架构。

如果任务一直显示 `Waiting for a runner to pick up this job`：
- 确认 Mac mini 有电、网络在线，Runner 服务正在运行，Runner 是关联到 **zhouxl/TheThreeRealms** 的仓库或拥有该仓库访问权限的组织。
- 检查标签是否匹配；若 Runner 注册时取消了默认标签，需要先恢复标签或显式修改 `runs-on`。
- 确保 Runner 运行用户的 Node/npm 和工作目录权限正常；检查 setup-node 能否下载所需 Node 版本。

## 安全与维护

- Runner 请用专用低权限 macOS 用户，不要在该账户放个人 SSH 私钥、生产密钥、Apple ID Keychain 凭据或其他项目的敏感文件。
- 禁止用 `pull_request_target` 执行 PR 代码，禁止向 Fork PR 运行持久自托管机。
- GitHub token 仅限 `contents: read`，checkout 不保留凭证，当前工作流不要求任何仓库 Secret。
- 请对 Action 版本进行定期升级；所有依赖安装都应按可信源码和安装脚本策略执行。仓库目前没有 lockfile，`npm run ci:local` 仍使用 `npm install --no-package-lock`，可重复性不如 `npm ci`，应作为独立改进项。
- 定期升级 Runner 程序和 macOS 系统，并清理 `_work` 缓存与构建产物。

## 仍保留本地兜底

Mac mini Runner 无法连接、离线或故障时，你依然可以在仓库根目录执行：

```bash
nvm use
npm run ci:local
```

保存的日志仍是 `.local-ci/last-run.log`。请将它与当前 PR 的提交 SHA 一并提供。
