# TheThreeRealms · 本地 CI 使用指南

GitHub Actions 的可用分钟已用完，现阶段以 **Mac 本地测试**替代自动 CI。仓库的 `.github/workflows/ci.yml` 已取消 `push` / `pull_request` 触发，只保留手动 `workflow_dispatch`（不用点击该手动按钮，以免消耗 Actions 分钟）。

## 环境

- macOS（Linux 亦适用）
- Node.js 22：`nvm install 22 && nvm use`（项目中有 `.nvmrc`）。原 `package.json` 的 20.19+ 声明不足以运行 Node 的 `--experimental-strip-types` 测试。
- npm 已随 Node 安装。首次需要联网安装依赖。

## 在当前 PR 分支验证

```bash
git fetch origin
git switch feat/v1-4-traveler-glb-tech-demo
git pull --ff-only

nvm use               # 未安装时：nvm install 22
npm run ci:local
```

这条命令会依次执行：

1. 安装依赖。若有 `package-lock.json` 则执行 `npm ci`，否则执行 `npm install --no-package-lock`；当前仓库**没有锁文件**，因此尚不能保证每次安装解析到完全相同的依赖版本。
2. `npm test`：所有 Node 单元测试、GLB 二进制、真实 Three.js 骨骼 IK 与碰撞检查。
3. `npm run build`：TypeScript 类型检查和 Vite 生产构建。

即使测试失败，也会继续执行构建，最终只要任何一步失败，脚本就返回非零退出码；依赖安装失败时则直接结束。**不得仅因构建成功而认为测试通过**。

## 后续快速验证

当依赖没有变化时：

```bash
npm run ci:quick
```

这个命令跳过安装，仍会执行测试和构建。遇到依赖或 Node 版本问题时，重新运行完整的 `npm run ci:local`。

## 日志与 PR 验收

每次执行均会把 stdout/stderr 保存到仓库中的：

```text
.local-ci/last-run.log
```

这个目录已加入 `.gitignore`，不会进入 Git 提交。发生错误时，将该日志文件上传到聊天，或者在终端执行：

```bash
tail -n 100 .local-ci/last-run.log
```

建议验收记录包含：分支、提交 SHA、`npm run ci:local` 的 PASS/FAIL、单元测试数量、构建结果，以及手动验证的结果。此前 PR #4 的上香手臂/袖子穿过炉沿问题，需要同时用浏览器从正面和侧面检查，**本地 CI 通过不能替代 3D 视觉验收**。

> 提醒：用户本地运行的测试不能由 GitHub 直接验证，应由开发者检查对应日志，确认与当前 PR HEAD 是同一次执行；如有可能，后续再补充版本锁文件以提高可复现性。
